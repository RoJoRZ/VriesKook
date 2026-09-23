# HelpMenu — Technisch ontwerp

**Versie:** 1.1 — foto-opslag via R2
**Datum:** 23 september 2026
**Status:** online op Cloudflare Workers; dit document onderscheidt de huidige implementatie van de beoogde vervolgstappen.

## 1. Besluitvoorstel

Voor HelpMenu is het gratis Cloudflare-platform een goede technische keuze. De app heeft twee gebruikers, weinig gegevens, één foto per gerecht en eenvoudige boekingen. Dat blijft ruim binnen de gratis limieten, zonder eigen server, database-abonnement of maandelijkse hostingkosten.

De huidige oplossing is een **installerenbare webapp (PWA)** met een kleine API op Cloudflare Workers, een D1-database voor gedeelde gegevens en R2 voor gerechtfoto's. D1 en de R2-bucket hebben EU-jurisdictie.

De online productieversie is beschikbaar op `https://helpmenu.roriapps.workers.dev`.

De betaalde VPS-oplossing blijft een goed alternatief wanneer volledige controle over de server belangrijker wordt dan nul euro aan vaste kosten. Zie hoofdstuk 11.

## 2. Architectuur

```text
iPhone / Android / iPad / computer
              │  HTTPS
              ▼
      Statische PWA + API (Cloudflare Worker)
              │
      ┌───────┴────────┐
      ▼                ▼
D1-database (EU)   R2-foto-opslag (EU)
      │                │
      └───────┬────────┘
              ▼
  Handmatige export naar eigen Mac/NAS
```

### Waarom dit past

- De PWA werkt op telefoon, tablet en computer en kan als app-icoon worden geïnstalleerd. Publicatie in de App Store of Play Store is niet nodig.
- Cloudflare beheert de infrastructuur. Er zijn geen Linux-updates, Docker-containers, firewall of eigen webserver te onderhouden.
- D1 is een relationele SQLite-compatibele database, geschikt voor de gerechten, planner, voorraadregels en boekingen.
- R2 is bedoeld voor bestandsopslag en is geschikt voor de optionele gerechtfoto's.
- De voorraadmutaties kunnen atomair worden verwerkt: een boeking slaagt volledig, of helemaal niet.

## 3. Gratis limieten en geschiktheid

| Dienst | Gratis limiet | Verwacht gebruik HelpMenu | Beoordeling |
|---|---:|---:|---|
| Workers | 100.000 API-verzoeken per dag | Hooguit enkele honderden per dag | Ruim voldoende. |
| D1 | 5 GB opslag, 5 miljoen gelezen en 100.000 geschreven rijen per dag | Enkele MB's en enkele honderden mutaties per maand | Ruim voldoende. |
| R2 | 10 GB foto-opslag, 1 miljoen schrijf- en 10 miljoen leesacties per maand | Maximaal één kleine foto per gerecht | Ruim voldoende. |

De gratis Workers-laag heeft een CPU-limiet van 10 ms per verzoek. De API blijft daarom bewust klein: validatie, één of enkele D1-query's en een JSON-antwoord. Zware beeldbewerking gebeurt in de browser vóór de foto wordt geüpload.

De actuele limieten kunnen veranderen. Voor ingebruikname wordt in het Cloudflare-dashboard een gebruikslimiet/waarschuwing ingesteld en wordt niet naar een betaald plan overgestapt zonder expliciete keuze.

