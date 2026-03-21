import { Service } from '@/services/api/contracts';

export const services: Service[] = [
  {
    id: 's1',
    name: 'Podologia Completa Premium',
    category: 'podologia',
    durationMinutes: 90,
    price: 220,
    active: true,
    description: 'Atendimento completo com avaliação e tratamento.',
  },
  {
    id: 's2',
    name: 'Pé e Mão Express',
    category: 'unhas',
    durationMinutes: 60,
    price: 120,
    active: true,
  },
  {
    id: 's3',
    name: 'Avaliação Estética',
    category: 'estetica',
    durationMinutes: 45,
    price: 95,
    active: true,
  },
  {
    id: 's4',
    name: 'Laserterapia Pontual',
    category: 'terapia',
    durationMinutes: 30,
    price: 140,
    active: true,
  },
  {
    id: 's5',
    name: 'Pacote Reativação 3 Sessões',
    category: 'pacote',
    durationMinutes: 60,
    price: 330,
    active: false,
    description: 'Oferta sazonal para clientes inativos.',
  },
];