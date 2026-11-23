---
id: 10
subtitle: "pipeline, redosled, sopstveni middleware, Use/Run/Map, filteri, endpoint filteri"
minutes: 45
---
# 10 Middleware i filteri

Middleware je deo koda kroz koji prolazi **svaki** zahtev. Middleware-i su poređani u lanac (pipeline): svaki može da uradi nešto pre sledećeg, pozove sledeći (`await next(context)`), pa uradi nešto posle, ili da prekine lanac i odmah vrati odgovor (short-circuit).

## Pojmovi

### Pipeline kao luk

```
zahtev → UseExceptionHandler → UseStaticFiles → UseAuthentication → UseAuthorization → endpoint
odgovor ←        ←                    ←                  ←                    ←
```

Zahtev ide spolja ka unutra, odgovor nazad istim putem. **Redosled je bitan:** autorizacija bez prethodne autentifikacije ne zna ko je korisnik, a exception handler hvata samo izuzetke iz onoga što je posle njega. Preporučeni redosled iz dokumentacije (za uobičajenu aplikaciju):

```csharp
app.UseExceptionHandler();      // prvi: obuhvata sve ispod
app.UseHsts();                  // van Development
app.UseHttpsRedirection();
app.UseRouting();               // ako se ne pozove, ugrađen je na početku
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();           // posle autentifikacije ako limit zavisi od korisnika
app.MapControllers();           // endpointi na kraju
```

### Sopstveni middleware

```csharp
public class TimingMiddleware(RequestDelegate next, ILogger<TimingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var start = Stopwatch.GetTimestamp();
        await next(context);                               // sledeći u lancu
        logger.LogInformation("{Path} {Status} took {Ms:0.0} ms",
            context.Request.Path, context.Response.StatusCode, Stopwatch.GetElapsedTime(start).TotalMilliseconds);
    }
}
app.UseMiddleware<TimingMiddleware>();
// u logu: "/rok 200 took 18.4 ms", "/limit 200 took 0.2 ms"
```

Middleware klasa ovog oblika se napravi **jednom** (kao singleton), pa scoped servisi (DbContext) ne idu u njen konstruktor, nego kao **parametri `InvokeAsync`**, koje ASP.NET popuni za svaki zahtev.

| Metoda | Šta radi |
|---|---|
| `app.Use(...)` | dodaje middleware koji može da pozove sledeći |
| `app.Run(...)` | terminalni: nikad ne poziva sledeći, sve posle njega se ne izvršava |
| `app.Map("/putanja", ...)` | grana pipeline po putanji; `MapGet/MapPost` mapiraju endpoint |

### Filteri: oko akcije, ne oko zahteva

Filteri rade samo oko akcija kontrolera i znaju MVC kontekst (koja akcija, argumenti posle model binding-a, rezultat). Redosled: **Authorization → Resource → (model binding) → Action → akcija → Exception → Result**.

| | Middleware | Filter |
|---|---|---|
| Važi za | sve zahteve (i statičke fajlove) | akcije kontrolera (ili endpointe, uz endpoint filter) |
| Zna za | `HttpContext` | akciju, argumente, `ModelState`, rezultat |
| Primeri | logovanje, greške, autentifikacija, CORS | validacija, antiforgery, keš odgovora akcije |

**Endpoint filteri** su isto za minimal API:

```csharp
app.MapPost("/api/books/{bookId:int}/loans", (int bookId, CreateLoanRequest r) => ...)
   .AddEndpointFilter(async (ctx, next) =>
   {
       var bookId = ctx.GetArgument<int>(0);                      // argument posle binding-a
       return bookId <= 0
           ? TypedResults.Problem(title: "book.invalid_id", statusCode: 400)
           : await next(ctx);
   });
```

## Dublje

**Globalna obrada grešaka.** `AddProblemDetails()` + `UseExceptionHandler()` pretvaraju neuhvaćen izuzetak u `500 application/problem+json` sa `traceId`, bez poruke i stack trace-a izuzetka (detalji idu u log). Za prevođenje poznatih izuzetaka u druge kodove (npr. `DbUpdateConcurrencyException` u 409) implementira se `IExceptionHandler` i registruje sa `AddExceptionHandler<T>()`; handleri se pozivaju redom dok jedan ne vrati `true`.

**Terminalni middleware i `Response.HasStarted`.** Posle `await next(context)` odgovor je možda već poslat; menjanje zaglavlja tada baca izuzetak. Zaglavlja koja treba dodati svakom odgovoru postavljaju se kroz `context.Response.OnStarting(...)` ili pre poziva `next`.

**Middleware koji zavisi od endpointa.** Posle `UseRouting` middleware može da pročita izabrani endpoint i njegove metapodatke: `context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>()`. Tako rade autorizacija, CORS i rate limiter: ponašanje zavisi od atributa na endpointu.

**Kad šta.** Ono što važi za svaki zahtev i ne zavisi od akcije (merenje, korelacioni ID, zaglavlja) je middleware. Ono što zavisi od argumenata ili rezultata konkretne akcije je filter. Poslovno pravilo nije ni jedno ni drugo: ide u servis ili domen (pogl. 13).

## Lab

1. Napiši `TimingMiddleware` koji loguje putanju, status i trajanje, i registruj ga posle `UseExceptionHandler`.
2. Napiši middleware koji svakom odgovoru dodaje zaglavlje `X-Request-Id` (novi GUID ili vrednost iz dolaznog zaglavlja), preko `Response.OnStarting`.
3. Zameni redosled `UseAuthentication` i `UseAuthorization` u aplikaciji sa `[Authorize]` endpointom i zapiši šta se desi sa prijavljenim korisnikom; vrati redosled.
4. Napravi endpoint koji baca izuzetak i proveri da odgovor ima `status: 500`, `traceId` i nema poruku izuzetka; zatim dodaj `IExceptionHandler` koji `KeyNotFoundException` pretvara u 404.
5. Dodaj endpoint filter koji odbija `bookId <= 0` sa 400 ProblemDetails.
6. Napiši `app.Run(...)` ispred `MapGet` i proveri da se endpoint više nikad ne izvršava.

**Gotovo je kad:** svaki zahtev ima `X-Request-Id` i log sa trajanjem, greška vraća ProblemDetails bez detalja, a umeš da objasniš zašto je redosled iz koraka 3 bitan.

## Pitanja sa intervjua

**P: Šta je middleware i zašto je redosled bitan?**
Middleware je komponenta u pipeline-u koja dobije zahtev, može nešto da uradi, pa pozove sledeću (`next`) ili sama vrati odgovor. Redosled registracije je redosled izvršavanja: npr. UseAuthentication mora pre UseAuthorization, a UseExceptionHandler na početak da bi hvatao greške iz svega posle.

**P: Koja je razlika između middleware-a i filtera?**
Middleware radi za svaki zahtev, na nivou HTTP-a, i ne zna za akciju ili model. Filteri (action, exception, resource) rade samo oko MVC akcija ili endpointa i vide argumente akcije i rezultat. Za logovanje svih zahteva middleware, za validaciju argumenata konkretnih akcija filter.

**P: Šta znači „short-circuit” u pipeline-u?**
Middleware vrati odgovor bez pozivanja `next`, pa ostatak pipeline-a ne radi. Tako radi npr. middleware za statičke fajlove kad nađe fajl, ili provera API ključa koja odmah vrati 401.

**P: Use, Run i Map?**
Use dodaje middleware koji može da pozove sledeći; Run je terminalni i završava lanac; Map grana pipeline po putanji, a MapGet/MapPost mapiraju endpoint.

**P: Kako bi globalno obradio greške u API-ju?**
`AddProblemDetails` i `UseExceptionHandler` na početku pipeline-a: svaka neuhvaćena greška postaje 500 ProblemDetails sa traceId, a detalji idu u log. Poznate greške (konflikt verzije, nepostojeći resurs) prevodi `IExceptionHandler` u odgovarajući kod.

## Test

### 1. Kojim redom moraju da stoje ova dva poziva?
- [x] `app.UseAuthentication();` pa `app.UseAuthorization();`
- [ ] `app.UseAuthorization();` pa `app.UseAuthentication();`
- [ ] Redosled nije bitan
- [ ] Ne smeju oba da postoje
> Autorizacija odlučuje šta korisnik sme, a za to mora prvo da se zna ko je (autentifikacija). Obrnut redosled znači da autorizacija vidi anonimnog korisnika.

### 2. Šta se dešava ako middleware ne pozove `next()`?
- [ ] Baca se izuzetak
- [x] Pipeline se prekida i odgovor se vraća odatle
- [ ] Sledeći middleware se ipak izvršava
- [ ] Zahtev se ponavlja
> To je short-circuit. Koristi se namerno (keš, statički fajlovi, odbijanje zahteva), ali greškom zaboravljen `next` „guta” sve zahteve.

### 3. Gde treba da stoji middleware za obradu izuzetaka (UseExceptionHandler)?
- [x] Na početku pipeline-a
- [ ] Na kraju, posle mapiranja endpointa
- [ ] Odmah posle UseAuthorization
- [ ] Svejedno je
> Middleware hvata samo izuzetke iz onoga što dolazi posle njega. Na početku obuhvata ceo pipeline.

### 4. Šta može action filter, a middleware ne može?
- [ ] Da vidi HTTP zaglavlja
- [x] Da vidi argumente akcije posle model bindinga
- [ ] Da vrati odgovor 401
- [ ] Da meri trajanje zahteva
> Filter radi u kontekstu akcije i vidi vezane argumente i rezultat. Middleware vidi samo sirov HttpContext.

### 5. Koja je razlika između `app.Use(...)` i `app.Run(...)`?
- [ ] Nema razlike
- [x] Use može da pozove sledeći middleware, Run je terminalni i nikad ne poziva sledeći
- [ ] Run se izvršava pre Use
- [ ] Use je samo za statičke fajlove
> Run završava pipeline. Sve registrovano posle njega se ne izvršava.

## Izvori
- [Microsoft Learn: middleware i redosled](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/)
- [Microsoft Learn: filteri u MVC-u](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters)
- [Microsoft Learn: endpoint filteri](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters)
- [Microsoft Learn: obrada grešaka (IExceptionHandler)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling)
=====
---
id: 11
subtitle: "kontroleri i minimal API, rutiranje, model binding, validacija, DTO, ProblemDetails, OpenAPI"
minutes: 55
---
# 11 Web API

Kontroler (ili minimal API handler) je **tanak sloj**: HTTP zahtev pretvori u poziv servisa, a rezultat u HTTP odgovor. Poslovne logike u njemu nema. Ovo poglavlje je ugovor API-ja: kako se dolazi do akcije, kako se proverava ulaz i kako izgledaju greške.

## Pojmovi

```csharp
public record CreateLoanRequest(
    [Required(ErrorMessage = "validation.required")] Guid? MemberId,
    [Range(1, 60, ErrorMessage = "validation.out_of_range")] int Days = 14);

[ApiController]                                   // automatska validacija → 400
[Authorize]
public class LoansController(LoanService loans) : ControllerBase
{
    [HttpPost("api/books/{bookId:guid}/loans")]
    [ProducesResponseType<LoanDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create(Guid bookId, CreateLoanRequest request, CancellationToken ct)
    {
        var result = await loans.LendAsync(bookId, request.MemberId!.Value, request.Days, ct);
        if (result.NotFound) return NotFound();
        if (!result.Succeeded) return Problem(statusCode: 400, title: result.ErrorCode);
        return CreatedAtAction(nameof(Get), new { id = result.Loan!.Id }, result.Loan);
    }
}
```

### Rutiranje i model binding

- **Attribute routing:** ruta je na akciji. `{bookId:guid}` je **ograničenje**: `/api/books/abc/loans` ne pogodi akciju, pa je 404.
- **Model binding** puni parametre: `bookId` iz rute, `request` iz JSON tela (složeni tipovi uz `[ApiController]`), `[FromQuery] int page` iz upita, `CancellationToken` sam.
- **Validacija:** atributi (`[Required]`, `[MaxLength]`, `[Range]`) se proveravaju pre akcije; uz `[ApiController]` neispravan model odmah vraća 400 sa listom grešaka. Pravila koja traže bazu („član već ima 5 pozajmica”) proverava servis.
- **DTO:** API vraća i prima posebne tipove, ne entitete iz baze. Izlaz ne otkriva interna polja, a ulaz sprečava **overposting** (klijent postavi polje koje ne sme, npr. `IsAdmin`).

### Minimal API

```csharp
builder.Services.AddValidation();            // .NET 10: ista DataAnnotations validacija i za minimal API

app.MapPost("/api/books/{bookId:int}/loans", async (int bookId, CreateLoanRequest r, LoanService s, CancellationToken ct) =>
    await s.LendAsync(bookId, r, ct) is { } loan
        ? TypedResults.Created($"/api/loans/{loan.Id}", loan)
        : TypedResults.NotFound());
```

Bez tela, sa praznim `MemberId` i `days: 90`, odgovor je 400 sa `errors: { "MemberId": [...], "Days": [...] }`. Kontroleri i minimal API koriste isti pipeline, DI i binding; razlika je organizacija koda (filteri, konvencije, grupisanje sa `MapGroup`).

### Greške: ProblemDetails

ProblemDetails (RFC 9457) je standardni JSON za greške (`application/problem+json`): `type`, `title`, `status`, `detail`, za validaciju `errors`, a ASP.NET Core dodaje `traceId`. Dobra praksa je da API vraća **kodove** umesto prevedenih poruka; klijent ih prevodi na jezik korisnika.

```json
{ "status": 400, "title": "One or more validation errors occurred.",
  "errors": { "MemberId": ["validation.required"] }, "traceId": "00-4bf9…" }
```

### OpenAPI

OpenAPI je mašinski čitljiv opis API-ja: rute, parametri, tipovi i statusni kodovi. `AddOpenApi()` + `MapOpenApi()` ga generišu u vreme izvršavanja na `/openapi/v1.json`; od .NET 10 je to OpenAPI 3.1 (od .NET 11 i 3.2). Interaktivni UI (Swagger UI, Scalar) više nije u šablonu i dodaje se posebno. Iz dokumenta se prave dokumentacija i **generisani klijenti** za frontend (pogl. 28).

## Dublje

**Kodovi greške u celoj aplikaciji.** `AddProblemDetails(o => o.CustomizeProblemDetails = ...)` dodaje zajednička polja (npr. `code`) svakom ProblemDetails odgovoru, a `ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ...)` menja oblik automatskog 400 kod kontrolera. Tako i validacija, i 404, i neočekivani 500 imaju isti oblik koji frontend zna da prevede.

**Verzionisanje bez lomljenja.** Dodavanje polja u odgovor i opcionog polja u zahtev ne lomi klijente; uklanjanje, preimenovanje i promena značenja lome. Takve izmene idu u novu verziju (`/v2/...` ili zaglavlje, npr. biblioteka `Asp.Versioning`), uz rok za gašenje stare.

**Paginacija u odgovoru.** Lista vraća stranu i ukupan broj (`{ items, totalCount, page, pageSize }`) ili, za keyset paginaciju, kursor sledeće strane (`nextCursor`). Maksimalan `pageSize` se ograniči na serveru, inače `?pageSize=1000000` zaobiđe paginaciju.

**`TypedResults` umesto `Results`.** `TypedResults.Created(...)` vraća konkretan tip, pa OpenAPI sam zna statusne kodove i tipove odgovora, a handler se lakše testira bez HTTP-a (proveri se vraćeni objekat).

## Lab

