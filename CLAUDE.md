# Hunter Roadmap: uputstvo za Claude

Lokalna aplikacija za učenje u Solo Leveling stilu (rangovi E→S, XP, nivoi, niz dana, mapa veština, testovi).
Univerzalna: sadržaj dolazi iz paketa (format `hunter-pack/1`), pa radi za bilo koju oblast.
Vlasnik je Miljan, .NET full stack programer koji kroz ovaj projekat uči i sprema se za intervjue.
Projekat je ujedno portfolio, pa kod mora biti čist i lako objašnjiv na intervjuu.

## Stack i struktura

- `api/src/Hunter.Core`: čista pravila (LevelRules, RankRules, ChapterRules, QuizGrader, StreakRules, DailyQuestRules, PenaltyRules) i format paketa (PackReader, PackValidator). **Bez NuGet zavisnosti.**
- `api/src/Hunter.Api`: ASP.NET Core 10 minimal API. `Endpoints.cs` (rute), `Contracts.cs` (DTO ugovor), `Services/` (PackCatalog, PackImporter, ProgressService), `Data/HunterDb.cs` (EF Core + Npgsql).
- `api/tests/Hunter.Core.Tests`: xUnit testovi za Core.
- `api/tests/Hunter.Api.Tests`: integracioni testovi (`WebApplicationFactory<Program>` + Testcontainers PostgreSQL, primer paket kao seed). Traže pokrenut Docker.
- `web/`: React 19, Vite 8, TypeScript strict, TanStack Query 5, React Router 7, react-markdown. Stil je u `src/styles.css` (CSS promenljive po temi, `[data-theme]`, `[data-glow]`).
- `packs/<id>/pack.json + chapters.json`: uvoze se pri pokretanju API-ja. `examples/`: primer paket van IT-a.
- `content/fullstack-dotnet/src/region-*.md` → `tools/build_pack.sh fullstack-dotnet` → `packs/fullstack-dotnet`.
- `docker-compose.yml`: db (postgres:17, bez izloženog porta), api, web (nginx na :8088, proksi `/api` → api:8080).

## Komande

```bash
docker compose up --build                 # cela aplikacija, http://localhost:8088
tools/dev.sh                              # razvoj: baza :5433 + dotnet watch :8080 + Vite :5173
cd api && dotnet build && dotnet test     # backend + testovi
cd web && npm run build && npm test       # tsc + vite build, vitest
tools/build_pack.sh fullstack-dotnet      # sadržaj → paket (Python 3)
```

Posle svake izmene pokreni build i testove dela koji si menjao. Zadatak nije gotov dok oni ne prođu.

## Pravila

- **Pravila igre idu u `Hunter.Core`** kao čiste funkcije sa testovima. Endpointi i servisi ih samo pozivaju.
- **Ugovor:** svaka izmena u `Contracts.cs` ide uz istu izmenu u `web/src/api.ts`.
- **Tačni odgovori testa nikad ne idu frontendu pre predaje** (`PublicQuestion` nema `Correct` ni `Why`).
- **XP je događaj** (`XpEvent`). Ukupan XP, nivo i niz dana se računaju iz događaja, ne čuvaju se kao broj. Isti korak se ne naplaćuje dvaput (jedinstven indeks na `StepCompletion`).
- **Bez MediatR-a i AutoMapper-a** (komercijalne licence; nisu potrebni). Endpoint → servis → `HunterDb`.
- **DI:** singleton ne sme da drži scoped servis; `PackCatalog` pravi svoj scope (captive dependency).
- **Paketi su nepouzdan ulaz:** sve prolazi kroz `PackValidator`. Markdown se prikazuje bez sirovog HTML-a.
- **Tekst u UI-ju je na srpskom, latinicom.** Bez ćiriličnih slova u latiničnom tekstu (build_content.py to proverava za sadržaj).
- **Komentari objašnjavaju ZAŠTO**, uz uputnicu na poglavlje vodiča kad je to korisno (npr. „vodič, pogl. 9”).
- **Pristupačnost:** prava `<button>`/`<a>`, `aria-*` za radio/switch/tab, dodirne površine bar 44px, vidljiv fokus.
- Male izmene i commit-ovi po Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
- Pre dodavanja nove zavisnosti (NuGet ili npm) pitaj i obrazloži.

## Poznato stanje (faza 1, gotova)

- Radi: status, mapa, poglavlje (lekcija/dublje/vežba/kartice/izvori), test sa mešanjem opcija i objašnjenjima, biblioteka (upload .zip, aktivacija), podešavanja (4 teme, sjaj, animacije, dnevni cilj).
- Baza se pravi EF migracijama (`Data/Migrations`, `MigrateAsync` pri startu). Posle izmene modela: `dotnet ef migrations add <Ime> --project src/Hunter.Api --output-dir Data/Migrations`.
- Jedan korisnik, bez prijave; upload je zato bez antiforgery (`.DisableAntiforgery()`).
- JS bundle je oko 540 kB (nema lazy učitavanja ruta).

## Faza 2: plan

Raditi redom; posle svake stavke build, testovi i commit.

