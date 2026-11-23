# Hunter Roadmap: uputstvo za Claude

Lokalna aplikacija za učenje u Solo Leveling stilu (rangovi E→S, XP, nivoi, niz dana, mapa veština, testovi).
Univerzalna: sadržaj dolazi iz paketa (format `hunter-pack/1`), pa radi za bilo koju oblast.
Vlasnik je Miljan, .NET full stack programer koji kroz ovaj projekat uči i sprema se za intervjue.
Projekat je ujedno portfolio, pa kod mora biti čist i lako objašnjiv na intervjuu.

## Stack i struktura

- `api/src/Hunter.Core`: čista pravila (LevelRules, RankRules, ChapterRules, QuizGrader, StreakRules, DailyQuestRules, PenaltyRules, FreePointRules, BossRules) i format paketa (PackReader, PackValidator). **Bez NuGet zavisnosti.**
- `api/src/Hunter.Api`: ASP.NET Core 10 minimal API. `Endpoints.cs` (rute), `Contracts.cs` (DTO ugovor), `Services/` (PackCatalog, PackImporter, ProgressService), `Data/HunterDb.cs` (EF Core + Npgsql).
- `api/tests/Hunter.Core.Tests`: xUnit testovi za Core.
- `api/tests/Hunter.Api.Tests`: integracioni testovi (`WebApplicationFactory<Program>` + Testcontainers PostgreSQL, primer paket kao seed). Traže pokrenut Docker.
- `web/e2e/*.e2e.ts`: Playwright E2E testovi; tačne odgovore čitaju iz `packs/fullstack-dotnet/chapters.json`. Za UI izmene (animacije, tokovi sa klikom) proveri i `tools/e2e.sh`.
- `web/`: React 19, Vite 8, TypeScript 7 (strict; nativni `tsc`, nema stari tsserver, pa VS Code traži proširenje „TypeScript Native Preview”), TanStack Query 5, React Router 7, react-markdown. Stil je u `src/styles.css` (CSS promenljive po temi, `[data-theme]`, `[data-glow]`).
- `packs/<id>/pack.json + chapters.json`: uvoze se pri pokretanju API-ja. `examples/`: primer paket van IT-a.
- `content/fullstack-dotnet/src/region-*.md` (puna poglavlja) i `vodic-*.md` (test i pitanja sa intervjua za poglavlja PDF vodiča) → `tools/build_pack.sh fullstack-dotnet` → `packs/fullstack-dotnet`. Posle izmene sadržaja povećaj `version` u `tools/make_pack.py`, inače API ne uvozi paket ponovo.
- `docker-compose.yml`: db (postgres:17, bez izloženog porta), api, web (nginx na :8088, proksi `/api` → api:8080).

## Komande