Bronnen: [Workers-prijzen en limieten](https://developers.cloudflare.com/workers/platform/pricing/), [D1-prijzen](https://developers.cloudflare.com/d1/platform/pricing/) en [R2-prijzen](https://developers.cloudflare.com/r2/pricing/).

## 4. Technische componenten

| Onderdeel | Keuze | Reden |
|---|---|---|
| Gebruikersinterface | SvelteKit met TypeScript, statisch gebouwde PWA | Snel, lichtgewicht en installabel op alle gewenste apparaten. |
| API | Cloudflare Worker met TypeScript | Geen serverproces of container nodig; eenvoudig te implementeren naast de PWA. |
| Database | Cloudflare D1, met EU-jurisdictie | Relationeel, SQLite-compatibel en gratis ruim voldoende. |
| Foto's | Privé in R2; in D1 staat alleen de foto-URL | De foto kan via de systeemkiezer worden gekozen en vult het gedeelde JSON-record niet op. |
| Database-laag | D1 prepared statements en versiebeheer voor SQL-migraties | De app gebruikt nu één gedeelde JSON-staat; de genormaliseerde tabellen zijn voorbereid voor een volgende versie. |
| Aanmelding | Eén gedeeld account met PBKDF2-SHA-256-hash en beveiligde sessiecookie in D1 | De initiële hash staat als Workers-secret. Na een wachtwoordwijziging staat uitsluitend de nieuwe hash in D1; het wachtwoord zelf komt nooit in Git of D1 terecht. |
| Uitrollen | Wrangler vanaf GitHub Actions of lokale ontwikkelcomputer | Herhaalbare deployment zonder serverbeheer. |
| Back-up | D1 Time Travel plus regelmatige export naar eigen Mac/NAS | Herstelbaar en geen betaalde back-updienst vereist. |

## 5. Gegevensontwerp

### Huidige eerste release

De online app bewaart de gedeelde gegevens als één JSON-document in `app_state` (maximaal 2 MB); foto's zelf staan afzonderlijk in R2 en tellen niet mee. Daarnaast gebruikt zij `sessions` voor sessietokens en `auth_credentials` voor de hash na een wachtwoordwijziging. Elke gedeelde staat heeft een oplopende versie. Een apparaat mag alleen opslaan op basis van de versie die het heeft gelezen; bij een afwijking wordt de opslag geblokkeerd en kiest de gebruiker expliciet of de nieuwste gedeelde gegevens worden geladen. Zo kan een oudere telefoon geen nieuwere gegevens meer stilzwijgend overschrijven.

Terwijl de app openstaat controleert zij iedere 15 seconden en bij terugkeer naar de voorgrond op een nieuwere versie. De kop toont `Opslaan…`, `Gesynchroniseerd` of een duidelijke foutstatus met herstelactie.

De normale tabellen uit de eerste migratie blijven als voorbereide structuur aanwezig. Ze zijn nog niet de actieve gegevensbron; de volgende versie kan hierop overstappen voor fijnmazige validatie en veilige gelijktijdige voorraadreserveringen.

### Beoogde genormaliseerde vervolgversie

De database gebruikt interne unieke identifiers. Eet- en invriesdatums worden als kalenderdatum opgeslagen; de app gebruikt `Europe/Amsterdam` voor invoer en weergave.

| Tabel/groep | Belangrijkste gegevens | Doel |
|---|---|---|
| `dishes` | naam (maximaal 20 karakters), gang, toelichting, calorieën, foto-sleutel, gearchiveerd | Gerechtenverzameling. |
| `tags` en `dish_tags` | kenmerk, koppeling gerecht–kenmerk | Beheerbare kenmerken en betrouwbare filters. |
| `freezer_batches` | gerecht, invriesdatum, beschikbare porties, oorspronkelijke hoeveelheid, personen per portie | Eén regel per invriesactie. |
| `planner_entries` | gerecht, bron vers/vriezer, aanmaakvolgorde, gereserveerde batch | Maximaal zeven actieve geplande maaltijden. |
| `meal_bookings` | gerecht, soort boeking, eetdatum, koppeling plannerregel | Eetgeschiedenis en boekingen. |
| `freezer_movements` | batch, mutatietype, hoeveelheid, koppeling boeking/planner | Toevoegen, reserveren, vrijgeven en afboeken. |
| `friend_dinners` | datum, aanwezigen als vrije tekst, toelichting | Etentjes met vrienden. |
| `friend_dinner_dishes` | etentje, gerecht | Eén of meer gerechten per etentje. |
| `sessions` | sessie-id, vervaldatum, hash | Veilige gedeelde aanmelding. |

### Voorraadregels

- Elke invriesactie maakt één voorraadregel; regels worden gesorteerd op invriesdatum en daarna aanmaakvolgorde.
- Elke voorraadregel bewaart het aantal personen waarvoor één portie bedoeld is. Dit getal verandert niet wanneer een portie wordt gereserveerd of afgeboekt en wordt samen met de portiestatus teruggegeven aan de app.
- Een plannerregel uit de vriezer reserveert precies één portie van de oudste vrije voorraadregel.
- Een boeking ‘gegeten uit de vriezer’ verbruikt die reservering. Zonder plannerregel kiest de API de oudste vrije voorraadregel.
- Wijzigen of verwijderen van een boeking maakt een tegengestelde voorraadmutatie.
- In de genormaliseerde vervolgversie verwerkt de Worker alle gerelateerde statements in één D1-batchtransactie. Als één stap mislukt, draait D1 de hele batch terug. Daardoor kunnen twee apparaten niet dezelfde laatste portie tegelijk gebruiken.
- Een verse boeking met zowel `gegeten` als `ingevroren` maakt in dezelfde transactie een eetgeschiedenisregel én een voorraadbatch met de opgegeven porties en personen per portie. Een boeking uit de vriezer is hiervan gescheiden en boekt alleen de gekoppelde batch af.

## 6. Foto's

De PWA gebruikt een standaard bestandsinvoer met `accept="image/*"`. Op iPhone opent Safari daardoor de systeemkiezer, waar de gebruiker een foto uit de Fotobibliotheek of, wanneer iOS die aanbiedt, de camera kan kiezen. De browser verkleint de foto tot maximaal 1600 pixels aan de langste zijde en maakt bij voorkeur een WebP-bestand. De beveiligde Worker-route `POST /api/photos` valideert type, bestandsinhoud en een bovengrens van 5 MB, geeft het bestand een willekeurige naam en bewaart het privé in R2. Alleen de korte URL wordt in `app_state` opgeslagen. `GET /api/photos/{id}` geeft de foto uitsluitend terug bij een geldige sessie en zonder gedeelde cache.

De eerdere implementatie zette de volledige foto als afbeeldingsdata in het gedeelde JSON-record. Daardoor kon al de eerste foto de limiet van 2 MB raken; de melding dat de opslag bijna vol was, verwees niet naar de daadwerkelijke R2-capaciteit. Bestaande foto’s in dat oude formaat blijven zichtbaar en worden bij het opnieuw opslaan van het gerecht naar R2 verplaatst. Vervangen of verwijderen van een foto verwijdert het oude R2-object nog niet; opruimen van ongebruikte foto-objecten is een beheerverbetering voor later.

## 7. Privacy en beveiliging

- De D1-database wordt bij creatie vastgezet op jurisdictie `eu`; D1 documenteert dat de database daar draait en gegevens daar bewaart.
- De R2-bucket wordt bij creatie vastgezet op jurisdictie `eu`; deze keuze kan achteraf niet worden veranderd.
- Eén gedeeld account; het wachtwoord wordt alleen als een sterke hash opgeslagen.
- Sessiecookies zijn `HttpOnly`, `Secure` en `SameSite=Lax`.
- De gedeelde toegang gebruikt een tijdonafhankelijke wachtwoordvergelijking en bewaart in D1 alleen een SHA-256-hash van een willekeurig sessietoken. Sessies verlopen na 30 dagen en kunnen bij uitloggen worden ingetrokken.
- De app valideert de dagelijkse invoer in de browser; de API controleert aanmelding, JSON-vorm en de maximale grootte. Striktere servervalidatie per veld is een vervolgstap bij de overgang naar de genormaliseerde tabellen.
- De app bevat geen advertenties, analytics of trackers van derden.
- Er is in de eerste release nog geen eigen rate limiting voor inlogpogingen. Het wachtwoord moet daarom lang en uniek blijven.

De database en foto-opslag kunnen dus binnen de EU blijven. Workers kunnen echter wereldwijd worden uitgevoerd en benaderen de database vanaf daar; voor deze persoonlijke app is dat aanvaardbaar. Bij een harde eis dat ook elke verwerking uitsluitend in de EU plaatsvindt, is een EU-VPS de betere keuze.

Bronnen: [D1-gegevenslocatie](https://developers.cloudflare.com/d1/configuration/data-location/) en [R2-gegevenslocatie](https://developers.cloudflare.com/r2/reference/data-location/).

## 8. Back-up en herstel

D1 Time Travel en exports kunnen als hersteloptie worden gebruikt; controleer vóór een herstelactie altijd de actuele Cloudflare-retentie voor het gekozen abonnement.

Een geautomatiseerde back-up is nog niet ingericht. Maak vóór grotere wijzigingen en daarna periodiek een D1-export naar een eigen, versleutelde Mac of NAS. Dit is ook de aanbevolen manier om later naar een andere hostingoplossing te migreren.

Bronnen: [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) en [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

## 9. Uitrollen en onderhoud

1. Maak een Cloudflare-account en een apart project voor HelpMenu.
2. Maak D1 en R2 meteen met jurisdictie `eu`; die instelling is na creatie niet meer te wijzigen.
3. Maak een lokaal ontwikkelproject met de PWA, Worker en SQL-migraties.
4. Koppel de repository aan een gecontroleerde deployment met Wrangler.
5. Gebruik eerst het gratis `workers.dev`-adres; een eigen domeinnaam is optioneel en pas later nodig.
6. Maak de gedeelde login aan met een lang, uniek wachtwoord.
7. Test boekingen, voorraadreserveringen, offline schermcache en een gegevensherstel vóór dagelijks gebruik.
8. Controleer maandelijks de software-afhankelijkheden en maak de maandelijkse export.

Er is geen serverbesturingssysteem, SSH-toegang, firewall of containerbeheer nodig.

## 10. Bewuste scopegrenzen

De eerste technische versie bevat geen native mobiele apps, pushnotificaties, openbare API, social-login, betaalde analytics of aparte zoekdienst. Deze onderdelen zijn niet nodig voor het persoonlijke gebruik en zouden extra kosten of beheer veroorzaken.

Offline schermcache is onderdeel van de PWA, maar wijzigingen in planner en voorraad vereisen een internetverbinding om beide apparaten gelijk te houden.

## 11. Betaalde fallback: kleine EU-VPS

Een kleine EU-VPS met SQLite blijft het alternatief wanneer Cloudflare-afhankelijkheid of wereldwijde Worker-uitvoering niet gewenst is. Dit geeft maximale controle over locatie en uitvoering, maar kost ongeveer €5–8 per maand en vereist serveronderhoud, HTTPS-configuratie en back-upbeheer.

Voor de huidige omvang is Cloudflare Free de aanbevolen eerste keuze. Een migratie is haalbaar: D1 kan als SQL worden geëxporteerd en R2-foto's kunnen worden gedownload en meegenomen naar de VPS.