1. ✅ **EF migracije umesto EnsureCreated.** Dodaj `Microsoft.EntityFrameworkCore.Design`, inicijalna migracija, `Database.MigrateAsync()` pri startu. Uputstvo u README za postojeću bazu: `docker compose down -v`. (vodič, pogl. 12)
2. ✅ **Integracioni testovi API-ja.** Projekat `Hunter.Api.Tests`: `WebApplicationFactory<Program>` + Testcontainers.PostgreSql. Pokriti: uvoz paketa, završetak koraka (XP samo jednom), predaju testa (prolaz/pad, prvi prolaz daje XP), aktivaciju paketa, odbijen neispravan zip. (pogl. 17)
3. ✅ **Dnevni zadatak.** Svaki dan 3–4 zadatka iz sledećih koraka, skrojeni prema `DailyGoalMinutes`. Pravila u Core-u (`DailyQuestRules`) sa testovima. Na statusu: „[ ! ] DNEVNI ZADATAK”, napredak X/4, nagrada +1 slobodan poen.
4. ✅ **Kazneni zadatak.** Ako jučerašnji dnevni zadatak nije završen, danas prvo ide ponavljanje slabih tačaka (20 min) pre nove lekcije. Uključuje se ili isključuje u podešavanjima (`PenaltyEnabled`).
5. **Slobodni poeni.** Dobijaju se za završen dnevni zadatak i za level-up; dodeljuju se statistici (fokus nedelje). Prikaz i dugme „+” na karticama statistika.
6. **Boss test regiona.** Kad su sva poglavlja regiona očišćena: 20–25 nasumičnih pitanja iz regiona, prolaz 80%, +500 XP, oznaka na mapi.
7. **Lazy rute** u React-u (`React.lazy` po stranici) da bundle padne ispod 500 kB. (pogl. 28)
8. **Animacije sistema.** Samo CSS (`@keyframes` u `styles.css`), bez novih biblioteka. Trajanje do 1,5 s, nikad ne blokiraju klikove.
   Kad je `reduceMotion` uključen ILI je u sistemu `prefers-reduced-motion: reduce`, ostaje samo kratak fade (≤150 ms).
   Okidači dolaze iz odgovora API-ja (`XpResult.levelUp`, `TestResultView`, promena ranga na statusu), ne iz pogađanja na klijentu.
   - **Poruka sistema** (`SystemNotice` komponenta): prozor se otvara od tanke linije (scaleX pa scaleY, ~0,7 s), tekst ulazi posle. Za dnevni i kazneni zadatak i obaveštenja.
   - **Level up:** XP traka se dopuni do 100%, zasvetli (pulse), „LEVEL UP” iskoči (scale 0,6 → 1,15 → 1), pa traka kreće od nule.
   - **+XP brojevi:** posle završenog koraka „+50 XP”, „STR +1” isplivaju iznad dugmeta (translateY −70px, fade), bez modala.
   - **Ulazak u dungeon:** pre testa dve polovine kapije se razmaknu (translateX ±101%, 1,1 s), u pozadini spor rotirajući prsten.
   - **Novi rang:** romb se okrene 360°, slovo se promeni, talas svetla (scale 0,5 → 2,4, fade). Samo kad se rang zaista promeni.
   - **Otključano poglavlje:** na mapi katanac se zatrese i nestane, kartica zasvetli (border + glow). Prvo otvaranje mape posle prolaza.
   - **Plamen niza:** stalno blago treperenje (scale/rotate) i varnice dok je niz aktivan; mirniji i bleđi ako danas još nema XP-a.
   - **Boss test:** crveni bljesak preko ekrana (3×), okvir se zatrese, „HP traka” bossa se napuni, pa podaci o testu. Ide uz stavku 6.
   - **Region očišćen:** zlatni zrak preko ekrana, „DUNGEON CLEARED”, nagrade se pojavljuju jedna za drugom (+500 XP, statistika, titula). Jednom po regionu.

9. **Učitavanje aplikacije (boot).** Kanvas, ekran „8 · Učitavanje aplikacije (boot)”.
   - Overlay je **čist HTML/CSS u `web/index.html`** (stil u `<head>`), da se pojavi odmah, pre nego što se učita JS bundle. React ga uklanja.
   - **Puna verzija (~4 s)** pri prvom otvaranju u danu: tačka → svetla linija → otvaranje prozora sistema → redovi
     „Učitavanje statusa / Sinhronizacija dungeona / Provera dnevnog zadatka / Kalibracija ranga” sa „OK” → segmentna traka → „PRISTUP ODOBREN” (ostaje ~1 s i jednom zasvetli) → prozor se sklopi u liniju → aplikacija se otkrije.
     Vremenska linija: redovi od 1,0 s na svakih 0,3 s, traka 1,1–2,5 s, natpis 2,65 s, zatvaranje 3,6 s, otkrivanje 4,0 s.
     Datum poslednje pune verzije u `localStorage` (`hunter.boot.lastFull`).
   - **Kratka verzija (~0,6 s)** pri refresh-u istog dana: linija + „SISTEM SPREMAN_” i fade.
   - **„OK” prate stvarno učitavanje:** red se potvrđuje kad stigne odgovarajući upit (settings, status...). Overlay nestaje tek kad su
     podaci spremni I istekne minimalno trajanje. Ako API ne odgovori: „[ GREŠKA ] Sistem nedostupan” + dugme „Pokušaj ponovo”.
   - **Preskakanje:** klik, Enter ili Esc odmah završava animaciju.
   - **Tema i smanjene animacije** se čitaju iz `localStorage` keša (podešavanja još nisu stigla sa API-ja), pa boot ima boju aktivne teme.
     Uz `reduceMotion` ili `prefers-reduced-motion`: bez animacije, samo fade ≤150 ms.
   - Pristupačnost: `role="status"`; posle uklanjanja fokus ide na `<main>`.

Dizajn za stavke 3–6 postoji kao Claude Design kanvas „Hunter Roadmap — dizajn aplikacije” (ekrani Status i Podešavanja),
za stavku 8 ekran „7 · Animacije sistema”, a za stavku 9 ekran „8 · Učitavanje aplikacije (boot)” na istom kanvasu (tačne keyframes vrednosti su u njima).
