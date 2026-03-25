import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';

const API_URL = import.meta.env.VITE_API_URL as string;

const defaultWhatsappTemplate = [
  'Oi {{cliente_nome}}, seu agendamento foi confirmado.',
  '',
  'Empresa: {{empresa}}',
  'Servico: {{servico}}',
  'Profissional: {{profissional_nome}}',
  'Data: {{data}}',
  'Horario: {{hora_inicio}} as {{hora_fim}}',
  '',
  'Se precisar reagendar, fale conosco: {{telefone_empresa}}',
].join('\n');

interface WhatsappConfig {
  enabled: boolean;
  connectedNumber: string;
  confirmationTemplate: string;
}

const defaultConfig: WhatsappConfig = {
  enabled: false,
  connectedNumber: '',
  confirmationTemplate: defaultWhatsappTemplate,
};

export function WhatsappPage() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState<WhatsappConfig>(defaultConfig);
  const [connected, setConnected] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  const withTenantQuery = (path: string) => `${API_URL}${path}?tenantId=${tenantId}`;

  const formattedConnectedNumber = useMemo(() => {
    const digits = config.connectedNumber.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return digits || 'Nao informado';
  }, [config.connectedNumber]);

  const fetchSessionStatus = async () => {
    const response = await fetch(withTenantQuery('/v1/whatsapp/session/status'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((json.message as string) ?? 'Erro ao consultar status WhatsApp');
    }

    const isConnected = Boolean(json.connected);
    setConnected(isConnected);

    if (isConnected) {
      setQrPayload(null);
      setSessionMessage(`Numero ${formattedConnectedNumber} conectado com sucesso.`);
    }

    return json;
  };

  const requireSession = () => {
    if (!token || !tenantId) {
      throw new Error('Sessao invalida. Faca login novamente.');
    }
  };

  const loadConfig = async () => {
    try {
      requireSession();
      const response = await fetch(withTenantQuery('/v1/whatsapp/config'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        throw new Error((json.message as string) ?? 'Erro ao carregar configuracao do WhatsApp');
      }

      setConfig({
        enabled: Boolean(json.enabled),
        connectedNumber: (json.connectedNumber as string) ?? '',
        confirmationTemplate: (json.confirmationTemplate as string) || defaultWhatsappTemplate,
      });

      try {
        await fetchSessionStatus();
      } catch {
        setConnected(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao carregar configuracao do WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, [token, tenantId]);

  useEffect(() => {
    if (!qrPayload || connected || !token || !tenantId) return;

    const intervalId = window.setInterval(() => {
      void callSessionAction('/v1/whatsapp/session/sync', 'POST', {
        connectedNumber: config.connectedNumber,
      }).then((json) => {
        const isConnected = Boolean(json.connected);
        setConnected(isConnected);

        if (isConnected) {
          setQrPayload(null);
          setSessionMessage(`Numero ${formattedConnectedNumber} conectado com sucesso.`);
          void loadConfig();
        }
      }).catch(() => {
        // Ignora falhas de polling para manter o fluxo simples.
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [qrPayload, connected, token, tenantId, formattedConnectedNumber, config.connectedNumber]);

  const saveConfig = async () => {
    try {
      requireSession();

      const response = await fetch(withTenantQuery('/v1/whatsapp/config'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: config.enabled,
          confirmationTemplate: config.confirmationTemplate,
        }),
      });

      const json = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        throw new Error((json.message as string) ?? 'Erro ao salvar configuracao do WhatsApp');
      }

      setErrorMessage(null);
      setSuccessMessage((json.message as string) ?? 'Configuracao salva com sucesso.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao salvar configuracao do WhatsApp');
    }
  };

  const callSessionAction = async (
    path: '/v1/whatsapp/session/connect' | '/v1/whatsapp/session/status' | '/v1/whatsapp/session/sync',
    method: 'GET' | 'POST',
    body?: Record<string, unknown>,
  ) => {
    requireSession();

    const response = await fetch(withTenantQuery(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((json.message as string) ?? 'Erro na sessao do WhatsApp');
    }

    return json;
  };

  const onConnect = async () => {
    try {
      setConnecting(true);

      if (!config.connectedNumber.trim()) {
        throw new Error('Informe o numero para conectar.');
      }

      const json = await callSessionAction('/v1/whatsapp/session/connect', 'POST', {
        connectedNumber: config.connectedNumber,
      });
      const qrCodeDataUrl = typeof json.qrCodeDataUrl === 'string' ? json.qrCodeDataUrl : null;
      if (!Boolean(json.connected) && !qrCodeDataUrl) {
        throw new Error('Nao foi possivel obter QR code para conexao.');
      }

      setQrPayload(qrCodeDataUrl);

      setErrorMessage(null);
      setConnected(Boolean(json.connected));
      setSessionMessage((json.message as string) ?? 'Conexao iniciada. Escaneie o QR code abaixo.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao iniciar conexao WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Center h="50dvh">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Mensagens Automaticas
            </Badge>
            <Title mt="xs" order={2}>
              WhatsApp
            </Title>
            <Text c="dimmed" mt="xs">
              Conecte seu número e personalize a mensagem de confirmação enviada em novos agendamentos.
            </Text>
          </div>
        </Group>
      </Card>

      {successMessage ? <Alert color="teal" title="Tudo certo">{successMessage}</Alert> : null}
      {sessionMessage ? <Alert color="grape" title="Sessao WhatsApp">{sessionMessage}</Alert> : null}
      {errorMessage ? <Alert color="red" title="Atencao">{errorMessage}</Alert> : null}

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <MessageCircle size={18} />
            <Title order={4}>Conexão do número</Title>
          </Group>

          <Switch
            label="Enviar confirmação automática para novos agendamentos"
            checked={config.enabled}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setConfig((current) => ({ ...current, enabled: checked }));
            }}
          />

          <TextInput
            label="Número do WhatsApp (DDD + número)"
            placeholder="Ex.: 84986176356"
            value={config.connectedNumber}
            onChange={(event) => {
              const value = event.currentTarget.value.replace(/\D/g, '');
              setConfig((current) => ({ ...current, connectedNumber: value }));
            }}
          />

          <Group>
            <Button radius="xl" variant="light" loading={connecting} onClick={() => void onConnect()}>
              Conectar
            </Button>
          </Group>

          <Alert color={connected ? 'teal' : 'yellow'} title="Status do número">
            {connected
              ? `Conectado: ${formattedConnectedNumber}`
              : `Desconectado: ${formattedConnectedNumber}`}
          </Alert>

          {qrPayload && !connected ? (
            <Stack gap="xs">
              <Text fw={600}>Escaneie o QR code no WhatsApp</Text>
              {qrPayload.startsWith('data:image') ? (
                <img
                  src={qrPayload}
                  alt="QR code de conexao"
                  style={{ maxWidth: 320, width: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }}
                />
              ) : (
                <Textarea
                  label="QR recebido"
                  minRows={3}
                  value={qrPayload}
                  readOnly
                />
              )}
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <Title order={4}>Mensagem de confirmação</Title>

          {/* <Text size="sm" c="dimmed">
            Variaveis disponiveis: {'{{cliente_nome}}'}, {'{{servico}}'}, {'{{profissional_nome}}'}, {'{{data}}'}, {'{{hora_inicio}}'}, {'{{hora_fim}}'}, {'{{empresa}}'}, {'{{telefone_empresa}}'}
          </Text> */}

          <Textarea
            label="Template da mensagem"
            minRows={6}
            autosize
            value={config.confirmationTemplate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setConfig((current) => ({ ...current, confirmationTemplate: value }));
            }}
          />

          <Text size="sm" c="dimmed">
            Variaveis disponiveis: {'{{cliente_nome}}'}, {'{{servico}}'}, {'{{profissional_nome}}'}, {'{{data}}'}, {'{{hora_inicio}}'}, {'{{hora_fim}}'}, {'{{empresa}}'}, {'{{telefone_empresa}}'}
          </Text>

          <Group justify="flex-end">
            <Button radius="xl" onClick={() => void saveConfig()}>
              Salvar configuracoes
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