```bash
docker compose up --build                 # cela aplikacija, http://localhost:8088
tools/dev.sh                              # razvoj: baza :5433 + dotnet watch :8080 + Vite :5173
cd api && dotnet build && dotnet test     # backend + testovi
cd web && npm run build && npm test       # tsc + vite build, vitest
tools/build_pack.sh fullstack-dotnet      # sadržaj → paket (Python 3)
tools/e2e.sh                              # E2E (Playwright, Chrome) nad svežom instancom na :8099
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

## Poznato stanje (faze 1 i 2, gotove)

- Faza 2 dodala: dnevni i kazneni zadatak, slobodni poeni, boss test regiona, animacije sistema, boot ekran, E2E testovi (`tools/e2e.sh`), `tools/dev.sh`, testovi za poglavlja vodiča (paket 1.1.0, 385 pitanja, 203 kartice).
- Radi: status, mapa, poglavlje (lekcija/dublje/vežba/kartice/izvori), test sa mešanjem opcija i objašnjenjima, biblioteka (upload .zip, aktivacija), podešavanja (4 teme, sjaj, animacije, dnevni cilj).
- Baza se pravi EF migracijama (`Data/Migrations`, `MigrateAsync` pri startu). Posle izmene modela: `dotnet ef migrations add <Ime> --project src/Hunter.Api --output-dir Data/Migrations`.
- Jedan korisnik, bez prijave; upload je zato bez antiforgery (`.DisableAntiforgery()`).
- Stranice su `React.lazy` (main.tsx), `Suspense` je u Layout-u. Početni JS je ~354 kB; react-markdown je samo u delu ChapterPage (`components/Markdown.tsx`, ne uvoziti ga u common.tsx).

## Faza 2 (gotova)

Raditi redom; posle svake stavke build, testovi i commit.

1. ✅ **EF migracije umesto EnsureCreated.** Dodaj `Microsoft.EntityFrameworkCore.Design`, inicijalna migracija, `Database.MigrateAsync()` pri startu. Uputstvo u README za postojeću bazu: `docker compose down -v`. (vodič, pogl. 12)
2. ✅ **Integracioni testovi API-ja.** Projekat `Hunter.Api.Tests`: `WebApplicationFactory<Program>` + Testcontainers.PostgreSql. Pokriti: uvoz paketa, završetak koraka (XP samo jednom), predaju testa (prolaz/pad, prvi prolaz daje XP), aktivaciju paketa, odbijen neispravan zip. (pogl. 17)
3. ✅ **Dnevni zadatak.** Svaki dan 3–4 zadatka iz sledećih koraka, skrojeni prema `DailyGoalMinutes`. Pravila u Core-u (`DailyQuestRules`) sa testovima. Na statusu: „[ ! ] DNEVNI ZADATAK”, napredak X/4, nagrada +1 slobodan poen.
4. ✅ **Kazneni zadatak.** Ako jučerašnji dnevni zadatak nije završen, danas prvo ide ponavljanje slabih tačaka (20 min) pre nove lekcije. Uključuje se ili isključuje u podešavanjima (`PenaltyEnabled`).
5. ✅ **Slobodni poeni.** Dobijaju se za završen dnevni zadatak i za level-up; dodeljuju se statistici (fokus nedelje). Prikaz i dugme „+” na karticama statistika.
6. ✅ **Boss test regiona.** Kad su sva poglavlja regiona očišćena: 20–25 nasumičnih pitanja iz regiona, prolaz 80%, +500 XP, oznaka na mapi.
7. ✅ **Lazy rute** u React-u (`React.lazy` po stranici) da bundle padne ispod 500 kB. (pogl. 28)
8. ✅ **Animacije sistema.** (Urađeno u `components/Fx.tsx` + „Animacije sistema” u `styles.css`. Odstupanja: kašnjenja iz kanvasa sabijena na ≤1,5 s; nema katanca jer poglavlja nisu zaključana, pa novo očišćeno poglavlje samo zasvetli; „STR +1” izostavljen jer korak ne menja statistiku.) Samo CSS (`@keyframes` u `styles.css`), bez novih biblioteka. Trajanje do 1,5 s, nikad ne blokiraju klikove.
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

9. ✅ **Učitavanje aplikacije (boot).** (Overlay i stil u `web/index.html`, logika u `src/boot.ts`, vremena u `src/lib/bootTiming.ts` sa testovima; E2E u `web/e2e/boot.e2e.ts`. Ostali E2E testovi koriste kratku verziju preko fixture-a u `e2e/helpers.ts`.) Kanvas, ekran „8 · Učitavanje aplikacije (boot)”.
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

## Provera sadržaja (u toku, pre stavke 2 faze 3)

Cilj: svako pitanje, odgovor, objašnjenje, karticu i lekciju paketa `fullstack-dotnet` proveriti prema pouzdanim izvorima
(Microsoft Learn, MDN, react.dev, PostgreSQL dokumentacija, OWASP...), ispraviti greške, pa onda dodati teme koje nedostaju.
Redosled: prvo provera svih regiona, pa dopune.

Postupak po regionu: pročitaj ceo `content/fullstack-dotnet/src/<fajl>.md` → izdvoj sumnjive tvrdnje → potvrdi u zvaničnoj
dokumentaciji (citat + URL) → kompajliraj i pokreni primere koda (konzolni projekat u scratchpad-u) → ispravi; važne činjenice
koje nedostaju dodaj kao kartice (test mora imati tačno 5 pitanja, kartica bar 2) i dodaj izvor uz ispravku → proveri linkove
(`curl`) → povećaj patch verziju u `tools/make_pack.py` → `tools/build_pack.sh fullstack-dotnet` → testovi i `tools/e2e.sh` →
commit `fix(sadržaj): provera <region>` sa listom ispravki. Radi se sam, region po region (paralelni agenti su skuplji).
Za poglavlja vodiča lekcija je u PDF-u (nije u repozitorijumu): proveravaju se samo pitanja i kartice.

- ✅ region 0 (`region-0.md`, paket 1.1.1): JIT pri prvom pozivu metode, `Math.Round` na paran, `StackOverflowException`
  ne može da se uhvati, `Array.Sort` nestabilan, `PriorityQueue` najmanja vrednost, BFS bez pada. Potrošnja: ~4% limita.
- ✅ region C (`region-c.md`, paket 1.1.2): HybridCache stampede samo po instanci i lokalni keš drugih instanci,
  RabbitMQ publisher confirms i uslovi za DLQ, neispravan HCL (`provider { features {} }` u jednom redu) i
  `subscription_id` od azurerm 4.0, Node 22/24 i akcije v7/v6, `id-token: write`, Gateway API i nešifrovan Secret,
  `AddMeter` za sopstvene metrike, primer za p95. Primeri provereni: C# kompajliran i pokrenut, RabbitMQ uživo,
  `terraform validate`, actionlint, kubeconform. Pomoćno: RabbitMQ sajt blokira curl, docs su na GitHub-u
  (`rabbitmq/rabbitmq-website`); u Docker-u ne pokretati `docker exec … rabbitmq-diagnostics` dok broker ne krene (kvari `.erlang.cookie`).
- ✅ region AI (`region-ai.md`, paket 1.1.3): `record` usred top-level naredbi (CS8803), `static` lokalna funkcija
  zahvata promenljivu (CS8421), MCP stdio server mora da loguje na stderr (provereno uživo), limit
  `MaximumIterationsPerRequest` (40), HNSW indeks u pgvector-u, AGENTS.md, OWASP LLM 2025 stavke, novi linkovi.
- ✅ Reference na vodič (paket 1.1.4): sve „pogl. N” u regionima 0, C, AI i Pro proverene prema PDF-u vodiča
  („Od nule do posla”, Zalihe-intervju.pdf, 20. 11. 2026, nije u repou) i tačne; dodato 29 novih referenci.
  Izvor vodiča: `../zalihe/docs/vodic/intervju.html` (git ga ignoriše, nema istorije: pre izmene kopija);
  PDF: Chrome headless `--print-to-pdf` u `Zalihe-intervju.pdf` (152 strane). Ispravljeno u izvoru i PDF-u 23. 11. 2026:
  pogl. 44 „HybridCache (.NET 9+)” (radi i na starijim, zaštita od stampede-a samo po instanci);
  pogl. 44 sticky sessions za SignalR trebaju na više servera i uz Redis backplane, osim WebSockets-only + SkipNegotiation
  ili Azure SignalR; pogl. 15 tabela OWASP prati listu 2021 (u 2025 SSRF je u A01, nove su A03 Supply Chain i
  A10 Exceptional Conditions); pogl. 38 akcije `@v4` su zastarele (v7/v6/v7).
- ✅ region Pro (`region-pro.md`, paket 1.2.4): MediatR Community licenca (< 5 mil. $), OWASP 2025 predstavljen
  nov. 2025, shadcn/ui od jula 2026. podrazumevano Base UI, Next.js 16 i Cache Components, Daily Scrum po Scrum Guide-u.

## Pune lekcije za poglavlja vodiča (u toku, zahtev 23. 11. 2026)

Svih 49 poglavlja vodiča dobija u aplikaciji punu lekciju, „Dublje”, vežbu, pitanja i izvore, na osnovu vodiča,
provereno u najnovijim zvaničnim izvorima; greške nađene usput ispravljaju se i u `intervju.html` (pa novi PDF).
- Format: blok u `vodic-*.md` sa frontmatter-om `id`, `subtitle`, `minutes` i sekcijama kao region
  (`## Pojmovi`, `## Dublje`, `## Lab`, `## Pitanja sa intervjua`, `## Test`, `## Izvori`). Blok sa `## Pojmovi`
  je pun i prolazi istu validaciju kao region; bez nje ostaje samo test i pitanja (lekcija u PDF-u).
  Puno poglavlje nema `externalRef` (to znači „lekcija van aplikacije”). Postojeći test i pitanja se zadržavaju i proveravaju.
