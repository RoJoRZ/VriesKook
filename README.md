# HelpMenu

HelpMenu is een gedeelde, installerenbare webapp voor het kiezen, plannen en registreren van maaltijden en het bijhouden van de vriezer.

De app draait op [helpmenu.roriapps.workers.dev](https://helpmenu.roriapps.workers.dev/). Open hem op telefoon, tablet of computer en meld je aan met het gedeelde wachtwoord. Via **Wachtwoord** rechtsboven kan het wachtwoord worden gewijzigd. De browser kan de inloggegevens opslaan, zodat je niet steeds opnieuw hoeft in te loggen.

## Wat zit erin

- Gerechten toevoegen, zoeken, filteren en veilig verwijderen, met de laatste eetdatum per gerecht.
- Maaltijden vers of uit de vriezer boeken; bij invriezen worden porties en personen per portie opgeslagen.
- Een vrije planner, vriesvoorraad en restjes invoeren.
- Overzicht van etentjes met vrienden.
- Een blauwe, mobiele PWA-interface met een gedeelde online opslag, zichtbare opslagstatus en automatische verversing tussen apparaten.

De online app begint zonder voorbeeldmaaltijden. Alle ingelogde apparaten delen dezelfde gegevens.

## Lokaal ontwikkelen

Installeer een recente Node.js-versie en pnpm, en voer uit:

```bash
pnpm install
pnpm dev
```

Voor een controle vóór publicatie:

```bash
pnpm check
pnpm build
```

Publiceren gebeurt met `pnpm exec wrangler deploy`. Geheimen, waaronder het initiële wachtwoordhash, horen uitsluitend als Cloudflare-secret thuis — nooit in Git.

## Documentatie

- [Functioneel document](docs/functioneel-document.md)
- [Design document](docs/design-document.md)
- [Technisch ontwerp en bekende eerste-releasegrenzen](docs/technisch-ontwerp.md)
