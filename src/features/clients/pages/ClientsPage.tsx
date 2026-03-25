import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CalendarPlus, Search, UserPlus, Users } from 'lucide-react';
import { AppointmentStatus, Client, ClientTag, Professional } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

const defaultAppointmentStatuses = ['confirmed', 'in-progress', 'attention', 'available'];

function formatStatusLabel(value: string): string {
  const known: Record<string, string> = {
    confirmed: 'Confirmado',
    'in-progress': 'Em atendimento',
    attention: 'Atenção',
    available: 'Bloqueio',
  };

  return known[value]
    ?? value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
}

interface NewAppointmentForm {
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  serviceName: string;
  room: string;
  professionalId: string;
  status: AppointmentStatus;
  notes: string;
}

type FilterMode = 'all' | ClientTag;

const filterLabels: Record<FilterMode, string> = {
  all: 'Todos',
  vip: 'VIP',
  new: 'Novos',
  attention: 'Atenção',
  inactive: 'Inativos',
  incomplete: 'Incompl.',
};

const tagColors: Record<ClientTag, string> = {
  vip: 'teal',
  new: 'coral',
  attention: 'yellow',
  inactive: 'gray',
  incomplete: 'orange',
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCpf(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = normalizeCpf(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

interface NewClientForm {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthDate: string;
  notes: string;
}

const initialForm: NewClientForm = {
  name: '',
  cpf: '',
  phone: '',
  email: '',
  birthDate: '',
  notes: '',
};

export function ClientsPage() {
  const api = useApi();
  const [clientRecords, setClientRecords] = useState<Client[]>([]);
  const [professionalRecords, setProfessionalRecords] = useState<Professional[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [createOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [form, setForm] = useState<NewClientForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [scheduleOpened, { open: openScheduleModal, close: closeScheduleModal }] = useDisclosure(false);
  const [scheduleForm, setScheduleForm] = useState<NewAppointmentForm | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [appointmentStatusOptions, setAppointmentStatusOptions] = useState<string[]>(defaultAppointmentStatuses);

  useEffect(() => {
    if (!api) return;
    api.clients.list().then(setClientRecords).catch(console.error);
    api.professionals.list().then(setProfessionalRecords).catch(console.error);
    api.tenantSettings.get()
      .then((settings) => {
        if (settings.appointmentStatuses.length > 0) {
          setAppointmentStatusOptions(settings.appointmentStatuses);
        }
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.appointments.list()
      .then((appointments) => {
        setAppointmentStatusOptions((current) => Array.from(new Set([
          ...current,
          ...appointments.map((appointment) => appointment.status),
        ])));
      })
      .catch(console.error);
  }, [api]);

  const filteredClients = useMemo(() => {
    const normalizedText = normalizeText(query);
    const normalizedCpfQuery = normalizeCpf(query);
    const hasTextQuery = normalizedText.length > 0;
    const hasNumericQuery = normalizedCpfQuery.length > 0;

    return clientRecords.filter((client) => {
      const matchesTextChannel =
        hasTextQuery &&
        (normalizeText(client.name).includes(normalizedText) ||
          normalizeText(client.email).includes(normalizedText));

      const matchesNumericChannel =
        hasNumericQuery &&
        (normalizeCpf(client.cpf).includes(normalizedCpfQuery) ||
          normalizeCpf(client.phone).includes(normalizedCpfQuery));

      const matchesQuery =
        (!hasTextQuery && !hasNumericQuery) ||
        matchesTextChannel ||
        matchesNumericChannel;

      const matchesFilter = filter === 'all' || client.tags.includes(filter);

      return matchesQuery && matchesFilter;
    });
  }, [clientRecords, filter, query]);

  const handleOpenClient = (client: Client) => {
    setSelectedClient(client);
    open();
  };

  const handleOpenScheduleModal = (client: Client) => {
    setScheduleError(null);
    setScheduleForm({
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:00',
      clientName: client.name,
      serviceName: '',
      room: '',
      professionalId: professionalRecords[0]?.id ?? '',
      status: 'confirmed',
      notes: '',
    });
    openScheduleModal();
  };

  const handleCreateAppointment = async () => {
    if (!scheduleForm) return;

    const serviceName = scheduleForm.serviceName.trim();
    const room = scheduleForm.room.trim();

    if (!serviceName || !room || !scheduleForm.professionalId) {
      setScheduleError('Preencha serviço, sala e profissional.');
      return;
    }

    const start = dayjs(`${scheduleForm.date}T${scheduleForm.startTime}`);
    const end = dayjs(`${scheduleForm.date}T${scheduleForm.endTime}`);

    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      setScheduleError('O horário final deve ser maior que o inicial.');
      return;
    }

    if (!api) return;
    try {
      await api.appointments.create({
        professionalId: scheduleForm.professionalId,
        clientName: scheduleForm.clientName,
        serviceName,
        room,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: scheduleForm.status,
        notes: scheduleForm.notes.trim() || undefined,
      });
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao criar agendamento.');
      return;
    }

    setScheduleError(null);
    closeScheduleModal();
  };

  const handleSaveClient = async () => {
    const name = form.name.trim();
    const cpfDigits = normalizeCpf(form.cpf);
    const phoneDigits = form.phone.replace(/\D/g, '');
    const email = form.email.trim();

    if (!name) {
      setFormError('Preencha o nome do cliente.');
      return;
    }

    if (cpfDigits.length !== 11) {
      setFormError('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (phoneDigits.length < 10) {
      setFormError('Informe um telefone válido com DDD.');
      return;
    }

    if (clientRecords.some((client) => normalizeCpf(client.cpf) === cpfDigits && client.id !== editingClientId)) {
      setFormError('Já existe cliente cadastrado com este CPF.');
      return;
    }

    if (!api) return;
    try {
      if (editingClientId) {
        const source = clientRecords.find((client) => client.id === editingClientId);
        const updated = await api.clients.update(editingClientId, {
          name,
          cpf: formatCpf(cpfDigits),
          phone: formatPhone(form.phone),
          email,
          birthDate: form.birthDate || '',
          notes: form.notes.trim(),
          tags: source?.tags ?? ['new'],
        });
        setClientRecords((current) => current.map((client) => (client.id === editingClientId ? updated : client)));
        setSelectedClient((current) => (current?.id === editingClientId ? updated : current));
      } else {
        const created = await api.clients.create({
          name,
          cpf: formatCpf(cpfDigits),
          phone: formatPhone(form.phone),
          email,
          tags: ['new'],
          birthDate: form.birthDate || undefined,
          notes: form.notes.trim() || undefined,
        });
        setClientRecords((current) => [created, ...current]);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
      return;
    }
    setForm(initialForm);
    setEditingClientId(null);
    setFormError(null);
    closeCreateModal();
  };

  const handleEditClient = (client: Client) => {
    setEditingClientId(client.id);
    setForm({
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      email: client.email,
      birthDate: client.birthDate ?? '',
      notes: client.notes ?? '',
    });
    setFormError(null);
    openCreateModal();
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              CRM operacional
            </Badge>
            <Title mt="xs" order={2}>
              Clientes ativos e relacionamento
            </Title>
            <Text c="dimmed" mt="xs">
              Gestão mobile-first com foco em busca rápida, sinalização de prioridade e abertura instantânea da ficha.
            </Text>
          </div>

          <Group gap="xs">
            <Button
              leftSection={<UserPlus size={16} />}
              onClick={() => {
                setEditingClientId(null);
                setForm(initialForm);
                setFormError(null);
                openCreateModal();
              }}
              radius="xl"
            >
              Novo cliente
            </Button>
          </Group>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Base total
          </Text>
          <Text fw={800} size="xl">
            {clientRecords.length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Com retorno agendado
          </Text>
          <Text fw={800} size="xl">
            {clientRecords.filter((client) => client.nextAppointment).length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Sinalizados atenção
          </Text>
          <Text fw={800} size="xl">
            {clientRecords.filter((client) => client.tags.includes('attention')).length}
          </Text>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por nome, CPF, telefone ou e-mail"
            radius="xl"
            value={query}
          />

          <SegmentedControl
            data={Object.entries(filterLabels).map(([value, label]) => ({ value, label }))}
            onChange={(value) => setFilter(value as FilterMode)}
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredClients.map((client) => (
          <Card key={client.id} p="md" radius="xl" withBorder>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <Avatar color="teal" radius="xl">
                  {client.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </Avatar>
                <div>
                  <Text fw={800}>{client.name}</Text>
                  <Text c="dimmed" size="sm">
                    CPF: {client.cpf}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {client.phone}
                  </Text>
                  <Group gap={6} mt={6}>
                    {client.tags.map((tag) => (
                      <Badge key={tag} color={tagColors[tag]} radius="xl" size="sm" variant="light">
                        {filterLabels[tag]}
                      </Badge>
                    ))}
                  </Group>
                </div>
              </Group>

              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  color="teal"
                  onClick={() => handleOpenScheduleModal(client)}
                  radius="xl"
                  size={38}
                  title="Novo agendamento"
                  variant="light"
                >
                  <CalendarPlus size={16} />
                </ActionIcon>
                <Button onClick={() => handleOpenClient(client)} radius="xl" variant="light">
                  Ver ficha
                </Button>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {filteredClients.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Group gap="sm" wrap="nowrap">
            <Avatar color="gray" radius="xl">
              <Users size={16} />
            </Avatar>
            <div>
              <Text fw={700}>Nenhum cliente encontrado</Text>
              <Text c="dimmed" size="sm">
                Ajuste os filtros ou limpe o campo de busca para visualizar toda a base.
              </Text>
            </div>
          </Group>
        </Card>
      ) : null}

      <Drawer
        onClose={close}
        opened={opened}
        padding="lg"
        position="right"
        radius="xl"
        title={selectedClient?.name ?? 'Ficha do cliente'}
      >
        {selectedClient ? (
          <Stack gap="md">
            <Card p="md" radius="xl" withBorder>
              <Text c="dimmed" size="sm">
                Contato
              </Text>
              <Text fw={700}>CPF: {selectedClient.cpf}</Text>
              <Text fw={700}>{selectedClient.phone}</Text>
              <Text c="dimmed" size="sm">
                {selectedClient.email}
              </Text>
            </Card>

            <Card p="md" radius="xl" withBorder>
              <Text c="dimmed" size="sm">
                Última visita
              </Text>
              <Text fw={700}>{dayjs(selectedClient.lastVisit).format('DD/MM/YYYY')}</Text>
              <Text c="dimmed" mt="xs" size="sm">
                Data de nascimento:{' '}
                {selectedClient.birthDate
                  ? dayjs(selectedClient.birthDate).format('DD/MM/YYYY')
                  : 'Não informada'}
              </Text>
            </Card>

            <Card p="md" radius="xl" withBorder>
              <Text c="dimmed" size="sm">
                Próximo atendimento
              </Text>
              <Text fw={700}>
                {selectedClient.nextAppointment
                  ? dayjs(selectedClient.nextAppointment).format('DD/MM/YYYY [às] HH:mm')
                  : 'Sem horário marcado'}
              </Text>
              <Group gap={6} mt="sm">
                {selectedClient.tags.map((tag) => (
                  <Badge key={tag} color={tagColors[tag]} radius="xl" variant="light">
                    {filterLabels[tag]}
                  </Badge>
                ))}
              </Group>
              <Button mt="md" onClick={() => handleEditClient(selectedClient)} radius="xl" variant="light">
                Editar cliente
              </Button>
            </Card>

            {selectedClient.notes ? (
              <Card p="md" radius="xl" withBorder>
                <Text c="dimmed" size="sm">
                  Observações
                </Text>
                <Text fw={600}>{selectedClient.notes}</Text>
              </Card>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>

      <Modal
        centered
        onClose={() => {
          closeCreateModal();
          setEditingClientId(null);
          setForm(initialForm);
          setFormError(null);
        }}
        opened={createOpened}
        radius="xl"
        title={editingClientId ? 'Editar cliente' : 'Cadastrar novo cliente'}
      >
        <Stack gap="md">
          <TextInput
            label="Nome"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, name: value }));
            }}
            placeholder="Nome completo"
            radius="xl"
            value={form.name}
          />
          <TextInput
            label="CPF"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                cpf: formatCpf(value),
              }));
            }}
            placeholder="000.000.000-00"
            radius="xl"
            value={form.cpf}
          />
          <TextInput
            label="Telefone"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                phone: formatPhone(value),
              }));
            }}
            placeholder="(00) 00000-0000"
            radius="xl"
            value={form.phone}
          />
          <TextInput
            label="E-mail"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, email: value }));
            }}
            placeholder="cliente@email.com"
            radius="xl"
            value={form.email}
          />
          <TextInput
            label="Data de nascimento (opcional)"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                birthDate: value,
              }));
            }}
            placeholder=""
            radius="xl"
            type="date"
            value={form.birthDate}
          />
          <Textarea
            autosize
            label="Observações"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                notes: value,
              }));
            }}
            placeholder="Preferências, cuidados e observações"
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
                closeCreateModal();
                setEditingClientId(null);
                setFormError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveClient} radius="xl">
              {editingClientId ? 'Salvar alterações' : 'Salvar cliente'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      {scheduleForm ? (
        <Modal
          centered
          onClose={() => {
            closeScheduleModal();
            setScheduleError(null);
          }}
          opened={scheduleOpened}
          radius="xl"
          title="Novo agendamento"
        >
          <Stack gap="md">
            <TextInput
              disabled
              label="Cliente"
              radius="xl"
              value={scheduleForm.clientName}
            />

            <TextInput
              label="Serviço"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setScheduleForm((current) => current ? { ...current, serviceName: value } : current);
              }}
              placeholder="Ex: Podologia completa"
              radius="xl"
              value={scheduleForm.serviceName}
            />

            <Group grow>
              <TextInput
                label="Data"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setScheduleForm((current) => current ? { ...current, date: value } : current);
                }}
                radius="xl"
                type="date"
                value={scheduleForm.date}
              />
              <Select
                data={professionalRecords.map((professional) => ({
                  value: professional.id,
                  label: professional.name,
                }))}
                label="Profissional"
                onChange={(value) => {
                  setScheduleForm((current) =>
                    current ? { ...current, professionalId: value ?? current.professionalId } : current,
                  );
                }}
                radius="xl"
                value={scheduleForm.professionalId}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Início"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setScheduleForm((current) => current ? { ...current, startTime: value } : current);
                }}
                radius="xl"
                type="time"
                value={scheduleForm.startTime}
              />
              <TextInput
                label="Fim"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setScheduleForm((current) => current ? { ...current, endTime: value } : current);
                }}
                radius="xl"
                type="time"
                value={scheduleForm.endTime}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Sala"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setScheduleForm((current) => current ? { ...current, room: value } : current);
                }}
                placeholder="Ex: Sala 02"
                radius="xl"
                value={scheduleForm.room}
              />
              <Select
                data={appointmentStatusOptions.map((status) => ({
                  value: status,
                  label: formatStatusLabel(status),
                }))}
                label="Status"
                onChange={(value) => {
                  if (!value) return;
                  setScheduleForm((current) =>
                    current ? { ...current, status: value as AppointmentStatus } : current,
                  );
                }}
                radius="xl"
                value={scheduleForm.status}
              />
            </Group>

            <Textarea
              autosize
              label="Observações"
              minRows={2}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setScheduleForm((current) => current ? { ...current, notes: value } : current);
              }}
              placeholder="Detalhes rápidos do atendimento"
              radius="xl"
              value={scheduleForm.notes}
            />

            {scheduleError ? (
              <Text c="red" fw={600} size="sm">
                {scheduleError}
              </Text>
            ) : null}

            <Group grow>
              <Button
                onClick={() => {
                  closeScheduleModal();
                  setScheduleError(null);
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
      ) : null}
    </Stack>
  );
}
