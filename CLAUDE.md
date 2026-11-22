# Hunter Roadmap: uputstvo za Claude

Lokalna aplikacija za učenje u Solo Leveling stilu (rangovi E→S, XP, nivoi, niz dana, mapa veština, testovi).
Univerzalna: sadržaj dolazi iz paketa (format `hunter-pack/1`), pa radi za bilo koju oblast.
Vlasnik je Miljan, .NET full stack programer koji kroz ovaj projekat uči i sprema se za intervjue.
Projekat je ujedno portfolio, pa kod mora biti čist i lako objašnjiv na intervjuu.

## Stack i struktura

- `api/src/Hunter.Core`: čista pravila (LevelRules, RankRules, ChapterRules, QuizGrader, StreakRules) i format paketa (PackReader, PackValidator). **Bez NuGet zavisnosti.**
- `api/src/Hunter.Api`: ASP.NET Core 10 minimal API. `Endpoints.cs` (rute), `Contracts.cs` (DTO ugovor), `Services/` (PackCatalog, PackImporter, ProgressService), `Data/HunterDb.cs` (EF Core + Npgsql).
- `api/tests/Hunter.Core.Tests`: xUnit testovi za Core.
- `web/`: React 19, Vite 8, TypeScript strict, TanStack Query 5, React Router 7, react-markdown. Stil je u `src/styles.css` (CSS promenljive po temi, `[data-theme]`, `[data-glow]`).
- `packs/<id>/pack.json + chapters.json`: uvoze se pri pokretanju API-ja. `examples/`: primer paket van IT-a.
- `content/fullstack-dotnet/src/region-*.md` → `tools/build_pack.sh fullstack-dotnet` → `packs/fullstack-dotnet`.
- `docker-compose.yml`: db (postgres:17, bez izloženog porta), api, web (nginx na :8088, proksi `/api` → api:8080).

## Komande

```bash
docker compose up --build                 # cela aplikacija, http://localhost:8088
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
- Baza se pravi sa `EnsureCreated` (nema migracija).
- Jedan korisnik, bez prijave; upload je zato bez antiforgery (`.DisableAntiforgery()`).
- JS bundle je oko 540 kB (nema lazy učitavanja ruta).

## Faza 2: plan

Raditi redom; posle svake stavke build, testovi i commit.

1. **EF migracije umesto EnsureCreated.** Dodaj `Microsoft.EntityFrameworkCore.Design`, inicijalna migracija, `Database.MigrateAsync()` pri startu. Uputstvo u README za postojeću bazu: `docker compose down -v`. (vodič, pogl. 12)
2. **Integracioni testovi API-ja.** Projekat `Hunter.Api.Tests`: `WebApplicationFactory<Program>` + Testcontainers.PostgreSql. Pokriti: uvoz paketa, završetak koraka (XP samo jednom), predaju testa (prolaz/pad, prvi prolaz daje XP), aktivaciju paketa, odbijen neispravan zip. (pogl. 17)
3. **Dnevni zadatak.** Svaki dan 3–4 zadatka iz sledećih koraka, skrojeni prema `DailyGoalMinutes`. Pravila u Core-u (`DailyQuestRules`) sa testovima. Na statusu: „[ ! ] DNEVNI ZADATAK”, napredak X/4, nagrada +1 slobodan poen.
4. **Kazneni zadatak.** Ako jučerašnji dnevni zadatak nije završen, danas prvo ide ponavljanje slabih tačaka (20 min) pre nove lekcije. Uključuje se ili isključuje u podešavanjima (`PenaltyEnabled`).
5. **Slobodni poeni.** Dobijaju se za završen dnevni zadatak i za level-up; dodeljuju se statistici (fokus nedelje). Prikaz i dugme „+” na karticama statistika.
6. **Boss test regiona.** Kad su sva poglavlja regiona očišćena: 20–25 nasumičnih pitanja iz regiona, prolaz 80%, +500 XP, oznaka na mapi.
7. **Lazy rute** u React-u (`React.lazy` po stranici) da bundle padne ispod 500 kB. (pogl. 28)

Dizajn za stavke 3–6 postoji kao Claude Design kanvas „Hunter Roadmap — dizajn aplikacije” (ekrani Status i Podešavanja).
