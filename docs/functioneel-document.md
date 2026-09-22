# VriesKook — Functioneel document

**Versie:** 1.0 — definitieve functionele basis
**Datum:** 22 september 2026
**Status:** vastgesteld op basis van de functionele inventarisatie en de schetsen in `Ontwerp/`.

## 1. Doel

VriesKook helpt twee partners bij het kiezen, plannen en bijhouden van hun maaltijden. De app verzamelt bekende gerechten als inspiratie, houdt de vriezervoorraad bij en laat zien wat er daadwerkelijk gegeten is en wanneer. Daarnaast biedt de app een eenvoudig overzicht van etentjes met vrienden.

Dit document beschrijft wat de app moet kunnen. Technische keuzes en de technische inrichting worden in een apart document uitgewerkt.

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
| Naam | Verplicht veld om het gerecht te herkennen en terug te vinden. |
| Gerechtstype | Verplicht veld: precies één van voorgerecht, hoofdgerecht of nagerecht. |
| Kenmerken | Optioneel. Bijvoorbeeld rijst, pasta, aardappels, groente en vlees. Eén gerecht kan meerdere kenmerken hebben. Kenmerken worden gekozen uit een vaste, beheerbare gedeelde lijst om betrouwbaar te kunnen filteren. |
| Calorieën per 100 gram | Optioneel veld dat later kan worden toegevoegd of gewijzigd. In de eerste versie zijn er geen automatische voedingsberekeningen. |

De schermschetsen onderscheiden hiervoor een ingang **Vers** en een ingang **Vriezer**. Beide tonen een lijst met gerechten en bieden filtering; vanuit een lijst kan een gerecht worden gekozen of de details worden geopend. Gebruikers kunnen door de gerechten bladeren en filteren op de vastgelegde kenmerken en het gerechtstype. Een concreet voorbeeld: bij het kiezen van het kenmerk ‘rijst’ verschijnen alle gerechten met dat kenmerk.

Na het kiezen van een gerecht uit **Vers** of **Vriezer** krijgt de gebruiker twee acties: **nu boeken** of **toevoegen aan planner**. Bij een gerecht uit de vriezer betekent ‘nu boeken’ dat het als ‘gegeten uit de vriezer’ wordt geboekt. Een vriesgerecht kan alleen aan de planner worden toegevoegd als er nog een vrije portie beschikbaar is.

Een gerecht dat niet meer gebruikt wordt, kan worden gearchiveerd. Het verdwijnt dan uit nieuwe keuzes, maar blijft zichtbaar bij bestaande plannerregels, eetgeschiedenis en vriezervoorraad.

Volledige recepten, ingrediëntenlijsten en bereidingsinstructies zijn nog niet als vereiste besproken.

## 4. Flexibel maaltijden plannen

De app ondersteunt twee gelijkwaardige manieren om maaltijden te kiezen:

1. **Ad hoc:** een maaltijd toevoegen voor bijvoorbeeld vanavond, ook terwijl iemand al in de supermarkt staat.
2. **Voor een periode:** meerdere maaltijden selecteren voor bijvoorbeeld een week.

Een weekselectie is niet gekoppeld aan vaste weekdagen. De planner toont een vrije, genummerde lijst met maximaal zeven actieve maaltijden, met een knop om maaltijden toe te voegen. Hetzelfde gerecht mag hierin meerdere keren als afzonderlijke geplande maaltijd staan. De volgorde is niet handmatig aanpasbaar. Gebruikers kunnen boodschappen doen voor hun selectie en op de dag zelf bepalen welke maaltijd zij willen eten. Voeg je een vriesgerecht toe, dan wordt de oudste beschikbare portie gereserveerd. De portie wordt pas afgeboekt bij ‘gegeten uit de vriezer’; bij verwijderen van de plannerregel komt hij weer vrij. Zijn alle porties op of gereserveerd, dan kan het gerecht niet aan de planner worden toegevoegd.

De selectie moet onderscheid kunnen maken tussen vers koken en uit de vriezer eten. Gebruikers willen bijvoorbeeld een periode samenstellen met drie keer vers koken en één keer een maaltijd uit de vriezer.

### Maaltijd boeken

Een maaltijd kan worden geboekt vanuit **Vers**, **Vriezer**, **Planner** en **Restjes**. Deze schermen zijn dus ingangen naar dezelfde registratie, niet afzonderlijke registraties.

Bij het boeken wordt vastgelegd wat er met de maaltijd is gebeurd:

- **Gegeten:** de maaltijd komt in de eetgeschiedenis; het aantal gegeten porties wordt niet geregistreerd.
- **Ingevroren:** het aantal in te vriezen porties wordt vastgelegd en als restjes aan de vriezervoorraad toegevoegd.
- **Gegeten uit de vriezer:** de maaltijd komt in de eetgeschiedenis en de oudste beschikbare opgeslagen portie wordt uit de vriezervoorraad afgeboekt. Het aantal gegeten porties wordt niet vastgelegd.

Wanneer een geplande maaltijd als gegeten wordt geboekt, verdwijnt deze uit de actieve planner en blijft hij zichtbaar in de eetgeschiedenis. De planner toont zo alleen maaltijden die nog gepland zijn. Een maaltijd kiezen of plannen betekent niet dat deze al gegeten is.

Een boeking kan achteraf worden gewijzigd of verwijderd. De app herstelt daarbij automatisch de gekoppelde eetgeschiedenis en voorraadmutatie; verwijderen vraagt eerst om bevestiging.

## 5. Eetgeschiedenis

De app houdt bij welke maaltijden daadwerkelijk gegeten zijn en op welke datum. Dit geldt zowel voor maaltijden uit een vooraf gemaakte selectie als voor ad hoc toegevoegde maaltijden. Bij boeken staat de eetdatum standaard op vandaag, maar de gebruiker kan deze aanpassen.

