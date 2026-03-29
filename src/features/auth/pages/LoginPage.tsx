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
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { showNotif } from '@/lib/notify';
import { CalendarRange, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const description = params.get('error_description');
    if (description) {
      setLoginError(decodeURIComponent(description.replace(/\+/g, ' ')));
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    try {
      await login({ email, password });
      showNotif({
        color: 'teal',
        title: 'Login realizado',
        message: 'Você entrou com sucesso no sistema.',
      });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Não foi possível fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
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
      <Card
        component="form"
        onSubmit={handleSubmit}
        padding="xl"
        radius="32px"
        maw={440}
        w="100%"
        shadow="xl"
        withBorder
      >
        <Stack gap="lg">
          <Stack gap={6} align="flex-start">
            <Group gap="sm" align="center">
              <ThemeIcon color="teal" radius="xl" size={52} variant="light">
                <CalendarRange size={24} />
              </ThemeIcon>
              <Title order={3}>Markei</Title>
            </Group>
            <Title order={2}>Entrar</Title>
            <Text c="dimmed" size="sm">
              Acesse sua agenda e operação em poucos toques.
            </Text>
          </Stack>

          <TextInput
            label="E-mail"
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="seu@email.com"
            radius="xl"
            required
            size="md"
            value={email}
          />

          <PasswordInput
            label="Senha"
            onChange={(event) => setPassword(event.currentTarget.value)}
            placeholder="Digite sua senha"
            radius="xl"
            required
            size="md"
            value={password}
          />

          {loginError ? (
            <Alert color="red" title="Falha no login">
              {loginError}
            </Alert>
          ) : null}

          <Button leftSection={<LockKeyhole size={16} />} loading={isSubmitting} radius="xl" size="md" type="submit">
            Acessar sistema
          </Button>

          <Button component={Link} radius="xl" to="/recuperar-senha" variant="subtle">
            Esqueci a senha
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