- Postupak po delu: pročitaj poglavlje u PDF-u → proveri tvrdnje (izvor + URL) → kod iz lekcije i vežbe pokreni →
  napiši blok → proveri linkove → verzija → build, testovi, e2e → commit.
- „Dublje” u 31 poglavlje dodataka (nisu ga imala): ✅ region 0, ✅ C (paket 1.2.2), ✅ AI (1.2.3), ✅ Pro (1.2.4)
- ✅ Deo I: 1, 2 (paket 1.2.0)
- ✅ Deo II temelji: 3–7 (paket 1.2.1; u vodiču ispravljeno: .NET 11 i kraj .NET 8/9, STS dve godine, LOH 85.000 B)
- ✅ Deo II srednji: 8–12 (paket 1.2.5; u vodiču ispravljen SQL iz EF-a: LIKE umesto strpos)
- ✅ Deo II napredni: 13–17 (paket 1.2.6; u vodiču: Repeatable Read u Postgresu sprečava fantome, PKCE po RFC 9700)
- ✅ Deo II: 18, 19 (paket 1.2.7; pogl. 18 provereno na kodu i testovima Zaliha, uz eksperiment bez `FOR UPDATE`;
  u vodiču pogl. 19: prioritet konfiguracije sa argumentima komandne linije, spojeno dvostruko „Rate limiting?”)
