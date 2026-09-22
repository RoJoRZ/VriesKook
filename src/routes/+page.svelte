<script lang="ts">
  import { onMount } from 'svelte';
  import type { Course, Dish, FreezerBatch, FriendDinner, PlannerEntry, Screen, Source } from '$lib/domain';
  import { formatDate, today, uid } from '$lib/domain';
  import { seedBatches, seedBookings, seedDishes, seedFriendDinners, seedPlanner } from '$lib/seed';

  const storageKey = 'helpmenu-local-v1';
  const courses: Course[] = ['Voorgerecht', 'Hoofdgerecht', 'Nagerecht'];
  const commonTags = ['rijst', 'pasta', 'aardappels', 'stamppot', 'groente', 'vlees', 'vegetarisch'];

  let screen: Screen = 'vandaag';
  let dishes: Dish[] = structuredClone(seedDishes);
  let batches: FreezerBatch[] = structuredClone(seedBatches);
  let planner: PlannerEntry[] = structuredClone(seedPlanner);
  let bookings = structuredClone(seedBookings);
  let friendDinners: FriendDinner[] = structuredClone(seedFriendDinners);
  let query = '';
  let activeTag = '';
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
  let dinnerDate = today();
  let dinnerPeople = '';
  let dinnerNote = '';
  let dinnerDishIds: string[] = [];
  let hydrating = true;
  let plannerSourceChoiceOpen = false;

  onMount(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        dishes = state.dishes ?? dishes;
        batches = state.batches ?? batches;
        planner = state.planner ?? planner;
        bookings = state.bookings ?? bookings;
        friendDinners = state.friendDinners ?? friendDinners;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    hydrating = false;
  });

  $: if (!hydrating) localStorage.setItem(storageKey, JSON.stringify({ dishes, batches, planner, bookings, friendDinners }));
  $: availableDishes = dishes.filter((dish) => !dish.archived);
  $: filteredDishes = availableDishes.filter((dish) => {
    const matchesQuery = dish.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesTag = !activeTag || dish.tags.includes(activeTag);
    return matchesQuery && matchesTag;
  });
  $: freezerBatches = [...batches].filter((batch) => batch.available > 0).sort((a, b) => a.frozenAt.localeCompare(b.frozenAt));
  $: oldestBatch = freezerBatches[0];
  $: activePlanner = planner.slice(0, 7);
  $: plannerPreview = activePlanner.slice(0, 2);
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

  function showToast(message: string) {
    toast = message;
    window.setTimeout(() => { if (toast === message) toast = ''; }, 3600);
  }

  function navigate(next: Screen) {
    screen = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addToPlanner(dish: Dish, source: Source, batch?: FreezerBatch) {
    if (planner.length >= 7) return showToast('De planner is al vol (maximaal zeven maaltijden).');
    let chosenBatch = batch;
    if (source === 'vriezer' && !chosenBatch) chosenBatch = freezerBatches.find((item) => freePortions(item) > 0);
    if (source === 'vriezer' && (!chosenBatch || freePortions(chosenBatch) < 1)) {
      return showToast('Er is geen vrije portie meer beschikbaar voor dit vriesgerecht.');
    }
    planner = [...planner, { id: uid('plan'), dishId: dish.id, source, batchId: chosenBatch?.id }];
    showToast(`${dish.name} staat in de planner.`);
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
    showToast(bookingFrozen && bookingEaten ? `${dish.name} is geboekt en ${freezePortions} portie(s) zijn ingevroren.` : bookingFrozen ? `${freezePortions} portie(s) ${dish.name} zijn ingevroren.` : `${dish.name} is geboekt.`);
  }

  function removePlanner(entry: PlannerEntry) {
    planner = planner.filter((item) => item.id !== entry.id);
    showToast('Maaltijd uit de planner verwijderd.');
  }

  function saveLeftovers() {
    const dish = getDish(leftoversDishId);
    if (!dish || leftoversPortions < 1) return;
    batches = [...batches, { id: uid('batch'), dishId: dish.id, frozenAt: leftoversDate, available: leftoversPortions, original: leftoversPortions, peoplePerPortion: leftoversPeoplePerPortion }];
    showToast(`${leftoversPortions} portie(s) ${dish.name} voor ${leftoversPeoplePerPortion} ${leftoversPeoplePerPortion === 1 ? 'persoon' : 'personen'} staan in de vriezer.`);
    navigate('vriezer');
  }

  function toggleNewTag(tag: string) {
    newDishTags = newDishTags.includes(tag) ? newDishTags.filter((item) => item !== tag) : [...newDishTags, tag];
  }

  function saveNewDish() {
    const name = newDishName.trim();
    if (!name) return showToast('Vul eerst de naam van het gerecht in.');
    if (name.length > 20) return showToast('De naam van een gerecht mag maximaal 20 karakters hebben.');
    const emoji = newDishCourse === 'Nagerecht' ? '🍰' : newDishCourse === 'Voorgerecht' ? '🥣' : '🍲';
    const dish: Dish = { id: uid('dish'), name, course: newDishCourse, tags: newDishTags, description: newDishDescription.trim() || undefined, calories: newDishCalories ? Number(newDishCalories) : undefined, emoji, photoData: newDishPhoto || undefined };
    dishes = [...dishes, dish];
    newDishName = ''; newDishCourse = 'Hoofdgerecht'; newDishTags = []; newDishDescription = ''; newDishCalories = ''; newDishPhoto = '';
    showToast(`${dish.name} is toegevoegd.`);
    navigate('vers');
  }

  function toggleDinnerDish(dishId: string) {
    dinnerDishIds = dinnerDishIds.includes(dishId) ? dinnerDishIds.filter((id) => id !== dishId) : [...dinnerDishIds, dishId];
  }

  function saveFriendDinner() {
    if (!dinnerPeople.trim() || dinnerDishIds.length === 0) return showToast('Vul in met wie jullie aten en kies minimaal één gerecht.');
    friendDinners = [{ id: uid('dinner'), date: dinnerDate, people: dinnerPeople.trim(), dishIds: dinnerDishIds, note: dinnerNote.trim() || undefined }, ...friendDinners];
    dinnerPeople = ''; dinnerNote = ''; dinnerDishIds = []; dinnerDate = today();
    showToast('Etentje met vrienden opgeslagen.');
  }

  function resetDemo() {
    dishes = structuredClone(seedDishes); batches = structuredClone(seedBatches); planner = structuredClone(seedPlanner); bookings = structuredClone(seedBookings); friendDinners = structuredClone(seedFriendDinners);
    localStorage.removeItem(storageKey);
    showToast('De lokale voorbeeldgegevens zijn hersteld.');
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
      newDishPhoto = canvas.toDataURL('image/webp', 0.82);
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
      <button class:active={screen === 'vers'} on:click={() => navigate('vers')}>⌕ <span>Vers</span></button>
      <button class:active={screen === 'vriezer'} on:click={() => navigate('vriezer')}>❄ <span>Vriezer</span></button>
      <button class:active={screen === 'planner'} on:click={() => navigate('planner')}>☷ <span>Planner</span></button>
      <button class:active={screen === 'nieuw'} on:click={() => navigate('nieuw')}>＋ <span>Nieuw gerecht</span></button>
      <button class:active={screen === 'restjes'} on:click={() => navigate('restjes')}>▣ <span>Restjes</span></button>
      <button class:active={screen === 'vrienden'} on:click={() => navigate('vrienden')}>♧ <span>Vrienden</span></button>
    </nav>
    <button class="reset" on:click={resetDemo}>Voorbeeldgegevens herstellen</button>
  </aside>

  <main>
    <header class="topbar">
      <button class="mobile-brand" on:click={() => navigate('vandaag')} aria-label="Naar Vandaag"><span>✦</span> HelpMenu</button>
      <span class="local-label">Lokale proefversie</span>
      <span class="avatar" aria-label="Gedeeld account">VK</span>
    </header>

    {#if screen === 'vandaag'}
      <section class="page home" aria-labelledby="today-title">
        <p class="eyebrow">{formatDate(today())}</p>
        <h1 id="today-title">Wat eten we vandaag?</h1>
        <button class="primary action" on:click={() => navigate('vers')}>Maaltijd boeken <span>＋</span></button>

        <div class="section-heading"><h2>In de planner</h2><button class="text-button" on:click={() => navigate('planner')}>Bekijk alles</button></div>
        {#if plannerPreview.length}
          <div class="list">
            {#each plannerPreview as entry}
              {@const dish = getDish(entry.dishId)}
              {#if dish}
                <button class="item" on:click={() => openBooking(dish.id, entry.source, entry.id, entry.batchId)}>
                  <span class="dish-icon {entry.source}">{entry.source === 'vriezer' ? '❄' : dish.emoji}</span>
                  <span><strong>{dish.name}</strong><small>{sourceLabel(entry.source)}{entry.source === 'vriezer' ? ` · 1 portie gereserveerd · ${peopleLabel(peopleForBatch(entry.batchId) ?? 1)}` : ''}</small></span><b>›</b>
                </button>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="empty">Nog niets gepland. Kies een gerecht voor later.</div>
        {/if}

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
        </div>
      </section>
    {:else if screen === 'vers'}
      <section class="page" aria-labelledby="fresh-title">
        <p class="eyebrow">Gerechten</p><h1 id="fresh-title">Vers</h1>
        <label class="search"><span class="sr-only">Zoek een gerecht</span><span>⌕</span><input bind:value={query} placeholder="Zoek een gerecht" /></label>
        <div class="chips" aria-label="Filter op kenmerk">
          <button class:chosen={!activeTag} on:click={() => activeTag = ''}>Alles</button>
          {#each commonTags as tag}<button class:chosen={activeTag === tag} on:click={() => activeTag = tag}>{tag}</button>{/each}
        </div>
        <div class="dish-grid">
          {#each filteredDishes as dish}
            <article class="dish-card">
              <div class="dish-art" aria-hidden="true">{#if dish.photoData}<img src={dish.photoData} alt="" />{:else}{dish.emoji}{/if}</div>
              <div class="dish-card-content"><h2>{dish.name}</h2><p>{dish.course} · {dish.tags.join(' · ') || 'zonder kenmerken'}</p></div>
              <div class="card-actions"><button class="secondary" on:click={() => openBooking(dish.id, 'vers')}>Nu boeken</button><button class="icon-button" title="Aan planner toevoegen" on:click={() => addToPlanner(dish, 'vers')}>＋<span class="sr-only">Aan planner toevoegen</span></button></div>
            </article>
          {:else}<div class="empty">Geen gerechten gevonden. Pas je filter aan of voeg een nieuw gerecht toe.</div>{/each}
        </div>
        <button class="primary floating" on:click={() => navigate('nieuw')}>＋ Nieuw gerecht</button>
      </section>
    {:else if screen === 'vriezer'}
      <section class="page" aria-labelledby="freezer-title">
        <div class="title-row"><div><p class="eyebrow">Vriezer</p><h1 id="freezer-title">Voorraad</h1></div><span class="count">{freezerBatches.reduce((sum, batch) => sum + batch.available, 0)} porties</span></div>
        {#if oldestBatch}{@const dish = getDish(oldestBatch.dishId)}{#if dish}<p class="notice">Eerst opmaken: <strong>{dish.name}</strong> van {formatDate(oldestBatch.frozenAt)}.</p>{/if}{/if}
        <div class="list">
          {#each freezerBatches as batch}
            {@const dish = getDish(batch.dishId)}
            {#if dish}
              <article class="item freezer-item"><span class="dish-icon vriezer">❄</span><span><strong>{dish.name}</strong><small>Ingevroren {formatDate(batch.frozenAt)} · {peopleLabel(batch.peoplePerPortion)}</small></span><span class="portion">{freePortions(batch)} vrij{reservationsFor(batch.id) ? ` · ${reservationsFor(batch.id)} gereserveerd` : ''}</span><div class="row-actions"><button class="secondary" on:click={() => openBooking(dish.id, 'vriezer', undefined, batch.id)}>Boeken</button><button class="icon-button" title="Aan planner toevoegen" on:click={() => addToPlanner(dish, 'vriezer', batch)}>＋<span class="sr-only">Aan planner toevoegen</span></button></div></article>
            {/if}
          {:else}<div class="empty">Nog geen porties in de vriezer.</div>{/each}
        </div>
        <button class="primary floating" on:click={() => navigate('restjes')}>＋ Restjes invriezen</button>
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
    {:else if screen === 'nieuw'}
      <section class="page form-page" aria-labelledby="new-title">
        <p class="eyebrow">Gerechten</p><h1 id="new-title">Nieuw gerecht</h1>
        <form on:submit|preventDefault={saveNewDish}>
          <div class="photo-placeholder">
            {#if newDishPhoto}<img src={newDishPhoto} alt="Voorbeeld van de gekozen gerechtfoto" />{:else}<span aria-hidden="true">🍲</span>{/if}
            <div><label class="photo-button" for="dish-photo">{newDishPhoto ? 'Foto vervangen' : 'Foto toevoegen'}</label><input class="sr-only" id="dish-photo" type="file" accept="image/*" on:change={chooseDishPhoto} /><span>Via de fotobibliotheek of camera van dit apparaat.</span>{#if newDishPhoto}<button class="remove-photo" type="button" on:click={() => newDishPhoto = ''}>Foto verwijderen</button>{/if}</div>
          </div>
          <label>Naam <span>*</span><input bind:value={newDishName} required maxlength="20" placeholder="Bijv. pompoensoep" /><small class="field-hint">{newDishName.length}/20 karakters</small></label>
          <fieldset><legend>Gang <span>*</span></legend><div class="radio-row">{#each courses as course}<label><input type="radio" bind:group={newDishCourse} value={course} /> {course}</label>{/each}</div></fieldset>
          <fieldset><legend>Kenmerken</legend><div class="chips selectable">{#each commonTags as tag}<button type="button" class:chosen={newDishTags.includes(tag)} on:click={() => toggleNewTag(tag)}>{tag}</button>{/each}</div></fieldset>
          <label>Toelichting <textarea bind:value={newDishDescription} rows="3" placeholder="Optioneel, bijvoorbeeld een korte beschrijving."></textarea></label>
          <label>Calorieën per 100 gram <input bind:value={newDishCalories} inputmode="numeric" type="number" min="0" placeholder="Optioneel" /></label>
          <button class="primary submit" type="submit">Gerecht opslaan</button>
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
        <p class="eyebrow">Overzicht</p><h1 id="friends-title">Etentjes met vrienden</h1>
        <form class="friend-form" on:submit|preventDefault={saveFriendDinner}>
          <h2>Nieuw etentje</h2><label>Wanneer <span>*</span><input bind:value={dinnerDate} type="date" /></label><label>Wie <span>*</span><input bind:value={dinnerPeople} placeholder="Bijv. Anja, Bart en de kinderen" /></label>
          <fieldset><legend>Wat <span>*</span></legend><div class="dish-picker">{#each availableDishes as dish}<button type="button" class:chosen={dinnerDishIds.includes(dish.id)} on:click={() => toggleDinnerDish(dish.id)}>{dish.emoji} {dish.name}</button>{/each}</div></fieldset>
          <label>Toelichting <textarea bind:value={dinnerNote} rows="2" placeholder="Optioneel"></textarea></label><button class="primary submit" type="submit">Etentje opslaan</button>
        </form>
        <div class="section-heading"><h2>Eerder gekookt</h2></div>
        <div class="list">{#each friendDinners as dinner}<article class="item dinner"><span class="dish-icon friends-icon">♧</span><span><strong>{dinner.people}</strong><small>{formatDate(dinner.date)} · {dinner.dishIds.map((id) => getDish(id)?.name).filter(Boolean).join(', ')}</small>{#if dinner.note}<em>{dinner.note}</em>{/if}</span></article>{/each}</div>
      </section>
    {/if}
  </main>

  <nav class="bottom-nav" aria-label="Hoofdnavigatie">
    <button class:active={screen === 'vandaag'} on:click={() => navigate('vandaag')}>⌂<span>Vandaag</span></button><button class:active={screen === 'vers'} on:click={() => navigate('vers')}>⌕<span>Vers</span></button><button class:active={screen === 'vriezer'} on:click={() => navigate('vriezer')}>❄<span>Vriezer</span></button><button class:active={screen === 'planner'} on:click={() => navigate('planner')}>☷<span>Planner</span></button>
  </nav>
</div>

{#if plannerSourceChoiceOpen}
  <div class="modal-backdrop" role="presentation"><div class="modal choice-modal" role="dialog" aria-modal="true" aria-labelledby="planner-choice-title"><button class="close" aria-label="Sluiten" on:click={() => plannerSourceChoiceOpen = false}>×</button><p class="eyebrow">Planner</p><h2 id="planner-choice-title">Wat wil je toevoegen?</h2><p class="hint">Kies eerst de bron van de maaltijd.</p><div class="choice-actions"><button class="primary" on:click={() => { plannerSourceChoiceOpen = false; navigate('vers'); }}>Vers koken</button><button class="secondary" on:click={() => { plannerSourceChoiceOpen = false; navigate('vriezer'); }}>Uit de vriezer</button></div></div></div>
{/if}

{#if booking}
  {@const selectedDish = getDish(booking.dishId)}
  {#if selectedDish}
    <div class="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="book-title"><button class="close" aria-label="Sluiten" on:click={() => booking = null}>×</button><p class="eyebrow">Maaltijd boeken</p><h2 id="book-title">{selectedDish.name}</h2>{#if booking.source === 'vers'}<div class="booking-options"><label class:active={bookingEaten}><input type="checkbox" bind:checked={bookingEaten} />Gegeten</label><label class:active={bookingFrozen}><input type="checkbox" bind:checked={bookingFrozen} />Ingevroren</label></div><p class="hint">Je kunt beide keuzes combineren.</p>{:else}<p class="notice compact">Gegeten uit de vriezer. De oudste beschikbare portie wordt afgeboekt{#if peopleForBatch(booking.batchId)}. Deze portie is voor {peopleLabel(peopleForBatch(booking.batchId) ?? 1)}{/if}.</p>{/if}<label>Eetdatum <input bind:value={bookingDate} type="date" /></label>{#if booking.source === 'vers' && bookingFrozen}<label>Aantal porties <input bind:value={freezePortions} type="number" min="1" /></label><label>Aantal personen per portie <input bind:value={freezePeoplePerPortion} type="number" min="1" /></label>{/if}<button class="primary submit" on:click={commitBooking}>Boeking opslaan</button></div></div>
  {/if}
{/if}

{#if toast}<div class="toast" role="status">{toast}</div>{/if}

<style>
  :global(body) { background: #f4f7fc; }
  .app-shell { min-height: 100vh; background: #f4f7fc; }
  .sidebar { display: none; }
  main { max-width: 760px; margin: 0 auto; padding: 0 16px 96px; }
  .topbar { height: 66px; display: flex; align-items: center; justify-content: space-between; }
  .brand, .mobile-brand { border: 0; background: transparent; color: #1253a4; font-size: 19px; font-weight: 760; letter-spacing: -.04em; padding: 8px 0; }
  .brand span, .mobile-brand span { display: inline-grid; place-items: center; width: 24px; height: 24px; background: #1253a4; color: #fff; border-radius: 8px; font-size: 14px; letter-spacing: 0; }
  .avatar { display: grid; place-items: center; width: 34px; height: 34px; background: #f4e3bd; border-radius: 50%; color: #493a1e; font-size: 12px; font-weight: 750; }
  .local-label { margin-left: auto; margin-right: 11px; border-radius: 999px; padding: 4px 8px; background: #e7f1ff; color: #1253a4; font-size: 11px; font-weight: 700; }
  .page { animation: enter .2s ease-out; }
  @keyframes enter { from { opacity: .45; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .eyebrow { margin: 0; color: #66736c; font-size: 12px; font-weight: 730; letter-spacing: .06em; text-transform: uppercase; }
  h1 { margin: 3px 0 20px; font-size: clamp(30px, 7vw, 42px); letter-spacing: -.055em; line-height: 1.05; }
  h2 { margin: 0; font-size: 16px; letter-spacing: -.02em; }
  .primary { border: 0; border-radius: 13px; background: #1253a4; color: #fff; font-weight: 730; min-height: 48px; padding: 12px 16px; }
  .primary:disabled { cursor: not-allowed; opacity: .5; }
  .action { width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 16px; }
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
  .bottom-nav { position: fixed; z-index: 4; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #dce3dc; background: rgba(255,255,255,.96); backdrop-filter: blur(12px); padding: 6px env(safe-area-inset-right) calc(6px + env(safe-area-inset-bottom)) env(safe-area-inset-left); }
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
  .card-actions { grid-column: 1 / -1; display: flex; gap: 8px; }
  .secondary { min-height: 36px; border: 1px solid #b8c8dc; border-radius: 9px; background: #fff; color: #1253a4; padding: 6px 10px; font-size: 12px; font-weight: 730; }
  .icon-button { display: grid; flex: 0 0 36px; place-items: center; width: 36px; height: 36px; border: 1px solid #b8c8dc; border-radius: 9px; background: #fff; color: #1253a4; font-size: 20px; }
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
  .friend-form { margin-bottom: 29px; border: 1px solid #dce3dc; border-radius: 15px; background: #fff; padding: 14px; }
  .dish-picker { display: flex; flex-wrap: wrap; gap: 7px; }
  .dinner em { display: block; margin-top: 4px; color: #66736c; font-size: 11px; font-style: normal; }
  .friends-icon { background: #e7f1ff; color: #1253a4; }
  .empty { border: 1px dashed #b8c8dc; border-radius: 12px; color: #66736c; padding: 18px; font-size: 13px; text-align: center; }
  .modal-backdrop { position: fixed; z-index: 10; inset: 0; display: grid; place-items: end center; background: rgba(24,37,30,.45); padding: 16px; }
  .modal { position: relative; width: min(100%, 480px); display: grid; gap: 15px; border-radius: 20px; background: #f4f7fc; padding: 22px; box-shadow: 0 20px 55px rgba(0,0,0,.24); }
  .modal h2 { font-size: 24px; }
  .close { position: absolute; top: 10px; right: 10px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #fff; color: #526259; font-size: 25px; }
  .booking-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
  .booking-options label { display: flex; align-items: center; justify-content: center; min-height: 53px; border: 1px solid #dce3dc; border-radius: 10px; background: #fff; color: #526259; padding: 7px; text-align: center; font-size: 12px; font-weight: 650; }
  .booking-options label.active { border-color: #1253a4; background: #e7f1ff; color: #1253a4; }
  .booking-options input { position: absolute; opacity: 0; pointer-events: none; }
  .choice-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .toast { position: fixed; z-index: 30; bottom: 82px; left: 50%; width: min(calc(100% - 32px), 460px); transform: translateX(-50%); border-radius: 11px; background: #18251e; color: #fff; padding: 12px 15px; box-shadow: 0 8px 30px rgba(0,0,0,.25); font-size: 13px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  @media (min-width: 820px) { .app-shell { display: grid; grid-template-columns: 250px 1fr; } .sidebar { position: fixed; inset: 0 auto 0 0; width: 250px; display: flex; flex-direction: column; gap: 24px; padding: 24px 16px; border-right: 1px solid #dce3dc; background: #fff; } .sidebar .brand { text-align: left; } .sidebar nav { display: grid; gap: 4px; } .sidebar nav button { display: flex; align-items: center; gap: 12px; min-height: 42px; border: 0; border-radius: 10px; background: transparent; color: #526259; padding: 8px 10px; text-align: left; font-size: 14px; } .sidebar nav button.active { background: #e7f1ff; color: #1253a4; font-weight: 750; } .reset { margin-top: auto; border: 0; background: transparent; color: #66736c; font-size: 12px; text-align: left; } main { grid-column: 2; width: min(100%, 900px); max-width: none; padding: 0 36px 48px; } .mobile-brand { display: none; } .bottom-nav { display: none; } .modal-backdrop { place-items: center; } .quick-actions { max-width: 480px; } .dish-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .home { max-width: 620px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
