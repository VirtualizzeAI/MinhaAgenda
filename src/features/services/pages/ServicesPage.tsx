import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Search } from 'lucide-react';
import { services } from '@/mocks/services';
import { Service, ServiceCategory } from '@/services/api/contracts';

const SERVICES_STORAGE_KEY = 'minha-agenda:services';

type ServiceFilter = 'all' | ServiceCategory | 'inactive';

const categoryLabel: Record<ServiceCategory, string> = {
  podologia: 'Podologia',
  estetica: 'Estética',
  unhas: 'Unhas',
  terapia: 'Terapia',
  pacote: 'Pacote',
};

interface NewServiceForm {
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  active: boolean;
  description: string;
}

const initialForm: NewServiceForm = {
  name: '',
  category: 'podologia',
  durationMinutes: 60,
  price: 100,
  active: true,
  description: '',
};

export function ServicesPage() {
  const [records, setRecords] = useState<Service[]>(() => {
    if (typeof window === 'undefined') {
      return services;
    }

    const raw = window.localStorage.getItem(SERVICES_STORAGE_KEY);
    if (!raw) {
      return services;
    }

    try {
      const parsed = JSON.parse(raw) as Service[];
      return Array.isArray(parsed) ? parsed : services;
    } catch {
      return services;
    }
  });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<NewServiceForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((service) => {
      const matchesText =
        normalized.length === 0 ||
        service.name.toLowerCase().includes(normalized) ||
        (service.description ?? '').toLowerCase().includes(normalized);

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'inactive'
            ? !service.active
            : service.category === filter;

      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const averagePrice =
    records.length === 0
      ? 0
      : Math.round(records.reduce((acc, service) => acc + service.price, 0) / records.length);

  const handleCreateService = () => {
    const name = form.name.trim();

    if (!name) {
      setFormError('Informe o nome do serviço.');
      return;
    }

    if (form.durationMinutes < 10) {
      setFormError('A duração mínima é de 10 minutos.');
      return;
    }

    if (form.price <= 0) {
      setFormError('O preço deve ser maior que zero.');
      return;
    }

    const newService: Service = {
      id: `s${Date.now()}`,
      name,
      category: form.category,
      durationMinutes: form.durationMinutes,
      price: form.price,
      active: form.active,
      description: form.description.trim() || undefined,
    };

    setRecords((current) => [newService, ...current]);
    setForm(initialForm);
    setFormError(null);
    close();
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Catálogo operacional
            </Badge>
            <Title mt="xs" order={2}>
              Serviços e pacotes
            </Title>
            <Text c="dimmed" mt="xs">
              Estrutura mobile-first para manter catálogo claro, com duração e preço para agendamento rápido.
            </Text>
          </div>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => {
              setForm(initialForm);
              setFormError(null);
              open();
            }}
            radius="xl"
          >
            Novo serviço
          </Button>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Serviços totais
          </Text>
          <Text fw={800} size="xl">
            {records.length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Ativos
          </Text>
          <Text fw={800} size="xl">
            {records.filter((service) => service.active).length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Preço médio
          </Text>
          <Text fw={800} size="xl">
            R$ {averagePrice.toLocaleString('pt-BR')}
          </Text>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por serviço ou descrição"
            radius="xl"
            value={query}
          />

          <SegmentedControl
            data={[
              { label: 'Todos', value: 'all' },
              { label: 'Podologia', value: 'podologia' },
              { label: 'Estética', value: 'estetica' },
              { label: 'Inativos', value: 'inactive' },
            ]}
            onChange={(value) => setFilter(value as ServiceFilter)}
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredServices.map((service) => (
          <Card key={service.id} p="md" radius="xl" withBorder>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={800}>{service.name}</Text>
                <Text c="dimmed" size="sm">
                  {categoryLabel[service.category]} • {service.durationMinutes} min
                </Text>
                {service.description ? (
                  <Text c="dimmed" mt={6} size="sm">
                    {service.description}
                  </Text>
                ) : null}
              </div>

              <Stack align="flex-end" gap={6}>
                <Badge color={service.active ? 'teal' : 'gray'} radius="xl" variant="light">
                  {service.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Text fw={800}>R$ {service.price.toLocaleString('pt-BR')}</Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      {filteredServices.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Text fw={700}>Nenhum serviço encontrado</Text>
          <Text c="dimmed" size="sm">
            Ajuste os filtros ou cadastre um novo serviço para começar.
          </Text>
        </Card>
      ) : null}

      <Modal
        centered
        onClose={() => {
          close();
          setFormError(null);
        }}
        opened={opened}
        radius="xl"
        title="Novo serviço"
      >
        <Stack gap="md">
          <TextInput
            label="Nome do serviço"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, name: value }));
            }}
            placeholder="Ex: Podologia avançada"
            radius="xl"
            value={form.name}
          />

          <Select
            data={Object.entries(categoryLabel).map(([value, label]) => ({ value, label }))}
            label="Categoria"
            onChange={(value) => {
              if (!value) {
                return;
              }

              setForm((current) => ({ ...current, category: value as ServiceCategory }));
            }}
            radius="xl"
            value={form.category}
          />

          <Group grow>
            <NumberInput
              allowDecimal={false}
              label="Duração (min)"
              min={10}
              onChange={(value) => {
                setForm((current) => ({ ...current, durationMinutes: Number(value) || 0 }));
              }}
              radius="xl"
              value={form.durationMinutes}
            />

            <NumberInput
              decimalScale={2}
              fixedDecimalScale
              hideControls
              label="Preço (R$)"
              min={1}
              onChange={(value) => {
                setForm((current) => ({ ...current, price: Number(value) || 0 }));
              }}
              radius="xl"
              value={form.price}
            />
          </Group>

          <Switch
            checked={form.active}
            label="Serviço ativo"
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setForm((current) => ({ ...current, active: checked }));
            }}
          />

          <Textarea
            autosize
            label="Descrição"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, description: value }));
            }}
            placeholder="Detalhes, diferenciais e observações"
            radius="xl"
            value={form.description}
          />

          {formError ? (
            <Text c="red" fw={600} size="sm">
              {formError}
            </Text>
          ) : null}

          <Group grow>
            <Button
              onClick={() => {
                close();
                setFormError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateService} radius="xl">
              Salvar serviço
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
