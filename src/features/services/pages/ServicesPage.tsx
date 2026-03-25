import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Service } from '@/services/api/contracts';
import { useApi } from '@/lib/use-api';

type ServiceFilter = 'all' | 'inactive' | string;

const defaultCategories = ['podologia', 'estetica', 'unhas', 'terapia', 'pacote'];

function formatCategoryLabel(value: string): string {
  if (!value) return 'Sem categoria';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface NewServiceForm {
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  description: string;
}

const initialForm: NewServiceForm = {
  name: '',
  category: 'podologia',
  durationMinutes: 60,
  price: 100,
  active: true,
  description: '',
};

export function ServicesPage() {
  const api = useApi();
  const [records, setRecords] = useState<Service[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(defaultCategories);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const [categoriesOpened, { open: openCategoriesModal, close: closeCategoriesModal }] = useDisclosure(false);
  const [form, setForm] = useState<NewServiceForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');

  useEffect(() => {
    if (!api) return;
    api.services.list().then(setRecords).catch(console.error);
    api.tenantSettings.get()
      .then((settings) => {
        const merged = Array.from(new Set([...settings.serviceCategories, ...defaultCategories]));
        setCategoryOptions(merged.length > 0 ? merged : defaultCategories);
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    if (records.length === 0) return;
    setCategoryOptions((current) => {
      const merged = Array.from(new Set([...current, ...records.map((service) => service.category)]));
      return merged;
    });
  }, [records]);

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((service) => {
      const matchesText =
        normalized.length === 0 ||
        service.name.toLowerCase().includes(normalized) ||
        (service.description ?? '').toLowerCase().includes(normalized);

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'inactive'
            ? !service.active
            : service.category === filter;

      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const averagePrice =
    records.length === 0
      ? 0
      : Math.round(records.reduce((acc, service) => acc + service.price, 0) / records.length);

  const handleSaveService = async () => {
    const name = form.name.trim();
    const category = form.category.trim();

    if (!name) {
      setFormError('Informe o nome do serviço.');
      return;
    }

    if (!category) {
      setFormError('Informe a categoria do serviço.');
      return;
    }

    if (form.durationMinutes < 10) {
      setFormError('A duração mínima é de 10 minutos.');
      return;
    }

    if (form.price <= 0) {
      setFormError('O preço deve ser maior que zero.');
      return;
    }

    if (editingServiceId) {
      try {
        const updated = await api!.services.update(editingServiceId, {
          name,
          category,
          durationMinutes: form.durationMinutes,
          price: form.price,
          active: form.active,
          description: form.description.trim() || undefined,
        });
        setRecords((current) => current.map((s) => (s.id === editingServiceId ? updated : s)));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Erro ao salvar serviço.');
        return;
      }
    } else {
      try {
        const created = await api!.services.create({
          name,
          category,
          durationMinutes: form.durationMinutes,
          price: form.price,
          active: form.active,
          description: form.description.trim() || undefined,
        });
        setRecords((current) => [created, ...current]);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Erro ao salvar serviço.');
        return;
      }
    }

    setEditingServiceId(null);
    setCategoryOptions((current) => (current.includes(category) ? current : [...current, category]));
    setForm(initialForm);
    setFormError(null);
    close();
  };

  const handleCreateCategory = async () => {
    const value = newCategoryInput.trim();
    if (!value) {
      setCategoryError('Digite um nome para a categoria.');
      return;
    }

    const exists = categoryOptions.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      setCategoryError('Essa categoria já existe.');
      return;
    }

    const next = [...categoryOptions, value];
    setCategoryOptions(next);
    setForm((current) => ({ ...current, category: value }));

    if (api) {
      try {
        await api.tenantSettings.update({ serviceCategories: next });
      } catch (err) {
        setCategoryError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
        return;
      }
    }

    setNewCategoryInput('');
    setCategoryError(null);
  };

  const handleRemoveCategory = (category: string) => {
    const next = categoryOptions.filter((item) => item !== category);
    if (next.length === 0) return;
    setCategoryOptions(next);
    if (filter === category) setFilter('all');
    if (api) {
      api.tenantSettings.update({ serviceCategories: next }).catch(console.error);
    }
  };

  const handleSaveRenameCategory = (oldValue: string) => {
    const newValue = editingCategoryLabel.trim();
    setEditingCategoryKey(null);
    if (!newValue || newValue === oldValue) return;
    const next = categoryOptions.map((item) => (item === oldValue ? newValue : item));
    setCategoryOptions(next);
    if (filter === oldValue) setFilter(newValue);
    if (api) {
      api.tenantSettings.update({ serviceCategories: next }).catch(console.error);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setForm({
      name: service.name,
      category: service.category,
      durationMinutes: service.durationMinutes,
      price: service.price,
      active: service.active,
      description: service.description ?? '',
    });
    setFormError(null);
    open();
  };

  return (
    <Stack gap="lg">
      <Card radius="xl" p="lg" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge color="teal" radius="xl" variant="light">
              Catálogo operacional
            </Badge>
            <Title mt="xs" order={2}>
              Serviços e pacotes
            </Title>
            <Text c="dimmed" mt="xs">
              Estrutura mobile-first para manter catálogo claro, com duração e preço para agendamento rápido.
            </Text>
          </div>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => {
              setEditingServiceId(null);
              setForm(initialForm);
              setFormError(null);
              open();
            }}
            radius="xl"
          >
            Novo serviço
          </Button>
          <Button onClick={openCategoriesModal} radius="xl" variant="light">
            Gerenciar categorias
          </Button>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Serviços totais
          </Text>
          <Text fw={800} size="xl">
            {records.length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Ativos
          </Text>
          <Text fw={800} size="xl">
            {records.filter((service) => service.active).length}
          </Text>
        </Card>
        <Card radius="xl" p="md" withBorder>
          <Text c="dimmed" size="sm">
            Preço médio
          </Text>
          <Text fw={800} size="xl">
            R$ {averagePrice.toLocaleString('pt-BR')}
          </Text>
        </Card>
      </SimpleGrid>

      <Card radius="xl" p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<Search size={16} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por serviço ou descrição"
            radius="xl"
            value={query}
          />

          <Select
            data={[
              { label: 'Todos', value: 'all' },
              { label: 'Inativos', value: 'inactive' },
              ...categoryOptions.map((category) => ({
                label: formatCategoryLabel(category),
                value: category,
              })),
            ]}
            label="Filtrar por categoria"
            onChange={(value) => setFilter((value as ServiceFilter) ?? 'all')}
            radius="xl"
            value={filter}
          />
        </Stack>
      </Card>

      <Stack gap="sm">
        {filteredServices.map((service) => (
          <Card key={service.id} p="md" radius="xl" withBorder>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={800}>{service.name}</Text>
                <Text c="dimmed" size="sm">
                  {formatCategoryLabel(service.category)} • {service.durationMinutes} min
                </Text>
                {service.description ? (
                  <Text c="dimmed" mt={6} size="sm">
                    {service.description}
                  </Text>
                ) : null}
              </div>

              <Stack align="flex-end" gap={6}>
                <Badge color={service.active ? 'teal' : 'gray'} radius="xl" variant="light">
                  {service.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Text fw={800}>R$ {service.price.toLocaleString('pt-BR')}</Text>
                <Button
                  onClick={() => handleEditService(service)}
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

      {filteredServices.length === 0 ? (
        <Card radius="xl" p="lg" withBorder>
          <Text fw={700}>Nenhum serviço encontrado</Text>
          <Text c="dimmed" size="sm">
            Ajuste os filtros ou cadastre um novo serviço para começar.
          </Text>
        </Card>
      ) : null}

      <Modal
        centered
        onClose={() => {
          close();
          setEditingServiceId(null);
          setFormError(null);
        }}
        opened={opened}
        radius="xl"
        title={editingServiceId ? 'Editar serviço' : 'Novo serviço'}
      >
        <Stack gap="md">
          <TextInput
            label="Nome do serviço"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, name: value }));
            }}
            placeholder="Ex: Podologia avançada"
            radius="xl"
            value={form.name}
          />

          <Select
            data={categoryOptions.map((category) => ({ value: category, label: formatCategoryLabel(category) }))}
            label="Categoria"
            onChange={(value) => {
              if (!value) {
                return;
              }

              setForm((current) => ({ ...current, category: value }));
            }}
            radius="xl"
            value={form.category}
          />

          <Group grow>
            <NumberInput
              allowDecimal={false}
              label="Duração (min)"
              min={10}
              onChange={(value) => {
                setForm((current) => ({ ...current, durationMinutes: Number(value) || 0 }));
              }}
              radius="xl"
              value={form.durationMinutes}
            />

            <NumberInput
              decimalScale={2}
              fixedDecimalScale
              hideControls
              label="Preço (R$)"
              min={1}
              onChange={(value) => {
                setForm((current) => ({ ...current, price: Number(value) || 0 }));
              }}
              radius="xl"
              value={form.price}
            />
          </Group>

          <Switch
            checked={form.active}
            label="Serviço ativo"
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setForm((current) => ({ ...current, active: checked }));
            }}
          />

          <Textarea
            autosize
            label="Descrição"
            minRows={2}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, description: value }));
            }}
            placeholder="Detalhes, diferenciais e observações"
            radius="xl"
            value={form.description}
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
                setEditingServiceId(null);
                setFormError(null);
              }}
              radius="xl"
              variant="light"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveService} radius="xl">
              {editingServiceId ? 'Salvar alterações' : 'Salvar serviço'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        centered
        onClose={() => {
          closeCategoriesModal();
          setCategoryError(null);
          setNewCategoryInput('');
        }}
        opened={categoriesOpened}
        radius="xl"
        title="Categorias personalizadas"
      >
        <Stack gap="md">
          <TextInput
            label="Nova categoria"
            onChange={(event) => setNewCategoryInput(event.currentTarget.value)}
            placeholder="Ex: Laser, Massagem, Sobrancelha"
            radius="xl"
            value={newCategoryInput}
          />

          <Button onClick={handleCreateCategory} radius="xl">
            Adicionar categoria
          </Button>

          {categoryError ? (
            <Text c="red" fw={600} size="sm">
              {categoryError}
            </Text>
          ) : null}

          <Stack gap="xs">
            {categoryOptions.map((category) =>
              editingCategoryKey === category ? (
                <Group key={category} gap="xs">
                  <TextInput
                    flex={1}
                    value={editingCategoryLabel}
                    onChange={(e) => setEditingCategoryLabel(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRenameCategory(category); }}
                    radius="xl"
                    size="sm"
                  />
                  <ActionIcon color="teal" onClick={() => handleSaveRenameCategory(category)} radius="xl" variant="light">
                    <Check size={14} />
                  </ActionIcon>
                  <ActionIcon onClick={() => setEditingCategoryKey(null)} radius="xl" variant="subtle">
                    <X size={14} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group key={category} align="center" justify="space-between">
                  <Text fw={600} size="sm">{formatCategoryLabel(category)}</Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => { setEditingCategoryKey(category); setEditingCategoryLabel(category); }}
                      radius="xl" size="sm" title="Renomear" variant="subtle"
                    >
                      <Pencil size={12} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      disabled={categoryOptions.length <= 1}
                      onClick={() => handleRemoveCategory(category)}
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