Gebruikers kunnen achteraf terugzien wat zij gegeten hebben en wanneer. De eetdatum wordt pas bij het daadwerkelijk eten vastgelegd, niet bij het plannen.

## 6. Vriezervoorraad

Gebruikers kunnen zien welke bereide gerechten of restjes momenteel in de vriezer liggen. De schermschets toont dit als een filterbare lijst, met per regel een actie om het item te kiezen of te bekijken.

### Gegevens bij ingevroren voorraad

- Het gerecht.
- Het aantal aanwezige, opgeslagen porties. Een opgeslagen portie is de voorraadeenheid en kan bijvoorbeeld voor één of twee personen zijn.
- De datum waarop de porties zijn ingevroren.

Elke invriesactie maakt een afzonderlijke voorraadregel, ook wanneer hetzelfde gerecht al in de vriezer ligt. De voorraad wordt op invriesdatum gesorteerd, met de oudste regel eerst. Bij ‘gegeten uit de vriezer’ wordt de oudste regel altijd eerst afgeboekt.

### Restjes toevoegen na een maaltijd

Vanuit een geboekte maaltijd kunnen gebruikers aangeven dat er porties over zijn die zij invriezen. Het gerecht wordt daarbij overgenomen; gebruikers leggen het aantal porties en de invriesdatum vast. Restjes mogen ook zonder koppeling met een eerdere boeking worden ingevroren; de gebruiker kiest dan zelf het gerecht. De schets voor **Restjes** wijst op een compact invoerscherm met maaltijd/gerecht, aantal porties en datum.

**Voorbeeld:** na het eten blijven twee porties over. De gebruiker voegt vanuit die maaltijd twee porties toe aan de vriezervoorraad, met de datum waarop deze de vriezer in gaan.

De voorraad moet actueel worden gehouden wanneer porties eruit worden gehaald. Bij ‘gegeten uit de vriezer’ wordt de oudste beschikbare opgeslagen portie afgeboekt.

## 7. Etentjes met vrienden

Gebruikers willen kunnen terugkijken wat zij bij eerdere bezoeken aan vrienden hebben geserveerd, zodat zij bij een volgend bezoek rekening kunnen houden met eerdere gerechten.

Per etentje wordt vastgelegd:

- **Wie:** namen van de aanwezige vrienden of omschrijving van de groep.
- **Wat:** de geserveerde gerechten.
- **Wanneer:** de datum van het etentje.

Dit is een eenvoudig overzicht met een invoerscherm voor wie, wat en wanneer. Bij **wie** worden namen of een groepsomschrijving als vrije tekst vastgelegd; er is in de eerste versie geen apart contact- of groepenbeheer. Voor **wat** worden één of meer bestaande gerechten uit de verzameling gekozen; een optioneel vrij tekstveld biedt ruimte voor bijvoorbeeld een bijgerecht of opmerking. Een afzonderlijk overzicht of zoekfunctie per individuele gast is niet nodig voor deze eerste versie.

## 8. Gerecht toevoegen

De ingang **Nieuw gerecht** opent een invoerscherm met:

- Maximaal één optionele foto van het gerecht.
- Een verplichte naam.
- Een optionele korte toelichting of omschrijving.
- Een verplicht gerechtstype/gang.
- Optionele kenmerken uit de gedeelde kenmerkenlijst.
- Optionele calorieën per 100 gram.

Na het aanmaken kunnen de gegevens van een gerecht worden aangepast, waaronder later toegevoegde calorie-informatie. De foto kan later worden toegevoegd, vervangen of verwijderd. De gedeelde kenmerkenlijst kan door de gebruikers worden beheerd.

## 9. Gebruiksgemak en apparaten

De app moet eenvoudig dagelijks te gebruiken zijn op een iPhone, Android-telefoon, iPad, andere tablet en computer.

Dagelijkse handelingen moeten direct bereikbaar zijn en weinig invoer vragen. Gebruikers moeten niet door veel menu’s hoeven om bijvoorbeeld:

- Een gerecht te vinden via een filter.
- Een maaltijd ad hoc toe te voegen.
- Een maaltijd als gegeten te registreren.
- Overgebleven porties in te vriezen.
- De actuele vriezervoorraad te bekijken en bij te werken.

Bekende gegevens, zoals het gerecht bij het invriezen van restjes, moeten zoveel mogelijk worden overgenomen om dubbele invoer te voorkomen. De eerste schermschetsen bevestigen een hoofdmenu met zes directe routes: **Vers**, **Vriezer**, **Planner**, **Nieuw gerecht**, **Restjes** en **Vrienden**. Verdere vormgeving en navigatiedetails worden later uitgewerkt.

## 10. Samenhang van de functies

De hoofdroute is: een gerecht kiezen, eventueel opnemen in een maaltijdselectie en de maaltijd vanuit één van de vier ingangen boeken. De boeking kan de eetgeschiedenis bijwerken, restjes invriezen of — bij een ingevroren maaltijd — beide voorraad en eetgeschiedenis bijwerken.

Een maaltijd uit de vriezer kan eveneens onderdeel zijn van de selectie. Bij boeken als ‘gegeten uit de vriezer’ hoort deze bij de eetgeschiedenis en moet de resterende voorraad kloppen.

Het overzicht van etentjes legt aanvullend vast voor welke vrienden op een bepaalde datum is gekookt en welke gerechten zijn geserveerd.

## 11. Buiten scope van de eerste versie

Automatische planningsvoorstellen, een boodschappenlijst, voedingsberekeningen en volledige recepten maken geen deel uit van de eerste versie. Ook een afzonderlijk contact- of groepenbeheer voor vrienden is buiten scope.
