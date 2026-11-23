=====
---
id: "C1"
region: "C"
level: "SREDNJI NIVO"
title: "Azure osnove"
subtitle: "resource group, App Service, baza, Blob, Key Vault, Managed Identity"
minutes: 60
---
# C1 Azure osnove

Cloud je iznajmljen računar, baza i mreža koje plaćaš po potrošnji, umesto da ih održavaš sam. Na tvom netcup serveru sam brineš o Linuxu, Dockeru, sertifikatima i backupu (vodič, pogl. 37–40); na Azure-u biraš gotovu uslugu (PaaS) i on preuzima veći deo toga. Azure se najčešće traži u oglasima uz .NET, pa je dobro znati bar osnovne usluge.

## Pojmovi

| Pojam | Šta je |
|---|---|
| Subscription | račun za naplatu; sve usluge žive u njemu |
| Resource group | folder za resurse jedne aplikacije; brišeš ga i nestaje sve unutra |
| Region | data centar (npr. West Europe, Germany West Central) |
| IaaS / PaaS / SaaS | ti održavaš VM / ti daješ samo kod / koristiš gotov program |

### Usluge za tipičnu .NET + React aplikaciju

| Potreba | Usluga | Kod tebe danas |
|---|---|---|
| API | App Service (ili Container Apps za Docker) | kontejner iza Caddy-ja |
| Baza | Azure SQL ili Azure Database for PostgreSQL | Postgres u Compose-u |
| Fajlovi | Blob Storage | volumen na disku |
| Tajne | Key Vault | `.env` fajl |
| React | Static Web Apps (ili Blob + CDN) | Caddy servira build |
| Logovi i metrike | Application Insights (Azure Monitor) | logovi kontejnera |

### Managed Identity: bez lozinki u kodu

Aplikacija na Azure-u dobija sopstveni identitet. Daš tom identitetu pravo da čita Key Vault, i aplikacija pristupa bez ijedne lozinke u konfiguraciji. Key Vault je samo još jedan izvor konfiguracije u nizu koji vodič opisuje u pogl. 8 (appsettings, user secrets, promenljive okruženja).

```csharp
// paketi: Azure.Identity, Azure.Extensions.AspNetCore.Configuration.Secrets
builder.Configuration.AddAzureKeyVault(
    new Uri("https://kv-biblioteka.vault.azure.net/"),
    new DefaultAzureCredential());   // lokalno koristi tvoj az login, na Azure-u Managed Identity
```

`DefaultAzureCredential` redom proba više izvora (promenljive okruženja, Workload Identity, Managed Identity, Visual Studio, Azure CLI…), pa isti kod radi i lokalno i u cloudu. Za produkciju Microsoft preporučuje da ga zameniš tačno određenim (npr. `ManagedIdentityCredential`): nema isprobavanja redom, pa je brže, predvidljivije i greška se lakše nalazi.

### Troškovi

Pre svakog vežbanja postavi budžet i upozorenje (Cost Management → Budgets). Posle vežbe obriši celu resource group: `az group delete -n rg-biblioteka`.

## Lab

1. Napravi besplatan Azure nalog i u Cost Management postavi budžet od 10 € sa upozorenjem na 50%.
2. Instaliraj Azure CLI, uloguj se (`az login`) i napravi `az group create -n rg-biblioteka -l westeurope`.
3. Proveri dostupne .NET verzije (`az webapp list-runtimes --os linux`) i objavi Biblioteka API sa `az webapp up` na najmanji plan.
4. Napravi Key Vault, upiši tajnu `ConnectionStrings--Db` i uključi System-assigned Managed Identity na App Service-u.
5. Daj identitetu ulogu „Key Vault Secrets User” (radi samo kad Key Vault koristi model dozvola „Azure RBAC”, ne stare access policies) i povuci tajnu kroz `AddAzureKeyVault`; ukloni connection string iz appsettings.
6. Na kraju obriši resource group.

**Gotovo je kad:** API radi na `*.azurewebsites.net`, connection string ne postoji ni u kodu ni u App Service podešavanjima, a resource group je obrisana posle vežbe.

## Pitanja sa intervjua

**P: Šta je Managed Identity i zašto je bolji od connection stringa sa lozinkom?**
Azure dodeljuje aplikaciji identitet kojim se prijavljuje na druge usluge. Nema tajne koja može da procuri ili istekne, a prava se daju i oduzimaju kroz uloge (RBAC).

**P: App Service ili Container Apps?**
App Service za klasičnu web aplikaciju bez kontejnera ili sa jednim kontejnerom. Container Apps kad već imaš Docker image, više servisa ili treba skaliranje na nulu.

**P: Kako bi preneo aplikaciju sa svog VPS-a na Azure?**
Kontejner na Container Apps ili kod na App Service, baza na upravljani Postgres (migracija dump/restore), fajlovi u Blob, tajne u Key Vault, a deploy kroz GitHub Actions.

**P: Da li `DefaultAzureCredential` treba da ostane u produkciji?**
Microsoft preporučuje da ga u produkciji zameniš određenim kredencijalom, npr. `ManagedIdentityCredential`. Lanac isprobava izvore redom: sporije je, a kad prijava ne uspe, teško je videti koji izvor je pao. `DefaultAzureCredential` je zgodan za početak i lokalni razvoj.

## Test

### 1. Šta se desi kad obrišeš resource group?
- [ ] Brišu se samo virtuelne mašine
- [ ] Ništa, mora prvo da se obriše subscription
- [x] Brišu se svi resursi u njoj
- [ ] Resursi se premeštaju u podrazumevanu grupu
> Resource group je jedinica životnog ciklusa: brisanje grupe briše sve resurse u njoj.

### 2. Gde se na Azure-u čuvaju tajne poput connection stringova?
- [ ] Application Insights
- [x] Key Vault
- [ ] Resource group tagovi
- [ ] Blob Storage
> Key Vault je usluga za tajne, ključeve i sertifikate, sa kontrolom pristupa i istorijom.

### 3. Šta radi `DefaultAzureCredential`?
- [ ] Generiše novi nalog
- [ ] Uvek traži lozinku od korisnika
- [ ] Radi samo na Windowsu
- [x] Redom proba više izvora identiteta (okruženje, Managed Identity, Azure CLI…)
> Zato isti kod radi lokalno (tvoj az login) i u cloudu (Managed Identity).

### 4. Koja usluga najviše liči na tvoj kontejner iza reverse proxy-ja, ali bez održavanja servera?
- [x] Azure Container Apps
- [ ] Blob Storage
- [ ] Key Vault
- [ ] Azure Virtual Machine
> Container Apps pokreće tvoj image, daje HTTPS i skaliranje, a server održava Azure.

### 5. Šta je PaaS?
- [ ] Ti održavaš operativni sistem i mrežu
- [x] Ti daješ aplikaciju, a platformu (OS, runtime, zakrpe) održava provajder
- [ ] Gotov program koji samo koristiš u browseru
- [ ] Fizički server u tvojoj kancelariji
> App Service i upravljane baze su PaaS.

