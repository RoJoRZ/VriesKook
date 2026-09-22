# HelpMenu

HelpMenu helpt twee partners kiezen wat zij koken, maaltijden plannen en de vriezervoorraad bijhouden.

## Huidige lokale versie

De eerste werkende SvelteKit-PWA bevat alle zeven ontworpen schermen:

- Vandaag met directe boeking, planner en FIFO-voorraadmelding;
- Vers met zoeken, kenmerken en aan de planner toevoegen;
- Vriezer met vrije en gereserveerde porties;
- Planner als vrije, genummerde lijst zonder datums en met keuze Vers/Vriezer;
- Nieuw gerecht met een naam van maximaal 20 karakters;
- Restjes invriezen met filters voor gang en kenmerken;
- Etentjes met vrienden.

De proefversie start met voorbeeldgegevens en bewaart wijzigingen alleen in de browser. De knop **Voorbeeldgegevens herstellen** zet deze lokale gegevens terug. Dit maakt de volledige gebruikersflow veilig lokaal testbaar voordat de gedeelde D1-opslag en aanmelding worden geactiveerd.

## Lokaal draaien

Gebruik een recente Node.js-versie en pnpm:

```bash
pnpm install
pnpm dev
```

Open daarna de getoonde lokale URL. Controleer de productieachtige Cloudflare-runtime met:

```bash
pnpm build
pnpm exec wrangler dev --local
```

## Controles

```bash
pnpm check
pnpm build
pnpm cf-typegen
```

## Cloudflare-inrichting vóór deployment

De repository bevat `wrangler.jsonc`, de D1-migratie en R2-binding. Vervang vóór een eerste deployment de tijdelijke `database_id` door de ID van een nieuw aangemaakte D1-database met EU-jurisdictie en maak de R2-bucket `helpmenu-photos` eveneens met EU-jurisdictie aan. Voeg vervolgens de gedeelde login en servergestuurde sessies toe; zet nooit wachtwoorden of andere geheimen in `wrangler.jsonc`.
