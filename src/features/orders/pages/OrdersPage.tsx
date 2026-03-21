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
import { orders } from '@/mocks/orders';
import { Order, OrderStatus } from '@/services/api/contracts';

const ORDERS_STORAGE_KEY = 'minha-agenda:orders';

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
  clientName: string;
  professionalName: string;
  itemSummary: string;
  total: number;
  notes: string;
}

const initialForm: NewOrderForm = {
  clientName: '',
  professionalName: '',
  itemSummary: '',
  total: 100,
  notes: '',
};

export function OrdersPage() {
  const [records, setRecords] = useState<Order[]>(() => {
    if (typeof window === 'undefined') {
      return orders;
    }

    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return orders;
    }

    try {
      const parsed = JSON.parse(raw) as Order[];
      return Array.isArray(parsed) ? parsed : orders;
    } catch {
      return orders;
    }
  });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<NewOrderForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(records));
  }, [records]);

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
    const clientName = form.clientName.trim();
    const professionalName = form.professionalName.trim();
    const itemSummary = form.itemSummary.trim();

    if (!clientName || !professionalName || !itemSummary) {
      setFormError('Preencha cliente, profissional e itens da comanda.');
      return;
    }

    if (form.total <= 0) {
      setFormError('O total da comanda deve ser maior que zero.');
      return;
    }

    const newOrder: Order = {
      id: `o${Date.now()}`,
      clientName,
      professionalName,
      itemSummary,
      total: form.total,
      status: 'open',
      createdAt: dayjs().toISOString(),
      notes: form.notes.trim() || undefined,
    };

    setRecords((current) => [newOrder, ...current]);
    setForm(initialForm);
    setFormError(null);
    close();
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setRecords((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
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
          <TextInput
            label="Cliente"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, clientName: value }));
            }}
            placeholder="Nome do cliente"
            radius="xl"
            value={form.clientName}
          />

          <TextInput
            label="Profissional"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, professionalName: value }));
            }}
            placeholder="Nome do profissional"
            radius="xl"
            value={form.professionalName}
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
