# Piktogram app

En piktogram-app til daglig kommunikation på et bosted. Kategorier,
piktogrammer, billeder, faste valg og registreringer synkroniseres
automatisk mellem enheder via en sky-forbindelse (Supabase) og kræver
login for at kunne ses eller ændres. Appen virker desuden fuldt offline,
når den først er installeret og logget ind - ændringer lavet offline
sendes af sig selv, når enheden får forbindelse igen.

Denne fil er skrevet til dig, der ikke er programmør, og forklarer:

1. [Hvordan du starter appen på din egen computer, mens den udvikles](#1-start-appen-lokalt-til-udvikling)
2. [Hvordan appen udgives (GitHub + Netlify)](#2-udgivelse-github--netlify)
3. [Sky-synkronisering (Supabase) og login](#3-sky-synkronisering-supabase-og-login)
4. [Hvordan du lægger appen på hjemmeskærmen på iPhone/iPad](#4-læg-appen-på-hjemmeskærmen)
5. [Hvordan du tager og gendanner en sikkerhedskopi](#5-sikkerhedskopi)
6. [Kort om hvad der ligger hvor i koden](#6-hvad-ligger-hvor)

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

Kør appen lokalt, skal du bruge de samme to hemmeligheder som i afsnit 3,
i en fil der hedder `.env.local` i projektets rodmappe (se `.env.example`).

---

## 2. Udgivelse (GitHub + Netlify)

Koden ligger på GitHub, og Netlify er sat op til automatisk at bygge og
udgive en ny version, hver gang der sendes ("pushes") ny kode til `main`-
grenen på GitHub. Der skal altså ikke gøres noget manuelt for at udgive en
opdatering - det sker af sig selv.

**Vigtigt:** de to hemmeligheder fra Supabase (se afsnit 3) skal være sat
som "Environment variables" i Netlifys indstillinger (Site configuration →
Environment variables) - ellers kan den udgivne app ikke synkronisere,
selvom den lokale udvikler-udgave kan.

---

## 3. Sky-synkronisering (Supabase) og login

Appens data ligger i en delt database i skyen (Supabase), så alle enheder
automatisk viser det samme. Det kræver et login - én fælles e-mail og
adgangskode, som hele personalet bruger. Man logger kun ind én gang pr.
enhed; herefter husker enheden det selv.

**Er man ikke logget ind, vises der intet i appen overhovedet** - hverken
billeder eller navne. Det er noget andet end **Leyla-tilstand**, som kun
låser for redigering, når man allerede er logget ind (se afsnit 6).

Adgangen til data er beskyttet, så kun et gyldigt login kan se eller ændre
noget - den offentlige nøgle, der ligger i appens kode, giver ikke i sig
selv adgang til noget.

**Sådan tages en enhed ud af brug** (mistet telefon, eller den skal skiftes
ud): Indstillinger → "Log ud af denne enhed". Det rydder alt lokalt
indhold på den enhed - dataene ligger stadig trygt i skyen og på de andre
enheder.

**Kendt begrænsning:** Supabases gratis niveau sætter projektet "på pause"
efter ca. en uges total inaktivitet. Det stopper ikke offline-brug af det,
der allerede er hentet ned, men synkronisering står stille, indtil nogen
åbner Supabase-dashboardet og genstarter projektet.

---

## 4. Læg appen på hjemmeskærmen

**På iPhone/iPad (Safari):**

1. Åbn appens adresse i **Safari** (skal være Safari, ikke Chrome eller en
   anden browser - det er kun Safari, der kan installere en app på
   hjemmeskærmen på iPhone/iPad).
2. Tryk på del-ikonet (kvadrat med en pil op).
3. Vælg **"Føj til hjemmeskærm"**.
4. Tryk **"Tilføj"**.
5. Åbn appen fra hjemmeskærmen, og log ind med den fælles adgangskode
   (se afsnit 3) - kun nødvendigt denne ene gang på denne enhed.

Appen hedder nu "Piktogram app" på hjemmeskærmen, med sit eget ikon, og
åbner uden Safaris adressefelt - som en almindelig app. Fra nu af virker
den fuldt offline (efter første login og en indledende synkronisering).

---

## 5. Sikkerhedskopi

Sikkerhedskopi-filen er stadig nyttig, selv med sky-synkronisering - den
virker uafhængigt af, om Supabase-kontoen findes, er nået, eller er sat på
pause. Under **Indstillinger → Sikkerhedskopi** i appen kan du:

- **Gem sikkerhedskopi**: gemmer alle kategorier, piktogrammer, billeder,
  faste valg og registreringer i én fil (`piktogram-app-sikkerhedskopi-
  ÅÅÅÅ-MM-DD.json`). Gem den et sikkert sted - fx Filer-appen, e-mail til
  dig selv, eller iCloud.
- **Gendan fra sikkerhedskopi**: vælg en tidligere gemt fil. Alt nuværende
  indhold i appen bliver erstattet - du bliver bedt om at bekræfte det
  først, og det gendannede indhold synkroniseres derefter til skyen igen.

Tag gerne en sikkerhedskopi med jævne mellemrum (fx hver måned, eller
efter en større omgang nye billeder) - det er en ekstra sikkerhed oven i
sky-synkroniseringen, ikke en erstatning for den.

---

## 6. Hvad ligger hvor

Kort oversigt til dig, der vil kigge i koden eller rette noget selv:

- `src/db/` - alt om lagring i telefonens database (IndexedDB). `schema.ts`
  beskriver hvilke oplysninger der findes, `database.ts` er det eneste
  sted der taler direkte med databasen.
- `src/state/` - holder data og indstillinger i hukommelsen, så resten af
  appen kan bruge dem uden at spørge databasen hele tiden.
- `src/sync/` - sky-synkronisering: `supabaseClient.ts` opretter selve
  forbindelsen, `push.ts`/`pull.ts` sender og henter ændringer,
  `SyncProvider.tsx` styrer hvornår det sker, `dirtySignal.ts` er en lille
  besked-tjeneste der fortæller synkroniseringen, at noget er ændret lokalt.
- `src/features/auth/` - login-skærmen og hvem der er logget ind.
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
gemmes derfor kun lokalt på enheden, uden for sky-synkroniseringen. Login
(afsnit 3) og Leyla-tilstand er to uafhængige spærrer: login afgør om
enheden overhovedet kan bruges, Leyla-tilstand afgør (når man er logget
ind) om der kan redigeres.

### Om valgtavlen og faste valg

Under "Valgtavle" på forsiden kan personalet enten hente et **fast valg**
frem (fx "Gå eller cykle") med ét tryk, eller selv bygge et valg af 2-4
piktogrammer fra bunden. Når valget vises, kan personalet notere svaret
med ét tryk - hvad hun valgte, at hun ikke svarede, eller at hun svarede
på en anden måde end ved at pege. De seneste registreringer kan ses og
kopieres som tekst under "Seneste registreringer", til at sætte ind i
journalen.
