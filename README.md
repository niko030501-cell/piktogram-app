# Piktogram app

En piktogram-app til daglig kommunikation på et bosted. Billeder, kategorier
og indstillinger ligger udelukkende på den enkelte telefon/iPad - der er
ingen server, intet login og intet sendes nogen steder hen. Appen virker
fuldt offline, når den først er installeret.

Denne fil er skrevet til dig, der ikke er programmør, og forklarer:

1. [Hvordan du starter appen på din egen computer, mens den udvikles](#1-start-appen-lokalt-til-udvikling)
2. [Hvordan du lægger appen ud, så telefoner kan installere den](#2-læg-appen-ud-udgivelse)
3. [Hvordan du lægger appen på hjemmeskærmen på iPhone/iPad](#3-læg-appen-på-hjemmeskærmen)
4. [Hvordan du tager og gendanner en sikkerhedskopi](#4-sikkerhedskopi)
5. [Kort om hvad der ligger hvor i koden](#5-hvad-ligger-hvor)

---

## 1. Start appen lokalt (til udvikling)

Du skal have [Node.js](https://nodejs.org/) installeret (version 20 eller
nyere). Åbn en terminal i mappen med appen, og kør:

```bash
npm install
npm run dev
```

Terminalen viser en adresse (typisk `http://localhost:5173`) - åbn den i en
browser. Ændringer i koden vises automatisk i browseren, mens `npm run dev`
kører.

For at tjekke at appen kan **bygges** til den udgave, der rent faktisk
lægges ud (inklusiv offline-understøttelse), kan du køre:

```bash
npm run build
npm run preview
```

`npm run dev` viser IKKE offline-understøttelsen korrekt - det gør kun den
"rigtige" bygning fra `npm run build`.

---

## 2. Læg appen ud (udgivelse)

Appen består udelukkende af almindelige filer (HTML, CSS, JavaScript) uden
nogen database eller server bagved. Den skal ligge et sted med **HTTPS**,
for at iPhone/iPad kan installere den "Til hjemmeskærm".

Anbefaling: **[Netlify](https://www.netlify.com/)**, fordi det er gratis,
kræver ikke at du kan noget med git/GitHub, og fordi Netlify serverer
appen fra roden af sit domæne (undgår et par tekniske faldgruber, som
GitHub Pages har).

Sådan gør du:

1. Byg appen: `npm run build`. Det opretter en mappe der hedder `dist`.
2. Gå til [app.netlify.com/drop](https://app.netlify.com/drop).
3. Træk hele `dist`-mappen ind i browservinduet.
4. Netlify giver dig en adresse (fx `https://dit-navn.netlify.app`) - det
   er den adresse, telefonerne skal bruge.

Vil du opdatere appen senere (fx efter at have ændret farver eller tilføjet
noget i koden), gentager du blot trin 1-3 - Netlify erstatter automatisk
den gamle udgave.

**Vigtigt om fortrolighed:** kun selve appens kode lægges ud på Netlify.
Ingen billeder, navne eller andre personlige oplysninger er nogensinde en
del af det, du bygger og lægger ud - de bliver først til, når appen bruges
på den enkelte telefon, og bliver liggende der.

---

## 3. Læg appen på hjemmeskærmen

**På iPhone/iPad (Safari):**

1. Åbn appens adresse i **Safari** (skal være Safari, ikke Chrome eller en
   anden browser - det er kun Safari, der kan installere en app på
   hjemmeskærmen på iPhone/iPad).
2. Tryk på del-ikonet (kvadrat med en pil op).
3. Vælg **"Føj til hjemmeskærm"**.
4. Tryk **"Tilføj"**.

Appen hedder nu "Piktogram app" på hjemmeskærmen, med sit eget ikon, og
åbner uden Safaris adressefelt - som en almindelig app. Fra nu af virker
den fuldt offline.

**Bemærk:** iPhone/iPad kan i sjældne tilfælde rydde data for apps, der
ikke har været åbnet i meget lang tid. Det er derfor vigtigt at tage
[sikkerhedskopier](#4-sikkerhedskopi) jævnligt - se nedenfor.

---

## 4. Sikkerhedskopi

Under **Indstillinger → Sikkerhedskopi** i appen kan du:

- **Gem sikkerhedskopi**: gemmer alle kategorier, piktogrammer, billeder,
  faste valg og registreringer i én fil (`piktogram-app-sikkerhedskopi-
  ÅÅÅÅ-MM-DD.json`). Gem den et sikkert sted - fx Filer-appen, e-mail til
  dig selv, eller iCloud.
- **Gendan fra sikkerhedskopi**: vælg en tidligere gemt fil. Alt nuværende
  indhold i appen bliver erstattet - du bliver bedt om at bekræfte det
  først.

Dette er også fremgangsmåden til at flytte alt indhold over på en anden
enhed, fx når billederne senere skal over på hendes egen iPad: tag en
sikkerhedskopi på den ene enhed, og gendan den på den anden.

Tag gerne en sikkerhedskopi med jævne mellemrum (fx hver måned, eller
efter en større omgang nye billeder) - det er den eneste måde arbejdet er
sikret imod at gå tabt.

---

## 5. Hvad ligger hvor

Kort oversigt til dig, der vil kigge i koden eller rette noget selv:

- `src/db/` - alt om lagring i telefonens database (IndexedDB). `schema.ts`
  beskriver hvilke oplysninger der findes, `database.ts` er det eneste
  sted der taler direkte med databasen.
- `src/state/` - holder data og indstillinger i hukommelsen, så resten af
  appen kan bruge dem uden at spørge databasen hele tiden.
- `src/features/` - selve skærmene og funktionerne, én mappe per emne:
  `home` (forsiden), `category` (kategori-skærmen), `viewer`
  (fuldskærmsvisningen), `valgtavle` (valgtavle, faste valg og
  registreringer), `snippen`, `import` (tilføj billeder i bunker), `leyla`
  (Leyla-tilstand), `backup`, `settings`, `edit` (rediger/slet-dialoger).
- `src/speech/` - talesyntese (dansk stemme).
- `src/pwa/` - service worker-opdatering (offline-understøttelse).
- `scripts/generate-icons.mjs` - genererer app-ikonerne. Kør
  `node scripts/generate-icons.mjs` igen, hvis du vil ændre ikonets farve
  eller udseende.

Hver fil starter med en kort kommentar om, hvad den er ansvarlig for.

### Om Leyla-tilstand

"Leyla-tilstand" er en låst tilstand, hvor der kun kan bruges
piktogrammer - intet kan redigeres, slettes eller tilføjes. Den slås til
under Indstillinger, og slås fra igen ved at holde teksten "Piktogram app"
nederst i hjørnet inde i 3 sekunder og indtaste den 4-cifrede kode, du
valgte, da du slog den til. Det er tænkt som en simpel spærre, der
forhindrer utilsigtede ændringer - ikke som en sikkerhedsløsning, og koden
gemmes derfor kun lokalt på enheden.

### Om valgtavlen og faste valg

Under "Valgtavle" på forsiden kan personalet enten hente et **fast valg**
frem (fx "Gå eller cykle") med ét tryk, eller selv bygge et valg af 2-4
piktogrammer fra bunden. Når valget vises, kan personalet notere svaret
med ét tryk - hvad hun valgte, at hun ikke svarede, eller at hun svarede
på en anden måde end ved at pege. De seneste registreringer kan ses og
kopieres som tekst under "Seneste registreringer", til at sætte ind i
journalen.
