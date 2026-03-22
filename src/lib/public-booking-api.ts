const API_URL = import.meta.env.VITE_API_URL as string;

export interface PublicBookingProfessional {
  id: string;
  name: string;
  specialty: string;
}

export interface PublicBookingService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface PublicBookingBootstrap {
  tenant: {
    id: string;
    name: string;
  };
  professionals: PublicBookingProfessional[];
  services: PublicBookingService[];
}

export interface PublicBookingSlot {
  value: string;
  label: string;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: resposta inválida do servidor`);
      }
    }
  }

  if (!res.ok) {
    const message = (data.message as string | undefined) ?? 'Erro na API';
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPublicBookingBootstrap(slug: string): Promise<PublicBookingBootstrap> {
  const res = await fetch(`${API_URL}/v1/public/booking/${slug}/bootstrap`);
  return readJson<PublicBookingBootstrap>(res);
}

export async function fetchPublicBookingSlots(params: {
  slug: string;
  date: string;
  professionalId: string;
  serviceDurationMinutes?: number;
  serviceIds?: string[];
}): Promise<PublicBookingSlot[]> {
  const query = new URLSearchParams({
    date: params.date,
    professionalId: params.professionalId,
  });

  if (params.serviceDurationMinutes != null) {
    query.set('serviceDurationMinutes', String(params.serviceDurationMinutes));
  }

  if (params.serviceIds?.length) {
    query.set('serviceIds', params.serviceIds.join(','));
  }

  const res = await fetch(`${API_URL}/v1/public/booking/${params.slug}/slots?${query.toString()}`);
  const data = await readJson<{ slots: PublicBookingSlot[] }>(res);
  return data.slots;
}

export async function createPublicBookingAppointment(params: {
  slug: string;
  professionalId: string;
  serviceIds: string[];
  startAt: string;
  clientName: string;
  clientPhone: string;
  clientCpf?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/v1/public/booking/${params.slug}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      professionalId: params.professionalId,
      serviceIds: params.serviceIds,
      startAt: params.startAt,
      clientName: params.clientName,
      clientPhone: params.clientPhone,
      clientCpf: params.clientCpf || null,
    }),
  });

  await readJson<{ appointmentId: string }>(res);
}
