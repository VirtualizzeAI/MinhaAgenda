import dayjs from 'dayjs';
import { Badge, Card, Group, Stack, Text, Timeline } from '@mantine/core';
import { Appointment } from '@/services/api/contracts';

const statusMap: Record<Appointment['status'], { color: string; label: string }> = {
  confirmed: { color: 'teal', label: 'Confirmado' },
  'in-progress': { color: 'coral', label: 'Em atendimento' },
  attention: { color: 'yellow', label: 'Atenção' },
  available: { color: 'gray', label: 'Bloqueio' },
};

interface ScheduleTimelineProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function ScheduleTimeline({ appointments, onAppointmentClick }: ScheduleTimelineProps) {
  if (appointments.length === 0) {
    return (
      <Card radius="xl" p="lg" withBorder>
        <Text fw={700}>Agenda livre</Text>
        <Text c="dimmed" size="sm">
          Nenhum atendimento encontrado para este profissional nesta data.
        </Text>
      </Card>
    );
  }

  return (
    <Timeline active={appointments.length} bulletSize={22} lineWidth={2} color="teal">
      {appointments.map((appointment) => {
        const status = statusMap[appointment.status];

        return (
          <Timeline.Item key={appointment.id} title={`${dayjs(appointment.start).format('HH:mm')} - ${dayjs(appointment.end).format('HH:mm')}`}>
            <Card
              onClick={() => onAppointmentClick?.(appointment)}
              radius="xl"
              p="md"
              mt="xs"
              shadow="sm"
              withBorder
              style={{ cursor: onAppointmentClick ? 'pointer' : 'default' }}
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={800}>{appointment.clientName}</Text>
                  <Text size="sm">{appointment.serviceName}</Text>
                </Stack>
                <Badge color={status.color} radius="xl" variant="light">
                  {status.label}
                </Badge>
              </Group>
              <Group gap="xs" mt="md">
                <Badge color="ink" radius="xl" variant="light">
                  {appointment.room}
                </Badge>
                {appointment.notes ? (
                  <Text c="dimmed" size="sm">
                    {appointment.notes}
                  </Text>
                ) : null}
              </Group>
            </Card>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
