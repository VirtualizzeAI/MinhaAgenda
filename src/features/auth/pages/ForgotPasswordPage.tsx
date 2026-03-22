import { FormEvent, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CalendarRange, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setErrorMessage('Informe um e-mail válido.');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage('Enviamos um e-mail com instruções para redefinir sua senha.');
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
      <Card component="form" onSubmit={handleSubmit} padding="xl" radius="32px" maw={440} w="100%" shadow="xl" withBorder>
        <Stack gap="lg">
          <Stack gap={6} align="flex-start">
            <Group gap="sm" align="center">
              <ThemeIcon color="teal" radius="xl" size={52} variant="light">
                <CalendarRange size={24} />
              </ThemeIcon>
              <Title order={3}>Markei</Title>
            </Group>
            <Title order={2}>Recuperar senha</Title>
            <Text c="dimmed" size="sm">
              Informe seu e-mail para receber o link de redefinição.
            </Text>
          </Stack>

          {errorMessage ? <Alert color="red" title="Erro">{errorMessage}</Alert> : null}
          {successMessage ? <Alert color="teal" title="Pronto">{successMessage}</Alert> : null}

          <TextInput
            label="E-mail"
            leftSection={<Mail size={16} />}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="seu@email.com"
            radius="xl"
            required
            size="md"
            type="email"
            value={email}
          />

          <Button loading={loading} radius="xl" size="md" type="submit">
            Enviar link de recuperação
          </Button>

          <Button component={Link} radius="xl" to="/login" variant="subtle">
            Voltar para login
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