- ✅ Deo III temelji: 20–23 (paket 1.2.8; najnovije: React 19.3, TypeScript 7.0 (Go, jul 2026.), Node 24 sa type stripping-om;
  u vodiču: primitivni tipovi JS-a, TDZ za let/const, `strict` podrazumevan od TS 6.0, kaskada sa @layer)
- ✅ Deo III srednji: 24–27 (paket 1.2.10; kod iz lekcija proveren sa TS 7 nad tipovima React 19.3, React Router 7.18, TanStack Query 5;
  podrazumevane vrednosti Query-ja pročitane iz izvornog koda; u vodiču: `<Context value>` umesto `.Provider`)
- ⬜ Deo III: 28, 29 · 30, 31 (kartice 29 i 31 već dopunjene u paketu 1.2.9: React Compiler, Vite 8 i Rolldown)
- ⬜ Deo IV: 32–34 · 35–37 · 38, 39 · 40, 41
- ⬜ Deo V i VI: 42, 43 · 44–47 · 48, 49
- ⬜ `vodic-1-osnove-backend.md` … `vodic-5-intervju.md` (pitanja i kartice)
- ⬜ dopune: uporediti sadržaj sa onim što se traži od full stack .NET inženjera i predložiti nova poglavlja

 (Sistem 2.0, nalozi i Intervju arena)

Raditi redom; posle svake stavke build, testovi (i `tools/e2e.sh` za UI) i commit. Dizajn: ekran „Intervju arena” na istom kanvasu.
Materijal: kartice „Pitanja sa intervjua” iz paketa (203). Oblasti arene su statistike paketa (npr. INT/STR/AGI/VIT/PER), pa arena radi za svaki paket.

Dogovorene odluke: Sistem 2.0 izgled prvi (stranice Prijava/Registracija i arena se odmah prave u novom izgledu); nalozi odmah posle, pre arene (svaka nova tabela arene je odmah po korisniku; jedina tabela iz stavke 1, događaj preskakanja kazne, dobija `UserId` u stavci 2); intervali 1/3/7/14 dana; ponavljanje daje mali XP sa dnevnim limitom; simulacija je sa samoocenjivanjem; faza 3 ide pre faze 4 (deploy).

