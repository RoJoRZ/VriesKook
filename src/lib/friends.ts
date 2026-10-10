import type { FriendDinner, FriendGroup } from './domain';

// Stable IDs make migration identical on both devices, without guessing which names belong together.
export function migrateFriends(dinners: FriendDinner[], existing: FriendGroup[] = []) {
  const groups = existing.map((group) => ({ ...group }));
  const migrated = dinners.map((dinner) => {
    if (dinner.groupId && groups.some((group) => group.id === dinner.groupId)) return dinner;
    const name = dinner.people.trim();
    let group = groups.find((item) => item.name === name);
    if (!group) {
      group = { id: `legacy-${encodeURIComponent(name)}`, name, dislikes: '' };
      groups.push(group);
    }
    return { ...dinner, groupId: group.id };
  });
  return { groups, dinners: migrated };
}
