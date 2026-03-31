import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CalendarDays, Plus, Search } from 'lucide-react';
import { Professional, ProfessionalSpecialty } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

type ProfessionalFilter = 'all' | 'active' | 'inactive';

interface NewProfessionalForm {
  name: string;
  specialty: string;
  phone: string;
  commissionRate: number;
  active: boolean;
}

interface ScheduleDraft {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const initialForm: NewProfessionalForm = {
  name: '',
  specialty: '',
  phone: '',
  commissionRate: 30,
  active: true,
};

const intervalUnitOptions = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
];
const weekdayOptions = [
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

function normalizeSpecialty(value: string) {
  return value.trim().toLowerCase();
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function ProfessionalsPage() {
  const api = useApi();
  const [records, setRecords] = useState<Professional[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProfessionalFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [specialtiesOpened, { open: openSpecialties, close: closeSpecialties }] = useDisclosure(false);
  const [scheduleOpened, { open: openSchedule, close: closeSchedule }] = useDisclosure(false);
  const [form, setForm] = useState<NewProfessionalForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [managerNewSpecialty, setManagerNewSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<ProfessionalSpecialty[]>([]);
  const [scheduleProfessional, setScheduleProfessional] = useState<Professional | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduleDraft[]>([]);
  const [scheduleWeekday, setScheduleWeekday] = useState('1');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('10:30');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState<number>(30);
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [scheduleMinNoticeValue, setScheduleMinNoticeValue] = useState<number>(0);
  const [scheduleMinNoticeUnit, setScheduleMinNoticeUnit] = useState<'minutes' | 'hours'>('minutes');

  useEffect(() => {
    if (!api) return;
    Promise.all([
      api.professionals.list(),
      api.professionals.specialties.list(),
    ])
      .then(([professionals, loadedSpecialties]) => {
        setRecords(professionals);
        setSpecialties(loadedSpecialties);
      })
      .catch(console.error);
  }, [api]);

  const filteredProfessionals = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((professional) => {
      const matchesText =
        normalized.length === 0 ||
        professional.name.toLowerCase().includes(normalized) ||
        professional.specialty.toLowerCase().includes(normalized) ||
        (professional.phone ?? '').toLowerCase().includes(normalized);

      const active = professional.active ?? true;
      const matchesFilter =
        filter === 'all' ? true : filter === 'active' ? active : !active;

      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const registerSpecialty = useCallback(async (value: string) => {
    if (!api) return null;

    const specialty = value.trim();
    if (!specialty) {
      return null;
    }

    const existing = specialties.find(
      (item) => normalizeSpecialty(item.name) === normalizeSpecialty(specialty),
    );

    if (existing) {
      return existing;
    }

    const created = await api.professionals.specialties.create(specialty);
    setSpecialties((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== created.id);
      return [...withoutDuplicate, created].sort((left, right) => left.name.localeCompare(right.name));
    });

    return created;
  }, [api, specialties]);

  const handleAddSpecialty = async () => {
    const created = await registerSpecialty(specialtySearch);

    if (!created) {
      return;
    }

    setForm((current) => ({ ...current, specialty: created.name }));
    setSpecialtySearch(created.name);
  };

  const handleAddSpecialtyFromManager = async () => {
    const created = await registerSpecialty(managerNewSpecialty);

    if (!created) {
      return;
    }

    setManagerNewSpecialty('');
  };

  const handleRemoveSpecialty = async (specialty: ProfessionalSpecialty) => {
    if (!api) return;

    await api.professionals.specialties.remove(specialty.id);

    setSpecialties((current) =>
      current.filter((item) => normalizeSpecialty(item.name) !== normalizeSpecialty(specialty.name)),
    );

    setForm((current) => {
      if (normalizeSpecialty(current.specialty) !== normalizeSpecialty(specialty.name)) {
        return current;
      }

      return { ...current, specialty: '' };
    });
  };

  const hasSpecialtyMatch = specialties.some(
    (item) => normalizeSpecialty(item.name) === normalizeSpecialty(specialtySearch),
  );
  const canCreateSpecialtyFromModal = specialtySearch.trim().length > 0 && !hasSpecialtyMatch;

  const handleSaveProfessional = useCallback(async () => {
    const name = form.name.trim();
    const specialty = form.specialty.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (!name) {
      setFormError('Preencha o nome.');
      return;
    }

    if (phoneDigits.length < 10) {
      setFormError('Informe um telefone válido com DDD.');
      return;
    }

    if (form.commissionRate < 0 || form.commissionRate > 100) {
      setFormError('A comissão deve estar entre 0 e 100%.');
      return;
    }

    if (!api) return;

    let specialtyToSave = specialty;

    try {
      if (specialty.length > 0) {
        const ensuredSpecialty = await registerSpecialty(specialty);
        if (ensuredSpecialty) {
          specialtyToSave = ensuredSpecialty.name;
        }
      }

      if (editingProfessionalId) {
        const updated = await api.professionals.update(editingProfessionalId, {
          name,
          specialty: specialtyToSave,
          phone: formatPhone(form.phone),
          commissionRate: form.commissionRate,
          active: form.active,
        });
        setRecords((current) =>
          current.map((p) => (p.id === editingProfessionalId ? updated : p)),
        );
      } else {
        const created = await api.professionals.create({
          name,
          specialty: specialtyToSave,
          phone: formatPhone(form.phone),
          commissionRate: form.commissionRate,
          active: form.active,
        });
        setRecords((current) => [created, ...current]);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar profissional.');
      return;
    }

    setEditingProfessionalId(null);
    setSpecialtySearch('');
    setForm(initialForm);
    setFormError(null);
    close();
  }, [api, close, editingProfessionalId, form, registerSpecialty]);

  const handleEditProfessional = (professional: Professional) => {
    setEditingProfessionalId(professional.id);
    setForm({
      name: professional.name,
      specialty: professional.specialty,
      phone: professional.phone ?? '',
      commissionRate: professional.commissionRate ?? 0,
      active: professional.active ?? true,
    });
    setSpecialtySearch(professional.specialty);
    setFormError(null);
    open();
  };

  const toggleProfessionalStatus = useCallback(async (professionalId: string) => {
    const target = records.find((p) => p.id === professionalId);
    if (!target || !api) return;
    const updated = await api.professionals.update(professionalId, { active: !(target.active ?? true) });
    setRecords((current) => current.map((p) => (p.id === professionalId ? updated : p)));
  }, [api, records]);

  const handleOpenSchedule = useCallback(async (professional: Professional) => {
    if (!api) return;
    setScheduleProfessional(professional);
    setScheduleError(null);
    setSavingSchedule(false);

    try {
      const existing = await api.professionals.schedules.list(professional.id);
      const mapped = existing.records.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      const intervalMinutes = existing.slotIntervalMinutes || 30;
      if (intervalMinutes % 60 === 0 && intervalMinutes >= 60) {
        setScheduleIntervalValue(intervalMinutes / 60);
        setScheduleIntervalUnit('hours');
      } else {
        setScheduleIntervalValue(intervalMinutes);
        setScheduleIntervalUnit('minutes');
      }

      const minNoticeMinutes = existing.minBookingNoticeMinutes || 0;
      if (minNoticeMinutes > 0 && minNoticeMinutes % 60 === 0) {
        setScheduleMinNoticeValue(minNoticeMinutes / 60);
        setScheduleMinNoticeUnit('hours');
      } else {
        setScheduleMinNoticeValue(minNoticeMinutes);
        setScheduleMinNoticeUnit('minutes');
      }

      setScheduleRows(mapped);
      openSchedule();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao carregar agenda do profissional.');
      setScheduleRows([]);
      setScheduleMinNoticeValue(0);
      setScheduleMinNoticeUnit('minutes');
      openSchedule();
    }
  }, [api, openSchedule]);

  const handleAddShift = () => {
    const weekday = Number(scheduleWeekday);
    if (toMinutes(scheduleEnd) <= toMinutes(scheduleStart)) {
      setScheduleError('Horário final deve ser maior que o horário inicial.');
      return;
    }

    const overlap = scheduleRows.some((row) =>
      row.weekday === weekday
      && toMinutes(scheduleStart) < toMinutes(row.endTime)
      && toMinutes(scheduleEnd) > toMinutes(row.startTime),
    );

    if (overlap) {
      setScheduleError('Este turno se sobrepõe a outro já cadastrado no mesmo dia.');
      return;
    }

    setScheduleRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        weekday,
        startTime: scheduleStart,
        endTime: scheduleEnd,
      },
    ].sort((a, b) => (a.weekday - b.weekday) || (a.startTime.localeCompare(b.startTime))));
    setScheduleError(null);
  };

  const handleRemoveShift = (id: string) => {
    setScheduleRows((current) => current.filter((row) => row.id !== id));
  };

  const handleSaveSchedule = useCallback(async () => {
    if (!api || !scheduleProfessional) return;

    const intervalMinutes = Math.max(
      1,
      Math.round(
        scheduleIntervalUnit === 'hours'
          ? (scheduleIntervalValue || 1) * 60
          : (scheduleIntervalValue || 1),
      ),
    );

    const minBookingNoticeMinutes = Math.max(
      0,
      Math.round(
        scheduleMinNoticeUnit === 'hours'
          ? (scheduleMinNoticeValue || 0) * 60
          : (scheduleMinNoticeValue || 0),
      ),
    );

    setSavingSchedule(true);
    try {
      const saved = await api.professionals.schedules.set(
        scheduleProfessional.id,
        intervalMinutes,
        minBookingNoticeMinutes,
        scheduleRows.map((row) => ({
          weekday: row.weekday,
          startTime: row.startTime,
          endTime: row.endTime,
        })),
      );

      setScheduleRows(saved.records.map((row) => ({
        id: row.id,
        weekday: row.weekday,
        startTime: row.startTime,
        endTime: row.endTime,
      })));
      const savedInterval = saved.slotIntervalMinutes || 30;
      if (savedInterval % 60 === 0 && savedInterval >= 60) {
        setScheduleIntervalValue(savedInterval / 60);
        setScheduleIntervalUnit('hours');
      } else {
        setScheduleIntervalValue(savedInterval);
        setScheduleIntervalUnit('minutes');
      }

      const savedMinNotice = saved.minBookingNoticeMinutes || 0;
      if (savedMinNotice > 0 && savedMinNotice % 60 === 0) {
        setScheduleMinNoticeValue(savedMinNotice / 60);
        setScheduleMinNoticeUnit('hours');
      } else {
        setScheduleMinNoticeValue(savedMinNotice);
        setScheduleMinNoticeUnit('minutes');
      }

      setScheduleError(null);
      closeSchedule();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao salvar agenda do profissional.');
    } finally {
      setSavingSchedule(false);
    }
  }, [
    api,
    closeSchedule,
    scheduleIntervalUnit,
    scheduleIntervalValue,
    scheduleMinNoticeUnit,
    scheduleMinNoticeValue,
    scheduleProfessional,
    scheduleRows,
  ]);

  const weeklyColumns = useMemo(() => weekdayOptions.map((day) => ({
    weekday: Number(day.value),
    label: day.label,
    rows: scheduleRows
      .filter((row) => row.weekday === Number(day.value))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })), [scheduleRows]);

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Gestão de equipe
            </Badge>
            <Title mt="xs" order={2}>
              Profissionais
            </Title>
            <Text c="dimmed" mt="xs">
              Controle da equipe com disponibilidade e comissão para apoiar agenda e financeiro.
            </Text>
          </div>
          <Group gap="sm">
            <Button onClick={openSpecialties} radius="xl" variant="light">
              Gerenciar especialidades
            </Button>
            <Button
              leftSection={<Plus size={16} />}
              onClick={() => {
                setEditingProfessionalId(null);
                setForm(initialForm);
                setSpecialtySearch('');
                setFormError(null);
                open();
              }}
              radius="xl"
            >
              Novo profissional
            </Button>
          </Group>
        </Group>
      </Card>

      <Group grow>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Profissionais ativos
          </Text>
          <Text fw={800} size="xl">
            {records.filter((professional) => professional.active ?? true).length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Comissão média
          </Text>
          <Text fw={800} size="xl">
            {Math.round(
              records.reduce((acc, professional) => acc + (professional.commissionRate ?? 0), 0) /
              Math.max(records.length, 1),
            )}
            %
          </Text>
        </Card>
      </Group>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por nome, especialidade ou telefone"
            radius="xl"
            value={query}
          />

          <SegmentedControl
            data={[
              { label: 'Todos', value: 'all' },
              { label: 'Ativos', value: 'active' },
              { label: 'Inativos', value: 'inactive' },
            ]}
            onChange={(value) => setFilter(value as ProfessionalFilter)}
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredProfessionals.map((professional) => (
          <Card key={professional.id} p="md" radius="xl" withBorder>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group wrap="nowrap">
                <Avatar color="teal" radius="xl" size={44}>
                  {professional.shortName}
                </Avatar>
                <div>
                  <Text fw={800}>{professional.name}</Text>
                  <Text c="dimmed" size="sm">
                    {professional.specialty}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {professional.phone ?? 'Telefone não informado'}
                  </Text>
                </div>
              </Group>

              <Stack align="flex-end" gap="xs">
                <Badge color={professional.active ?? true ? 'teal' : 'gray'} radius="xl" variant="light">
                  {professional.active ?? true ? 'Ativo' : 'Inativo'}
                </Badge>
                <Text fw={700}>{professional.commissionRate ?? 0}% comissão</Text>
                <Button
                  onClick={() => toggleProfessionalStatus(professional.id)}
                  radius="xl"
                  size="xs"
                  variant="light"
                >
                  {professional.active ?? true ? 'Inativar' : 'Ativar'}
                </Button>
                <Button
                  onClick={() => handleEditProfessional(professional)}
                  radius="xl"
                  size="xs"
                  variant="outline"
                >
                  Editar
                </Button>
                <Button
                  leftSection={<CalendarDays size={14} />}
                  onClick={() => void handleOpenSchedule(professional)}
                  radius="xl"
                  size="xs"
                  variant="light"
                >
                  Agenda
                </Button>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      {filteredProfessionals.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Text fw={700}>Nenhum profissional encontrado</Text>
          <Text c="dimmed" size="sm">
            Ajuste filtros ou cadastre novos profissionais.
          </Text>
        </Card>
      ) : null}

      <Modal
        centered
        onClose={() => {
          closeSchedule();
          setScheduleProfessional(null);
          setScheduleError(null);
        }}
        opened={scheduleOpened}
        radius="xl"
        size="lg"
        title={scheduleProfessional ? `Agenda de ${scheduleProfessional.name}` : 'Agenda do profissional'}
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            Defina os dias e turnos de atendimento. Exemplo: 08:00-10:30 e 13:00-16:00 no mesmo dia.
          </Text>

          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <Select
              data={weekdayOptions}
              label="Dia da semana"
              onChange={(value) => setScheduleWeekday(value ?? '1')}
              value={scheduleWeekday}
            />
            <TextInput
              label="Início"
              type="time"
              value={scheduleStart}
              onChange={(event) => setScheduleStart(event.currentTarget.value)}
            />
            <TextInput
              label="Fim"
              type="time"
              value={scheduleEnd}
              onChange={(event) => setScheduleEnd(event.currentTarget.value)}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <NumberInput
              label="Intervalo de agendamento"
              min={1}
              onChange={(value) => setScheduleIntervalValue(Number(value) || 1)}
              value={scheduleIntervalValue}
            />
            <Select
              data={intervalUnitOptions}
              label="Unidade"
              onChange={(value) => setScheduleIntervalUnit((value as 'minutes' | 'hours') ?? 'minutes')}
              value={scheduleIntervalUnit}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <NumberInput
              label="Antecedência mínima para agendamento"
              min={0}
              onChange={(value) => setScheduleMinNoticeValue(Number(value) || 0)}
              value={scheduleMinNoticeValue}
            />
            <Select
              data={intervalUnitOptions}
              label="Unidade da antecedência"
              onChange={(value) => setScheduleMinNoticeUnit((value as 'minutes' | 'hours') ?? 'minutes')}
              value={scheduleMinNoticeUnit}
            />
          </SimpleGrid>

          <Group justify="flex-end">
            <Button onClick={handleAddShift} radius="xl" variant="light">
              Adicionar turno
            </Button>
          </Group>

          <Divider label="Visão semanal (Seg-Dom)" labelPosition="left" />

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4, lg: 7 }}>
            {weeklyColumns.map((column) => (
              <Card key={column.weekday} withBorder radius="lg" p="sm">
                <Stack gap="xs">
                  <Text fw={700} size="sm">{column.label}</Text>
                  {column.rows.length > 0 ? column.rows.map((row) => (
                    <Group key={row.id} justify="space-between" wrap="nowrap">
                      <Text size="xs">{row.startTime} - {row.endTime}</Text>
                      <Button size="compact-xs" radius="xl" variant="subtle" color="red" onClick={() => handleRemoveShift(row.id)}>
                        x
                      </Button>
                    </Group>
                  )) : <Text c="dimmed" size="xs">Sem turno</Text>}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          {scheduleError ? (
            <Text c="red" fw={600} size="sm">{scheduleError}</Text>
          ) : null}

          <Group grow>
            <Button
              onClick={() => {
                closeSchedule();
                setScheduleProfessional(null);
                setScheduleError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button loading={savingSchedule} onClick={handleSaveSchedule} radius="xl">
              Salvar agenda
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeSpecialties();
          setManagerNewSpecialty('');
        }}
        opened={specialtiesOpened}
        radius="xl"
        title="Gerenciar especialidades"
      >
        <Stack gap="md">
          <Group align="flex-end" wrap="nowrap">
            <TextInput
              label="Nova especialidade"
              onChange={(event) => {
                setManagerNewSpecialty(event.currentTarget.value);
              }}
              placeholder="Ex: Reflexologia"
              radius="xl"
              style={{ flex: 1 }}
              value={managerNewSpecialty}
            />
            <Button onClick={handleAddSpecialtyFromManager} radius="xl" variant="light">
              Adicionar
            </Button>
          </Group>

          <Stack gap="xs">
            {specialties.length > 0 ? specialties.map((specialty) => (
              <Group key={specialty.id} justify="space-between" wrap="nowrap">
                <Text>{specialty.name}</Text>
                <Button
                  color="red"
                  onClick={() => void handleRemoveSpecialty(specialty)}
                  radius="xl"
                  size="compact-sm"
                  variant="subtle"
                >
                  Remover
                </Button>
              </Group>
            )) : (
              <Text c="dimmed" size="sm">
                Nenhuma especialidade cadastrada.
              </Text>
            )}
          </Stack>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          close();
          setEditingProfessionalId(null);
          setSpecialtySearch('');
          setFormError(null);
        }}
        opened={opened}
        radius="xl"
        title={editingProfessionalId ? 'Editar profissional' : 'Novo profissional'}
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

          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <Text fw={500} size="sm">Especialidade (opcional)</Text>
            {canCreateSpecialtyFromModal ? (
              <Button onClick={() => void handleAddSpecialty()} radius="xl" size="compact-sm" variant="light">
                Criar "{specialtySearch.trim()}"
              </Button>
            ) : null}
          </Group>

          <Select
            data={specialties.map((specialty) => ({
              value: specialty.name,
              label: specialty.name,
            }))}
            onChange={(value) => {
              const selected = value ?? '';
              setForm((current) => ({ ...current, specialty: selected }));
              setSpecialtySearch(selected);
            }}
            onSearchChange={setSpecialtySearch}
            searchValue={specialtySearch}
            nothingFoundMessage={specialtySearch.trim().length > 0 ? 'Nenhuma especialidade encontrada' : 'Sem opções'}
            placeholder="Selecione ou digite uma especialidade"
            radius="xl"
            searchable
            value={form.specialty}
          />

          <Text c="dimmed" size="xs">
            Você pode deixar em branco ou criar uma nova especialidade ao digitar.
          </Text>

          <TextInput
            label="Telefone"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, phone: formatPhone(value) }));
            }}
            placeholder="(00) 00000-0000"
            radius="xl"
            value={form.phone}
          />

          <NumberInput
            label="Comissão (%)"
            max={100}
            min={0}
            onChange={(value) => {
              setForm((current) => ({ ...current, commissionRate: Number(value) || 0 }));
            }}
            radius="xl"
            value={form.commissionRate}
          />

          <Switch
            checked={form.active}
            label="Profissional ativo"
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setForm((current) => ({ ...current, active: checked }));
            }}
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
                setEditingProfessionalId(null);
                setSpecialtySearch('');
                setFormError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProfessional} radius="xl">
              {editingProfessionalId ? 'Salvar alterações' : 'Salvar profissional'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
