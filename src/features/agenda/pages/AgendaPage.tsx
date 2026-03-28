import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ActionIcon,
  Autocomplete,
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  Divider,
  Grid,
  Group,
  Modal,
  NumberInput,
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
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Appointment, Client, Professional, Service } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/features/auth/auth-context';
import { ProfessionalSelector } from '@/features/agenda/components/ProfessionalSelector';
import { ScheduleTimeline } from '@/features/agenda/components/ScheduleTimeline';
import { ScheduleGridDesktop } from '@/features/agenda/components/ScheduleGridDesktop';

type ViewMode = 'day' | 'week';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatPhoneAgenda(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

const statusOptions = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in-progress', label: 'Em atendimento' },
  { value: 'attention', label: 'Atenção' },
  { value: 'available', label: 'Bloqueio' },
] as const;

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

function isBlockedStatus(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === 'available' || normalized.includes('bloqueio') || normalized.includes('block');
}

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

interface CreateAppointmentScheduleConfig {
  slotIntervalMinutes: number;
  records: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
  }>;
}

interface ScheduleDraft {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

type ScheduleConfigMode = 'standard' | 'per-day';

interface ScheduleSummary {
  dayCount: number;
  periodCount: number;
  slotIntervalMinutes: number;
  minBookingNoticeMinutes: number;
}

const weekdayOptions = [
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terca' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sabado' },
  { value: '0', label: 'Domingo' },
];

