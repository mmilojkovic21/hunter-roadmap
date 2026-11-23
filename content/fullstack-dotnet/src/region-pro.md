=====
---
id: "P1"
region: "PRO"
level: "KVALITET"
title: "Clean code i refaktorisanje"
subtitle: "imena, male metode, guard clauses, code smells"
minutes: 45
---
# P1 Clean code i refaktorisanje

Kod se piše jednom, a čita desetinama puta. Čist kod se čita kao opis posla: imena kažu šta nešto radi, metode su kratke, a neobičan slučaj je odmah vidljiv. Refaktorisanje je menjanje strukture koda bez promene ponašanja, i radi se bezbedno samo uz testove.

## Pojmovi

### Pre i posle

```csharp
// pre: šta je d? šta je 3? gde je glavni tok?
public bool Proc(Member m, Book b, int d)
{
    if (m != null) {
        if (m.Active) {
            if (b.Copies > 0) {
                if (m.Loans.Count < 3) { /* … 30 linija … */ return true; }
            }
        }
    }
    return false;
}

// posle: imena, konstanta, guard clauses, jedna odgovornost po metodi
private const int MaksPozajmica = 3;

public Result Pozajmi(Member clan, Book knjiga, int brojDana)
{
    if (!clan.Aktivan) return Result.Fail("Član nije aktivan");
    if (knjiga.SlobodnihPrimeraka == 0) return Result.Fail("Nema slobodnih primeraka");
    if (clan.Pozajmice.Count >= MaksPozajmica) return Result.Fail("Dostignut limit pozajmica");

    return KreirajPozajmicu(clan, knjiga, brojDana);
}
```

### Code smells (znaci da treba refaktorisati)

| Smell | Lek |
|---|---|
| Duga metoda | Extract Method |
| Duplirani kod | izdvoji zajedničku metodu ili klasu |
| Magični brojevi i stringovi | konstante, enum, konfiguracija |
| Mnogo parametara | objekat parametara (`record`) |
| Primitive obsession (`string email` svuda) | value object (`Email`) sa validacijom |
| Feature envy (metoda više koristi tuđe podatke) | premesti metodu u tu klasu (bogat domen, vodič pogl. 13) |
| Komentar koji objašnjava šta kod radi | bolje ime umesto komentara |

### Pravila u praksi

- **Imena:** `brojDana`, ne `d`; metoda je glagol (`Pozajmi`), klasa imenica.
- **Jedan nivo apstrakcije po metodi:** glavna metoda priča priču, detalji su u pomoćnim.
- **Boy scout rule:** ostavi fajl malo čistiji nego što si ga zatekao.
- **Refaktoriši u malim koracima**, testovi posle svakog koraka; refaktorisanje i nova funkcija ne idu u isti commit.

## Lab

1. Uzmi najdužu metodu u Biblioteci (ili napiši namerno lošu od 60 linija) i napiši testove koji pokrivaju njeno ponašanje.
2. Refaktoriši u koracima: imena → guard clauses → Extract Method → konstante. Posle svakog koraka `dotnet test` i commit.
3. Pretvori `string email` u value object `Email` sa validacijom u konstruktoru.
4. Uključi analizatore (`<AnalysisLevel>latest-recommended</AnalysisLevel>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`) i reši upozorenja.

**Gotovo je kad:** metoda je podeljena na delove kraće od 15 linija, testovi su isti i prolaze, a istorija commit-ova pokazuje male korake.

## Pitanja sa intervjua

**P: Šta je refaktorisanje i kako ga radiš bezbedno?**
Promena strukture bez promene ponašanja. Prvo testovi koji opisuju trenutno ponašanje, zatim mali koraci sa pokretanjem testova posle svakog.

**P: Kad komentar ima smisla?**
Kad objašnjava ZAŠTO (poslovno pravilo, zaobilaženje greške u biblioteci, odluka), a ne ŠTA kod radi; „šta” treba da kažu imena.

## Test

### 1. Šta je refaktorisanje?
- [ ] Ispravljanje bagova
- [ ] Prepisivanje u drugi jezik
- [ ] Dodavanje nove funkcije
- [x] Promena strukture koda bez promene ponašanja
> Ponašanje ostaje isto; to potvrđuju testovi.

### 2. Šta je guard clause?
- [ ] Try/catch oko cele metode
- [ ] Zaštita endpointa autorizacijom
- [x] Rana provera koja odmah izlazi iz metode za neispravan slučaj
- [ ] Komentar iznad metode
> Smanjuje ugnježdenost i ostavlja glavni tok na kraju.

### 3. Kako se leči „primitive obsession” za email?
- [ ] Više komentara
- [ ] Regex na svakom mestu gde se koristi
- [ ] Polje tipa `object`
- [x] Value object `Email` sa validacijom
> Validacija je na jednom mestu, a tip nosi značenje.

### 4. Koji komentar ima najviše smisla?
- [ ] `// povećaj i za 1`
- [ ] `// petlja kroz knjige`
- [x] `// Banka odbija iznose sa više od 2 decimale, pa zaokružujemo pre slanja`
- [ ] `// metoda za pozajmicu`
> Objašnjava razlog koji kod sam ne može da pokaže.

### 5. Šta je preduslov za bezbedno refaktorisanje?
- [ ] Odobrenje menadžera
- [ ] Code review
- [ ] Nova grana u Gitu
- [x] Testovi koji pokrivaju ponašanje koje menjaš
> Bez testova ne znaš da li si promenio ponašanje.

