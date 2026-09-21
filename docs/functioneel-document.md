# VriesKook — Functioneel document

**Versie:** 0.1 — eerste concept  
**Datum:** 21 september 2026  
**Status:** gebaseerd op de functionele inventarisatie in dit gesprek. Schermvoorbeelden worden later toegevoegd.

## 1. Doel

VriesKook helpt twee partners bij het kiezen, plannen en bijhouden van hun maaltijden. De app verzamelt bekende gerechten als inspiratie, houdt de vriezervoorraad bij en laat zien wat er daadwerkelijk gegeten is en wanneer. Daarnaast biedt de app een eenvoudig overzicht van etentjes met vrienden.

Dit document beschrijft wat de app moet kunnen. Technische keuzes en de technische inrichting worden in een apart document uitgewerkt. Het eerdere gesprek over het app-idee is niet teruggevonden; deze versie bevat de wensen die in het huidige gesprek zijn besproken.

## 2. Gebruikers en gezamenlijk gebruik

- De app wordt gebruikt door de gebruiker en diens partner.
- Beiden gebruiken één gedeelde login en dezelfde gegevens.
- Beiden kunnen gegevens bekijken, toevoegen en aanpassen en zien elkaars wijzigingen.
- De gedeelde gegevens omvatten gerechten, maaltijdplanning, vriezervoorraad, eetgeschiedenis en etentjes met vrienden.

## 3. Gerechtenverzameling en kookinspiratie

Gebruikers kunnen namen opslaan van gerechten die zij graag koken en goed kennen. Deze verzameling vormt de basis om doorheen te bladeren als zij geen inspiratie hebben.

### Gegevens per gerecht

| Gegeven | Gewenste functie |
|---|---|
| Naam | Het gerecht herkennen en terugvinden. |
| Gerechtstype | Voor-, hoofd- of nagerecht onderscheiden. |
| Kenmerken | Bijvoorbeeld rijst, pasta, aardappels, groente en vlees. Eén gerecht kan meerdere kenmerken hebben. |
| Calorieën per 100 gram | Mogelijk optioneel veld; nog geen definitieve eis. |

Gebruikers kunnen door de gerechten bladeren en filteren op de vastgelegde kenmerken en het gerechtstype. Een concreet voorbeeld: bij het kiezen van het kenmerk ‘rijst’ verschijnen alle gerechten met dat kenmerk.

Volledige recepten, ingrediëntenlijsten en bereidingsinstructies zijn nog niet als vereiste besproken.

## 4. Flexibel maaltijden plannen

De app ondersteunt twee gelijkwaardige manieren om maaltijden te kiezen:

1. **Ad hoc:** een maaltijd toevoegen voor bijvoorbeeld vanavond, ook terwijl iemand al in de supermarkt staat.
2. **Voor een periode:** meerdere maaltijden selecteren voor bijvoorbeeld een week.

Een weekselectie is niet gekoppeld aan vaste weekdagen. Gebruikers kunnen boodschappen doen voor hun selectie en op de dag zelf bepalen welke maaltijd zij willen eten.

De selectie moet onderscheid kunnen maken tussen vers koken en uit de vriezer eten. Gebruikers willen bijvoorbeeld een periode samenstellen met drie keer vers koken en één keer een maaltijd uit de vriezer.

Na het eten kan een maaltijd als gegeten worden gemarkeerd, zodat zichtbaar blijft welke maaltijden uit de selectie nog over zijn. Een maaltijd kiezen of plannen betekent niet dat deze al gegeten is.

## 5. Eetgeschiedenis

De app houdt bij welke maaltijden daadwerkelijk gegeten zijn en op welke datum. Dit geldt zowel voor maaltijden uit een vooraf gemaakte selectie als voor ad hoc toegevoegde maaltijden.

Gebruikers kunnen achteraf terugzien wat zij gegeten hebben en wanneer. De eetdatum wordt pas bij het daadwerkelijk eten vastgelegd, niet bij het plannen.