function toMinutes(value: string): number {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

function toTimeLabel(totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function sortWeekdays(values: string[]): string[] {
  const order = weekdayOptions.map((item) => item.value);
  return Array.from(new Set(values)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function detectScheduleConfigMode(rows: ScheduleDraft[]): ScheduleConfigMode {
  if (rows.length === 0) return 'standard';

  const grouped = new Map<number, string[]>();
  rows.forEach((row) => {
    const current = grouped.get(row.weekday) ?? [];
    current.push(`${row.startTime}-${row.endTime}`);
    grouped.set(row.weekday, current);
  });

  const signatures = Array.from(grouped.values()).map((slots) => slots.sort().join('|'));
  return new Set(signatures).size <= 1 ? 'standard' : 'per-day';
}

function extractSelectedWeekdays(rows: ScheduleDraft[]): string[] {
  const values = rows.map((row) => String(row.weekday));
  return sortWeekdays(values);
}

function getInitialAppointmentForm(selectedDate: dayjs.Dayjs, selectedProfessionalId = ''): NewAppointmentForm {
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
  const api = useApi();
  const { tenantId } = useAuth();
  const [appointmentRecords, setAppointmentRecords] = useState<Appointment[]>([]);
  const [professionalRecords, setProfessionalRecords] = useState<Professional[]>([]);
  const [view, setView] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [createOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [createScheduleOpened, { open: openCreateScheduleModal, close: closeCreateScheduleModal }] = useDisclosure(false);
  const [manageSchedulesOpened, { open: openManageSchedulesModal, close: closeManageSchedulesModal }] = useDisclosure(false);
  const [detailsOpened, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [newAppointmentForm, setNewAppointmentForm] = useState<NewAppointmentForm>(() =>
    getInitialAppointmentForm(dayjs(), ''),
  );
  const [createScheduleConfig, setCreateScheduleConfig] = useState<CreateAppointmentScheduleConfig | null>(null);
  const [matchedClient, setMatchedClient] = useState<Client | null>(null);
  const [newClientPhone, setNewClientPhone] = useState('');
  const [publicBookingMessage, setPublicBookingMessage] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleProfessionalId, setScheduleProfessionalId] = useState('');
  const [scheduleRows, setScheduleRows] = useState<ScheduleDraft[]>([]);
  const [scheduleConfigMode, setScheduleConfigMode] = useState<ScheduleConfigMode>('standard');
  const [scheduleSelectedWeekdays, setScheduleSelectedWeekdays] = useState<string[]>(['1']);
  const [scheduleWeekday, setScheduleWeekday] = useState('1');
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('10:30');
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState<number>(30);
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [scheduleMinNoticeValue, setScheduleMinNoticeValue] = useState<number>(0);
  const [scheduleMinNoticeUnit, setScheduleMinNoticeUnit] = useState<'minutes' | 'hours'>('minutes');
  const [scheduleSummaries, setScheduleSummaries] = useState<Record<string, ScheduleSummary>>({});
  const [scheduleSummariesLoading, setScheduleSummariesLoading] = useState(false);
  const [manageSchedulesError, setManageSchedulesError] = useState<string | null>(null);
  const clientCombobox = useCombobox({ onDropdownClose: () => clientCombobox.resetSelectedOption() });
  const [clientRecords, setClientRecords] = useState<Client[]>([]);
  const [serviceRecords, setServiceRecords] = useState<Service[]>([]);
  const [appointmentStatusOptions, setAppointmentStatusOptions] = useState<string[]>(statusOptions.map((item) => item.value));
  const [statusManagementOpened, { open: openStatusManagementModal, close: closeStatusManagementModal }] = useDisclosure(false);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [statusManagementError, setStatusManagementError] = useState<string | null>(null);
  const [editingStatusKey, setEditingStatusKey] = useState<string | null>(null);
  const [editingStatusLabel, setEditingStatusLabel] = useState('');
  const isDesktop = useMediaQuery('(min-width: 75em)');

  useEffect(() => {
    if (!api) return;
    api.professionals.list().then((data) => {
      setProfessionalRecords(data);
      setSelectedProfessionalId((cur) => cur || data[0]?.id || '');
      setNewAppointmentForm((cur) => cur.professionalId ? cur : { ...cur, professionalId: data[0]?.id ?? '' });
    }).catch(console.error);
    api.appointments.list().then(setAppointmentRecords).catch(console.error);
    api.clients.list().then(setClientRecords).catch(console.error);
    api.services.list().then(setServiceRecords).catch(console.error);
    api.tenantSettings.get()
      .then((settings) => {
        if (settings.appointmentStatuses.length > 0) {
          setAppointmentStatusOptions(settings.appointmentStatuses);
        }
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    if (appointmentRecords.length === 0) return;
    setAppointmentStatusOptions((current) => Array.from(new Set([
      ...current,
      ...appointmentRecords.map((appointment) => appointment.status),
    ])));
  }, [appointmentRecords]);

  const agendaWeek = useMemo(
    () => Array.from({ length: 7 }, (_, i) => selectedDate.startOf('week').add(i, 'day')),
    [selectedDate],
  );

  const selectedProfessional = professionalRecords.find((professional) => professional.id === selectedProfessionalId);
  const selectedAppointment = selectedAppointmentId
    ? appointmentRecords.find((appointment) => appointment.id === selectedAppointmentId) ?? null
    : null;
  const selectedAppointmentProfessional = selectedAppointment
    ? professionalRecords.find((professional) => professional.id === selectedAppointment.professionalId)
    : undefined;

  const selectedProfessionalAppointments = useMemo(
    () => appointmentRecords.filter((appointment) => appointment.professionalId === selectedProfessionalId),
    [appointmentRecords, selectedProfessionalId],
  );

  const clientSuggestions = useMemo((): Client[] => {
    const q = newAppointmentForm.clientName.trim();
    if (q.length < 2) return [];
    const normalized = normalizeSearch(q);
    const digits = q.replace(/\D/g, '');
    return clientRecords
      .filter((c) => {
        const nameMatch = normalizeSearch(c.name).includes(normalized);
        const emailMatch = c.email ? normalizeSearch(c.email).includes(normalized) : false;
        const cpfMatch = digits.length > 0 && c.cpf.replace(/\D/g, '').includes(digits);
        const phoneMatch = digits.length > 0 && c.phone.replace(/\D/g, '').includes(digits);
        return nameMatch || emailMatch || cpfMatch || phoneMatch;
      })
      .slice(0, 6);
  }, [clientRecords, newAppointmentForm.clientName]);

  const activeServiceNames = useMemo(
    () => serviceRecords.filter((s) => s.active).map((s) => s.name),
    [serviceRecords],
  );

  const selectedService = useMemo(() => {
    const serviceName = normalizeSearch(newAppointmentForm.serviceName);
    if (!serviceName) {
      return undefined;
    }

    return serviceRecords.find(
      (service) => normalizeSearch(service.name) === serviceName,
    );
  }, [newAppointmentForm.serviceName, serviceRecords]);

  const dailyAppointments = useMemo(
    () => appointmentsForDate(selectedDate, selectedProfessionalAppointments).sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [selectedDate, selectedProfessionalAppointments],
  );

  const occupancy = useMemo(() => {
    const confirmedCount = dailyAppointments.filter((appointment) => appointment.status === 'confirmed').length;
    const blockedCount = dailyAppointments.filter((appointment) => isBlockedStatus(appointment.status)).length;

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
        return { date, count: dateAppointments.length, revenueHint: dateAppointments.length * 145 };
      }),
    [agendaWeek, appointmentRecords],
  );

  const createDurationMinutes = useMemo(() => {
    if (selectedService?.durationMinutes) {
      return selectedService.durationMinutes;
    }

    const start = toMinutes(newAppointmentForm.startTime);
    const end = toMinutes(newAppointmentForm.endTime);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return end - start;
    }

    return 30;
  }, [newAppointmentForm.endTime, newAppointmentForm.startTime, selectedService]);

  const createFormDayAppointments = useMemo(() => {
    if (!newAppointmentForm.date || !newAppointmentForm.professionalId) {
      return [] as Appointment[];
    }

    return appointmentRecords.filter((appointment) =>
      appointment.professionalId === newAppointmentForm.professionalId
      && dayjs(appointment.start).isSame(dayjs(newAppointmentForm.date), 'day'));
  }, [appointmentRecords, newAppointmentForm.date, newAppointmentForm.professionalId]);

  const availableCreateStartTimes = useMemo(() => {
    if (!newAppointmentForm.date || !newAppointmentForm.professionalId) {
      return [] as Array<{ value: string; label: string }>;
    }

    const weekday = dayjs(newAppointmentForm.date).day();
    const scheduleRows = (createScheduleConfig?.records ?? []).filter((row) => row.weekday === weekday);
    const windows = scheduleRows.length > 0
      ? scheduleRows.map((row) => ({ start: toMinutes(row.startTime), end: toMinutes(row.endTime) }))
      : [{ start: toMinutes('08:00'), end: toMinutes('18:00') }];

    const step = createScheduleConfig?.slotIntervalMinutes ?? 30;
    const occupied = createFormDayAppointments.map((appointment) => ({
      start: toMinutes(dayjs(appointment.start).format('HH:mm')),
      end: toMinutes(dayjs(appointment.end).format('HH:mm')),
    }));

    const options: Array<{ value: string; label: string }> = [];
    for (const window of windows) {
      for (let start = window.start; start + createDurationMinutes <= window.end; start += step) {
        const end = start + createDurationMinutes;
        const hasConflict = occupied.some((slot) => start < slot.end && end > slot.start);
        if (hasConflict) continue;

        const value = toTimeLabel(start);
        options.push({ value, label: value });
      }
    }

    return options;
  }, [createDurationMinutes, createFormDayAppointments, createScheduleConfig, newAppointmentForm.date, newAppointmentForm.professionalId]);

  useEffect(() => {
    if (!createOpened) return;

    if (availableCreateStartTimes.length === 0) {
      return;
    }

    const currentIsValid = availableCreateStartTimes.some((slot) => slot.value === newAppointmentForm.startTime);
    if (currentIsValid) {
      const nextEnd = addMinutesToTime(newAppointmentForm.startTime, createDurationMinutes);
      if (newAppointmentForm.endTime !== nextEnd) {
        setNewAppointmentForm((current) => ({ ...current, endTime: nextEnd }));
      }
      return;
    }

    const first = availableCreateStartTimes[0]?.value;
    if (!first) return;

    setNewAppointmentForm((current) => ({
      ...current,
      startTime: first,
      endTime: addMinutesToTime(first, createDurationMinutes),
    }));
  }, [availableCreateStartTimes, createDurationMinutes, createOpened, newAppointmentForm.endTime, newAppointmentForm.startTime]);

  const goToAdjacentDay = (direction: -1 | 1) => {
    setSelectedDate((current) => current.add(direction, 'day'));
  };

  const weeklyColumns = useMemo(() => weekdayOptions.map((day) => ({
    weekday: Number(day.value),
    label: day.label,
    rows: scheduleRows
      .filter((row) => row.weekday === Number(day.value))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })), [scheduleRows]);

  const scheduleRowsEditor = useMemo(() => {
    if (scheduleConfigMode === 'standard') {
      const baseWeekday = scheduleSelectedWeekdays[0];
      if (!baseWeekday) return [];
      return scheduleRows
        .filter((row) => row.weekday === Number(baseWeekday))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return scheduleRows
      .filter((row) => row.weekday === Number(scheduleWeekday))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [scheduleConfigMode, scheduleRows, scheduleSelectedWeekdays, scheduleWeekday]);

  const availableWeekdayOptions = useMemo(
    () => weekdayOptions.filter((option) => scheduleSelectedWeekdays.includes(option.value)),
    [scheduleSelectedWeekdays],
  );

  const handleOpenCreateModal = () => {
    const defaultProfessionalId = selectedProfessionalId || professionalRecords[0]?.id || '';
    setFormError(null);
    setMatchedClient(null);
    setNewClientPhone('');
    setCreateScheduleConfig(null);
    setNewAppointmentForm(getInitialAppointmentForm(selectedDate, defaultProfessionalId));

    if (api && defaultProfessionalId) {
      api.professionals.schedules.list(defaultProfessionalId)
        .then((config) => {
          setCreateScheduleConfig({
            slotIntervalMinutes: config.slotIntervalMinutes,
            records: config.records.map((row) => ({
              weekday: row.weekday,
              startTime: row.startTime,
              endTime: row.endTime,
            })),
          });
        })
        .catch(() => setCreateScheduleConfig(null));
    }

    openCreateModal();
  };

  const handleCopyPublicBookingLink = async () => {
    if (!api || !tenantId) return;

    try {
      const data = await api.bookingLinks.current();
      const fullLink = `${window.location.origin}${data.urlPath}`;
      await navigator.clipboard.writeText(fullLink);
      setPublicBookingMessage('Link de autoagendamento copiado com sucesso.');
    } catch (err) {
      setPublicBookingMessage(err instanceof Error ? err.message : 'Não foi possível gerar o link público.');
    }
  };

  const handleOpenCreateScheduleModal = async (professionalIdFromAction?: string) => {
    if (!api) return;
    const professionalId = professionalIdFromAction || selectedProfessionalId || professionalRecords[0]?.id || '';
    setScheduleProfessionalId(professionalId);
    setScheduleRows([]);
    setScheduleConfigMode('standard');
    setScheduleSelectedWeekdays(['1']);
    setScheduleWeekday('1');
    setScheduleError(null);
    setScheduleSaving(false);

    if (professionalId) {
      try {
        const existing = await api.professionals.schedules.list(professionalId);
        const loadedRows = existing.records.map((slot) => ({
          id: slot.id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
        const loadedWeekdays = extractSelectedWeekdays(loadedRows);

        setScheduleRows(loadedRows);
        setScheduleSelectedWeekdays(loadedWeekdays.length > 0 ? loadedWeekdays : ['1']);
        setScheduleWeekday(loadedWeekdays[0] ?? '1');
        setScheduleConfigMode(detectScheduleConfigMode(loadedRows));

        const minutes = existing.slotIntervalMinutes || 30;
        if (minutes % 60 === 0 && minutes >= 60) {
          setScheduleIntervalValue(minutes / 60);
          setScheduleIntervalUnit('hours');
        } else {
          setScheduleIntervalValue(minutes);
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
      } catch (err) {
        setScheduleError(err instanceof Error ? err.message : 'Erro ao carregar agenda do profissional.');
      }
    }

    openCreateScheduleModal();
  };

  const handleOpenManageSchedulesModal = async () => {
    if (!api) return;
    setManageSchedulesError(null);
    setScheduleSummariesLoading(true);
    openManageSchedulesModal();

    try {
      const entries = await Promise.all(
        professionalRecords.map(async (professional) => {
          const config = await api.professionals.schedules.list(professional.id);
          const dayCount = new Set(config.records.map((row) => row.weekday)).size;
          return [professional.id, {
            dayCount,
            periodCount: config.records.length,
            slotIntervalMinutes: config.slotIntervalMinutes,
            minBookingNoticeMinutes: config.minBookingNoticeMinutes,
          } as ScheduleSummary] as const;
        }),
      );

      setScheduleSummaries(Object.fromEntries(entries));
    } catch (err) {
      setManageSchedulesError(err instanceof Error ? err.message : 'Erro ao carregar agendas existentes.');
    } finally {
      setScheduleSummariesLoading(false);
    }
  };

  const handleChangeScheduleProfessional = async (value: string) => {
    if (!api) return;
    setScheduleProfessionalId(value);
    setScheduleRows([]);
    setScheduleError(null);

    try {
      const existing = await api.professionals.schedules.list(value);
      const loadedRows = existing.records.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      const loadedWeekdays = extractSelectedWeekdays(loadedRows);

      setScheduleRows(loadedRows);
      setScheduleSelectedWeekdays(loadedWeekdays.length > 0 ? loadedWeekdays : ['1']);
      setScheduleWeekday(loadedWeekdays[0] ?? '1');
      setScheduleConfigMode(detectScheduleConfigMode(loadedRows));

      const minutes = existing.slotIntervalMinutes || 30;
      if (minutes % 60 === 0 && minutes >= 60) {
        setScheduleIntervalValue(minutes / 60);
        setScheduleIntervalUnit('hours');
      } else {
        setScheduleIntervalValue(minutes);
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
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao carregar agenda do profissional.');
    }
  };

  const handleToggleScheduleWeekday = (weekdayValue: string, checked: boolean) => {
    const weekdayNumber = Number(weekdayValue);

    if (checked) {
      const nextWeekdays = sortWeekdays([...scheduleSelectedWeekdays, weekdayValue]);
      setScheduleSelectedWeekdays(nextWeekdays);
      if (!nextWeekdays.includes(scheduleWeekday)) {
        setScheduleWeekday(weekdayValue);
      }

      if (scheduleConfigMode === 'standard') {
        const templateWeekday = Number(scheduleSelectedWeekdays[0] ?? weekdayValue);
        const templateRows = scheduleRows.filter((row) => row.weekday === templateWeekday);
        if (templateRows.length > 0) {
          setScheduleRows((current) => [
            ...current.filter((row) => row.weekday !== weekdayNumber),
            ...templateRows.map((row) => ({
              id: crypto.randomUUID(),
              weekday: weekdayNumber,
              startTime: row.startTime,
              endTime: row.endTime,
            })),
          ]);
        }
      }

      return;
    }

    const nextWeekdays = sortWeekdays(scheduleSelectedWeekdays.filter((value) => value !== weekdayValue));
    setScheduleSelectedWeekdays(nextWeekdays);
    setScheduleRows((current) => current.filter((row) => row.weekday !== weekdayNumber));

    if (scheduleWeekday === weekdayValue) {
      setScheduleWeekday(nextWeekdays[0] ?? '1');
    }
  };

  const handleChangeScheduleConfigMode = (mode: ScheduleConfigMode) => {
    setScheduleConfigMode(mode);

    if (mode === 'standard') {
      const selected = scheduleSelectedWeekdays.length > 0 ? scheduleSelectedWeekdays : ['1'];
      const baseWeekday = Number(scheduleWeekday || selected[0]);
      const templateRows = scheduleRows
        .filter((row) => row.weekday === baseWeekday)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const nextRows: ScheduleDraft[] = [];
      selected.forEach((weekdayValue) => {
        const weekdayNumber = Number(weekdayValue);
        templateRows.forEach((row) => {
          nextRows.push({
            id: crypto.randomUUID(),
            weekday: weekdayNumber,
            startTime: row.startTime,
            endTime: row.endTime,
          });
        });
      });

      setScheduleRows(nextRows);
    }
  };

  const handleAddScheduleShift = () => {
    if (scheduleSelectedWeekdays.length === 0) {
      setScheduleError('Selecione ao menos um dia de atendimento.');
      return;
    }

    if (toMinutes(scheduleEndTime) <= toMinutes(scheduleStartTime)) {
      setScheduleError('Horario final deve ser maior que o inicial.');
      return;
    }

    const targetWeekdays = scheduleConfigMode === 'standard'
      ? scheduleSelectedWeekdays.map(Number)
      : [Number(scheduleWeekday)];

    const hasOverlap = targetWeekdays.some((weekday) =>
      scheduleRows.some((row) =>
        row.weekday === weekday
        && toMinutes(scheduleStartTime) < toMinutes(row.endTime)
        && toMinutes(scheduleEndTime) > toMinutes(row.startTime),
      ));

    if (hasOverlap) {
      setScheduleError('Este periodo se sobrepoe a outro no mesmo dia.');
      return;
    }

    setScheduleRows((current) => [
      ...current,
      ...targetWeekdays.map((weekday) => ({
        id: crypto.randomUUID(),
        weekday,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
      })),
    ].sort((a, b) => (a.weekday - b.weekday) || a.startTime.localeCompare(b.startTime)));
    setScheduleError(null);
  };

  const handleRemoveScheduleShift = (id: string) => {
    if (scheduleConfigMode === 'standard') {
      const reference = scheduleRows.find((row) => row.id === id);
      if (!reference) return;

      setScheduleRows((current) => current.filter((row) => !(
        scheduleSelectedWeekdays.includes(String(row.weekday))
        && row.startTime === reference.startTime
        && row.endTime === reference.endTime
      )));
      return;
    }

    setScheduleRows((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveSchedule = async () => {
    if (!api || !scheduleProfessionalId) return;

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

    setScheduleSaving(true);
    try {
      await api.professionals.schedules.set(
        scheduleProfessionalId,
        intervalMinutes,
        minBookingNoticeMinutes,
        scheduleRows.map((row) => ({
          weekday: row.weekday,
          startTime: row.startTime,
          endTime: row.endTime,
        })),
      );

      setScheduleError(null);
      closeCreateScheduleModal();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao salvar agenda.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCreateAppointment = async () => {
    const clientName = newAppointmentForm.clientName.trim();
    const serviceName = newAppointmentForm.serviceName.trim();
    const room = newAppointmentForm.room.trim();

    if (!clientName || !serviceName || !newAppointmentForm.professionalId) {
      setFormError('Preencha cliente, serviço e profissional.');
      return;
    }

    if (!matchedClient && newClientPhone.replace(/\D/g, '').length < 10) {
      setFormError('Informe o telefone do novo cliente (com DDD).');
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

    if (!api) return;

    const hasConflict = appointmentRecords.some((appointment) => {
      if (appointment.professionalId !== newAppointmentForm.professionalId) return false;
      if (!dayjs(appointment.start).isSame(start, 'day')) return false;

      const existingStart = dayjs(appointment.start);
      const existingEnd = dayjs(appointment.end);
      return start.isBefore(existingEnd) && end.isAfter(existingStart);
    });

    if (hasConflict) {
      setFormError('Este horário já está ocupado para o profissional selecionado.');
      return;
    }

    if (!matchedClient) {
      api.clients.create({ name: clientName, phone: newClientPhone.trim(), tags: ['incomplete'] })
        .then((c) => setClientRecords((cur) => [c, ...cur]))
        .catch(console.error);
    }

    try {
      const created = await api.appointments.create({
        professionalId: newAppointmentForm.professionalId,
        clientName,
        serviceName,
        room,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: newAppointmentForm.status,
        notes: newAppointmentForm.notes.trim() || undefined,
      });
      setAppointmentRecords((current) => [created, ...current]);
      setSelectedDate(start);
      setSelectedProfessionalId(newAppointmentForm.professionalId);
      setFormError(null);
      setMatchedClient(null);
      setNewClientPhone('');
      closeCreateModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar agendamento.');
    }
  };

  const handleOpenAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment.id);
    openDetailsModal();
  };

  const handleUpdateAppointmentStatus = async (status: Appointment['status']) => {
    if (!selectedAppointmentId || !api) return;
    try {
      const updated = await api.appointments.update(selectedAppointmentId, { status });
      setAppointmentRecords((current) =>
        current.map((a) => (a.id === selectedAppointmentId ? updated : a)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointmentId || !api) return;
    try {
      await api.appointments.remove(selectedAppointmentId);
      setAppointmentRecords((current) =>
        current.filter((a) => a.id !== selectedAppointmentId),
      );
      setSelectedAppointmentId(null);
      closeDetailsModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStatus = async () => {
    const value = newStatusInput.trim();
    if (!value) {
      setStatusManagementError('Digite um nome para o status.');
      return;
    }
    const exists = appointmentStatusOptions.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      setStatusManagementError('Esse status já existe.');
      return;
    }
    const next = [...appointmentStatusOptions, value];
    setAppointmentStatusOptions(next);
    setNewStatusInput('');
    setStatusManagementError(null);
    if (api) {
      api.tenantSettings.update({ appointmentStatuses: next }).catch(console.error);
    }
  };

  const handleRemoveStatus = (status: string) => {
    const next = appointmentStatusOptions.filter((item) => item !== status);
    setAppointmentStatusOptions(next.length > 0 ? next : appointmentStatusOptions);
    if (next.length === 0) return;
    if (api) {
      api.tenantSettings.update({ appointmentStatuses: next }).catch(console.error);
    }
  };

  const handleSaveRenameStatus = (oldValue: string) => {
    const newValue = editingStatusLabel.trim();
    setEditingStatusKey(null);
    if (!newValue || newValue === oldValue) return;
    const next = appointmentStatusOptions.map((item) => (item === oldValue ? newValue : item));
    setAppointmentStatusOptions(next);
    if (api) {
      api.tenantSettings.update({ appointmentStatuses: next }).catch(console.error);
    }
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
            {publicBookingMessage ? (
              <Text c="teal" fw={500} size="sm">
                {publicBookingMessage}
              </Text>
            ) : null}
          </Stack>

          <Group>
            <Button onClick={() => void handleOpenManageSchedulesModal()} radius="xl" variant="light">
              Listar agendas
            </Button>
            <Button onClick={openStatusManagementModal} radius="xl" variant="light">
              Gerenciar status
            </Button>
            <Button onClick={() => void handleOpenCreateScheduleModal()} radius="xl" variant="light">
              Nova agenda
            </Button>
            <Button onClick={handleCopyPublicBookingLink} radius="xl" variant="light">
              Copiar link de autoagendamento
            </Button>
            <Button leftSection={<Plus size={16} />} onClick={handleOpenCreateModal} radius="xl" size="md">
              Criar agendamento
            </Button>
          </Group>
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
              professionals={professionalRecords}
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
                professionals={professionalRecords}
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
                  {selectedProfessional?.name || "0"}
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
          closeManageSchedulesModal();
          setManageSchedulesError(null);
        }}
        opened={manageSchedulesOpened}
        radius="xl"
        size="lg"
        title="Agendas existentes"
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            Selecione uma agenda para editar disponibilidade, intervalo e antecedencia minima.
          </Text>

          {manageSchedulesError ? (
            <Text c="red" fw={600} size="sm">{manageSchedulesError}</Text>
          ) : null}

          <Stack gap="sm">
            {professionalRecords.map((professional) => {
              const summary = scheduleSummaries[professional.id];

              return (
                <Card key={professional.id} p="md" radius="lg" withBorder>
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text fw={700}>{professional.name}</Text>
                      <Text c="dimmed" size="sm">{professional.specialty}</Text>
                      {summary ? (
                        <Text c="dimmed" size="xs">
                          {summary.dayCount} dias ativos • {summary.periodCount} periodos • intervalo {summary.slotIntervalMinutes} min • antecedencia {summary.minBookingNoticeMinutes} min
                        </Text>
                      ) : (
                        <Text c="dimmed" size="xs">{scheduleSummariesLoading ? 'Carregando agenda...' : 'Sem agenda cadastrada'}</Text>
                      )}
                    </Stack>

                    <Button
                      onClick={() => {
                        closeManageSchedulesModal();
                        void handleOpenCreateScheduleModal(professional.id);
                      }}
                      radius="xl"
                      variant="light"
                    >
                      Gerenciar
                    </Button>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeCreateScheduleModal();
          setScheduleError(null);
        }}
        opened={createScheduleOpened}
        radius="xl"
        size="xl"
        title="Configurar agenda do profissional"
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            Organize dias de atendimento e periodos com controle de intervalo e antecedencia minima.
          </Text>

          <Card p="md" radius="lg" withBorder>
            <Stack gap="sm">
              <Select
                data={professionalRecords.map((professional) => ({
                  value: professional.id,
                  label: `${professional.name} - ${professional.specialty}`,
                }))}
                label="Profissional"
                onChange={(value) => {
                  if (!value) return;
                  void handleChangeScheduleProfessional(value);
                }}
                value={scheduleProfessionalId}
              />

              <Text fw={700} size="sm">Dias de atendimento</Text>
              <SimpleGrid cols={{ base: 2, sm: 4 }}>
                {weekdayOptions.map((day) => (
                  <Checkbox
                    key={day.value}
                    checked={scheduleSelectedWeekdays.includes(day.value)}
                    label={day.label}
                    onChange={(event) => handleToggleScheduleWeekday(day.value, event.currentTarget.checked)}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Card>

          <Card p="md" radius="lg" withBorder>
            <Stack gap="sm">
              <Text fw={700} size="sm">Configuracao de horarios</Text>
              <SegmentedControl
                data={[
                  { label: 'Horarios padrao (igual para todos os dias)', value: 'standard' },
                  { label: 'Horarios personalizados (por dia)', value: 'per-day' },
                ]}
                onChange={(value) => handleChangeScheduleConfigMode(value as ScheduleConfigMode)}
                value={scheduleConfigMode}
              />

              {scheduleConfigMode === 'per-day' ? (
                <Select
                  data={availableWeekdayOptions}
                  label="Dia para editar"
                  onChange={(value) => setScheduleWeekday(value ?? scheduleWeekday)}
                  value={scheduleWeekday}
                />
              ) : null}
            </Stack>
          </Card>

          <Card p="md" radius="lg" withBorder>
            <Stack gap="sm">
              <Text fw={700} size="sm">Periodos de atendimento</Text>

              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput
                  label="Inicio"
                  type="time"
                  value={scheduleStartTime}
                  onChange={(event) => setScheduleStartTime(event.currentTarget.value)}
                />
                <TextInput
                  label="Fim"
                  type="time"
                  value={scheduleEndTime}
                  onChange={(event) => setScheduleEndTime(event.currentTarget.value)}
                />
              </SimpleGrid>

              <Group justify="space-between">
                <Text c="dimmed" size="xs">
                  {scheduleConfigMode === 'standard'
                    ? 'Os periodos abaixo serao aplicados para todos os dias marcados.'
                    : 'Adicione periodos especificos para o dia selecionado.'}
                </Text>
                <Button onClick={handleAddScheduleShift} radius="xl" variant="light">
                  + Adicionar periodo
                </Button>
              </Group>

              <Stack gap="xs">
                {scheduleRowsEditor.length > 0 ? scheduleRowsEditor.map((row, index) => (
                  <Card key={row.id} bg="rgba(10,20,32,0.03)" p="sm" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={700} size="sm">Periodo {index + 1}</Text>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm">{row.startTime}</Text>
                        <Text c="dimmed" size="sm">as</Text>
                        <Text size="sm">{row.endTime}</Text>
                        <Button size="compact-xs" radius="xl" variant="subtle" color="red" onClick={() => handleRemoveScheduleShift(row.id)}>
                          x
                        </Button>
                      </Group>
                    </Group>
                  </Card>
                )) : (
                  <Text c="dimmed" size="sm">Nenhum periodo configurado.</Text>
                )}
              </Stack>
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <NumberInput
              label="Intervalo de agendamento"
              min={1}
              value={scheduleIntervalValue}
              onChange={(value) => setScheduleIntervalValue(Number(value) || 1)}
            />
            <Select
              label="Unidade"
              data={[
                { value: 'minutes', label: 'Minutos' },
                { value: 'hours', label: 'Horas' },
              ]}
              value={scheduleIntervalUnit}
              onChange={(value) => setScheduleIntervalUnit((value as 'minutes' | 'hours') ?? 'minutes')}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <NumberInput
              label="Antecedencia minima para agendamento"
              min={0}
              value={scheduleMinNoticeValue}
              onChange={(value) => setScheduleMinNoticeValue(Number(value) || 0)}
            />
            <Select
              label="Unidade da antecedencia"
              data={[
                { value: 'minutes', label: 'Minutos' },
                { value: 'hours', label: 'Horas' },
              ]}
              value={scheduleMinNoticeUnit}
              onChange={(value) => setScheduleMinNoticeUnit((value as 'minutes' | 'hours') ?? 'minutes')}
            />
          </SimpleGrid>

          <Divider label="Visao semanal (Seg-Dom)" labelPosition="left" />

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4, lg: 7 }}>
            {weeklyColumns.map((column) => (
              <Card key={column.weekday} withBorder radius="lg" p="sm">
                <Stack gap="xs">
                  <Text fw={700} size="sm">{column.label}</Text>
                  {column.rows.length > 0 ? column.rows.map((row) => (
                    <Group key={row.id} justify="space-between" wrap="nowrap">
                      <Text size="xs">{row.startTime} - {row.endTime}</Text>
                      <Button size="compact-xs" radius="xl" variant="subtle" color="red" onClick={() => handleRemoveScheduleShift(row.id)}>
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
                closeCreateScheduleModal();
                setScheduleError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button loading={scheduleSaving} onClick={handleSaveSchedule} radius="xl">
              Salvar agenda
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeCreateModal();
          setFormError(null);
          setMatchedClient(null);
          setNewClientPhone('');
          setCreateScheduleConfig(null);
        }}
        opened={createOpened}
        radius="xl"
        title="Novo agendamento"
      >
        <Stack gap="md">
          <Combobox
            onOptionSubmit={(clientId) => {
              const client = clientRecords.find((c) => c.id === clientId);
              if (client) {
                setMatchedClient(client);
                setNewAppointmentForm((current) => ({ ...current, clientName: client.name }));
                setNewClientPhone('');
              }
              clientCombobox.closeDropdown();
            }}
            store={clientCombobox}
            withinPortal={false}
          >
            <Combobox.Target>
              <TextInput
                label="Cliente"
                onBlur={() => clientCombobox.closeDropdown()}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setNewAppointmentForm((current) => ({ ...current, clientName: value }));
                  if (matchedClient && value !== matchedClient.name) setMatchedClient(null);
                  clientCombobox.openDropdown();
                }}
                onFocus={() => {
                  if (newAppointmentForm.clientName.trim().length >= 2) clientCombobox.openDropdown();
                }}
                placeholder="Nome, CPF, telefone ou e-mail"
                radius="xl"
                rightSection={matchedClient ? <Text c="teal" size="xs">✓</Text> : null}
                value={newAppointmentForm.clientName}
              />
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                {clientSuggestions.map((client) => (
                  <Combobox.Option key={client.id} value={client.id}>
                    <Stack gap={0}>
                      <Text fw={600} size="sm">{client.name}</Text>
                      <Text c="dimmed" size="xs">{client.phone}</Text>
                    </Stack>
                  </Combobox.Option>
                ))}
                {clientSuggestions.length === 0 && newAppointmentForm.clientName.trim().length >= 2 ? (
                  <Combobox.Empty>Nenhum cadastro — será salvo como novo cliente</Combobox.Empty>
                ) : null}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          {!matchedClient && newAppointmentForm.clientName.trim().length > 0 ? (
            <TextInput
              label="Telefone (novo cliente)"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewClientPhone(formatPhoneAgenda(value));
              }}
              placeholder="(00) 00000-0000"
              radius="xl"
              value={newClientPhone}
            />
          ) : null}

          <Autocomplete
            data={activeServiceNames}
            label="Serviço"
            onChange={(value) => {
              setNewAppointmentForm((current) => ({ ...current, serviceName: value }));
            }}
            onOptionSubmit={(value) => {
              const service = serviceRecords.find((s) => s.name === value);
              if (service) {
                const endTime = addMinutesToTime(newAppointmentForm.startTime, service.durationMinutes);
                setNewAppointmentForm((current) => ({ ...current, serviceName: value, endTime }));
              }
            }}
            placeholder="Buscar ou digitar serviço"
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
              data={professionalRecords.map((professional) => ({
                value: professional.id,
                label: professional.name,
              }))}
              label="Profissional"
              onChange={(value) => {
                const nextProfessionalId = value ?? '';
                setNewAppointmentForm((current) => ({
                  ...current,
                  professionalId: nextProfessionalId,
                }));

                if (!api || !nextProfessionalId) {
                  setCreateScheduleConfig(null);
                  return;
                }

                api.professionals.schedules.list(nextProfessionalId)
                  .then((config) => {
                    setCreateScheduleConfig({
                      slotIntervalMinutes: config.slotIntervalMinutes,
                      records: config.records.map((row) => ({
                        weekday: row.weekday,
                        startTime: row.startTime,
                        endTime: row.endTime,
                      })),
                    });
                  })
                  .catch(() => setCreateScheduleConfig(null));
              }}
              radius="xl"
              value={newAppointmentForm.professionalId}
            />
          </Group>

          <Group grow>
            <Select
              data={availableCreateStartTimes}
              label="Início"
              onChange={(value) => {
                if (!value) return;
                setNewAppointmentForm((current) => {
                  const nextEndTime = addMinutesToTime(value, createDurationMinutes);

                  return {
                    ...current,
                    startTime: value,
                    endTime: nextEndTime,
                  };
                });
              }}
              placeholder="Selecione um horário disponível"
              radius="xl"
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
              readOnly
            />
          </Group>

          {newAppointmentForm.professionalId && availableCreateStartTimes.length === 0 ? (
            <Text c="red" fw={600} size="sm">
              Não há horários livres para este profissional na data selecionada.
            </Text>
          ) : null}

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
              data={appointmentStatusOptions.map((status) => ({
                value: status,
                label: formatStatusLabel(status),
              }))}
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
                setMatchedClient(null);
                setNewClientPhone('');
                setCreateScheduleConfig(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateAppointment} radius="xl" disabled={newAppointmentForm.professionalId !== '' && availableCreateStartTimes.length === 0}>
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
              data={appointmentStatusOptions.map((status) => ({
                value: status,
                label: formatStatusLabel(status),
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
              Status atual: {formatStatusLabel(selectedAppointment.status)}
            </Text>
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            Agendamento não encontrado.
          </Text>
        )}
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeStatusManagementModal();
          setStatusManagementError(null);
          setNewStatusInput('');
          setEditingStatusKey(null);
        }}
        opened={statusManagementOpened}
        radius="xl"
        title="Status dos agendamentos"
      >
        <Stack gap="md">
          <Group gap="xs">
            <TextInput
              flex={1}
              label="Novo status"
              onChange={(event) => setNewStatusInput(event.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateStatus(); }}
              placeholder="Ex: Aguardando, Cancelado, Finalizado"
              radius="xl"
              value={newStatusInput}
            />
            <Button mt={24} onClick={() => void handleCreateStatus()} radius="xl">
              Adicionar
            </Button>
          </Group>

          {statusManagementError ? (
            <Text c="red" fw={600} size="sm">
              {statusManagementError}
            </Text>
          ) : null}

          <Stack gap="xs">
            {appointmentStatusOptions.map((status) =>
              editingStatusKey === status ? (
                <Group key={status} gap="xs">
                  <TextInput
                    flex={1}
                    value={editingStatusLabel}
                    onChange={(e) => setEditingStatusLabel(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRenameStatus(status); }}
                    radius="xl"
                    size="sm"
                  />
                  <ActionIcon color="teal" onClick={() => handleSaveRenameStatus(status)} radius="xl" variant="light">
                    <Check size={14} />
                  </ActionIcon>
                  <ActionIcon onClick={() => setEditingStatusKey(null)} radius="xl" variant="subtle">
                    <X size={14} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group key={status} align="center" justify="space-between">
                  <Text fw={600} size="sm">{formatStatusLabel(status)}</Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => { setEditingStatusKey(status); setEditingStatusLabel(status); }}
                      radius="xl" size="sm" title="Renomear" variant="subtle"
                    >
                      <Pencil size={12} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      disabled={appointmentStatusOptions.length <= 1}
                      onClick={() => handleRemoveStatus(status)}
                      radius="xl" size="sm" title="Remover" variant="subtle"
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  </Group>
                </Group>
              )
            )}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
