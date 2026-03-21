import { Avatar, Badge, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { Professional } from '@/services/api/contracts';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  selectedProfessionalId: string;
  onSelect: (professionalId: string) => void;
}

export function ProfessionalSelector({
  professionals,
  selectedProfessionalId,
  onSelect,
}: ProfessionalSelectorProps) {
  return (
    <ScrollArea scrollbarSize={4} type="never">
      <Group gap="sm" wrap="nowrap">
        {professionals.map((professional) => {
          const active = professional.id === selectedProfessionalId;

          return (
            <UnstyledButton
              key={professional.id}
              onClick={() => onSelect(professional.id)}
              style={{
                minWidth: 170,
                borderRadius: 22,
                padding: 12,
                background: active ? 'linear-gradient(135deg, #0b6b63 0%, #23c3ae 100%)' : '#ffffff',
                border: active ? 'none' : '1px solid rgba(10,20,32,0.08)',
                color: active ? '#ffffff' : '#1c2b3a',
              }}
            >
              <Group wrap="nowrap">
                <Avatar color={active ? 'rgba(255,255,255,0.2)' : 'teal'} radius="xl">
                  {professional.shortName}
                </Avatar>
                <div>
                  <Text fw={700} size="sm">
                    {professional.name}
                  </Text>
                  <Badge color={active ? 'rgba(255,255,255,0.15)' : 'teal'} radius="xl" variant={active ? 'filled' : 'light'}>
                    {professional.specialty}
                  </Badge>
                </div>
              </Group>
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
