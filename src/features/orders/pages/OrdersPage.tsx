import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
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
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Search } from 'lucide-react';
import { Client, Order, OrderStatus, Professional } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

type OrderFilter = 'all' | OrderStatus;

const orderStatusLabel: Record<OrderStatus, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  canceled: 'Cancelada',
};

const orderStatusColor: Record<OrderStatus, string> = {
  open: 'teal',
  closed: 'blue',
  canceled: 'gray',
};

interface NewOrderForm {
  clientId: string;
  professionalId: string;
  itemSummary: string;
  total: number;
  notes: string;
}

const initialForm: NewOrderForm = {
  clientId: '',
  professionalId: '',
  itemSummary: '',
  total: 100,
  notes: '',
};

export function OrdersPage() {
  const api = useApi();
  const [records, setRecords] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<NewOrderForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    api.orders.list().then(setRecords).catch(console.error);
    api.clients.list().then((data) => {
      setClients(data);
      setForm((current) => (current.clientId ? current : { ...current, clientId: data[0]?.id ?? '' }));
    }).catch(console.error);
    api.professionals.list().then((data) => {
      setProfessionals(data);
      setForm((current) => (current.professionalId ? current : { ...current, professionalId: data[0]?.id ?? '' }));
    }).catch(console.error);
  }, [api]);

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((order) => {
      const matchesText =
        normalized.length === 0 ||
        order.clientName.toLowerCase().includes(normalized) ||
        order.professionalName.toLowerCase().includes(normalized) ||
        order.itemSummary.toLowerCase().includes(normalized);

      const matchesFilter = filter === 'all' || order.status === filter;

      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const handleCreateOrder = () => {
    const itemSummary = form.itemSummary.trim();

    if (!form.clientId || !form.professionalId || !itemSummary) {
      setFormError('Preencha cliente, profissional e itens da comanda.');
      return;
    }

    if (form.total <= 0) {
      setFormError('O total da comanda deve ser maior que zero.');
      return;
    }

    if (!api) return;
    api.orders
      .create({
        clientId: form.clientId,
        professionalId: form.professionalId,
        itemSummary,
        total: form.total,
        status: 'open',
        notes: form.notes.trim() || undefined,
      })
      .then(() => api.orders.list())
      .then((list) => {
        setRecords(list);
        setForm({
          ...initialForm,
          clientId: clients[0]?.id ?? '',
          professionalId: professionals[0]?.id ?? '',
        });
        setFormError(null);
        close();
      })
      .catch((error: unknown) => {
        setFormError(error instanceof Error ? error.message : 'Erro ao criar comanda.');
      });
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    if (!api) return;
    api.orders
      .update(orderId, { status })
      .then(() => api.orders.list())
      .then(setRecords)
      .catch(console.error);
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Fluxo de caixa rápido
            </Badge>
            <Title mt="xs" order={2}>
              Comandas
            </Title>
            <Text c="dimmed" mt="xs">
              Operação mobile-first para abrir, acompanhar e fechar comandas sem sair da rotina de atendimento.
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
            Nova comanda
          </Button>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Comandas abertas
          </Text>
          <Text fw={800} size="xl">
            {records.filter((order) => order.status === 'open').length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Fechadas hoje
          </Text>
          <Text fw={800} size="xl">
            {
              records.filter(
                (order) =>
                  order.status === 'closed' && dayjs(order.createdAt).isSame(dayjs(), 'day'),
              ).length
            }
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Total em aberto
          </Text>
          <Text fw={800} size="xl">
            R${' '}
            {records
              .filter((order) => order.status === 'open')
              .reduce((acc, order) => acc + order.total, 0)
              .toLocaleString('pt-BR')}
          </Text>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por cliente, profissional ou itens"
            radius="xl"
            value={query}
          />

          <SegmentedControl
            data={[
              { label: 'Todas', value: 'all' },
              { label: 'Abertas', value: 'open' },
              { label: 'Fechadas', value: 'closed' },
              { label: 'Canceladas', value: 'canceled' },
            ]}
            onChange={(value) => setFilter(value as OrderFilter)}
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredOrders.map((order) => (
          <Card key={order.id} p="md" radius="xl" withBorder>
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text fw={800}>{order.clientName}</Text>
                <Text c="dimmed" size="sm">
                  {order.professionalName} • {dayjs(order.createdAt).format('DD/MM HH:mm')}
                </Text>
                <Text size="sm">{order.itemSummary}</Text>
                {order.notes ? (
                  <Text c="dimmed" size="sm">
                    {order.notes}
                  </Text>
                ) : null}
              </Stack>

              <Stack align="flex-end" gap="xs">
                <Badge color={orderStatusColor[order.status]} radius="xl" variant="light">
                  {orderStatusLabel[order.status]}
                </Badge>
                <Text fw={800}>R$ {order.total.toLocaleString('pt-BR')}</Text>
              </Stack>
            </Group>

            <Group mt="md" grow>
              <Select
                data={[
                  { value: 'open', label: 'Aberta' },
                  { value: 'closed', label: 'Fechada' },
                  { value: 'canceled', label: 'Cancelada' },
                ]}
                onChange={(value) => {
                  if (!value) {
                    return;
                  }

                  handleUpdateStatus(order.id, value as OrderStatus);
                }}
                radius="xl"
                value={order.status}
              />
            </Group>
          </Card>
        ))}
      </Stack>

      {filteredOrders.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Text fw={700}>Nenhuma comanda encontrada</Text>
          <Text c="dimmed" size="sm">
            Ajuste os filtros ou crie uma nova comanda para iniciar o fluxo.
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
        title="Nova comanda"
      >
        <Stack gap="md">
          <Select
            data={clients.map((client) => ({ value: client.id, label: client.name }))}
            label="Cliente"
            onChange={(value) => setForm((current) => ({ ...current, clientId: value ?? '' }))}
            placeholder="Selecione o cliente"
            radius="xl"
            value={form.clientId}
          />

          <Select
            data={professionals.map((professional) => ({ value: professional.id, label: professional.name }))}
            label="Profissional"
            onChange={(value) => setForm((current) => ({ ...current, professionalId: value ?? '' }))}
            placeholder="Selecione o profissional"
            radius="xl"
            value={form.professionalId}
          />

          <TextInput
            label="Itens da comanda"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, itemSummary: value }));
            }}
            placeholder="Ex: Podologia + esmaltação"
            radius="xl"
            value={form.itemSummary}
          />

          <NumberInput
            decimalScale={2}
            fixedDecimalScale
            hideControls
            label="Total (R$)"
            min={1}
            onChange={(value) => {
              setForm((current) => ({ ...current, total: Number(value) || 0 }));
            }}
            radius="xl"
            value={form.total}
          />

          <Textarea
            autosize
            label="Observações"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, notes: value }));
            }}
            placeholder="Detalhes de cobrança ou consumo"
            radius="xl"
            value={form.notes}
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
            <Button onClick={handleCreateOrder} radius="xl">
              Salvar comanda
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