## Izvori
- [Refactoring Guru: refaktorisanje i code smells](https://refactoring.guru/refactoring)
- [Microsoft Learn: .NET analizatori koda](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)
=====
---
id: "P2"
region: "PRO"
level: "KVALITET"
title: "Dizajn obrasci"
subtitle: "Strategy, Decorator, Factory, Adapter, Observer, Repository"
minutes: 50
---
# P2 Dizajn obrasci

Dizajn obrazac je provereno rešenje za problem koji se stalno ponavlja. Ne uči se da bi se ubacio svuda, nego da prepoznaš problem i imaš zajednički rečnik sa timom („ovde treba Strategy”). Na intervjuima se najčešće pitaju obrasci koji se vide u svakodnevnom .NET kodu.

## Pojmovi

| Obrazac | Problem | U .NET-u već postoji kao |
|---|---|---|
| Strategy | isti posao, više načina (popusti, obračun poreza, slanje obaveštenja) | interfejs + više implementacija u DI |
| Decorator | dodati ponašanje oko postojećeg (log, keš, retry) bez menjanja njega | middleware, `DelegatingHandler` |
| Factory | pravljenje objekta zavisi od uslova | `IHttpClientFactory`, `ILoggerFactory` |
| Adapter | spoljna biblioteka ima drugačiji interfejs od tvog | omotač oko SDK-a (npr. WooCommerce klijent) |
| Observer | više delova reaguje na događaj | `event`, domain events, SignalR |
| Builder | složeno pravljenje objekta korak po korak | `WebApplication.CreateBuilder`, `StringBuilder` |
| Repository / Unit of Work | pristup podacima kroz kolekciju i jednu transakciju | `DbSet` i `DbContext` (vodič, pogl. 13) |
| Singleton | jedna instanca za celu aplikaciju | `AddSingleton` u DI (ne ručni statički singleton) |

### Strategy u praksi

```csharp
public interface IPopust { decimal Primeni(decimal iznos); string Kod { get; } }
public class BezPopusta : IPopust { public string Kod => "none"; public decimal Primeni(decimal i) => i; }
public class Procentualni(decimal p) : IPopust { public string Kod => "pct"; public decimal Primeni(decimal i) => i * (1 - p); }

// izbor bez if/else lanca: DI daje sve implementacije
public class Kasa(IEnumerable<IPopust> popusti)
{
    public decimal Naplati(decimal iznos, string kod) => popusti.Single(p => p.Kod == kod).Primeni(iznos);
}
```

Novi popust = nova klasa, bez izmene `Kasa` (Open/Closed iz vodiča, pogl. 13).

### Decorator u praksi

```csharp
public class KesiraniKatalog(IKatalog unutrasnji, HybridCache kes) : IKatalog
{
    public ValueTask<Knjiga?> Daj(int id) =>
        kes.GetOrCreateAsync($"knjiga:{id}", async _ => await unutrasnji.Daj(id));
}
```

### MediatR i licence

Mediator obrazac (MediatR) je čest u CQRS projektima, ali je MediatR 2025. prešao na komercijalnu licencu za firme. Mnogi timovi danas kontroler direktno vezuju za servis ili koriste jednostavan sopstveni dispatcher; tvoj vodič (pogl. 13) objašnjava i kad mediator uopšte ne treba.

### Anti-obrasci

- Obrazac bez problema (Factory za klasu koja ima jednu implementaciju).
- God object: klasa koja zna i radi sve.
- Service locator (`provider.GetService<T>()` usred koda umesto konstruktora).

## Lab

1. Uvedi Strategy za obračun kazne za kašnjenje (standardna, studentska, bez kazne) i biraj po tipu člana.
2. Napiši Decorator `LogujuciNotifier` oko `INotifier` (registruj ručno ili bibliotekom Scrutor) koji meri trajanje slanja.
3. Napiši Adapter oko spoljnog API-ja (npr. javni API za ISBN podatke) tako da ostatak koda zavisi od tvog `IIsbnServis`.
4. Za svaki obrazac napiši test koji pokazuje šta dobijaš (npr. dodavanje nove kazne bez izmene postojećih klasa).

**Gotovo je kad:** nova vrsta kazne se dodaje samo novom klasom i registracijom, a dekorator radi bez izmene originalnog notifier-a.

## Pitanja sa intervjua

**P: Strategy ili if/else?**
Za dva stabilna slučaja if je u redu. Kad slučajeva ima više, rastu, ili svaki ima svoju logiku i testove, Strategy drži svaki slučaj u svojoj klasi i ostavlja pozivaoca netaknutim.

**P: Gde u ASP.NET Core-u vidiš Decorator?**
Middleware pipeline i `DelegatingHandler` kod `HttpClient`-a: svaki sloj obavija sledeći i dodaje ponašanje (log, retry, autentifikacija).

## Test

### 1. Koji obrazac rešava „više načina obračuna popusta, biraju se po kodu”?
- [ ] Adapter
- [x] Strategy
- [ ] Builder
- [ ] Singleton
> Svaki način je jedna implementacija istog interfejsa.

### 2. Koji obrazac dodaje keširanje oko postojećeg servisa bez menjanja njegovog koda?
- [x] Decorator
- [ ] Factory
- [ ] Observer
- [ ] Repository
> Dekorator implementira isti interfejs i obavija original.

### 3. Šta je `DbContext` u terminima obrazaca?
- [ ] Strategy
- [ ] Singleton
- [ ] Adapter
- [x] Unit of Work (a `DbSet` je repository)
> `SaveChanges` upisuje sve izmene u jednoj transakciji.

### 4. Zašto je service locator (`GetService<T>()` usred koda) anti-obrazac?
- [ ] Sporiji je
- [ ] Ne radi u .NET 10
- [ ] Zahteva licencu
- [x] Sakriva zavisnosti klase i otežava testiranje
> Zavisnosti treba da se vide u konstruktoru.

### 5. Šta važi za MediatR danas?
- [x] Prešao je na komercijalnu licencu za firme, pa ga timovi biraju svesno
- [ ] Zabranjen je u ASP.NET Core
- [ ] Zamenio ga je EF Core
- [ ] Deo je .NET 10
> Licenca je postala deo odluke o arhitekturi.

## Izvori
- [Refactoring Guru: dizajn obrasci](https://refactoring.guru/design-patterns)
- [Scrutor (dekoratori u DI)](https://github.com/khellang/Scrutor)
=====
---
id: "P3"
region: "PRO"
level: "KVALITET"
title: "OWASP Top 10 u praksi"
subtitle: "lista 2025 i odbrana u ASP.NET Core + React"
minutes: 60
---
# P3 OWASP Top 10 u praksi

OWASP Top 10 je lista najčešćih rizika web aplikacija. Verzija 2025 je zvanično objavljena u januaru 2026. Vodič (pogl. 15) pokriva prijavu, CSRF, XSS i rate limit; ovde je cela lista sa odbranom u tvom stacku. Oglasi sve češće traže poznavanje OWASP-a i bezbednog kodiranja.

## Pojmovi

| # | Rizik (2025) | Primer | Odbrana u .NET + React |
|---|---|---|---|
| A01 | Broken Access Control (uključuje SSRF) | `GET /api/orders/123` vraća tuđu porudžbinu | provera vlasništva i tenanta na serveru za svaki resurs; globalni filter po firmi |
| A02 | Security Misconfiguration | Swagger i detaljne greške u produkciji | `ProblemDetails` bez stack trace-a, Swagger samo u Development, sigurnosna zaglavlja |
| A03 | Software Supply Chain Failures | ranjiv ili zlonameran npm/NuGet paket | `dotnet list package --vulnerable`, `npm audit`, Dependabot, lock fajlovi |
| A04 | Cryptographic Failures | lozinke u čistom tekstu, HTTP | ASP.NET Identity hash, HTTPS svuda, Data Protection API |
| A05 | Injection | SQL sastavljen spajanjem stringova | EF Core / parametri; nikad `FromSqlRaw` sa spojenim unosom |
| A06 | Insecure Design | reset lozinke bez isteka tokena | pretnje se razmatraju pri dizajnu, limiti i potvrde za osetljive tokove |
| A07 | Authentication Failures | nema zaštite od pogađanja lozinke | lockout, rate limit, MFA, HttpOnly kolačići |
| A08 | Software or Data Integrity Failures | webhook bez provere potpisa | HMAC potpis webhook-a, potpisani artefakti u CI-ju |
| A09 | Logging & Alerting Failures | napad prođe neprimećeno | logovi prijava i odbijenih pristupa, upozorenja (C7) |
| A10 | Mishandling of Exceptional Conditions | greška ostavi transakciju napola ili otkrije detalje | globalni handler izuzetaka, transakcije, „fail closed” |

### A01 u kodu: najčešća rupa

```csharp
// LOŠE: svako ko pogodi id vidi porudžbinu
app.MapGet("/api/orders/{id}", (int id, AppDb db) => db.Orders.Find(id));

// DOBRO: resurs se traži u okviru korisnika/firme
app.MapGet("/api/orders/{id}", async (int id, AppDb db, ICurrentUser u) =>
    await db.Orders.Where(o => o.Id == id && o.TenantId == u.TenantId).FirstOrDefaultAsync()
        is { } o ? Results.Ok(o) : Results.NotFound());   // 404, ne 403: ne otkrivaj da postoji
```

### A05: injekcija i kad EF ne štiti

```csharp
db.Books.FromSql($"SELECT * FROM books WHERE title = {naslov}");      // bezbedno: parametar
db.Books.FromSqlRaw("SELECT * FROM books WHERE title = '" + naslov + "'"); // RANJIVO
```

### React

- React enkoduje tekst sam; opasno je samo `dangerouslySetInnerHTML` (ako mora: sanitizacija, npr. DOMPurify).
- Tokeni ne idu u `localStorage` (XSS ih čita); HttpOnly kolačić (vodič, pogl. 15).
- Frontend provere su udobnost; sva pravila važe na serveru.

## Lab

1. U Biblioteka API napravi namerno ranjiv endpoint (IDOR: tuđa pozajmica po id-u) i iskoristi ga drugim nalogom; zatim ga popravi i napiši test koji to proverava.
2. Pokreni `dotnet list package --vulnerable --include-transitive` i `npm audit`; uključi Dependabot u repou.
3. Dodaj sigurnosna zaglavlja (CSP, `X-Content-Type-Options`, `Referrer-Policy`) i proveri ih na securityheaders.com ili u DevTools-u.
4. Proveri da produkcija vraća `ProblemDetails` bez stack trace-a i da je Swagger isključen.
5. Pokreni OWASP ZAP baseline skeniranje lokalno (Docker image `zaproxy/zap-stable`) i reši bar dve stavke.

**Gotovo je kad:** test dokazuje da korisnik ne vidi tuđe podatke, nema poznatih ranjivih paketa, a ZAP izveštaj nema visoke rizike.

## Pitanja sa intervjua

**P: Koji je najčešći bezbednosni problem u web API-jima i kako ga sprečavaš?**
Broken access control: korisnik pristupa tuđem resursu menjanjem id-a. Svaki upit filtriram po vlasniku ili tenantu na serveru, centralno (globalni filter), i to pokrivam testovima.

**P: Šta je supply chain napad i kako se braniš?**
Napad kroz zavisnost (paket) umesto kroz tvoj kod. Odbrana: malo zavisnosti, lock fajlovi, automatske provere ranjivosti, ažuriranja i oprez sa novim, nepoznatim paketima.

## Test

### 1. Koji rizik je prvi na OWASP Top 10 2025?
- [x] Broken Access Control
- [ ] Injection
- [ ] Cryptographic Failures
- [ ] Security Misconfiguration
> Pristup tuđim resursima je i dalje najčešći problem.

### 2. Koja kategorija je nova u 2025. i pokriva ranjive i zlonamerne pakete?
- [ ] Injection
- [ ] Insecure Design
- [x] Software Supply Chain Failures
- [ ] Logging & Alerting Failures
> Proširuje raniju kategoriju „Vulnerable and Outdated Components”.

### 3. Koji poziv je ranjiv na SQL injekciju?
- [ ] `db.Books.Where(b => b.Title == naslov)`
- [ ] `db.Books.FromSql($"... WHERE title = {naslov}")`
- [x] `db.Books.FromSqlRaw("... WHERE title = '" + naslov + "'")`
- [ ] `db.Books.Find(id)`
> Spajanje stringova ubacuje unos direktno u SQL; ostali pozivi koriste parametre.

### 4. Korisnik traži porudžbinu druge firme. Šta API vraća?
- [ ] 200 sa podacima
- [ ] 500
- [ ] 302 na prijavu
- [x] 404, jer upit filtrira po tenantu pa resurs „ne postoji” za njega
> 404 ne otkriva da resurs postoji.

### 5. Gde u React aplikaciji ne treba čuvati access token?
- [ ] U HttpOnly kolačiću
- [ ] Nigde, koristi se kolačić sesije
- [x] U localStorage
- [ ] U memoriji aplikacije
> localStorage je dostupan svakom JavaScript-u na stranici, pa i ubačenom kroz XSS.

## Izvori
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Microsoft Learn: Bezbednost u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/)
=====
---
id: "P4"
region: "PRO"
level: "KVALITET"
title: "Performanse i profilisanje"
subtitle: "meri pa menjaj: BenchmarkDotNet, dotnet-counters, EF, opterećenje"
minutes: 50
---
# P4 Performanse i profilisanje

Pravilo broj jedan: prvo izmeri, pa menjaj. Intuicija o tome šta je sporo je često pogrešna. U web aplikacijama je usko grlo skoro uvek baza ili mreža, ređe sam C# kod. Medior se od juniora razlikuje po tome što zna da pronađe uzrok, a ne samo da pogađa. Async i memorijske zamke su u vodiču, pogl. 45, a N+1 u pogl. 12.

## Pojmovi

| Alat | Za šta |
|---|---|
| BenchmarkDotNet | precizno merenje male metode (vreme i alokacije) |
| `dotnet-counters` | uživo: CPU, GC, broj zahteva, thread pool |
| `dotnet-trace` / Visual Studio profiler | gde se troši vreme u celoj aplikaciji |
| EF logovanje upita | koji SQL ide u bazu i koliko puta |
| `EXPLAIN ANALYZE` | zašto je upit spor (vodič, pogl. 47) |
| k6 / oha | test opterećenja: koliko zahteva API izdrži |

### Najčešći uzroci sporosti u .NET API-ju

| Problem | Znak | Lek |
|---|---|---|
| N+1 upiti | 1 upit za listu + 1 po stavci | `Include` ili projekcija `Select` |
| Učitavanje celih entiteta | `SELECT *` za listu | `Select` u DTO samo sa potrebnim poljima |
| Tracking kod čitanja | visoka memorija | `AsNoTracking()` |
| Nedostaje indeks | spor `WHERE`/`ORDER BY` | indeks (vodič, pogl. 14) |
| Blokiranje async koda | `.Result`, `.Wait()` | `await` do kraja (vodič, pogl. 45) |
| Mnogo alokacija u petlji | česti GC | `StringBuilder`, `Span<T>`, izbegni LINQ u vrućoj petlji |

### BenchmarkDotNet

```csharp
[MemoryDiagnoser]
public class Spajanje
{
    private readonly string[] delovi = Enumerable.Range(0, 1000).Select(i => i.ToString()).ToArray();

    [Benchmark(Baseline = true)]
    public string Plus() { var s = ""; foreach (var d in delovi) s += d; return s; }

    [Benchmark]
    public string Builder() { var sb = new StringBuilder(); foreach (var d in delovi) sb.Append(d); return sb.ToString(); }
}
// Program.cs: BenchmarkRunner.Run<Spajanje>();  pokreće se u Release modu
```

### Postupak

1. Definiši cilj (npr. p95 ispod 200 ms pri 100 zahteva/s).
2. Izmeri trenutno stanje (k6 + tragovi iz C7).
3. Nađi najveći deo vremena (trag zahteva, EF log).
4. Promeni jednu stvar, izmeri ponovo.

## Lab

1. Napravi namerno spor endpoint: lista 200 knjiga sa autorom bez `Include` (N+1). Uključi EF log i prebroj upite.
2. Popravi projekcijom u DTO + `AsNoTracking`; izmeri broj upita i vreme.
3. k6 skriptom (`k6 run`) opteretiti endpoint pre i posle; zapiši p95 i zahteve u sekundi.
4. Pokreni `dotnet-counters monitor -n Biblioteka.Api` tokom testa i posmatraj GC i thread pool.
5. BenchmarkDotNet: uporedi `string +=` i `StringBuilder` i pročitaj kolonu „Allocated”.

**Gotovo je kad:** imaš tabelu pre/posle sa brojem upita, p95 i throughput-om za isti endpoint.

## Pitanja sa intervjua

**P: API je spor. Kako pristupaš?**
Merim pre nego što menjam: tragovi pokazuju gde je vreme (najčešće baza), EF log pokazuje upite (N+1, previše kolona), `EXPLAIN` pokazuje indekse. Menjam jednu stvar i merim ponovo.

**P: Šta je N+1 problem?**
Jedan upit učita listu, pa po jedan dodatni upit za svaku stavku (npr. autora). Rešava se `Include`-om ili projekcijom koja sve dobije u jednom upitu.

## Test

### 1. Šta je prvi korak kod problema sa performansama?
- [ ] Povećati server
- [ ] Dodati keš
- [x] Izmeriti i pronaći gde se troši vreme
- [ ] Prepisati u async
> Bez merenja optimizuješ pogrešan deo.

### 2. Lista od 100 porudžbina pravi 101 upit u bazu. Kako se zove problem?
- [x] N+1
- [ ] Deadlock
- [ ] Cache stampede
- [ ] Race condition
> Jedan upit za listu i po jedan za svaku stavku.

### 3. Šta radi `AsNoTracking()`?
- [ ] Briše keš
- [ ] Ubrzava upis
- [x] Čita entitete bez praćenja izmena, sa manje memorije i posla
- [ ] Isključuje logovanje
> Za čitanje koje se ne menja tracking je nepotreban trošak.

### 4. Čemu služi `[MemoryDiagnoser]` u BenchmarkDotNet-u?
- [ ] Pronalazi curenje memorije u produkciji
- [ ] Ograničava memoriju
- [x] Prikazuje koliko memorije metoda alocira
- [ ] Pokreće GC
> Alokacije utiču na GC, a time i na latenciju.

### 5. Zašto se benchmark pokreće u Release modu?
- [ ] Debug ne podržava benchmark atribute
- [ ] Release je jedini koji ima Stopwatch
- [ ] Zbog licence
- [x] Debug isključuje optimizacije pa merenja nisu realna
> Merenje mora da odgovara kodu koji radi u produkciji.

## Izvori
- [BenchmarkDotNet](https://benchmarkdotnet.org/)
- [Microsoft Learn: dotnet-counters](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters)
- [Microsoft Learn: EF Core performanse](https://learn.microsoft.com/en-us/ef/core/performance/)
- [k6](https://grafana.com/docs/k6/latest/)
=====
---
id: "P5"
region: "PRO"
level: "FRONTEND+"
title: "Tailwind CSS i shadcn/ui"
subtitle: "utility-first, dizajn tokeni, komponente, pristupačnost"
minutes: 45
---
# P5 Tailwind CSS i shadcn/ui

Tailwind je CSS pristup u kom stilove pišeš malim klasama direktno u markupu (`flex gap-4 p-6 rounded-xl`) umesto u posebnim CSS fajlovima. shadcn/ui je kolekcija gotovih, pristupačnih React komponenti (dugme, dijalog, tabela, forma) koje se kopiraju u tvoj projekat, pa ih menjaš kao svoj kod. Ova kombinacija je danas jedan od najčešćih izbora za nove React aplikacije. Design tokeni i CSS moduli su u vodiču, pogl. 28, a osnove CSS-a u pogl. 20.

## Pojmovi

| Pojam | Značenje |
|---|---|
| Utility klasa | jedna klasa = jedno svojstvo (`p-4` = padding 1rem) |
| Responsive prefiks | `md:flex` važi od srednjeg ekrana naviše (mobile first) |
| Stanja | `hover:`, `focus-visible:`, `disabled:`, `dark:` |
| Tema | boje, razmaci i fontovi kao CSS promenljive (dizajn tokeni) |
| shadcn/ui | komponente zasnovane na Radix UI-ju (tastatura, ARIA), stilizovane Tailwind-om |

### Podešavanje uz Vite (Tailwind v4)

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [react(), tailwindcss()] });
```

```css
/* src/index.css */
@import "tailwindcss";
@theme { --color-brand: #4da3ff; }      /* sada postoji klasa bg-brand */
```

```tsx
<button className="inline-flex h-11 items-center rounded-lg bg-brand px-4 font-semibold text-slate-950
                   hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
  Pozajmi
</button>
```

### shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button dialog table form
```

Komponente se pojave u `src/components/ui/`. Nisu npm zavisnost: menjaš ih slobodno, ali i održavaš sam.

### Pristupačnost (a11y) koju dobijaš i koju moraš sam

- Dobijaš: fokus u dijalogu, zatvaranje na Escape, ARIA atributi, rad tastaturom.
- Sam: `label` za svako polje, kontrast teksta (bar 4.5:1), dugmad koja su `<button>`, alt tekst za slike, vidljiv fokus.

## Lab

1. Dodaj Tailwind v4 u React deo Biblioteke i definiši temu (boja brenda, font) kroz `@theme`.
2. Prepravi listu knjiga u responzivnu mrežu kartica (1 kolona na telefonu, 3 na desktopu).
3. Dodaj shadcn/ui i napravi dijalog „Nova pozajmica” sa formom (React Hook Form + Zod; forme su u vodiču, pogl. 27, a Zod u pogl. 22).
4. Dodaj tamnu temu (`dark:`) i prekidač.
5. Prođi celu formu samo tastaturom i proveri kontrast u DevTools-u (Lighthouse → Accessibility).

**Gotovo je kad:** stranica radi na telefonu i desktopu, dijalog se koristi samo tastaturom, a Lighthouse Accessibility je 90 ili više.

## Pitanja sa intervjua

**P: Prednosti i mane Tailwind-a?**
Prednosti: brz rad, dosledan dizajn kroz tokene, nema mrtvog CSS-a, stil je uz komponentu. Mane: dugačke liste klasa, učenje naziva; rešava se izdvajanjem komponenti.

**P: Po čemu se shadcn/ui razlikuje od biblioteka poput MUI?**
Komponente se kopiraju u tvoj kod umesto da se instaliraju kao paket: potpuna kontrola i prilagođavanje, ali ažuriranja radiš sam.

## Test

### 1. Šta znači klasa `md:flex`?
- [ ] flex samo na malim ekranima
- [ ] flex samo u tamnoj temi
- [ ] flex na hover
- [x] flex od srednje širine ekrana naviše
> Tailwind je mobile first: prefiks važi od te tačke naviše.

### 2. Kako se Tailwind v4 uključuje u CSS fajl?
- [x] `@import "tailwindcss";`
- [ ] `@tailwind base; @tailwind components;`
- [ ] `<link href="tailwind.css">`
- [ ] Ne uključuje se, radi sam
> v4 koristi jedan import i `@theme` za tokene.

### 3. Šta je posebno kod shadcn/ui?
- [ ] Radi samo sa Next.js-om
- [ ] Zahteva Bootstrap
- [ ] To je CSS framework
- [x] Komponente se kopiraju u tvoj projekat i ti ih menjaš i održavaš
> Nisu npm zavisnost; kod je tvoj.

### 4. Koji minimalni kontrast se traži za običan tekst (WCAG AA)?
- [ ] 2:1
- [x] 4.5:1
- [ ] 3:1
- [ ] 7:1
> 3:1 važi za veliki tekst; 7:1 je AAA nivo.

### 5. Zašto se koristi `focus-visible:` umesto samo `focus:`?
- [x] Prsten fokusa se prikazuje pri radu tastaturom, a ne pri svakom kliku mišem
- [ ] Radi samo u Chrome-u
- [ ] Isključuje fokus
- [ ] Brže je
> Korisnici tastature vide gde su, a klik mišem ne ostavlja prsten.

## Izvori
- [Tailwind CSS dokumentacija](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [web.dev: pristupačnost](https://web.dev/learn/accessibility)
=====
---
id: "P6"
region: "PRO"
level: "FRONTEND+"
title: "Playwright E2E"
subtitle: "pravi browser, lokatori, auto-čekanje, trace, CI"
minutes: 45
---
# P6 Playwright E2E

Unit testovi proveravaju delove, a end-to-end (E2E) test proverava ceo tok kao korisnik: otvori stranicu, prijavi se, pozajmi knjigu, vidi potvrdu. Playwright pokreće pravi browser (Chromium, Firefox, WebKit), sam čeka elemente i snima trag svakog neuspelog testa. Vodič (pogl. 29) ga pominje; ovde ga uvodiš u projekat.

## Pojmovi

| Pojam | Značenje |
|---|---|
| Lokator | način da se nađe element; najbolje po ulozi i tekstu (`getByRole`) |
| Auto-waiting | akcija čeka da element bude vidljiv i aktivan, bez `sleep` |
| Web-first assertion | `expect(...).toBeVisible()` ponavlja proveru dok ne prođe ili istekne |
| Trace viewer | snimak svakog koraka, DOM-a i mreže neuspelog testa |
| Storage state | sačuvana prijava, da se ne prijavljuješ u svakom testu |

```bash
npm init playwright@latest
npx playwright test          # pokreni testove
npx playwright test --ui     # interaktivni režim
npx playwright codegen http://localhost:5173   # snimi korake klikanjem
```

```ts
import { test, expect } from "@playwright/test";

test("član pozajmljuje slobodnu knjigu", async ({ page }) => {
  await page.goto("/books");
  await page.getByRole("searchbox", { name: "Pretraga" }).fill("Prokleta avlija");
  await page.getByRole("button", { name: "Pozajmi" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Potvrdi" }).click();

  await expect(page.getByRole("status")).toHaveText(/Pozajmica je sačuvana/);
});
```

### Pravila

- **Malo E2E testova, za najvažnije tokove** (prijava, prodaja, plaćanje); ostalo pokrivaju unit i integracioni testovi (piramida iz vodiča, pogl. 17).
- Lokatori po ulozi i vidljivom tekstu, ne po CSS klasama (menjaju se pri redizajnu, P5).
- Svaki test pravi svoje podatke i ne zavisi od drugog testa.
- Nikad `waitForTimeout(3000)`; čeka se stanje, ne vreme.

## Lab

1. Dodaj Playwright u React deo Biblioteke i podesi `webServer` u `playwright.config.ts` da sam pokrene frontend i API.
2. Napiši testove za: prijavu, pozajmicu slobodne knjige, poruku kad knjiga nije dostupna.
3. Prijavu sačuvaj kao `storageState` u setup projektu i koristi je u ostalim testovima.
4. Namerno pokvari tekst dugmeta i otvori trace (`npx playwright show-trace`) da vidiš gde je pao.
5. Dodaj Playwright job u GitHub Actions (C2) koji čuva HTML izveštaj kao artifact.

**Gotovo je kad:** tri E2E testa prolaze lokalno i u CI-ju, a pad testa ostavlja izveštaj sa trace-om.

## Pitanja sa intervjua

**P: Koliko E2E testova pišeš i zašto ne više?**
Za nekoliko kritičnih tokova. Sporiji su, krhkiji i skuplji za održavanje od unit testova, pa većinu logike pokrivaju niži nivoi piramide.

**P: Zašto su E2E testovi često „flaky” i kako to sprečavaš?**
Zbog čekanja na fiksno vreme, zavisnosti između testova i deljenih podataka. Rešenje: auto-waiting i web-first provere, izolovani podaci po testu, stabilni lokatori po ulozi.

## Test

### 1. Koji lokator je najotporniji na redizajn?
- [ ] `page.locator(".btn-primary.mt-4")`
- [x] `page.getByRole("button", { name: "Pozajmi" })`
- [ ] `page.locator("div > div:nth-child(3) button")`
- [ ] XPath po poziciji
> Uloga i vidljivi tekst se retko menjaju i odgovaraju onome što korisnik vidi.

### 2. Šta znači auto-waiting u Playwright-u?
- [ ] Test čeka fiksnih 5 sekundi pre svake akcije
- [x] Akcija sama čeka da element bude spreman (vidljiv, aktivan)
- [ ] Testovi se pokreću jedan po jedan
- [ ] Browser čeka korisnika
> Zato `sleep` nije potreban.

### 3. Čemu služi trace viewer?
- [x] Za pregled svakog koraka, DOM-a i mreže neuspelog testa
- [ ] Za debagovanje C# koda
- [ ] Za merenje pokrivenosti koda
- [ ] Za snimanje videa za marketing
> Vidiš tačno šta je browser video kad je test pao.

### 4. Gde je mesto E2E testova u piramidi testiranja?
- [x] Na vrhu, najmanje ih ima
- [ ] Na dnu, najviše ih ima
- [ ] U sredini, isto koliko integracionih
- [ ] Ne pripadaju piramidi
> Najskuplji su i najsporiji, pa ih ima najmanje.

### 5. Šta je problem sa `await page.waitForTimeout(3000)`?
- [ ] Ne postoji takva metoda
- [ ] Radi samo u Firefox-u
- [x] Usporava testove i ipak može da padne kad je aplikacija sporija
- [ ] Briše kolačiće
> Čeka se stanje (`expect(...).toBeVisible()`), ne vreme.

## Izvori
- [Playwright dokumentacija](https://playwright.dev/docs/intro)
- [Playwright: dobre prakse](https://playwright.dev/docs/best-practices)
=====
---
id: "P7"
region: "PRO"
level: "FRONTEND+"
title: "Next.js osnove"
subtitle: "App Router, server i klijent komponente, renderovanje, kada"
minutes: 50
---
# P7 Next.js osnove

Next.js je React framework koji dodaje rutiranje po fajlovima i renderovanje na serveru. Zalihe su SPA iza prijave i tu Vite je pravi izbor (vodič, pogl. 46; SSR i SPA u pogl. 1). Ali za javne sajtove, prodavnice i sve gde je važan SEO i prvi prikaz, firme biraju Next.js, pa se u oglasima često traži uz React. Aktuelna glavna verzija je 16, sa Turbopack-om kao podrazumevanim bundlerom.

## Pojmovi

| Pojam | Značenje |
|---|---|
| App Router | rute su folderi u `app/`: `app/knjige/[id]/page.tsx` → `/knjige/42` |
| Server komponenta | podrazumevano; renderuje se na serveru, može direktno da čita bazu, ne šalje svoj JS u browser |
| Klijent komponenta | `"use client"` na vrhu; ima state, efekte, događaje |
| SSR | HTML se pravi na serveru za svaki zahtev |
| SSG / statički | HTML se pravi pri build-u |
| Server Actions | funkcija na serveru koju forma poziva direktno |
| Layout | `layout.tsx` obavija stranice i ne renderuje se ponovo pri navigaciji |

```tsx
// app/knjige/[id]/page.tsx: server komponenta, async, bez useEffect-a
export default async function Knjiga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${process.env.API_URL}/api/books/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) notFound();
  const knjiga = await res.json();
  return (
    <article>
      <h1>{knjiga.naslov}</h1>
      <DugmePozajmi id={knjiga.id} />   {/* klijent komponenta za interakciju */}
    </article>
  );
}
```

```tsx
// app/knjige/[id]/DugmePozajmi.tsx
"use client";
export function DugmePozajmi({ id }: { id: number }) {
  const [stanje, setStanje] = useState<"spremno" | "šaljem" | "gotovo">("spremno");
  // ...
}
```

### Vite SPA ili Next.js?

| Situacija | Izbor |
|---|---|
| Aplikacija iza prijave (admin, ERP, Zalihe) | Vite SPA + .NET API |
| Javni sadržaj, SEO, brz prvi prikaz (katalog, blog, prodavnica) | Next.js |
| Tim želi jedan JS stack i za backend | Next.js (ali .NET API je i dalje čest izbor za složen domen) |

### Česte zamke

- `"use client"` na vrhu svega poništava prednosti server komponenti.
- Tajne (`API_KEY`) smeju samo u server kodu; u klijent stižu samo promenljive sa prefiksom `NEXT_PUBLIC_`.
- Keš i revalidacija: znaj kada se stranica ponovo pravi (`revalidate`, `revalidatePath`).

## Lab

1. `npx create-next-app@latest` sa TypeScript-om, App Router-om i Tailwind-om.
2. Napravi javni katalog Biblioteke: `/knjige` (lista) i `/knjige/[id]` (detalji) kao server komponente koje čitaju tvoj .NET API.
3. Dodaj `generateMetadata` za naslov i opis svake knjige (SEO) i proveri izvorni HTML stranice (View Source): sadržaj mora biti u HTML-u.
4. Dodaj klijent komponentu za „Dodaj u listu želja” sa stanjem.
5. Uporedi veličinu JavaScript-a koji stiže u browser za stranicu kataloga i za tvoju Vite SPA (DevTools → Network).

**Gotovo je kad:** izvorni HTML stranice knjige sadrži naslov i opis bez izvršavanja JavaScript-a, a interaktivni deo radi kao klijent komponenta.

## Pitanja sa intervjua

**P: Razlika između server i klijent komponente?**
Server komponenta se renderuje na serveru, može da čita podatke direktno i ne šalje svoj kod u browser. Klijent komponenta (`"use client"`) radi u browseru i ima state, efekte i događaje.

**P: Kad bi izabrao Next.js umesto Vite SPA?**
Kad je sadržaj javan i bitni su SEO i brz prvi prikaz. Za aplikaciju iza prijave SPA je jednostavnija, a SEO nije bitan.

## Test

### 1. Šta je podrazumevano u Next.js App Router-u?
- [ ] Class komponente
- [ ] Klijent komponente
- [ ] Statički HTML bez React-a
- [x] Server komponente
> Za klijent komponentu se piše `"use client"`.

### 2. Koji fajl pravi rutu `/knjige/42`?
- [ ] `pages/knjige.tsx`
- [x] `app/knjige/[id]/page.tsx`
- [ ] `app/knjige-42.tsx`
- [ ] `routes.ts`
> Uglaste zagrade označavaju dinamički segment.

### 3. Gde sme da se koristi tajni API ključ u Next.js aplikaciji?
- [ ] U klijent komponenti
- [x] Samo u server kodu (server komponente, server actions, route handlers)
- [ ] U promenljivoj `NEXT_PUBLIC_API_KEY`
- [ ] U localStorage
> Sve što stigne u klijent vidi svaki korisnik.

### 4. Za šta je Next.js bolji izbor od Vite SPA?
- [x] Javni katalog proizvoda kom je bitan SEO
- [ ] Konzolni alat
- [ ] Interni admin panel iza prijave
- [ ] Desktop aplikacija
> Server renderovanje daje gotov HTML pretraživačima i brz prvi prikaz.

### 5. Šta je posledica stavljanja `"use client"` na root layout?
- [x] Gube se prednosti server komponenti ispod njega
- [ ] Aplikacija ne može da se build-uje
- [ ] SEO postaje bolji
- [ ] Ništa
> Sve ispod postaje klijent kod koji se šalje u browser.

## Izvori
- [Next.js dokumentacija](https://nextjs.org/docs)
- [Next.js: server i klijent komponente](https://nextjs.org/docs/app/getting-started/server-and-client-components)
=====
---
id: "P8"
region: "PRO"
level: "TIM I KARIJERA"
title: "Rad u timu"
subtitle: "Scrum, procene, pull request, code review, grane, commit poruke"
minutes: 40
---
# P8 Rad u timu

Na intervjuu za medior poziciju pola pitanja nije o kodu, nego o tome kako radiš sa ljudima: kako procenjuješ, kako pregledaš tuđi kod, šta radiš kad se ne slažeš. Ovo se ne uči iz knjige, ali postoje ustaljene prakse koje treba znati i o kojima treba umeti da pričaš kroz primere iz ITM-a. Pojmovi (Scrum, Kanban, Definition of Done, code review) su ukratko u vodiču, pogl. 48, a grane, merge i rebase u pogl. 34.

## Pojmovi

### Scrum ukratko

| Element | Šta je |
|---|---|
| Sprint | period od 1–4 nedelje sa ciljem |
| Product Owner | određuje prioritete (backlog) |
| Scrum Master | uklanja prepreke, vodi proces |
| Planning | tim bira posao za sprint |
| Daily | 15 minuta: šta je urađeno, šta sledi, šta blokira |
| Review / Retro | prikaz urađenog / šta poboljšati u načinu rada |
| Definition of Done | kad je zadatak zaista gotov (testovi, review, deploy na test) |

### Procene

Story points mere složenost i nesigurnost, ne sate. Velik zadatak se deli dok se ne može proceniti. Kad nešto ne znaš, kaži i predloži kratko istraživanje (spike) umesto da pogađaš.

### Pull request i code review

Dobar PR:
- mali (idealno ispod 400 linija), jedna tema;
- opis: šta, zašto, kako testirati, snimak ekrana za UI;
- prošao CI pre nego što tražiš review.

Dobar review:
- prvo ispravnost, bezbednost i čitljivost, tek onda stil (stil rešava linter);
- komentar je pitanje ili predlog sa razlogom: „Šta se desi ako je lista prazna?” umesto „Ovo je pogrešno”;
- razlikuj obavezno od sitnice (prefiks `nit:`);
- odobri kad je dovoljno dobro, ne kad je savršeno.

### Grane i commit-ovi

| Pristup | Kada |
|---|---|
| Trunk-based (kratke grane, česti merge u main, feature flagovi) | tim sa dobrim CI-jem, česti deploy |
| GitFlow (develop, release, hotfix grane) | ređa izdanja, više verzija u podršci |

Conventional Commits: `feat: rezervacija knjige`, `fix: duplo slanje emaila`, `refactor: izdvojen LoanPolicy`. Iz njih se automatski pravi changelog.

### Neslaganje

Argumenti, podaci i kompromis; kad tim odluči, podržavaš odluku („disagree and commit”). Lične primedbe nikad u komentaru na kod.

## Lab

1. Za Biblioteka repo napiši PR šablon (`.github/pull_request_template.md`) sa sekcijama šta/zašto/kako testirati.
2. Napiši Definition of Done za svoj projekat (5–7 stavki).
3. Uzmi jedan svoj stari PR (ili tuđi open-source) i napiši 5 review komentara po pravilima iznad.
4. Prepiši poslednjih 10 commit poruka po Conventional Commits pravilima (za buduće commit-ove).
5. Pripremi tri priče iz ITM-a po STAR-u (vodič, pogl. 43): neslaganje oko rešenja, greška u produkciji, zadatak koji si podelio na manje.

**Gotovo je kad:** repo ima PR šablon i Definition of Done, a imaš tri zapisane STAR priče o timskom radu.

## Pitanja sa intervjua

**P: Kako izgleda dobar code review?**
Fokus na ispravnost, bezbednost i čitljivost; komentari kao pitanja ili predlozi sa razlogom; jasno odvojeno šta je obavezno, a šta sitnica; brz odgovor da autor ne čeka.

**P: Šta radiš kad se ne slažeš sa kolegom oko rešenja?**
Razgovaram uz argumente i podatke (merenje, primer), tražim kompromis ili treće mišljenje; kad se odluči, podržim odluku i radim po njoj.

**P: Kako procenjuješ zadatak koji ne razumeš do kraja?**
Delim ga na manje delove, procenjujem ono što znam, a za nepoznato predlažem kratak vremenski ograničen spike i kažem nesigurnost otvoreno.

## Test

### 1. Šta mere story points?
- [x] Relativnu složenost i nesigurnost zadatka
- [ ] Broj linija koda
- [ ] Produktivnost pojedinca
- [ ] Tačan broj sati
> Nisu sati i ne služe za poređenje ljudi.

### 2. Koji review komentar je najbolji?
- [ ] „Prepiši ceo fajl.”
- [x] „Šta se desi ako je lista prazna? Možda guard clause na početku?”
- [ ] „Ovo je loše.”
- [ ] „Zašto si ovo uradio ovako?!”
> Pitanje sa konkretnim predlogom i razlogom.

### 3. Šta je Definition of Done?
- [x] Zajednička lista uslova kad je zadatak zaista gotov
- [ ] Rok za sprint
- [ ] Opis funkcije za korisnika
- [ ] Lista bagova
> Npr. testovi prolaze, review odobren, deploy na test okruženje.

### 4. Koja commit poruka prati Conventional Commits?
- [ ] „Fixed stuff”
- [x] „fix: duplo slanje emaila pri pozajmici”
- [ ] „WIP”
- [ ] „izmene”
> Tip, dvotačka i kratak opis.

### 5. Šta je trunk-based development?
- [x] Kratke grane i česti merge u glavnu granu, uz CI i feature flagove
- [ ] Release grane za svaku verziju
- [ ] Rad samo na jednoj dugoj grani po funkciji
- [ ] Zabrana grana
> Smanjuje konflikte i ubrzava isporuku.

## Izvori
- [Scrum Guide](https://scrumguides.org/scrum-guide.html)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Google: kako se radi code review](https://google.github.io/eng-practices/review/)
=====
---
id: "P9"
region: "PRO"
level: "TIM I KARIJERA"
title: "Tehnički engleski"
subtitle: "objasni kod naglas, fraze za intervju, STAR na engleskom"
minutes: 40
---
# P9 Tehnički engleski

Strane firme i agencije (Toggl, Luxoft, Deel, Malt klijenti) intervjue rade na engleskom. Znanje je isto, ali pod pritiskom reči ne dolaze same. Cilj nije savršena gramatika, nego da tečno objasniš šta radiš, zašto, i šta bi uradio drugačije. To se vežba naglas, ne čitanjem. Tabela najčešćih rečenica je i u vodiču, pogl. 48 („Na engleskom”).

## Pojmovi

### Fraze koje kupuju vreme i deluju profesionalno

| Situacija | Fraza |
|---|---|
| Treba ti trenutak | "Let me think about that for a second." |
| Proveravaš razumevanje | "Just to make sure I understand: you want…?" |
| Ne znaš sigurno | "I haven't used it in production, but my understanding is…" |
| Nudiš kompromis | "It depends. If X, I'd go with A; if Y, B." |
| Objašnjavaš korake | "First…, then…, and finally…" |
| Priznaješ grešku | "In hindsight, I would have…" |

### Rečnik koji se stalno koristi

| Srpski | Engleski |
|---|---|
| zahtev / odgovor | request / response |
| uvesti, isporučiti | to roll out, to ship |
| usko grlo | bottleneck |
| kompromis | trade-off |
| zastareo kod | legacy code |
| pokrenuti posao u pozadini | to run a background job |
| ograničenje | constraint |
| greška u produkciji | production incident |

### Šablon: objasni projekat za 2 minuta

1. **Context:** "Zalihe is a multi-tenant inventory SaaS for small shops in Serbia, integrated with WooCommerce."
2. **Architecture:** "ASP.NET Core API with a layered architecture, PostgreSQL, React SPA, deployed with Docker Compose behind Caddy."
3. **Hard problem:** "The tricky part was keeping stock consistent when sales come in from the shop and the counter at the same time…"
4. **Solution and trade-off:** "I used row-level locking inside a transaction and idempotent webhooks; the trade-off is…"
5. **Result / learning:** "…and if I did it again, I'd…"

### STAR na engleskom

"**S**ituation: At ITM we had duplicate invoices after a timeout. **T**ask: I had to find the cause and fix it without downtime. **A**ction: I added an idempotency key to the endpoint and a unique index… **R**esult: no duplicates since, and we added the pattern to other endpoints."

## Lab

1. Snimi sebe (telefon) kako za 2 minuta objašnjavaš Zalihe po šablonu iznad. Preslušaj i zapiši reči na kojima si zastao.
2. Napiši tri STAR priče iz P8 na engleskom i izgovori svaku naglas tri puta.
3. Uzmi 10 pitanja iz Intervju arene (.NET, React, SQL) i odgovori naglas na engleskom, sa tajmerom od 90 sekundi po pitanju.
4. Napravi svoj rečnik od 30 izraza koje ne znaš (iz dokumentacije koju čitaš u ovim poglavljima).
5. Zakaži jedan probni intervju na engleskom (prijatelj, kolega, ili AI u glasovnom režimu) i traži povratnu informaciju.

**Gotovo je kad:** imaš snimak objašnjenja projekta bez dužih pauza, tri STAR priče koje izgovaraš bez čitanja i završen jedan probni intervju.

## Pitanja sa intervjua

**P: Tell me about yourself.**
Dva minuta: ko si (.NET full stack, 5 godina), šta si radio (ITM: invoicing, warehouse, GoBD, e-invoicing za nemačko tržište), šta si sam napravio (Zalihe), i šta tražiš sledeće. Ne prepričavaj CV.

**P: What's a technical decision you regret?**
Iskren primer, šta si naučio i šta sada radiš drugačije. Pokazuje zrelost; „nikad nisam pogrešio” je loš odgovor.

## Test

### 1. Kako na engleskom kažeš „kompromis” u tehničkom smislu?
- [ ] compromise solution
- [ ] bargain
- [x] trade-off
- [ ] deal-breaker
> "The trade-off is higher memory usage for faster lookups."

### 2. Ne znaš sigurno odgovor. Koja fraza je najbolja?
- [ ] "I don't know."
- [ ] "Next question, please."
- [ ] Ćutiš dok ne smisliš
- [x] "I haven't used it in production, but my understanding is…"
> Iskreno, a ipak pokazuješ kako razmišljaš.

### 3. Šta znači "bottleneck"?
- [ ] Vrsta keša
- [ ] Zastareo kod
- [x] Usko grlo, deo sistema koji ograničava brzinu celine
- [ ] Greška u kodu
> "The database was the bottleneck, not the API."

### 4. Kako treba odgovoriti na "Tell me about yourself"?
- [ ] Pričati o hobijima
- [x] Kratko: ko si, ključno iskustvo, jedan projekat, šta tražiš sledeće
- [ ] Reći "it's all in my CV"
- [ ] Pročitati ceo CV hronološki
> Dva minuta, fokus na ono što je bitno za ulogu.

### 5. Šta je najbolji način da vežbaš tehnički engleski za intervju?
- [ ] Čitanje gramatike
- [x] Odgovaranje naglas, snimanje i probni intervjui
- [ ] Gledanje filmova bez titlova
- [ ] Učenje reči napamet bez konteksta
> Intervju je govor pod pritiskom; to se vežba govorom.

## Izvori
- [Tech Interview Handbook: behavioral pitanja](https://www.techinterviewhandbook.org/behavioral-interview/)
- [Cambridge Dictionary](https://dictionary.cambridge.org/)