1. ✅ **Sistem 2.0 izgled.** Po kanvasu, ekran „9 · Sistem 2.0 (predlog izgleda)”; originalan dizajn u žanru „sistem prozora”, bez logoa,
   likova, slika ili doslovnih elemenata iz serije.
   - Paneli kao staklo: poluprovidna pozadina, dvostruki obris (spoljni sjajni + unutrašnji tanki okvir), unutrašnji sjaj.
     `backdrop-filter` samo na nekoliko velikih prozora (performanse), ne na svakoj kartici.
   - Naslovna traka prozora: uokviren `!` + centriran, razmaknut naslov velikim slovima.
   - Font Rajdhani (Google Fonts) za naslove, brojke i meni; telo teksta ostaje Inter.
   - Pozadina kao scena: mreža koja sporo klizi, vinjeta, scan linije (prekidač u podešavanjima), retko jedva primetno treperenje.
   - Brojke se odbrojavaju do nove vrednosti (XP, poeni, nagrade).
   - Status je jedan prozor „STATUS”: levo **romb ranga (zadržan)** sa slovom, broj nivoa, podaci (ime, klasa, rang, niz), segmentna XP traka;
     desno statistike kao lista sa „+” i slobodni poeni. Romb zadržava animaciju novog ranga (okret + talas).
   - Meni: velika slova, `▸` i svetleći okvir za aktivnu stavku.
   - Pravila ostaju: kontrast teksta ≥ 4,5:1 i na staklu; uz smanjene pokrete stoje mreža, treperenje, scan linije i odbrojavanje.
   - Redosled: zajednički tokeni i komponente (prozor, naslovna traka), pa Status, pa ostali ekrani; E2E testovi moraju da prođu.
   - ✅ Korak 1, zajednički delovi: font Rajdhani (`--display`), tokeni `--glass-rgb`/`--label`/`--bright` po temi, scena u Layout-u
     (`.scene`: mreža, vinjeta, scan linije), `components/Window.tsx` (`.win*`, `glass` = zamućenje samo za velike prozore),
     meni sa `▸`, postojeći paneli (`.sys`, `.card`, `.quest`, `.notice`) u staklu. Podešavanje `ScanLines` (migracija `AddScanLines`, `data-scan`).
   - ✅ Korak 2, Status: prozori „STATUS” (`StatusWindow`) i „DNEVNI ZADATAK” (`QuestWindow`, upozorenje o kazni u njemu) u `StatusPage.tsx`.
     Odbrojavanje: `lib/countUp.ts` (čista funkcija, testovi) + `useCountUp`; početna vrednost je ono što je korisnik poslednji put
     video (`useSeenNumbers`, localStorage `hunter.seen.<paket>`), pa se posle završenog koraka XP odbroji od stare vrednosti.
   - ✅ Korak 3a, Mapa: `MapPage.tsx` sa prozorima MAPA VEŠTINA (gate-ovi), GATE (pločice, Boss gate) i DETALJI (`?c=` bira poglavlje).
     API: `RegionView.Rank` (RankRules nad poglavljima regiona), `ChapterView.StepXp` (XP po koraku). Dugmad `.btn` u stilu sistema. E2E `mapa.e2e.ts`.
   - ✅ Korak 3b, Dungeon test: prozor DUNGEON (poglavlje, odgovoreno, prolaz, `AnswerPips`), pitanja kao stakleni paneli
     (`QuestionCard`, deli ga boss test), „[ SISTEM ] NETAČNO · TAČAN ODGOVOR: X” posle predaje. Sva pitanja ostaju na jednoj
     stranici (ne jedno po jedno kao na kanvasu), jer server ocenjuje tek pri predaji.
   - ✅ Korak 3c, Poglavlje: prozor POGLAVLJE sa koracima kao karticama-tabovima (`✓ +XP`, vežba `[x/N]`, Test kao ulaz u dungeon),
     sadržaj u `.card.glass`, vežba kao čeklista (pravi checkbox, `.check-list`), desno prozor NAGRADE (iz `ChapterView.StepXp`).
   - ✅ Korak 3d, Kazneni zadatak: `components/PenaltyDialog.tsx` (pravi `<dialog>` + `showModal()`, bljeskovi na `::backdrop`,
     `.win-red` menja promenljive boje), otvara se jednom dnevno (localStorage `hunter.penalty.seen.<paket>`), crvena tabla ga ponovo otvara.
     Pravilo: `StreakRules.Current(..., brokenOn)`; događaj `PenaltySkips` (migracija `AddPenaltySkips`), `POST /api/penalty/skip`
     (uklanja nezavršena ponavljanja; prazan zadatak se ne „završava”). E2E `kazna.e2e.ts` podmeće status preko `page.route`.
     Žeton odlaganja sa kanvasa ide uz Inventar (stavka 11). „Nove lekcije su zaključane” se ne prikazuje: lekcije nisu zaključane.
   - **Ostali ekrani po kanvasu (red „Sistem 2.0 — ostali ekrani i novi prozori”):**
     - „10 · Mapa veština”: regioni kao gate-ovi (dugmad sa rangom u rombu i % očišćeno), poglavlja kao pločice sa stanjem
       ✓ očišćeno / ▸ u toku / ○ novo, Boss gate panel na dnu regiona, desno prozor „DETALJI” sa koracima i XP-om.
       Stanje ⊘ „zaključano” sa kanvasa se ne pravi: poglavlja nisu zaključana (odluka iz faze 2).
     - „11 · Dungeon test”: gornji prozor (poglavlje, pitanje X/N, prolaz), segmentna traka napretka (zelena/crvena/aktivna),
       opcije kao staklena dugmad sa slovom, posle predaje „[ SISTEM ] TAČNO · +XP” / „NETAČNO · tačan odgovor: X” sa objašnjenjem.
       Prikaz vremena samo ako se uvede tajmer (sada ga nema). Tačni odgovori i dalje stižu tek posle predaje.
     - „12 · Poglavlje”: koraci kao sistemske kartice sa stanjem (✓ +XP, vežba [x/N]), vežba kao čeklista u stilu dnevnog zadatka,
       desno prozor „NAGRADE” (XP po koraku).
     - „13 · Kazneni zadatak”: postojeći kazneni zadatak (faza 2) se prikazuje kao **crveni prozor sistema** pri ulasku, sa 3 crvena
       bljeska (alarm) i animacijom otvaranja; lista zadataka sa [x/N] i preostalim vremenom. Dugmad: „PRIHVATI” i
       „PRESKOČI · NIZ SE PREKIDA”. **Novo pravilo** (Core, sa testovima): preskakanje odmah prekida niz i nema druge kazne.
       Uz `reduceMotion`: bez bljeskova, samo fade.
