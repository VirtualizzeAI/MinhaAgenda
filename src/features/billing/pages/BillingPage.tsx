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
import { BillingCharge, BillingMethod, BillingStatus, Client } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

type BillingFilter = 'all' | BillingStatus;

const statusLabel: Record<BillingStatus, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  overdue: 'Atrasado',
};

const statusColor: Record<BillingStatus, string> = {
  pending: 'yellow',
  partial: 'blue',
  paid: 'teal',
  overdue: 'red',
};

const methodLabel: Record<BillingMethod, string> = {
  pix: 'Pix',
  card: 'Cartão',
  cash: 'Dinheiro',
  transfer: 'Transferência',
};

interface NewChargeForm {
  clientId: string;
  reference: string;
  amount: number;
  dueDate: string;
  method: BillingMethod;
  notes: string;
}

const initialForm: NewChargeForm = {
  clientId: '',
  reference: '',
  amount: 100,
  dueDate: dayjs().format('YYYY-MM-DD'),
  method: 'pix',
  notes: '',
};

export function BillingPage() {
  const api = useApi();
  const [records, setRecords] = useState<BillingCharge[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BillingFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<NewChargeForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    api.billing.list().then(setRecords).catch(console.error);
    api.clients
      .list()
      .then((data) => {
        setClients(data);
        setForm((current) => (current.clientId ? current : { ...current, clientId: data[0]?.id ?? '' }));
      })
      .catch(console.error);
  }, [api]);

  const filteredCharges = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((charge) => {
      const matchesText =
        normalized.length === 0 ||
        charge.clientName.toLowerCase().includes(normalized) ||
        charge.reference.toLowerCase().includes(normalized);

      const matchesFilter = filter === 'all' || charge.status === filter;

      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const totalPending = records
    .filter((charge) => charge.status === 'pending' || charge.status === 'partial' || charge.status === 'overdue')
    .reduce((acc, charge) => acc + Math.max(charge.amount - charge.paidAmount, 0), 0);

  const totalPaid = records.reduce((acc, charge) => acc + charge.paidAmount, 0);

  const handleCreateCharge = () => {
    const reference = form.reference.trim();

    if (!form.clientId || !reference || !form.dueDate) {
      setFormError('Preencha cliente, referência e data de vencimento.');
      return;
    }

    if (form.amount <= 0) {
      setFormError('O valor da cobrança deve ser maior que zero.');
      return;
    }

    const dueDate = dayjs(form.dueDate);
    if (!dueDate.isValid()) {
      setFormError('Data de vencimento inválida.');
      return;
    }

    if (!api) return;

    api.billing
      .create({
        clientId: form.clientId,
        reference,
        amount: form.amount,
        paidAmount: 0,
        dueDate: form.dueDate,
        status: dueDate.isBefore(dayjs(), 'day') ? 'overdue' : 'pending',
        method: form.method,
        notes: form.notes.trim() || undefined,
      })
      .then(() => api.billing.list())
      .then((list) => {
        setRecords(list);
        setForm({ ...initialForm, clientId: clients[0]?.id ?? '' });
        setFormError(null);
        close();
      })
      .catch((error: unknown) => {
        setFormError(error instanceof Error ? error.message : 'Erro ao criar cobrança.');
      });
  };

  const handleRegisterPayment = (chargeId: string, paymentAmount: number) => {
    if (paymentAmount <= 0) {
      return;
    }

    if (!api) return;
    const charge = records.find((item) => item.id === chargeId);
    if (!charge) return;

    const nextPaidAmount = Math.min(charge.amount, charge.paidAmount + paymentAmount);
    const nextStatus: BillingStatus =
      nextPaidAmount >= charge.amount ? 'paid' : nextPaidAmount > 0 ? 'partial' : charge.status;

    api.billing
      .update(chargeId, { paidAmount: nextPaidAmount, status: nextStatus })
      .then(() => api.billing.list())
      .then(setRecords)
      .catch(console.error);
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Financeiro operacional
            </Badge>
            <Title mt="xs" order={2}>
              Cobranças
            </Title>
            <Text c="dimmed" mt="xs">
              Acompanhe pendências, registre recebimentos e mantenha o caixa previsível em poucos toques.
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
            Nova cobrança
          </Button>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Em aberto
          </Text>
          <Text fw={800} size="xl">
            R$ {totalPending.toLocaleString('pt-BR')}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Recebido
          </Text>
          <Text fw={800} size="xl">
            R$ {totalPaid.toLocaleString('pt-BR')}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Cobranças atrasadas
          </Text>
          <Text fw={800} size="xl">
            {records.filter((charge) => charge.status === 'overdue').length}
          </Text>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por cliente ou referência"
            radius="xl"
            value={query}
          />

          <SegmentedControl
            data={[
              { label: 'Todas', value: 'all' },
              { label: 'Pendentes', value: 'pending' },
              { label: 'Parciais', value: 'partial' },
              { label: 'Pagas', value: 'paid' },
              { label: 'Atrasadas', value: 'overdue' },
            ]}
            onChange={(value) => setFilter(value as BillingFilter)}
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredCharges.map((charge) => {
          const remaining = Math.max(charge.amount - charge.paidAmount, 0);

          return (
            <Card key={charge.id} p="md" radius="xl" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={800}>{charge.clientName}</Text>
                  <Text c="dimmed" size="sm">
                    {charge.reference}
                  </Text>
                  <Text c="dimmed" size="sm">
                    Vencimento: {dayjs(charge.dueDate).format('DD/MM/YYYY')} • {methodLabel[charge.method]}
                  </Text>
                  {charge.notes ? (
                    <Text c="dimmed" size="sm">
                      {charge.notes}
                    </Text>
                  ) : null}
                </Stack>

                <Stack align="flex-end" gap="xs">
                  <Badge color={statusColor[charge.status]} radius="xl" variant="light">
                    {statusLabel[charge.status]}
                  </Badge>
                  <Text fw={800}>R$ {charge.amount.toLocaleString('pt-BR')}</Text>
                  <Text c="dimmed" size="sm">
                    Pago: R$ {charge.paidAmount.toLocaleString('pt-BR')}
                  </Text>
                </Stack>
              </Group>

              <Group mt="md" grow>
                <Button
                  onClick={() => handleRegisterPayment(charge.id, remaining)}
                  radius="xl"
                  size="sm"
                  variant="light"
                >
                  Quitar
                </Button>
                <Button
                  onClick={() => handleRegisterPayment(charge.id, Math.min(remaining, charge.amount * 0.5))}
                  radius="xl"
                  size="sm"
                  variant="light"
                >
                  +50%
                </Button>
              </Group>
            </Card>
          );
        })}
      </Stack>

      {filteredCharges.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Text fw={700}>Nenhuma cobrança encontrada</Text>
          <Text c="dimmed" size="sm">
            Ajuste filtros ou registre nova cobrança.
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
        title="Nova cobrança"
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

          <TextInput
            label="Referência"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, reference: value }));
            }}
            placeholder="Ex: Comanda #123"
            radius="xl"
            value={form.reference}
          />

          <Group grow>
            <NumberInput
              decimalScale={2}
              fixedDecimalScale
              hideControls
              label="Valor (R$)"
              min={1}
              onChange={(value) => {
                setForm((current) => ({ ...current, amount: Number(value) || 0 }));
              }}
              radius="xl"
              value={form.amount}
            />
            <TextInput
              label="Vencimento"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((current) => ({ ...current, dueDate: value }));
              }}
              radius="xl"
              type="date"
              value={form.dueDate}
            />
          </Group>

          <Select
            data={Object.entries(methodLabel).map(([value, label]) => ({ value, label }))}
            label="Forma de pagamento"
            onChange={(value) => {
              if (!value) {
                return;
              }

              setForm((current) => ({ ...current, method: value as BillingMethod }));
            }}
            radius="xl"
            value={form.method}
          />

          <Textarea
            autosize
            label="Observações"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, notes: value }));
            }}
            placeholder="Observações de cobrança"
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
            <Button onClick={handleCreateCharge} radius="xl">
              Salvar cobrança
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
