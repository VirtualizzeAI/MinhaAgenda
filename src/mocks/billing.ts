import dayjs from 'dayjs';
import { BillingCharge } from '@/services/api/contracts';

const baseDate = dayjs('2026-03-21');

export const billingCharges: BillingCharge[] = [
  {
    id: 'b1',
    clientName: 'Karla Luiza',
    reference: 'Comanda #o1',
    amount: 260,
    paidAmount: 0,
    dueDate: baseDate.toISOString(),
    status: 'pending',
    method: 'pix',
    notes: 'Pagamento no fechamento da sessão.',
  },
  {
    id: 'b2',
    clientName: 'Elizabeth Souza',
    reference: 'Comanda #o2',
    amount: 120,
    paidAmount: 120,
    dueDate: baseDate.subtract(1, 'day').toISOString(),
    status: 'paid',
    method: 'card',
  },
  {
    id: 'b3',
    clientName: 'Adriana Bueno',
    reference: 'Comanda #o3',
    amount: 180,
    paidAmount: 80,
    dueDate: baseDate.add(1, 'day').toISOString(),
    status: 'partial',
    method: 'cash',
    notes: 'Cliente sinalizou restante para amanhã.',
  },
  {
    id: 'b4',
    clientName: 'Renata Borges',
    reference: 'Pacote Reativação',
    amount: 330,
    paidAmount: 0,
    dueDate: baseDate.subtract(7, 'day').toISOString(),
    status: 'overdue',
    method: 'transfer',
    notes: 'Cobrança em atraso aguardando retorno.',
  },
];