2. **Nalozi (registracija i prijava).** ASP.NET Core Identity (`Microsoft.AspNetCore.Identity.EntityFrameworkCore`, odobreno)
   sa `MapIdentityApi`; prijava kolačićem (HttpOnly, SameSite), ne JWT: frontend i API su na istom domenu preko nginx-a.
   - `UserId` u svim tabelama napretka (StepCompletions, XpEvents, TestAttempts, DailyQuests, StatPoints, BossAttempts, RegionClears);
     jedinstveni indeksi uključuju korisnika; `UserSettings` jedan red po korisniku (više nema `Id = 1`).
   - EF Core global query filter po prijavljenom korisniku, da nijedan upit ne može da ga zaobiđe. Integracioni test: A ne vidi napredak B.
   - Paketi su zajednički; upload i aktivacija paketa za sve: samo uloga `Admin`. Svaki korisnik bira svoj aktivni paket.
   - Registracija otvorena; bez potvrde mejlom i resetovanja lozinke za sada (nema mail servera).
   - CSRF: antiforgery se vraća na upload (kolačić sada nosi identitet); ukloniti `.DisableAntiforgery()`.
   - Migracija postojećih podataka: dosadašnji napredak dobija prvi (vlasnikov) nalog, koji je i `Admin`.
   - Frontend: stranice Prijava i Registracija, zaštićene rute, odjava u meniju; E2E se prijavljuje kroz fixture.
3. **Pravila ponavljanja (`ReviewRules` u Core-u).** Leitner kutije 1/3/7/14 dana: „Nisam znao” → 1 dan, „Delimično” → 3 dana,
   „Znao sam” → sledeći interval (7, pa 14). Red za danas: zakasnele prve, najviše 10 novih kartica dnevno. Čiste funkcije sa testovima.
4. **Ocena kartice je događaj.** Tabela `CardRatings` (kartica, ocena, vreme) + migracija; kutija i sledeći datum se računaju iz istorije
   (isti princip kao XP). Kartica se prepoznaje po id-ju poglavlja + hešu teksta pitanja, ne po indeksu, da izmena paketa ne pomeša istoriju.
