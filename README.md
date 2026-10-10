# HelpMenu

HelpMenu is een gedeelde, installerenbare webapp voor het kiezen, plannen en registreren van maaltijden en het bijhouden van de vriezer.

De app draait op [helpmenu.roriapps.workers.dev](https://helpmenu.roriapps.workers.dev/). Open hem op telefoon, tablet of computer en meld je aan met het gedeelde wachtwoord. Via **Wachtwoord** rechtsboven kan het wachtwoord worden gewijzigd. De browser kan de inloggegevens opslaan, zodat je niet steeds opnieuw hoeft in te loggen.

## Wat zit erin

- Gerechten toevoegen, zoeken, filteren, wijzigen en veilig verwijderen, met de laatste eetdatum per gerecht. Gerechten staan op volgorde van oudste naar nieuwste laatste eetdatum, gevolgd door nog niet gegeten gerechten; de lijst heeft aparte filters voor gerechtstype en kenmerken, en een gerecht kan ook het type `Onderdeel` hebben. Foto's worden privé opgeslagen in Cloudflare R2 en blijven zichtbaar op beide apparaten.
- Gerechtfoto’s openen vergroot in een kader met een sluitknop.
- Maaltijden kiezen met een filter voor vers of vriezer; vriesporties filteren op aantal personen per portie. De vriezer heeft filters voor gerechtstype (inclusief Onderdeel) en personen per portie.
- Maaltijden vers of uit de vriezer boeken; bij invriezen worden porties en personen per portie opgeslagen.
- Een vrije planner, vriesvoorraad en restjes invoeren.
- Vriendenmenu op mobiel en desktop: gezelschappen met vaste voorkeuren (`Lusten niet`), etentjes toevoegen en wijzigen, zoeken en filteren op gezelschap, en sorteren op datum. Gerechten kiezen met zoek-, type- en kenmerkfilters; dit verandert geen maaltijdboekingen of voorraad.
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
pnpm test
pnpm check
pnpm build
```

Publiceren gebeurt met `pnpm exec wrangler deploy`. Geheimen, waaronder het initiële wachtwoordhash, horen uitsluitend als Cloudflare-secret thuis — nooit in Git.

## Documentatie

- [Functioneel document](docs/functioneel-document.md)
- [Design document](docs/design-document.md)
- [Technisch ontwerp en bekende eerste-releasegrenzen](docs/technisch-ontwerp.md)

## Vrienden

Open **Vrienden** via het icoon met twee poppetjes. Voeg een gezelschap toe met een naam en eventueel wat zij niet lusten. Deze vrije tekst geldt voor de hele groep en verschijnt bij het registreren van een etentje. Kies een datum, één of meer bestaande gerechten en eventueel een toelichting. Bestaande etentjes kunnen worden gewijzigd. Het overzicht toont standaard de nieuwste etentjesdatum eerst, met een gezelschapfilter en zoekveld.

Oude etentjes worden automatisch gekoppeld aan gezelschappen; alleen exact gelijke namen na het verwijderen van omliggende spaties worden samengevoegd. Voorkeuren sluiten gerechten niet automatisch uit.
