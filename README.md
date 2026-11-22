# Hunter Roadmap

Lokalna aplikacija za učenje u Solo Leveling stilu: rangovi E→S, nivoi i XP, niz dana, mapa veština i testovi.
Univerzalna je: sadržaj dolazi iz **paketa**, pa ista aplikacija radi za Full Stack, cybersecurity, nemački, medicinu ili filozofiju.

Stack: **ASP.NET Core 10** (minimal API, EF Core, PostgreSQL) · **React 19 + Vite + TypeScript** (TanStack Query, React Router) · **Docker Compose**.

## Pokretanje

Potrebno je samo Docker Desktop (ili Docker na Linuxu).

```bash
cp .env.example .env          # opciono, za drugu lozinku baze
docker compose up --build
```

Otvori **http://localhost:8088**. Pri prvom pokretanju API napravi bazu i uveze sve pakete iz `packs/`. Full Stack paket postaje aktivan.

Ako promeniš `POSTGRES_PASSWORD` posle prvog pokretanja, obriši volumen (`docker compose down -v`), jer je baza već napravljena sa starom lozinkom.

### Migracije baze

Šema se pravi i menja kroz EF Core migracije (`api/src/Hunter.Api/Data/Migrations`). API ih primeni sam pri pokretanju.

**Baza napravljena pre migracija** (faza 1, `EnsureCreated`) nema tabelu `__EFMigrationsHistory`, pa bi API pokušao da ponovo napravi postojeće tabele i pao. Obriši je jednom (napredak se gubi):

```bash
docker compose down -v
docker compose up --build
```

Nova migracija posle izmene modela (`dotnet tool install -g dotnet-ef` ako alat nemaš):

```bash
cd api && dotnet ef migrations add ImeIzmene --project src/Hunter.Api --output-dir Data/Migrations
```

## Razvoj bez Dockera za API i frontend

Za svakodnevni rad: izmene se vide odmah, bez `docker compose up --build`.

```bash
tools/dev.sh        # baza u Dockeru (localhost:5433) + dotnet watch (:8080) + Vite (http://localhost:5173)
```

- React izmene se vide odmah (Vite HMR), C# izmene posle par sekundi (`dotnet watch` sam restartuje API).
- Ctrl+C gasi API i web; baza ostaje da radi. Napredak je isti kao u Docker verziji (isti volumen).
- Baza je na **5433**, ne 5432, jer na 5432 često radi lokalno instaliran PostgreSQL.
- Isto, ručno u tri terminala:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
cd api/src/Hunter.Api && dotnet watch     # Properties/launchSettings.json: Development, :8080
cd web && npm run dev                     # /api ide na :8080
```

`docker compose up --build -d` (http://localhost:8088) treba samo za proveru produkcijske verzije.

Testovi:

```bash
cd api && dotnet test       # pravila igre (Core) + integracioni testovi API-ja (traže pokrenut Docker)
cd web && npm test          # mešanje opcija i mapa aktivnosti
```

## Struktura

```
api/
  src/Hunter.Core/        pravila (XP, nivo, rang, niz dana, ocenjivanje) i format paketa; bez zavisnosti
  src/Hunter.Api/         EF Core model, uvoz paketa, endpointi (Endpoints.cs), Program.cs
  tests/Hunter.Core.Tests xUnit testovi
web/src/
  api.ts                  tipovi i klijent (ugovor sa Contracts.cs)
  pages/                  Status, Mapa, Poglavlje, Test, Biblioteka, Podešavanja
  styles.css              Solo Leveling teme (sistem, monarh, crveni, zlatni)
packs/                    paketi koji se uvoze pri pokretanju (jedan folder = jedan paket)
content/fullstack-dotnet  izvorni Markdown za Full Stack paket
tools/                    build_content.py → make_manifest.py → make_pack.py (tools/build_pack.sh)
examples/                 primer paketa van IT-a (folder i .zip za upload)
```

Zašto dva projekta, a ne četiri sloja kao u ITM-u: pravila su odvojena u `Hunter.Core` i testiraju se bez baze, a sve ostalo je u jednom API projektu.
To je „modularni monolit” iz vodiča (pogl. 1 i 13). Kad aplikacija poraste, `Services/` se lako izdvoji u Application sloj.

## Format paketa (hunter-pack/1)

Paket je folder ili `.zip` sa dva fajla:

- **pack.json**: `id`, `title`, `description`, `version`, `passPct`, `xp`, `stats` (statistike, npr. LOG = Logika) i `regions` → `levels` → id-jevi poglavlja.
- **chapters.json**: lista poglavlja. Svako ima `id`, `title`, `minutes` i bar jedno od `lessonMarkdown` / `externalRef`. Opciono: `deeperMarkdown`, `exercise` (`steps`, `done`), `cards` (`q`, `a`), `test` (`text`, `code`, `options`, `correct`, `why`) i `sources`.

Najlakše je da kopiraš `examples/primer-filozofija` i menjaš ga. Uvoz je kroz **Biblioteka → Izaberi .zip** ili stavljanjem foldera u `packs/` i restartom API-ja.
Paket se proverava pre upisa (`PackValidator.cs`): nepostojeća statistika, poglavlje van strukture, `correct` van opsega, izvor bez linka… Greške se prikazuju u Biblioteci.
Nova verzija istog paketa zamenjuje sadržaj, a napredak ostaje jer je vezan za id paketa i id poglavlja.

Full Stack paket se pravi iz Markdown-a:

```bash
tools/build_pack.sh fullstack-dotnet    # content/fullstack-dotnet/src → packs/fullstack-dotnet
```

## Pravila igre

- **XP:** lekcija 50, dublje 30, vežba 100, test 80 (prvi prolaz). Ponovljen korak ne daje XP (jedinstven indeks u bazi).
- **Nivo:** iz ukupnog XP-a; sa nivoa N na N+1 treba 100 + 50·(N−1) XP.
- **Rang:** iz procenta očišćenih poglavlja aktivnog paketa: D 10%, C 25%, B 45%, A 65%, S 85%. Ne zavisi od XP-a, jer se XP može „farmovati”.
- **Niz dana:** uzastopni dani sa bar jednim osvojenim XP-om, po vremenu `Hunter:TimeZone` (Europe/Belgrade).
- **Test:** opcije se mešaju pri svakom pokušaju. Tačni odgovori ne napuštaju server pre predaje. Netačna pitanja idu u „Slabe tačke”.

## Šta sledi (faze 2–4)

| Faza | Sadržaj | Poglavlja koja vežbaš |
|---|---|---|
| 2 | EF migracije umesto `EnsureCreated`, dnevni zadaci, kazneni zadatak, slobodni poeni, Boss test regiona, integracioni testovi (`WebApplicationFactory` + Testcontainers) | 12, 17, C3 |
| 3 | Intervju arena: kartice sa ponavljanjem (1/3/7/14 dana), simulacija (testovi za poglavlja vodiča su urađeni u paketu 1.1.0, osim 18, 30 i 40) | 44–48, P9 |
| 4 | GitHub Actions, deploy na VPS iza HTTPS-a | 37–38, C2 |
| + | AI generisanje paketa iz PDF-a, editor paketa, nalozi i deljenje | AI2–AI5, P3 |

## Poznata ograničenja faze 1

- Jedan korisnik, bez prijave (lokalna aplikacija). Upload paketa zato nema CSRF zaštitu; uključuje se kad stignu nalozi.
