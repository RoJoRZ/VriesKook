import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateFriends } from '../src/lib/friends.ts';

test('legacy dinners preserve history and merge only exactly equal trimmed names', () => {
  const dinners = ['Noor en Sjoerd', ' Noor en Sjoerd ', 'noor en sjoerd'].map((people, index) => ({ id: String(index), people, date: '2026-09-13', dishIds: ['archived-dish'], note: 'Bijgerecht' }));
  const result = migrateFriends(dinners);
  assert.equal(result.groups.length, 2);
  assert.equal(result.dinners[0].groupId, result.dinners[1].groupId);
  assert.notEqual(result.dinners[0].groupId, result.dinners[2].groupId);
  assert.deepEqual(result.dinners.map(({ groupId, ...dinner }) => dinner), dinners);
  assert.deepEqual(migrateFriends(dinners), result, 'migration is deterministic on both devices');
  assert.deepEqual(migrateFriends(result.dinners, result.groups), result, 'migration is idempotent');
  assert.equal('groupId' in dinners[0], false, 'input is not mutated');
});

test('existing group preferences and explicit group IDs survive migration and renaming', () => {
  const groups = [{ id: 'g', name: 'De buren', dislikes: 'Vis en champignons' }];
  const dinners = [{ id: 'd', groupId: 'g', people: 'Oude naam', date: '2026-01-01', dishIds: ['dish'] }];
  assert.deepEqual(migrateFriends(dinners, groups), { groups, dinners });
});

test('empty state and legacy dinners alongside existing groups are supported', () => {
  assert.deepEqual(migrateFriends([]), { groups: [], dinners: [] });
  const groups = [{ id: 'g', name: 'Familie', dislikes: 'Koriander' }];
  const result = migrateFriends([{ id: 'd', people: 'Familie', date: '2026-01-01', dishIds: [] }], groups);
  assert.equal(result.groups.length, 1);
  assert.equal(result.dinners[0].groupId, 'g');
  assert.equal(result.groups[0].dislikes, 'Koriander');
});
