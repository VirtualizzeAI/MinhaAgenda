import dayjs from 'dayjs';
import { Order } from '@/services/api/contracts';

const now = dayjs('2026-03-21');

export const orders: Order[] = [
  {
    id: 'o1',
    clientName: 'Karla Luiza',
    professionalName: 'Beatriz Gomes',
    itemSummary: 'Podologia Completa Premium + esmaltação',
    total: 260,
    status: 'open',
    createdAt: now.hour(9).minute(20).toISOString(),
    notes: 'Cliente solicitou pagamento no fechamento do atendimento.',
  },
  {
    id: 'o2',
    clientName: 'Elizabeth Souza',
    professionalName: 'Carla Alves',
    itemSummary: 'Pé e Mão Express',
    total: 120,
    status: 'closed',
    createdAt: now.hour(11).minute(40).toISOString(),
  },
  {
    id: 'o3',
    clientName: 'Adriana Bueno',
    professionalName: 'Carla Alves',
    itemSummary: 'Pé e Mão U02 + hidratação',
    total: 180,
    status: 'open',
    createdAt: now.hour(12).minute(10).toISOString(),
  },
  {
    id: 'o4',
    clientName: 'Renata Borges',
    professionalName: 'Sabrina Costa',
    itemSummary: 'Avaliação estética',
    total: 95,
    status: 'canceled',
    createdAt: now.subtract(1, 'day').hour(15).minute(0).toISOString(),
    notes: 'Cancelado por indisponibilidade da cliente.',
  },
];