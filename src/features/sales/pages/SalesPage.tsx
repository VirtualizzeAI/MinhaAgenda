import React from 'react';
import { Container, Grid, Stack, Title, Text, Button, Image, Badge, SimpleGrid, Card, Group, Center } from '@mantine/core';

export function SalesPage() {
  return (
    <>
      <Container size="lg" py="xl">
        <Grid align="center" gutter="xl">
          <Grid.Col md={6} sm={12}>
            <Stack spacing="xs">
              <Badge color="teal" variant="light">Minha Agenda</Badge>
              <Title order={1}>Transforme sua forma de agendar clientes</Title>
              <Text color="dimmed">
                Plataforma moderna para gerenciar agendamentos, clientes e comunicação — tudo em um só lugar.
              </Text>
              <Group mt="md">
                <Button radius="xl" size="lg" color="teal" component="a" href="/agendar/demo">
                  Solicitar demonstração
                </Button>
                <Button radius="xl" variant="outline" component="a" href="/login">
                  Entrar
                </Button>
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col md={6} sm={12}>
            <Center>
              <Image src="/sales/hero-1.svg" alt="Captura do sistema" style={{ maxWidth: 560, width: '100%' }} />
            </Center>
          </Grid.Col>
        </Grid>
      </Container>

      <Container size="lg" py="xl">
        <Title order={2} mb="md">Principais recursos</Title>
        <SimpleGrid cols={3} spacing="lg" breakpoints={[{ maxWidth: 980, cols: 2 }, { maxWidth: 640, cols: 1 }]}>
          <Card radius="md" withBorder>
            <Image src="/sales/feature-1.svg" alt="Agenda intuitiva" height={160} fit="cover" />
            <Title order={4} mt="sm">Agenda intuitiva</Title>
            <Text color="dimmed" size="sm" mt="xs">Visualize e gerencie horários com rapidez e precisão.</Text>
          </Card>
          <Card radius="md" withBorder>
            <Image src="/sales/feature-2.svg" alt="Gerenciamento de clientes" height={160} fit="cover" />
            <Title order={4} mt="sm">Gerenciamento de clientes</Title>
            <Text color="dimmed" size="sm" mt="xs">Ficha completa, histórico e integração com WhatsApp.</Text>
          </Card>
          <Card radius="md" withBorder>
            <Image src="/sales/feature-3.svg" alt="Relatórios" height={160} fit="cover" />
            <Title order={4} mt="sm">Relatórios</Title>
            <Text color="dimmed" size="sm" mt="xs">Relatórios de ocupação, receita e produtividade.</Text>
          </Card>
        </SimpleGrid>
      </Container>

      <Container size="lg" py="xl">
        <Card shadow="sm" radius="xl" px="lg" py="xl">
          <Group position="apart" align="center">
            <Stack spacing={0}>
              <Title order={3}>Pronto para aumentar suas reservas?</Title>
              <Text color="dimmed" size="sm">Teste grátis ou agende uma demonstração personalizada.</Text>
            </Stack>
            <Group>
              <Button radius="xl" size="md" color="teal" component="a" href="/agendar/demo">Solicitar demonstração</Button>
              <Button radius="xl" variant="outline" component="a" href="/login">Entrar</Button>
            </Group>
          </Group>
        </Card>
      </Container>

      <Container size="lg" py="xl">
        <Center>
          <Text color="dimmed" size="sm">© {new Date().getFullYear()} Minha Agenda — Feito para profissionais</Text>
        </Center>
      </Container>
    </>
  );
}

export default SalesPage;
