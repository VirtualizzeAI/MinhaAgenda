import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Badge,
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Sparkles } from 'lucide-react';
import { appointments, professionals } from '@/mocks/agenda';
import { billingCharges } from '@/mocks/billing';
import { clients } from '@/mocks/clients';
import { orders } from '@/mocks/orders';
import { services } from '@/mocks/services';
import { Appointment, BillingCharge, Order, Professional, Service } from '@/services/api/contracts';

type ReportPeriod = '7' | '30' | '90';

const periodOptions: Record<ReportPeriod, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '90 dias',
};

function loadRecords<T>(storageKey: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toTopList(counter: Map<string, number>, limit = 4) {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30');

  const appointmentRecords = loadRecords<Appointment>('minha-agenda:appointments', appointments);
  const orderRecords = loadRecords<Order>('minha-agenda:orders', orders);
  const billingRecords = loadRecords<BillingCharge>('minha-agenda:billing', billingCharges);
  const professionalRecords = loadRecords<Professional>('minha-agenda:professionals', professionals);
  const serviceRecords = loadRecords<Service>('minha-agenda:services', services);

  const cutoff = useMemo(() => dayjs().subtract(Number(period), 'day').startOf('day'), [period]);

  const filteredAppointments = useMemo(
    () => appointmentRecords.filter((appointment) => dayjs(appointment.start).isAfter(cutoff)),
    [appointmentRecords, cutoff],
  );

  const filteredOrders = useMemo(
    () => orderRecords.filter((order) => dayjs(order.createdAt).isAfter(cutoff)),
    [cutoff, orderRecords],
  );

  const filteredBilling = useMemo(
    () => billingRecords.filter((charge) => dayjs(charge.dueDate).isAfter(cutoff)),
    [billingRecords, cutoff],
  );

  const kpis = useMemo(() => {
    const totalAppointments = filteredAppointments.length;
    const confirmedAppointments = filteredAppointments.filter((item) => item.status === 'confirmed').length;
    const openOrders = filteredOrders.filter((item) => item.status === 'open').length;
    const revenuePaid = filteredBilling.reduce((acc, charge) => acc + charge.paidAmount, 0);
    const revenuePending = filteredBilling.reduce(
      (acc, charge) => acc + Math.max(charge.amount - charge.paidAmount, 0),
      0,
    );
    const closedOrders = filteredOrders.filter((item) => item.status === 'closed').length;
    const conversionRate =
      filteredOrders.length === 0 ? 0 : Math.round((closedOrders / filteredOrders.length) * 100);

    return {
      totalAppointments,
      confirmedAppointments,
      openOrders,
      revenuePaid,
      revenuePending,
      conversionRate,
    };
  }, [filteredAppointments, filteredBilling, filteredOrders]);

  const topClients = useMemo(() => {
    const counter = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      counter.set(item.clientName, (counter.get(item.clientName) ?? 0) + 1);
    });
    return toTopList(counter);
  }, [filteredAppointments]);

  const topServices = useMemo(() => {
    const counter = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      counter.set(item.serviceName, (counter.get(item.serviceName) ?? 0) + 1);
    });
    return toTopList(counter);
  }, [filteredAppointments]);

  const topProfessionals = useMemo(() => {
    const counter = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      const name =
        professionalRecords.find((professional) => professional.id === item.professionalId)?.name ??
        item.professionalId;
      counter.set(name, (counter.get(name) ?? 0) + 1);
    });
    return toTopList(counter);
  }, [filteredAppointments, professionalRecords]);

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="coral" radius="xl" variant="light">
              Inteligência operacional
            </Badge>
            <Title mt="xs" order={2}>
              Relatórios e performance
            </Title>
            <Text c="dimmed" mt="xs">
              Visão consolidada de agenda, comandas e cobranças para apoiar decisões rápidas no dia a dia.
            </Text>
          </div>
          <Sparkles size={24} />
        </Group>
      </Card>

      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Text fw={700}>Período de análise</Text>
          <SegmentedControl
            data={Object.entries(periodOptions).map(([value, label]) => ({ value, label }))}
            onChange={(value) => setPeriod(value as ReportPeriod)}
            value={period}
          />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Agendamentos
          </Text>
          <Text fw={800} size="xl">
            {kpis.totalAppointments}
          </Text>
          <Text c="dimmed" size="sm">
            Confirmados: {kpis.confirmedAppointments}
          </Text>
        </Card>

        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Comandas abertas
          </Text>
          <Text fw={800} size="xl">
            {kpis.openOrders}
          </Text>
          <Text c="dimmed" size="sm">
            Conversão de fechamento: {kpis.conversionRate}%
          </Text>
        </Card>

        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Receita recebida
          </Text>
          <Text fw={800} size="xl">
            R$ {kpis.revenuePaid.toLocaleString('pt-BR')}
          </Text>
          <Text c="dimmed" size="sm">
            Pendente: R$ {kpis.revenuePending.toLocaleString('pt-BR')}
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="lg" withBorder>
          <Text fw={800}>Top clientes</Text>
          <Stack gap="xs" mt="md">
            {topClients.length === 0 ? (
              <Text c="dimmed" size="sm">
                Sem dados no período.
              </Text>
            ) : (
              topClients.map(([name, count]) => (
                <Group key={name} justify="space-between">
                  <Text>{name}</Text>
                  <Badge color="teal" radius="xl" variant="light">
                    {count}
                  </Badge>
                </Group>
              ))
            )}
          </Stack>
        </Card>

        <Card radius="xl" p="lg" withBorder>
          <Text fw={800}>Serviços em alta</Text>
          <Stack gap="xs" mt="md">
            {topServices.length === 0 ? (
              <Text c="dimmed" size="sm">
                Sem dados no período.
              </Text>
            ) : (
              topServices.map(([name, count]) => (
                <Group key={name} justify="space-between">
                  <Text>{name}</Text>
                  <Badge color="blue" radius="xl" variant="light">
                    {count}
                  </Badge>
                </Group>
              ))
            )}
          </Stack>
        </Card>

        <Card radius="xl" p="lg" withBorder>
          <Text fw={800}>Equipe mais acionada</Text>
          <Stack gap="xs" mt="md">
            {topProfessionals.length === 0 ? (
              <Text c="dimmed" size="sm">
                Sem dados no período.
              </Text>
            ) : (
              topProfessionals.map(([name, count]) => (
                <Group key={name} justify="space-between">
                  <Text>{name}</Text>
                  <Badge color="coral" radius="xl" variant="light">
                    {count}
                  </Badge>
                </Group>
              ))
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Text fw={700}>Base de referência</Text>
        <Text c="dimmed" size="sm">
          Clientes: {clients.length} • Serviços ativos: {serviceRecords.filter((service) => service.active).length} • Profissionais ativos:{' '}
          {professionalRecords.filter((professional) => professional.active ?? true).length}
        </Text>
      </Card>
    </Stack>
  );
}