## Izvori
- [Microsoft Learn: App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Microsoft Learn: Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Microsoft Learn: Key Vault i Azure RBAC (uloga Key Vault Secrets User)](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Microsoft Learn: lanci kredencijala i DefaultAzureCredential u produkciji](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/credential-chains)
- [Microsoft Learn: Azure obuke](https://learn.microsoft.com/en-us/training/azure/)
=====
---
id: "C2"
region: "C"
level: "SREDNJI NIVO"
title: "GitHub Actions napredno"
subtitle: "jobs, needs, matrica, keš, tajne, okruženja, OIDC"
minutes: 50
---
# C2 GitHub Actions napredno

U poglavlju 38 vodiča je osnovni pipeline: build, test, deploy. Na poslu se traži više: paralelni poslovi, testiranje na više verzija, odobrenje pre produkcije i deploy bez dugotrajnih lozinki. Sve to je deklarativno u YAML-u, u repou.

## Pojmovi

| Pojam | Značenje |
|---|---|
| Workflow | YAML u `.github/workflows/`, pokreće ga događaj (`push`, `pull_request`, `schedule`, `workflow_dispatch`) |
| Job | skup koraka na jednoj mašini (runneru); poslovi idu paralelno ako nema `needs` |
| Step | jedna komanda (`run`) ili gotova akcija (`uses`) |
| Matrica | isti job za više kombinacija (verzije, OS) |
| Environment | npr. `production`: svoje tajne i obavezno odobrenje |
| Artifact | fajl koji jedan job ostavi, a drugi preuzme |

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:                     # novi push otkazuje stari pipeline iste grane
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read                 # najmanja prava za GITHUB_TOKEN

jobs:
  backend:
    runs-on: ubuntu-latest
    services:                    # pravi Postgres za integracione testove
      db:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: >-              # koraci kreću tek kad baza odgovara
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-dotnet@v6
        with: { dotnet-version: "10.0.x" }
      - run: dotnet test --configuration Release

  frontend:
    runs-on: ubuntu-latest
    strategy:
      matrix: { node: [22, 24] }   # aktivne LTS verzije (Node 20 je bez podrške od aprila 2026)
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: "${{ matrix.node }}", cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci && npm run lint && npm test && npm run build
        working-directory: web

  deploy:
    needs: [backend, frontend]   # čeka oba
    if: github.ref == 'refs/heads/main'
    environment: production      # čeka odobrenje ako je tako podešeno
    runs-on: ubuntu-latest
    steps:
      - run: echo "deploy..."
```

### Tajne i OIDC

- `secrets.X` se maskira u logovima i ne prosleđuje se pull requestovima iz forkova.
- **OIDC (federated credentials):** umesto da u GitHub čuvaš lozinku za Azure/AWS, cloud veruje GitHub-ovom kratkotrajnom tokenu za tačno taj repo i granu. Nema tajne koja ističe ili curi. Job koji traži token mora da ima `permissions: id-token: write`; to ne daje nikakva prava na cloudu, samo dozvolu da se token zatraži.

### Dobre prakse

- Fiksiraj verzije akcija (glavna verzija kao `@v7`, a za strožu bezbednost pun SHA commit-a).
- `permissions:` daj najmanja potrebna prava (`contents: read`).
- Ponovljene korake izdvoji u reusable workflow (`workflow_call`).

## Lab

1. U Biblioteka repou napravi workflow sa odvojenim `backend` i `frontend` poslovima koji rade paralelno.
2. Dodaj `services: postgres` i bar jedan integracioni test koji koristi pravu bazu.
3. Dodaj matricu za Node 22 i 24 i keš za npm.
4. Dodaj `deploy` job sa `needs`, `if` na `main` i environment `production` sa obaveznim odobrenjem (Settings → Environments). Na besplatnom planu required reviewers rade samo u javnom repou; za privatni repo treba GitHub Enterprise.
5. Dodaj `concurrency` i `permissions: contents: read` na nivou workflow-a.
6. Bonus: build Docker image-a i push na GHCR (`ghcr.io/<korisnik>/biblioteka-api`).

**Gotovo je kad:** PR pokreće samo testove, a merge u `main` posle zelenih testova čeka tvoje odobrenje pre deploy koraka.

## Pitanja sa intervjua

**P: Kako bi ubrzao spor CI pipeline?**
Paralelni poslovi, keš paketa (NuGet/npm), Docker layer keš, pokretanje samo poslova za promenjene delove (`paths`), otkazivanje zastarelih pokretanja (`concurrency`).

**P: Kako GitHub Actions bezbedno deploy-uje na cloud bez lozinke?**
OIDC: cloud provajder je podešen da veruje tokenima koje GitHub izdaje za određeni repo, granu ili environment; token traje minutima.

**P: Šta workflow mora da ima da bi dobio OIDC token?**
`permissions: id-token: write` na nivou job-a ili workflow-a. Bez toga (ili sa `read`) GitHub ne izdaje token. Ta dozvola ne daje pravo da se bilo šta menja na cloudu; poverenje se podešava na strani clouda (federated credential za repo, granu ili environment).

## Test

### 1. Kako se obezbeđuje da `deploy` krene tek kad prođu `backend` i `frontend`?
- [ ] `after: [backend, frontend]`
- [ ] Redosled u fajlu
- [x] `needs: [backend, frontend]`
- [ ] `depends_on`
> Bez `needs` poslovi idu paralelno.

### 2. Čemu služi `strategy.matrix`?
- [ ] Da se tajne šifruju
- [ ] Da se poslovi izvrše redom
- [x] Da se isti job pokrene za više kombinacija (npr. verzija Node-a)
- [ ] Da se smanji broj koraka
> Matrica pravi po jedan job za svaku kombinaciju vrednosti.

### 3. Šta omogućava `environment: production` sa required reviewers?
- [ ] Brži build
- [ ] Deploy na više servera odjednom
- [ ] Automatski rollback
- [x] Job čeka ručno odobrenje i koristi tajne tog okruženja
> Okruženja imaju svoja pravila zaštite i svoje tajne.

### 4. Koja je glavna prednost OIDC-a za deploy na cloud?
- [ ] Ne treba nalog na cloudu
- [x] Nema dugotrajne tajne sačuvane u GitHub-u
- [ ] Brži upload fajlova
- [ ] Radi bez interneta
> Cloud izdaje kratkotrajan pristup na osnovu GitHub-ovog potpisanog tokena.

### 5. Šta radi `concurrency` sa `cancel-in-progress: true`?
- [ ] Pokreće sve poslove paralelno
- [x] Otkazuje prethodno pokretanje iste grupe kad stigne novo
- [ ] Zabranjuje dva workflow-a u repou
- [ ] Ponavlja neuspele poslove
> Korisno kad se na istu granu pushuje više puta zaredom.

## Izvori
- [GitHub Docs: Actions](https://docs.github.com/en/actions)
- [GitHub Docs: OIDC za cloud provajdere](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Docs: OIDC u Azure-u (`id-token: write`)](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure)
- [GitHub Docs: okruženja i required reviewers](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Docs: PostgreSQL kao service kontejner](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)
- [Node.js: verzije i kraj podrške](https://endoflife.date/nodejs)
=====
---
id: "C3"
region: "C"
level: "SREDNJI NIVO"
title: "Redis u praksi"
subtitle: "cache-aside, TTL, HybridCache, rate limit, Valkey"
minutes: 50
---
# C3 Redis u praksi

Redis je baza u memoriji koja čuva parove ključ–vrednost i odgovara za manje od milisekunde. U .NET aplikacijama najčešće služi kao distribuirani keš (zajednički za sve instance API-ja), za brojače i rate limit, i kao SignalR backplane (poglavlje 44 vodiča).

## Pojmovi

| Tip u Redisu | Primer |
|---|---|
| String | `artikal:42` → JSON artikla |
| Hash | polja jednog objekta |
| List / Stream | jednostavan red poruka, dnevnik događaja |
| Set / Sorted set | jedinstveni posetioci; rang lista po skoru |

Svaki ključ može da ima **TTL** (vreme života) posle koga sam nestaje.

### Cache-aside

Pitaj keš → ako nema (cache miss), pročitaj iz baze → upiši u keš sa TTL-om. Pri izmeni u bazi obriši ključ. Nivoi keša, od browsera do Redisa, i invalidacija su u vodiču, pogl. 44.

### HybridCache

Biblioteka iz 2025. (NuGet paket; radi i na starijim verzijama .NET-a, sve do .NET Framework 4.7.2). Spaja lokalnu memoriju i distribuirani keš (Redis), i sam sprečava **stampede**: kad 100 zahteva u istoj instanci istovremeno traži isti ključ koji ne postoji, fabrika (upit u bazu) se izvrši samo jednom, a ostali čekaju njen rezultat. Između više servera nema distribuiranog zaključavanja, pa u najgorem slučaju bazu pita po jedna instanca.

```csharp
// paketi: Microsoft.Extensions.Caching.Hybrid, Microsoft.Extensions.Caching.StackExchangeRedis
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = "localhost:6379");
builder.Services.AddHybridCache(o => o.DefaultEntryOptions = new()
{
    Expiration = TimeSpan.FromMinutes(5),
    LocalCacheExpiration = TimeSpan.FromMinutes(1)
});

