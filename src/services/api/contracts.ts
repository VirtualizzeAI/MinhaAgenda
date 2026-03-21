export type AppointmentStatus = 'confirmed' | 'in-progress' | 'attention' | 'available';

export interface UserSession {
  name: string;
  role: string;
  email: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  shortName: string;
  phone?: string;
  commissionRate?: number;
  active?: boolean;
}

export interface Appointment {
  id: string;
  professionalId: string;
  clientName: string;
  serviceName: string;
  room: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  notes?: string;
}

export type ClientTag = 'vip' | 'new' | 'attention' | 'inactive';

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  tags: ClientTag[];
  lastVisit: string;
  nextAppointment?: string;
  birthDate?: string;
  favoriteService?: string;
  notes?: string;
}

export type ServiceCategory =
  | 'podologia'
  | 'estetica'
  | 'unhas'
  | 'terapia'
  | 'pacote';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  active: boolean;
  description?: string;
}

export type OrderStatus = 'open' | 'closed' | 'canceled';

export interface Order {
  id: string;
  clientName: string;
  professionalName: string;
  itemSummary: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

export type BillingStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type BillingMethod = 'pix' | 'card' | 'cash' | 'transfer';

export interface BillingCharge {
  id: string;
  clientName: string;
  reference: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: BillingStatus;
  method: BillingMethod;
  notes?: string;
}