1. Napravi kontroler `LoansController` sa `[ApiController]` i akcijom `POST api/books/{bookId:int}/loans` koja prima `CreateLoanRequest` sa `[Required]` i `[Range]`.
2. Pošalji prazno telo, telo sa `days: 90` i `bookId` koji nije broj; zapiši statusne kodove i `errors` iz odgovora.
3. Napravi isti endpoint kao minimal API sa `AddValidation()` i `TypedResults`, i uporedi odgovore.
4. Dodaj `AddProblemDetails` i u `CustomizeProblemDetails` upiši polje `code` (npr. `"validation.failed"` za 400, `"not_found"` za 404).
5. Uključi `AddOpenApi()`/`MapOpenApi()`, otvori `/openapi/v1.json` i proveri da su opisani kodovi 201, 400 i 404.
6. Napravi ulazni DTO bez polja `IsAdmin` i pokaži da poslato `"isAdmin": true` nema efekta (overposting).

**Gotovo je kad:** svaka greška ima isti ProblemDetails oblik sa kodom i `traceId`, a OpenAPI dokument tačno opisuje endpoint.

## Pitanja sa intervjua

**P: Zašto API vraća DTO, a ne entitet iz baze?**
Entitet je model baze: može da ima polja koja klijent ne sme da vidi (lozinka, interni status) ili cikluse koji ruše serijalizaciju. DTO je ugovor sa klijentom koji se menja nezavisno od baze. Na ulazu DTO sprečava overposting.

**P: Kako radiš paginaciju u API-ju?**
Najjednostavnije offset/limit (`?page=2&pageSize=20`, u SQL-u OFFSET/FETCH) uz ukupan broj. Za velike i promenljive skupove bolja je keyset (cursor) paginacija: „daj 20 posle ID-ja 4580”, jer ne preskače redove i radi brzo i na dalekim stranama.

**P: Šta je ProblemDetails?**
Standardni JSON format greške (RFC 9457, ranije 7807): `type`, `title`, `status`, `detail`, a za validaciju i `errors`. ASP.NET Core ga koristi za greške modela i AddProblemDetails, pa klijent uvek dobija isti oblik greške.

**P: Šta radi [ApiController]?**
Automatski 400 za neispravan model, vezivanje složenih tipova iz tela, obavezno attribute routing i ProblemDetails za greške.

**P: Kako verzionišeš API?**
Dok god samo dodaješ polja, verzija ostaje ista. Izmena koja lomi klijente (uklanjanje, preimenovanje, promena značenja) ide u novu verziju (`/v2` ili zaglavlje), a stara se gasi posle najavljenog roka.

**P: Kontroleri ili minimal API?**
Oba su punopravna i koriste isti pipeline. Minimal API je kraći i od .NET 10 ima ugrađenu validaciju; kontroleri daju filtere i konvencije koje veliki timovi poznaju. Veći API-ji koriste kontrolere ili grupe minimal endpointa (`MapGroup`).

## Test

### 1. Klijent pošalje JSON u kome nedostaje obavezno polje. Šta vraća kontroler sa [ApiController]?
- [ ] 500 Internal Server Error
- [x] 400 Bad Request sa ProblemDetails i listom grešaka
- [ ] 200 OK sa praznim objektom
- [ ] 422, uvek
> [ApiController] automatski proverava ModelState i vraća 400 pre nego što akcija krene. Telo je ValidationProblemDetails.

### 2. Šta je overposting?
- [ ] Slanje previše zahteva u sekundi
- [x] Klijent postavi polje koje ne bi smeo (npr. `IsAdmin`) jer API vezuje ceo entitet
- [ ] Slanje istog POST zahteva dvaput
- [ ] Prevelik JSON odgovor
> Ako akcija prima entitet direktno, svako njegovo polje može doći iz zahteva. Ulazni DTO sa samo dozvoljenim poljima to sprečava.

### 3. Odakle ASP.NET Core podrazumevano čita složen parametar (klasu) u POST akciji sa [ApiController]?
- [ ] Iz query stringa
- [ ] Iz zaglavlja
- [x] Iz tela zahteva (JSON)
- [ ] Iz kolačića
> Složeni tipovi se vezuju iz tela ([FromBody]), a prosti (int, string) iz rute ili query stringa.

### 4. Zašto keyset paginacija (`WHERE Id > @poslednji`) radi bolje od OFFSET na 500. strani?
- [ ] Vraća više redova
- [x] Baza ne mora da prođe i odbaci sve prethodne redove, nego skoči kroz indeks
- [ ] Ne treba joj indeks
- [ ] Radi samo sa GUID ključevima
> OFFSET 10000 i dalje čita 10000 redova da bi ih preskočio. Keyset koristi indeks i počinje tačno gde treba, pa je brzina ista na svakoj strani.

### 5. Šta je dobra praksa za verzionisanje javnog API-ja?
- [ ] Menjati postojeće endpointe bez najave
- [x] Uvesti novu verziju (npr. `/v2/...`) kad se menja ugovor na način koji kvari postojeće klijente
- [ ] Nikad ne menjati API
- [ ] Svaki klijent dobija svoj API
> Dodavanje novog polja obično ne kvari klijente; uklanjanje ili promena značenja kvari. Takve izmene idu u novu verziju dok stari klijenti ne pređu.

