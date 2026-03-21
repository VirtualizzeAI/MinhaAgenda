import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  ScrollArea,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { appointments, agendaWeek, professionals } from '@/mocks/agenda';
import { Appointment } from '@/services/api/contracts';
import { ProfessionalSelector } from '@/features/agenda/components/ProfessionalSelector';
import { ScheduleTimeline } from '@/features/agenda/components/ScheduleTimeline';
import { ScheduleGridDesktop } from '@/features/agenda/components/ScheduleGridDesktop';

type ViewMode = 'day' | 'week';
const APPOINTMENTS_STORAGE_KEY = 'minha-agenda:appointments';

const statusOptions = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in-progress', label: 'Em atendimento' },
  { value: 'attention', label: 'Atenção' },
  { value: 'available', label: 'Bloqueio' },
] as const;

const statusLabels: Record<Appointment['status'], string> = {
  confirmed: 'Confirmado',
  'in-progress': 'Em atendimento',
  attention: 'Atenção',
  available: 'Bloqueio',
};

interface NewAppointmentForm {
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  serviceName: string;
  room: string;
  professionalId: string;
  status: Appointment['status'];
  notes: string;
}

function getInitialAppointmentForm(selectedDate: dayjs.Dayjs, selectedProfessionalId: string): NewAppointmentForm {
  return {
    date: selectedDate.format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
    clientName: '',
    serviceName: '',
    room: '',
    professionalId: selectedProfessionalId,
    status: 'confirmed',
    notes: '',
  };
}

function appointmentsForDate(selectedDate: dayjs.Dayjs, filteredAppointments: Appointment[]) {
  return filteredAppointments.filter((appointment) => dayjs(appointment.start).isSame(selectedDate, 'day'));
}

