import dayjs from 'dayjs';
import { Badge, Card, Grid, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { CalendarClock } from 'lucide-react';
import { Appointment, Professional } from '@/services/api/contracts';

const statusLabel: Record<Appointment['status'], string> = {
  confirmed: 'Confirmado',
  'in-progress': 'Atendimento',
  attention: 'Atenção',
  available: 'Bloqueio',
};

interface ScheduleGridDesktopProps {
  professionals: Professional[];
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function ScheduleGridDesktop({ professionals, appointments, onAppointmentClick }: ScheduleGridDesktopProps) {
  return (
    <Grid>
      {professionals.map((professional) => {
        const professionalAppointments = appointments
          .filter((appointment) => appointment.professionalId === professional.id)
          .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf());

        return (
          <Grid.Col key={professional.id} span={{ base: 12, xl: 3, md: 6 }}>
            <Card radius="xl" p="md" h="100%" withBorder>
              <Group justify="space-between" mb="md">
                <div>
                  <Text fw={800}>{professional.name}</Text>
                  <Text c="dimmed" size="sm">
                    {professional.specialty}
                  </Text>
                </div>
                <ThemeIcon color="teal" radius="xl" size={42} variant="light">
                  <CalendarClock size={20} />
                </ThemeIcon>
              </Group>

              <Stack gap="sm">
                {professionalAppointments.length === 0 ? (
                  <Card radius="lg" p="sm" withBorder>
                    <Text fw={700}>Livre</Text>
                    <Text c="dimmed" size="sm">
                      Sem atendimentos nesta data.
                    </Text>
                  </Card>
                ) : (
                  professionalAppointments.map((appointment) => (
                    <Card
                      key={appointment.id}
                      onClick={() => onAppointmentClick?.(appointment)}
                      radius="lg"
                      p="sm"
                      bg="rgba(35,195,174,0.08)"
                      withBorder
                      style={{ cursor: onAppointmentClick ? 'pointer' : 'default' }}
                    >
                      <Group justify="space-between" align="flex-start">
                        <div>
                          <Text fw={700} size="sm">
                            {dayjs(appointment.start).format('HH:mm')} - {dayjs(appointment.end).format('HH:mm')}
                          </Text>
                          <Text fw={700}>{appointment.clientName}</Text>
                        </div>
                        <Badge color="teal" radius="xl" variant="light">
                          {statusLabel[appointment.status]}
                        </Badge>
                      </Group>
                      <Text mt="xs" size="sm">
                        {appointment.serviceName}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {appointment.room}
                      </Text>
                    </Card>
                  ))
                )}
              </Stack>
            </Card>
          </Grid.Col>
        );
      })}
    </Grid>
  );
}