public class ArtikliServis(HybridCache cache, AppDb db)
{
    public ValueTask<ArtikalDto?> Daj(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync($"artikal:{id}",
            async t => await db.Artikli.Where(a => a.Id == id).Select(a => new ArtikalDto(a.Id, a.Naziv)).FirstOrDefaultAsync(t),
            tags: ["artikli"], cancellationToken: ct);

    public ValueTask Izmenjen(int id) => cache.RemoveAsync($"artikal:{id}");
}
```

`RemoveAsync` briše ključ u lokalnoj memoriji te instance i u Redisu, ali ne i u lokalnoj memoriji ostalih instanci. One mogu da vraćaju staru vrednost dok ne istekne `LocalCacheExpiration`, zato je lokalno trajanje kraće od ukupnog.

### Šta keširati, a šta ne

- Da: podaci koji se često čitaju, a retko menjaju (katalog, podešavanja, izračunati izveštaji).
- Ne: stanje zaliha u trenutku prodaje ili bilo šta gde zastareo podatak pravi štetu; tu je baza jedini izvor istine.

### Licenca

Redis je 2024. promenio licencu, a 2025. dodao AGPL opciju; zajednica je napravila **Valkey**, fork pod BSD licencom koji je kompatibilan sa Redis klijentima. Za učenje i male projekte oba rade isto.

## Lab

1. Dodaj Redis (ili Valkey) u `docker-compose.yml` Biblioteke: `image: redis:8` ili `valkey/valkey:8`.
2. Keširaj `GET /api/books/{id}` pomoću HybridCache-a sa TTL-om od 5 minuta.
3. Pri izmeni knjige obriši ključ; dodaj test koji proverava da se posle izmene vraća nova vrednost.
4. Izmeri vreme odgovora sa i bez keša (100 zahteva, npr. `oha` ili `k6`).
5. Uđi u `redis-cli` i pogledaj ključeve (`KEYS *`, samo lokalno!) i njihov `TTL`.

**Gotovo je kad:** drugi zahtev za istu knjigu ne ide u bazu (vidiš u EF logu), a posle izmene se vraća nova vrednost.

## Pitanja sa intervjua

**P: Šta je cache stampede i kako se sprečava?**
Kad popularan ključ istekne, mnogo zahteva istovremeno ide u bazu. Rešenje: zaključavanje po ključu (HybridCache to radi sam, u okviru jedne instance), nasumičan TTL, ili osvežavanje pre isteka.

**P: Kako održavaš keš usklađenim sa bazom?**
Kratak TTL kao sigurnosna mreža i brisanje ključa pri svakoj izmeni. Za podatke gde zastarelost nije prihvatljiva, ne keširaš.

**P: API radi u 3 instance sa HybridCache-om i Redisom. Instanca A obriše ključ posle izmene. Šta vide B i C?**
Redis je očišćen, ali B i C i dalje imaju staru vrednost u svojoj lokalnoj memoriji dok ne istekne `LocalCacheExpiration`. Zato se lokalno trajanje drži kratkim (npr. 1 minut), a za podatke gde ni to nije prihvatljivo lokalni keš se isključuje.

## Test

### 1. Šta je cache-aside obrazac?
- [x] Aplikacija prvo pita keš, a ako nema, čita iz baze i upisuje u keš
- [ ] Baza sama upisuje u keš
- [ ] Keš se puni samo pri pokretanju
- [ ] Svaki upis ide prvo u keš, pa u bazu kasnije
> Aplikacija upravlja kešom; baza ne zna da on postoji.

### 2. Zašto distribuirani keš, a ne `IMemoryCache`, kad API radi u 3 instance?
- [x] Svaka instanca ima svoju memoriju, pa bi keševi bili različiti
- [ ] IMemoryCache je sporiji
- [ ] IMemoryCache ne podržava TTL
- [ ] Redis je besplatan, a IMemoryCache nije
> Distribuirani keš je zajednički za sve instance.

### 3. Šta HybridCache radi kad 50 zahteva u istoj instanci istovremeno traži nepostojeći ključ?
- [x] Izvrši fabriku jednom, a ostali čekaju isti rezultat
- [ ] Šalje 50 upita bazi
- [ ] Baca izuzetak
- [ ] Vraća null svima
> Zaštita od stampede-a je ugrađena, ali važi unutar jedne instance; između servera nema distribuiranog zaključavanja.

### 4. Šta NE treba keširati?
- [ ] Listu kategorija
- [ ] Podešavanja aplikacije
- [ ] Mesečni izveštaj
- [x] Trenutno stanje zaliha pri potvrdi prodaje
> Pri prodaji odluka mora da se zasniva na tačnom stanju iz baze (u transakciji).

### 5. Šta je Valkey?
- [ ] Klijentska biblioteka za .NET
- [x] Open-source fork Redisa, kompatibilan sa njegovim klijentima
- [ ] Azure usluga za tajne
- [ ] Format serijalizacije
> Nastao je posle promene Redis licence 2024.

## Izvori
- [Microsoft Learn: HybridCache](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/hybrid)
- [Redis dokumentacija](https://redis.io/docs/latest/)
- [Valkey](https://valkey.io/)
=====
---
id: "C4"
region: "C"
level: "SREDNJI NIVO"
title: "Poruke: RabbitMQ"
subtitle: "exchange, queue, ack, DLQ, idempotentnost, outbox, biblioteke"
minutes: 60
---
# C4 Poruke: RabbitMQ

Poglavlje 16 vodiča ima red poslova u bazi. Kad više servisa treba da reaguje na isti događaj, ili kad je opterećenje veliko, koristi se broker poruka. Pošiljalac objavi poruku i ide dalje; primalac je obradi kad stigne. Servisi se tako ne čekaju i ne padaju zajedno.

## Pojmovi

| Pojam | Značenje |
|---|---|
| Producer / Consumer | ko šalje / ko obrađuje |
| Queue | red u kom poruke čekaju obradu |
| Exchange | prima poruke i usmerava ih u redove po pravilima |
| Binding / routing key | pravilo koje vezuje exchange za red |
| Ack | potvrda da je poruka obrađena; tek tada je broker briše |
| Prefetch | koliko neobrađenih poruka consumer sme da drži odjednom |
| Dead letter queue (DLQ) | red za poruke koje su odbijene bez vraćanja, istekle ili pale previše puta; puni ga dead letter exchange (DLX) |

| Exchange tip | Kome ide poruka |
|---|---|
| direct | redu čiji binding ključ tačno odgovara |
| topic | po šablonu (`pozajmica.*`) |
| fanout | svim vezanim redovima |

### Garancije i šta one traže od tebe

RabbitMQ daje **at-least-once** samo ako uradiš svoj deo: trajan (durable) red, trajne (persistent) poruke, **publisher confirms** (broker potvrđuje produceru da je poruku sačuvao; bez toga poruka može da se izgubi ako broker padne pre upisa na disk) i ručni ack na strani consumer-a. Poruka tada može stići dva puta (consumer pao posle obrade, a pre ack-a). Zato obrada mora biti **idempotentna**: drugi put ne pravi štetu. Najlakše: čuvaj `MessageId` obrađenih poruka i preskoči već viđene. Druga varijanta je obrada po ciljnom stanju umesto po prelazu (vodič, pogl. 16).

### Dead lettering

Poruka ide na dead letter exchange kad je consumer odbije sa `requeue: false` (`BasicReject`/`BasicNack`), kad joj istekne TTL, kad red pređe ograničenje dužine, ili kad je u **quorum** redu isporučena više puta od `delivery-limit` (od RabbitMQ 4.0 podrazumevano 20). Ako DLX nije podešen, takva poruka se jednostavno briše.

### Outbox obrazac

Problem: upišeš pozajmicu u bazu, a objava poruke padne (ili obrnuto). Rešenje: u **istoj transakciji** upiši pozajmicu i poruku u tabelu `Outbox`; poseban pozadinski posao čita outbox i objavljuje na broker. Baza i poruke ostaju usklađene. Isti obrazac, i varijantu u kojoj se podatak samo označi kao izmenjen, opisuje vodič u pogl. 16.

### Biblioteke u .NET-u (stanje 2026)

| Opcija | Licenca | Kada |
|---|---|---|
| `RabbitMQ.Client` | open source | učenje osnova, potpuna kontrola |
| MassTransit v8 | Apache 2.0 | postojeći projekti; zakrpe najmanje do kraja 2026. |
| MassTransit v9 | komercijalna | firme koje plaćaju licencu |
| Wolverine | MIT | besplatna alternativa sa outbox-om |

Na intervjuu je dobro znati da su MassTransit (v9) i MediatR prešli na komercijalne licence; to utiče na izbor biblioteka u novim projektima.

```csharp
// RabbitMQ.Client 7 (async API): objava
var factory = new ConnectionFactory { HostName = "localhost" };
await using var conn = await factory.CreateConnectionAsync();
await using var ch = await conn.CreateChannelAsync();
await ch.QueueDeclareAsync("pozajmice", durable: true, exclusive: false, autoDelete: false);
var body = JsonSerializer.SerializeToUtf8Bytes(new PozajmicaKreirana(knjigaId, clanId));
await ch.BasicPublishAsync("", "pozajmice", mandatory: false,
    basicProperties: new BasicProperties { Persistent = true, MessageId = Guid.NewGuid().ToString() }, body: body);

// sa publisher confirms: BasicPublishAsync čeka potvrdu brokera i baca izuzetak ako je nema
await using var potvrdjen = await conn.CreateChannelAsync(new CreateChannelOptions(
    publisherConfirmationsEnabled: true, publisherConfirmationTrackingEnabled: true));
```

## Lab

1. Pokreni RabbitMQ: `docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:4-management` i otvori panel na `localhost:15672` (guest/guest).
2. U Biblioteka API-ju posle pozajmice objavi `PozajmicaKreirana` u red `pozajmice`.
3. Napravi Worker projekat (`dotnet new worker`) koji čita red, „šalje email” (log) i tek onda radi ack.
4. Ugasi worker, napravi 5 pozajmica, upali ga: sve poruke moraju da se obrade.
5. Napravi idempotentnost: tabela `ObradjenePoruke(MessageId)`; ista poruka poslata dva puta pravi jedan email.
6. Bonus: outbox tabela u istoj transakciji kao pozajmica + `BackgroundService` koji je prazni.

**Gotovo je kad:** gašenje workera ne gubi poruke, a duplirana poruka ne pravi dupli email.

## Pitanja sa intervjua

**P: Zašto obrada poruka mora biti idempotentna?**
Broker garantuje bar jednu isporuku, ne tačno jednu. Ako consumer padne posle obrade, a pre ack-a, poruka stiže ponovo.

**P: Šta rešava outbox obrazac?**
Atomičnost između upisa u bazu i objave poruke: oba idu u istu transakciju u bazi, a objava se radi naknadno i ponavlja dok ne uspe.

**P: RabbitMQ ili Kafka?**
RabbitMQ za poslove (poruka se obradi i nestane, rutiranje). Kafka za tok događaja koji se čuva i koji više čitalaca može da čita iznova (vodič, pogl. 44).

**P: Kako producer zna da je broker zaista sačuvao poruku?**
Preko publisher confirms: kanal u confirm režimu dobija potvrdu (ack) od brokera kad je poruka preuzeta, a za trajnu poruku u trajnom redu tek kad je upisana. Bez potvrda, poruka može da nestane ako broker padne pre upisa na disk, a producer to ne bi primetio.

**P: Kada poruka završi u dead letter queue?**
Kad je consumer odbije sa `requeue: false`, kad istekne njen TTL, kad red pređe ograničenje dužine, ili kad je u quorum redu isporučena više puta od `delivery-limit` (podrazumevano 20 od RabbitMQ 4.0). Samo ako je podešen dead letter exchange; inače se briše.

## Test

### 1. Kada RabbitMQ briše poruku iz reda kad consumer koristi ručni ack?
- [x] Kad consumer pošalje ack
- [ ] Kad producer potvrdi
- [ ] Čim je consumer primi
- [ ] Posle 24 sata
> Bez ack-a (npr. consumer padne) poruka se vraća u red i isporučuje ponovo. Uz automatski ack (`autoAck: true`) briše se čim je isporučena.

### 2. Koja garancija isporuke važi uz ack?
- [ ] Tačno jednom
- [ ] Najviše jednom
- [x] Bar jednom
- [ ] Nijedna
> Zato consumer mora biti idempotentan.

### 3. Koji exchange tip šalje poruku svim vezanim redovima?
- [x] fanout
- [ ] headers
- [ ] direct
- [ ] topic
> Fanout ignoriše routing key i kopira poruku u sve redove.

### 4. Šta rešava outbox obrazac?
- [ ] Previše poruka u redu
- [ ] Šifrovanje poruka
- [ ] Spore upite u bazi
- [x] Neusklađenost kad upis u bazu uspe, a objava poruke ne (ili obrnuto)
> Poruka se upisuje u istu transakciju kao podaci i objavljuje naknadno.

### 5. Gde završava poruka koja padne posle maksimalnog broja pokušaja?
- [ ] Briše se
- [ ] Vraća se produceru
- [ ] U log fajl brokera
- [x] U dead letter queue
> Ako je podešen dead letter exchange; bez njega se poruka briše. DLQ čuva problematične poruke za pregled i ručnu ponovnu obradu.

## Izvori
- [RabbitMQ tutorijali (.NET)](https://www.rabbitmq.com/tutorials)
- [RabbitMQ: potvrde consumer-a i publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ: dead letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [RabbitMQ: quorum redovi i delivery-limit](https://www.rabbitmq.com/docs/quorum-queues)
- [Najava MassTransit v9 i licence](https://masstransit.io/introduction/v9-announcement)
- [Wolverine](https://wolverinefx.net/)
=====
---
id: "C5"
region: "C"
level: "NAPREDNI NIVO"
title: "Infrastruktura kao kod"
subtitle: "Terraform, OpenTofu, Bicep: plan, apply, state, moduli"
minutes: 50
---
# C5 Infrastruktura kao kod

Umesto da resurse praviš klikom u portalu, opišeš ih u fajlu koji je u Gitu. Alat uporedi opis sa stvarnim stanjem i napravi samo razliku. Infrastruktura tako postaje ponovljiva (isto okruženje za test i produkciju), pregledljiva kroz pull request i obnovljiva posle greške. Vodič je pominje u pogl. 38 (Infrastructure as Code); ovde je praksa sa Terraformom.

## Pojmovi

| Pojam | Značenje |
|---|---|
| Deklarativno | opisuješ ŠTA treba da postoji, ne korake KAKO |
| Provider | dodatak za određeni cloud (`azurerm`, `aws`, `cloudflare`) |
| State | fajl u kom alat pamti šta je napravio; deli se timski (npr. u Blob Storage-u) |
| Plan | pregled izmena pre primene |
| Apply | primena izmena |
| Drift | stvarno stanje se razlikuje od koda (neko kliknuo u portalu) |
| Modul | ponovo upotrebljiva grupa resursa |

### Alati

| Alat | Za šta | Napomena |
|---|---|---|
| Terraform | bilo koji cloud | licenca BSL od 2023. |
| OpenTofu | isto što i Terraform | open-source fork, isti jezik (HCL) |
| Bicep | samo Azure | Microsoftov jezik, bez state fajla |

```hcl
terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
}

