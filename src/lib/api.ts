import type {
  Appointment,
  AppointmentStatus,
  BillingCharge,
  BillingMethod,
  BillingStatus,
  Client,
  ClientTag,
  Order,
  OrderStatus,
  Professional,
  ProfessionalScheduleConfig,
  ProfessionalSchedule,
  Service,
  ServiceCategory,
} from '@/services/api/contracts';

const BASE = import.meta.env.VITE_API_URL as string;

async function req<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((json.message as string) ?? res.statusText);
  return json as T;
}

// ── Raw API shapes (snake_case) ───────────────────────────────────────────────

interface RawProfessional {
  id: string;
  name: string;
  specialty: string;
  short_name: string;
  phone?: string | null;
  commission_rate?: number | null;
  active?: boolean | null;
  tenant_id: string;
  created_at: string;
}

interface RawProfessionalSchedule {
  id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface RawProfessionalScheduleResponse {
  slot_interval_minutes: number;
  records: RawProfessionalSchedule[];
}

interface RawService {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  description?: string | null;
  tenant_id: string;
  created_at: string;
}

interface RawClient {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[] | null;
  birth_date?: string | null;
  notes?: string | null;
  tenant_id: string;
  created_at: string;
}

interface RawAppointment {
  id: string;
  professional_id?: string | null;
  client_id?: string | null;
  service_id?: string | null;
  client_name: string;
  service_name: string;
  room?: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes?: string | null;
  tenant_id: string;
  created_at: string;
}

interface RawOrder {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  professional_id?: string | null;
  item_summary: string;
  total: number;
  status: string;
  created_at: string;
  notes?: string | null;
  clients?: { name?: string | null } | Array<{ name?: string | null }> | null;
  professionals?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawBillingCharge {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  reference: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  method: string;
  notes?: string | null;
  clients?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawBookingLinkResponse {
  slug: string;
  urlPath: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toShortName(name: string): string {
  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function mapProfessional(r: RawProfessional): Professional {
  return {
    id: r.id,
    name: r.name,
    specialty: r.specialty,
    shortName: r.short_name,
    phone: r.phone ?? undefined,
    commissionRate: r.commission_rate ?? 0,
    active: r.active ?? true,
  };
}

function mapProfessionalSchedule(r: RawProfessionalSchedule): ProfessionalSchedule {
  return {
    id: r.id,
    professionalId: r.professional_id,
    weekday: r.weekday,
    startTime: r.start_time,
    endTime: r.end_time,
  };
}

function mapService(r: RawService): Service {
  return {
    id: r.id,
    name: r.name,
    category: r.category as ServiceCategory,
    durationMinutes: r.duration_minutes,
    price: r.price,
    active: r.active ?? true,
    description: r.description ?? undefined,
  };
}

function mapClient(r: RawClient): Client {
  return {
    id: r.id,
    name: r.name,
    cpf: r.cpf ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    tags: (r.tags ?? []) as ClientTag[],
    lastVisit: r.created_at,
    birthDate: r.birth_date ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function mapAppointment(r: RawAppointment): Appointment {
  return {
    id: r.id,
    professionalId: r.professional_id ?? '',
    clientName: r.client_name,
    serviceName: r.service_name,
    room: r.room ?? '',
    start: r.start_at,
    end: r.end_at,
    status: r.status as AppointmentStatus,
    notes: r.notes ?? undefined,
  };
}

function relationName(
  relation?: { name?: string | null } | Array<{ name?: string | null }> | null,
): string | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0]?.name ?? undefined;
  return relation.name ?? undefined;
}

function mapOrder(r: RawOrder): Order {
  return {
    id: r.id,
    clientName: relationName(r.clients) ?? 'Cliente não vinculado',
    professionalName: relationName(r.professionals) ?? 'Profissional não vinculado',
    itemSummary: r.item_summary,
    total: r.total,
    status: r.status as OrderStatus,
    createdAt: r.created_at,
    notes: r.notes ?? undefined,
  };
}

function mapBillingCharge(r: RawBillingCharge): BillingCharge {
  return {
    id: r.id,
    clientName: relationName(r.clients) ?? 'Cliente não vinculado',
    reference: r.reference,
    amount: r.amount,
    paidAmount: r.paid_amount,
    dueDate: r.due_date,
    status: r.status as BillingStatus,
    method: r.method as BillingMethod,
    notes: r.notes ?? undefined,
  };
}

// ── Client factory ────────────────────────────────────────────────────────────

export function createApiClient(token: string, tenantId: string) {
  const tq = `?tenantId=${tenantId}`;

  return {
    professionals: {
      list: async (): Promise<Professional[]> => {
        const res = await req<{ records: RawProfessional[] }>('GET', `/v1/professionals${tq}`, token);
        return res.records.map(mapProfessional);
      },
      create: async (data: {
        name: string;
        specialty: string;
        phone: string;
        commissionRate: number;
        active: boolean;
      }): Promise<Professional> => {
        const r = await req<RawProfessional>('POST', '/v1/professionals', token, {
          tenant_id: tenantId,
          name: data.name,
          specialty: data.specialty,
          short_name: toShortName(data.name),
          phone: data.phone || null,
          commission_rate: data.commissionRate,
          active: data.active,
        });
        return mapProfessional(r);
      },
      update: async (
        id: string,
        data: Partial<{ name: string; specialty: string; phone: string; commissionRate: number; active: boolean }>,
      ): Promise<Professional> => {
        const r = await req<RawProfessional>('PUT', `/v1/professionals/${id}`, token, {
          ...(data.name != null && { name: data.name, short_name: toShortName(data.name) }),
          ...(data.specialty != null && { specialty: data.specialty }),
          ...(data.phone != null && { phone: data.phone || null }),
          ...(data.commissionRate != null && { commission_rate: data.commissionRate }),
          ...(data.active != null && { active: data.active }),
        });
        return mapProfessional(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/professionals/${id}`, token),
      schedules: {
        list: async (professionalId: string): Promise<ProfessionalScheduleConfig> => {
          const res = await req<RawProfessionalScheduleResponse>(
            'GET',
            `/v1/professionals/${professionalId}/schedules${tq}`,
            token,
          );
          return {
            slotIntervalMinutes: res.slot_interval_minutes ?? 30,
            records: res.records.map(mapProfessionalSchedule),
          };
        },
        set: async (
          professionalId: string,
          slotIntervalMinutes: number,
          schedules: Array<{ weekday: number; startTime: string; endTime: string }>,
        ): Promise<ProfessionalScheduleConfig> => {
          const res = await req<RawProfessionalScheduleResponse>(
            'PUT',
            `/v1/professionals/${professionalId}/schedules`,
            token,
            {
              tenant_id: tenantId,
              slot_interval_minutes: slotIntervalMinutes,
              schedules: schedules.map((slot) => ({
                weekday: slot.weekday,
                start_time: slot.startTime,
                end_time: slot.endTime,
              })),
            },
          );
          return {
            slotIntervalMinutes: res.slot_interval_minutes ?? 30,
            records: res.records.map(mapProfessionalSchedule),
          };
        },
      },
    },

    services: {
      list: async (): Promise<Service[]> => {
        const res = await req<{ records: RawService[] }>('GET', `/v1/services${tq}`, token);
        return res.records.map(mapService);
      },
      create: async (data: {
        name: string;
        category: ServiceCategory;
        durationMinutes: number;
        price: number;
        active: boolean;
        description?: string;
      }): Promise<Service> => {
        const r = await req<RawService>('POST', '/v1/services', token, {
          tenant_id: tenantId,
          name: data.name,
          category: data.category,
          duration_minutes: data.durationMinutes,
          price: data.price,
          active: data.active,
          description: data.description || null,
        });
        return mapService(r);
      },
      update: async (
        id: string,
        data: Partial<{
          name: string;
          category: ServiceCategory;
          durationMinutes: number;
          price: number;
          active: boolean;
          description: string;
        }>,
      ): Promise<Service> => {
        const r = await req<RawService>('PUT', `/v1/services/${id}`, token, {
          ...(data.name != null && { name: data.name }),
          ...(data.category != null && { category: data.category }),
          ...(data.durationMinutes != null && { duration_minutes: data.durationMinutes }),
          ...(data.price != null && { price: data.price }),
          ...(data.active != null && { active: data.active }),
          ...(data.description !== undefined && { description: data.description || null }),
        });
        return mapService(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/services/${id}`, token),
    },

    clients: {
      list: async (): Promise<Client[]> => {
        const res = await req<{ records: RawClient[] }>('GET', `/v1/clients${tq}`, token);
        return res.records.map(mapClient);
      },
      create: async (data: {
        name: string;
        phone: string;
        email?: string;
        cpf?: string;
        birthDate?: string;
        notes?: string;
        tags?: ClientTag[];
      }): Promise<Client> => {
        const r = await req<RawClient>('POST', '/v1/clients', token, {
          tenant_id: tenantId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          cpf: data.cpf || null,
          birth_date: data.birthDate || null,
          notes: data.notes || null,
          tags: data.tags ?? [],
        });
        return mapClient(r);
      },
      update: async (
        id: string,
        data: Partial<{ name: string; phone: string; email: string; cpf: string; notes: string; tags: ClientTag[] }>,
      ): Promise<Client> => {
        const r = await req<RawClient>('PUT', `/v1/clients/${id}`, token, {
          ...(data.name != null && { name: data.name }),
          ...(data.phone != null && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.cpf !== undefined && { cpf: data.cpf || null }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
          ...(data.tags !== undefined && { tags: data.tags }),
        });
        return mapClient(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/clients/${id}`, token),
    },

    appointments: {
      list: async (filters?: {
        date?: string;
        from?: string;
        to?: string;
        professionalId?: string;
      }): Promise<Appointment[]> => {
        let path = `/v1/appointments${tq}`;
        if (filters?.date) path += `&date=${filters.date}`;
        if (filters?.from) path += `&from=${encodeURIComponent(filters.from)}`;
        if (filters?.to) path += `&to=${encodeURIComponent(filters.to)}`;
        if (filters?.professionalId) path += `&professionalId=${filters.professionalId}`;
        const res = await req<{ records: RawAppointment[] }>('GET', path, token);
        return res.records.map(mapAppointment);
      },
      create: async (data: {
        professionalId: string;
        clientName: string;
        serviceName: string;
        room?: string;
        startAt: string;
        endAt: string;
        status: AppointmentStatus;
        notes?: string;
        clientId?: string;
        serviceId?: string;
      }): Promise<Appointment> => {
        const r = await req<RawAppointment>('POST', '/v1/appointments', token, {
          tenant_id: tenantId,
          professional_id: data.professionalId || null,
          client_id: data.clientId || null,
          service_id: data.serviceId || null,
          client_name: data.clientName,
          service_name: data.serviceName,
          room: data.room || null,
          start_at: data.startAt,
          end_at: data.endAt,
          status: data.status,
          notes: data.notes || null,
        });
        return mapAppointment(r);
      },
      update: async (
        id: string,
        data: Partial<{
          status: AppointmentStatus;
          notes: string;
          startAt: string;
          endAt: string;
          professionalId: string;
        }>,
      ): Promise<Appointment> => {
        const r = await req<RawAppointment>('PUT', `/v1/appointments/${id}`, token, {
          ...(data.status != null && { status: data.status }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
          ...(data.startAt != null && { start_at: data.startAt }),
          ...(data.endAt != null && { end_at: data.endAt }),
          ...(data.professionalId != null && { professional_id: data.professionalId }),
        });
        return mapAppointment(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/appointments/${id}`, token),
    },

    bookingLinks: {
      current: (): Promise<RawBookingLinkResponse> => req('GET', `/v1/booking-links/current${tq}`, token),
    },

    orders: {
      list: async (): Promise<Order[]> => {
        const res = await req<{ records: RawOrder[] }>('GET', `/v1/orders${tq}`, token);
        return res.records.map(mapOrder);
      },
      create: async (data: {
        clientId?: string;
        professionalId?: string;
        itemSummary: string;
        total: number;
        status?: OrderStatus;
        notes?: string;
      }): Promise<Order> => {
        const r = await req<RawOrder>('POST', '/v1/orders', token, {
          tenant_id: tenantId,
          client_id: data.clientId || null,
          professional_id: data.professionalId || null,
          item_summary: data.itemSummary,
          total: data.total,
          status: data.status ?? 'open',
          notes: data.notes || null,
        });
        return mapOrder(r);
      },
      update: async (
        id: string,
        data: Partial<{
          clientId: string;
          professionalId: string;
          itemSummary: string;
          total: number;
          status: OrderStatus;
          notes: string;
        }>,
      ): Promise<Order> => {
        const r = await req<RawOrder>('PUT', `/v1/orders/${id}`, token, {
          ...(data.clientId !== undefined && { client_id: data.clientId || null }),
          ...(data.professionalId !== undefined && { professional_id: data.professionalId || null }),
          ...(data.itemSummary !== undefined && { item_summary: data.itemSummary }),
          ...(data.total !== undefined && { total: data.total }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
        });
        return mapOrder(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/orders/${id}`, token),
    },

    billing: {
      list: async (): Promise<BillingCharge[]> => {
        const res = await req<{ records: RawBillingCharge[] }>('GET', `/v1/billing${tq}`, token);
        return res.records.map(mapBillingCharge);
      },
      create: async (data: {
        clientId?: string;
        reference: string;
        amount: number;
        paidAmount?: number;
        dueDate: string;
        status?: BillingStatus;
        method: BillingMethod;
        notes?: string;
      }): Promise<BillingCharge> => {
        const r = await req<RawBillingCharge>('POST', '/v1/billing', token, {
          tenant_id: tenantId,
          client_id: data.clientId || null,
          reference: data.reference,
          amount: data.amount,
          paid_amount: data.paidAmount ?? 0,
          due_date: data.dueDate,
          status: data.status ?? 'pending',
          method: data.method,
          notes: data.notes || null,
        });
        return mapBillingCharge(r);
      },
      update: async (
        id: string,
        data: Partial<{
          clientId: string;
          reference: string;
          amount: number;
          paidAmount: number;
          dueDate: string;
          status: BillingStatus;
          method: BillingMethod;
          notes: string;
        }>,
      ): Promise<BillingCharge> => {
        const r = await req<RawBillingCharge>('PUT', `/v1/billing/${id}`, token, {
          ...(data.clientId !== undefined && { client_id: data.clientId || null }),
          ...(data.reference !== undefined && { reference: data.reference }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.paidAmount !== undefined && { paid_amount: data.paidAmount }),
          ...(data.dueDate !== undefined && { due_date: data.dueDate }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.method !== undefined && { method: data.method }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
        });
        return mapBillingCharge(r);
      },
      remove: (id: string): Promise<void> => req('DELETE', `/v1/billing/${id}`, token),
    },
  };
}

export type SaasApiClient = ReturnType<typeof createApiClient>;
