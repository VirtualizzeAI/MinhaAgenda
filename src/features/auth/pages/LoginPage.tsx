import { FormEvent, useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CalendarRange, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box px="md" py="xl">
      <Grid align="center" gutter="xl" mih="100dvh">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Stack gap="md" maw={560} mx="auto">
            <Badge color="coral" radius="xl" variant="light" w="fit-content">
              Mobile-first desde o acesso
            </Badge>
            <Title order={1} size="h1">
              Agenda, clientes e operação diária em um painel só.
            </Title>
            <Text c="dimmed" size="lg">
              Esta primeira versão prioriza velocidade operacional no celular sem sacrificar leitura no desktop. Entre para acessar a agenda, gestão de serviços e os módulos operacionais.
            </Text>

            <Card radius="xl" p="lg" withBorder>
              <Stack gap="md">
                <ThemeIcon color="teal" radius="xl" size={52} variant="light">
                  <CalendarRange size={24} />
                </ThemeIcon>
                <Text fw={700}>O que já entra nesta base</Text>
                <Text c="dimmed" size="sm">
                  Agenda diária e semanal, navegação autenticada, módulos de gestão, estrutura de API futura e layout adaptado para celulares.
                </Text>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card component="form" mx="auto" maw={460} onSubmit={handleSubmit} padding="xl" radius="32px" shadow="xl" withBorder>
            <Stack gap="lg">
              <Stack gap={4}>
                <ThemeIcon color="ink" radius="xl" size={48} variant="light">
                  <LockKeyhole size={22} />
                </ThemeIcon>
                <Title order={2}>Entrar na operação</Title>
                <Text c="dimmed" size="sm">
                  Use os dados de demonstração para explorar a aplicação.
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

              <Button loading={isSubmitting} radius="xl" size="md" type="submit">
                Acessar sistema
              </Button>

              {/* <Text c="dimmed" size="sm">
                Conta demo pronta. Depois podemos substituir por autenticação real e permissões por perfil.
              </Text> */}
              <Anchor c="teal.7" fw={700} size="sm">
                Esqueci minha senha
              </Anchor>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