# Od azurerm 4.0 subscription_id je obavezan: ovde ga provider čita
# iz promenljive okruženja ARM_SUBSCRIPTION_ID (može i subscription_id = "..." u bloku).
provider "azurerm" {
  features {}
}

variable "env" { default = "test" }

resource "azurerm_resource_group" "rg" {
  name     = "rg-biblioteka-${var.env}"
  location = "westeurope"
}

resource "azurerm_service_plan" "plan" {
  name                = "plan-biblioteka-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}
```

```
terraform init     # preuzmi providere
terraform plan     # šta će se promeniti
terraform apply    # primeni
terraform destroy  # obriši sve (za vežbu)
```

### Pravila

- Nikad ručne izmene u portalu za resurse pod IaC-om.
- `plan` ide u pull request, `apply` radi pipeline posle odobrenja.
- Tajne ne idu u `.tf` fajlove ni u state bez zaštite; state sadrži osetljive podatke.

## Lab

1. Instaliraj Terraform ili OpenTofu i Azure CLI; uloguj se i postavi `ARM_SUBSCRIPTION_ID` (`az account show --query id -o tsv`).
2. Opiši resource group, App Service plan i Linux Web App za Biblioteku (pogledaj `azurerm_linux_web_app` u dokumentaciji).
3. `plan` → `apply`; promeni SKU u kodu i vidi da `plan` pokazuje samo tu izmenu.
4. Ručno promeni tag u portalu i pokreni `plan`: uoči drift.
5. Izdvoji promenljivu `env` i napravi okruženja `test` i `prod` iz istog koda (`-var env=prod`).
6. `destroy` na kraju.

**Gotovo je kad:** cela infrastruktura nastaje iz koda jednom komandom i nestaje drugom, a drift je vidljiv u `plan`-u.

## Pitanja sa intervjua

**P: Šta je Terraform state i zašto je važan?**
Mapa između koda i stvarnih resursa. Bez njega alat ne zna šta je već napravio. U timu se čuva udaljeno, sa zaključavanjem da dva apply-a ne idu istovremeno.

**P: Gde čuvaš Terraform state za Azure projekat u timu?**
U backend-u `azurerm`: state je blob u Azure Storage kontejneru, a zaključavanje i provera konzistentnosti koriste mogućnosti samog Blob Storage-a. Pristup storage nalogu se ograničava jer state sadrži osetljive podatke.

**P: Deklarativni ili imperativni pristup infrastrukturi?**
Deklarativni opisuje ciljno stanje i ponavljanje je bezbedno (idempotentno). Imperativne skripte (`az create …`) zavise od redosleda i trenutnog stanja.

## Test

### 1. Šta radi `terraform plan`?
- [ ] Preuzima providere
- [x] Prikazuje izmene koje bi apply napravio
- [ ] Pravi resurse
- [ ] Briše state
> Plan je pregled bez promena; apply primenjuje.

### 2. Šta je drift?
- [ ] Nova verzija providera
- [ ] Spor deploy
- [x] Razlika između stvarne infrastrukture i koda
- [ ] Greška u sintaksi HCL-a
> Nastaje kad neko menja resurse mimo IaC-a.

### 3. Koja je prednost Bicep-a u odnosu na Terraform?
- [ ] Radi na svim cloudovima
- [x] Nema state fajl o kom treba brinuti (Azure prati stanje)
- [ ] Brži je za AWS
- [ ] Ne zahteva nalog
> Bicep je samo za Azure, ali Azure Resource Manager sam zna stanje.

### 4. Šta je OpenTofu?
- [ ] Azure usluga
- [ ] Alat za Kubernetes
- [x] Open-source fork Terraform-a sa istim jezikom
- [ ] Format state fajla
> Nastao je posle promene Terraform licence na BSL 2023.

### 5. Zašto state ne sme da bude samo na laptopu jednog člana tima?
- [x] Drugi ne mogu bezbedno da menjaju infrastrukturu, a gubitak laptopa gubi mapu resursa
- [ ] Prevelik je
- [ ] Terraform to zabranjuje
- [ ] Zbog brzine
> Udaljeni state sa zaključavanjem je standard za timski rad.

## Izvori
- [HashiCorp: Terraform tutorijali za Azure](https://developer.hashicorp.com/terraform/tutorials/azure-get-started)
- [OpenTofu dokumentacija](https://opentofu.org/docs/)
- [HashiCorp: backend azurerm (state u Blob Storage-u, zaključavanje)](https://developer.hashicorp.com/terraform/language/backend/azurerm)
- [HashiCorp podrška: subscription_id obavezan od azurerm 4.0](https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM)
- [Microsoft Learn: Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
=====
---
id: "C6"
region: "C"
level: "NAPREDNI NIVO"
title: "Kubernetes osnove"
subtitle: "pod, deployment, service, ingress, probe, config"
minutes: 60
---
# C6 Kubernetes osnove

Docker Compose pokreće kontejnere na jednom serveru. Kubernetes (K8s) radi to na mnogo servera: sam bira gde će kontejner raditi, podiže novi kad stari padne, raspoređuje saobraćaj i menja verzije bez prekida. Za jednu aplikaciju na jednom VPS-u je preteran (vodič, pogl. 36), ali se traži u mnogim firmama, pa treba znati osnovne pojmove.

## Pojmovi

| Objekat | Šta je | Poređenje sa Compose-om |
|---|---|---|
| Pod | jedan ili više kontejnera koji rade zajedno | jedan pokrenut servis |
| Deployment | željeni broj replika podova i verzija image-a | `deploy.replicas` + `image` |
| Service | stabilna adresa i load balancing ka podovima | ime servisa u mreži |
| Ingress / Gateway API | HTTP ulaz spolja, rutiranje po domenu i putanji | Caddy/Nginx (vodič, pogl. 37) |
| ConfigMap / Secret | konfiguracija i tajne kao promenljive ili fajlovi | `environment`, `.env` |

Ingress API je zamrznut (radi, ali se ne razvija); Kubernetes preporučuje **Gateway API** (`Gateway` + `HTTPRoute`). Popularni kontroler ingress-nginx je povučen u martu 2026. i više ne dobija bezbednosne zakrpe.

Secret nije šifrovan: vrednosti su samo base64, a u etcd-u se podrazumevano čuvaju nešifrovane. Uključi šifrovanje u mirovanju i ograniči ko može da čita Secret-e (RBAC).
| Namespace | izolovan prostor za grupu resursa | odvojen compose projekat |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: biblioteka-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: biblioteka-api } }
  template:
    metadata: { labels: { app: biblioteka-api } }
    spec:
      containers:
        - name: api
          image: ghcr.io/miljan/biblioteka-api:1.4.0
          ports: [{ containerPort: 8080 }]
          envFrom: [{ secretRef: { name: biblioteka-secrets } }]
          readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }
          livenessProbe:  { httpGet: { path: /health/live,  port: 8080 } }
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { memory: 512Mi }
---
apiVersion: v1
kind: Service
metadata: { name: biblioteka-api }
spec:
  selector: { app: biblioteka-api }
  ports: [{ port: 80, targetPort: 8080 }]
```

### Probe

- **Readiness:** da li pod sme da prima saobraćaj (npr. baza dostupna). Ako ne, Service ga preskače.
- **Liveness:** da li je proces zaglavljen. Ako ne odgovara, K8s ga restartuje.
- **Startup:** za aplikacije koje se sporo pokreću. Dok ne prođe, liveness i readiness se ne proveravaju, pa spor start ne izaziva restart.

Pogrešna liveness proba (npr. koja proverava bazu) može da restartuje sve podove kad baza zakašnjava; liveness proverava samo proces.

### Komande

```
kubectl apply -f k8s/          # primeni sve fajlove
kubectl get pods               # stanje podova
kubectl logs deploy/biblioteka-api
kubectl rollout status deploy/biblioteka-api
kubectl rollout undo deploy/biblioteka-api   # vrati prethodnu verziju
```

## Lab

1. Instaliraj `kind` (ili minikube) i `kubectl`; napravi lokalni klaster `kind create cluster`.
2. U Biblioteka API dodaj `/health/live` i `/health/ready` (`AddHealthChecks`, poglavlje 39 vodiča).
3. Napiši Deployment (3 replike), Service i Secret za connection string; Postgres pokreni kao poseban Deployment ili van klastera.
4. `kubectl port-forward svc/biblioteka-api 8080:80` i proveri API.
5. Obriši jedan pod (`kubectl delete pod …`) i gledaj kako se novi podiže.
6. Promeni verziju image-a, prati `rollout status`, pa uradi `rollout undo`.

**Gotovo je kad:** brisanje poda ne prekida API, a nova verzija se uvodi i vraća bez zastoja.

## Pitanja sa intervjua

**P: Razlika između readiness i liveness probe?**
Readiness odlučuje da li pod prima saobraćaj; liveness da li ga treba restartovati. Liveness ne sme zavisiti od spoljnih sistema.

**P: Compose ili Kubernetes?**
Compose za jedan server i mali tim. Kubernetes kad treba više servera, automatsko skaliranje i oporavak, i kad postoji tim (ili upravljana usluga kao AKS) da ga održava.

**P: Da li je Kubernetes Secret bezbedno mesto za lozinku?**
Ne sam po sebi. Vrednosti su base64 (kodiranje, ne šifrovanje) i u etcd-u se podrazumevano čuvaju nešifrovane; ko ima pristup API-ju ili etcd-u može da ih pročita. Treba uključiti šifrovanje u mirovanju, ograničiti pristup kroz RBAC, ili tajne držati u spoljnom sefu (npr. Key Vault preko CSI drajvera).

**P: Ingress ili Gateway API?**
Za nove projekte Gateway API: Kubernetes ga preporučuje, a Ingress API je zamrznut. Gateway odvaja ulogu infrastrukture (`Gateway`) od rutiranja aplikacije (`HTTPRoute`). Uz to je ingress-nginx povučen u martu 2026, pa postojeće instalacije treba preseliti.

## Test

### 1. Šta Kubernetes radi kad pod iz Deployment-a padne?
- [x] Pravi novi pod da održi željeni broj replika
- [ ] Ništa, čeka ručnu intervenciju
- [ ] Gasi ceo Deployment
- [ ] Šalje email
> Deployment (preko svog ReplicaSet-a) stalno usklađuje stvarno stanje sa željenim.

### 2. Čemu služi Service?
- [ ] Gradi Docker image
- [x] Daje stabilnu adresu i raspoređuje saobraćaj na podove
- [ ] Čuva tajne
- [ ] Pokreće migracije
> Podovi dolaze i odlaze sa novim IP adresama; Service je stalna tačka.

### 3. Šta se desi kad readiness proba ne prolazi?
- [ ] Pod se restartuje
- [ ] Ceo klaster staje
- [ ] Image se ponovo preuzima
- [x] Pod se izbacuje iz saobraćaja dok proba ne prođe
> Restart je posao liveness probe.

### 4. Zašto liveness proba ne treba da proverava bazu?
- [ ] Liveness ne sme da vraća 200
- [ ] Zbog licence
- [x] Kad baza zakasni, svi podovi bi se restartovali bez koristi
- [ ] Baza ne podržava HTTP
> Restart aplikacije ne popravlja bazu, a pravi lavinu restartova.

### 5. Koja komanda vraća prethodnu verziju Deployment-a?
- [ ] kubectl delete deploy
- [ ] kubectl apply --previous
- [x] kubectl rollout undo
- [ ] kubectl restore
> Kubernetes čuva istoriju revizija Deployment-a.

## Izvori
- [Kubernetes: osnovni tutorijal](https://kubernetes.io/docs/tutorials/kubernetes-basics/)
- [kind: lokalni klaster](https://kind.sigs.k8s.io/)
- [Kubernetes: startup, liveness i readiness probe](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes: Secret (podrazumevano nešifrovan u etcd-u)](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Ingress (API zamrznut, preporuka Gateway API)](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes blog: povlačenje ingress-nginx](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
=====
---
id: "C7"
region: "C"
level: "NAPREDNI NIVO"
title: "Observability"
subtitle: "logovi, metrike, tragovi, OpenTelemetry, Grafana"
minutes: 50
---
# C7 Observability

Kad nešto pukne u produkciji, ne možeš da staviš breakpoint. Observability je sposobnost da iz podataka koje sistem šalje odgovoriš na pitanje „šta se desilo i zašto”. Tri stuba: logovi (šta se desilo), metrike (koliko i koliko brzo) i tragovi (kuda je prošao jedan zahtev). Vodič ih uvodi u poglavlju 39; ovde ih povezuješ.

## Pojmovi

| Stub | Pitanje | Primer |
|---|---|---|
| Logovi | šta se desilo? | `Pozajmica {LoanId} odbijena: {Razlog}` |
| Metrike | koliko? koliko brzo? | broj zahteva, p95 latencija, greške u minuti |
| Tragovi (traces) | gde je zahtev proveo vreme? | API 40 ms → baza 900 ms → spoljni servis 30 ms |

**OpenTelemetry (OTel)** je otvoren standard i skup biblioteka za sva tri stuba. Aplikacija šalje podatke u OTLP formatu, a ti biraš gde ih gledaš (Grafana, Seq, Jaeger, Application Insights) bez promene koda.

```csharp
// paketi: OpenTelemetry.Extensions.Hosting, OpenTelemetry.Instrumentation.AspNetCore,
//         OpenTelemetry.Instrumentation.Http, OpenTelemetry.Instrumentation.Runtime,
//         OpenTelemetry.Exporter.OpenTelemetryProtocol
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("biblioteka-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource("Biblioteka")          // tvoji ručni spanovi (ActivitySource)
        .AddOtlpExporter())
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddMeter("Biblioteka")           // tvoje metrike (Meter); bez ovoga se ne izvoze
        .AddOtlpExporter());
builder.Logging.AddOpenTelemetry(o => o.AddOtlpExporter());
```

### Strukturirani logovi

```csharp
// dobro: polja se mogu pretraživati
logger.LogWarning("Pozajmica {LoanId} odbijena za člana {MemberId}", loanId, memberId);
// loše: tekst bez strukture, i skupo formatiranje i kad je nivo isključen
logger.LogWarning($"Pozajmica {loanId} odbijena za člana {memberId}");
```

Svaki log nosi `TraceId`, pa iz greške u logu skočiš na ceo trag zahteva. Strukturisano logovanje i nivoi su u vodiču, pogl. 8, a `traceId` u ProblemDetails odgovoru u pogl. 11.

### Šta pratiti: RED

- **R**ate: zahteva u sekundi
- **E**rrors: procenat grešaka
- **D**uration: latencija (p50, p95, p99, ne prosek)

Na osnovu toga se postavljaju **SLO** ciljevi (npr. 99% zahteva ispod 300 ms) i upozorenja.

## Lab

1. Pokreni ceo Grafana stek jednom komandom: `docker run -d -p 3000:3000 -p 4317:4317 -p 4318:4318 grafana/otel-lgtm`.
2. Dodaj OpenTelemetry u Biblioteka API kao gore (endpoint `http://localhost:4317`).
3. Dodaj ručni span oko poslovne operacije: `ActivitySource("Biblioteka").StartActivity("Pozajmi")` sa tagom `knjiga.id`.
4. Dodaj sopstvenu metriku `pozajmice_ukupno` (`Meter` + `Counter<long>`).
5. U Grafani (localhost:3000) nađi trag sporog zahteva i povezani log po TraceId-u.
6. Napravi dashboard sa RED metrikama za API.

**Gotovo je kad:** iz jedne greške u logu dođeš do celog traga zahteva, a dashboard pokazuje p95 latenciju po endpointu.

## Pitanja sa intervjua

**P: Razlika između logova, metrika i tragova?**
Logovi su pojedinačni događaji sa detaljima, metrike su agregirani brojevi kroz vreme (jeftine za čuvanje i upozorenja), tragovi prate jedan zahtev kroz sve servise.

**P: Zašto p95 latencija, a ne prosek?**
Prosek sakriva spore zahteve: 90 zahteva od 50 ms i 10 od 3 s daju prosek od 345 ms, što izgleda prihvatljivo, a p95 je 3 s i pokazuje da svaki deseti korisnik čeka. Percentil pokazuje iskustvo najsporijih.

**P: Dodao si `Meter("Biblioteka")` i brojač, ali metrika ne stiže u Grafanu. Zašto?**
OpenTelemetry izvozi samo metrike iz meter-a koje si prijavio: treba `.AddMeter("Biblioteka")` u `WithMetrics`. Isto važi za ručne spanove: `ActivitySource` mora da se prijavi sa `.AddSource(...)`, inače `StartActivity` vraća `null`.

## Test

### 1. Šta OpenTelemetry omogućava?
- [x] Standardan način prikupljanja logova, metrika i tragova nezavisno od alata za prikaz
- [ ] Samo slanje logova u Azure
- [ ] Zamenu za ILogger
- [ ] Automatsko ispravljanje grešaka
> Menjaš backend (Grafana, Seq, App Insights) bez izmene koda.

### 2. Koji log je bolji?
- [x] `LogInformation("Korisnik {UserId} prijavljen", id)`
- [ ] `LogInformation($"Korisnik {id} prijavljen")`
- [ ] `Console.WriteLine("Korisnik prijavljen")`
- [ ] Svejedno je, oba daju isto u logu
> Šablon pravi strukturirano polje `UserId` po kom se pretražuje; interpolacija pravi običan tekst.

### 3. Šta pokazuje trag (trace)?
- [ ] Broj zahteva u minuti
- [ ] Iskorišćenost procesora
- [x] Put jednog zahteva kroz servise i koliko je trajao svaki deo
- [ ] Listu grešaka
> Trag se sastoji od spanova povezanih istim TraceId-om.

### 4. Šta znači RED?
- [ ] Read, Edit, Delete
- [ ] Redis, Elastic, Docker
- [x] Rate, Errors, Duration
- [ ] Restart, Escalate, Deploy
> Tri ključne metrike za svaki servis koji odgovara na zahteve.

### 5. Zašto se prati p95, a ne prosečna latencija?
- [ ] p95 je uvek manji
- [ ] Lakše se računa
- [ ] Prosek nije podržan u OTel-u
- [x] Prosek sakriva mali procenat veoma sporih zahteva
> Percentili pokazuju šta doživljavaju najsporiji korisnici.

## Izvori
- [OpenTelemetry za .NET](https://opentelemetry.io/docs/languages/dotnet/)
- [Microsoft Learn: .NET observability sa OpenTelemetry](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
- [Grafana dokumentacija](https://grafana.com/docs/)
- [OpenTelemetry .NET: ručna instrumentacija (AddSource, AddMeter)](https://opentelemetry.io/docs/languages/dotnet/instrumentation/)
=====
---
id: "C8"
region: "C"
level: "NAPREDNI NIVO"
title: "Aspire"
subtitle: "AppHost, resursi, dashboard, service discovery, deploy"
minutes: 45
---
# C8 Aspire

Aspire (do verzije 13 zvao se „.NET Aspire”) opisuje celu aplikaciju kao C# kod: API, React, Postgres, Redis i veze među njima. Jednom komandom podigne sve lokalno, poveže connection stringove, uključi OpenTelemetry i otvori dashboard sa logovima i tragovima svih servisa. Zamenjuje ručno nameštanje `docker-compose.yml` i `.env` fajlova za razvoj (vodič, pogl. 36 i 40). Aspire 13 traži .NET 10 SDK.

## Pojmovi

| Pojam | Šta je |
|---|---|
| AppHost | projekat koji opisuje sve resurse i veze |
| Resurs | projekat, kontejner, baza, npm/Vite aplikacija |
| `WithReference` | ubaci connection string ili adresu jednog resursa u drugi |
| `WaitFor` | ne pokreći dok zavisnost nije spremna |
| ServiceDefaults | zajedničko podešavanje: OTel, health checks, otpornost HTTP klijenata |
| Dashboard | logovi, tragovi i metrike svih resursa na jednom mestu |

```csharp
// AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var db = builder.AddPostgres("pg").WithDataVolume().AddDatabase("biblioteka");
var cache = builder.AddRedis("cache");

var api = builder.AddProject<Projects.Biblioteka_Api>("api")
    .WithReference(db).WaitFor(db)
    .WithReference(cache);

builder.AddViteApp("web", "../web")      // React + Vite frontend
    .WithReference(api);

builder.Build().Run();
```

```csharp
// Biblioteka.Api/Program.cs: ime "biblioteka" se poklapa sa AddDatabase
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<LibraryDb>("biblioteka");
builder.AddRedisDistributedCache("cache");
```

### Komande

```
aspire new          # novi projekat iz šablona (ima i ASP.NET Core + React starter)
aspire run          # pokreni sve i otvori dashboard
aspire update       # podigni verzije paketa
```

### Aspire i produkcija

Aspire je pre svega alat za razvoj, ali može i da generiše artefakte za deploy (Docker Compose, Azure Container Apps, a od 13.3 u preview-u i Kubernetes/Helm). Na intervjuu je dovoljno znati: „Aspire mi daje lokalno okruženje sa svim zavisnostima i telemetrijom za par minuta.”

## Lab

1. Instaliraj Aspire CLI (uputstvo na aspire.dev) i napravi projekat iz ASP.NET Core + React šablona.
2. Pokreni `aspire run`, otvori dashboard i pronađi trag jednog zahteva od React-a do API-ja.
3. U Biblioteka rešenje dodaj AppHost i ServiceDefaults; prebaci Postgres i Redis iz Compose-a u AppHost.
4. Ukloni connection stringove iz `appsettings.Development.json`: moraju da dolaze kroz `WithReference`.
5. Uporedi: koliko koraka treba novom programeru da pokrene projekat sa Compose-om, a koliko sa Aspire-om.

**Gotovo je kad:** `aspire run` podiže bazu, keš, API i React, a dashboard prikazuje logove i tragove svih resursa.

## Pitanja sa intervjua

**P: Šta rešava Aspire?**
Lokalno pokretanje više servisa i zavisnosti iz koda, automatsko povezivanje (service discovery, connection stringovi) i ugrađenu telemetriju, umesto ručnih compose i env fajlova.

**P: Da li Aspire zamenjuje Kubernetes?**
Ne. Aspire opisuje aplikaciju i olakšava razvoj; za produkciju može da generiše artefakte za Compose, Azure ili Kubernetes, ali orkestraciju u produkciji i dalje radi platforma.

## Test

### 1. Šta je AppHost?
- [ ] Web server za produkciju
- [ ] Docker image
- [x] Projekat koji u kodu opisuje sve resurse aplikacije i njihove veze
- [ ] Azure usluga
> Iz AppHost-a Aspire pokreće projekte i kontejnere.

### 2. Šta radi `WithReference(db)`?
- [ ] Pravi kopiju baze
- [ ] Pokreće migracije
- [ ] Briše bazu posle gašenja
- [x] Ubacuje connection string baze u resurs koji je referencira
> Tako nema ručnih connection stringova u konfiguraciji za razvoj.

### 3. Šta daje `AddServiceDefaults()`?
- [ ] Samo Swagger
- [ ] Autentifikaciju
- [x] OpenTelemetry, health checks i otporne HTTP klijente sa zajedničkim podešavanjima
- [ ] EF Core migracije
> To je zajednički projekat koji Aspire šablon pravi za sve servise.

### 4. Koju verziju SDK-a traži Aspire 13?
- [ ] Bilo koju
- [ ] .NET 6
- [ ] .NET 8
- [x] .NET 10
> Aspire 13 je uz rebranding prešao na .NET 10 SDK.

### 5. Šta je najtačnije o Aspire-u i produkciji?
- [ ] Aspire je zamena za Azure
- [ ] Radi samo na Windowsu
- [ ] Aspire mora da radi u produkciji
- [x] Primarno je alat za razvoj, a može da generiše artefakte za deploy
> Dashboard i orkestracija su za razvoj; deploy ide na Compose, Azure ili Kubernetes.

## Izvori
- [aspire.dev: dokumentacija](https://aspire.dev)
- [Šta je novo u Aspire 13](https://aspire.dev/whats-new/aspire-13/)
- [Šta je novo u Aspire 13.3 (Kubernetes/Helm deploy, preview)](https://aspire.dev/whats-new/aspire-13-3/)
