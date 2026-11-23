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
---
## Pitanja sa intervjua

**P: Objasni SOLID ukratko.**
S: klasa ima jedan razlog za promenu. O: proširuješ ponašanje novim kodom, ne menjanjem postojećeg. L: podtip mora da radi svuda gde i osnovni tip. I: mali, specifični interfejsi umesto jednog velikog. D: zavisi od apstrakcija, a konkretne implementacije se ubacuju spolja (DI).

**P: Šta je suština Clean (Onion) arhitekture?**
Zavisnosti idu ka centru: domen i poslovna pravila ne zavise od baze, web-a ni okvira; infrastruktura zavisi od njih (implementira njihove interfejse). Tako se pravila testiraju bez baze, a tehnologija se menja bez diranja pravila.

**P: Da li treba repository iznad EF Core-a?**
Zavisi. DbContext je već Unit of Work, a DbSet repository, pa generički repository često samo sakrije korisne mogućnosti EF-a. Specifičan repository ima smisla kad želiš da izoluješ složene upite ili domen od EF-a. Bitno je da umeš da obrazložiš izbor.

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
=====
---
id: 14
---
## Pitanja sa intervjua

**P: Šta znači ACID?**
Atomicity: transakcija uspe cela ili nimalo. Consistency: posle nje važe sva pravila baze. Isolation: istovremene transakcije ne vide međustanja jedna druge (koliko, zavisi od nivoa izolacije). Durability: posle commit-a podaci prežive i pad sistema.

**P: Kako sprečavaš „izgubljeno ažuriranje” kad dva korisnika istovremeno menjaju isti zapis?**
Optimistička konkurentnost: entitet ima token verzije (u SQL Serveru rowversion, u Postgres-u xmin ili kolona verzije). UPDATE uključuje staru verziju u WHERE; ako je neko u međuvremenu izmenio red, menja se 0 redova i EF baca DbUpdateConcurrencyException, pa korisniku javiš da osveži podatke.

**P: Zašto `lock` ne radi sa await i šta koristiš umesto njega?**
lock je vezan za nit, a posle await nastavak može da radi na drugoj niti, pa kompajler ne dozvoljava await unutar lock-a. Za asinhrono zaključavanje koristi se SemaphoreSlim(1, 1) sa WaitAsync. I jedno i drugo važi samo za jedan proces; između instanci treba zaključavanje u bazi.

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
=====
---
id: 15
---
## Pitanja sa intervjua

**P: Kako se štitiš od SQL injection-a?**
Nikad ne lepiš korisnički unos u SQL string. Koristiš parametrizovane upite; EF Core i Dapper to rade sami, a i FromSqlInterpolated pretvara interpolaciju u parametre. Baza tada tretira unos kao podatak, ne kao kod.

**P: Kako se čuvaju lozinke?**
Nikad u čitljivom obliku niti kao običan heš (MD5, SHA-256). Koristi se spor heš sa solju: PBKDF2 (ASP.NET Identity PasswordHasher), bcrypt ili Argon2. So sprečava rainbow tabele, a sporost otežava pogađanje grubom silom.

**P: Šta je CORS i štiti li on API?**
CORS je pravilo pregledača: JS sa jednog origina ne sme da čita odgovor sa drugog, osim ako server to dozvoli zaglavljima. Ne štiti API od curl-a, Postman-a ili drugog servera; to je zaštita korisnika u pregledaču. API se štiti autentifikacijom i autorizacijom.

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
=====
---
id: 16
---
## Pitanja sa intervjua

**P: Zašto se HttpClient pravi preko IHttpClientFactory?**
`new HttpClient()` po zahtevu ostavlja otvorene sokete (socket exhaustion), a jedan statički HttpClient zauvek ne vidi promene DNS-a. Fabrika upravlja životom handler-a (pool i rotacija), a uz to daje imenovane ili tipizirane klijente i mesto za politike (retry, timeout).

**P: Šta je outbox pattern?**
Kad treba i upisati u bazu i poslati poruku (npr. „porudžbina napravljena”), poruka se upiše u outbox tabelu u ISTOJ transakciji sa podacima. Pozadinski proces posle čita outbox i šalje poruke. Tako nema slučaja da je porudžbina sačuvana a poruka izgubljena.

**P: Kako bezbedno ponavljaš poziv ka spoljnom servisu?**
Retry sa eksponencijalnim čekanjem i jitter-om, samo za prolazne greške (timeout, 503), uz ukupni timeout i circuit breaker. Operacija mora biti idempotentna ili imati idempotency key, inače ponovljen POST napravi duplikat.

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
=====
---
id: 17
---
## Pitanja sa intervjua

**P: Koja je razlika između unit i integracionog testa?**
Unit test proverava jednu jedinicu (metodu, klasu) izolovano, bez baze i mreže, i radi u milisekundama. Integracioni test proverava više delova zajedno, npr. ceo API sa pravom bazom (WebApplicationFactory + Testcontainers). Unit testova ima više, integracionih manje ali hvataju greške u spoju delova.

**P: Zašto EF Core InMemory provider nije dobar za testiranje upita?**
To nije relaciona baza: ne proverava strane ključeve, jedinstvene indekse ni transakcije, i prevodi upite drugačije od SQL-a. Test može da prođe, a isti upit da padne na Postgres-u. Bolje je SQLite in-memory ili prava baza u kontejneru.

**P: Kako testiraš kod koji zavisi od trenutnog vremena?**
Ne zove se DateTime.Now direktno, nego se ubacuje TimeProvider (u .NET 8+) ili sopstveni IClock. U testu se ubaci FakeTimeProvider postavljen na tačan trenutak, pa je test ponovljiv i ne zavisi od dana kad se pokreće.

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
=====
---
id: 19
---
## Pitanja sa intervjua

**P: Kako bi u dve rečenice objasnio tok jednog zahteva kroz ASP.NET Core API?**
Kestrel primi zahtev, prođe kroz middleware (izuzeci, HTTPS, autentifikacija, autorizacija), ruting izabere endpoint, model binding i validacija pripreme ulaz, a DI ubaci servise. Servis kroz Scoped DbContext pita bazu, rezultat se serijalizuje u JSON i vraća istim putem nazad.

**P: Koje greške najčešće vidiš kod juniora u .NET kodu?**
Blokiranje async koda (.Result), N+1 upiti, entiteti umesto DTO-a u API-ju, hvatanje Exception bez razloga, nedostatak CancellationToken-a, captive dependency i tajne u appsettings.json. Dobro je imati primer kako si neku od njih sam ispravio.

**P: Šta proveravaš u code review-u .NET koda?**
Ispravnost i granične slučajeve, async do kraja, upite (N+1, nedostatak indeksa, AsNoTracking), validaciju ulaza i autorizaciju, rukovanje greškama, nazive i čitljivost, i da li postoje testovi za izmenjeno ponašanje.

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
