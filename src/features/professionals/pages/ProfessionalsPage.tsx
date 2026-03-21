import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Search } from 'lucide-react';
import { Professional } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

type ProfessionalFilter = 'all' | 'active' | 'inactive';

interface NewProfessionalForm {
  name: string;
  specialty: string;
  phone: string;
  commissionRate: number;
  active: boolean;
}

const initialForm: NewProfessionalForm = {
  name: '',
  specialty: '',
  phone: '',
  commissionRate: 30,
  active: true,
};

const defaultSpecialties: string[] = [];

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
  const [form, setForm] = useState<NewProfessionalForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(defaultSpecialties);

  useEffect(() => {
    if (!api) return;
    api.professionals.list().then(setRecords).catch(console.error);
  }, [api]);

  useEffect(() => {
    if (records.length === 0) return;
    setSpecialties((current) => {
      const fromRecords = records.map((item) => item.specialty).filter((value) => value.trim().length > 0);
      const merged = [...current, ...fromRecords];
      return Array.from(new Set(merged.map((value) => value.trim()))).sort((a, b) => a.localeCompare(b));
    });
  }, [records]);

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

  const registerSpecialty = (value: string) => {
    const specialty = value.trim();
    if (!specialty) {
      return false;
    }

    setSpecialties((current) => {
      const exists = current.some(
        (item) => normalizeSpecialty(item) === normalizeSpecialty(specialty),
      );

      if (exists) {
        return current;
      }

      return [specialty, ...current].sort((left, right) => left.localeCompare(right));
    });

    return true;
  };

  const handleAddSpecialty = () => {
    const inserted = registerSpecialty(newSpecialty);

    if (!inserted) {
      return;
    }

    setForm((current) => ({ ...current, specialty: newSpecialty.trim() }));
    setNewSpecialty('');
  };

  const handleSaveProfessional = useCallback(async () => {
    const name = form.name.trim();
    const specialty = form.specialty.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (!name || !specialty) {
      setFormError('Preencha nome e especialidade.');
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

    registerSpecialty(specialty);

    if (!api) return;

    try {
      if (editingProfessionalId) {
        const updated = await api.professionals.update(editingProfessionalId, {
          name,
          specialty,
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
          specialty,
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
    setNewSpecialty('');
    setForm(initialForm);
    setFormError(null);
    close();
  }, [api, editingProfessionalId, form, registerSpecialty]);

  const handleEditProfessional = (professional: Professional) => {
    setEditingProfessionalId(professional.id);
    setForm({
      name: professional.name,
      specialty: professional.specialty,
      phone: professional.phone ?? '',
      commissionRate: professional.commissionRate ?? 0,
      active: professional.active ?? true,
    });
    setNewSpecialty('');
    setFormError(null);
    open();
  };

  const toggleProfessionalStatus = useCallback(async (professionalId: string) => {
    const target = records.find((p) => p.id === professionalId);
    if (!target || !api) return;
    const updated = await api.professionals.update(professionalId, { active: !(target.active ?? true) });
    setRecords((current) => current.map((p) => (p.id === professionalId ? updated : p)));
  }, [api, records]);

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
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => {
              setEditingProfessionalId(null);
              setForm(initialForm);
              setNewSpecialty('');
              setFormError(null);
              open();
            }}
            radius="xl"
          >
            Novo profissional
          </Button>
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
          close();
          setEditingProfessionalId(null);
          setNewSpecialty('');
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

          <Select
            data={specialties.map((specialty) => ({
              value: specialty,
              label: specialty,
            }))}
            label="Especialidade"
            onChange={(value) => {
              setForm((current) => ({ ...current, specialty: value ?? '' }));
            }}
            placeholder="Selecione uma especialidade"
            radius="xl"
            searchable
            value={form.specialty}
          />

          <Group align="flex-end" wrap="nowrap">
            <TextInput
              label="Criar nova especialidade"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNewSpecialty(value);
              }}
              placeholder="Ex: Reflexologia"
              radius="xl"
              style={{ flex: 1 }}
              value={newSpecialty}
            />
            <Button onClick={handleAddSpecialty} radius="xl" variant="light">
              Adicionar
            </Button>
          </Group>

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
                setNewSpecialty('');
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
