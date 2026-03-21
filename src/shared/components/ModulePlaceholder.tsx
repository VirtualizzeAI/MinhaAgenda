import { Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { ArrowUpRight, LucideIcon } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
}

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  highlights,
}: ModulePlaceholderProps) {
  return (
    <Stack gap="lg">
      <Card radius="xl" padding="lg" shadow="sm" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Text c="dimmed" fw={600} tt="uppercase" size="xs">
              Operação
            </Text>
            <Title order={2}>{title}</Title>
            <Text c="dimmed" maw={560} mt="xs">
              {description}
            </Text>
          </div>
          <ThemeIcon color="teal" radius="xl" size={52} variant="light">
            <Icon size={28} />
          </ThemeIcon>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {highlights.map((highlight) => (
          <Card key={highlight} padding="lg" radius="xl" withBorder>
            <Text fw={700}>{highlight}</Text>
            <Text c="dimmed" mt="xs" size="sm">
              Estrutura pronta para receber estado real, filtros e integração de API.
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card radius="xl" padding="lg" withBorder bg="rgba(10, 20, 32, 0.03)">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={700}>Próximo passo natural</Text>
            <Text c="dimmed" size="sm">
              Conectar este módulo com dados reais e fluxos operacionais do negócio.
            </Text>
          </div>
          <Button rightSection={<ArrowUpRight size={16} />} variant="light">
            Planejar fluxo detalhado
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