export function AgendaPage() {
  const [appointmentRecords, setAppointmentRecords] = useState<Appointment[]>(() => {
    if (typeof window === 'undefined') {
      return appointments;
    }

    const raw = window.localStorage.getItem(APPOINTMENTS_STORAGE_KEY);

    if (!raw) {
      return appointments;
    }

    try {
      const parsed = JSON.parse(raw) as Appointment[];
      return Array.isArray(parsed) ? parsed : appointments;
    } catch {
      return appointments;
    }
  });
  const [view, setView] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(dayjs('2026-03-21'));
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(professionals[0]?.id ?? '');
  const [createOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [detailsOpened, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [newAppointmentForm, setNewAppointmentForm] = useState<NewAppointmentForm>(() =>
    getInitialAppointmentForm(dayjs('2026-03-21'), professionals[0]?.id ?? ''),
  );
  const isDesktop = useMediaQuery('(min-width: 75em)');

  useEffect(() => {
    window.localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointmentRecords));
  }, [appointmentRecords]);

  const selectedProfessional = professionals.find((professional) => professional.id === selectedProfessionalId);
  const selectedAppointment = selectedAppointmentId
    ? appointmentRecords.find((appointment) => appointment.id === selectedAppointmentId) ?? null
    : null;
  const selectedAppointmentProfessional = selectedAppointment
    ? professionals.find((professional) => professional.id === selectedAppointment.professionalId)
    : undefined;

  const selectedProfessionalAppointments = useMemo(
    () => appointmentRecords.filter((appointment) => appointment.professionalId === selectedProfessionalId),
    [appointmentRecords, selectedProfessionalId],
  );

  const dailyAppointments = useMemo(
    () => appointmentsForDate(selectedDate, selectedProfessionalAppointments).sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [selectedDate, selectedProfessionalAppointments],
  );

  const occupancy = useMemo(() => {
    const confirmedCount = dailyAppointments.filter((appointment) => appointment.status === 'confirmed').length;
    const blockedCount = dailyAppointments.filter((appointment) => appointment.status === 'available').length;

    return {
      confirmedCount,
      blockedCount,
      totalCount: dailyAppointments.length,
    };
  }, [dailyAppointments]);

  const weekSummary = useMemo(
    () =>
      agendaWeek.map((date) => {
        const dateAppointments = appointmentsForDate(date, appointmentRecords);

        return {
          date,
          count: dateAppointments.length,
          revenueHint: dateAppointments.length * 145,
        };
      }),
    [appointmentRecords],
  );

  const goToAdjacentDay = (direction: -1 | 1) => {
    setSelectedDate((current) => current.add(direction, 'day'));
  };

  const handleOpenCreateModal = () => {
    setFormError(null);
    setNewAppointmentForm(getInitialAppointmentForm(selectedDate, selectedProfessionalId));
    openCreateModal();
  };

  const handleCreateAppointment = () => {
    const clientName = newAppointmentForm.clientName.trim();
    const serviceName = newAppointmentForm.serviceName.trim();
    const room = newAppointmentForm.room.trim();

    if (!clientName || !serviceName || !room || !newAppointmentForm.professionalId) {
      setFormError('Preencha cliente, serviço, sala e profissional.');
      return;
    }

    if (!newAppointmentForm.date || !newAppointmentForm.startTime || !newAppointmentForm.endTime) {
      setFormError('Informe data, horário inicial e horário final.');
      return;
    }

    const start = dayjs(`${newAppointmentForm.date}T${newAppointmentForm.startTime}`);
    const end = dayjs(`${newAppointmentForm.date}T${newAppointmentForm.endTime}`);

    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      setFormError('O horário final deve ser maior que o inicial.');
      return;
    }

    const newAppointment: Appointment = {
      id: `a${Date.now()}`,
      professionalId: newAppointmentForm.professionalId,
      clientName,
      serviceName,
      room,
      start: start.toISOString(),
      end: end.toISOString(),
      status: newAppointmentForm.status,
      notes: newAppointmentForm.notes.trim() || undefined,
    };

    setAppointmentRecords((current) => [newAppointment, ...current]);
    setSelectedDate(start);
    setSelectedProfessionalId(newAppointmentForm.professionalId);
    setFormError(null);
    closeCreateModal();
  };

  const handleOpenAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment.id);
    openDetailsModal();
  };

  const handleUpdateAppointmentStatus = (status: Appointment['status']) => {
    if (!selectedAppointmentId) {
      return;
    }

    setAppointmentRecords((current) =>
      current.map((appointment) =>
        appointment.id === selectedAppointmentId ? { ...appointment, status } : appointment,
      ),
    );
  };

  const handleDeleteAppointment = () => {
    if (!selectedAppointmentId) {
      return;
    }

    setAppointmentRecords((current) =>
      current.filter((appointment) => appointment.id !== selectedAppointmentId),
    );
    setSelectedAppointmentId(null);
    closeDetailsModal();
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" padding="lg" shadow="sm" withBorder>
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Badge color="coral" radius="xl" variant="light" w="fit-content">
              Operação do dia
            </Badge>
            <Title order={1} size="h2">
              Agenda inteligente para mobile
            </Title>
            <Text c="dimmed" maw={680}>
              O fluxo principal prioriza leitura rápida, troca de profissional e encaixes com poucos toques. No desktop, a visualização amplia a densidade para acompanhar várias agendas ao mesmo tempo.
            </Text>
          </Stack>

          <Button leftSection={<Plus size={16} />} onClick={handleOpenCreateModal} radius="xl" size="md">
            Novo agendamento
          </Button>
        </Group>
      </Card>

      <Grid>
        <Grid.Col span={{ base: 12, xl: 8 }}>
          <Stack gap="md">
            <Card radius="xl" padding="lg" withBorder>
              <Group justify="space-between" mb="md">
                <SegmentedControl
                  data={[
                    { label: 'Dia', value: 'day' },
                    { label: 'Semana', value: 'week' },
                  ]}
                  onChange={(value) => setView(value as ViewMode)}
                  value={view}
                />

                <Group gap="xs">
                  <ActionIcon onClick={() => goToAdjacentDay(-1)} radius="xl" size={42} variant="light">
                    <ChevronLeft size={18} />
                  </ActionIcon>
                  <Button onClick={() => setSelectedDate(dayjs())} radius="xl" variant="light">
                    Hoje
                  </Button>
                  <ActionIcon onClick={() => goToAdjacentDay(1)} radius="xl" size={42} variant="light">
                    <ChevronRight size={18} />
                  </ActionIcon>
                </Group>
              </Group>

              <ScrollArea scrollbarSize={4} type="never">
                <Group gap="sm" wrap="nowrap">
                  {agendaWeek.map((date) => {
                    const active = date.isSame(selectedDate, 'day');

                    return (
                      <Card
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        p="sm"
                        radius="xl"
                        style={{
                          cursor: 'pointer',
                          minWidth: 98,
                          border: active ? 'none' : '1px solid rgba(10,20,32,0.08)',
                          color: active ? '#ffffff' : '#1c2b3a',
                          background: active ? 'linear-gradient(135deg, #ff6f4e 0%, #ff5937 100%)' : '#ffffff',
                        }}
                      >
                        <Text fw={700} ta="center" tt="capitalize">
                          {date.format('ddd')}
                        </Text>
                        <Text fw={800} size="lg" ta="center">
                          {date.format('DD/MM')}
                        </Text>
                      </Card>
                    );
                  })}
                </Group>
              </ScrollArea>
            </Card>

            <ProfessionalSelector
              onSelect={setSelectedProfessionalId}
              professionals={professionals}
              selectedProfessionalId={selectedProfessionalId}
            />

            {view === 'day' && !isDesktop ? (
              <ScheduleTimeline
                appointments={dailyAppointments}
                onAppointmentClick={handleOpenAppointmentDetails}
              />
            ) : null}
            {view === 'day' && isDesktop ? (
              <ScheduleGridDesktop
                appointments={appointmentRecords.filter((appointment) => dayjs(appointment.start).isSame(selectedDate, 'day'))}
                onAppointmentClick={handleOpenAppointmentDetails}
                professionals={professionals}
              />
            ) : null}

            {view === 'week' ? (
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                {weekSummary.map((summary) => (
                  <Card key={summary.date.toISOString()} padding="lg" radius="xl" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                          {summary.date.format('dddd')}
                        </Text>
                        <Title order={3}>{summary.date.format('DD/MM')}</Title>
                      </div>
                      <ThemeIcon color="coral" radius="xl" size={44} variant="light">
                        <Sparkles size={20} />
                      </ThemeIcon>
                    </Group>
                    <Text fw={800} mt="lg" size="xl">
                      {summary.count} agendamentos
                    </Text>
                    <Text c="dimmed" size="sm">
                      Projeção operacional: R$ {summary.revenueHint.toLocaleString('pt-BR')}
                    </Text>
                  </Card>
                ))}
              </SimpleGrid>
            ) : null}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 4 }}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3, xl: 1 }} spacing="md">
              <Card radius="xl" p="lg" withBorder>
                <Text c="dimmed" size="sm">
                  Profissional ativo
                </Text>
                <Text fw={800} mt={8} size="xl">
                  {selectedProfessional?.name}
                </Text>
                <Badge color="teal" mt="md" radius="xl" variant="light">
                  {selectedProfessional?.specialty}
                </Badge>
              </Card>

              <Card radius="xl" p="lg" withBorder>
                <Text c="dimmed" size="sm">
                  Confirmados hoje
                </Text>
                <Text fw={800} mt={8} size="xl">
                  {occupancy.confirmedCount}
                </Text>
              </Card>

              <Card radius="xl" p="lg" withBorder>
                <Text c="dimmed" size="sm">
                  Bloqueios/Avisos
                </Text>
                <Text fw={800} mt={8} size="xl">
                  {occupancy.blockedCount}
                </Text>
              </Card>
            </SimpleGrid>

            <Card radius="xl" p="lg" withBorder>
              <Title order={3}>Resumo da data</Title>
              <Text c="dimmed" mt="xs">
                {selectedDate.format('dddd, DD [de] MMMM')} com {occupancy.totalCount} eventos visíveis.
              </Text>
              <Stack gap="sm" mt="lg">
                {dailyAppointments.slice(0, 3).map((appointment) => (
                  <Card
                    key={appointment.id}
                    onClick={() => handleOpenAppointmentDetails(appointment)}
                    radius="lg"
                    p="sm"
                    bg="rgba(10,20,32,0.03)"
                    style={{ cursor: 'pointer' }}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text fw={700}>{appointment.clientName}</Text>
                        <Text c="dimmed" size="sm">
                          {appointment.serviceName}
                        </Text>
                      </div>
                      <Badge color="teal" radius="xl" variant="light">
                        {dayjs(appointment.start).format('HH:mm')}
                      </Badge>
                    </Group>
                  </Card>
                ))}
                {dailyAppointments.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Nenhum item nesta data para o profissional selecionado.
                  </Text>
                ) : null}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal
        centered
        onClose={() => {
          closeCreateModal();
          setFormError(null);
        }}
        opened={createOpened}
        radius="xl"
        title="Novo agendamento"
      >
        <Stack gap="md">
          <TextInput
            label="Cliente"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setNewAppointmentForm((current) => ({ ...current, clientName: value }));
            }}
            placeholder="Nome do cliente"
            radius="xl"
            value={newAppointmentForm.clientName}
          />

          <TextInput
            label="Serviço"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setNewAppointmentForm((current) => ({ ...current, serviceName: value }));
            }}
            placeholder="Ex: Podologia completa"
            radius="xl"
            value={newAppointmentForm.serviceName}
          />

          <Group grow>
            <TextInput
              label="Data"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewAppointmentForm((current) => ({ ...current, date: value }));
              }}
              radius="xl"
              type="date"
              value={newAppointmentForm.date}
            />
            <Select
              data={professionals.map((professional) => ({
                value: professional.id,
                label: professional.name,
              }))}
              label="Profissional"
              onChange={(value) => {
                setNewAppointmentForm((current) => ({
                  ...current,
                  professionalId: value ?? current.professionalId,
                }));
              }}
              radius="xl"
              value={newAppointmentForm.professionalId}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Início"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewAppointmentForm((current) => ({ ...current, startTime: value }));
              }}
              radius="xl"
              type="time"
              value={newAppointmentForm.startTime}
            />
            <TextInput
              label="Fim"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewAppointmentForm((current) => ({ ...current, endTime: value }));
              }}
              radius="xl"
              type="time"
              value={newAppointmentForm.endTime}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Sala"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewAppointmentForm((current) => ({ ...current, room: value }));
              }}
              placeholder="Ex: Sala 02"
              radius="xl"
              value={newAppointmentForm.room}
            />
            <Select
              data={[
                { value: 'confirmed', label: 'Confirmado' },
                { value: 'in-progress', label: 'Em atendimento' },
                { value: 'attention', label: 'Atenção' },
                { value: 'available', label: 'Bloqueio' },
              ]}
              label="Status"
              onChange={(value) => {
                if (!value) {
                  return;
                }

                setNewAppointmentForm((current) => ({
                  ...current,
                  status: value as Appointment['status'],
                }));
              }}
              radius="xl"
              value={newAppointmentForm.status}
            />
          </Group>

          <Textarea
            autosize
            label="Observações"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setNewAppointmentForm((current) => ({ ...current, notes: value }));
            }}
            placeholder="Detalhes rápidos do atendimento"
            radius="xl"
            value={newAppointmentForm.notes}
          />

          {formError ? (
            <Text c="red" fw={600} size="sm">
              {formError}
            </Text>
          ) : null}

          <Group grow>
            <Button
              onClick={() => {
                closeCreateModal();
                setFormError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateAppointment} radius="xl">
              Salvar agendamento
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeDetailsModal();
          setSelectedAppointmentId(null);
        }}
        opened={detailsOpened}
        radius="xl"
        title="Detalhes do agendamento"
      >
        {selectedAppointment ? (
          <Stack gap="md">
            <Card p="md" radius="xl" withBorder>
              <Text c="dimmed" size="sm">
                Cliente
              </Text>
              <Text fw={700}>{selectedAppointment.clientName}</Text>
              <Text c="dimmed" size="sm">
                {selectedAppointment.serviceName}
              </Text>
            </Card>

            <Card p="md" radius="xl" withBorder>
              <Text c="dimmed" size="sm">
                Horário e local
              </Text>
              <Text fw={700}>
                {dayjs(selectedAppointment.start).format('DD/MM/YYYY [às] HH:mm')} -{' '}
                {dayjs(selectedAppointment.end).format('HH:mm')}
              </Text>
              <Text c="dimmed" size="sm">
                {selectedAppointment.room} • {selectedAppointmentProfessional?.name ?? 'Profissional não encontrado'}
              </Text>
            </Card>

            <Select
              data={statusOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              label="Status"
              onChange={(value) => {
                if (!value) {
                  return;
                }

                handleUpdateAppointmentStatus(value as Appointment['status']);
              }}
              radius="xl"
              value={selectedAppointment.status}
            />

            {selectedAppointment.notes ? (
              <Card p="md" radius="xl" withBorder>
                <Text c="dimmed" size="sm">
                  Observações
                </Text>
                <Text>{selectedAppointment.notes}</Text>
              </Card>
            ) : null}

            <Group grow>
              <Button
                color="red"
                onClick={handleDeleteAppointment}
                radius="xl"
                variant="light"
              >
                Excluir agendamento
              </Button>
              <Button
                onClick={() => {
                  closeDetailsModal();
                  setSelectedAppointmentId(null);
                }}
                radius="xl"
              >
                Fechar
              </Button>
            </Group>

            <Text c="dimmed" size="xs" ta="center">
              Status atual: {statusLabels[selectedAppointment.status]}
            </Text>
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            Agendamento não encontrado.
          </Text>
        )}
      </Modal>
    </Stack>
  );
}