## 6. Vriezervoorraad

Gebruikers kunnen zien welke bereide gerechten of restjes momenteel in de vriezer liggen.

### Gegevens bij ingevroren voorraad

- Het gerecht.
- Het aantal aanwezige porties.
- De datum waarop de porties zijn ingevroren.

### Restjes toevoegen na een maaltijd

Vanuit een gegeten maaltijd kunnen gebruikers aangeven dat er porties over zijn die zij invriezen. Het gerecht wordt daarbij overgenomen; gebruikers leggen het aantal porties en de invriesdatum vast.

**Voorbeeld:** na het eten blijven twee porties over. De gebruiker voegt vanuit die maaltijd twee porties toe aan de vriezervoorraad, met de datum waarop deze de vriezer in gaan.

De voorraad moet actueel kunnen worden gehouden wanneer porties eruit worden gehaald. De precieze handeling en het moment waarop de voorraad wordt verminderd, moeten nog worden uitgewerkt.

## 7. Etentjes met vrienden

Gebruikers willen kunnen terugkijken wat zij bij eerdere bezoeken aan vrienden hebben geserveerd, zodat zij bij een volgend bezoek rekening kunnen houden met eerdere gerechten.

Per etentje wordt vastgelegd:

- **Wie:** namen van de aanwezige vrienden of omschrijving van de groep.
- **Wat:** de geserveerde gerechten.
- **Wanneer:** de datum van het etentje.

Dit is een eenvoudig overzicht van etentjes. Een afzonderlijk overzicht of zoekfunctie per individuele gast is niet nodig voor deze eerste versie.

## 8. Gebruiksgemak en apparaten

De app moet eenvoudig dagelijks te gebruiken zijn op een iPhone, Android-telefoon, iPad, andere tablet en computer.

Dagelijkse handelingen moeten direct bereikbaar zijn en weinig invoer vragen. Gebruikers moeten niet door veel menu’s hoeven om bijvoorbeeld:

- Een gerecht te vinden via een filter.
- Een maaltijd ad hoc toe te voegen.
- Een maaltijd als gegeten te registreren.
- Overgebleven porties in te vriezen.
- De actuele vriezervoorraad te bekijken en bij te werken.

Bekende gegevens, zoals het gerecht bij het invriezen van restjes, moeten zoveel mogelijk worden overgenomen om dubbele invoer te voorkomen. De schermindeling wordt later uitgewerkt aan de hand van de foto’s en voorbeelden van de gebruiker.

## 9. Samenhang van de functies

De hoofdroute is: een gerecht kiezen, eventueel opnemen in een maaltijdselectie, de maaltijd als gegeten registreren en eventuele restjes toevoegen aan de vriezervoorraad.

Een maaltijd uit de vriezer kan eveneens onderdeel zijn van de selectie. Na consumptie hoort deze bij de eetgeschiedenis en moet de resterende voorraad kloppen.

Het overzicht van etentjes legt aanvullend vast voor welke vrienden op een bepaalde datum is gekookt en welke gerechten zijn geserveerd.

## 10. Nog uit te werken

Onderstaande punten zijn nog geen vastgestelde functionele keuzes:

- De schermindeling, op basis van de nog aan te leveren voorbeelden.
- Hoe porties uit de vriezer worden afgeboekt en of dit samenvalt met het registreren van een gegeten maaltijd.
- Of hetzelfde gerecht met verschillende invriesdatums als afzonderlijke voorraadregels wordt getoond. Dit is als voorstel genoemd, maar nog niet expliciet bevestigd.
- Of calorieën per 100 gram worden opgenomen.
- Welke gegevens bij het toevoegen van een gerecht verplicht zijn en hoe kenmerken kunnen worden beheerd.
- Hoe invoerfouten in planning, eetgeschiedenis en voorraad eenvoudig kunnen worden hersteld.

Automatische planningsvoorstellen, een boodschappenlijst, voedingsberekeningen en volledige recepten zijn niet vastgesteld als onderdeel van de eerste versie.
