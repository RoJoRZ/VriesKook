import type { Booking, Dish, FreezerBatch, FriendDinner, PlannerEntry } from './domain';

export function dishRemovalBlocker(dishId: string, planner: PlannerEntry[], batches: FreezerBatch[]) {
  if (planner.some((entry) => entry.dishId === dishId)) return 'planner';
  if (batches.some((batch) => batch.dishId === dishId && batch.available > 0)) return 'vriezer';
  return null;
}

export function removeDishPreservingHistory(
  dishes: Dish[],
  dishId: string,
  bookings: Booking[],
  friendDinners: FriendDinner[],
  batches: FreezerBatch[]
) {
  const inHistory = bookings.some((booking) => booking.dishId === dishId) ||
    friendDinners.some((dinner) => dinner.dishIds.includes(dishId)) ||
    batches.some((batch) => batch.dishId === dishId);
  return inHistory
    ? dishes.map((dish) => dish.id === dishId ? { ...dish, archived: true } : dish)
    : dishes.filter((dish) => dish.id !== dishId);
}
