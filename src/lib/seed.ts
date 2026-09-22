import type { Booking, Dish, FreezerBatch, FriendDinner, PlannerEntry } from './domain';

export const seedDishes: Dish[] = [
  { id: 'gnocchi', name: 'Gnocchi met tomaat', course: 'Hoofdgerecht', tags: ['pasta', 'groente'], description: 'Met basilicum en mozzarella.', calories: 142, emoji: '🍝' },
  { id: 'rendang', name: 'Rendang', course: 'Hoofdgerecht', tags: ['rijst', 'vlees'], description: 'Langzaam gestoofd rundvlees.', emoji: '🍛' },
  { id: 'chili', name: 'Chili sin carne', course: 'Hoofdgerecht', tags: ['rijst', 'groente', 'vegetarisch'], description: 'Met bonen, maïs en paprika.', emoji: '🥘' },
  { id: 'lasagne', name: 'Lasagne', course: 'Hoofdgerecht', tags: ['pasta', 'groente'], emoji: '🥬' },
  { id: 'tiramisu', name: 'Tiramisu', course: 'Nagerecht', tags: ['dessert'], emoji: '🍰' },
  { id: 'pompoensoep', name: 'Pompoensoep', course: 'Voorgerecht', tags: ['groente', 'vegetarisch'], emoji: '🥣' },
  { id: 'boerenkool', name: 'Boerenkoolstamppot', course: 'Hoofdgerecht', tags: ['stamppot', 'aardappels', 'groente', 'vlees'], emoji: '🥔' }
];

export const seedBatches: FreezerBatch[] = [
  { id: 'batch-chili', dishId: 'chili', frozenAt: '2026-09-04', available: 2, original: 2, peoplePerPortion: 2 },
  { id: 'batch-rendang', dishId: 'rendang', frozenAt: '2026-09-10', available: 2, original: 2, peoplePerPortion: 2 },
  { id: 'batch-lasagne', dishId: 'lasagne', frozenAt: '2026-09-14', available: 3, original: 3, peoplePerPortion: 1 }
];

export const seedPlanner: PlannerEntry[] = [
  { id: 'plan-gnocchi', dishId: 'gnocchi', source: 'vers' },
  { id: 'plan-rendang', dishId: 'rendang', source: 'vriezer', batchId: 'batch-rendang' }
];

export const seedBookings: Booking[] = [
  { id: 'booking-pompoen', dishId: 'pompoensoep', type: 'gegeten', eatenAt: '2026-09-18' }
];

export const seedFriendDinners: FriendDinner[] = [
  { id: 'friends-1', date: '2026-09-13', people: 'Noor en Sjoerd', dishIds: ['lasagne', 'tiramisu'], note: 'Met groene salade erbij.' },
  { id: 'friends-2', date: '2026-08-24', people: 'Familie Joosen', dishIds: ['rendang'], note: 'Komkommerzuur erbij.' }
];
