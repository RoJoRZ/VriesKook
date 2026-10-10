<script lang="ts">
  import { onMount } from 'svelte';
  import type { Course, Dish, FreezerBatch, FriendDinner, FriendGroup, PlannerEntry, Screen, Source } from '$lib/domain';
  import { migrateFriends } from '$lib/friends';
  import { formatDate, today, uid } from '$lib/domain';
  import { dishRemovalBlocker, removeDishPreservingHistory } from '$lib/dish-lifecycle';
  import { seedBatches, seedBookings, seedDishes, seedFriendDinners, seedPlanner } from '$lib/seed';

  const storageKey = 'helpmenu-local-v1';
  const courses: Course[] = ['Voorgerecht', 'Hoofdgerecht', 'Nagerecht', 'Onderdeel'];
  const commonTags = ['rijst', 'pasta', 'aardappels', 'stamppot', 'groente', 'vlees', 'vegetarisch'];

  let screen: Screen = 'vandaag';
  let dishes: Dish[] = structuredClone(seedDishes);
  let batches: FreezerBatch[] = structuredClone(seedBatches);
  let planner: PlannerEntry[] = structuredClone(seedPlanner);
  let bookings = structuredClone(seedBookings);
  let friendDinners: FriendDinner[] = structuredClone(seedFriendDinners);
  let query = '';
  let activeCourse: Course | '' = '';
  let activeTag = '';
  let mealSource: Source = 'vers';
  let mealPeople = '';
  let freezerCourse: Course | '' = '';
  let freezerPeople = '';
  let enlargedPhoto: { url: string; name: string } | null = null;
  let photoDialog: HTMLDialogElement;
  $: if (enlargedPhoto && photoDialog && !photoDialog.open) photoDialog.showModal();
  let toast = '';
  let booking: { dishId: string; source: Source; plannerId?: string; batchId?: string } | null = null;
  let bookingEaten = true;
  let bookingFrozen = false;
  let bookingDate = today();
  let freezePortions = 1;
  let freezePeoplePerPortion = 2;
  let leftoversDishId = 'gnocchi';
  let leftoversPortions = 2;
  let leftoversPeoplePerPortion = 2;
  let leftoversDate = today();
  let leftoversCourseFilter: Course | '' = '';
  let leftoversTagFilter = '';
  let newDishName = '';
  let newDishCourse: Course = 'Hoofdgerecht';
  let newDishDescription = '';
  let newDishCalories = '';
  let newDishTags: string[] = [];
  let newDishPhoto = '';
  let newDishPhotoBlob: Blob | null = null;
  let photoPreviewUrl = '';
  let savingDish = false;
  let editingDishId: string | null = null;
  let dinnerDate = today();
  let friendGroups: FriendGroup[] = [];
  let dinnerGroupId = '';
  let friendsGroupFilter = '';
  let friendsQuery = '';
  let friendsOrder = 'newest';
  let dinnerFormOpen = false;
  let editingDinnerId: string | null = null;
  let groupFormOpen = false;
  let editingGroupId: string | null = null;
  let groupName = '';
  let groupDislikes = '';
  let dinnerQuery = '';
  let dinnerCourse: Course | '' = '';
  let dinnerTag = '';
  let dinnerNote = '';
  let dinnerDishIds: string[] = [];
  let hydrating = true;
  let plannerSourceChoiceOpen = false;
  let onlineStatus: 'checking' | 'local' | 'anonymous' | 'authenticated' = 'checking';
  let loginPassword = '';
  let loginError = '';
  let passwordDialog = false;
  let currentPassword = '';
  let newPassword = '';
  let passwordError = '';
  let syncTimer: number | undefined;
  let refreshTimer: number | undefined;
  let syncInFlight = false;
  let pendingSnapshot = '';
  let localSnapshot = '';
  let lastSyncedSnapshot = '';
  let remoteVersion = 0;
  let syncStatus: 'checking' | 'synced' | 'saving' | 'offline' | 'conflict' | 'local' = 'checking';
  let pendingConfirmation: string | null = null;
  let saveConfirmation: string | null = null;
  let snapshot = '';
  let syncText = 'Verbinden…';

  onMount(() => {
    void initialise();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshRemoteState();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    refreshTimer = window.setInterval(() => void refreshRemoteState(), 15_000);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      if (syncTimer) window.clearTimeout(syncTimer);
      if (refreshTimer) window.clearInterval(refreshTimer);
      clearPhotoPreview();
    };
  });

  async function initialise() {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        dishes = state.dishes ?? dishes;
        batches = state.batches ?? batches;
        planner = state.planner ?? planner;
        bookings = state.bookings ?? bookings;
        const friends = migrateFriends(state.friendDinners ?? [], state.friendGroups ?? []);
        friendDinners = friends.dinners;
        friendGroups = friends.groups;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    try {
      const response = await fetch('/api/auth/status');
      if (response.status === 503) { onlineStatus = 'local'; syncStatus = 'local'; }
      else if ((await response.json()).authenticated) {
        onlineStatus = 'authenticated';
        await fetchAndApplyRemoteState();
      } else { onlineStatus = 'anonymous'; syncStatus = 'local'; }
    } catch { onlineStatus = 'local'; syncStatus = 'local'; }
    hydrating = false;
    localSnapshot = snapshot;
  }

  $: snapshot = JSON.stringify({ dishes, batches, planner, bookings, friendDinners, friendGroups });
  $: syncText = syncStatus === 'saving' ? 'Opslaan…' : syncStatus === 'offline' ? 'Niet gesynchroniseerd' : syncStatus === 'conflict' ? 'Wijzigingen afstemmen' : syncStatus === 'local' ? 'Alleen dit apparaat' : syncStatus === 'synced' ? 'Gesynchroniseerd' : 'Verbinden…';
  $: if (!hydrating && snapshot !== localSnapshot) {
    localSnapshot = snapshot;
    localStorage.setItem(storageKey, snapshot);
    if (onlineStatus === 'authenticated' && snapshot !== lastSyncedSnapshot) scheduleSync(snapshot);
  }
  $: availableDishes = dishes.filter((dish) => !dish.archived);
  $: selectedFriendGroup = friendGroups.find((group) => group.id === friendsGroupFilter);
  $: dinnerGroup = friendGroups.find((group) => group.id === dinnerGroupId);
  $: filteredDinners = friendDinners.filter((dinner) =>
    (!friendsGroupFilter || dinner.groupId === friendsGroupFilter) &&
    [friendGroups.find((group) => group.id === dinner.groupId)?.name ?? dinner.people,
      dinner.note ?? '', ...dinner.dishIds.map((id) => getDish(id)?.name ?? '')]
      .join(' ').toLowerCase().includes(friendsQuery.trim().toLowerCase()))
    .slice().sort((a, b) => friendsOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  $: dinnerDishChoices = dishes.filter((dish) =>
    (!dish.archived || dinnerDishIds.includes(dish.id)) &&
    dish.name.toLowerCase().includes(dinnerQuery.trim().toLowerCase()) &&
    (!dinnerCourse || dish.course === dinnerCourse) && (!dinnerTag || dish.tags.includes(dinnerTag)));

  $: lastEatenDates = bookings.reduce<Record<string, string>>((dates, booking) => {
    if (booking.type === 'ingevroren') return dates;
    if (!dates[booking.dishId] || booking.eatenAt > dates[booking.dishId]) dates[booking.dishId] = booking.eatenAt;
    return dates;
  }, {});
  $: filteredDishes = availableDishes
    .filter((dish) => {
      const matchesQuery = dish.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCourse = !activeCourse || dish.course === activeCourse;
      const matchesTag = !activeTag || dish.tags.includes(activeTag);
      return matchesQuery && matchesCourse && matchesTag;
    })
    .map((dish, index) => ({ dish, index, lastEatenAt: lastEatenDates[dish.id] }))
    .sort((first, second) => {
      if (Boolean(first.lastEatenAt) !== Boolean(second.lastEatenAt)) return first.lastEatenAt ? -1 : 1;
      return (first.lastEatenAt ?? '').localeCompare(second.lastEatenAt ?? '') || first.index - second.index;
    })
    .map(({ dish }) => dish);
  $: freezerBatches = [...batches].filter((batch) => batch.available > 0).sort((a, b) => a.frozenAt.localeCompare(b.frozenAt));
  $: oldestBatch = freezerBatches[0];
  $: activePlanner = planner.slice(0, 7);
  $: peopleOptions = [...new Set(freezerBatches.map((batch) => batch.peoplePerPortion))].sort((a, b) => a - b);
  $: filteredFreezerBatches = freezerBatches.filter((batch) =>
    (!freezerCourse || getDish(batch.dishId)?.course === freezerCourse) &&
    (!freezerPeople || batch.peoplePerPortion === Number(freezerPeople)));
  $: mealBatches = freezerBatches.filter((batch) => {
    const dish = getDish(batch.dishId);
    return dish && !dish.archived && freePortions(batch) > 0 &&
      dish.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!activeCourse || dish.course === activeCourse) &&
      (!activeTag || dish.tags.includes(activeTag)) &&
      (!mealPeople || batch.peoplePerPortion === Number(mealPeople));
  });
  $: filteredLeftoversDishes = availableDishes.filter((dish) =>
    (!leftoversCourseFilter || dish.course === leftoversCourseFilter) &&
    (!leftoversTagFilter || dish.tags.includes(leftoversTagFilter))
  );
  $: if (filteredLeftoversDishes.length && !filteredLeftoversDishes.some((dish) => dish.id === leftoversDishId)) leftoversDishId = filteredLeftoversDishes[0].id;

  function getDish(id: string) {
    return dishes.find((dish) => dish.id === id);
  }

  function reservationsFor(batchId: string) {
    return planner.filter((entry) => entry.source === 'vriezer' && entry.batchId === batchId).length;
  }

  function freePortions(batch: FreezerBatch) {
    return Math.max(0, batch.available - reservationsFor(batch.id));
  }

  function sourceLabel(source: Source) {
    return source === 'vers' ? 'Vers koken' : 'Uit de vriezer';
  }

  function peopleLabel(people: number) {
    return `${people} ${people === 1 ? 'persoon' : 'personen'} per portie`;
  }

  function peopleForBatch(batchId?: string) {
    return batchId ? batches.find((batch) => batch.id === batchId)?.peoplePerPortion : undefined;
  }

  function lastEatenLabel(date?: string) {
    return date ? `Laatst gegeten: ${formatDate(date)}` : 'Nog niet gegeten';
  }

  function stateSnapshot() {
    return JSON.stringify({ dishes, batches, planner, bookings, friendDinners, friendGroups });
  }

  function applyRemoteState(payload: { state: { dishes?: Dish[]; batches?: FreezerBatch[]; planner?: PlannerEntry[]; bookings?: typeof bookings; friendDinners?: FriendDinner[]; friendGroups?: FriendGroup[] } | null; version: number }) {
    const remote = payload.state;
    dishes = remote?.dishes ?? [];
    batches = remote?.batches ?? [];
    planner = remote?.planner ?? [];
    bookings = remote?.bookings ?? [];
    const friends = migrateFriends(remote?.friendDinners ?? [], remote?.friendGroups ?? []);
    friendDinners = friends.dinners;
    friendGroups = friends.groups;
    remoteVersion = payload.version;
    lastSyncedSnapshot = stateSnapshot();
    localSnapshot = lastSyncedSnapshot;
    localStorage.setItem(storageKey, lastSyncedSnapshot);
    syncStatus = 'synced';
  }

  async function fetchAndApplyRemoteState() {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('De gedeelde gegevens kunnen niet worden geladen.');
    applyRemoteState(await response.json());
  }

  function scheduleSync(nextSnapshot: string) {
    pendingSnapshot = nextSnapshot;
    syncStatus = 'saving';
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => void flushSync(), 450);
  }

  async function flushSync() {
    if (syncInFlight || !pendingSnapshot || onlineStatus !== 'authenticated') return;
    const snapshotToSave = pendingSnapshot;
    pendingSnapshot = '';
    syncInFlight = true;
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: JSON.parse(snapshotToSave), version: remoteVersion })
      });
      if (response.status === 409) {
        pendingSnapshot = snapshotToSave;
        syncStatus = 'conflict';
        showToast('Er zijn wijzigingen op een ander apparaat. Kies welke gegevens je wilt laden.');
        return;
      }
      if (!response.ok) throw new Error('Opslaan mislukt.');
      const result = await response.json() as { version: number };
      remoteVersion = result.version;
      lastSyncedSnapshot = snapshotToSave;
      syncStatus = 'synced';
      if (pendingConfirmation) {
        saveConfirmation = pendingConfirmation;
        pendingConfirmation = null;
      }
    } catch {
      pendingSnapshot = snapshotToSave;
      syncStatus = 'offline';
      showToast('Opslaan lukt nu niet. Je wijziging blijft op dit apparaat staan.');
    } finally {
      syncInFlight = false;
      if (pendingSnapshot && pendingSnapshot !== lastSyncedSnapshot && syncStatus === 'saving') void flushSync();
    }
  }

  async function refreshRemoteState() {
    if (hydrating || onlineStatus !== 'authenticated' || syncInFlight || pendingSnapshot || snapshot !== lastSyncedSnapshot) return;
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error();
      const payload = await response.json() as { state: Parameters<typeof applyRemoteState>[0]['state']; version: number };
      if (payload.version !== remoteVersion) {
        applyRemoteState(payload);
        showToast('Gegevens bijgewerkt vanaf je andere apparaat.');
      }
    } catch {
      syncStatus = 'offline';
    }
  }

  function retrySync() {
    if (syncStatus === 'conflict') return;
    scheduleSync(pendingSnapshot || snapshot);
  }

  async function loadNewestState() {
    if (!window.confirm('Niet-opgeslagen lokale wijzigingen worden vervangen door de nieuwste online gegevens. Doorgaan?')) return;
    pendingSnapshot = '';
    await fetchAndApplyRemoteState();
    showToast('De nieuwste gedeelde gegevens zijn geladen.');
  }

  function requestConfirmation(message: string) {
    pendingConfirmation = message;
  }

  function showToast(message: string) {
    toast = message;
    window.setTimeout(() => { if (toast === message) toast = ''; }, 3600);
  }

  function navigate(next: Screen) {
    if (next === 'nieuw') resetDishForm();
    screen = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetDishForm() {
    clearPhotoPreview();
    editingDishId = null;
    newDishName = '';
    newDishCourse = 'Hoofdgerecht';
    newDishDescription = '';
    newDishCalories = '';
    newDishTags = [];
    newDishPhoto = '';
  }

  function editDish(dish: Dish) {
    clearPhotoPreview();
    editingDishId = dish.id;
    newDishName = dish.name;
    newDishCourse = dish.course;
    newDishDescription = dish.description ?? '';
    newDishCalories = dish.calories === undefined ? '' : String(dish.calories);
    newDishTags = [...dish.tags];
    newDishPhoto = dish.photoData ?? '';
    navigate('bewerken');
  }

  function addToPlanner(dish: Dish, source: Source, batch?: FreezerBatch) {
    if (planner.length >= 7) return showToast('De planner is al vol (maximaal zeven maaltijden).');
    let chosenBatch = batch;
    if (source === 'vriezer' && !chosenBatch) chosenBatch = freezerBatches.find((item) => freePortions(item) > 0);
    if (source === 'vriezer' && (!chosenBatch || freePortions(chosenBatch) < 1)) {
      return showToast('Er is geen vrije portie meer beschikbaar voor dit vriesgerecht.');
    }
    planner = [...planner, { id: uid('plan'), dishId: dish.id, source, batchId: chosenBatch?.id }];
    requestConfirmation(`${dish.name} staat in de planner.`);
  }

  function openBooking(dishId: string, source: Source, plannerId?: string, batchId?: string) {
    booking = { dishId, source, plannerId, batchId };
    bookingEaten = true;
    bookingFrozen = false;
    bookingDate = today();
    freezePortions = 1;
    freezePeoplePerPortion = 2;
  }

  function commitBooking() {
    const currentBooking = booking;
    if (!currentBooking) return;
    const dish = getDish(currentBooking.dishId);
    if (!dish) return;
    if (currentBooking.source === 'vriezer') {
      const candidate = currentBooking.batchId ? batches.find((batch) => batch.id === currentBooking.batchId) : freezerBatches.find((batch) => batch.dishId === dish.id && freePortions(batch) > 0);
      if (!candidate || candidate.available < 1) return showToast('Deze portie is niet meer beschikbaar. Kies een ander gerecht of kook vers.');
      batches = batches.map((batch) => batch.id === candidate.id ? { ...batch, available: batch.available - 1 } : batch);
    }
    if (currentBooking.source === 'vers' && !bookingEaten && !bookingFrozen) return showToast('Kies of de maaltijd gegeten, ingevroren of allebei is.');
    if (currentBooking.source === 'vers' && bookingFrozen) {
      batches = [...batches, { id: uid('batch'), dishId: dish.id, frozenAt: bookingDate, available: freezePortions, original: freezePortions, peoplePerPortion: freezePeoplePerPortion }];
    }
    const bookingType = currentBooking.source === 'vriezer' ? 'vriezer' : bookingEaten ? 'gegeten' : 'ingevroren';
    bookings = [{ id: uid('booking'), dishId: dish.id, type: bookingType, eatenAt: bookingDate }, ...bookings];
    if (currentBooking.plannerId) planner = planner.filter((entry) => entry.id !== currentBooking.plannerId);
    booking = null;
    requestConfirmation(bookingFrozen && bookingEaten ? `${dish.name} is geboekt en ${freezePortions} portie(s) zijn ingevroren.` : bookingFrozen ? `${freezePortions} portie(s) ${dish.name} zijn ingevroren.` : `${dish.name} is geboekt.`);
  }

  function removePlanner(entry: PlannerEntry) {
    planner = planner.filter((item) => item.id !== entry.id);
    requestConfirmation('De maaltijd is uit de planner verwijderd.');
  }

  function saveLeftovers() {
    const dish = getDish(leftoversDishId);
    if (!dish || leftoversPortions < 1) return;
    batches = [...batches, { id: uid('batch'), dishId: dish.id, frozenAt: leftoversDate, available: leftoversPortions, original: leftoversPortions, peoplePerPortion: leftoversPeoplePerPortion }];
    requestConfirmation(`${leftoversPortions} portie(s) ${dish.name} voor ${leftoversPeoplePerPortion} ${leftoversPeoplePerPortion === 1 ? 'persoon' : 'personen'} staan in de vriezer.`);
  }

  function toggleNewTag(tag: string) {
    newDishTags = newDishTags.includes(tag) ? newDishTags.filter((item) => item !== tag) : [...newDishTags, tag];
  }

  async function saveDish() {
    if (savingDish) return;
    const name = newDishName.trim();
    if (!name) return showToast('Vul eerst de naam van het gerecht in.');
    if (name.length > 20) return showToast('De naam van een gerecht mag maximaal 20 karakters hebben.');
    const calories = newDishCalories === '' ? undefined : Number(newDishCalories);
    if (calories !== undefined && (!Number.isFinite(calories) || calories < 0)) return showToast('Vul een geldig aantal calorieën in.');
    const emoji = newDishCourse === 'Nagerecht' ? '🍰' : newDishCourse === 'Voorgerecht' ? '🥣' : newDishCourse === 'Onderdeel' ? '🥘' : '🍲';
    const previous = editingDishId ? getDish(editingDishId) : undefined;
    if (editingDishId && (!previous || previous.archived)) return showToast('Dit gerecht is niet meer beschikbaar. Open de gerechtenlijst opnieuw.');
    savingDish = true;
    try {
      let photoReference = newDishPhoto;
      if (newDishPhotoBlob || newDishPhoto.startsWith('data:')) {
        if (onlineStatus !== 'authenticated') throw new Error('Foto opslaan vereist een online verbinding. Probeer het opnieuw zodra je bent aangemeld.');
        const photo = newDishPhotoBlob ?? await (await fetch(newDishPhoto)).blob();
        if (photo.size > 5_000_000) throw new Error('De foto is te groot (maximaal 5 MB na verkleinen).');
        const response = await fetch('/api/photos', { method: 'POST', headers: { 'content-type': photo.type }, body: photo });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? 'Foto opslaan mislukt. Probeer het opnieuw.');
        photoReference = result.url;
      }
      const dish: Dish = { ...previous, id: previous?.id ?? uid('dish'), name, course: newDishCourse, tags: [...newDishTags], description: newDishDescription.trim() || undefined, calories, emoji, photoData: photoReference || undefined };
      const nextDishes = previous ? dishes.map((item) => item.id === previous.id ? dish : item) : [...dishes, dish];
      if (JSON.stringify({ dishes: nextDishes, batches, planner, bookings, friendDinners, friendGroups }).length > 1_900_000) throw new Error('De gedeelde gegevenslijst is te groot. Neem contact op voor hulp.');
      dishes = nextDishes;
      resetDishForm();
      query = ''; activeCourse = ''; activeTag = '';
      requestConfirmation(previous ? `${dish.name} is gewijzigd.` : `${dish.name} is toegevoegd aan je gerechten.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gerecht opslaan mislukt. Probeer het opnieuw.');
    } finally {
      savingDish = false;
    }
  }

  function toggleDinnerDish(dishId: string) {
    dinnerDishIds = dinnerDishIds.includes(dishId) ? dinnerDishIds.filter((id) => id !== dishId) : [...dinnerDishIds, dishId];
  }

  function openDinner(dinner?: FriendDinner) {
    editingDinnerId = dinner?.id ?? null;
    dinnerDate = dinner?.date ?? today();
    dinnerGroupId = dinner?.groupId ?? friendsGroupFilter ?? '';
    dinnerNote = dinner?.note ?? '';
    dinnerDishIds = dinner ? [...dinner.dishIds] : [];
    dinnerQuery = ''; dinnerCourse = ''; dinnerTag = '';
    dinnerFormOpen = true;
  }

  function openGroup(group?: FriendGroup) {
    editingGroupId = group?.id ?? null;
    groupName = group?.name ?? '';
    groupDislikes = group?.dislikes ?? '';
    groupFormOpen = true;
  }

  function saveFriendGroup() {
    const name = groupName.trim();
    if (!name) return showToast('Vul een naam voor het gezelschap in.');
    if (friendGroups.some((group) => group.id !== editingGroupId && group.name === name)) return showToast('Een gezelschap met deze naam bestaat al.');
    const group: FriendGroup = { id: editingGroupId ?? uid('group'), name, dislikes: groupDislikes.trim() };
    friendGroups = editingGroupId ? friendGroups.map((item) => item.id === group.id ? group : item) : [...friendGroups, group];
    // Retain a readable name for older app versions and historical records.
    friendDinners = friendDinners.map((dinner) => dinner.groupId === group.id ? { ...dinner, people: name } : dinner);
    friendsGroupFilter = group.id;
    if (dinnerFormOpen) dinnerGroupId = group.id;
    groupFormOpen = false;
    requestConfirmation('Gezelschap opgeslagen.');
  }

  function saveFriendDinner() {
    const group = friendGroups.find((item) => item.id === dinnerGroupId);
    if (!group || !/^\d{4}-\d{2}-\d{2}$/.test(dinnerDate) || dinnerDishIds.length === 0) return showToast('Kies een gezelschap, datum en minimaal één gerecht.');
    const dinner: FriendDinner = { id: editingDinnerId ?? uid('dinner'), groupId: group.id, date: dinnerDate, people: group.name, dishIds: [...dinnerDishIds], note: dinnerNote.trim() || undefined };
    friendDinners = editingDinnerId ? friendDinners.map((item) => item.id === dinner.id ? dinner : item) : [...friendDinners, dinner];
    friendsGroupFilter = group.id;
    dinnerFormOpen = false;
    requestConfirmation('Etentje met vrienden opgeslagen.');
  }

  function deleteDish(dish: Dish) {
    const blocker = dishRemovalBlocker(dish.id, planner, batches);
    if (blocker === 'planner') return showToast('Verwijder dit gerecht eerst uit de planner.');
    if (blocker === 'vriezer') return showToast('Gebruik de vriesporties van dit gerecht eerst op.');
    if (!window.confirm(`Weet je zeker dat je ${dish.name} wilt verwijderen?`)) return;
    dishes = removeDishPreservingHistory(dishes, dish.id, bookings, friendDinners, batches);
    requestConfirmation(`${dish.name} is verwijderd.`);
  }

  async function login() {
    loginError = '';
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: loginPassword }) });
    if (!response.ok) return loginError = 'Het wachtwoord klopt niet.';
    onlineStatus = 'authenticated'; loginPassword = '';
    try {
      await fetchAndApplyRemoteState();
    } catch {
      onlineStatus = 'local'; syncStatus = 'local';
      loginError = 'Aanmelden gelukt, maar de gedeelde gegevens zijn nu niet bereikbaar.';
    }
  }

  async function savePassword() {
    passwordError = '';
    const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
    const result = await response.json();
    if (!response.ok) return passwordError = result.error ?? 'Wachtwoord wijzigen mislukt.';
    currentPassword = ''; newPassword = ''; passwordDialog = false; showToast('Wachtwoord gewijzigd.');
  }

  function clearPhotoPreview() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    photoPreviewUrl = '';
    newDishPhotoBlob = null;
  }

  function removeDishPhoto() {
    clearPhotoPreview();
    newDishPhoto = '';
  }

  async function chooseDishPhoto(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Kies een afbeeldingsbestand.');
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('De foto kan niet worden geopend.')); image.src = sourceUrl; });
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('De foto kan niet worden verwerkt.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
      if (!photo) throw new Error('De foto kan niet worden verwerkt.');
      if (photo.size > 5_000_000) throw new Error('De foto is te groot (maximaal 5 MB na verkleinen).');
      clearPhotoPreview();
      newDishPhotoBlob = photo;
      photoPreviewUrl = URL.createObjectURL(photo);
      newDishPhoto = photoPreviewUrl;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'De foto kan niet worden verwerkt.');
    } finally {
      URL.revokeObjectURL(sourceUrl);
      input.value = '';
    }
  }
</script>

<svelte:head>
  <title>HelpMenu</title>
  <meta name="description" content="Samen kiezen, plannen en bijhouden wat jullie eten." />
</svelte:head>

<div class="app-shell">
  <aside class="sidebar" aria-label="Hoofdnavigatie">
    <button class="brand" on:click={() => navigate('vandaag')} aria-label="Naar Vandaag"><span>✦</span> HelpMenu</button>
    <nav>
      <button class:active={screen === 'vandaag'} on:click={() => navigate('vandaag')}>⌂ <span>Vandaag</span></button>
      <button class:active={screen === 'vers' || screen === 'bewerken'} on:click={() => navigate('vers')}>⌕ <span>Gerechten</span></button>
      <button class:active={screen === 'vriezer'} on:click={() => navigate('vriezer')}>❄ <span>Vriezer</span></button>
      <button class:active={screen === 'planner'} on:click={() => navigate('planner')}>☷ <span>Planner</span></button>
      <button class:active={screen === 'nieuw'} on:click={() => navigate('nieuw')}>＋ <span>Nieuw gerecht</span></button>
      <button class:active={screen === 'restjes'} on:click={() => navigate('restjes')}>▣ <span>Restjes</span></button>
      <button class:active={screen === 'vrienden'} on:click={() => navigate('vrienden')}><span aria-hidden="true">👥</span> <span>Vrienden</span></button>
    </nav>
  </aside>

  <main>
    <header class="topbar">
      <button class="mobile-brand" on:click={() => navigate('vandaag')} aria-label="Naar Vandaag"><span>✦</span> HelpMenu</button>
      <div class:warning={syncStatus === 'offline' || syncStatus === 'conflict'} class="sync-status" aria-live="polite">
        <span>{syncText}</span>
        {#if syncStatus === 'offline'}<button on:click={retrySync}>Opnieuw</button>{:else if syncStatus === 'conflict'}<button on:click={loadNewestState}>Nieuwste laden</button>{/if}
      </div>
      <button class="account-button" on:click={() => passwordDialog = true}>Wachtwoord</button>
    </header>

    {#if screen === 'vandaag'}
      <section class="page home" aria-labelledby="today-title">
        <p class="eyebrow">{formatDate(today())}</p>
        <h1 id="today-title">Wat eten we vandaag?</h1>
        <button class="primary action" on:click={() => navigate('vers')}>Maaltijd boeken <span>＋</span></button>

        <div class="section-heading"><h2>Eerst opmaken</h2><button class="text-button" on:click={() => navigate('vriezer')}>Vriezer</button></div>
        {#if oldestBatch}
          {@const oldestDish = getDish(oldestBatch.dishId)}
          {#if oldestDish}
            <button class="item accent-item" on:click={() => openBooking(oldestDish.id, 'vriezer', undefined, oldestBatch.id)}>
              <span class="dish-icon vriezer">❄</span><span><strong>{oldestDish.name}</strong><small>Ingevroren {formatDate(oldestBatch.frozenAt)} · {freePortions(oldestBatch)} vrij · {peopleLabel(oldestBatch.peoplePerPortion)}</small></span><b>›</b>
            </button>
          {/if}
        {:else}
          <div class="empty">De vriezer is leeg.</div>
        {/if}
        <div class="quick-actions">
          <button on:click={() => navigate('restjes')}>▣ Restjes invriezen</button>
          <button on:click={() => navigate('nieuw')}>＋ Nieuw gerecht</button>
          <button on:click={() => navigate('vers')}>⌕ Gerechten bekijken ({availableDishes.length})</button>
        </div>
      </section>
    {:else if screen === 'vers'}
      <section class="page" aria-labelledby="fresh-title">
        <div class="title-row"><div><p class="eyebrow">Gerechten</p><h1 id="fresh-title">Mijn gerechten</h1></div><span class="count">{availableDishes.length}</span></div>
        <button class="primary top-action" on:click={() => navigate('nieuw')}>＋ Nieuw gerecht</button>
        <div class="chips" aria-label="Filter op maaltijdbron">
          <button class:chosen={mealSource === 'vers'} on:click={() => mealSource = 'vers'}>Vers</button>
          <button class:chosen={mealSource === 'vriezer'} on:click={() => mealSource = 'vriezer'}>Vriezer</button>
        </div>
        {#if mealSource === 'vriezer'}<label class="people-filter">Aantal personen per portie<select bind:value={mealPeople}><option value="">Alle aantallen</option>{#each peopleOptions as people}<option value={String(people)}>{people} {people === 1 ? 'persoon' : 'personen'}</option>{/each}</select></label>{/if}
        <label class="search"><span class="sr-only">Zoek een gerecht</span><span>⌕</span><input bind:value={query} placeholder="Zoek een gerecht" /></label>
        <div class="chips" aria-label="Filter op gerechtstype">
          <button class:chosen={!activeCourse} on:click={() => activeCourse = ''}>Alles</button>
          {#each courses as course}<button class:chosen={activeCourse === course} on:click={() => activeCourse = course}>{course}</button>{/each}
        </div>
        <div class="chips" aria-label="Filter op kenmerk">
          <button class:chosen={!activeTag} on:click={() => activeTag = ''}>Alles</button>
          {#each commonTags as tag}<button class:chosen={activeTag === tag} on:click={() => activeTag = tag}>{tag}</button>{/each}
        </div>
        {#if mealSource === 'vers'}
        <div class="dish-grid">
          {#each filteredDishes as dish}
            <article class="dish-card">
              {#if dish.photoData}<button class="dish-art photo-open" aria-label={`Foto van ${dish.name} vergroten`} on:click={() => enlargedPhoto = { url: dish.photoData!, name: dish.name }}><img src={dish.photoData} alt={dish.name} /></button>{:else}<div class="dish-art" aria-hidden="true">{dish.emoji}</div>{/if}
              <div class="dish-card-content"><h2>{dish.name}</h2><p>{dish.course} · {dish.tags.join(' · ') || 'zonder kenmerken'}</p><small>{lastEatenLabel(lastEatenDates[dish.id])}</small></div>
              <div class="card-actions"><button class="secondary" on:click={() => openBooking(dish.id, 'vers')}>Nu boeken</button><button class="icon-button" title="Aan planner toevoegen" on:click={() => addToPlanner(dish, 'vers')}>＋<span class="sr-only">Aan planner toevoegen</span></button><button class="secondary" on:click={() => editDish(dish)}>Wijzigen</button><button class="delete-button" on:click={() => deleteDish(dish)}>Verwijderen</button></div>
            </article>
          {:else}<div class="empty">Geen gerechten gevonden. Pas je filter aan of voeg een nieuw gerecht toe.</div>{/each}
        </div>
        {:else}
          <div class="list">
            {#each mealBatches as batch}
              {@const dish = getDish(batch.dishId)}
              {#if dish}<article class="item freezer-item"><span class="dish-icon vriezer">❄</span><span><strong>{dish.name}</strong><small>Ingevroren {formatDate(batch.frozenAt)} · {peopleLabel(batch.peoplePerPortion)} · {freePortions(batch)} vrij</small></span><button class="secondary" on:click={() => openBooking(dish.id, 'vriezer', undefined, batch.id)}>Nu boeken</button></article>{/if}
            {:else}<div class="empty">Geen beschikbare vriesporties gevonden. Pas je filters aan.</div>{/each}
          </div>
        {/if}
      </section>
    {:else if screen === 'vriezer'}
      <section class="page" aria-labelledby="freezer-title">
        <div class="title-row"><div><p class="eyebrow">Vriezer</p><h1 id="freezer-title">Voorraad</h1></div><span class="count">{freezerBatches.reduce((sum, batch) => sum + batch.available, 0)} porties</span></div>
        <button class="primary top-action" on:click={() => navigate('restjes')}>＋ Restjes invriezen</button>
        <div class="chips" aria-label="Filter vriezer op gerechtstype"><button class:chosen={!freezerCourse} on:click={() => freezerCourse = ''}>Alles</button>{#each courses as course}<button class:chosen={freezerCourse === course} on:click={() => freezerCourse = course}>{course}</button>{/each}</div>
        <label class="people-filter">Aantal personen per portie<select bind:value={freezerPeople}><option value="">Alle aantallen</option>{#each peopleOptions as people}<option value={String(people)}>{people} {people === 1 ? 'persoon' : 'personen'}</option>{/each}</select></label>
        {#if oldestBatch}{@const dish = getDish(oldestBatch.dishId)}{#if dish}<p class="notice">Eerst opmaken: <strong>{dish.name}</strong> van {formatDate(oldestBatch.frozenAt)}.</p>{/if}{/if}
        <div class="list">
          {#each filteredFreezerBatches as batch}
            {@const dish = getDish(batch.dishId)}
            {#if dish}
              <article class="item freezer-item"><span class="dish-icon vriezer">❄</span><span><strong>{dish.name}</strong><small>Ingevroren {formatDate(batch.frozenAt)} · {peopleLabel(batch.peoplePerPortion)}</small></span><span class="portion">{freePortions(batch)} vrij{reservationsFor(batch.id) ? ` · ${reservationsFor(batch.id)} gereserveerd` : ''}</span><div class="row-actions"><button class="secondary" on:click={() => openBooking(dish.id, 'vriezer', undefined, batch.id)}>Boeken</button><button class="icon-button" title="Aan planner toevoegen" on:click={() => addToPlanner(dish, 'vriezer', batch)}>＋<span class="sr-only">Aan planner toevoegen</span></button></div></article>
            {/if}
          {:else}<div class="empty">Geen vriesporties gevonden. Pas je filters aan of vries restjes in.</div>{/each}
        </div>
      </section>
    {:else if screen === 'planner'}
      <section class="page" aria-labelledby="planner-title">
        <div class="title-row"><div><p class="eyebrow">Maaltijdselectie</p><h1 id="planner-title">Planner</h1></div><span class="count">{planner.length} van 7 gepland</span></div>
        <p class="hint">Kies maaltijden voor later. De volgorde is de volgorde waarin ze zijn toegevoegd.</p>
        <ol class="planner-list">
          {#each Array(7) as _, index}
            {@const entry = activePlanner[index]}
            <li class:empty-plan={!entry}>
              <span class="number">{index + 1}</span>
              {#if entry}{@const dish = getDish(entry.dishId)}{#if dish}
                <div class="plan-content"><strong>{dish.name}</strong><small>{sourceLabel(entry.source)}{entry.source === 'vriezer' ? ` · portie gereserveerd · ${peopleLabel(peopleForBatch(entry.batchId) ?? 1)}` : ''}</small></div>
                <button class="secondary" on:click={() => openBooking(dish.id, entry.source, entry.id, entry.batchId)}>Boeken</button><button class="plain-icon" aria-label={`${dish.name} uit planner verwijderen`} on:click={() => removePlanner(entry)}>×</button>
              {/if}{:else}<div class="plan-content"><strong>Nog kiezen</strong><small>Vrije plek in de planner</small></div>{/if}
            </li>
          {/each}
        </ol>
        <button class="primary floating" disabled={planner.length >= 7} on:click={() => plannerSourceChoiceOpen = true}>＋ Maaltijd toevoegen</button>
      </section>
    {:else if screen === 'nieuw' || screen === 'bewerken'}
      <section class="page form-page" aria-labelledby="new-title">
        <p class="eyebrow">Gerechten</p><h1 id="new-title">{editingDishId ? 'Gerecht wijzigen' : 'Nieuw gerecht'}</h1>
        <form on:submit|preventDefault={saveDish}>
          <div class="photo-placeholder">
            {#if newDishPhoto}<img src={newDishPhoto} alt="Voorbeeld van de gekozen gerechtfoto" />{:else}<span aria-hidden="true">🍲</span>{/if}
            <div><label class="photo-button" for="dish-photo">{newDishPhoto ? 'Foto vervangen' : 'Foto toevoegen'}</label><input class="sr-only" id="dish-photo" type="file" accept="image/*" disabled={savingDish} on:change={chooseDishPhoto} /><span>Via de fotobibliotheek of camera van dit apparaat.</span>{#if newDishPhoto}<button class="remove-photo" type="button" disabled={savingDish} on:click={removeDishPhoto}>Foto verwijderen</button>{/if}</div>
          </div>
          <label>Naam <span>*</span><input bind:value={newDishName} required maxlength="20" placeholder="Bijv. pompoensoep" /><small class="field-hint">{newDishName.length}/20 karakters</small></label>
          <fieldset><legend>Gang <span>*</span></legend><div class="radio-row">{#each courses as course}<label><input type="radio" bind:group={newDishCourse} value={course} /> {course}</label>{/each}</div></fieldset>
          <fieldset><legend>Kenmerken</legend><div class="chips selectable">{#each commonTags as tag}<button type="button" class:chosen={newDishTags.includes(tag)} on:click={() => toggleNewTag(tag)}>{tag}</button>{/each}</div></fieldset>
          <label>Toelichting <textarea bind:value={newDishDescription} rows="3" placeholder="Optioneel, bijvoorbeeld een korte beschrijving."></textarea></label>
          <label>Calorieën per 100 gram <input bind:value={newDishCalories} inputmode="decimal" type="number" min="0" step="any" placeholder="Optioneel" /></label>
          <button class="primary submit" type="submit" disabled={savingDish}>{savingDish ? 'Foto opslaan…' : editingDishId ? 'Wijzigingen opslaan' : 'Gerecht opslaan'}</button>
          {#if editingDishId}<button class="secondary submit" type="button" on:click={() => navigate('vers')}>Annuleren</button>{/if}
        </form>
      </section>
    {:else if screen === 'restjes'}
      <section class="page form-page" aria-labelledby="leftovers-title">
        <p class="eyebrow">Vriezer</p><h1 id="leftovers-title">Restjes invriezen</h1>
        <form on:submit|preventDefault={saveLeftovers}>
          <div class="filter-grid"><label>Gang<select bind:value={leftoversCourseFilter}><option value="">Alle gangen</option>{#each courses as course}<option value={course}>{course}</option>{/each}</select></label><label>Kenmerk<select bind:value={leftoversTagFilter}><option value="">Alle kenmerken</option>{#each commonTags as tag}<option value={tag}>{tag}</option>{/each}</select></label></div>
          <label>Gerecht <span>*</span><select bind:value={leftoversDishId}>{#each filteredLeftoversDishes as dish}<option value={dish.id}>{dish.name}</option>{/each}</select></label>
          {#if filteredLeftoversDishes.length === 0}<p class="notice compact">Geen gerechten gevonden met deze filters. Pas een filter aan.</p>{/if}
          <fieldset><legend>Aantal porties <span>*</span></legend><div class="stepper"><button type="button" aria-label="Eén portie minder" on:click={() => leftoversPortions = Math.max(1, leftoversPortions - 1)}>−</button><input aria-label="Aantal porties" bind:value={leftoversPortions} type="number" min="1" /><button type="button" aria-label="Eén portie meer" on:click={() => leftoversPortions += 1}>＋</button></div></fieldset>
          <fieldset><legend>Aantal personen per portie <span>*</span></legend><div class="stepper"><button type="button" aria-label="Eén persoon minder per portie" on:click={() => leftoversPeoplePerPortion = Math.max(1, leftoversPeoplePerPortion - 1)}>−</button><input aria-label="Aantal personen per portie" bind:value={leftoversPeoplePerPortion} type="number" min="1" /><button type="button" aria-label="Eén persoon meer per portie" on:click={() => leftoversPeoplePerPortion += 1}>＋</button></div></fieldset>
          <label>Ingevroren op <input bind:value={leftoversDate} type="date" /></label>
          <button class="primary submit" type="submit">{leftoversPortions} portie(s) voor {leftoversPeoplePerPortion} {leftoversPeoplePerPortion === 1 ? 'persoon' : 'personen'} invriezen</button>
        </form>
      </section>
    {:else if screen === 'vrienden'}
      <section class="page friends" aria-labelledby="friends-title">
        <div class="title-row"><div><p class="eyebrow">Samen aan tafel</p><h1 id="friends-title">Etentjes met vrienden</h1></div></div>
        <div class="friend-actions"><button class="primary" on:click={() => openDinner()}>＋ Etentje toevoegen</button><button class="secondary" on:click={() => openGroup()}>＋ Gezelschap</button></div>
        <div class="filter-grid friend-filters">
          <label>Gezelschap<select bind:value={friendsGroupFilter}><option value="">Alle gezelschappen</option>{#each friendGroups as group}<option value={group.id}>{group.name}</option>{/each}</select></label>
          <label>Zoek in etentjes<input type="search" bind:value={friendsQuery} placeholder="Bijv. lasagne" /></label>
        </div>
        {#if selectedFriendGroup}<div class="friend-preferences"><div class="friend-actions"><strong>{selectedFriendGroup.name}</strong><button class="text-button" on:click={() => openGroup(selectedFriendGroup)}>Gezelschap wijzigen</button></div><p><strong>Lusten niet</strong><br />{selectedFriendGroup.dislikes || 'Geen voorkeuren ingevuld.'}</p></div>{/if}
        {#if groupFormOpen}
          <form class="friend-form" on:submit|preventDefault={saveFriendGroup}>
            <h2>{editingGroupId ? 'Gezelschap wijzigen' : 'Nieuw gezelschap'}</h2>
            <label>Naam gezelschap <span>*</span><input bind:value={groupName} required maxlength="80" placeholder="Bijv. Noor en Sjoerd" /></label>
            <label>Lusten niet<textarea bind:value={groupDislikes} maxlength="2000" rows="3" placeholder="Bijv. champignons en blauwe kaas"></textarea></label>
            <p class="hint">Deze voorkeuren gelden voor het hele gezelschap.</p>
            <div class="friend-actions"><button class="primary" type="submit">Gezelschap opslaan</button><button class="secondary" type="button" on:click={() => groupFormOpen = false}>Annuleren</button></div>
          </form>
        {/if}
        {#if dinnerFormOpen}
          <form class="friend-form" on:submit|preventDefault={saveFriendDinner}>
            <h2>{editingDinnerId ? 'Etentje wijzigen' : 'Nieuw etentje'}</h2>
            <div class="filter-grid"><label>Gezelschap voor etentje <span>*</span><select bind:value={dinnerGroupId} required><option value="">Kies een gezelschap</option>{#each friendGroups as group}<option value={group.id}>{group.name}</option>{/each}</select></label><label>Wanneer <span>*</span><input bind:value={dinnerDate} type="date" required /></label></div>
            {#if !friendGroups.length}<p class="notice">Voeg eerst een gezelschap toe via de knop bovenaan.</p>{/if}
            {#if dinnerGroup}<p class="friend-preferences"><strong>Lusten niet</strong><br />{dinnerGroup.dislikes || 'Geen voorkeuren ingevuld.'}</p>{/if}
            <label>Gerechten zoeken<input type="search" bind:value={dinnerQuery} placeholder="Zoek een gerecht" /></label>
            <div class="filter-grid"><label>Gerechtstype<select bind:value={dinnerCourse}><option value="">Alle typen</option>{#each courses as course}<option value={course}>{course}</option>{/each}</select></label><label>Kenmerk<select bind:value={dinnerTag}><option value="">Alle kenmerken</option>{#each commonTags as tag}<option value={tag}>{tag}</option>{/each}</select></label></div>
            <fieldset><legend>Geserveerde gerechten <span>*</span></legend><div class="dish-picker">{#each dinnerDishChoices as dish}<button type="button" class:chosen={dinnerDishIds.includes(dish.id)} aria-pressed={dinnerDishIds.includes(dish.id)} on:click={() => toggleDinnerDish(dish.id)}>{dinnerDishIds.includes(dish.id) ? '✓' : '＋'} {dish.name}{dish.archived ? ' (archief)' : ''}</button>{:else}<p class="hint">Geen gerechten gevonden met deze filters.</p>{/each}</div></fieldset>
            <p class="hint">Gekozen: {dinnerDishIds.map((id) => getDish(id)?.name).filter(Boolean).join(', ') || 'Nog geen gerechten'}</p>
            <label>Toelichting<textarea bind:value={dinnerNote} maxlength="2000" rows="2" placeholder="Optioneel, bijvoorbeeld een bijgerecht"></textarea></label>
            <div class="friend-actions"><button class="primary" type="submit">Etentje opslaan</button><button class="secondary" type="button" on:click={() => dinnerFormOpen = false}>Annuleren</button></div>
          </form>
        {/if}
        <div class="section-heading"><h2>Eerder gegeten</h2><label>Volgorde<select bind:value={friendsOrder}><option value="newest">Nieuwste eerst</option><option value="oldest">Oudste eerst</option></select></label></div>
        <div class="list">{#each filteredDinners as dinner}<article class="item dinner"><span class="dish-icon friends-icon" aria-hidden="true">👥</span><span><strong>{friendGroups.find((group) => group.id === dinner.groupId)?.name ?? dinner.people}</strong><small>{formatDate(dinner.date)} · {dinner.dishIds.map((id) => getDish(id)?.name).filter(Boolean).join(', ')}</small>{#if dinner.note}<em>{dinner.note}</em>{/if}</span><button class="secondary" aria-label={`Etentje van ${formatDate(dinner.date)} wijzigen`} on:click={() => openDinner(dinner)}>Wijzigen</button></article>{:else}<div class="empty">{friendDinners.length ? 'Geen etentjes gevonden. Pas je filters aan.' : 'Nog geen etentjes. Voeg een gezelschap en jullie eerste etentje toe.'}</div>{/each}</div>
      </section>
    {/if}
  </main>

  <nav class="bottom-nav" aria-label="Hoofdnavigatie">
    <button class:active={screen === 'vandaag'} on:click={() => navigate('vandaag')}>⌂<span>Vandaag</span></button><button class:active={screen === 'vers' || screen === 'bewerken'} on:click={() => navigate('vers')}>⌕<span>Gerechten</span></button><button class:active={screen === 'vriezer'} on:click={() => navigate('vriezer')}>❄<span>Vriezer</span></button><button class:active={screen === 'planner'} on:click={() => navigate('planner')}>☷<span>Planner</span></button><button class:active={screen === 'vrienden'} on:click={() => navigate('vrienden')}><span class="friends-nav-icon" aria-hidden="true">👥</span><span>Vrienden</span></button>
  </nav>
</div>

{#if enlargedPhoto}
  <dialog class="photo-dialog" bind:this={photoDialog} on:close={() => enlargedPhoto = null} aria-label={`Foto van ${enlargedPhoto.name}`}>
    <img src={enlargedPhoto.url} alt={enlargedPhoto.name} />
    <button class="primary" on:click={() => photoDialog.close()}>Foto sluiten</button>
  </dialog>
{/if}

{#if plannerSourceChoiceOpen}
  <div class="modal-backdrop" role="presentation"><div class="modal choice-modal" role="dialog" aria-modal="true" aria-labelledby="planner-choice-title"><button class="close" aria-label="Sluiten" on:click={() => plannerSourceChoiceOpen = false}>×</button><p class="eyebrow">Planner</p><h2 id="planner-choice-title">Wat wil je toevoegen?</h2><p class="hint">Kies eerst de bron van de maaltijd.</p><div class="choice-actions"><button class="primary" on:click={() => { plannerSourceChoiceOpen = false; mealSource = 'vers'; navigate('vers'); }}>Vers koken</button><button class="secondary" on:click={() => { plannerSourceChoiceOpen = false; navigate('vriezer'); }}>Uit de vriezer</button></div></div></div>
{/if}

{#if booking}
  {@const selectedDish = getDish(booking.dishId)}
  {#if selectedDish}
    <div class="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="book-title"><button class="close" aria-label="Sluiten" on:click={() => booking = null}>×</button><p class="eyebrow">Maaltijd boeken</p><h2 id="book-title">{selectedDish.name}</h2>{#if booking.source === 'vers'}<div class="booking-options"><label class:active={bookingEaten}><input type="checkbox" bind:checked={bookingEaten} />Gegeten</label><label class:active={bookingFrozen}><input type="checkbox" bind:checked={bookingFrozen} />Ingevroren</label></div><p class="hint">Je kunt beide keuzes combineren.</p>{:else}<p class="notice compact">Gegeten uit de vriezer. De oudste beschikbare portie wordt afgeboekt{#if peopleForBatch(booking.batchId)}. Deze portie is voor {peopleLabel(peopleForBatch(booking.batchId) ?? 1)}{/if}.</p>{/if}<label>Eetdatum <input bind:value={bookingDate} type="date" /></label>{#if booking.source === 'vers' && bookingFrozen}<label>Aantal porties <input bind:value={freezePortions} type="number" min="1" /></label><label>Aantal personen per portie <input bind:value={freezePeoplePerPortion} type="number" min="1" /></label>{/if}<button class="primary submit" on:click={commitBooking}>Boeking opslaan</button></div></div>
  {/if}
{/if}

{#if toast}<div class="toast" role="status">{toast}</div>{/if}

{#if saveConfirmation}
  <div class="modal-backdrop" role="presentation"><div class="modal save-modal" role="dialog" aria-modal="true" aria-labelledby="save-title"><p class="eyebrow">HelpMenu</p><h2 id="save-title">Opslag gereed</h2><p>{saveConfirmation} Deze wijziging is gedeeld met je andere apparaten.</p><div class="choice-actions">{#if screen === 'vrienden'}<button class="primary" on:click={() => saveConfirmation = null}>Terug naar Vrienden</button>{:else}<button class="primary" on:click={() => { saveConfirmation = null; navigate('vandaag'); }}>Naar Vandaag</button><button class="secondary" on:click={() => { saveConfirmation = null; navigate('vers'); }}>Gerechten bekijken</button>{/if}</div></div></div>
{/if}

{#if passwordDialog}
  <div class="modal-backdrop"><form class="modal" on:submit|preventDefault={savePassword}><button class="close" type="button" aria-label="Sluiten" on:click={() => passwordDialog = false}>×</button><p class="eyebrow">Gedeeld account</p><h2>Wachtwoord wijzigen</h2><label>Huidig wachtwoord<input type="password" bind:value={currentPassword} autocomplete="current-password" required /></label><label>Nieuw wachtwoord<input type="password" bind:value={newPassword} autocomplete="new-password" minlength="12" required /></label>{#if passwordError}<p class="login-error">{passwordError}</p>{/if}<button class="primary submit" type="submit">Wachtwoord opslaan</button></form></div>
{/if}

{#if onlineStatus === 'checking' || onlineStatus === 'anonymous'}
  <div class="login-backdrop"><form class="login-card" on:submit|preventDefault={login}><span class="login-mark">✦</span><h1>HelpMenu</h1><p>{onlineStatus === 'checking' ? 'Beveiligde verbinding controleren…' : 'Meld je aan met het gedeelde wachtwoord.'}</p>{#if onlineStatus === 'anonymous'}<label>Wachtwoord<input type="password" bind:value={loginPassword} autocomplete="current-password" required /></label>{#if loginError}<p class="login-error">{loginError}</p>{/if}<button class="primary" type="submit">Aanmelden</button>{/if}</form></div>
{/if}

<style>
  :global(body) { background: #f4f7fc; }
  .app-shell { min-height: 100vh; background: #f4f7fc; }
  .sidebar { display: none; }
  main { max-width: 760px; margin: 0 auto; padding: 0 16px 96px; }
  .topbar { min-height: 66px; padding: 10px 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
  .brand, .mobile-brand { border: 0; background: transparent; color: #1253a4; font-size: 19px; font-weight: 760; letter-spacing: -.04em; padding: 8px 0; }
  .brand span, .mobile-brand span { display: inline-grid; place-items: center; width: 24px; height: 24px; background: #1253a4; color: #fff; border-radius: 8px; font-size: 14px; letter-spacing: 0; }
  .account-button { border: 0; background: transparent; color: #1253a4; font-size: 12px; font-weight: 700; }
  .sync-status { display: flex; align-items: center; gap: 6px; margin-left: auto; border-radius: 999px; background: #e7f1ff; color: #1253a4; padding: 5px 8px; font-size: 11px; font-weight: 700; white-space: normal; flex-wrap: wrap; max-width: 100%; }
  .sync-status.warning { background: #fff1d4; color: #8a5811; }
  .sync-status button { border: 0; border-bottom: 1px solid currentColor; background: transparent; color: inherit; padding: 0; font-size: inherit; font-weight: 800; }
  .page { animation: enter .2s ease-out; }
  @keyframes enter { from { opacity: .45; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .eyebrow { margin: 0; color: #66736c; font-size: 12px; font-weight: 730; letter-spacing: .06em; text-transform: uppercase; }
  h1 { margin: 3px 0 20px; font-size: clamp(30px, 7vw, 42px); letter-spacing: -.055em; line-height: 1.05; }
  h2 { margin: 0; font-size: 16px; letter-spacing: -.02em; }
  .primary { border: 0; border-radius: 13px; background: #1253a4; color: #fff; font-weight: 730; min-height: 48px; padding: 12px 16px; }
  .primary:disabled { cursor: not-allowed; opacity: .5; }
  .action { width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 16px; }
  .home { padding-top: 14px; }
  .home .quick-actions { margin-top: 24px; }
  .photo-open { border: 0; padding: 0; cursor: zoom-in; width: 100%; }
  .photo-dialog { width: min(92vw, 800px); max-height: 90dvh; border: 0; border-radius: 16px; padding: 16px; background: #fff; }
  .photo-dialog::backdrop { background: #10233ccc; }
  .photo-dialog img { display: block; width: 100%; max-height: 70dvh; object-fit: contain; border-radius: 10px; }
  .photo-dialog button { display: block; width: 100%; margin-top: 14px; }
  .people-filter { margin: 12px 0 18px; }
  .people-filter select { width: 100%; }
  .action span { font-size: 24px; line-height: 18px; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; margin: 28px 0 10px; }
  .text-button { border: 0; background: transparent; color: #1253a4; font-size: 13px; font-weight: 700; padding: 6px 0; }
  .list { display: grid; gap: 8px; }
  .item { width: 100%; border: 1px solid #dce3dc; border-radius: 13px; background: #fff; min-height: 66px; display: flex; align-items: center; text-align: left; gap: 10px; padding: 9px; color: inherit; }
  button.item:hover, .dish-card:hover { border-color: #9db9df; }
  .item strong { display: block; font-size: 14px; }
  .item small { display: block; margin-top: 2px; color: #66736c; font-size: 12px; }
  .item b { margin-left: auto; color: #66736c; font-size: 22px; font-weight: 400; }
  .dish-icon { flex: 0 0 auto; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: #f4e5e9; font-size: 19px; }
  .dish-icon.vriezer { background: #e7f1ff; color: #1253a4; }
  .accent-item { background: #fffdf7; }
  .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 13px; }
  .quick-actions button { min-height: 52px; border: 1px dashed #b8c8dc; border-radius: 12px; background: #fff; color: #344c6b; font-size: 13px; text-align: left; padding: 10px; }
  .quick-actions button:last-child { grid-column: 1 / -1; }
  .bottom-nav { position: fixed; z-index: 4; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid #dce3dc; background: rgba(255,255,255,.96); backdrop-filter: blur(12px); padding: 6px env(safe-area-inset-right) calc(6px + env(safe-area-inset-bottom)) env(safe-area-inset-left); }
  .bottom-nav button { border: 0; background: transparent; color: #66736c; display: grid; gap: 2px; place-items: center; min-height: 48px; font-size: 20px; }
  .bottom-nav button span { font-size: 10px; }
  .bottom-nav button.active { color: #1253a4; font-weight: 750; }
  .search { display: flex; align-items: center; gap: 8px; width: 100%; border: 1px solid #cfd9d1; border-radius: 12px; background: #fff; padding: 0 12px; }
  .search input { width: 100%; height: 47px; border: 0; background: transparent; outline: 0; }
  .chips { display: flex; gap: 7px; overflow-x: auto; padding: 12px 0 3px; scrollbar-width: none; }
  .chips button, .dish-picker button { white-space: nowrap; border: 1px solid #dce3dc; border-radius: 999px; background: #fff; color: #526259; padding: 7px 10px; font-size: 12px; }
  .chips button.chosen, .dish-picker button.chosen { border-color: #1253a4; background: #1253a4; color: #fff; font-weight: 700; }
  .dish-grid { display: grid; gap: 11px; margin-top: 16px; }
  .dish-card { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 10px; border: 1px solid #dce3dc; border-radius: 15px; background: #fff; padding: 10px; transition: border-color .15s; }
  .dish-art { display: grid; place-items: center; min-height: 58px; overflow: hidden; border-radius: 11px; background: linear-gradient(135deg, #dcecff, #eff5ff 55%, #dcecf8); font-size: 30px; }
  .dish-art img { width: 100%; height: 100%; min-height: 58px; object-fit: cover; }
  .dish-card-content { min-width: 0; padding-top: 3px; }
  .dish-card h2 { font-size: 15px; }
  .dish-card p { margin: 4px 0 0; color: #66736c; font-size: 12px; }
  .dish-card small { display: block; margin-top: 5px; color: #174b85; font-size: 11px; font-weight: 700; }
  .card-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
  .secondary { min-height: 36px; border: 1px solid #b8c8dc; border-radius: 9px; background: #fff; color: #1253a4; padding: 6px 10px; font-size: 12px; font-weight: 730; }
  .delete-button { min-height: 36px; margin-left: auto; border: 0; border-radius: 9px; background: transparent; color: #a23e45; padding: 6px 8px; font-size: 12px; font-weight: 700; }
  .icon-button { display: grid; flex: 0 0 36px; place-items: center; width: 36px; height: 36px; border: 1px solid #b8c8dc; border-radius: 9px; background: #fff; color: #1253a4; font-size: 20px; }
  .top-action { width: 100%; margin: -4px 0 14px; }
  .floating { width: 100%; margin-top: 20px; }
  .title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .count, .portion { flex: 0 0 auto; border-radius: 999px; background: #e7f1ff; color: #174b85; padding: 5px 8px; font-size: 12px; font-weight: 720; }
  .notice { margin: 0 0 12px; border-radius: 11px; background: #f8e7bd; color: #654917; padding: 11px; font-size: 13px; }
  .notice.compact { margin-top: 12px; }
  .freezer-item { flex-wrap: wrap; }
  .freezer-item > span:nth-child(2) { min-width: 120px; flex: 1; }
  .row-actions { width: 100%; display: flex; gap: 8px; padding-left: 48px; }
  .hint { margin: -10px 0 16px; color: #66736c; font-size: 13px; }
  .planner-list { display: grid; list-style: none; padding: 0; margin: 0; gap: 8px; }
  .planner-list li { min-height: 66px; display: flex; align-items: center; gap: 9px; border: 1px solid #dce3dc; border-radius: 13px; background: #fff; padding: 9px; }
  .planner-list li.empty-plan { background: transparent; border-style: dashed; }
  .number { display: grid; flex: 0 0 30px; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #e7f1ff; color: #1253a4; font-size: 12px; font-weight: 800; }
  .plan-content { flex: 1; min-width: 0; }
  .plan-content strong, .plan-content small { display: block; }
  .plan-content small { margin-top: 2px; color: #66736c; font-size: 12px; }
  .plain-icon { border: 0; background: transparent; color: #66736c; min-width: 36px; min-height: 36px; font-size: 24px; }
  .form-page { max-width: 560px; }
  .filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  form { display: grid; gap: 17px; }
  form label, fieldset { display: grid; gap: 7px; color: #2d3e35; font-size: 13px; font-weight: 700; }
  form label > span, fieldset span { color: #a23e45; }
  .field-hint { color: #66736c; font-size: 11px; font-weight: 400; text-align: right; }
  input, select, textarea { width: 100%; min-height: 45px; border: 1px solid #cfd9d1; border-radius: 10px; background: #fff; color: #18251e; padding: 9px 10px; font-weight: 400; }
  textarea { resize: vertical; }
  fieldset { border: 0; padding: 0; margin: 0; }
  legend { padding: 0; }
  .radio-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .radio-row label { display: flex; align-items: center; font-weight: 400; }
  .radio-row input { width: auto; min-height: auto; }
  .photo-placeholder { display: grid; grid-template-columns: 72px 1fr; place-items: center start; gap: 12px; min-height: 76px; border: 1px dashed #b8c8dc; border-radius: 13px; padding: 10px; font-size: 34px; }
  .photo-placeholder img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; }
  .photo-placeholder > div { display: grid; gap: 4px; }
  .photo-button { color: #1253a4; font-size: 13px; font-weight: 750; cursor: pointer; }
  .photo-placeholder > div > span { color: #66736c; font-size: 11px; font-weight: 400; }
  .remove-photo { justify-self: start; border: 0; background: transparent; color: #8b3945; font-size: 12px; padding: 2px 0; }
  .submit { width: 100%; }
  .stepper { display: grid; grid-template-columns: 48px 1fr 48px; gap: 8px; }
  .stepper button { border: 1px solid #b8c8dc; border-radius: 10px; background: #fff; color: #1253a4; font-size: 22px; }
  .stepper input { text-align: center; font-weight: 750; }
  .dish-picker { display: flex; flex-wrap: wrap; gap: 7px; }
  .friend-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .friend-filters { margin-top: 18px; }
  .friend-preferences { background: #e7f1ff; color: #183a65; border-radius: 12px; padding: 14px; margin: 16px 0; overflow-wrap: anywhere; }
  .friend-preferences p { margin-bottom: 0; }
  .friend-form { border: 1px solid #d7e2f0; background: #fff; border-radius: 14px; padding: 16px; margin: 18px 0; }
  .dinner { flex-wrap: wrap; }
  .dinner > span:nth-child(2) { flex: 1; min-width: 120px; overflow-wrap: anywhere; }
  .bottom-nav button .friends-nav-icon { font-size: 22px; }
  .friends .dish-picker button { white-space: normal; text-align: left; min-height: 44px; }
  .friends .section-heading { gap: 14px; flex-wrap: wrap; }
  .dinner em { display: block; margin-top: 4px; color: #66736c; font-size: 11px; font-style: normal; }
  .friends-icon { background: #e7f1ff; color: #1253a4; }
  .empty { border: 1px dashed #b8c8dc; border-radius: 12px; color: #66736c; padding: 18px; font-size: 13px; text-align: center; }
  .modal-backdrop { position: fixed; z-index: 10; inset: 0; display: grid; place-items: end center; background: rgba(24,37,30,.45); padding: 16px; }
  .modal { position: relative; width: min(100%, 480px); display: grid; gap: 15px; border-radius: 20px; background: #f4f7fc; padding: 22px; box-shadow: 0 20px 55px rgba(0,0,0,.24); }
  .modal h2 { font-size: 24px; }
  .save-modal p:not(.eyebrow) { margin: -5px 0 0; color: #526259; font-size: 14px; line-height: 1.5; }
  .close { position: absolute; top: 10px; right: 10px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #fff; color: #526259; font-size: 25px; }
  .booking-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
  .booking-options label { display: flex; align-items: center; justify-content: center; min-height: 53px; border: 1px solid #dce3dc; border-radius: 10px; background: #fff; color: #526259; padding: 7px; text-align: center; font-size: 12px; font-weight: 650; }
  .booking-options label.active { border-color: #1253a4; background: #e7f1ff; color: #1253a4; }
  .booking-options input { position: absolute; opacity: 0; pointer-events: none; }
  .choice-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .toast { position: fixed; z-index: 30; bottom: 82px; left: 50%; width: min(calc(100% - 32px), 460px); transform: translateX(-50%); border-radius: 11px; background: #18251e; color: #fff; padding: 12px 15px; box-shadow: 0 8px 30px rgba(0,0,0,.25); font-size: 13px; }
  .login-backdrop { position: fixed; z-index: 40; inset: 0; display: grid; place-items: center; background: #f4f7fc; padding: 18px; }
  .login-card { width: min(100%, 380px); display: grid; gap: 16px; border: 1px solid #dce3dc; border-radius: 20px; background: #fff; padding: 26px; box-shadow: 0 16px 44px rgba(18,83,164,.12); }
  .login-card h1 { margin: 0; color: #1253a4; font-size: 32px; }.login-card p { margin: -8px 0 0; color: #66736c; font-size: 13px; }.login-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: #1253a4; color: #fff; font-size: 20px; }.login-error { color: #a23e45 !important; margin: -8px 0 !important; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  @media (min-width: 820px) { .app-shell { display: grid; grid-template-columns: 250px 1fr; } .sidebar { position: fixed; inset: 0 auto 0 0; width: 250px; display: flex; flex-direction: column; gap: 24px; padding: 24px 16px; border-right: 1px solid #dce3dc; background: #fff; } .sidebar .brand { text-align: left; } .sidebar nav { display: grid; gap: 4px; } .sidebar nav button { display: flex; align-items: center; gap: 12px; min-height: 42px; border: 0; border-radius: 10px; background: transparent; color: #526259; padding: 8px 10px; text-align: left; font-size: 14px; } .sidebar nav button.active { background: #e7f1ff; color: #1253a4; font-weight: 750; } main { grid-column: 2; width: min(100%, 900px); max-width: none; padding: 0 36px 48px; } .mobile-brand { display: none; } .bottom-nav { display: none; } .modal-backdrop { place-items: center; } .quick-actions { max-width: 480px; } .dish-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .home { max-width: 620px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
