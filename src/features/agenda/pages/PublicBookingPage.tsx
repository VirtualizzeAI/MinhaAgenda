import { FormEvent, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CalendarCheck2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import {
  createPublicBookingAppointment,
  fetchPublicBookingBootstrap,
  fetchPublicBookingSlots,
  PublicBookingBootstrap,
  PublicBookingSlot,
} from '@/lib/public-booking-api';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function PublicBookingPage() {
  const { slug = '' } = useParams();
  const [confirmOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);

  const [bootstrap, setBootstrap] = useState<PublicBookingBootstrap | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<PublicBookingSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [professionalId, setProfessionalId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCpf, setClientCpf] = useState('');

  useEffect(() => {
    if (!slug) {
      setError('Link de agendamento inválido.');
      setLoadingBootstrap(false);
      return;
    }

    fetchPublicBookingBootstrap(slug)
      .then((data) => {
        setBootstrap(data);
        setProfessionalId(data.professionals[0]?.id ?? '');
        setServiceIds(data.services[0]?.id ? [data.services[0].id] : []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o link.');
      })
      .finally(() => setLoadingBootstrap(false));
  }, [slug]);

  const selectedServices = useMemo(
    () => (bootstrap?.services ?? []).filter((service) => serviceIds.includes(service.id)),
    [bootstrap?.services, serviceIds],
  );

  const totalDurationMinutes = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price ?? 0), 0),
    [selectedServices],
  );

  const selectedProfessional = useMemo(
    () => bootstrap?.professionals.find((professional) => professional.id === professionalId),
    [bootstrap?.professionals, professionalId],
  );

  useEffect(() => {
    if (!bootstrap || !professionalId || selectedServices.length === 0) return;

    setLoadingSlots(true);
    setTime('');
    fetchPublicBookingSlots({
      slug,
      date,
      professionalId,
      serviceDurationMinutes: totalDurationMinutes,
      serviceIds,
    })
      .then((data) => {
        setSlots(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar horários.');
      })
      .finally(() => setLoadingSlots(false));
  }, [bootstrap, date, professionalId, serviceIds, selectedServices.length, slug, totalDurationMinutes]);

  const professionalOptions = useMemo(
    () => (bootstrap?.professionals ?? []).map((p) => ({ value: p.id, label: `${p.name} - ${p.specialty}` })),
    [bootstrap?.professionals],
  );

  const serviceOptions = useMemo(
    () =>
      (bootstrap?.services ?? []).map((s) => ({
        value: s.id,
        label: `${s.name} - ${s.duration_minutes} min - R$ ${Number(s.price ?? 0).toFixed(2).replace('.', ',')}`,
      })),
    [bootstrap?.services],
  );

  const canSubmit =
    Boolean(professionalId) &&
    serviceIds.length > 0 &&
    Boolean(date) &&
    Boolean(time) &&
    clientName.trim().length >= 2 &&
    clientPhone.replace(/\D/g, '').length >= 10 &&
    clientCpf.replace(/\D/g, '').length === 11;

  const hasCatalogData = professionalOptions.length > 0 && serviceOptions.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Preencha todos os campos obrigatórios para confirmar.');
      return;
    }

    setError(null);
    setSuccess(null);
    openConfirmModal();
  };

  const handleConfirmAppointment = async () => {
    if (!canSubmit) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const startAt = dayjs(`${date}T${time}`).toISOString();
      await createPublicBookingAppointment({
        slug,
        professionalId,
        serviceIds,
        startAt,
        clientName: clientName.trim(),
        clientPhone,
        clientCpf,
      });

      setSuccess('Agendamento confirmado com sucesso.');
      setTime('');
      setClientName('');
      setClientPhone('');
      setClientCpf('');
      closeConfirmModal();

      const refreshed = await fetchPublicBookingSlots({
        slug,
        date,
        professionalId,
        serviceDurationMinutes: totalDurationMinutes,
        serviceIds,
      });
      setSlots(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o agendamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingBootstrap) {
    return (
      <Center h="100dvh">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Container py="xl" size="sm">
      <Stack gap="lg">
        <Modal
          centered
          onClose={closeConfirmModal}
          opened={confirmOpened}
          title="Confirmar agendamento"
        >
          <Stack gap="xs">
            <Text size="sm"><strong>Profissional:</strong> {selectedProfessional?.name ?? '-'}</Text>
            <Text size="sm"><strong>Data:</strong> {dayjs(date).format('DD/MM/YYYY')}</Text>
            <Text size="sm"><strong>Horário:</strong> {time || '-'}</Text>
            <Text size="sm"><strong>Serviços:</strong> {selectedServices.map((s) => s.name).join(' + ') || '-'}</Text>
            <Text size="sm"><strong>Duração total:</strong> {totalDurationMinutes} min</Text>
            <Text size="sm"><strong>Valor total:</strong> R$ {totalPrice.toFixed(2).replace('.', ',')}</Text>
            <Text size="sm"><strong>Cliente:</strong> {clientName || '-'}</Text>
            <Text size="sm"><strong>Telefone:</strong> {clientPhone || '-'}</Text>
            <Text size="sm"><strong>CPF:</strong> {clientCpf || '-'}</Text>

            <Group justify="flex-end" mt="sm">
              <Button onClick={closeConfirmModal} radius="xl" variant="light">
                Corrigir
              </Button>
              <Button color="teal" loading={saving} onClick={handleConfirmAppointment} radius="xl">
                Confirmar
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Card padding="lg" radius="xl" withBorder>
          <Group justify="space-between" mb="xs">
            <Badge color="teal" radius="xl" variant="light">
              Autoagendamento
            </Badge>
            <ThemeIcon color="teal" radius="xl" size={40} variant="light">
              <CalendarCheck2 size={20} />
            </ThemeIcon>
          </Group>
          <Title order={1} size="h3">
            Agende seu horário em {bootstrap?.tenant.name}
          </Title>
          <Text c="dimmed" mt={6}>
            Escolha serviço, profissional e horário. Depois informe seus dados para concluir.
          </Text>
        </Card>

        <Card component="form" onSubmit={handleSubmit} padding="lg" radius="xl" withBorder>
          <Stack gap="md">
            {error ? <Alert color="red" title="Não foi possível continuar">{error}</Alert> : null}
            {success ? <Alert color="teal" title="Tudo certo">{success}</Alert> : null}
            {!error && !hasCatalogData ? (
              <Alert color="yellow" title="Catálogo indisponível">
                Este link ainda não possui profissionais ou serviços ativos para agendamento.
              </Alert>
            ) : null}

            <MultiSelect
              data={serviceOptions}
              searchable
              label="Serviço"
              onChange={setServiceIds}
              placeholder="Selecione um ou mais serviços"
              required
              value={serviceIds}
              disabled={!hasCatalogData}
            />

            {serviceIds.length > 0 ? (
              <Text c="dimmed" size="sm">
                Total selecionado: {totalDurationMinutes} min | R$ {totalPrice.toFixed(2).replace('.', ',')}
              </Text>
            ) : null}

            <Select
              data={professionalOptions}
              label="Profissional"
              onChange={(value) => setProfessionalId(value ?? '')}
              placeholder="Selecione o profissional"
              required
              value={professionalId}
              disabled={!hasCatalogData}
            />

            <TextInput
              label="Data"
              min={dayjs().format('YYYY-MM-DD')}
              onChange={(event) => setDate(event.currentTarget.value)}
              required
              type="date"
              value={date}
            />

            <Select
              data={slots}
              label="Horário"
              onChange={(value) => setTime(value ?? '')}
              placeholder={loadingSlots ? 'Carregando horários...' : 'Selecione um horário'}
              required
              value={time}
              disabled={!hasCatalogData || loadingSlots}
            />

            <TextInput
              label="Nome"
              onChange={(event) => setClientName(event.currentTarget.value)}
              placeholder="Seu nome completo"
              required
              value={clientName}
            />

            <TextInput
              label="Telefone"
              onChange={(event) => setClientPhone(formatPhone(event.currentTarget.value))}
              placeholder="(00) 00000-0000"
              required
              value={clientPhone}
            />

            <TextInput
              label="CPF"
              onChange={(event) => setClientCpf(formatCpf(event.currentTarget.value))}
              placeholder="000.000.000-00"
              required
              value={clientCpf}
            />

            <Button color="teal" disabled={!canSubmit || !hasCatalogData} radius="xl" size="md" type="submit">
              Revisar e agendar
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

export default PublicBookingPage;
