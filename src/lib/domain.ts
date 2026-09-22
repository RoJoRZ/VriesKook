export type Course = 'Voorgerecht' | 'Hoofdgerecht' | 'Nagerecht';
export type Source = 'vers' | 'vriezer';
export type BookingType = 'gegeten' | 'ingevroren' | 'vriezer';
export type Screen = 'vandaag' | 'vers' | 'vriezer' | 'planner' | 'nieuw' | 'bewerken' | 'restjes' | 'vrienden';

export interface Dish {
  id: string;
  name: string;
  course: Course;
  tags: string[];
  description?: string;
  calories?: number;
  emoji: string;
  photoData?: string;
  archived?: boolean;
}

export interface FreezerBatch {
  id: string;
  dishId: string;
  frozenAt: string;
  available: number;
  original: number;
  peoplePerPortion: number;
}

export interface PlannerEntry {
  id: string;
  dishId: string;
  source: Source;
  batchId?: string;
}

export interface Booking {
  id: string;
  dishId: string;
  type: BookingType;
  eatenAt: string;
}

export interface FriendDinner {
  id: string;
  date: string;
  people: string;
  dishIds: string[];
  note?: string;
}

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());

export const formatDate = (value: string) => new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam'
}).format(new Date(`${value}T12:00:00`));

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
