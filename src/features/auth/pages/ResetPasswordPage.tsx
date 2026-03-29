import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CalendarRange, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const tokenHash = new URLSearchParams(window.location.search).get('token_hash');

    if (tokenHash) {
      void supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      }).then(({ error }) => {
        if (!isMounted) return;

        if (error) {
          setErrorMessage('Link de redefinição inválido ou expirado. Solicite um novo e-mail.');
          return;
        }

        setSessionReady(true);
      });

      return () => {
        isMounted = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) setSessionReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccess(true);
      notifications.show({
        color: 'teal',
        title: 'Senha alterada',
        message: 'Sua nova senha foi salva com sucesso. Redirecionando para o login...',
      });
      setTimeout(() => navigate('/login'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      px="md"
      py="xl"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 12% 12%, rgba(35,195,174,0.16), transparent 42%), radial-gradient(circle at 88% 8%, rgba(255,111,78,0.14), transparent 38%), #f4f7f9',
      }}
    >
      <Card padding="xl" radius="32px" maw={440} w="100%" shadow="xl" withBorder>
        <Stack gap="lg">
          <Stack gap={6} align="flex-start">
            <Group gap="sm" align="center">
              <ThemeIcon color="teal" radius="xl" size={52} variant="light">
                <CalendarRange size={24} />
              </ThemeIcon>
              <Title order={3}>Markei</Title>
            </Group>
            <Title order={2}>Nova senha</Title>
            <Text c="dimmed" size="sm">
              Escolha uma nova senha para a sua conta.
            </Text>
          </Stack>

          {success ? (
            <Alert color="teal" title="Senha atualizada!" icon={<CheckCircle size={16} />}>
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </Alert>
          ) : !sessionReady ? (
            <Alert color="orange" title="Aguardando verificação">
              Processando o link de redefinição. Se esta página demorar, verifique se o link do e-mail ainda é válido e tente novamente.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                {errorMessage ? <Alert color="red" title="Erro">{errorMessage}</Alert> : null}

                <PasswordInput
                  label="Nova senha"
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Mínimo 6 caracteres"
                  radius="xl"
                  required
                  size="md"
                  value={password}
                />

                <PasswordInput
                  label="Confirmar nova senha"
                  onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
                  placeholder="Repita a senha"
                  radius="xl"
                  required
                  size="md"
                  value={passwordConfirm}
                />

                <Button loading={loading} radius="xl" size="md" type="submit">
                  Salvar nova senha
                </Button>
              </Stack>
            </form>
          )}

          <Button component={Link} radius="xl" to="/login" variant="subtle">
            Voltar para login
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