5. **API arene.** `GET /api/arena?area=…` (današnji red, brojevi za danas, spremnost po oblasti = % kartica na intervalu ≥ 7 dana),
   `POST /api/arena/cards/{id}/rate`. Integracioni testovi. Izmene u `Contracts.cs` uz iste u `api.ts`.
6. **Stranica „Intervju arena”** po kanvasu: stavka u meniju, filter po oblasti, kartica sa „Otkrij odgovor” i tri ocene,
   brojevi za danas, trake spremnosti. Prečice: Space = otkrij, 1/2/3 = ocena. E2E test toka.
7. **Arena u dnevnom zadatku.** Novi tip zadatka „Ponovi N kartica” kad ih ima na redu (`DailyQuestRules`). XP za ponavljanje
   (npr. 5 po kartici, dnevni limit), pravilo u Core-u sa testovima.
8. **STAR priča.** Forma S/T/A/R sačuvana u bazi; prikaz u areni (kao na kanvasu) i u simulaciji. Popunjava se uz poglavlje 43.
9. **Simulacija intervjua.** 45 min sa tajmerom: 10 kartica iz svih oblasti (bira server, prednost slabijim), jedan zadatak na tabli,
   STAR priča; samoocenjivanje; izveštaj po oblastima se čuva (napredak kroz vreme). Ulazna animacija iz postojećeg sistema animacija.
10. **Sadržaj: zadaci na tabli.** 10–15 SQL i algoritamskih zadataka sa rešenjem i objašnjenjem, u `vodic-*.md` formatu sa istom proverom.
11. **Inventar** (kanvas „14 · Inventar i nagrade”). Stranica „INVENTAR” u meniju: mreža slotova, filteri SVE / TITULE / BEDŽEVI / PREDMETI,
    desno prozor „PREDMET” (ime, retkost, opis, kako se dobija, akcija). Retkost: obično / retko / epsko / legendarno (siva, plava, ljubičasta, zlatna).
    - **Predmeti se računaju iz događaja** (kao XP), pravila u Core-u (`InventoryRules`) sa testovima; troši se upisom događaja `ItemUses`.
    - Titule: niz od 7 dana → „Onaj koji ne odustaje”, prvi očišćen region → „Prvi gate”, Boss test regiona → titula regiona
      (npr. „Backend vitez” za .NET). Jedna aktivna titula, prikazuje se ispod imena u prozoru STATUS.
    - Bedževi: po jedan za svaki očišćen region (`RegionClears`).
    - Žeton odlaganja: 1 za svaki niz od 7 dana, najviše 2 u inventaru; pomera kazneni zadatak na sutra, a niz ostaje (dugme u prozoru kazne).
    - Kamen fokusa: nagrada za Boss test; sledeći dodeljen slobodni poen vredi 2.
    - Neosvojeni predmeti se prikazuju kao „?” sa uslovom dobijanja. Bez kupovine i bez slučajnih nagrada.
12. **Vojska senki** (kanvas „15 · Vojska senki”). Zavisi od stavki 3–4 (ponavljanje).
    - Poglavlje je **spremno za izvlačenje** kad: najbolji test ≥ 90%, vežba završena i sve njegove kartice bar jednom na intervalu ≥ 7 dana.
      Izvlačenje je ručna akcija („IZVUCI SENKU”) sa animacijom pojave; čuva se kao događaj.
    - Senka produžava ponavljanje preko 14 dana: rang senke prati interval njenih kartica: vojnik 7, vitez 14, elitni vitez 30, komandant 60 dana.
    - **Snaga** senke = udeo njenih kartica koje nisu pale u poslednjih 60 dana; „Nisam znao” na kartici senke spušta snagu i vraća tu karticu na 1 dan.
      Senka sa snagom < 50% je „slaba” (crveni okvir); na 0% se raspušta, a poglavlje se vraća među slabe tačke.
    - Kartice senki ulaze u dnevni red arene kao i ostale (ne posebna lista). Prikaz: broj senki, prosečna snaga, kartice senki danas.
    - Pravila (`ShadowRules`) u Core-u sa testovima; stranica „VOJSKA SENKI” u meniju.

Dizajn za stavke 1, 11 i 12: ekrani 9–15 na kanvasu „Hunter Roadmap — dizajn aplikacije”.