## Izvori
- [Microsoft Learn: web API sa kontrolerima](https://learn.microsoft.com/en-us/aspnet/core/web-api/)
- [Microsoft Learn: model binding](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding)
- [Microsoft Learn: šta je novo u ASP.NET Core 10 (validacija, OpenAPI 3.1)](https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0)
- [Microsoft Learn: OpenAPI u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi)
- [RFC 9457: Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
=====
---
id: 12
subtitle: "tabele i ključevi, SQL, JOIN, EF Core, change tracker, N+1, migracije"
minutes: 60
---
# 12 SQL i EF Core

Podaci aplikacije žive u relacionoj bazi: tabele, redovi i veze. EF Core je most između C# objekata i tih tabela: LINQ prevodi u SQL, a izmene objekata u INSERT, UPDATE i DELETE. Da bi se EF koristio dobro, treba znati i SQL koji on šalje.

## Pojmovi

### Relaciona baza

Podaci su u **tabelama** (redovi i kolone). Svaki red ima **primarni ključ** (PK) koji ga jednoznačno određuje. Veza između tabela je **strani ključ** (FK): kolona koja čuva PK reda iz druge tabele i koju baza proverava (ne može pozajmica nepostojeće knjige).

```
Books(Id PK, Title, AvailableCopies)    Loans(Id PK, BookId FK, MemberId FK, LoanedAt, ReturnedAt NULL)    Members(Id PK, Name, Email UNIQUE)
```

Knjiga ima mnogo pozajmica (1:N), član mnogo pozajmica (1:N), pa su knjige i članovi u vezi N:N preko `Loans`. **Normalizacija:** svaki podatak na jednom mestu (ime člana samo u `Members`), da se ne bi razilazio.

```sql
SELECT "Title", "AvailableCopies" FROM "Books" WHERE "AvailableCopies" > 0 ORDER BY "Title";
INSERT INTO "Loans" ("BookId", "MemberId", "LoanedAt") VALUES (@book, @member, now());
UPDATE "Books" SET "AvailableCopies" = "AvailableCopies" - 1 WHERE "Id" = @book;

-- JOIN spaja po vezi; GROUP BY grupiše; HAVING filtrira grupe
SELECT m."Name", COUNT(*) AS active
FROM "Loans" l JOIN "Members" m ON m."Id" = l."MemberId"
WHERE l."ReturnedAt" IS NULL
GROUP BY m."Name" HAVING COUNT(*) >= 3;
```

**INNER JOIN** vraća samo redove koji imaju par, **LEFT JOIN** sve sa leve strane (desne kolone NULL kad para nema). **WHERE** filtrira pre grupisanja, **HAVING** posle (više u pogl. 47).

### EF Core

```csharp
public class LibraryDb(DbContextOptions<LibraryDb> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Loan> Loans => Set<Loan>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Book>().Property(x => x.Title).HasMaxLength(200);
        b.Entity<Member>().HasIndex(m => m.Email).IsUnique();
    }
}

var book = await db.Books.SingleAsync(b => b.Id == bookId, ct);
book.Lend();                                         // menja objekat u memoriji
db.Loans.Add(new Loan { BookId = book.Id, MemberId = memberId, LoanedAt = now });
await db.SaveChangesAsync(ct);                       // UPDATE + INSERT u jednoj transakciji
```

**Change tracker:** `DbContext` pamti učitane objekte i njihovo stanje (Added, Unchanged, Modified, Deleted); `SaveChangesAsync` iz toga pravi SQL i izvrši ga u **jednoj transakciji** (Modified → UPDATE samo promenjenih kolona).

### Od LINQ-a do SQL-a

```csharp
db.Books.AsNoTracking()
  .Where(b => b.AvailableCopies > 0 && b.Title.ToLower().Contains(term))
  .OrderBy(b => b.Title).Skip((page - 1) * pageSize).Take(pageSize)
  .Select(b => new BookDto(b.Id, b.Title, b.AvailableCopies))
  .ToListAsync(ct);
```

```sql
-- SQL koji EF Core 10 + Npgsql pošalje (term = "hob", strana 3 po 20)
-- @term_contains='%hob%', @p='40' (preskoči), @p2='20' (uzmi)
SELECT b."Id", b."Title", b."AvailableCopies" FROM "Books" AS b
WHERE b."AvailableCopies" > 0 AND lower(b."Title") LIKE @term_contains
ORDER BY b."Title" LIMIT @p2 OFFSET @p
```

Vrednosti idu kao **parametri**, nikad kao deo SQL teksta. SQL bilo kog upita vidiš sa `query.ToQueryString()` ili u logu kategorije `Microsoft.EntityFrameworkCore.Database.Command`.

| Tehnika | Šta daje (izmereno na 40 pozajmica) |
|---|---|
| petlja koja za svaku pozajmicu traži knjigu | **N+1: 41 upit** |
| `Include(l => l.Book)` | 1 upit (JOIN), celi entiteti |
| `Select(l => new { l.Id, Naslov = l.Book!.Title })` | 1 upit, samo dve kolone |
| `AsNoTracking()` | change tracker ne pamti učitano (manje memorije, brže) |
| `ExecuteUpdateAsync` / `ExecuteDeleteAsync` | 16 redova izmenjeno **jednim** UPDATE-om, bez učitavanja |

**Sirov SQL bezbedno:** `db.Books.FromSql($"SELECT * FROM \"Books\" WHERE \"Title\" = {naslov}")` pretvara interpolaciju u parametar, pa ni `naslov = "x'; DROP TABLE \"Books\"; --"` ne radi ništa osim što ne nađe knjigu. Opasno je samo ručno spajanje stringa sa `FromSqlRaw`.

**Učitavanje veza:** eager (`Include` odmah), explicit (kasnije, na zahtev), lazy (automatski pri pristupu svojstvu; lako pravi N+1, zato se retko uključuje).

### Migracije

Migracija je C# fajl koji opisuje promenu šeme (`Up` i `Down`), napravljen iz razlike modela u kodu i poslednjeg snimka (snapshot). Ide kroz code review kao i ostali kod.

```
dotnet ef migrations add AddLoanDueDate       # nova migracija iz razlike
dotnet ef database update                     # primeni na bazu
dotnet ef migrations script --idempotent      # SQL skripta za produkciju
```

## Dublje

**EF Core 10 novine koje se vide u upitima.** `LeftJoin` i `RightJoin` su sada pravi LINQ operatori (.NET 10), umesto kombinacije `GroupJoin` + `SelectMany` + `DefaultIfEmpty`:

```csharp
var nikadPozajmljene = await db.Books
    .LeftJoin(db.Loans, b => b.Id, l => l.BookId, (b, l) => new { b.Title, LoanId = (int?)l!.Id })
    .Where(x => x.LoanId == null).CountAsync();          // LEFT JOIN ... WHERE l."Id" IS NULL
```

Global query filteri mogu biti **imenovani** (više filtera po entitetu, npr. „obrisano” i „firma”), pa se pojedinačno isključuju (`IgnoreQueryFilters(["SoftDelete"])`). Complex types mogu da se mapiraju u JSON kolonu.

**Cartesian explosion.** `Include` dve kolekcije (stavke i slike porudžbine) množi redove: 10 stavki × 10 slika = 100 redova za jednu porudžbinu. `AsSplitQuery()` ih učita u odvojenim upitima (pogl. 45).

**Migracije u produkciji.** `Database.MigrateAsync()` pri startu je jednostavno za jednu instancu. Sa više instanci migracije postaju poseban korak isporuke (SQL skripta ili `efbundle`), a izmene šeme moraju biti kompatibilne sa starom i novom verzijom koda istovremeno (expand/contract, pogl. 38).

**Transakcija preko više `SaveChanges`.** Jedan `SaveChanges` je jedna transakcija. Kad posao traži više koraka (zaključaj red, pa upiši), koristi se `await using var tx = await db.Database.BeginTransactionAsync(ct)` i `CommitAsync` na kraju (pogl. 14).

## Lab

1. Pokreni Postgres (`docker run -d -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:17`), napravi model `Book`, `Member`, `Loan` i `LibraryDb` sa jedinstvenim indeksom na `Email`, i prvu migraciju (`dotnet ef migrations add Initial`, `dotnet ef database update`).
2. Ubaci 50 knjiga, 3 člana i 40 pozajmica; napiši SQL upit (u `psql`) koji broji aktivne pozajmice po članu sa `GROUP BY` i `HAVING`.
3. Napiši `DbCommandInterceptor` koji broji upite (ili uključi log `Database.Command`) i izmeri: petlju (N+1), `Include` i projekciju u DTO.
4. Ispiši `ToQueryString()` za pretragu po naslovu sa paginacijom i pronađi parametre u SQL-u.
5. Izmeni sve knjige bez slobodnih primeraka sa `ExecuteUpdateAsync` i proveri broj upita; zatim isto sa učitavanjem i `SaveChanges` i uporedi.
6. Pokušaj SQL injection kroz `FromSql` (interpolacija) i kroz `FromSqlRaw` sa spojenim stringom (na bazi za vežbu!) i objasni razliku.
7. Dodaj kolonu `DueDate` u `Loan`, napravi migraciju, pročitaj generisani `Up`/`Down` i izvezi `migrations script --idempotent`.

**Gotovo je kad:** imaš tabelu sa brojem upita za tri pristupa (41, 1, 1), migraciju sa skriptom za produkciju i umeš da pokažeš parametre u SQL-u koji EF šalje.

## Pitanja sa intervjua

**P: Šta je N+1 problem i kako ga rešavaš u EF Core-u?**
Učitaš N porudžbina jednim upitom, pa u petlji za svaku pristupiš stavkama i lazy loading pošalje još N upita. Rešenje: Include (eager loading) ili projekcija sa Select koja odmah uzme potrebne podatke, pa ide jedan (ili nekoliko) upita.

**P: Čemu služi AsNoTracking?**
Upit bez praćenja promena: EF ne pravi snimke entiteta u change tracker-u, pa je brži i troši manje memorije. Koristiš ga za upite samo za čitanje (liste, izveštaji). Ako planiraš izmenu i SaveChanges, treba ti praćenje.

**P: Kako radiš sa migracijama u timu i produkciji?**
Migracija je fajl u repozitorijumu koji opisuje promenu šeme; pravi se sa `dotnet ef migrations add` i ide kroz code review. U produkciji se primenjuje kontrolisano: SQL skripta (`migrations script --idempotent`), korak u pipeline-u ili pri startu aplikacije kad radi jedna instanca, uz backup pre rizičnih izmena.

**P: PK, FK i unique indeks?**
PK jednoznačno određuje red; FK pokazuje na red druge tabele i baza ne dozvoljava vezu ka nepostojećem redu; unique indeks zabranjuje duplikate (email) i ubrzava pretragu po toj koloni.

**P: Kako EF štiti od SQL injection-a?**
Vrednosti iz LINQ-a i iz interpolacije u `FromSql` šalje kao parametre, odvojeno od SQL teksta. Ranjivo je samo ručno spajanje stringova u `FromSqlRaw` ili `ExecuteSqlRaw`.

**P: Include ili Select?**
Select (projekcija u DTO) za prikaz: samo potrebne kolone i bez praćenja. Include kad učitavaš entitet da bi ga menjao i sačuvao.

## Test

### 1. Koliko SQL upita šalje ovaj kod za 50 porudžbina, uz lazy loading?
```csharp
var porudzbine = db.Porudzbine.ToList();
foreach (var p in porudzbine)
    Console.WriteLine(p.Stavke.Count);
```
- [ ] 1
- [ ] 2
- [x] 51
- [ ] 50
> Jedan upit za porudžbine i po jedan za stavke svake: N+1. Sa `.Include(p => p.Stavke)` ili projekcijom bio bi jedan upit.

### 2. Kada koristiš AsNoTracking()?
- [ ] Kad menjaš entitet pa zoveš SaveChanges
- [x] Kad samo čitaš podatke za prikaz
- [ ] Kad brišeš redove
- [ ] Nikad, usporava upite
> Bez praćenja EF ne pamti snimak entiteta, pa je čitanje brže. Izmene na takvim entitetima SaveChanges ne vidi.

### 3. Koji JOIN vraća sve kupce, i one bez ijedne porudžbine?
- [ ] INNER JOIN
- [x] LEFT JOIN od kupaca ka porudžbinama
- [ ] CROSS JOIN
- [ ] RIGHT JOIN od kupaca ka porudžbinama
> LEFT JOIN zadržava sve redove leve tabele; gde nema para, kolone desne su NULL. INNER JOIN izbacuje kupce bez porudžbina.

### 4. Šta radi `SaveChanges()` kad si izmenio tri entiteta?
- [ ] Šalje tri odvojene transakcije
- [x] Šalje sve izmene u jednoj transakciji: ili sve uspe, ili ništa
- [ ] Čuva samo prvu izmenu
- [ ] Ništa, treba pozvati Commit
> Jedan SaveChanges je podrazumevano jedna transakcija. Za više SaveChanges u istoj transakciji koristi BeginTransaction.

### 5. Kako indeks ubrzava upit `WHERE Email = @email`?
- [ ] Kešira ceo rezultat u memoriji
- [x] Baza pretražuje uređenu strukturu (B-stablo) umesto da čita svaki red tabele
- [ ] Sabija tabelu
- [ ] Paralelizuje upit na više jezgara
> Bez indeksa je full table scan, O(n). Indeks je kao registar u knjizi: brzo nađe red. Cena: sporiji INSERT/UPDATE i više prostora.

## Izvori
- [Microsoft Learn: EF Core](https://learn.microsoft.com/en-us/ef/core/)
- [Microsoft Learn: učitavanje povezanih podataka](https://learn.microsoft.com/en-us/ef/core/querying/related-data/)
- [Microsoft Learn: sirov SQL i parametri](https://learn.microsoft.com/en-us/ef/core/querying/sql-queries)
- [Microsoft Learn: ExecuteUpdate i ExecuteDelete](https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete)
- [Microsoft Learn: migracije](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
- [Microsoft Learn: šta je novo u EF Core 10](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-10.0/whatsnew)
- [PostgreSQL: SELECT i JOIN](https://www.postgresql.org/docs/current/queries-table-expressions.html)
=====
---
id: 13
subtitle: "slojevi, Clean Architecture, SOLID, bogat i anemičan model, obrasci"
minutes: 55
---
# 13 Arhitektura i SOLID

Kad aplikacija raste, pitanje više nije „kako da radi”, nego „kako da ostane laka za menjanje”. Arhitektura određuje gde ide koji kod i ko sme da zavisi od koga, tako da se poslovna pravila mogu menjati i testirati bez baze, frameworka i spoljnih servisa.

## Pojmovi

### Slojevi i Clean Architecture

Zavisnosti idu **samo ka unutra**: spoljni sloj sme da zna za unutrašnji, nikad obrnuto.

| Sloj | Šta je u njemu | Primer (Biblioteka) |
|---|---|---|
| Domain | entiteti i pravila, bez zavisnosti | `Book.Lend()`: nema pozajmice bez slobodnog primerka |
| Application | slučajevi korišćenja, interfejsi ka spolja | `LoanService.LendAsync`, `INotifier`, `ILibraryDb` |
| Infrastructure | tehnika: baza, email, HTTP ka spolja | `LibraryDb` (EF Core), `EmailNotifier` |
| Web | HTTP ulaz, konfiguracija, DI | `LoansController`, `Program.cs` |

**Kako onda servis piše u bazu?** Application definiše interfejs (`INotifier`, `ILibraryDb`), Infrastructure ga implementira, a DI ih spaja pri pokretanju. To je **inverzija zavisnosti**. Kad je svaki sloj poseban projekat, pravilo proverava kompajler: Domain projekat nema referencu ni na EF Core ni na ASP.NET. Portovi i adapteri (heksagonalna arhitektura) je ista ideja: jezgro definiše „port”, a spoljni „adapteri” ga implementiraju.

### SOLID

| Princip | Ukratko | Primer |
|---|---|---|
| Single Responsibility | klasa ima jedan razlog za promenu | `LoanService` pozajmljuje, `ReminderService` šalje podsetnike |
| Open/Closed | proširuje se dodavanjem, ne menjanjem | nov način obaveštavanja = nova implementacija `INotifier` |
| Liskov Substitution | naslednik sme da zameni roditelja bez iznenađenja | `FakeNotifier` ne baca izuzetke koje pravi ne bi |
| Interface Segregation | mali, usko namenjeni interfejsi | `INotifier` samo šalje, ne čita poštu |
| Dependency Inversion | zavisi od apstrakcije | servis traži `INotifier`, ne `EmailNotifier` |

### Anemičan i bogat model

```csharp
// Anemičan: samo podaci; pravilo je u servisu i lako se zaobiđe na drugom mestu
public class Book { public int AvailableCopies { get; set; } }
book.AvailableCopies -= 1;

// Bogat: podaci + pravila; jedini način promene
public class Book
{
    public int AvailableCopies { get; private set; }
    public void Lend()
    {
        if (AvailableCopies == 0) throw new InvalidOperationException("Nema slobodnih primeraka.");
        AvailableCopies--;
    }
}
```

Bogat model ne može da se dovede u neispravno stanje: privatni setteri, provere u konstruktoru i **fabričke metode sa imenom** (`Loan.Start(...)`, `Loan.Return(...)`) umesto javnog konstruktora sa deset parametara. Objekte koji se ne menjaju (zapis u istoriji) najbolje je praviti nepromenljivim.

### Obrasci koje treba prepoznati

| Obrazac | Ideja | Napomena |
|---|---|---|
| Repository / Unit of Work | kolekcija entiteta / skup izmena koje se čuvaju zajedno | `DbSet` i `DbContext` to već jesu |
| CQRS | odvojeni modeli za pisanje i čitanje | korisno kad se čitanje i pisanje jako razlikuju |
| Mediator (MediatR) | kontroler šalje poruku, handler je obradi | dodaje indirekciju; od 2025. i pitanje licence (P2) |
| Event sourcing | stanje se izvodi iz niza događaja | savršena istorija, ali složeno |
| Factory, Strategy, Adapter | pravljenje objekata, zamenljivo ponašanje, prilagođavanje | česti i u malim projektima (P2) |

## Dublje

**Vertical slice umesto horizontalnih foldera.** Unutar projekta kod se može organizovati po vrsti (`Controllers/`, `Services/`, `Models/`) ili po funkciji (`Loans/`, `Members/`, `Reports/`), gde je sve za jednu funkciju na jednom mestu. Organizacija po funkciji smanjuje skakanje kroz foldere i drži izmenu u jednom delu koda; slojevi i pravilo zavisnosti i dalje važe.

**Arhitektonski testovi.** Pravilo „Domain ne zavisi od Infrastructure” može da se proveri testom (biblioteke kao NetArchTest ili ArchUnitNET čitaju reference sklopova), pa prekršaj padne u CI-ju, a ne u code review-u. Kad su slojevi odvojeni projekti, deo toga radi već kompajler.

**Value object.** Pojam bez identiteta koji se poredi po vrednosti (`Money(Iznos, Valuta)`, `Email`): pravi se samo ispravan (validacija u konstruktoru), nepromenljiv je i nosi ponašanje (`Money.Add` odbija sabiranje različitih valuta). U C#-u je prirodno `record`. Leči „primitive obsession” (P1).

**Koliko arhitekture.** Clean arhitektura ima cenu: više projekata, interfejsa i mapiranja. Za mali CRUD od par tabela jedan projekat sa jasnim folderima je ispravan izbor; slojevi se uvode kad pravila postanu složena ili kad delovi moraju da se menjaju nezavisno. Na intervjuu se ceni obrazloženje, ne broj slojeva.

## Lab

1. Napravi solution sa projektima `Biblioteka.Domain`, `Biblioteka.Application`, `Biblioteka.Infrastructure` i `Biblioteka.Web` i dodaj reference samo ka unutra.
2. U Domain napiši bogat `Book` (`Lend`, `Return`) i `Loan.Start(...)`; napiši unit testove za pravila, bez ijednog paketa.
3. U Application napiši `ILibraryDb` i `INotifier` i `LoanService` koji ih koristi; u Infrastructure implementacije (EF Core i konzolni notifier); poveži ih u `Program.cs`.
4. Pokušaj da iz Domain-a referenciraš EF Core i zapiši zašto je to prekršaj; ukloni.
5. Napravi value object `Email` sa validacijom i upotrebi ga u `Member`.
6. Napiši kratak test (ručno preko `typeof(Book).Assembly.GetReferencedAssemblies()` ili bibliotekom) koji pada ako Domain referencira Infrastructure.

**Gotovo je kad:** Domain se builda bez ijednog NuGet paketa, pravila imaju unit testove, a zamena konzolnog notifier-a email notifier-om menja samo Infrastructure i jednu liniju u `Program.cs`.

## Pitanja sa intervjua

**P: Objasni SOLID ukratko.**
S: klasa ima jedan razlog za promenu. O: proširuješ ponašanje novim kodom, ne menjanjem postojećeg. L: podtip mora da radi svuda gde i osnovni tip. I: mali, specifični interfejsi umesto jednog velikog. D: zavisi od apstrakcija, a konkretne implementacije se ubacuju spolja.

**P: Šta je suština Clean (Onion) arhitekture?**
Zavisnosti idu ka centru: domen i poslovna pravila ne zavise od baze, web-a ni okvira; infrastruktura zavisi od njih (implementira njihove interfejse). Tako se pravila testiraju bez baze, a tehnologija se menja bez diranja pravila.

**P: Da li treba repository iznad EF Core-a?**
Zavisi. DbContext je već Unit of Work, a DbSet repository, pa generički repository često samo sakrije korisne mogućnosti EF-a. Specifičan repository ima smisla kad želiš da izoluješ složene upite ili domen od EF-a. Bitno je da umeš da obrazložiš izbor.

**P: Anemičan ili bogat model?**
Bogat: entitet čuva svoje invarijante (privatni setteri, metode sa pravilima), pa pravilo ne može da se zaobiđe sa drugog mesta u kodu. Anemičan model drži pravila u servisima, gde se lako ponove ili zaborave.

**P: Kada CQRS i MediatR?**
CQRS kad čitanje i pisanje imaju vrlo različite potrebe (složeni izveštaji naspram jednostavnih komandi) ili različito skaliraju. MediatR je samo alat za slanje poruka handlerima; u malom timu i projektu je višak indirekcije, a od 2025. i pitanje licence.

## Test

### 1. Klasa `IzvestajServis` računa izveštaj, formatira PDF i šalje mejl. Koje načelo krši?
- [x] Single Responsibility
- [ ] Liskov Substitution
- [ ] Interface Segregation
- [ ] Nijedno
> Tri razloga za promenu (računanje, format, slanje) u jednoj klasi. Bolje je razdvojiti, pa ih spojiti u servisu koji koordinira.

### 2. Novi način plaćanja dodaješ novom klasom koja implementira IPaymentProvider, bez izmene postojećeg koda. Koje načelo to ispunjava?
- [ ] Single Responsibility
- [x] Open/Closed
- [ ] Liskov Substitution
- [ ] Dependency Inversion
> Kod je otvoren za proširenje (nova implementacija), a zatvoren za izmenu (postojeće klase se ne diraju).

### 3. `Kvadrat` nasleđuje `Pravougaonik`, ali postavljanje širine menja i visinu, pa kod koji radi sa Pravougaonikom daje pogrešan rezultat. Koje načelo je prekršeno?
- [ ] Open/Closed
- [x] Liskov Substitution
- [ ] Interface Segregation
- [ ] Single Responsibility
> Podtip mora da poštuje ponašanje osnovnog tipa. Ako zamena podtipom kvari pozivaoca, nasleđivanje je pogrešan model.

### 4. U Clean arhitekturi, ko od koga zavisi?
- [ ] Domen zavisi od Infrastructure sloja
- [x] Infrastructure zavisi od domena i implementira njegove interfejse
- [ ] Svi slojevi zavise od API projekta
- [ ] Zavisnosti nisu bitne
> Strelice zavisnosti idu ka centru. Domen definiše npr. IEmailSender, a Infrastructure ga implementira.

### 5. Šta kaže Dependency Inversion?
- [ ] Klase treba praviti sa `new` gde god zatrebaju
- [x] Moduli visokog nivoa zavise od apstrakcija, ne od konkretnih implementacija
- [ ] Zavisnosti se uvek ubacuju kroz svojstva
- [ ] Interfejs mora imati bar jednu metodu
> Servis zavisi od IEmailSender, a ne od SmtpEmailSender. DI kontejner je alat koji to sprovodi, ali načelo je o smeru zavisnosti.

## Izvori
- [Microsoft Learn: arhitekture web aplikacija (Clean Architecture)](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
- [Microsoft Learn: principi arhitekture (SOLID, DI)](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles)
- [Martin Fowler: Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [Martin Fowler: CQRS](https://martinfowler.com/bliki/CQRS.html)
=====
---
id: 14
subtitle: "ACID, izgubljena izmena, FOR UPDATE, xmin, atomski UPDATE, deadlock, izolacija, indeksi"
minutes: 60
---
# 14 Transakcije i konkurentnost

Server opslužuje mnogo korisnika istovremeno. Kad dva zahteva menjaju isti podatak u isto vreme, bez zaštite jedan „pregazi” drugog. Ovo je tema koja na intervjuu odvaja juniora od mediora, i jedina u kojoj greška ne pukne u testu sa jednim korisnikom.

## Pojmovi

### Transakcija i ACID

| | Značenje | Primer |
|---|---|---|
| Atomicity | sve ili ništa | pozajmica i smanjenje primeraka zajedno |
| Consistency | ograničenja uvek važe | jedinstven email, strani ključevi |
| Isolation | istovremene transakcije se ne mešaju (koliko, zavisi od nivoa) | dvoje ne pozajme poslednji primerak |
| Durability | potvrđeno ostaje i posle pada | zapis u WAL log baze pre potvrde |

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
// ... više čitanja i izmena ...
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);          // bez Commit-a, Dispose radi Rollback
```

### Izgubljena izmena (lost update): izmereno

Deset istovremenih zahteva pokušava da pozajmi **jedini** primerak knjige (Postgres, EF Core 10):

| Pristup | Rezultat |
|---|---|
| pročitaj → proveri → upiši, bez zaštite | **10 pozajmica**, stanje 0: devet je izmišljeno |
| `SELECT … FOR UPDATE` u transakciji | 1 pozajmica; ostali čekaju, pa vide 0 |
| atomski `UPDATE … WHERE Available > 0` | 1 uspelo od 10 |
| optimistički token (`xmin`) | 1 pozajmica, 9 × `DbUpdateConcurrencyException` |

```csharp
// pesimistički: zaključaj red do kraja transakcije
var book = await db.Books
    .FromSql($"SELECT *, xmin FROM \"Books\" WHERE \"Id\" = {id} FOR UPDATE")   // xmin: SELECT * ga ne vraća
    .SingleAsync(ct);

// atomski: provera i izmena u jednoj naredbi
var ok = await db.Books.Where(b => b.Id == id && b.Available > 0)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Available, b => b.Available - 1), ct) == 1;

// optimistički: Npgsql mapira uint svojstvo sa IsRowVersion() na sistemsku kolonu xmin
modelBuilder.Entity<Book>().Property(b => b.Version).IsRowVersion();
```

| | Pesimističko | Optimističko |
|---|---|---|
| Ideja | zaključaj pre čitanja, drugi čeka | ne zaključavaj; pri upisu proveri da se red nije promenio |
| Pri sukobu | samo čekanje | `DbUpdateConcurrencyException`: ponovi ili javi korisniku |
| Dobro za | česte sukobe na istom redu (zalihe) | retke sukobe (dva admina menjaju isto podešavanje) |

### Deadlock

Transakcija 1 drži red A i čeka B, transakcija 2 drži B i čeka A. Baza otkrije ciklus i jednu prekine greškom. Prevencija: **uvek zaključavaj istim redosledom** (npr. sortirano po ID-ju), drži transakcije kratkim i nikad ne zovi spoljni HTTP servis unutar transakcije.

### Upsert bez trke

Dva zahteva istovremeno provere „ne postoji” i oba upišu, pa drugi padne na jedinstvenom indeksu. U Postgresu: `INSERT … ON CONFLICT (kolone) DO NOTHING` (ili `DO UPDATE`), pa čitanje. Deset istovremenih pokušaja upiše tačno jedan red, bez izuzetka.

### Nivoi izolacije

| Nivo | Sprečava | Napomena |
|---|---|---|
| Read Committed | prljavo čitanje | podrazumevan u PostgreSQL-u i SQL Serveru; svaki upit vidi poslednje potvrđeno |
| Repeatable Read | + neponovljivo čitanje | u PostgreSQL-u snapshot cele transakcije, sprečava i fantome; u SQL Serveru radi zaključavanjem i fantomi su mogući |
| Serializable | + sve anomalije: kao da idu jedna za drugom | najsigurniji; u Postgresu transakcija može da padne sa greškom serijalizacije, pa se ponavlja |

### Indeksi

Indeks (najčešće B-stablo) je sortirana struktura koja ubrzava pretragu sa O(n) na O(log n), ali usporava upis i zauzima prostor. Redosled kolona u složenom indeksu je bitan: indeks na `(A, B)` pomaže upitu po A i po A+B, ali ne samo po B. `EXPLAIN ANALYZE` pokazuje da li upit koristi indeks (pogl. 47). Jedinstven indeks je i pravilo (nema duplikata) i ubrzanje.

## Dublje

**Zašto xmin, a ne kolona verzije.** U Postgresu svaki red ima sistemsku kolonu `xmin` (ID transakcije koja je poslednja upisala red), koja se menja pri svakoj izmeni. Npgsql je koristi kao token konkurentnosti bez dodatne kolone i bez trigera. Zamka: `SELECT *` ne vraća sistemske kolone, pa sirov SQL za entitet sa tokenom mora da navede `xmin` eksplicitno (`SELECT *, xmin …`), inače EF prijavi da kolona ne postoji.

**Ponavljanje posle konflikta.** `DbUpdateConcurrencyException` nosi entitete koji su pali (`ex.Entries`); tipično se ponovo učitaju trenutne vrednosti (`entry.ReloadAsync()`), primeni izmena i pokuša još jednom, ili se korisniku vrati 409 sa porukom „neko je u međuvremenu promenio podatak”. Za pozadinske poslove ponavljanje je automatsko; za formu korisnik odlučuje.

**Advisory lock za posao, ne za red.** Kad treba da samo jedna instanca radi neki posao (sinhronizacija prodavnice), Postgres ima `pg_advisory_xact_lock(ključ)`: zaključavanje po broju, bez reda u tabeli, koje se oslobađa sa transakcijom. Za tačnost podataka i dalje važi zaključavanje reda ili atomski UPDATE.

**Konkurentnost unutar procesa.** `lock` ne dozvoljava `await` unutar bloka (nastavak može na drugoj niti); za asinhrono međusobno isključivanje koristi se `SemaphoreSlim(1, 1)` sa `WaitAsync`. Oba važe samo za jedan proces: sa više instanci zaštita mora biti u bazi.

## Lab

1. Pokreni Postgres u Dockeru i napravi `Books(Id, Title, Available)` sa jednim primerkom; napiši metodu koja čita knjigu, proverava `Available > 0`, čeka 20 ms i smanjuje.
2. Pozovi je 10 puta istovremeno (`Task.WhenAll`, svaki poziv sa svojim `DbContext`-om) i zapiši broj pozajmica: to je izgubljena izmena.
3. Ponovi sa `SELECT *, xmin … FOR UPDATE` u transakciji, zatim sa atomskim `ExecuteUpdateAsync`, zatim sa `IsRowVersion()` i hvatanjem `DbUpdateConcurrencyException`; popuni tabelu kao u lekciji.
4. Napravi tabelu sa `UNIQUE(channel, external)` i 10 istovremenih `INSERT … ON CONFLICT DO NOTHING`; proveri da je upisan jedan red.
5. Izazovi deadlock sa dve transakcije koje zaključavaju dva reda obrnutim redosledom (dva `psql` prozora) i zapiši poruku baze; zatim zaključaj istim redosledom.
6. Napiši integracioni test (Testcontainers) koji šalje 10 istovremenih prijema i proverava da je stanje tačno 10.

**Gotovo je kad:** tvoja tabela pokazuje grešku bez zaštite i ispravno ponašanje za tri vrste zaštite, a test sa paralelnim zahtevima pada kad ukloniš zaključavanje.

## Pitanja sa intervjua

**P: Šta znači ACID?**
Atomicity: transakcija uspe cela ili nimalo. Consistency: posle nje važe sva pravila baze. Isolation: istovremene transakcije ne vide međustanja jedna druge (koliko, zavisi od nivoa izolacije). Durability: posle commit-a podaci prežive i pad sistema.

**P: Kako sprečavaš „izgubljeno ažuriranje” kad dva korisnika istovremeno menjaju isti zapis?**
Optimistička konkurentnost: entitet ima token verzije (u SQL Serveru rowversion, u Postgres-u xmin ili kolona verzije). UPDATE uključuje staru verziju u WHERE; ako je neko u međuvremenu izmenio red, menja se 0 redova i EF baca DbUpdateConcurrencyException, pa se ponovo učita ili javi korisniku. Za česte sukobe: pesimističko zaključavanje ili atomski UPDATE.

**P: Zašto `lock` ne radi sa await i šta koristiš umesto njega?**
lock je vezan za nit, a posle await nastavak može da radi na drugoj niti, pa kompajler ne dozvoljava await unutar lock-a. Za asinhrono zaključavanje koristi se SemaphoreSlim(1, 1) sa WaitAsync. I jedno i drugo važi samo za jedan proces; između instanci treba zaključavanje u bazi (ili Redisu).

**P: Optimističko ili pesimističko zaključavanje?**
Optimističko kad su sukobi retki i ponavljanje je jeftino; pesimističko kad su sukobi česti na istom redu (zalihe popularnog artikla), jer bi optimističko stalno padalo i ponavljalo se.

**P: Kako izbegavaš deadlock?**
Zaključavam redove uvek istim redosledom (npr. sortirano po ID-ju), držim transakcije kratkim i bez spoljnih poziva unutar njih; ako se ipak desi, baza prekine jednu transakciju, a kod je ponovi.

**P: Kad indeks šteti?**
Kad se tabela mnogo piše a malo čita po toj koloni, ili kad je selektivnost mala (kolona sa dve vrednosti), pa baza ionako čita veliki deo tabele.

## Test

### 1. Šta garantuje atomičnost (A iz ACID)?
- [ ] Da transakcija bude brza
- [x] Da se izvrše sve operacije transakcije ili nijedna
- [ ] Da dve transakcije ne vide jedna drugu
- [ ] Da podaci prežive nestanak struje
> Prenos novca skida sa jednog i dodaje na drugi račun. Atomičnost znači da se ne može desiti samo pola.

### 2. Šta baca EF Core kad optimistička provera otkrije da je red u međuvremenu izmenjen?
- [ ] TimeoutException
- [x] DbUpdateConcurrencyException
- [ ] NullReferenceException
- [ ] Ništa, poslednji upis pobeđuje
> UPDATE sa starom verzijom u WHERE menja 0 redova, i EF to prijavljuje ovim izuzetkom. Bez tokena konkurentnosti poslednji upis tiho pobeđuje.

### 3. Dva zahteva istovremeno čitaju stanje zalihe 1, oba proveravaju „ima li” i oba prodaju poslednji komad. Kako se to zove?
- [ ] Deadlock
- [x] Race condition (trka)
- [ ] N+1 problem
- [ ] Memory leak
> Provera i izmena nisu atomične. Rešenje je atomičan UPDATE sa uslovom (`... WHERE Kolicina >= 1`), zaključavanje ili optimistička konkurentnost.

### 4. Šta koristiš za međusobno isključivanje u async kodu unutar jednog procesa?
- [ ] lock sa await unutra
- [x] SemaphoreSlim sa WaitAsync
- [ ] Thread.Sleep
- [ ] Mutex sa .Result
> lock ne dozvoljava await. SemaphoreSlim(1, 1) radi isto, ali asinhrono. Za više instanci aplikacije treba distribuirano zaključavanje (baza, Redis).

### 5. Šta je deadlock u bazi?
- [ ] Upit koji traje predugo
- [x] Dve transakcije čekaju jedna drugu da oslobode zaključan red, pa nijedna ne može dalje
- [ ] Transakcija koja nikad ne uradi commit
- [ ] Prepuna tabela
> Baza otkrije ciklus i jednu transakciju prekine. Smanjuje se tako što sve transakcije zaključavaju redove istim redom i traju kratko.

## Izvori
- [PostgreSQL: nivoi izolacije](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL: eksplicitno zaključavanje i advisory lock](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [Microsoft Learn: konflikti konkurentnosti u EF Core](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
- [Npgsql: konkurentnost i xmin](https://www.npgsql.org/efcore/modeling/concurrency.html)
=====
---
id: 15
subtitle: "autentifikacija i autorizacija, cookie i JWT, CSRF, XSS, heširanje, rate limit, OAuth i OIDC"
minutes: 60
---
# 15 Bezbednost

**Autentifikacija**: „ko si?”. **Autorizacija**: „šta smeš?”. U ASP.NET Core-u prvo rešava Identity (nalozi, lozinke, cookie ili token), a drugo politike i `[Authorize]`. Pored toga, svaki API mora da se brani od lažnih zahteva sa drugih sajtova (CSRF), ubačenih skripti (XSS), pogađanja lozinki i curenja tajni.

## Pojmovi

### Prijava sa cookie-jem

1. Browser pošalje `POST /api/auth/login` sa emailom i lozinkom.
2. Server nađe korisnika i proveri **heš lozinke** (lozinka se nikad ne čuva).
3. Odgovor postavi cookie (`HttpOnly`, `Secure`, `SameSite`) koji sadrži šifrovane **claims** (ID, uloga).
4. Svaki sledeći zahtev nosi cookie; server ga dešifruje ključem i dobije `HttpContext.User`, bez upita u bazu.

**Security stamp** je vrednost na korisniku koja se menja pri promeni lozinke ili uloge; cookie se periodično proverava (podrazumevano na 30 minuta), pa stara sesija prestane da važi.

### Cookie ili token (JWT)

| | Cookie | Bearer token |
|---|---|---|
| Ko šalje | browser automatski | klijent ručno, zaglavlje `Authorization` |
| Čuvanje | HttpOnly cookie, JavaScript ga ne vidi | u aplikaciji (secure storage na telefonu) |
| Glavni rizik | CSRF (šalje se sam) | krađa tokena (localStorage + XSS) |
| Opoziv | security stamp, kratka provera | kratak rok + refresh token |
| Za koga | web u browseru | mobilne aplikacije, server-server |

**JWT je potpisan, ne šifrovan:** `header.payload.signature`, Base64. Payload `{"sub":"42","role":"Librarian","exp":…}` pročita svako ko ima token; potpis samo garantuje da nije izmenjen. Zato u njemu nema tajni.

### Autorizacija

```csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Librarian", p => p.RequireRole("Librarian", "Admin"));

[Authorize(Policy = "Librarian")]
[HttpDelete("api/books/{id:guid}")]
```

Pored uloga postoji i **autorizacija nad podatkom**: član sme da vidi samo svoje pozajmice. To proverava server, za svaki zahtev (najčešće filterom u upitu); skrivanje dugmeta u UI-ju je samo udobnost.

### CSRF i XSS

- **CSRF** (Cross-Site Request Forgery): tuđi sajt natera browser žrtve da pošalje zahtev sa njenim cookie-jem. Odbrana: `SameSite` cookie (browser ne šalje cookie uz POST sa tuđeg sajta) i **antiforgery token** koji samo naš JavaScript može da pročita i vrati u zaglavlju. Bearer token nije ugrožen: browser ga ne dodaje sam.
- **XSS** (Cross-Site Scripting): tuđi skript se izvrši na tvom sajtu, npr. naslov knjige `<script>…` prikazan bez escapovanja. React escapuje tekst; opasni su `dangerouslySetInnerHTML` i sirov HTML. CSP zaglavlje je drugi sloj (P3).

### Heširanje, šifrovanje, potpis

- **Heširanje** je jednosmerno: lozinke (spor algoritam sa solju: PBKDF2, bcrypt, Argon2) i jednokratni tokeni (čuva se samo heš). ASP.NET Identity koristi PBKDF2 sa 100.000 iteracija; isti unos daje različit heš jer je so nasumična.
- **Šifrovanje** je dvosmerno, sa ključem: tajne koje moramo ponovo da pročitamo (API ključ drugog servisa). U ASP.NET-u: **Data Protection** API; ključevi se čuvaju i backupuju odvojeno od koda.
- **Potpis** (HMAC, RSA) dokazuje ko je poslao i da sadržaj nije menjan (webhook, pogl. 16).

### Ograničenje broja zahteva (rate limiting)

Prijava, registracija i „zaboravljena lozinka” se zovu hiljadu puta pri napadu. Rate limiter broji zahteve po ključu (IP, korisnik, firma) i višak odbija sa `429 Too Many Requests`, uz `Retry-After`:

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = (ctx, _) =>                         // Retry-After se ne postavlja sam
    {
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)retry.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        return ValueTask.CompletedTask;
    };
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "none",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});
app.UseRateLimiter();
app.MapPost("/login", ...).RequireRateLimiting("login");
```

| Algoritam | Kako broji |
|---|---|
| Fixed window | N zahteva po prozoru; na granici dva prozora može da prođe 2N |
| Sliding window | prozor podeljen na delove koji klize; ravnomernije |
| Token bucket | kantica se puni brzinom R; dozvoli kratak nalet, pa uspori |
| Concurrency | najviše N zahteva u isto vreme |

Brojač živi u memoriji procesa: na dva servera svaki broji za sebe (pogl. 44), a iza proxy-ja `RemoteIpAddress` je adresa proxy-ja dok se ne podese forwarded headers (pogl. 37). Za prijavu je rate limit samo jedan sloj: Identity ima i **lockout** (podrazumevano 5 pogrešnih lozinki zaključa nalog na 5 minuta, `lockoutOnFailure: true`), a treći sloj je dvofaktorska prijava.

### OAuth 2.0 i OpenID Connect

„Prijavi se preko Google-a” i „dozvoli aplikaciji X pristup nalogu na Y” rešavaju isti problem: aplikacija X ne sme da dobije lozinku za Y, nego dobija **token** sa ograničenim pravima (scope).

1. Aplikacija preusmeri browser na `/authorize?…&state=…&code_challenge=…`.
2. Korisnik se prijavi **kod Google-a** i odobri pristup.
3. Google vrati browser na `/callback?code=jednokratni&state=…`.
4. Aplikacija (server-server) zameni `code` + `code_verifier` za access token (i `id_token`).

**OAuth 2.0** je autorizacija (access token za resurs); **OpenID Connect** je sloj iznad za autentifikaciju (`id_token`, JWT koji kaže ko je korisnik). `state` štiti povratak od CSRF-a. **PKCE** sprečava da neko ko presretne kod dobije token; prema RFC 9700 obavezan je za javne klijente (SPA, mobilne) i preporučen za serverske. Stari implicit flow (token direktno u adresi) se ne koristi.

## Dublje

**Antiforgery za SPA sa cookie-jem.** Server postavi čitljiv cookie (npr. `XSRF-TOKEN`), JavaScript ga pročita i pošalje u zaglavlju (`X-XSRF-TOKEN`) uz svaki zahtev koji menja podatke, a server uporedi. Napadački sajt ne može da pročita cookie tvog domena, pa ne može ni da pošalje zaglavlje. Ovako radi Zalihe (pogl. 18).

**Ista poruka za „nema naloga” i „pogrešna lozinka”.** Različite poruke (i različito trajanje odgovora) otkrivaju koji emailovi postoje (user enumeration). Isto važi za „zaboravljenu lozinku”: odgovor je uvek „ako nalog postoji, poslali smo email”.

**Kratak access token, dug refresh token.** Kod tokena se opoziv rešava kratkim rokom (npr. 15 minuta) i refresh tokenom koji se čuva na serveru i može da se opozove; refresh token se pri svakoj upotrebi menja novim (rotacija), pa ukradeni stari ne radi.

**Najmanja prava i u bazi.** Aplikacija se u bazu prijavljuje nalogom koji sme samo ono što aplikaciji treba (bez prava na menjanje šeme u produkciji, ako migracije idu posebnim korakom). Ako napadač ipak dođe do SQL-a, šteta je manja.

## Lab

1. U Biblioteka API uključi ASP.NET Core Identity sa cookie-jem (`AddIdentityApiEndpoints`, `MapIdentityApi`) i proveri da `[Authorize]` endpoint vraća 401 bez prijave.
2. Dodaj politiku `Librarian` i endpoint za brisanje knjige; član dobija 403, bibliotekar 204.
3. Dodaj autorizaciju nad podatkom: `GET /api/my/loans` vraća samo pozajmice prijavljenog člana; napiši test da član A ne vidi pozajmice člana B.
4. Napravi `PasswordHasher` heš iste lozinke dvaput i uporedi; proveri tačnu i pogrešnu lozinku sa `VerifyHashedPassword`.
5. Dodaj rate limit na prijavu (3 pokušaja u minuti po IP-ju) sa `Retry-After` i proveri četvrti pokušaj `curl -i`-jem; uključi i lockout.
6. Dekodiraj payload jednog JWT-a (Base64Url) bez ključa i zapiši zašto u njemu ne sme biti tajni.

**Gotovo je kad:** prijavljen član ne može da vidi ni obriše ono što nije njegovo (testovi to dokazuju), a pogađanje lozinke dobija 429 i zaključan nalog.

## Pitanja sa intervjua

**P: Kako se štitiš od SQL injection-a?**
Nikad ne lepiš korisnički unos u SQL string. Koristiš parametrizovane upite; EF Core i Dapper to rade sami, a i FromSql (interpolacija) pretvara vrednosti u parametre. Baza tada tretira unos kao podatak, ne kao kod.

**P: Kako se čuvaju lozinke?**
Nikad u čitljivom obliku niti kao običan heš (MD5, SHA-256). Koristi se spor heš sa solju: PBKDF2 (ASP.NET Identity PasswordHasher), bcrypt ili Argon2. So sprečava rainbow tabele, a sporost otežava pogađanje grubom silom.

**P: Šta je CORS i štiti li on API?**
CORS je pravilo pregledača: JS sa jednog origina ne sme da čita odgovor sa drugog, osim ako server to dozvoli zaglavljima. Ne štiti API od curl-a, Postman-a ili drugog servera; to je zaštita korisnika u pregledaču. API se štiti autentifikacijom i autorizacijom.

**P: Autentifikacija ili autorizacija?**
Autentifikacija utvrđuje ko si (prijava, cookie, token), autorizacija šta smeš (uloge, politike, vlasništvo nad podatkom). 401 je neuspela autentifikacija, 403 neuspela autorizacija.

**P: Gde čuvati token u browseru?**
Najbolje u HttpOnly cookie-ju, koji JavaScript ne vidi; tada treba CSRF zaštita. localStorage je dostupan svakom skriptu na stranici, pa ga XSS ukrade.

**P: Kako štitiš prijavu od pogađanja lozinke?**
Lockout naloga posle nekoliko promašaja, rate limit po IP-ju, ista poruka za „nema naloga” i „pogrešna lozinka”, i dvofaktorska prijava.

**P: OAuth ili OpenID Connect, i zašto PKCE?**
OAuth daje pristup resursu (access token), OIDC dodaje ko je korisnik (id_token); za „prijavu preko Google-a” treba OIDC. PKCE vezuje zamenu koda za aplikaciju koja je počela prijavu, pa presretnut kod ne vredi; obavezan je za SPA i mobilne aplikacije.

## Test

### 1. Šta je najbolja zaštita od SQL injection-a?
- [ ] Uklanjanje apostrofa iz unosa
- [x] Parametrizovani upiti
- [ ] HTTPS
- [ ] Skrivanje imena tabela
> Parametar se šalje odvojeno od SQL teksta, pa ne može da promeni strukturu upita. Filtriranje znakova se lako zaobiđe.

### 2. Šta je tačno za JWT?
- [ ] Sadržaj je šifrovan, pa u njega možeš da staviš lozinku
- [x] Sadržaj je potpisan, ali čitljiv svakome ko ima token
- [ ] Server mora da ga čuva u bazi da bi ga proverio
- [ ] Važi zauvek ako se ne obriše
> JWT je Base64 kodiran, ne šifrovan. Potpis garantuje da nije izmenjen. Zato u njemu nema tajni, a token ima kratko trajanje (exp).

### 3. Kako treba čuvati lozinke korisnika?
- [ ] Šifrovane ključem iz appsettings.json
- [ ] Kao SHA-256 heš
- [x] Sporim hešom sa solju (PBKDF2, bcrypt, Argon2)
- [ ] U čitljivom obliku, ali u posebnoj tabeli
> Brz heš se probija grubom silom na GPU-u. Spor heš sa solju to čini skupim. Šifrovanje je reverzibilno, a lozinku nikad ne treba vraćati.

### 4. Šta je XSS?
- [ ] Napad preopterećenjem servera
- [x] Ubacivanje skripte koja se izvrši u pregledaču drugog korisnika
- [ ] Krađa lozinke iz baze
- [ ] Prisluškivanje mreže
> Npr. komentar sa `<script>` koji se prikaže bez escapovanja. React podrazumevano escapuje tekst; rizik je `dangerouslySetInnerHTML` i sirov HTML.

### 5. Šta štiti CORS?
- [ ] API od svih neovlašćenih poziva
- [x] Korisnika u pregledaču: JS sa drugog sajta ne može da čita odgovor tvog API-ja
- [ ] Bazu od SQL injection-a
- [ ] Server od DDoS napada
> CORS sprovodi pregledač. Postman ili drugi server ga ignorišu, pa API i dalje mora imati autentifikaciju.

## Izvori
- [Microsoft Learn: bezbednost u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/)
- [Microsoft Learn: podešavanje Identity-ja (lockout, PBKDF2)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-configuration)
- [Microsoft Learn: rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
- [Microsoft Learn: antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery)
- [Microsoft Learn: Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction)
- [RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
=====
---
id: 16
subtitle: "pozivi ka spolja, otpornost, webhook i HMAC, idempotentnost, outbox, pozadinski poslovi"
minutes: 55
---
# 16 Integracije i pozadinski poslovi

Aplikacija retko živi sama: zove druge servise (plaćanje, email, katalog) i prima njihove događaje. Mreža je spora i nepouzdana, pa se integracije **projektuju za kvar**: svaki poziv može da zakasni, padne ili stigne dvaput.

## Pojmovi

| | Mi zovemo njih (REST) | Oni javljaju nama (webhook) |
|---|---|---|
| Kako | HTTP zahtev ka njihovom API-ju | oni pošalju HTTP POST na našu adresu kad se nešto desi |
| Kad | kad nama treba | odmah po događaju (push) |
| Rizik | spori su ili ne rade | događaji stižu duplirani, kasno, van redosleda, ili ne stignu |

### Otpornost izlaznih poziva

- **Timeout:** nikad ne čekati beskonačno.
- **Retry sa eksponencijalnim čekanjem** (i nasumičnim pomakom, jitter) za prolazne greške (mreža, 5xx, 429), nikad za 4xx.
- **Circuit breaker:** posle niza grešaka prestani da zoveš servis neko vreme, da ga ne dotučeš i da ne čekaš uzalud.
- **Bez spoljnog poziva u transakciji:** transakcija bi držala zaključavanja dok druga strana odgovara.

U .NET-u to je jedna linija nad `IHttpClientFactory` (paket `Microsoft.Extensions.Http.Resilience`, zasnovan na Polly-ju):

```csharp
builder.Services.AddHttpClient<ShopClient>(c => c.BaseAddress = new Uri("https://prodavnica.example/"))
    .AddStandardResilienceHandler();     // timeout, retry sa backoff-om, circuit breaker, ukupni rok
// endpoint koji dvaput vrati 503, pa 200: klijent vidi 200 posle 3 pokušaja
```

### Prijem webhooka

1. **Proveri pošiljaoca:** potpis **HMAC** (heš tela sa zajedničkom tajnom), poređen u **konstantnom vremenu**. Obično poređenje staje na prvom različitom bajtu, pa napadač po vremenu odgovora može da pogađa potpis.
2. **Sačuvaj i odmah odgovori 200**; obradu prepusti pozadinskom poslu. Pošiljalac čeka, i posle više neuspeha gasi webhook.
3. **Obrada mora biti idempotentna:** isti događaj dvaput ne sme da promeni rezultat dvaput.
4. **Periodično povlačenje** (pull) kao rezerva: hvata događaje koji nisu stigli.

```csharp
bool PotpisJeIspravan(byte[] telo, string potpisIzZaglavlja, byte[] tajna) =>
    CryptographicOperations.FixedTimeEquals(
        HMACSHA256.HashData(tajna, telo),
        Convert.FromBase64String(potpisIzZaglavlja));
// izmenjeno telo ("processing" → "cancelled") daje false
```

**Idempotentnost: ciljno stanje umesto prelaza.** Umesto „stigao događaj *otkazano* → vrati knjigu” (dvaput stigne, vrati dvaput), računa se „koliko ova porudžbina treba da drži **sada**” i primeni se samo razlika prema onome što već drži. Drugi isti događaj nađe razliku 0. Drugi način je pamćenje ID-ja obrađenih događaja uz jedinstveni indeks.

### Outbox

Kako poslati poruku drugom sistemu tek kad se transakcija uspešno završi, a da se ne izgubi ako proces padne? Poruka se upiše u tabelu **u istoj transakciji** sa podacima, a poseban posao je pročita i pošalje, uz ponavljanje (region C4). Varijanta: podatak se samo **označi kao izmenjen**, a posao pošalje sve označene.

### Pozadinski poslovi

| Alat | Šta daje |
|---|---|
| `BackgroundService` | ugrađeno; petlja u pozadini, bez trajnog reda i ponovnih pokušaja |
| Hangfire | trajni red u bazi, ponovni pokušaji, odloženi i cron poslovi, dashboard |
| Quartz.NET | napredni rasporedi |
| Red poruka (RabbitMQ, Azure Service Bus, Kafka) | obrada u drugim servisima, skaliranje, pub/sub (C4) |

```csharp
BackgroundJob.Enqueue<ReminderJob>(j => j.SendAsync(loanId, CancellationToken.None));                          // odmah
BackgroundJob.Schedule<ReminderJob>(j => j.SendAsync(loanId, CancellationToken.None), TimeSpan.FromDays(13));  // kasnije
RecurringJob.AddOrUpdate<OverdueJob>("overdue", j => j.RunAsync(CancellationToken.None), "0 6 * * *");        // svaki dan u 6
```

Hangfire ne poziva lambdu odmah: čita je kao **expression tree** (klasa, metoda, argumenti), sačuva u bazu i kasnije izvrši u svom DI scope-u. Zato su argumenti mali (ID-jevi), a podaci se čitaju iz baze kad posao krene. Posao mora biti idempotentan, jer se može izvršiti više puta.

## Dublje

**Šta standardni resilience handler radi, redom.** Spolja ka unutra: ograničenje broja istovremenih zahteva, ukupni rok za ceo poziv (sa svim ponavljanjima), retry (eksponencijalni backoff sa jitter-om, za 5xx, 408, 429 i mrežne greške), circuit breaker i rok za pojedinačni pokušaj. Podrazumevano: ukupni rok 30 s, 3 ponavljanja sa početnim čekanjem od 2 s, rok pokušaja 10 s; vrednosti se podešavaju u `AddStandardResilienceHandler(o => …)`; POST bez idempotency key-a ne treba automatski ponavljati.

**`BackgroundService` i scope.** Pozadinski servis je singleton, pa `DbContext` dobija kroz `IServiceScopeFactory` (novi scope za svaki krug posla, pogl. 9) i poštuje `stoppingToken` pri gašenju. Izuzetak koji izađe iz `ExecuteAsync` podrazumevano zaustavlja ceo host (od .NET 6), pa se greške jednog kruga hvataju i loguju unutar petlje.

**Webhook i bezbednost tela.** Potpis se računa nad **sirovim telom** zahteva, pre JSON deserijalizacije (drugi razmaci ili redosled polja daju drugi heš). Veličina tela se ograniči, a uz potpis često ide i vremenska oznaka u potpisanom sadržaju, da se star zahtev ne bi mogao ponovo poslati (replay).

**Poruke unutar procesa.** Za red unutar jedne aplikacije (proizvođač i potrošač u istom procesu) postoji `System.Threading.Channels`: bezbedan za više niti, sa ograničenim kapacitetom i asinhronim čekanjem. Ne preživi restart, pa nije zamena za trajni red.

## Lab

1. Napravi lažni spoljni servis (endpoint koji prva dva poziva vrati 503, pa 200) i typed `HttpClient` ka njemu sa `AddStandardResilienceHandler()`; zapiši posle koliko pokušaja stiže 200.
2. Promeni lažni servis da uvek vraća 400 i proveri da se 400 ne ponavlja.
3. Napravi webhook endpoint koji čita sirovo telo, proverava HMAC-SHA256 potpis iz zaglavlja sa `FixedTimeEquals`, upisuje događaj u tabelu i vraća 200; neispravan potpis vraća 401.
4. Pošalji isti događaj dvaput i obezbedi da obrada promeni stanje samo jednom (jedinstven ID događaja ili ciljno stanje).
5. Napravi `BackgroundService` koji svakih 10 sekundi obrađuje neobrađene događaje (svoj scope i `DbContext` po krugu) i poštuje `stoppingToken`.
6. Bonus: zameni petlju Hangfire-om (`Enqueue` iz webhooka, `RecurringJob` za povlačenje) i otvori dashboard.

**Gotovo je kad:** prolazna greška se sama prebrodi, trajna se ne ponavlja, lažan potpis je odbijen, a duplirani događaj ne menja stanje dvaput.

## Pitanja sa intervjua

**P: Zašto se HttpClient pravi preko IHttpClientFactory?**
`new HttpClient()` po zahtevu ostavlja otvorene sokete (socket exhaustion), a jedan statički HttpClient zauvek ne vidi promene DNS-a. Fabrika upravlja životom handler-a (pool i rotacija), a uz to daje imenovane ili tipizirane klijente i mesto za politike (retry, timeout).

**P: Šta je outbox pattern?**
Kad treba i upisati u bazu i poslati poruku (npr. „porudžbina napravljena”), poruka se upiše u outbox tabelu u ISTOJ transakciji sa podacima. Pozadinski proces posle čita outbox i šalje poruke. Tako nema slučaja da je porudžbina sačuvana a poruka izgubljena.

**P: Kako bezbedno ponavljaš poziv ka spoljnom servisu?**
Retry sa eksponencijalnim čekanjem i jitter-om, samo za prolazne greške (timeout, 503), uz ukupni timeout i circuit breaker. Operacija mora biti idempotentna ili imati idempotency key, inače ponovljen POST napravi duplikat.

**P: Kako obezbeđuješ webhook endpoint?**
HMAC potpis nad sirovim telom sa zajedničkom tajnom, poređenje u konstantnom vremenu, ograničena veličina tela, brz odgovor 200 i obrada u pozadini, idempotentno.

**P: Zašto Hangfire, a ne BackgroundService?**
Trajan red koji preživi restart, ponovni pokušaji, odloženi i cron poslovi i pregled stanja. BackgroundService je dovoljan za jednostavne petlje kojima gubitak posla pri restartu ne smeta.

## Test

### 1. Šta je problem sa `using var client = new HttpClient();` u svakom zahtevu?
- [ ] HttpClient ne podržava async
- [x] Iscrpljuju se soketi jer veze ostaju u TIME_WAIT
- [ ] Ne može da šalje JSON
- [ ] Nema problema
> Svaki novi HttpClient pravi novu vezu, a zatvorene veze neko vreme drže soket. Pod opterećenjem ponestane portova. Rešenje je IHttpClientFactory.

### 2. Kako se u ASP.NET Core-u pravi posao koji radi u pozadini dok aplikacija radi?
- [ ] Thread.Start u kontroleru
- [x] Klasa koja nasleđuje BackgroundService, registrovana sa AddHostedService
- [ ] Task.Run bez await u Program.cs
- [ ] Cron u appsettings.json
> Host pokreće BackgroundService pri startu i lepo ga zaustavlja pri gašenju (CancellationToken). Ručno pokrenute niti host ne vidi.

### 3. Red poruka (queue) garantuje „at-least-once” isporuku. Šta to znači za potrošača?
- [ ] Poruka stiže tačno jednom
- [x] Ista poruka može stići više puta, pa obrada mora biti idempotentna
- [ ] Poruke stižu uvek po redu
- [ ] Poruka se može izgubiti
> Ako potrošač obradi poruku ali padne pre potvrde, poruka se ponovo isporuči. Obrada se zato proverava po ID-ju poruke.

### 4. Šta rešava outbox pattern?
- [ ] Spore upite
- [x] Nekonzistentnost između upisa u bazu i slanja poruke
- [ ] Previše otvorenih konekcija
- [ ] Verzionisanje API-ja
> Upis podataka i poruke u istu transakciju garantuje da ili oba postoje ili nijedno. Slanje ide kasnije, uz ponavljanje.

### 5. Šta je dobra politika za ponovne pokušaje ka spoljnom API-ju?
- [ ] Odmah ponavljati u beskonačnoj petlji
- [x] Nekoliko pokušaja sa sve dužim čekanjem, samo za prolazne greške
- [ ] Ponavljati i za 400 Bad Request
- [ ] Nikad ne ponavljati
> 400 se neće popraviti ponavljanjem. Za 503 i timeout eksponencijalni backoff daje servisu vremena da se oporavi, a jitter sprečava da svi klijenti udare istovremeno.

## Izvori
- [Microsoft Learn: otpornost HTTP aplikacija](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [Microsoft Learn: pozadinski servisi (BackgroundService)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services)
- [Microsoft Learn: CryptographicOperations.FixedTimeEquals](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals)
- [Microsoft Learn: System.Threading.Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
- [Hangfire dokumentacija](https://docs.hangfire.io/)
=====
---
id: 17
subtitle: "piramida, unit test, lažne zavisnosti, TimeProvider, WebApplicationFactory, Testcontainers"
minutes: 55
---
# 17 Testiranje

Test je kod koji proverava kod. Cilj nije procenat pokrivenosti, nego da izmena koja nešto pokvari **odmah padne na testu**, pre korisnika. Dobar test je brz, ponovljiv i pada samo kad je ponašanje stvarno pokvareno.

## Pojmovi

### Piramida testova

| Nivo | Šta proverava | Koliko |
|---|---|---|
| Unit | jedna klasa izolovano: domen, pravila, računanje; milisekunde | mnogo |
| Integracioni | delovi zajedno: HTTP, middleware, baza; sekunde | manje |
| E2E | ceo sistem kroz browser (Playwright, P6) | malo, za ključne tokove |

### Unit test (xUnit + Shouldly)

```csharp
public class BookTests
{
    [Fact]
    public void Lend_LastCopy_LeavesZero()                 // Metoda_Situacija_OcekivaniRezultat
    {
        var book = new Book("Hobit", copies: 1);            // Arrange
        book.Lend();                                        // Act
        book.AvailableCopies.ShouldBe(0);                   // Assert
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_EmptyTitle_Throws(string title) =>
        Should.Throw<ArgumentException>(() => new Book(title, 1));
}
```

### Lažne zavisnosti

| Vrsta | Šta radi | Primer |
|---|---|---|
| Stub | vraća unapred zadat odgovor | „katalog servis vrati 404” |
| Mock | proverava da je pozvan, i kako | `notifier.Received(1).SendAsync(...)` (NSubstitute) |
| Fake | pojednostavljena prava implementacija | `FakeNotifier` čuva poruke u listi, `FakeTimeProvider` |

```csharp
[Fact]
public async Task SendDue_OneOverdue_SendsOneEmail()
{
    var sat = new FakeTimeProvider(new DateTimeOffset(2026, 11, 23, 9, 0, 0, TimeSpan.Zero));
    var notifier = Substitute.For<INotifier>();
    var service = new ReminderService(notifier, sat);

    var poslato = await service.SendDueAsync([("ana@x.rs", sat.GetUtcNow().AddDays(-1)), ("bojan@x.rs", sat.GetUtcNow().AddDays(3))]);

    poslato.ShouldBe(1);
    await notifier.Received(1).SendAsync("ana@x.rs", Arg.Any<string>());
    await notifier.DidNotReceive().SendAsync("bojan@x.rs", Arg.Any<string>());
}
// sat.Advance(TimeSpan.FromDays(5)) "pomera vreme" bez čekanja
```

### Integracioni test

- `WebApplicationFactory<Program>` pokreće **pravu aplikaciju** sa test serverom u memoriji; test šalje prave HTTP zahteve kroz ceo pipeline (u `Program.cs` treba `public partial class Program { }` da bi test video klasu).
- `ConfigureTestServices` zameni spoljne zavisnosti (email, HTTP ka drugim servisima, sat) lažnim.
- **Testcontainers** podigne pravu bazu (npr. PostgreSQL) u Dockeru za vreme testova. EF InMemory provajder nije relaciona baza: nema transakcija, zaključavanja ni ograničenja, pa bi testovi prolazili, a produkcija pucala.
- **Fixture** (`IClassFixture`, `ICollectionFixture`): skupa priprema (kontejner baze) jednom za više testova; svaki test pravi svoje podatke.

```csharp
public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Rok_WithFakeClock_Is14DaysLater()
    {
        var sat = new FakeTimeProvider(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
        var client = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(sat)))
                            .CreateClient();
        var odgovor = await client.GetFromJsonAsync<RokDto>("/rok");
        odgovor!.Istice.ShouldBe(new DateTimeOffset(2026, 1, 15, 0, 0, 0, TimeSpan.Zero));
    }
}
```

### Dobre navike

- Arrange / Act / Assert i ime koje kaže šta se proverava.
- **Svaki ispravljen bug dobija test** koji ga reprodukuje: prvo test koji pada, pa ispravka.
- TDD: test pre koda, crveno → zeleno → refaktorisanje.
- Test ponašanja, ne implementacije: refaktorisanje ne treba da lomi testove.
- Testovi su deterministični: bez pravog sata, slučajnosti i mreže.

## Dublje

**Biblioteke i licence (stanje 2026).** Šablon `dotnet new xunit` u .NET 10 SDK-u i dalje pravi xUnit v2; nova generacija je **xUnit v3** (paketi `xunit.v3`, šabloni `xunit.v3.templates`), u kojoj je test projekat izvršni program. FluentAssertions je od verzije 8 besplatan samo za open source i nekomercijalnu upotrebu (komercijalna upotreba traži licencu), pa mnogi timovi koriste **Shouldly** ili ostaju na v7. To je isto pitanje kao kod MediatR-a: licenca je deo izbora alata.

**Testcontainers u praksi.** Kontejner se podigne jednom po kolekciji testova (`ICollectionFixture`), a izolacija se postiže podacima (svaki test pravi svoje entitete sa jedinstvenim ključevima) ili brisanjem stanja između testova (biblioteka Respawn). Pokretanje kontejnera po testu je sporo; deljena baza bez izolacije pravi testove koji zavise od redosleda.

**Test konkurentnosti.** Greške iz pogl. 14 ne vide se sa jednim zahtevom. Test šalje deset istovremenih zahteva (`Task.WhenAll`) ka pravoj bazi i proverava da je rezultat tačan; bez zaključavanja pada. To je jedan od najvrednijih integracionih testova.

**Pokrivenost.** `coverlet` (u šablonu) meri koje linije su izvršene u testovima. Korisna je da se nađu nepokriveni delovi, ali 100% pokrivenosti ne znači da su provere dobre: test bez `Assert`-a pokrije liniju i ne proveri ništa. Mutation testing (npr. Stryker.NET) menja kod i proverava da li testovi to primete.

## Lab

1. Napravi test projekat (`dotnet new xunit`), dodaj Shouldly i NSubstitute i napiši testove za `Book.Lend` (`[Fact]`) i prazan naslov (`[Theory]` sa dva ulaza).
2. Napiši `ReminderService` koji šalje podsetnike za istekle pozajmice; testiraj ga sa `FakeTimeProvider` (paket `Microsoft.Extensions.TimeProvider.Testing`) i NSubstitute mock-om, uključujući `sat.Advance(...)`.
3. Dodaj `Microsoft.AspNetCore.Mvc.Testing` i napiši integracioni test kroz `WebApplicationFactory<Program>` koji podmeće sat preko `ConfigureTestServices`.
4. Dodaj Testcontainers.PostgreSql sa `ICollectionFixture` i napiši test koji proverava jedinstven indeks (dupli email vraća grešku), što InMemory provajder ne bi uhvatio.
5. Napiši test sa 10 istovremenih zahteva za poslednji primerak; ukloni zaključavanje i proveri da test pada.
6. Pokreni `dotnet test --collect:"XPlat Code Coverage"` i pronađi jednu nepokrivenu granu koju vredi testirati.

**Gotovo je kad:** imaš unit, integracione i jedan test konkurentnosti koji prolaze, test sata ne zavisi od dana pokretanja, a uklanjanje zaključavanja obara test.

## Pitanja sa intervjua

**P: Koja je razlika između unit i integracionog testa?**
Unit test proverava jednu jedinicu (metodu, klasu) izolovano, bez baze i mreže, i radi u milisekundama. Integracioni test proverava više delova zajedno, npr. ceo API sa pravom bazom (WebApplicationFactory + Testcontainers). Unit testova ima više, integracionih manje.

**P: Zašto EF Core InMemory provider nije dobar za testiranje upita?**
To nije relaciona baza: ne proverava strane ključeve, jedinstvene indekse ni transakcije, i prevodi upite drugačije od SQL-a. Test može da prođe, a isti upit da padne na Postgres-u. Bolje je SQLite in-memory ili prava baza u kontejneru.

**P: Kako testiraš kod koji zavisi od trenutnog vremena?**
Ne zove se DateTime.Now direktno, nego se ubacuje TimeProvider (u .NET 8+) ili sopstveni IClock. U testu se ubaci FakeTimeProvider postavljen na tačan trenutak, pa je test ponovljiv i ne zavisi od dana kad se pokreće.

**P: Mock ili fake?**
Mock kad je bitna interakcija (poslat tačno jedan email); fake kad treba realno ponašanje (lista poslatih poruka, lažni sat). Previše mock-ova veže test za implementaciju, pa refaktorisanje lomi testove.

**P: Kako testiraš konkurentnost?**
Više istovremenih zahteva (`Task.WhenAll`) protiv prave baze i provera da je rezultat tačan (npr. tačno jedna pozajmica poslednjeg primerka).

## Test

### 1. Šta znači AAA u pisanju testa?
- [x] Arrange, Act, Assert
- [ ] Async, Await, Assert
- [ ] Always Assert Anything
- [ ] Analyze, Apply, Approve
> Pripremiš stanje, izvršiš radnju koju testiraš, proveriš rezultat. Jasna struktura čini test čitljivim.

### 2. Šta je glavna mana EF Core InMemory provajdera za testove?
- [ ] Spor je
- [x] Ne ponaša se kao prava relaciona baza (ograničenja, transakcije, SQL)
- [ ] Ne radi sa xUnit-om
- [ ] Zahteva Docker
> Testovi prođu, a produkcija padne. Testcontainers daje pravu bazu po ceni par sekundi.

### 3. Kako učiniti ponovljivim test metode koja proverava „da li je danas vikend”?
- [ ] Pokretati test samo vikendom
- [x] Ubaciti TimeProvider i u testu postaviti fiksni datum
- [ ] Koristiti DateTime.UtcNow umesto DateTime.Now
- [ ] Preskočiti test u CI-ju
> Zavisnost od sata je skrivena ulazna vrednost. Kad postane parametar (TimeProvider), test kontroliše vreme.

### 4. Šta radi WebApplicationFactory<Program>?
- [ ] Pravi novu aplikaciju od nule
- [x] Pokreće pravu aplikaciju u memoriji i daje HttpClient za pozive bez mreže
- [ ] Generiše testove iz kontrolera
- [ ] Zamenjuje bazu mock-om automatski
> Ceo pipeline, DI i rute rade kao u produkciji, a servisi se mogu zameniti (npr. baza iz Testcontainers-a).

### 5. Šta kaže „piramida testova”?
- [ ] Najviše treba UI testova
- [x] Mnogo brzih unit testova, manje integracionih, najmanje end-to-end
- [ ] Svaki sloj treba isti broj testova
- [ ] Unit testovi nisu potrebni ako postoje E2E
> Niži slojevi su brzi i precizni u otkrivanju uzroka, viši su sporiji i krhkiji, ali proveravaju ceo tok.

## Izvori
- [Microsoft Learn: unit testovi sa xUnit](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-csharp-with-xunit)
- [Microsoft Learn: integracioni testovi u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [Microsoft Learn: FakeTimeProvider](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider)
- [xUnit v3: početak](https://xunit.net/docs/getting-started/v3/getting-started)
- [Testcontainers za .NET](https://dotnet.testcontainers.org/)
- [FluentAssertions: licenca od verzije 8](https://fluentassertions.com/)
=====
---
id: 18
subtitle: "slojevi, kretanja i stanje, zaključavanje, firme, webhook, SignalR, wc-auth, testovi"
minutes: 60
---
# 18 .NET u Zalihama

Zalihe (Lagerko) su SaaS za praćenje zaliha malih firmi, povezan sa WooCommerce prodavnicama. Ovde se sve iz poglavlja 3–17 vidi na pravom kodu: gde je koji pojam primenjen i zašto baš tako. Svaka vrednost u ovom poglavlju (rokovi, limiti, imena klasa i testova) proverena je u repou projekta.

## Pojmovi

### Ceo sistem

Browser (React) → Caddy (HTTPS) → jedan .NET proces sa četiri projekta-sloja → PostgreSQL; prodavnica šalje porudžbine **webhookom**, a aplikacija joj vraća stanje preko njenog **REST** API-ja. Modularni monolit (pogl. 1, 13).

```
src/
  Zalihe.Domain/          entiteti i pravila, nijedna referenca na pakete     (pogl. 13)
  Zalihe.Application/     servisi (StockService…), interfejsi (ISalesChannel, IAppDbContext)
  Zalihe.Infrastructure/  AppDbContext, WooCommerceClient, Hangfire poslovi, email
  Zalihe.Web/             kontroleri, middleware, Program.cs, servira React build
tests/
  Zalihe.Domain.Tests/  Zalihe.Application.Tests/  Zalihe.IntegrationTests/
```

Folderi su **po oblasti** (`Items/`, `Stock/`, `Orders/`, `Auth/`), ne po vrsti. Kompromis: `AccountService` je u Infrastructure, jer radi sa Identity tipovima (`UserManager<User>`), a Application ne sme da zavisi od Identity-ja. Bez MediatR-a i CQRS-a: kontroler direktno zove servis.

### Kretanja i stanje

Stanje se **nikad ne menja direktno**. Svaka promena je novi `StockMovement` (prijem, prodaja, povrat, korekcija), koji se nikad ne menja ni ne briše; greška se ispravlja novim kretanjem. `StockLevel` je keš zbira kretanja i ažurira se u istoj transakciji. Bogat domen (pogl. 13) u praksi:

```csharp
public static StockMovement Sale(Item item, decimal quantity, ...) =>
    new(item, StockMovementType.Sale, -Positive(quantity), ...);       // pravilo predznaka je OVDE

public static StockMovement? AdjustmentToCount(Item item, decimal counted, decimal currentStock, ...)
{
    var difference = counted - currentStock;
    return difference == 0 ? null : Adjustment(item, difference, ...);  // razliku računa domen
}
```

ID-jevi su `Guid.CreateVersion7()` (rastući, dobri za indeks), količine `decimal(18,3)`, novac `decimal(18,2)`, vreme `DateTimeOffset` u UTC.

### Transakcija i zaključavanje

```csharp
await using var transaction = await db.Database.BeginTransactionAsync(ct);
var item = await db.Items.SingleOrDefaultAsync(i => i.Id == itemId, ct);   // filter firme dodat sam
var level = await db.LockStockLevelAsync(itemId, ct);                       // SELECT *, xmin ... FOR UPDATE
var movement = Create(item, level.Quantity, command);
db.StockMovements.Add(movement);
level.Apply(movement);
var shops = await stockPush.MarkChangedAsync([itemId], ct);                 // "označi za slanje", ista transakcija
await db.SaveChangesAsync(ct);
await transaction.CommitAsync(ct);
stockPush.Schedule(shops);                                                  // posao posle COMMIT-a
```

- Test `Record_TenConcurrentReceipts_NoneIsLost` šalje 10 prijema istovremeno i proverava da je stanje tačno 10.
- Porudžbine zaključavaju artikle **sortirane po ID-ju** (`changes.OrderBy(c => c.ItemId)`), da ne bi bilo deadlocka.
- Dva događaja za novu porudžbinu (WooCommerce šalje `order.created` i odmah `order.updated`): `INSERT … ON CONFLICT ("ChannelId", "ExternalId") DO NOTHING`, pa `SELECT … FOR UPDATE`.
- `StockRecalculationService` ponovo sabere kretanja i ispravi keš ako se razlikuje; ispravka se loguje kao Warning, jer znači bug.

### Izolacija firmi u četiri sloja

| Sloj | Šta radi |
|---|---|
| 1. Claim u cookie-ju | pri prijavi `AppClaimsPrincipalFactory` upiše `tenant_id`; ne čita se iz baze pri svakom zahtevu |
| 2. `TenantMiddleware` | postavi scoped `TenantContext` jednom po zahtevu; posao i webhook postavljaju firmu sami |
| 3. Global query filter | svaki `ITenantOwned` entitet dobija `WHERE "TenantId" = @tenant` u **svakom** upitu; upit bez firme baca izuzetak |
| 4. Provera u `SaveChanges` | nov red sa tuđim `TenantId` baca izuzetak; poslednja linija odbrane |

Filter se dodaje refleksijom za svaki `ITenantOwned` entitet (`ApplyTenantFilter<T>`), a `TenantFilterTests` proverava da nijedan nije zaboravljen. Tuđi artikal zato vraća **404, ne 403**. `IgnoreQueryFilters()` se koristi samo svesno (webhook mora da nađe firmu kanala pre nego što zna firmu).

### Program.cs, greške, bezbednost

- Pipeline: `UseForwardedHeaders` (iza Caddyja) → `UseExceptionHandler` → statički fajlovi → `UseAuthentication` → `TenantMiddleware` (mora posle autentifikacije) → `UseAuthorization` → kontroleri; nepoznat `/api/...` vraća 404, ostalo `MapFallbackToFile("index.html")`.
- `AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>())` daje istu instancu konteksta servisima i kontroleru u zahtevu.
- Greške kao kodovi: servis vrati `AppError("item.sku_duplicate", "sku")`, a ProblemDetails nosi kod koji frontend prevodi.
- Identity sa `AddIdentityApiEndpoints<User>()`: cookie `zalihe.auth` (HttpOnly, `SameSite=Lax`, 14 dana, klizni rok); security stamp se proverava **svakog minuta** (umesto 30), pa promenjena uloga važi brzo; reset lozinke važi 2 sata.
- CSRF: `CookieAntiforgeryFilter` proverava token samo na izmenama autentifikovanim cookie-jem; frontend čita `XSRF-TOKEN` i šalje `X-XSRF-TOKEN`.
- Uloge (admin, menadžer, zaposleni) kao politike; nabavne cene za zaposlene skriva servis (`PurchasePriceAccess`), DTO tada nosi `null`.
- Tajne: API ključevi prodavnica šifrovani Data Protection-om (`ICredentialProtector`); tokeni pozivnica i povezivanja čuvaju se samo kao SHA-256 heš. Iz porudžbina se nikad ne čuvaju lični podaci kupaca.

### Webhook, poslovi, žive promene

- Webhook: firma kanala (`IgnoreQueryFilters`) → HMAC-SHA256 nad telom, `FixedTimeEquals` → upis događaja → `Enqueue` → odmah 200. Obrada računa koliko porudžbina **treba da drži sada** (aktivni statusi `processing`, `on-hold`, `completed`) i primenjuje samo razliku.
- Hangfire u istoj bazi (šema `hangfire`, LISTEN/NOTIFY): sinhronizacija porudžbina svakih 15 minuta (`*/15 * * * *`), slanje stanja odloženo 30 s (`StockPushDelaySeconds`) da se izmene spoje; `[AutomaticRetry(Attempts = 0)]` jer je sledeće zakazano pokretanje „retry”.
- SignalR: `ChangesHub` stavlja vezu u grupu firme iz claima (nikad od klijenta); `SaveChanges` zapamti firme čiji su ekranski podaci menjani, a `DataChangeTransactionInterceptor` javi tek posle COMMIT-a (posle ROLLBACK-a zaboravi). Poruka ne nosi podatke; `GroupExcept` preskače tab koji je izmenu napravio. `IDataChangeNotifier` je u Application, implementacija u Web (Dependency Inversion).
- wc-auth: povezivanje prodavnice bez kopiranja ključeva; nasumičan token čiji se samo heš čuva (važi 1 sat, jednom), prodavnica šalje ključeve direktno serveru, ključevi se šifruju i proveravaju probnim pozivom.
- Ograničenja: registracija 30 po satu po IP-ju (`RegistrationRateLimit`), email za reset najviše jednom u 2 minuta po nalogu; prijava koristi Identity lockout.

### Testovi

`ZaliheApiFactory` pokreće celu aplikaciju sa pravim `postgres:18` u Testcontainers-u (jedan za sve testove, `ICollectionFixture`), a u `ConfigureTestServices` podmeće lažnu prodavnicu (`FakeShopHandler`) i emailove. Unit: `StockLevelTests`, `StockMovementTests.Receipt_ZeroOrNegative_Throws`. Fake-ovi: `ShiftedTimeProvider` pomera sat da se proveri osvežavanje cookie-ja.

## Dublje

**Šta se desi bez `FOR UPDATE`: eksperiment.** Kad se iz `LockStockLevelAsync` privremeno ukloni `FOR UPDATE`, test sa deset istovremenih prijema **pada**, ali ne zbog izgubljenih izmena: druga linija odbrane, `xmin` kao token konkurentnosti, zaustavi devet zahteva sa `DbUpdateConcurrencyException`, i oni dobiju 500 (`common.unexpected`). Stanje ostaje tačno, ali devet korisnika dobije grešku. Zato su potrebna oba: zaključavanje (zahtevi čekaju jedan drugog i svi uspeju) i token (ako zaključavanje ikad izostane, greška je glasna, a ne tiha).

**Zašto kretanja, a ne samo kolona stanja.** Istorija koja se ne može prepraviti (audit), korekcija umesto brisanja i mogućnost da se stanje uvek ponovo izračuna. Cena: dve stvari moraju biti usklađene (kretanja i keširano stanje), pa postoje transakcija i „Provera stanja”. Ovo liči na event sourcing (pogl. 13), ali je jednostavnije: stanje se čuva, a ne izvodi pri svakom čitanju.

**Zašto poruka žive promene ne nosi podatke.** Svaki korisnik vidi drugo (uloga, nabavne cene, filter, stranica). Kad ekran ponovo učita kroz API, važe ista pravila kao i inače, a izgubljena poruka ne ostavlja pogrešan podatak; cena je jedan GET više (pogl. 25).

**Šta bi se menjalo za više instanci.** Data Protection ključevi u zajedničko skladište, Redis backplane za SignalR, brojači limita u Redis i migracije kao poseban korak isporuke; Hangfire već radi sa više servera (pogl. 44).

## Lab

1. Kloniraj Zalihe, pokreni `docker compose up -d --wait` i aplikaciju (`dotnet run --project src/Zalihe.Web --launch-profile http`), pa u UI-ju zabeleži jednu prodaju.
2. Prati tu prodaju kroz kod: kontroler → `StockService.RecordAsync` → `LockStockLevelAsync` → `StockMovement.Sale` → `SaveChanges`; zapiši u kom sloju je svaki korak.
3. Pokreni `dotnet test tests/Zalihe.IntegrationTests --filter "FullyQualifiedName~Record_TenConcurrentReceipts_NoneIsLost|FullyQualifiedName~TenantFilterTests|FullyQualifiedName~ChangesHubTests"`.
4. Privremeno ukloni `FOR UPDATE` iz `LockStockLevelAsync`, pokreni test konkurentnosti i zapiši kako pada (koliko 500 i zašto); vrati izmenu (`git checkout -- <fajl>`).
5. Nađi gde se dodaje global query filter i pokaži zašto tuđi artikal vraća 404, a ne 403.
6. Pošalji webhook sa pogrešnim potpisom (curl) i proveri odgovor; pronađi u kodu `FixedTimeEquals`.

**Gotovo je kad:** umeš da nacrtaš put prodaje kroz slojeve, objasniš četiri sloja izolacije firmi i pokažeš šta tačno štiti `FOR UPDATE`, a šta `xmin`.

## Pitanja sa intervjua

**P: Kako si rešio istovremene izmene stanja?**
Transakcija i `SELECT … FOR UPDATE` na redu stanja, pa drugi zahtev za isti artikal čeka; `xmin` je druga linija (bez zaključavanja konflikt postane glasna greška, ne izgubljena izmena); artikli se zaključavaju sortirani po ID-ju; test sa 10 paralelnih zahteva protiv pravog Postgresa.

**P: Kako si izolovao firme?**
Četiri sloja: claim firme u cookie-ju, scoped `TenantContext` iz middleware-a, global query filter za sve `ITenantOwned` entitete i provera u `SaveChanges`, uz testove da firma B ne vidi podatke firme A i da nijedan entitet nema zaboravljen filter.

**P: Zašto kretanja, a ne samo kolona stanja?**
Istorija koja se ne može prepraviti (audit), korekcija umesto brisanja i mogućnost da se stanje uvek ponovo izračuna; keširano stanje se ažurira u istoj transakciji radi brzih lista.

**P: Kako ekrani saznaju za tuđe izmene?**
SignalR hub sa grupom po firmi; `SaveChanges` zapamti firme čiji su podaci menjani i posle COMMIT-a im pošalje poruku bez podataka; klijent invalidira upite i ponovo učita kroz API.

**P: Kako je obezbeđen webhook iz prodavnice?**
HMAC-SHA256 potpis nad telom, poređen u konstantnom vremenu, brz odgovor 200 i obrada u Hangfire poslu, idempotentno (ciljno stanje porudžbine minus već primenjeno), uz periodičnu sinhronizaciju kao rezervu.

**P: Kako povezuješ prodavnicu bez kopiranja ključeva?**
wc-auth: jednokratni token čiji se samo heš čuva, prodavnica šalje ključeve direktno serveru, ključevi se šifruju Data Protection-om i proveravaju probnim pozivom pre čuvanja.

## Test

### 1. Kako se u Zalihama ispravlja pogrešno zabeležen prijem?
- [ ] Izmenom postojećeg kretanja
- [ ] Brisanjem kretanja
- [x] Novim kretanjem (korekcijom), jer se kretanja nikad ne menjaju ni ne brišu
- [ ] Direktnom izmenom kolone stanja
> Kretanja su istorija koja se ne prepravlja; stanje je keš njihovog zbira i ažurira se u istoj transakciji.

### 2. Šta se desi kad se iz `LockStockLevelAsync` ukloni `FOR UPDATE`, a deset prijema stigne istovremeno?
- [ ] Ništa, test i dalje prolazi
- [ ] Stanje bude 1 umesto 10, bez greške
- [x] `xmin` otkrije konflikte, pa devet zahteva dobije grešku (500); test pada
- [ ] Baza prijavi deadlock
> Token konkurentnosti sprečava tihu izgubljenu izmenu, ali bez zaključavanja zahtevi padaju umesto da čekaju.

### 3. Zašto korisnik firme A za artikal firme B dobija 404, a ne 403?
- [x] Global query filter dodaje uslov firme u svaki upit, pa artikal za njega ne postoji
- [ ] Zato što je 404 brži odgovor
- [ ] Zbog greške u rutiranju
- [ ] Zato što React sakrije artikal
> 404 ne otkriva ni da resurs postoji; filter radi u svakom upitu bez obzira da li se neko setio `where`.

### 4. Kada SignalR javlja ekranima da su se podaci promenili?
- [ ] Pre upisa, da ekran bude brži
- [ ] Odmah posle `SaveChanges`, i kad se transakcija posle poništi
- [x] Posle COMMIT-a; posle ROLLBACK-a se zapamćene firme zaborave
- [ ] Samo kad korisnik osveži stranicu
> Interceptor transakcije objavljuje tek kad je upis trajan, inače bi drugi ekran prikazao nešto što se nije desilo.

### 5. Zašto poslovi Hangfire-a za sinhronizaciju imaju `[AutomaticRetry(Attempts = 0)]`?
- [ ] Zato što Hangfire ne podržava ponavljanje
- [x] Sledeće zakazano pokretanje (svakih 15 minuta) je samo po sebi ponovni pokušaj
- [ ] Da bi greške ostale skrivene
- [ ] Zbog licence
> Ponavljanje istog posla odmah bi se preklapalo sa sledećim redovnim pokretanjem.

## Izvori
- [Handling concurrency conflicts (EF Core)](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
- [Global query filters (EF Core)](https://learn.microsoft.com/en-us/ef/core/querying/filters)
- [Explicit locking: SELECT FOR UPDATE (PostgreSQL)](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Manage users and groups in SignalR (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/signalr/groups)
- [Performing recurrent tasks (Hangfire)](https://docs.hangfire.io/en/latest/background-methods/performing-recurrent-tasks.html)
- [WooCommerce REST API: webhooks i potpis X-WC-Webhook-Signature, wc-auth](https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks)
- [ASP.NET Core Data Protection (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction)
- [Testcontainers for .NET: PostgreSQL modul](https://dotnet.testcontainers.org/modules/postgres/)

=====
---
id: 19
subtitle: "brza pitanja i odgovori za ceo backend deo, sa uputnicom na poglavlje"
minutes: 30
---
# 19 Podsetnik: .NET

Pitanje i odgovor u jednoj rečenici, za poslednje ponavljanje pred intervju. Ako odgovor nije jasan, vrati se na poglavlje u zagradi. Odgovaraj naglas: na intervjuu se ocenjuje i kako kažeš, ne samo šta znaš.

## Pojmovi

### C# i .NET

| Pitanje | Odgovor |
|---|---|
| Šta je CLR? | Runtime koji izvršava IL: JIT, GC, izuzeci, bezbednost tipova. (3) |
| Value vs reference type? | Vrednost se kopira; referenca pokazuje na objekat na heapu. (5) |
| `string` je value ili reference? | Referentni, ali nepromenljiv, a `==` poredi sadržaj. (5) |
| Boxing? | Pakovanje vrednosnog tipa u `object` na heapu; skupo u petljama. (5) |
| abstract class vs interface? | Stanje i delimična implementacija, jedna po klasi, vs ugovor, više po klasi. (5) |
| `sealed`, `static`, `readonly`, `const`? | Ne nasleđuje se; pripada tipu; dodela samo pri deklaraciji ili u konstruktoru; vrednost pri kompajliranju. (5) |
| Overloading vs overriding? | Ista metoda sa drugim parametrima vs naslednik menja `virtual` metodu roditelja. (5) |
| Delegat, lambda, event? | Funkcija kao vrednost; kratak zapis funkcije; delegat na koji se spolja samo pretplaćuje. (6) |
| Generici i ograničenja? | Tip kao parametar; `where T : class, IHasId`. (6) |
| Extension metoda? | Statička metoda koja izgleda kao metoda tipa: `services.AddInfrastructure()`. (6) |
| `yield return`? | Lenja sekvenca: elementi se prave jedan po jedan, kad ih neko traži. (6) |
| `IEnumerable` vs `IQueryable`? | U memoriji vs stablo izraza koje EF prevodi u SQL. (6) |
| Task vs Thread? | Posao (I/O ne drži nit) vs nit operativnog sistema. (7) |
| Deadlock sa async? | `.Result`/`.Wait()` uz `SynchronizationContext`; async do kraja. (7) |
| `using`/`IDisposable`? | Determinističko oslobađanje resursa, i pri izuzetku. (7) |
| Šta je novo u .NET 8–10? | Primary konstruktori i collection expressions (C# 12), `TimeProvider` (8), `Guid.CreateVersion7` (9), ugrađen OpenAPI (9), Identity API endpointi (8), extension members (C# 14, .NET 10). (3) |

### ASP.NET Core

| Pitanje | Odgovor |
|---|---|
| Životni vek u DI? | Singleton, Scoped (po zahtevu), Transient (svaki put nov). (9) |
| Captive dependency? | Singleton drži scoped servis; rešenje je `IServiceScopeFactory`. (9) |
| Middleware? | Lanac oko svakog zahteva; redosled je bitan. (10) |
| Filter vs middleware? | Filter zna za akciju i model; middleware za ceo HTTP. (10) |
| Model binding i validacija? | Parametri iz rute, upita, tela; atributi + `[ApiController]` → 400. (11) |
| ProblemDetails? | Standardni JSON za greške (RFC 9457), kod nas sa kodom i greškama po poljima. (11, 18) |
| Prioritet konfiguracije? | appsettings → appsettings.{Env} → user secrets (Development) → promenljive okruženja → argumenti komandne linije; kasniji pobeđuje. (8) |
| `IHostedService`? | Servis koji radi u pozadini uz host (Hangfire server, `BackgroundService`). (16) |
| Rate limiting? | Ugrađen `AddRateLimiter`; broj zahteva po ključu u prozoru, višak 429; u memoriji važi po instanci. (15, 18) |

### Baza, arhitektura, bezbednost

| Pitanje | Odgovor |
|---|---|
| Code-first vs database-first? | Model u kodu pa migracije vs model generisan iz postojeće baze (scaffold). (12) |
| N+1? | Upit po redu liste; `Include`, projekcija, grupni upit. (12) |
| Global query filter? | Uslov koji EF dodaje u svaki upit; u Zalihama firma. (12, 18) |
| Concurrency token? | Verzija reda; `UPDATE … WHERE verzija = stara`; u Zalihama `xmin`. (14) |
| OFFSET ili keyset? | OFFSET je jednostavan; keyset (`WHERE id > poslednji`) je brz i za duboke stranice. (12) |
| SOLID? | SRP, Open/Closed, Liskov, Interface Segregation, Dependency Inversion. (13) |
| Repository sa EF-om? | `DbSet` već jeste repository, `DbContext` unit of work; u Zalihama samo interfejs `IAppDbContext`. (13) |
| Event sourcing? | Stanje iz niza događaja; kretanja u Zalihama su slična ideja, ali se čuva i stanje. (13, 18) |
| Hash vs encrypt? | Jednosmerno (lozinke, tokeni) vs dvosmerno sa ključem (API ključevi). (15) |
| HMAC? | Heš poruke sa tajnim ključem; dokazuje pošiljaoca i integritet. (16) |
| Retry, timeout, circuit breaker? | Ponovi prolaznu grešku; ne čekaj zauvek; prestani da zoveš servis koji stalno pada. (16) |
| OAuth vs OIDC? | Pristup resursu (access token) vs ko je korisnik (ID token); code flow + PKCE. (15) |
| SignalR? | Trajna veza server → klijent (WebSockets, pa SSE, pa long polling) sa grupama; u Zalihama grupa po firmi. (18, 25) |
| Stateless aplikacija? | Ništa bitno u memoriji procesa; preduslov za više instanci. (44) |

## Dublje

**Kako odgovoriti kad odgovor u jednoj rečenici nije dovoljan.** Jednorečenični odgovor je ulaz; sagovornik skoro uvek pita „zašto” ili „kada ne”. Dobar obrazac je tri koraka: definicija (jedna rečenica), primer iz sopstvenog koda (Zalihe ili ova aplikacija), pa kompromis („ovo ne bih koristio kada…”). Primer za concurrency token: „verzija reda koju EF dodaje u `WHERE` izmene; u Zalihama je to `xmin`, uz `FOR UPDATE` na stanju; bez zaključavanja bi istovremeni zahtevi dobijali grešku umesto da čekaju.”

**Česta dopunska pitanja.**

- `string` je referentni tip, pa zašto se ponaša kao vrednost? Nepromenljiv je (svaka „izmena” pravi nov string) i ima preklopljen `==`; `StringBuilder` postoji baš zbog te nepromenljivosti.
- `readonly` polje sa listom: referenca se ne menja, ali sadržaj liste da. Za pravu nepromenljivost: `IReadOnlyList<T>`, `ImmutableArray<T>` ili `FrozenSet<T>`.
- Da li `async` pravi novu nit? Ne: dok se čeka I/O, nit se vraća u pool; nastavak ide na bilo koju slobodnu nit (u ASP.NET Core nema `SynchronizationContext`-a).
- Zašto se u ASP.NET Core retko vidi deadlock sa `.Result`, a ipak je loše? Nema konteksta koji bi se zaglavio, ali blokirana nit ne radi ništa drugo; pod opterećenjem ponestane niti u pool-u (thread pool starvation, pogl. 45).
- Scoped servis u `BackgroundService`-u: napravi scope po poslu (`CreateAsyncScope`), jer pozadinski servis je singleton.

**Prioritet konfiguracije u praksi.** Isti ključ `ConnectionStrings:Default` u `appsettings.json`, u `appsettings.Development.json` i kao promenljiva okruženja `ConnectionStrings__Default`: pobeđuje promenljiva okruženja (dvostruka donja crta zamenjuje `:`), a argument `--ConnectionStrings:Default=...` bi pobedio i nju. User secrets se učitavaju samo u Development okruženju.

## Lab

1. Prekrij kolonu „Odgovor” u sve tri tabele i naglas odgovori na svako pitanje; meri vreme (cilj: ispod 15 sekundi po pitanju).
2. Svako pitanje na kom zastaneš zapiši i ponovi poglavlje iz zagrade.
3. Za pet pitanja po izboru dodaj primer iz svog koda (Zalihe ili Hunter Roadmap) i jedan kompromis („ne bih koristio kada…”).
4. Napravi mali projekat (`dotnet new web`) i proveri prioritet konfiguracije: isti ključ u `appsettings.json` i kao promenljiva okruženja, pa ispiši vrednost.
5. Zamoli nekoga da te pita nasumičnih 10 pitanja iz tabela i postavi bar jedno dopunsko pitanje („zašto?”, „kada ne?”).

**Gotovo je kad:** na svako pitanje iz tabela odgovaraš bez zastajkivanja, a za bar pet imaš primer iz sopstvenog koda i kompromis.

## Pitanja sa intervjua

**P: Kako bi u dve rečenice objasnio tok jednog zahteva kroz ASP.NET Core API?**
Kestrel primi zahtev, prođe kroz middleware (izuzeci, HTTPS, autentifikacija, autorizacija), ruting izabere endpoint, model binding i validacija pripreme ulaz, a DI ubaci servise. Servis kroz Scoped DbContext pita bazu, rezultat se serijalizuje u JSON i vraća istim putem nazad.

**P: Koje greške najčešće vidiš kod juniora u .NET kodu?**
Blokiranje async koda (.Result), N+1 upiti, entiteti umesto DTO-a u API-ju, hvatanje Exception bez razloga, nedostatak CancellationToken-a, captive dependency i tajne u appsettings.json. Dobro je imati primer kako si neku od njih sam ispravio.

**P: Šta proveravaš u code review-u .NET koda?**
Ispravnost i granične slučajeve, async do kraja, upite (N+1, nedostatak indeksa, AsNoTracking), validaciju ulaza i autorizaciju, rukovanje greškama, nazive i čitljivost, i da li postoje testovi za izmenjeno ponašanje.

**P: Koji je prioritet izvora konfiguracije u ASP.NET Core-u?**
appsettings.json, pa appsettings.{Environment}.json, pa user secrets (samo u Development), pa promenljive okruženja, pa argumenti komandne linije; kasniji izvor pobeđuje. Zato produkcija lozinku dobija iz okruženja ili sefa tajni, a ne iz fajla.

**P: Da li async metoda pravi novu nit?**
Ne. Dok se čeka I/O, nit se vraća u pool i radi nešto drugo; nastavak ide na neku slobodnu nit. Zato async povećava propusnost servera, a ne brzinu jednog zahteva.

## Test

### 1. Koji životni vek je ispravan za DbContext?
- [ ] Singleton
- [x] Scoped
- [ ] Transient, uvek
- [ ] Static
> Jedan po zahtevu: prati promene jednog posla i nije thread-safe.

### 2. Šta je ispravan način da metoda kontrolera čeka bazu?
- [ ] `var x = servis.UcitajAsync().Result;`
- [x] `var x = await servis.UcitajAsync(ct);`
- [ ] `Task.Run(() => servis.UcitajAsync()).Wait();`
- [ ] `servis.UcitajAsync();` bez await
> await oslobađa nit i propagira izuzetke, a CancellationToken prekida posao kad klijent odustane.

### 3. Šta je najverovatniji uzrok sporosti ako liste šalju po jedan SQL upit za svaki red?
- [ ] Spora mreža
- [x] N+1 problem (lazy loading u petlji)
- [ ] Previše indeksa
- [ ] Mali connection pool
> Rešenje je Include ili projekcija u jednom upitu.

### 4. Gde NE treba da stoji lozinka produkcijske baze?
- [ ] U promenljivoj okruženja na serveru
- [ ] U Key Vault-u
- [x] U appsettings.json u Git repozitorijumu
- [ ] U tajnama CI/CD sistema
> Sve što je u Git-u treba smatrati javnim. Tajne idu u okruženje ili sef tajni.

### 5. Šta vraća API kad validacija ulaza ne prođe?
- [ ] 500 sa stack trace-om
- [ ] 200 sa porukom o grešci
- [x] 400 sa ProblemDetails i opisom grešaka po poljima
- [ ] 404
> Klijent treba da zna šta da ispravi. Stack trace u odgovoru je bezbednosni propust.

## Izvori
- [Configuration in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/)
- [Dependency injection in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Handle errors in ASP.NET Core APIs (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/web-api/handle-errors)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Value types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [What's new in C# 14 (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)
- [Background tasks with hosted services (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services)
