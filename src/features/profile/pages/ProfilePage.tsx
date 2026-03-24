import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Building2, Clock, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/lib/supabase';

interface ProfileForm {
  businessName: string;
  document: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  country: string;
  contact: string;
  whatsapp: string;
  teamSize: number;
  bookingStartTime: string;
  bookingEndTime: string;
}

interface PlanInfo {
  planName: string;
  planPrice: number | '';
  contractDate: string;
  dueDate: string;
}

interface TenantProfileRow {
  id: string;
  name: string;
  plan: string | null;
  document: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact: string | null;
  whatsapp: string | null;
  team_size: number | null;
  plan_price: number | null;
  contract_date: string | null;
  due_date: string | null;
  booking_start_time: string | null;
  booking_end_time: string | null;
}

const defaultForm: ProfileForm = {
  businessName: '',
  document: '',
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  country: 'Brasil',
  contact: '',
  whatsapp: '',
  teamSize: 1,
  bookingStartTime: '08:00',
  bookingEndTime: '18:00',
};

const defaultPlanInfo: PlanInfo = {
  planName: '',
  planPrice: '',
  contractDate: '',
  dueDate: '',
};

interface AdminCustomerPlanRow {
  created_at: string;
  due_date: string | null;
  admin_plans:
  | { name?: string | null; price?: number | null }
  | Array<{ name?: string | null; price?: number | null }>
  | null;
}

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function getPlanRelationValue(relation: AdminCustomerPlanRow['admin_plans']) {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

export function ProfilePage() {
  const { user, tenantId } = useAuth();
  const [form, setForm] = useState<ProfileForm>(defaultForm);
  const [planInfo, setPlanInfo] = useState<PlanInfo>(defaultPlanInfo);
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const tenantIsReady = useMemo(() => Boolean(tenantId), [tenantId]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!tenantId) {
        setLoadingProfile(false);
        setErrorMessage('Tenant não encontrado para carregar perfil.');
        return;
      }

      setLoadingProfile(true);
      setErrorMessage(null);

      const [{ data, error }, adminPlanResult] = await Promise.all([
        supabase
          .from('tenants')
          .select('id, name, document, street, number, district, city, state, country, contact, whatsapp, team_size, booking_start_time, booking_end_time, plan, plan_price, contract_date, due_date')
          .eq('id', tenantId)
          .maybeSingle(),
        supabase
          .from('admin_customers')
          .select('created_at, due_date, admin_plans(name, price)')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);

      if (error) {
        if (error.message.includes('column tenants.document does not exist')) {
          const fallback = await supabase
            .from('tenants')
            .select('id, name')
            .eq('id', tenantId)
            .maybeSingle();

          if (fallback.error) {
            setErrorMessage(fallback.error.message);
            setLoadingProfile(false);
            return;
          }

          if (fallback.data) {
            setForm((current) => ({
              ...current,
              businessName: fallback.data!.name,
              country: 'Brasil',
            }));
          }

          setErrorMessage('Schema desatualizado em tenants. Execute a migração 0003_tenants_profile_fields.sql.');
          setLoadingProfile(false);
          return;
        }

        setErrorMessage(error.message);
        setLoadingProfile(false);
        return;
      }

      const tenant = data as TenantProfileRow | null;
      let tenantHasPlanInfo = false;

      if (tenant) {
        setForm({
          businessName: tenant.name ?? '',
          document: tenant.document ?? '',
          street: tenant.street ?? '',
          number: tenant.number ?? '',
          district: tenant.district ?? '',
          city: tenant.city ?? '',
          state: tenant.state ?? '',
          country: tenant.country ?? 'Brasil',
          contact: tenant.contact ?? '',
          whatsapp: tenant.whatsapp ?? '',
          teamSize: tenant.team_size ?? 1,
          bookingStartTime: tenant.booking_start_time ?? '08:00',
          bookingEndTime: tenant.booking_end_time ?? '18:00',
        });

        const tenantPlanInfo: PlanInfo = {
          planName: tenant.plan ?? '',
          planPrice: tenant.plan_price ?? '',
          contractDate: formatDateInput(tenant.contract_date),
          dueDate: formatDateInput(tenant.due_date),
        };

        if (tenant.plan || tenant.plan_price || tenant.contract_date || tenant.due_date) {
          tenantHasPlanInfo = true;
          setPlanInfo(tenantPlanInfo);
        }
      }

      if (adminPlanResult.error) {
        if (!errorMessage) {
          setErrorMessage(adminPlanResult.error.message);
        }
      } else if (!tenantHasPlanInfo && adminPlanResult.data) {
        const relation = getPlanRelationValue((adminPlanResult.data as AdminCustomerPlanRow).admin_plans);
        setPlanInfo({
          planName: relation?.name ?? '',
          planPrice: relation?.price ?? '',
          contractDate: formatDateInput((adminPlanResult.data as AdminCustomerPlanRow).created_at),
          dueDate: formatDateInput((adminPlanResult.data as AdminCustomerPlanRow).due_date),
        });
      } else if (!tenantHasPlanInfo) {
        setPlanInfo(defaultPlanInfo);
      }

      setLoadingProfile(false);
    };

    void loadProfile();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantIsReady) {
      setLoadingProfile(false);
    }
  }, [tenantIsReady]);

  useEffect(() => {
    setNewEmail(user?.email ?? '');
  }, [user?.email]);

  const onSaveProfile = async () => {
    if (!form.businessName.trim()) {
      setErrorMessage('Informe o nome da empresa/profissional.');
      return;
    }

    if (!form.contact.trim()) {
      setErrorMessage('Informe o contato principal.');
      return;
    }

    if (!tenantId) {
      setErrorMessage('Tenant não encontrado para salvar perfil.');
      return;
    }

    const payload = {
      name: form.businessName.trim(),
      document: form.document.trim() || null,
      street: form.street.trim() || null,
      number: form.number.trim() || null,
      district: form.district.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: (form.country.trim() || 'Brasil'),
      contact: form.contact.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      team_size: form.teamSize,
      booking_start_time: form.bookingStartTime || '08:00',
      booking_end_time: form.bookingEndTime || '18:00',
    };

    const { error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', tenantId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage(null);
    setSaveMessage('Perfil salvo com sucesso.');
    setSecurityMessage(null);
  };

  const onUpdateEmail = async () => {
    const email = newEmail.trim().toLowerCase();

    if (!email) {
      setErrorMessage('Informe um e-mail válido para alterar.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage(null);
    setSecurityMessage('Solicitação enviada. Confirme o novo e-mail na caixa de entrada.');
  };

  const onUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSecurityMessage('Senha alterada com sucesso.');
  };

  if (loadingProfile) {
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
              Conta e faturamento
            </Badge>
            <Title mt="xs" order={2}>
              Perfil do usuário
            </Title>
            <Text c="dimmed" mt="xs">
              Centralize dados da empresa/profissional, informações do plano e ações de segurança da conta.
            </Text>
          </div>
        </Group>
      </Card>

      {saveMessage ? <Alert color="teal" title="Tudo certo">{saveMessage}</Alert> : null}
      {securityMessage ? <Alert color="blue" title="Segurança">{securityMessage}</Alert> : null}
      {errorMessage ? <Alert color="red" title="Atenção">{errorMessage}</Alert> : null}

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <Building2 size={18} />
            <Title order={4}>Dados da empresa/profissional</Title>
          </Group>

          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <TextInput
                label="Nome da empresa/profissional"
                value={form.businessName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, businessName: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="CPF/CNPJ"
                value={form.document}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, document: value }));
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <TextInput
                label="Rua"
                value={form.street}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, street: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                label="Número"
                value={form.number}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, number: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Bairro"
                value={form.district}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, district: value }));
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Cidade"
                value={form.city}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, city: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                label="Estado"
                value={form.state}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, state: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="País"
                value={form.country}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, country: value || 'Brasil' }));
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Contato"
                value={form.contact}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, contact: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, whatsapp: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Quantas pessoas há na empresa"
                min={1}
                value={form.teamSize}
                onChange={(value) => setForm((current) => ({ ...current, teamSize: Number(value) || 1 }))}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Divider label={<Group gap={4}><Clock size={13} /> Horário de funcionamento da empresa (padrão)</Group>} labelPosition="left" my="xs" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Início do atendimento"
                type="time"
                value={form.bookingStartTime}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, bookingStartTime: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Fim do atendimento"
                type="time"
                value={form.bookingEndTime}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, bookingEndTime: value }));
                }}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            <Button radius="xl" onClick={() => void onSaveProfile()}>Salvar informações</Button>
          </Group>
        </Stack>
      </Card>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <ShieldCheck size={18} />
            <Title order={5}>Plano</Title>
          </Group>

          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Plano"
                value={planInfo.planName}
                readOnly
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <NumberInput
                label="Valor"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix="R$ "
                value={planInfo.planPrice}
                readOnly
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Data de contratação"
                type="date"
                value={planInfo.contractDate}
                readOnly
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Data de vencimento"
                type="date"
                value={planInfo.dueDate}
                readOnly
              />
            </Grid.Col>
          </Grid>

          <Alert color="blue" title="Alteração de Plano">
            Para alterar seu plano entre em contato com o suporte.
          </Alert>
        </Stack>
      </Card>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card radius="xl" p="lg" withBorder>
            <Stack gap="sm">
              <Group gap="xs">
                <Mail size={18} />
                <Title order={5}>Alterar e-mail</Title>
              </Group>
              <TextInput
                label="E-mail Atual"
                type="email"
                value={user?.email ?? ''}
                readOnly
              />
              <TextInput
                label="Novo e-mail"
                type="email"
                onChange={(event) => setNewEmail(event.currentTarget.value)}
              />
              <Button radius="xl" variant="light" onClick={() => void onUpdateEmail()}>
                Solicitar alteração
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card radius="xl" p="lg" withBorder>
            <Stack gap="sm">
              <Group gap="xs">
                <LockKeyhole size={18} />
                <Title order={5}>Alterar senha</Title>
              </Group>
              <TextInput
                label="Nova senha"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
              />
              <TextInput
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              />
              <Button radius="xl" variant="light" onClick={() => void onUpdatePassword()}>
                Atualizar senha
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
