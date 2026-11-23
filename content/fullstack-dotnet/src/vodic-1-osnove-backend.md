---
id: 1
subtitle: "klijent, server, baza, DNS, port, SPA, monolit"
minutes: 45
---
# 1 Kako radi web aplikacija

Web aplikacija ima tri osnovna dela: **klijent** (browser ili mobilna aplikacija) koji prikazuje i šalje podatke, **server** koji odlučuje šta sme i šta se dešava, i **bazu** koja trajno čuva podatke. Klijent i server pričaju preko mreže, protokolom HTTP. Sve ostalo u ovom putu (React, ASP.NET Core, Docker) su alati za jedan od ta tri dela.

## Pojmovi

| Deo | Gde radi | Posao | Da li mu se veruje |
|---|---|---|---|
| Klijent (frontend) | u browseru korisnika | prikaz, unos, interakcija | ne: korisnik može da izmeni JavaScript ili da pošalje zahtev mimo aplikacije |
| Server (backend) | na serveru | pravila, provere, bezbednost, integracije | da: jedini izvor istine |
| Baza | na serveru (obično posebnom) | trajno čuvanje, ograničenja (jedinstven email, strani ključevi) | da, ali joj pristupa samo server |

### Put jednog zahteva

1. **DNS:** browser pita koja je IP adresa za `biblioteka.rs` (odgovor se kešira koliko kaže TTL zapisa).
2. **TCP veza** na port 443 (HTTPS) ili 80 (HTTP). IP adresa označava računar, port program na njemu.
3. **TLS rukovanje:** server pokaže sertifikat, strane dogovore ključ, pa je sve dalje šifrovano (vodič, pogl. 33).
4. **HTTP zahtev:** metoda, putanja, zaglavlja, telo (pogl. 2).
5. **Server** proveri ko je korisnik i šta sme, pita bazu (SQL) i vrati odgovor: HTML ili JSON.
6. **Browser** parsira HTML, dohvati CSS, JS i slike dodatnim zahtevima i nacrta stranicu (pogl. 20).

**Klijentu se nikad ne veruje.** Validacija u formi je udobnost za korisnika; pravila („ima li slobodnih primeraka”, „sme li ovaj korisnik da briše”) uvek proverava server, jer zahtev može da stigne i iz `curl`-a.

### Dve vrste web aplikacija

| | Server pravi stranice (SSR) | SPA (Single Page Application) |
|---|---|---|
| Šta server vraća | gotov HTML za svaki klik | jednom HTML i JavaScript, posle samo podatke (JSON) |
| Primeri | Razor Pages, MVC, Next.js | React + Vite, Zalihe, ova aplikacija |
| Dobro | brz prvi prikaz, SEO | brzi prelazi, isti API koristi i mobilna aplikacija |
| Cena | svaki klik je novi zahtev za stranicu | veći prvi JS, SEO traži dodatni posao |

### Monolit i mikroservisi

| | Monolit (modularni) | Mikroservisi |
|---|---|---|
| Šta je | jedna aplikacija i jedna baza, kod podeljen u module/slojeve | više malih aplikacija, svaka sa svojom bazom, pričaju preko mreže |
| Transakcija | jedna, u bazi | distribuirana (saga, outbox), mrežne greške su normalne |
| Deploy | jedan | nezavisan po servisu, ali složeniji (orkestracija, praćenje) |
| Kad | mali i srednji tim, nov proizvod | veliki timovi koji moraju da isporučuju i skaliraju nezavisno |

Za mali tim je pravi izbor **modularni monolit**: jedan proces, ali kod jasno podeljen, pa se deo kasnije može izdvojiti.

## Dublje

**DNS korak po korak.** Browser prvo gleda svoj keš, pa keš operativnog sistema, pa pita resolver (kod provajdera ili javni, npr. 1.1.1.1). Resolver, ako nema odgovor, pita root server, pa server za `.rs`, pa autoritativni server domena. Zato promena DNS zapisa ne važi odmah: stari odgovor živi u keševima dok ne istekne TTL.

**Verzije HTTP-a.** HTTP/1.1 šalje jedan zahtev po vezi u isto vreme, pa browser otvara više veza. HTTP/2 šalje više zahteva istovremeno kroz jednu vezu (multipleksiranje). HTTP/3 ide preko QUIC-a, koji radi nad UDP-om, pa gubitak jednog paketa ne zaustavlja ostale tokove. Za kod aplikacije razlika je skoro nevidljiva: metode, statusi i zaglavlja su isti.

**TLS 1.3** završava rukovanje u jednom povratnom putu (1-RTT), pa je HTTPS danas jedva sporiji od HTTP-a. Zato nema razloga za sajt bez HTTPS-a.

**Gde se gubi vreme.** U alatu Network u browseru svaki zahtev ima vremensku liniju: DNS, uspostavljanje veze, TLS, čekanje na prvi bajt (TTFB, to je vreme servera i baze) i preuzimanje. Kad je stranica spora, prvo pogledaj koji deo je dug: dug TTFB je problem servera, dugo preuzimanje je prevelik odgovor.

## Lab

1. U terminalu pokreni `dig +short example.com` (ili `nslookup example.com`) i zapiši IP adresu; pokreni ponovo `dig example.com` i pronađi TTL zapisa.
2. Pokreni `curl -v https://example.com -o /dev/null` i u izlazu pronađi: IP i port, TLS verziju, sertifikat (subject, issuer), zahtev (`> GET / HTTP/2`) i statusni red odgovora.
3. Otvori bilo koji sajt sa uključenim DevTools → Network, osveži stranicu i za glavni dokument zapiši vremena: DNS, Initial connection, SSL, Waiting for server response (TTFB), Content download.
4. U istom alatu na jednom POST zahtevu izaberi „Copy as cURL”, izmeni telo i pošalji ga iz terminala: tako izgleda zahtev mimo frontend validacije.
5. Nacrtaj na papiru put jednog zahteva tvoje aplikacije (browser, DNS, proxy, API, baza) sa brojevima koraka iz lekcije.

**Gotovo je kad:** za jednu stranicu umeš da pokažeš koliko je trajao svaki korak (DNS, veza, TLS, server, preuzimanje) i da objasniš zašto server mora ponovo da proveri sve što frontend već proverava.

## Pitanja sa intervjua

**P: Šta se dešava od trenutka kad u pregledač ukucaš URL do prikaza stranice?**
DNS pretvori ime domena u IP adresu, pregledač otvori TCP vezu (i TLS rukovanje za HTTPS) i pošalje HTTP zahtev. Server (često iza reverse proxy-ja) obradi zahtev i vrati HTML; pregledač ga parsira, povuče CSS, JS i slike dodatnim zahtevima, izgradi DOM i iscrta stranicu. U SPA aplikaciji JS posle toga sam traži podatke od API-ja.

**P: Zašto kažemo da je HTTP „stateless” i kako onda aplikacija zna da si ulogovan?**
Svaki zahtev je nezavisan; server ne pamti prethodni. Stanje se prenosi u samom zahtevu: kolačić sa ID-jem sesije ili token (npr. JWT u Authorization zaglavlju) ide uz svaki zahtev, pa server iz njega zna ko je korisnik.

**P: Čemu služi reverse proxy ispred aplikacije?**
Prima sav saobraćaj na 80/443, završava HTTPS, prosleđuje zahteve odgovarajućoj aplikaciji, može da servira statičke fajlove, kompresuje, kešira i deli opterećenje. Aplikacija iza njega ne mora da bude direktno izložena internetu.

**P: Zašto se pravila ne proveravaju samo na frontendu?**
Frontend je kod u rukama korisnika; može se izmeniti ili zaobići (curl, Postman, izmenjen JavaScript). Server je jedini kome se veruje; frontend validacija je samo radi udobnosti i brzog odziva.

**P: Monolit ili mikroservisi?**
Zavisi od tima i domena. Mali tim: modularni monolit (jedna transakcija, jedan deploy, lako praćenje). Mikroservisi kad timovi moraju da rade, isporučuju i skaliraju nezavisno, uz cenu distribuiranih transakcija, mrežnih grešaka i složenijeg deploya.

**P: SPA ili stranice sa servera?**
SPA kad je aplikacija iza prijave, sa mnogo interakcije i API-jem koji koristi i mobilna aplikacija. Stranice sa servera (ili Next.js) kad su važni SEO i brz prvi prikaz, npr. javni sajt ili prodavnica.

## Test

### 1. Šta je prvi korak kad pregledač treba da otvori `https://shop.rs/korpa`?
- [ ] Šalje HTTP zahtev na port 80
- [x] Preko DNS-a saznaje IP adresu za `shop.rs`
- [ ] Učitava React aplikaciju iz keša
- [ ] Otvara WebSocket vezu
> Pregledač ne može da se poveže na ime, već na IP adresu. Tek kad DNS vrati adresu, otvara TCP vezu, radi TLS rukovanje i šalje zahtev.

### 2. Gde se izvršava kod React komponente u klasičnoj SPA aplikaciji?
- [ ] Na serveru, pa se šalje gotov HTML
- [ ] U bazi podataka
- [x] U pregledaču korisnika
- [ ] U reverse proxy-ju
> Server pošalje JS bundle, a pregledač izvršava React kod i crta interfejs. Podatke dobija od API-ja preko HTTP-a (fetch).

### 3. Kako server zna koji je korisnik poslao zahtev, ako je HTTP bez stanja?
- [ ] Pamti IP adresu iz prethodnog zahteva
- [x] Uz svaki zahtev stiže kolačić ili token koji identifikuje korisnika
- [ ] TCP veza ostaje otvorena dok se korisnik ne odjavi
- [ ] Pregledač šalje korisničko ime i lozinku samo prvi put
> Identitet putuje u svakom zahtevu (kolačić sesije ili Authorization zaglavlje sa tokenom). IP adresa nije pouzdana: deli je više korisnika i menja se.

### 4. Koji je podrazumevani port za HTTPS?
- [ ] 80
- [ ] 8080
- [x] 443
- [ ] 22
> HTTP koristi 80, HTTPS 443, SSH 22. Port 8080 je uobičajen za aplikaciju iza reverse proxy-ja, ali nije standard za HTTPS.

### 5. Šta od navedenog NIJE uloga reverse proxy-ja?
- [ ] Završavanje HTTPS-a (TLS termination)
- [ ] Prosleđivanje zahteva aplikaciji na internom portu
- [x] Izvršavanje SQL upita nad bazom
- [ ] Serviranje statičkih fajlova
> Reverse proxy (nginx, Caddy) radi na nivou HTTP-a. Upite ka bazi šalje aplikacija, ne proxy.

## Izvori
- [MDN: kako radi web](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
- [MDN: kako browser prikazuje stranicu](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [MDN: DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS)
- [RFC 9114: HTTP/3 preko QUIC-a](https://www.rfc-editor.org/rfc/rfc9114.html)
- [Chrome DevTools: vremena u Network panelu](https://developer.chrome.com/docs/devtools/network/reference)
- [Martin Fowler: MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
=====
---
id: 2
subtitle: "zahtev, odgovor, metode, statusi, REST, cookie, CORS"
minutes: 55
---
# 2 HTTP i REST

HTTP je protokol zahtev–odgovor: klijent pošalje zahtev, server vrati odgovor. Svaki zahtev je nezavisan (**stateless**): server ne pamti prethodni, pa sve što treba da „preživi” između zahteva (ko je prijavljen) putuje u svakom zahtevu, kao cookie ili token. REST je stil kojim se nad HTTP-om pravi API.

## Pojmovi

### Anatomija zahteva i odgovora

```
POST /api/books/42/loans HTTP/2          ← metoda i putanja (resurs)
Host: biblioteka.rs
Content-Type: application/json           ← zaglavlja
Cookie: auth=CfDJ8…

{ "memberId": 7, "days": 14 }            ← telo (JSON)
```

```
HTTP/2 201 Created                       ← statusni kod
Location: /api/loans/1001
Content-Type: application/json

{ "id": 1001, "bookId": 42, "dueAt": "2026-11-10T00:00:00Z" }
```

### Metode

| Metoda | Značenje | Bezbedna (ne menja ništa) | Idempotentna |
|---|---|---|---|
| GET, HEAD | čitanje | da | da |
| POST | kreiranje, akcija | ne | ne |
| PUT | zamena celog resursa | ne | da |
| PATCH | delimična izmena | ne | nije zagarantovano |
| DELETE | brisanje | ne | da |

**Idempotentno** znači da isti zahtev poslat više puta ima isti nameravani efekat kao poslat jednom (RFC 9110). To je važno za ponovne pokušaje: GET, PUT i DELETE se smeju ponoviti posle mrežne greške, POST ne, jer bi dvaput napravio pozajmicu.

### Statusni kodovi

| Kod | Značenje | Primer u Biblioteci |
|---|---|---|
| 200 / 201 / 204 | uspeh / napravljeno (uz `Location`) / uspeh bez tela | lista knjiga / nova knjiga / izmena |
| 202 | primljeno, obradiće se kasnije | izveštaj koji se pravi u pozadini |
| 304 | nije menjano, koristi keš | `If-None-Match` sa ETag-om |
| 400 | neispravan zahtev (validacija) | prazan naslov |
| 401 / 403 | nisi prijavljen / prijavljen, ali nemaš pravo | istekao cookie / član briše knjigu |
| 404 | ne postoji | `/api/books/99` |
| 405 | metoda nije podržana na toj putanji | DELETE na listu |
| 409 | sukob sa trenutnim stanjem | nema slobodnih primeraka |
| 422 | sintaksa ispravna, sadržaj ne može da se obradi | neki API-ji ga koriste umesto 400 za validaciju |
| 429 | previše zahteva (rate limit), uz `Retry-After` | pogađanje lozinke |
| 500 / 503 | greška na serveru / servis trenutno nedostupan | izuzetak / baza ne odgovara |

### REST

Resursi su imenice u množini, a metoda kaže šta se radi:

```
GET    /api/books?page=2&pageSize=50&search=tolkin   lista (paginacija na serveru)
GET    /api/books/42                                 jedna knjiga
POST   /api/books                                    nova knjiga
PUT    /api/books/42                                 izmena
DELETE /api/books/42                                 brisanje
POST   /api/books/42/loans                           nova pozajmica te knjige (podresurs)
```

Liste uvek imaju **paginaciju na serveru**: lista od 100.000 knjiga bez nje obori i server i browser. Glagoli u putanji (`/getBooks`) su znak RPC stila.

### Cookie, sesija, token

- **Cookie** postavlja server (`Set-Cookie`), a browser ga sam šalje uz svaki sledeći zahtev ka istom sajtu. Atributi: `HttpOnly` (JavaScript ga ne vidi), `Secure` (samo HTTPS), `SameSite` (`Strict`, `Lax`, `None`: da li ide uz zahteve sa drugih sajtova). Najviše oko 4 KB po cookie-ju.
- **Sesija:** cookie nosi samo ID, podaci su na serveru. Ili je cookie sam šifrovan „karton” korisnika (ASP.NET Core cookie autentifikacija), pa server ne čuva ništa.
- **Bearer token** (npr. JWT): klijent ga šalje ručno u `Authorization: Bearer …`. Pogodan za mobilne aplikacije i server-server pozive (vodič, pogl. 15).

### Poreklo i CORS

**Poreklo** (origin) je šema + domen + port (`https://biblioteka.rs:443`). Browser ne dozvoljava JavaScriptu sa jednog porekla da čita odgovore sa drugog, osim ako server to dozvoli **CORS** zaglavljima (`Access-Control-Allow-Origin`). Za „nejednostavne” zahteve (npr. POST sa JSON-om) browser prvo pošalje **preflight** `OPTIONS` i pita sme li. Ako su frontend i API na istom poreklu (npr. iza istog proxy-ja), CORS nije potreban. CORS štiti korisnika u browseru, ne server: `curl` ga ignoriše.

### JSON i datumi

Objekti `{ }`, nizovi `[ ]`, stringovi, brojevi, `true`/`false`, `null`. Datumi nemaju svoj tip, pa se šalju kao string u ISO 8601 formatu, u UTC: `"2026-11-10T00:00:00Z"`. Greške se vraćaju kao ProblemDetails, `application/problem+json` (RFC 9457, vodič pogl. 11).

## Dublje

**Idempotency key za POST.** Kad klijent mora da ponovi POST (npr. plaćanje posle prekida mreže), šalje jedinstven ključ u zaglavlju (`Idempotency-Key`, IETF nacrt; koristi ga npr. Stripe). Server pamti ključ i rezultat, pa drugi isti zahtev vrati prvi rezultat umesto nove porudžbine.

**SameSite i CSRF.** `Lax` šalje cookie uz navigaciju na tvoj sajt sa drugog sajta (klik na link), ali ne uz POST sa tuđeg sajta. Neki browseri koriste `Lax` kad atribut nije postavljen, ali ne svi, pa se postavlja eksplicitno. To je jedan sloj odbrane od CSRF-a; drugi je antiforgery token (vodič, pogl. 15).

**ETag i 304.** Server uz odgovor pošalje `ETag` (otisak sadržaja). Klijent sledeći put pošalje `If-None-Match`; ako se ništa nije promenilo, server vrati `304 Not Modified` bez tela, pa se štedi prenos (vodič, pogl. 44).

**400 ili 422?** RFC 9110 definiše 422 za sadržaj koji je sintaksno ispravan, ali ne može da se obradi. ASP.NET Core sa `[ApiController]` za validaciju podrazumevano vraća 400 sa ProblemDetails; bitno je da tim izabere jedno i drži se toga.

## Lab

1. Napravi `dotnet new web -n Biblioteka` i u `Program.cs` napiši minimal API sa `GET /api/books` (sa `page` i `pageSize`), `GET /api/books/{id:int}`, `POST /api/books`, `PUT /api/books/{id:int}`, `DELETE /api/books/{id:int}` i `POST /api/books/{id:int}/loans`; knjige čuvaj u `ConcurrentDictionary`, a `builder.Services.AddProblemDetails()` uključi da greške budu ProblemDetails.
2. Neka POST vraća `Results.Created($"/api/books/{id}", book)`, prazan naslov `Results.ValidationProblem(...)`, nepostojeća knjiga `Results.NotFound()`, pozajmica bez slobodnog primerka i brisanje pozajmljene knjige `Results.Conflict(new { code = "..." })`, a PUT i DELETE `Results.NoContent()`.
3. Pozovi svaki endpoint sa `curl -i` i zapiši status i zaglavlja: 201 sa `Location`, 400 sa `application/problem+json` i `traceId`, 404, 409, 204.
4. Pošalji isti PUT dvaput i isti POST pozajmice dvaput: uporedi stanje posle oba (idempotentno i nije).
5. Pošalji preflight: `curl -i -X OPTIONS http://localhost:<port>/api/books -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"`. Bez CORS-a odgovor je 405. Dodaj `AddCors` sa `WithOrigins("http://localhost:5173")` i `app.UseCors()`, ponovi: 204 sa `Access-Control-Allow-Origin`, a za drugo poreklo 204 bez tog zaglavlja (browser blokira).

**Gotovo je kad:** svaki endpoint vraća tačan statusni kod iz tabele, umeš da objasniš zašto je PUT idempotentan a POST pozajmice nije, i vidiš razliku u preflight odgovoru za dozvoljeno i strano poreklo.

## Pitanja sa intervjua

**P: Koja HTTP metoda je idempotentna, a koja nije, i zašto je to bitno?**
GET, PUT i DELETE su idempotentne: isti zahtev poslat više puta ostavlja isto stanje. POST nije: dva ista POST zahteva mogu napraviti dve porudžbine. Bitno je za ponovne pokušaje (retry): idempotentan zahtev je bezbedno ponoviti, a za POST treba idempotency key.

**P: Koja je razlika između 401 i 403?**
401 Unauthorized znači „ne znam ko si” (nema ili ne važi prijava). 403 Forbidden znači „znam ko si, ali nemaš pravo”. Ponovna prijava pomaže kod 401, ne kod 403.

**P: Kako izgleda dobar REST URL za stavke jedne porudžbine?**
Resursi su imenice u množini, a akcija je HTTP metoda: `GET /orders/42/items`, `POST /orders/42/items`, `DELETE /orders/42/items/7`. Glagoli u putanji (`/getOrderItems`) su znak RPC stila, ne REST-a.

**P: Šta je CORS i da li štiti API?**
Mehanizam kojim server zaglavljima dozvoljava JavaScriptu sa drugog porekla da čita njegove odgovore; za nejednostavne zahteve browser prvo šalje preflight `OPTIONS`. Štiti korisnika u browseru, ne server: `curl` i drugi serveri ga ignorišu, pa se API štiti prijavom i autorizacijom.

**P: Zašto paginacija mora da bude na serveru?**
Bez nje server čita i šalje celu tabelu, a browser je crta; sa 100.000 redova pada oboje. Server vraća jednu stranu (`page`, `pageSize`, ukupan broj), a za vrlo duboke strane keyset paginaciju (vodič, pogl. 47).

**P: Kako bezbedno ponoviti POST posle mrežne greške?**
Klijent šalje jedinstven idempotency key u zaglavlju; server pamti ključ i rezultat, pa ponovljeni zahtev dobije prvi rezultat umesto da napravi novu porudžbinu.

## Test

### 1. Koja metoda NIJE idempotentna?
- [ ] GET
- [ ] PUT
- [ ] DELETE
- [x] POST
> Ponovljen POST obično pravi novi resurs (dve porudžbine). PUT postavlja resurs na isto stanje, a DELETE briše isti resurs, pa ponavljanje ne menja ishod.

### 2. Koji statusni kod vraća uspešan POST koji je napravio novi resurs?
- [ ] 200 OK
- [x] 201 Created, uz `Location` zaglavlje
- [ ] 204 No Content
- [ ] 202 Accepted
> 201 kaže da je resurs napravljen, a `Location` pokazuje gde se nalazi. 202 znači da je zahtev primljen ali će se obraditi kasnije.

### 3. Prijavljen korisnik pokušava da obriše tuđu porudžbinu. Koji kod je ispravan?
- [ ] 401 Unauthorized
- [x] 403 Forbidden
- [ ] 404 Not Found, uvek
- [ ] 500 Internal Server Error
> Korisnik je poznat, ali nema pravo: 403. (Neki API-ji namerno vraćaju 404 da ne otkriju da resurs postoji, ali to je svesna odluka, ne pravilo.)

### 4. Koja je razlika između PUT i PATCH?
- [ ] PUT je za kreiranje, PATCH za brisanje
- [ ] Nema razlike, to su sinonimi
- [x] PUT zamenjuje ceo resurs, PATCH menja samo poslata polja
- [ ] PATCH je idempotentan, PUT nije
> PUT šalje celo novo stanje resursa. PATCH šalje samo izmene. PATCH nije nužno idempotentan (npr. „povećaj količinu za 1”).

### 5. Klijent šalje ispravan JSON, ali porudžbina u tom stanju ne može da se otkaže jer je već poslata. Koji kod najbolje opisuje situaciju?
- [ ] 400 Bad Request
- [ ] 404 Not Found
- [x] 409 Conflict
- [ ] 405 Method Not Allowed
> 409 znači da zahtev nije u skladu sa trenutnim stanjem resursa. 400 je za neispravan zahtev (pogrešan format, nedostaje polje).

## Izvori
- [RFC 9110: HTTP semantika (metode, idempotentnost, statusi)](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457: Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [MDN: HTTP statusni kodovi](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [MDN: CORS i preflight](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN: Set-Cookie (HttpOnly, Secure, SameSite)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [Microsoft Learn: odgovori u minimal API-ju](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses)
- [Microsoft Learn: CORS u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/cors)
- [IETF nacrt: Idempotency-Key zaglavlje](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
=====
---
id: 3
subtitle: "SDK, runtime, CLR, IL i JIT, projekat, NuGet, verzije"
minutes: 45
---
# 3 .NET platforma i alati

.NET je platforma za pravljenje aplikacija: **jezik** (najčešće C#), **runtime** koji izvršava kod (CLR) i velika **standardna biblioteka** (tekst, fajlovi, mreža, kolekcije). Radi na Windowsu, Linuxu i macOS-u i otvorenog je koda. Ovo poglavlje objašnjava šta se dešava između `dotnet build` i pokrenutog programa i koji alati se koriste svaki dan.

## Pojmovi

### Od koda do izvršavanja

```
C# kod (.cs) --Roslyn kompajler--> IL u .dll --JIT u CLR-u, pri izvršavanju--> mašinski kod
             dotnet build                       dotnet App.dll
```

Kompajler pravi **IL** (Intermediate Language), koji ne zavisi od procesora. **JIT** (Just-In-Time) ga prevodi u mašinski kod za procesor na kome program radi, i to metodu po metodu, pri prvom pozivu. Zato ista `.dll` radi i na x64 i na ARM-u. **CLR** (Common Language Runtime) pored toga upravlja memorijom (GC), izuzecima, nitima i proverom tipova.

| Način prevođenja | Kad | Cena |
|---|---|---|
| JIT (podrazumevano) | pri izvršavanju, metodu po metodu | malo sporiji start; JIT zna stvarni procesor i može da optimizuje „vruće” metode (tiered compilation) |
| ReadyToRun | deo unapred, JIT dopuni | brži start, veći fajlovi |
| Native AOT | sve unapred, jedan izvršni fajl | najbrži start i manja memorija, ali deo refleksije i dinamičkog koda ne radi |

### SDK i runtime

| | SDK | Runtime |
|---|---|---|
| Za šta | razvoj: kompajler, `dotnet build/test/publish`, šabloni | samo pokretanje gotove aplikacije |
| Docker image | `mcr.microsoft.com/dotnet/sdk:10.0` (build faza) | `mcr.microsoft.com/dotnet/aspnet:10.0` (konačni image) |

### Projekat, solution, paket

| Pojam | Šta je |
|---|---|
| Projekat (`.csproj`) | jedna izlazna celina (aplikacija ili biblioteka): ciljni framework, reference, paketi |
| Solution (`.slnx`, stariji `.sln`) | spisak projekata koji idu zajedno; od .NET 10 SDK `dotnet new sln` pravi `.slnx` (XML) |
| Referenca na projekat | projekat A koristi kod projekta B; kružne reference nisu dozvoljene |
| NuGet paket | tuđa biblioteka (EF Core, xUnit), kao npm za .NET; `PackageReference` u `.csproj`, `dotnet restore` je preuzima |
| Namespace | „prezime” klase, da se imena ne sudare: `Biblioteka.Domain.Book` |
| Assembly | izlaz builda jednog projekta (`.dll`) |

```xml
<!-- Biblioteka.Api.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>          <!-- upozorenja za moguće null -->
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\Biblioteka.Domain\Biblioteka.Domain.csproj" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
  </ItemGroup>
</Project>
```

### Komande

```
dotnet new console -n Zdravo        # nov projekat iz šablona (console, classlib, webapi, xunit…)
dotnet new sln -n Biblioteka        # solution (.slnx)
dotnet sln add Zdravo               # dodaj projekat u solution
dotnet run                          # build + pokretanje
dotnet build / dotnet test          # samo build / svi testovi u solutionu
dotnet add package Shouldly         # NuGet paket
dotnet add reference ../Domain      # referenca na drugi projekat
dotnet publish -c Release           # spremi za produkciju
dotnet list package --vulnerable    # paketi sa poznatim ranjivostima
```

### Verzije i podrška

Nova glavna verzija izlazi svakog novembra. **Parne su LTS** (tri godine podrške), **neparne STS** (dve godine). Stanje u novembru 2026: .NET 10 (LTS, novembar 2025, podrška do novembra 2028) i .NET 11 (STS, novembar 2026, takođe do novembra 2028); .NET 8 i 9 su izgubili podršku 10. 11. 2026. Za produkciju se obično bira LTS. Svaka verzija .NET-a donosi i novu verziju C#-a (C# 14 uz .NET 10, C# 15 uz .NET 11).

### Prvi program

```csharp
// Program.cs: "top-level statements", bez klase i metode Main
var ime = "Ana";
Console.WriteLine($"Zdravo, {ime}!");   // Zdravo, Ana!
```

## Dublje

**Šta radi JIT kad metoda postane „vruća”.** Prvi prevod je brz i manje optimizovan (tier 0). Kad se metoda pozove mnogo puta, JIT je prevede ponovo, optimizovano (tier 1), uz podatke o stvarnom izvršavanju. Zato se prvi zahtevi posle starta API-ja izvršavaju sporije, a merenja performansi (BenchmarkDotNet) prvo „zagreju” kod.

**.NET Framework i moderni .NET.** Stari .NET Framework (do 4.8.1) radi samo na Windowsu i dobija samo bezbednosne zakrpe. Moderni .NET (nekad „.NET Core”, od verzije 5 samo „.NET”) je otvorenog koda, radi svuda i u njemu se razvija sve novo.

**Gde su paketi.** `dotnet restore` preuzima pakete u globalni folder (`~/.nuget/packages`), pa se ne nalaze u repou. `packages.lock.json` (uključuje se sa `RestorePackagesWithLockFile`) zaključava tačne verzije i tranzitivne zavisnosti, kao `package-lock.json` u npm-u.

**Garbage Collector u jednoj rečenici.** Objekti na hipu do kojih ne vodi nijedna živa referenca se oslobađaju automatski, po generacijama (detaljno u pogl. 7).

## Lab

1. Proveri šta je instalirano: `dotnet --info` i `dotnet --list-sdks`; zapiši verziju SDK-a i runtime-a.
2. Napravi solution `dotnet new sln -n Biblioteka`, projekte `dotnet new classlib -n Biblioteka.Domain` i `dotnet new console -n Biblioteka.App`, dodaj ih u solution i dodaj referencu iz `App` na `Domain`.
3. U `Domain` napiši klasu `Book` sa naslovom, a u `App` napravi knjigu i ispiši naslov; pokreni `dotnet run --project Biblioteka.App`.
4. Dodaj paket `dotnet add Biblioteka.App package Humanizer` i ispiši `"pozajmica_knjige".Humanize()`; otvori `.csproj` i nađi `PackageReference`.
5. Pokreni `dotnet build -c Release` i pronađi `.dll` u `bin/Release/net10.0`; pokreni ga sa `dotnet Biblioteka.App.dll`.
6. Pokušaj kružnu referencu (iz `Domain` na `App`) i zapiši poruku koju build javi.

**Gotovo je kad:** solution sa dva projekta i jednim NuGet paketom se builda i pokreće, i umeš da objasniš put od `.cs` do mašinskog koda i razliku između SDK-a i runtime-a.

## Pitanja sa intervjua

**P: Šta je CLR i šta radi JIT?**
CLR (Common Language Runtime) je izvršno okruženje .NET-a: učitava sklopove, upravlja memorijom (GC), izuzecima i bezbednošću tipova. C# kompajler pravi IL (međukod), a JIT ga pri izvršavanju prevodi u mašinske instrukcije za konkretan procesor.

**P: Koja je razlika između .NET SDK i .NET Runtime?**
SDK služi za razvoj: kompajler, `dotnet build`, `dotnet test`, šabloni. Runtime je samo ono što treba za pokretanje gotove aplikacije. Zato Docker build koristi SDK image, a finalni image samo runtime (`aspnet`).

**P: Kako radi Garbage Collector u .NET-u, ukratko?**
GC automatski oslobađa objekte na hipu do kojih više ne vodi nijedna referenca. Deli ih u generacije (0, 1, 2): većina objekata umre mlada, pa GC najčešće čisti samo generaciju 0, što je brzo. Objekti od 85.000 bajtova i više idu na Large Object Heap.

**P: .NET Framework ili moderni .NET?**
Stari .NET Framework radi samo na Windowsu i dobija samo zakrpe; moderni .NET (5 i noviji) je otvorenog koda, radi na Linuxu, macOS-u i u kontejnerima, i u njemu se razvija sve novo.

**P: Šta je LTS i koju verziju bi izabrao za novi projekat?**
LTS (Long Term Support) verzije su parne i imaju tri godine podrške, STS neparne i dve godine. Za produkciju obično LTS, danas .NET 10 (podrška do novembra 2028); STS kad su potrebne nove mogućnosti i tim redovno podiže verzije.

**P: JIT ili Native AOT?**
JIT je podrazumevan i podržava sve (refleksiju, dinamičko učitavanje). Native AOT daje brži start i manju memoriju (dobro za kontejnere koji se često pokreću i za CLI alate), ali traži kod bez dinamičke refleksije; deo biblioteka ga ne podržava.

## Test

### 1. Šta pravi C# kompajler kad pokreneš `dotnet build`?
- [ ] Mašinski kod za tvoj procesor
- [x] IL međukod u .dll fajlu
- [ ] JavaScript koji izvršava Node
- [ ] Izvorni kod sa uklonjenim komentarima
> IL je nezavisan od procesora. JIT ga prevodi u mašinski kod pri pokretanju (ili unapred, uz Native AOT).

### 2. Koja verzija .NET-a ima dugoročnu podršku (LTS)?
- [ ] .NET 7
- [ ] .NET 9
- [x] .NET 8 i .NET 10
- [ ] Sve verzije imaju istu podršku
> Parne verzije (6, 8, 10) su LTS sa tri godine podrške, neparne (STS) sa dve. .NET 8 je podršku izgubio 10. 11. 2026, a .NET 10 je podržan do novembra 2028, pa je on danas izbor za produkciju.

### 3. Šta treba u Docker image-u u kome se aplikacija samo POKREĆE?
- [ ] Ceo .NET SDK
- [x] Samo runtime (za web aplikaciju `aspnet` image)
- [ ] Visual Studio
- [ ] NuGet keš
> SDK je potreban za build, ne za izvršavanje. Multi-stage Dockerfile gradi u SDK image-u, a kopira rezultat u manji runtime image.

### 4. Koji objekti su kandidati za Garbage Collector?
- [ ] Svi objekti stariji od jednog minuta
- [ ] Samo objekti koji implementiraju IDisposable
- [x] Objekti na hipu do kojih ne vodi nijedna živa referenca
- [ ] Lokalne promenljive na steku
> GC prati reference od „korena” (statička polja, lokalne promenljive, registri). Ono do čega se ne može doći je smeće. Stek se ne čisti GC-om, oslobađa se izlaskom iz metode.

### 5. Čemu služi NuGet?
- [ ] Za pokretanje testova
- [ ] Za kompajliranje IL-a u mašinski kod
- [x] Za preuzimanje i upravljanje bibliotekama (paketima) projekta
- [ ] Za objavljivanje aplikacije na server
> NuGet je menadžer paketa za .NET. Paketi se navode kao `PackageReference` u .csproj, a `dotnet restore` ih preuzima.

## Izvori
- [Microsoft Learn: uvod u .NET](https://learn.microsoft.com/en-us/dotnet/core/introduction)
- [Microsoft Learn: proces izvršavanja (IL, JIT)](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)
- [Microsoft Learn: tiered compilation](https://learn.microsoft.com/en-us/dotnet/core/runtime-config/compilation)
- [Microsoft Learn: Native AOT](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [Microsoft Learn: dotnet CLI](https://learn.microsoft.com/en-us/dotnet/core/tools/)
- [Microsoft Learn: PackageReference i lock fajl](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files)
- [.NET: politika podrške (LTS i STS)](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [endoflife.date: .NET verzije i rokovi](https://endoflife.date/dotnet)
=====
---
id: 4
subtitle: "tipovi, decimal, uslovi, petlje, metode, null, pattern matching"
minutes: 50
---
# 4 C# osnove

C# je **statički tipiziran** jezik: svaka promenljiva ima tip koji kompajler zna, pa mnoge greške puknu pri buildu, a ne kod korisnika. Ovo poglavlje je sintaksa koju koristiš u svakoj liniji: tipovi, uslovi, petlje, metode i rad sa `null`.

## Pojmovi

### Promenljive i osnovni tipovi

| Tip | Za šta | Primer |
|---|---|---|
| `int`, `long` | celi brojevi (32 i 64 bita) | `int brojStrana = 320;` |
| `decimal` | novac i tačne decimale | `decimal clanarina = 1200.50m;` |
| `double` | naučni proračuni, merenja (približno) | `double ocena = 4.7;` |
| `bool` | tačno / netačno | `bool dostupna = true;` |
| `string`, `char` | tekst, jedan znak | `string naslov = "Hobit";` |
| `DateTimeOffset` | trenutak u vremenu, sa pomakom od UTC | `DateTimeOffset.UtcNow` |
| `Guid` | globalno jedinstven ID | `Guid.NewGuid()`, `Guid.CreateVersion7()` |

```csharp
var naslov = "Hobit";             // var: tip zaključi kompajler (string); i dalje je statički tip
const int MaxPozajmica = 5;       // konstanta poznata pri kompajliranju
string poruka = $"Knjiga {naslov} ima {320} strana";   // interpolacija

Console.WriteLine(0.1 + 0.2);     // 0.30000000000000004 (double je binarni razlomak)
Console.WriteLine(0.1m + 0.2m);   // 0.3 (decimal je u osnovi 10)
Console.WriteLine(7 / 2);         // 3: deljenje celih brojeva odseca
Console.WriteLine(7 / 2.0);       // 3.5
```

**Zašto `decimal` za novac:** `double` ne može tačno da zapiše 0.1, pa se greške zaokruživanja vide na računima. `decimal` je tačan za decimalne iznose (28–29 cifara); u bazi mu se dodeli preciznost, npr. `decimal(18,2)`. Napomena: ispis broja zavisi od kulture (u srpskoj je decimalni zarez, `0,3`), što je tema pogl. 27.

### Uslovi i petlje

```csharp
if (brojPozajmica >= MaxPozajmica) Console.WriteLine("Dostignut limit");
else if (brojPozajmica == 0) { /* ... */ }

string opis = status switch          // switch izraz vraća vrednost
{
    "available" => "Na polici",
    "loaned"    => "Pozajmljena",
    _           => "Nepoznato",         // _ = sve ostalo
};

for (int i = 0; i < 3; i++) { }       // broji
foreach (var knjiga in knjige) { }    // prođi kroz kolekciju
while (imaJos) { }                    // dok važi uslov; break izlazi, continue ide na sledeći krug
```

### Metode

```csharp
static decimal Zakasnina(int danaKasni, decimal poDanu = 20m)   // parametar sa podrazumevanom vrednošću
{
    if (danaKasni <= 0) return 0;       // "guard": rani izlaz za poseban slučaj
    return danaKasni * poDanu;
}
var iznos  = Zakasnina(3);                   // 60
var iznos2 = Zakasnina(3, poDanu: 50m);      // imenovani argument: 150
static int Dupla(int x) => x * 2;            // telo u jednom izrazu
```

### Null i nullable

`null` znači „nema vrednosti”. Pristup članu na `null` baca `NullReferenceException`, najčešću grešku u .NET-u. Uz **nullable reference types** (`<Nullable>enable</Nullable>`, podrazumevano u novim projektima) tip kaže da li sme biti null, a kompajler upozorava:

```csharp
string naslov = "Hobit";       // nikad null
string? napomena = null;       // sme biti null; kompajler upozori pre upotrebe bez provere
int? ocena = null;             // i vrednosni tipovi mogu biti nullable (Nullable<int>)

int duzina = napomena?.Length ?? 0;     // ?. ne zove ako je null; ?? daje zamenu
if (napomena is not null) { }           // posle provere kompajler zna da nije null
```

Nullable reference types su samo provera pri kompajliranju; u izvršavanju se ništa ne menja.

### Pattern matching

```csharp
if (obj is Book b) { }                               // provera tipa + nova promenljiva
if (putanja is { Length: > 0 } p) { }                // "nije null i dužina > 0"
var kategorija = strana switch { < 100 => "kratka", < 400 => "srednja", _ => "duga" };
if (status is "loaned" or "overdue") { }
```

## Dublje

**Prekoračenje.** `int.MaxValue + 1` u podrazumevanom (unchecked) kontekstu tiho postaje `-2147483648`. U `checked` bloku (ili sa `<CheckForOverflowUnderflow>`) baca `OverflowException`. Za brojače koji mogu da porastu koristi `long`.

**`const` i `readonly`.** `const` je vrednost poznata pri kompajliranju i „ugrađuje” se u kod koji je koristi (promena u biblioteci traži ponovni build pozivaoca). `readonly` polje se postavlja jednom, u konstruktoru, i može zavisiti od izvršavanja.

**Novije mogućnosti koje ćeš videti.** Raw string literali (`"""..."""`) za SQL i JSON bez escapovanja; `required` svojstva (C# 11) koja moraju da se postave pri pravljenju objekta; collection expressions (C# 12) `int[] a = [1, 2, 3];`; u C# 14 dodela uz null-conditional (`kupac?.Adresa = nova;`) i `field` u svojstvima.

**Datumi.** Za trenutak u vremenu koristi `DateTimeOffset` u UTC; `DateTime.Now` zavisi od zone servera. U kodu koji se testira vreme se čita iz `TimeProvider` (pogl. 8), ne direktno.

## Lab

1. Napravi konzolni projekat i ispiši `0.1 + 0.2`, `0.1m + 0.2m`, `7 / 2` i `7 / 2.0`; objasni svaki rezultat.
2. Napiši `Zakasnina(int danaKasni, decimal poDanu = 20m)` i pozovi je sa podrazumevanom vrednošću i imenovanim argumentom.
3. Napiši `switch` izraz koji status pozajmice (`"active"`, `"returned"`, `"overdue"`) pretvara u tekst za korisnika, sa `_` granom.
4. Uključi `<Nullable>enable</Nullable>`, napiši metodu koja prima `string? napomena` i vraća dužinu bez upozorenja kompajlera (`?.` i `??`).
5. Ispiši `int.MaxValue + 1` običnim i `checked` sabiranjem i uhvati `OverflowException`.
6. Napiši metodu `Kategorija(int strana)` sa pattern matching-om (`< 100`, `< 400`, `_`) i proveri je za 50, 320 i 900 strana.

**Gotovo je kad:** program se builda bez upozorenja, ispisuje očekivane vrednosti i umeš da objasniš zašto je `decimal` za novac, šta radi `??` i šta se desi pri prekoračenju `int`-a.

## Pitanja sa intervjua

**P: Koja je razlika između value i reference tipova?**
Promenljiva value tipa (int, struct, DateTime) sadrži samu vrednost; dodela pravi kopiju. Promenljiva reference tipa (class, string, niz) sadrži referencu na objekat na hipu; dodela kopira referencu, pa obe promenljive pokazuju na isti objekat.

**P: Zašto je string nepromenljiv (immutable) i šta to znači u praksi?**
Svaka „izmena” stringa pravi novi string. To ga čini bezbednim za deljenje između niti i za ključeve u rečniku. U praksi: spajanje stringova u velikoj petlji pravi mnogo smeća, pa se koristi StringBuilder ili string.Join.

**P: Zašto se za novac koristi decimal, a ne double?**
double je binarni razlomak i ne može tačno da zapiše 0.1, pa sabiranje cena daje greške zaokruživanja (0.1 + 0.2 != 0.3). decimal je decimalni tip sa 28-29 cifara preciznosti, napravljen za finansijske proračune.

**P: var: da li je C# onda dinamički?**
Ne. `var` samo prepušta kompajleru da zaključi tip; tip je i dalje fiksan od kompajliranja. Dinamički je `dynamic`, koji se retko koristi.

**P: const ili readonly?**
`const` je vrednost poznata pri kompajliranju (broj, string) i ugrađuje se u kod pozivaoca. `readonly` polje se postavlja jednom, u konstruktoru, i može da zavisi od izvršavanja (npr. vrednost iz konfiguracije).

**P: Kako izbegavaš NullReferenceException?**
Nullable reference types (kompajler upozorava), provera ulaza na granici (guard), `?.` i `??`, i dizajn u kome objekat ne može da postoji u neispravnom stanju (obavezni podaci kroz konstruktor ili `required`).

## Test

### 1. Šta ispisuje kod?
```csharp
int a = 5;
int b = a;
b = 10;
Console.WriteLine(a);
```
- [x] 5
- [ ] 10
- [ ] 15
- [ ] Greška pri kompajliranju
> int je value tip: `b = a` kopira vrednost. Izmena `b` ne utiče na `a`.

### 2. Šta ispisuje kod, ako je `Point` klasa sa poljem `X`?
```csharp
var p1 = new Point { X = 1 };
var p2 = p1;
p2.X = 7;
Console.WriteLine(p1.X);
```
- [ ] 1
- [x] 7
- [ ] 0
- [ ] Baca NullReferenceException
> Klasa je reference tip: p1 i p2 pokazuju na isti objekat. Da je Point struct, ispisalo bi se 1.

### 3. Koji tip je pravi izbor za iznos na računu?
- [ ] float
- [ ] double
- [x] decimal
- [ ] int, uvek u dinarima bez para
> decimal tačno čuva decimalne vrednosti poput 0.10. float i double prave greške zaokruživanja koje se na računima vide.

### 4. Šta znači `string? ime` kad su uključeni nullable reference types?
- [ ] ime je value tip
- [x] ime sme da bude null, pa kompajler upozorava ako ga koristiš bez provere
- [ ] ime nikad ne može biti null u izvršavanju
- [ ] ime je opcioni parametar metode
> Nullable reference types su provera u vreme kompajliranja. `string?` kaže „može biti null”, `string` kaže „ne bi trebalo da bude”. Runtime ponašanje se ne menja.

### 5. Kako se najefikasnije spaja 10.000 delova teksta u jedan string?
- [ ] `rezultat += deo;` u petlji
- [x] StringBuilder ili string.Join
- [ ] string.Concat u svakoj iteraciji
- [ ] Pretvaranjem u char[] posle svakog dodavanja
> Pošto je string nepromenljiv, `+=` u petlji svaki put pravi novi string i kopira sve do tada. StringBuilder dopisuje u bafer, pa je linearan.

## Izvori
- [Microsoft Learn: obilazak C#-a](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
- [Microsoft Learn: float, double, decimal](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types)
- [Microsoft Learn: nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [Microsoft Learn: pattern matching](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
- [Microsoft Learn: checked i unchecked](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/checked-and-unchecked)
- [Microsoft Learn: šta je novo u C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)
=====
---
id: 5
subtitle: "klasa, enkapsulacija, nasleđivanje, interfejs, struct, record, stack i heap"
minutes: 55
---
# 5 Objektno programiranje

**Klasa** je nacrt: opisuje koje podatke nešto ima i šta ume. **Objekat** je jedan konkretan primerak napravljen po nacrtu. Klasa `Book`, objekat „Hobit”. Dobar objekat čuva svoja pravila: ne može da se dovede u neispravno stanje, ma ko ga koristio.

## Pojmovi

### Klasa, svojstva, konstruktor

```csharp
public class Book
{
    public Guid Id { get; }                          // samo za čitanje
    public string Title { get; private set; }        // čita svako, menja samo klasa
    public int AvailableCopies { get; private set; }

    public Book(string title, int copies)            // konstruktor pravi ispravan objekat
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Naslov je obavezan.");
        Id = Guid.NewGuid();
        Title = title.Trim();
        AvailableCopies = copies;
    }

    public void Lend()                               // ponašanje + pravilo
    {
        if (AvailableCopies == 0) throw new InvalidOperationException("Nema slobodnih primeraka.");
        AvailableCopies--;
    }
}

var hobit = new Book("Hobit", copies: 2);
hobit.Lend();                         // AvailableCopies = 1
// hobit.AvailableCopies = 10;        ← ne kompajlira se: setter je private
```

### Četiri stuba OOP-a

| Stub | Značenje | U primeru |
|---|---|---|
| Enkapsulacija | stanje je skriveno, menja se samo kroz metode koje čuvaju pravila | `private set` + `Lend()`: niko ne postavlja negativan broj primeraka |
| Apstrakcija | spolja se vidi šta objekat radi, ne kako | pozivaš `Lend()`, ne znaš kako se broji |
| Nasleđivanje | klasa preuzima članove druge klase i dodaje svoje | `Book : LibraryItem` |
| Polimorfizam | isti poziv, ponašanje po stvarnom tipu | `item.LoanDays()` daje 14 za knjigu, 7 za film |

```csharp
public abstract class LibraryItem(string title)      // primary constructor (C# 12)
{
    public string Title { get; } = title;
    public abstract int LoanDays();                  // svaki naslednik MORA da implementira
}
public class Movie(string title) : LibraryItem(title)
{
    public override int LoanDays() => 7;
}

LibraryItem[] items = [new Book("Hobit", 1), new Movie("Ko to tamo peva")];
foreach (var it in items) Console.WriteLine($"{it.Title}: {it.LoanDays()}");   // 14, pa 7
```

`virtual` znači „naslednik sme da prepiše”, `abstract` „naslednik mora”, `override` „ovde prepisujem”, `sealed` „ne može dalje da se nasleđuje”.

### Interfejs

Interfejs je **ugovor**: kaže koje metode postoje, ne kako rade. Klasa nasleđuje najviše jednu klasu, a implementira koliko god interfejsa. Kod koji zavisi od interfejsa ne zna koja je implementacija iza njega, pa se ona menja, npr. u testu (pogl. 9 i 17).

```csharp
public interface INotifier { Task SendAsync(string to, string message); }
public class EmailNotifier : INotifier { /* pravi email */ }
public class FakeNotifier : INotifier { /* u testu samo zapamti poruku */ }
```

| | Apstraktna klasa | Interfejs |
|---|---|---|
| Stanje (polja) | da | ne |
| Implementacija | delimična | ugovor (od C# 8 može podrazumevana implementacija, retko se koristi) |
| Koliko po klasi | jedna | više |
| Kad | srodne klase dele kod i stanje | zamenljivost, testiranje, granice slojeva |

### Modifikatori i static

`public` svima, `private` samo klasi, `protected` klasi i naslednicima, `internal` unutar istog projekta (assembly-ja). `static` član pripada samoj klasi, ne objektu (`Math.Max`, fabričke metode `Loan.Start(...)`).

### Vrednosni i referentni tipovi, stack i heap

**Vrednosni** tipovi (`int`, `decimal`, `bool`, `Guid`, `DateTimeOffset`, `struct`, `enum`) čuvaju samu vrednost i kopiraju se pri dodeli. **Referentni** (`class`, `string`, nizovi, `record`) čuvaju referencu na objekat na hipu: `var b = hobit;` kopira referencu, pa obe promenljive menjaju isti objekat.

```csharp
var p1 = new PointClass { X = 1 }; var p2 = p1; p2.X = 7;   // p1.X je 7 (ista referenca)
var s1 = new PointStruct { X = 1 }; var s2 = s1; s2.X = 7;  // s1.X je 1 (kopija)
```

Lokalne promenljive vrednosnog tipa obično žive na steku (oslobađaju se izlaskom iz metode), a objekti na hipu, koji čisti GC (pogl. 7). Tačnije: gde vrednost živi zavisi od toga gde je deklarisana (vrednosno polje klase je na hipu, unutar objekta).

### record, struct, enum

```csharp
public enum LoanStatus { Active, Returned, Overdue }

public record BookDto(Guid Id, string Title, int Available);   // svojstva, konstruktor, jednakost po vrednosti
var a = new BookDto(id, "Hobit", 1);
var b = a with { Available = 0 };                // kopija sa izmenom; a ostaje isti
bool isti = a == new BookDto(id, "Hobit", 1);    // true: record se poredi po vrednostima
```

Pravilo palca: **class** za stvari sa identitetom (knjiga ostaje ista i kad promeni naslov), **record** za podatke koji se prenose i porede po vrednosti (DTO, komande), **struct** samo za male nepromenljive vrednosti (`record struct`, npr. novčani iznos).

## Dublje

**Kompozicija pre nasleđivanja.** Nasleđivanje („je vrsta od”) pravi čvrstu vezu: izmena osnovne klase lomi naslednike, a hijerarhije postaju duboke. Kompozicija („ima”): klasa dobije zavisnost kroz konstruktor i koristi je. `LoanService` ne nasleđuje `EmailNotifier`, nego dobija `INotifier`. Zato je kompozicija podrazumevani izbor, a nasleđivanje za prave „je vrsta od” odnose sa malo nivoa.

**Jednakost.** Klasa se podrazumevano poredi po referenci (dva objekta sa istim podacima nisu jednaka), record po vrednostima svih svojstava. Ako klasi treba jednakost po vrednosti, prepisuju se `Equals` i `GetHashCode` zajedno; inače se ne ponaša ispravno u `Dictionary` i `HashSet` (pogl. 45).

**Bogat model.** Pravila u samom objektu (privatni setteri, provera u konstruktoru, metode sa imenom iz domena) znače da se pravilo ne može zaobići sa drugog mesta. To je osnova pogl. 13 (bogat i anemičan model).

**Interfejs sa podrazumevanom implementacijom (C# 8).** Omogućava da se ugovoru doda metoda bez lomljenja postojećih implementacija. Koristi se u bibliotekama; u aplikacionom kodu je retko potreban.

## Lab

1. Napiši klasu `Book` sa `private set`, proverom naslova u konstruktoru i metodama `Lend()` i `Return()`; `Return()` ne sme da poveća broj iznad ukupnog broja primeraka.
2. Napiši apstraktnu klasu `LibraryItem` sa `abstract int LoanDays()` i naslednike `Book` (14), `Movie` (7) i `EBook` (30); prođi kroz listu `LibraryItem` i ispiši rok za svaki.
3. Napiši interfejs `INotifier` i dve implementacije (`ConsoleNotifier`, `FakeNotifier` koji pamti poruke u listi); klasa `ReminderService` ih dobija kroz konstruktor.
4. Napravi `record BookDto` i pokaži `with` i jednakost po vrednosti; isto uradi sa klasom i uporedi rezultat `==`.
5. Napravi `struct` i `class` sa poljem `X`, kopiraj ih i izmeni kopiju; zapiši šta se desilo sa originalom i zašto.

**Gotovo je kad:** `hobit.AvailableCopies = 10` se ne kompajlira, `ReminderService` radi sa obe implementacije bez izmene, a umeš da objasniš razliku između klase, recorda i strukture na svom primeru.

## Pitanja sa intervjua

**P: Koja je razlika između apstraktne klase i interfejsa?**
Apstraktna klasa može imati stanje (polja), konstruktor i delimičnu implementaciju; klasa nasleđuje samo jednu. Interfejs je ugovor bez stanja; klasa implementira više njih. Interfejs koristiš za sposobnost („može da se sačuva”), apstraktnu klasu za zajedničku osnovu srodnih tipova.

**P: Objasni polimorfizam na primeru.**
Isti poziv radi različito zavisno od stvarnog tipa objekta. Npr. `IPaymentProvider.Charge()` se poziva isto, a izvršava se Stripe ili PayPal implementacija. Pozivalac ne zna i ne mora da zna koja je; zato je kod otvoren za nove implementacije.

**P: Šta znači „composition over inheritance”?**
Umesto da ponašanje dobijaš nasleđivanjem (duboke hijerarhije, krhke osnovne klase), sastavljaš ga od manjih objekata koje dobiješ kroz konstruktor. Kompozicija je fleksibilnija i lakše se testira, jer se delovi zamenjuju.

**P: Objasni četiri stuba OOP-a.**
Enkapsulacija (stanje skriveno iza metoda koje čuvaju pravila), apstrakcija (vidi se šta, ne kako), nasleđivanje (preuzimanje članova osnovne klase), polimorfizam (isti poziv, ponašanje po stvarnom tipu).

**P: class, struct ili record?**
class: referentni tip sa identitetom. struct: vrednosni tip koji se kopira, za male nepromenljive vrednosti. record: jednakost po vrednosti i `with`, za DTO-ove i komande (record class je referentni, record struct vrednosni).

## Test

### 1. Koliko klasa C# klasa može direktno da nasledi?
- [x] Jednu, a interfejsa koliko god hoće
- [ ] Koliko god hoće
- [ ] Nijednu, samo interfejse
- [ ] Dve
> C# nema višestruko nasleđivanje klasa (zbog problema „dijamanta”), ali klasa može implementirati više interfejsa.

### 2. Šta ispisuje kod?
```csharp
class Zivotinja { public virtual string Glas() => "..."; }
class Pas : Zivotinja { public override string Glas() => "Av"; }

Zivotinja z = new Pas();
Console.WriteLine(z.Glas());
```
- [ ] ...
- [x] Av
- [ ] Greška pri kompajliranju
- [ ] Prazan red
> virtual/override daje polimorfizam: poziva se metoda stvarnog tipa (Pas), iako je promenljiva tipa Zivotinja.

### 3. Šta je enkapsulacija?
- [ ] Nasleđivanje ponašanja od osnovne klase
- [x] Skrivanje unutrašnjeg stanja iza javnih metoda koje čuvaju pravila
- [ ] Pakovanje klasa u NuGet paket
- [ ] Pretvaranje value tipa u object
> Npr. `Racun.Uplati(iznos)` proverava iznos, a polje `stanje` je private. Spolja niko ne može da postavi nevažeće stanje.

### 4. Šta znači `sealed` na klasi?
- [ ] Klasa ne može da se instancira
- [x] Klasa ne može da se nasledi
- [ ] Sva polja su readonly
- [ ] Klasa je thread-safe
> sealed zabranjuje nasleđivanje. Instanciranje zabranjuje abstract (ili private konstruktor).

### 5. Kada je apstraktna klasa bolji izbor od interfejsa?
- [ ] Kada klasa treba da implementira više ugovora
- [x] Kada srodni tipovi dele stanje i deo implementacije
- [ ] Kada želiš da tip bude value tip
- [ ] Nikada, interfejs je uvek bolji
> Apstraktna klasa može da drži zajednička polja i konstruktor. Za čist ugovor bez stanja, ili kad tip treba više ugovora, bolji je interfejs.

## Izvori
- [Microsoft Learn: objektno programiranje u C#-u](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop)
- [Microsoft Learn: interfejsi](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces)
- [Microsoft Learn: record](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)
- [Microsoft Learn: vrednosni tipovi](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [Microsoft Learn: primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors)
=====
---
id: 6
subtitle: "List, Dictionary, HashSet, generici, delegati, lambda, LINQ"
minutes: 50
---
# 6 Kolekcije, generici, LINQ

Skoro svaki posao u kodu je rad sa grupom podataka: lista knjiga, rečnik članova po ID-ju, skup već viđenih poruka. Pravi izbor kolekcije odlučuje da li je kod O(n) ili O(n²), a LINQ omogućava da se nad njom piše upit umesto petlje.

## Pojmovi

### Kolekcije

| Tip | Šta je | Kad |
|---|---|---|
| `T[]` (niz) | fiksna dužina | poznat broj elemenata |
| `List<T>` | niz koji raste (kapacitet se udvostručuje: 4, 8, 16…) | najčešća kolekcija |
| `Dictionary<K,V>` | ključ → vrednost, pretraga prosečno O(1) | „nađi po ID-ju” bez petlje |
| `HashSet<T>` | skup bez duplikata, provera O(1) | „da li je već viđen” |
| `Queue<T>` / `Stack<T>` | prvi unutra prvi napolje / poslednji prvi | redovi, istorija, zagrade |

```csharp
var knjige = new List<Book> { hobit, gospodarPrstenova };
knjige.Add(new Book("Silmarilion", 1));
var poId = knjige.ToDictionary(k => k.Id);                  // Dictionary<Guid, Book>
if (poId.TryGetValue(id, out var nadjena)) { }              // bez izuzetka ako nema ključa
var vidjeni = new HashSet<int>();
vidjeni.Add(5);  // true
vidjeni.Add(5);  // false: već postoji
```

### Generici

Generik je tip ili metoda sa **tipom kao parametrom**: `List<Book>` i `List<Member>` su ista klasa, a kompajler ipak ne dozvoljava da u listu knjiga ubaciš člana. Bez generika bi sve bilo `object`, sa greškama tek pri izvršavanju i boxing-om vrednosnih tipova.

```csharp
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

// ograničenje: T mora biti klasa koja implementira IHasId
static T? FindById<T>(IEnumerable<T> items, Guid id) where T : class, IHasId
    => items.FirstOrDefault(x => x.Id == id);
```

Ograničenja: `class` (referentni tip), `struct` (vrednosni), `new()` (konstruktor bez parametara), `notnull`, ime interfejsa ili osnovne klase.

### Delegati i lambda

Delegat je tip koji predstavlja **funkciju kao vrednost**: može se sačuvati u promenljivu i proslediti. Lambda je kratak zapis takve funkcije.

```csharp
Func<int, int> dupla = x => x * 2;                       // prima int, vraća int
Action<string> ispisi = s => Console.WriteLine(s);       // ne vraća ništa
Func<Book, bool> dostupna = b => b.AvailableCopies > 0;  // predikat
```

### LINQ

```csharp
var naslovi = knjige
    .Where(k => k.AvailableCopies > 0)      // filtriraj
    .OrderBy(k => k.Title)                  // sortiraj (stabilno)
    .Select(k => k.Title)                   // preslikaj
    .ToList();                              // tek sad se izvršava

int ukupno = knjige.Sum(k => k.AvailableCopies);
bool imaHobita = knjige.Any(k => k.Title == "Hobit");
var poAutoru = knjige.GroupBy(k => k.Author).Select(g => new { Autor = g.Key, Broj = g.Count() });
```

**Odloženo izvršavanje:** `Where`, `OrderBy`, `Select` samo opisuju upit. Izvršava se tek kad se traži rezultat (`ToList`, `Count`, `foreach`), i to **svaki put** iznova:

```csharp
var dostupne = knjige.Where(k => k.AvailableCopies > 0);
knjige.Add(new Book("Na Drini ćuprija", 2));
dostupne.Count();   // uključuje i novu knjigu: filter se izvršio tek sada
```

| | `IEnumerable<T>` | `IQueryable<T>` |
|---|---|---|
| Gde se izvršava | u memoriji, u C#-u | prevodi se (npr. u SQL) i izvršava u bazi |
| Lambda je | delegat: kod | expression tree: kod kao podatak koji provajder čita i prevodi |
| Zamka | prerano `.ToList()` nad bazom povuče celu tabelu | metoda koju provajder ne ume da prevede baca grešku |

`First` vraća prvi i baca izuzetak ako nema nijednog; `Single` traži tačno jedan i baca izuzetak i kad ih ima više; `...OrDefault` varijante vraćaju podrazumevanu vrednost umesto izuzetka kad nema nijednog.

## Dublje

**Zašto je `Dictionary` O(1).** Ključ se pretvori u broj (`GetHashCode`), broj odredi „kantu”, a u kanti se poredi `Equals`. Ako svi ključevi imaju isti heš, sve je u jednoj kanti i pretraga postaje O(n). Zato ključ ne sme da se menja posle ubacivanja (pogl. 45).

**Višestruko nabrajanje.** Upit koji se prođe dvaput izvršava se dvaput; nad bazom (`IQueryable`) to su dva SQL upita. Ako rezultat treba više puta, materijalizuj ga jednom (`ToList`). Analizatori (CA1851) i ReSharper upozoravaju na to.

**`IReadOnlyList<T>` kao povratni tip.** Pozivalac zna da ima `Count` i indeks, a ne može da menja kolekciju. Za parametar metode je obično dovoljan najopštiji tip koji ti treba (`IEnumerable<T>`).

**`yield return`** pravi lenju sekvencu: elementi se prave jedan po jedan, tek kad ih neko traži. Tako rade i LINQ operatori.

## Lab

1. Napravi listu od 5 knjiga i LINQ-om ispiši naslove dostupnih, sortirane po naslovu; zatim broj primeraka po autoru (`GroupBy`).
2. Pokaži odloženo izvršavanje: napravi upit, dodaj knjigu u listu, pa pozovi `Count()`; zatim ponovi sa `ToList()` pre dodavanja i uporedi.
3. Napiši predikat sa brojačem (`k => { n++; return ...; }`) i pozovi `Count()` dvaput; zapiši koliko puta je predikat pozvan.
4. Pretvori listu u `Dictionary` po ID-ju i nađi knjigu sa `TryGetValue`; zatim izmeri razliku između `List.Contains` i `HashSet.Contains` za 100.000 elemenata (`Stopwatch`).
5. Napiši generičku metodu `FindById<T>` sa ograničenjem `where T : class, IHasId` i upotrebi je za knjige i članove.
6. Pozovi `Single()` nad nizom od dva elementa i nad praznim nizom; zapiši izuzetke i uporedi sa `FirstOrDefault()`.

**Gotovo je kad:** umeš na svom primeru da pokažeš odloženo izvršavanje i višestruko nabrajanje, a za svaku kolekciju iz tabele znaš kada je prava i koja je složenost pretrage.

## Pitanja sa intervjua

**P: Šta je odloženo izvršavanje (deferred execution) u LINQ-u?**
Upit poput `lista.Where(x => x.Aktivan)` se ne izvršava kad ga napišeš, već kad ga prođeš (foreach, ToList, Count). Ako ga prođeš dvaput, izvršava se dvaput; ako se izvor u međuvremenu promeni, vidi se nova vrednost. ToList „zamrzava” rezultat.

**P: Koja je razlika između IEnumerable<T> i IQueryable<T> kod EF Core-a?**
IQueryable gradi stablo izraza koje EF prevodi u SQL, pa se filter izvršava u bazi. Kad pređeš na IEnumerable (npr. posle AsEnumerable ili ToList), ostatak se izvršava u memoriji nad svim učitanim redovima.

**P: Kada koristiš Dictionary, a kada List?**
List za redosled i prolazak kroz sve elemente; pretraga po vrednosti je O(n). Dictionary za brzu pretragu po ključu, prosečno O(1). Ako u petlji tražiš elemente po ID-ju, napravi Dictionary jednom pre petlje.

**P: Func, Action, Predicate?**
Delegati: `Func` vraća vrednost, `Action` ne vraća ništa, `Predicate<T>` vraća bool (LINQ koristi `Func<T, bool>`).

**P: Zašto generici, a ne object?**
Provera tipova pri kompajliranju (u listu knjiga ne može član), bez kastovanja i bez boxing-a vrednosnih tipova, pa je kod i bezbedniji i brži.

## Test

### 1. Kada se izvršava filter u ovom kodu?
```csharp
var aktivni = korisnici.Where(k => k.Aktivan);
korisnici.Add(noviAktivan);
var broj = aktivni.Count();
```
- [ ] Pri prvom redu, pa `broj` ne uključuje novog korisnika
- [x] Pri pozivu Count(), pa `broj` uključuje i novog korisnika
- [ ] Nikada, Where vraća praznu listu
- [ ] Baca izuzetak jer je lista izmenjena
> Where samo opisuje upit. Izvršava se tek pri Count(), nad listom kakva je tada.

### 2. Šta je razlika između First() i Single()?
- [ ] Nema razlike
- [ ] Single je brži
- [x] Single baca izuzetak ako ima više od jednog rezultata, First uzima prvi
- [ ] First baca izuzetak ako ima više rezultata
> Single izražava pretpostavku „postoji tačno jedan” i proverava je. First uzima prvi i ne gleda dalje. Obe bacaju izuzetak ako nema nijednog (za to su ...OrDefault varijante).

### 3. Koja kolekcija daje najbržu proveru „da li ovaj ID već postoji”?
- [ ] List<int>
- [ ] int[]
- [x] HashSet<int>
- [ ] LinkedList<int>
> HashSet.Contains je prosečno O(1). List.Contains i niz prolaze kroz elemente, O(n).

### 4. Šta radi ovaj EF Core upit?
```csharp
var skupi = db.Proizvodi.AsEnumerable().Where(p => p.Cena > 1000).ToList();
```
- [ ] Filtrira u bazi, vraća samo skupe proizvode
- [x] Učitava SVE proizvode iz baze, pa filtrira u memoriji
- [ ] Baca izuzetak jer AsEnumerable ne postoji
- [ ] Izvršava dva SQL upita
> AsEnumerable prelazi iz IQueryable u IEnumerable: SQL je `SELECT * FROM Proizvodi`, a Where se izvršava u C#-u. Bez AsEnumerable filter bi otišao u WHERE klauzulu.

### 5. Čemu služi ograničenje `where T : class` u generičkoj metodi?
- [ ] T mora imati konstruktor bez parametara
- [x] T mora biti reference tip
- [ ] T mora implementirati IComparable
- [ ] T ne sme biti string
> Ograničenja (constraints) sužavaju tipove koje generik prima. `new()` traži konstruktor bez parametara, `struct` value tip, a `IComparable<T>` interfejs.

## Izvori
- [Microsoft Learn: kolekcije](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Microsoft Learn: generici](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics)
- [Microsoft Learn: ograničenja generika](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)
- [Microsoft Learn: LINQ](https://learn.microsoft.com/en-us/dotnet/csharp/linq/)
- [Microsoft Learn: odloženo izvršavanje](https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation)
- [Microsoft Learn: CA1851 višestruko nabrajanje](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851)
=====
---
id: 7
subtitle: "try/catch, rezultat umesto izuzetka, GC, using, async/await, CancellationToken"
minutes: 55
---
# 7 Izuzeci, resursi, async

Tri stvari koje razdvajaju kod koji radi na laptopu od koda koji izdrži produkciju: kako se prijavljuju greške, kako se oslobađaju resursi (konekcije, fajlovi) i kako server opslužuje mnogo korisnika istovremeno bez blokiranja niti.

## Pojmovi

### Izuzeci

```csharp
try
{
    hobit.Lend();
}
catch (InvalidOperationException ex)       // hvata samo ovu vrstu
{
    logger.LogWarning(ex, "Pozajmica nije uspela");
}
finally
{
    // izvrši se uvek, i kad je bilo izuzetka
}
```

- Izuzetak „putuje” naviše kroz pozive dok ga neko ne uhvati; ako niko, pada zahtev (u ASP.NET Core-u globalni handler vrati 500) ili ceo program.
- Hvata se samo ono što znaš da obradiš; `catch (Exception)` svuda sakriva bagove.
- `throw;` ponovo baca isti izuzetak sa originalnim stack trace-om; `throw ex;` ga resetuje na mesto ponovnog bacanja.
- Izuzeci su skupi i nevidljivi u potpisu metode. Zato se **očekivane greške** (pogrešan unos, knjiga ne postoji) često vraćaju kao **rezultat**, a izuzeci ostaju za ono što „ne sme da se desi” (bug, pala baza).

```csharp
// Rezultat umesto izuzetka za očekivanu grešku
public record LendResult(Loan? Loan, string? ErrorCode)
{
    public bool Succeeded => Loan is not null;
}
```

### Memorija: GC i IDisposable

**Garbage Collector** sam oslobađa objekte na hipu do kojih ne vodi nijedna živa referenca. Deli ih po **generacijama** (0, 1, 2): većina objekata umre mlada, pa se generacija 0 čisti često i brzo; ko preživi ide u 1, pa u 2. Objekti od 85.000 bajtova i više idu na Large Object Heap, koji se čisti ređe.

GC ne zna za **neupravljane resurse** (konekcije na bazu, fajlove, sokete). Njih oslobađa `Dispose()`, a `using` garantuje da se pozove i kad padne izuzetak (prevodi se u `try/finally`):

```csharp
using var fajl = File.OpenRead("knjige.csv");                          // Dispose na kraju opsega
await using var tx = await db.Database.BeginTransactionAsync(ct);       // asinhrono oslobađanje
```

### Sinhrono i asinhrono

Rad sa bazom i mrežom je uglavnom **čekanje** (I/O). Sinhroni kod drži nit zauzetom dok čeka. Asinhroni kod nit vraća u **thread pool** dok traje čekanje, pa ista nit opslužuje druge zahteve. Server sa malo niti tako opslužuje mnogo istovremenih korisnika. Async ne ubrzava jedan zahtev; povećava propusnost.

```csharp
public async Task<Book?> FindAsync(Guid id, CancellationToken ct)
{
    return await db.Books.SingleOrDefaultAsync(b => b.Id == id, ct);
}

var book = await FindAsync(id, ct);                                  // čeka bez blokiranja
await Task.WhenAll(PosaljiEmail(a, ct), PosaljiEmail(b, ct));        // oba istovremeno: ~vreme najdužeg
```

- Kompajler od `async` metode pravi **state machine**: svaki `await` je tačka gde se metoda „pauzira” i kasnije nastavlja, možda na drugoj niti.
- `Task` / `Task<T>` predstavlja posao koji će se završiti (kao obećanje).
- **Nikad `.Result` ili `.Wait()` u web kodu:** blokira nit; u okruženjima sa `SynchronizationContext`-om (stari ASP.NET, desktop UI) pravi deadlock, a u ASP.NET Core-u pod opterećenjem iscrpljuje niti. „Async do kraja.”
- `CancellationToken`: kooperativno otkazivanje. Kad korisnik zatvori stranicu, token se otkaže i upit u bazi se prekine. Prosleđuje se kroz svaki poziv.
- `async void` samo za event handlere: izuzetak iz njega ruši proces, a pozivalac ne može da ga sačeka.

## Dublje

**Async nije paralelizam.** Za računanje (CPU) async ne pomaže, jer nema čekanja; tu se koristi paralelizam (`Parallel.ForEach`, više niti) ili red poslova van zahteva. `Task.Run` u kontroleru samo prebaci posao na drugu nit iz istog pool-a i ne ubrzava ništa (pogl. 45).

**`Task.WhenAll` i izuzeci.** Ako više zadataka padne, `await Task.WhenAll(...)` baci prvi izuzetak, a svi su u `task.Exception.InnerExceptions`. `WhenAll` nad istim `DbContext`-om ne sme: DbContext ne podržava dve istovremene operacije (pogl. 45).

**`ValueTask`** izbegava alokaciju kad je rezultat često odmah poznat (keš); sme da se `await`-uje samo jednom. **`IAsyncEnumerable<T>`** sa `await foreach` čita veliki broj redova deo po deo, bez učitavanja svega u memoriju.

**Kad baciti izuzetak.** Na granici sistema (kontroler, poruka iz reda) jedan globalni handler pretvara neuhvaćene izuzetke u 500 bez detalja korisniku i sa detaljima u logu (pogl. 11). U domenu: izuzetak za narušeno pravilo koje pozivalac nije smeo da prekrši (programerska greška), rezultat za ono što korisnik legitimno može da pokuša.

## Lab

1. Napiši tri metode `Nivo1 → Nivo2 → Nivo3`, gde `Nivo3` baca `InvalidOperationException`; uhvati ga u `Nivo1` jednom sa `throw;`, a jednom sa `throw ex;`, i u oba slučaja ispiši `StackTrace`: u kom se vidi `Nivo3`?
2. Napiši `LendResult` i metodu `Lend(Book? book)` koja za nepostojeću knjigu vraća grešku `book.not_found` umesto izuzetka.
3. Napiši klasu koja implementira `IDisposable` i ispisuje „Dispose”; upotrebi je sa `using` i baci izuzetak unutar bloka: da li se Dispose ipak ispisao?
4. Napiši `Cekaj(int ms) => Task.Delay(ms)`; izmeri tri poziva redom (`await` jedan za drugim) i sa `Task.WhenAll`.
5. Napravi `CancellationTokenSource(100)` i prosledi token u `Task.Delay(5000, token)`; uhvati `OperationCanceledException`.
6. U malom ASP.NET Core endpointu primi `CancellationToken ct` kao parametar, prosledi ga u `Task.Delay(10000, ct)`, uhvati `OperationCanceledException`, zapiši upozorenje u log i ponovo baci (`throw;`); pozovi ga sa `curl --max-time 1` i proveri da se upozorenje pojavilo posle jedne sekunde.

**Gotovo je kad:** stack trace pokazuje razliku `throw;` i `throw ex;`, `WhenAll` traje koliko najduži poziv, a otkazivanje prekida čekanje bez rušenja programa.

## Pitanja sa intervjua

**P: Da li async/await pravi novu nit?**
Ne. await na I/O operaciji (baza, HTTP) oslobađa trenutnu nit dok operacija čeka, a nastavak se izvršava kad stigne rezultat, često na drugoj niti iz pool-a. Zato async povećava propusnost servera: niti ne stoje blokirane čekajući mrežu.

**P: Zašto je `async void` opasan?**
Pozivalac ne može da sačeka takvu metodu niti da uhvati njen izuzetak; neuhvaćen izuzetak ruši proces. async void je prihvatljiv samo za event handlere. Inače vraćaj Task.

**P: Zašto ne treba pozivati `.Result` ili `.Wait()` na Task-u?**
Blokira nit dok se Task ne završi. U okruženjima sa SynchronizationContext-om (stari ASP.NET, UI) to može da izazove deadlock, a u ASP.NET Core-u troši niti iz pool-a i obara propusnost. Koristi await do kraja („async all the way”).

**P: Kada izuzetak, a kada rezultat?**
Rezultat za očekivane poslovne greške (validacija, ne postoji, nema primeraka), jer su deo normalnog toka i vide se u potpisu metode. Izuzetak za ono što ne bi smelo da se desi (bug, pala baza, narušen ugovor).

**P: Čemu služi using?**
Garantuje da se Dispose pozove na kraju opsega, i kad padne izuzetak (prevodi se u try/finally). Tako se konekcija ili fajl oslobađaju odmah, a ne „nekad” kad GC dođe.

**P: Task ili Thread?**
Thread je nit operativnog sistema. Task je posao koji će se završiti i koji može, ali ne mora, da drži nit; I/O operacija dok čeka ne drži nijednu.

## Test

### 1. Šta se dešava sa niti dok `await db.SaveChangesAsync()` čeka bazu?
- [ ] Nit je blokirana dok baza ne odgovori
- [x] Nit se vraća u pool i može da obrađuje druge zahteve
- [ ] Pravi se nova nit samo za čekanje
- [ ] Proces se pauzira
> Dok traje I/O nema posla za procesor, pa se nit oslobađa. Kad baza odgovori, nastavak metode se zakazuje na nit iz pool-a.

### 2. Koja je razlika između `throw;` i `throw ex;` u catch bloku?
- [ ] Nema razlike
- [x] `throw;` čuva originalni stack trace, `throw ex;` ga resetuje
- [ ] `throw ex;` čuva stack trace, `throw;` ga briše
- [ ] `throw;` ne radi u catch bloku
> `throw ex;` izgleda kao da je izuzetak nastao u catch bloku, pa se gubi mesto gde je stvarno nastao. Za ponovno bacanje koristi `throw;`.

### 3. Šta garantuje `using var fajl = File.OpenRead(putanja);`?
- [ ] Fajl se zatvara kad ga GC pokupi
- [x] Dispose se poziva na kraju opsega, i kad se baci izuzetak
- [ ] Fajl se otvara samo za čitanje, ali se nikad ne zatvara
- [ ] Fajl se kešira u memoriji
> using prevodi u try/finally sa Dispose. Resurs (fajl, konekcija) se oslobađa odmah, ne „nekad” kad GC dođe.

### 4. Kako paralelno sačekati tri nezavisna HTTP poziva?
- [ ] Tri puta `await` jedan za drugim
- [x] Pokrenuti sva tri Task-a, pa `await Task.WhenAll(t1, t2, t3)`
- [ ] `Task.WaitAll` u async metodi
- [ ] Parallel.For sa tri iteracije
> WhenAll čeka sve istovremeno: ukupno trajanje je najduži poziv, ne zbir. WaitAll blokira nit, a Parallel.For je za CPU posao, ne za I/O.

### 5. Čemu služi CancellationToken u async metodi API-ja?
- [ ] Da ubrza izvršavanje upita
- [x] Da se posao prekine kad klijent odustane (npr. zatvori stranicu)
- [ ] Da spreči izuzetke
- [ ] Da zaključa resurs od drugih niti
> ASP.NET Core daje token koji se otkaže kad klijent prekine vezu. Prosleđen do EF-a i HttpClient-a, prekida posao koji više nikome ne treba.

## Izvori
- [Microsoft Learn: dobre prakse za izuzetke](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
- [Microsoft Learn: osnove GC-a](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
- [Microsoft Learn: Large Object Heap](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap)
- [Microsoft Learn: using i IDisposable](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/using-objects)
- [Microsoft Learn: asinhrono programiranje](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
- [Microsoft Learn: otkazivanje (CancellationToken)](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
- [Microsoft Learn: ASP.NET Core dobre prakse (bez blokiranja)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices)
=====
---
id: 8
subtitle: "host, Program.cs, Kestrel, konfiguracija, options, okruženja, logovanje, TimeProvider"
minutes: 50
---
# 8 ASP.NET Core

ASP.NET Core je .NET framework za web: API-je, sajtove i real-time. Aplikacija je obična konzolna aplikacija koja u sebi pokreće web server. Sve počinje u `Program.cs`, koji ima dva dela: **registraciju servisa** (šta postoji) i **pipeline** (kako se obrađuje svaki zahtev).

## Pojmovi

```csharp
var builder = WebApplication.CreateBuilder(args);   // konfiguracija, logovanje, DI kontejner

// 1. SERVISI (Dependency Injection, pogl. 9)
builder.Services.AddDbContext<LibraryDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<LoanService>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();                          // od ovde se servisi više ne dodaju

// 2. PIPELINE (middleware, pogl. 10): redosled je bitan
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapGet("/health", () => "OK");
app.Run();                                          // pokreće Kestrel i čeka zahteve
```

### Kestrel i hosting

**Kestrel** je ugrađeni, višeplatformski web server. Brz je, ali se u produkciji obično stavlja iza **reverse proxy-ja** (Nginx, Caddy, IIS, ingress u Kubernetesu) koji radi HTTPS, kompresiju i bezbednosna zaglavlja (pogl. 37). **Generic Host** oko aplikacije pokreće i pozadinske servise (`IHostedService`, `BackgroundService`) i uredno ih gasi.

### Konfiguracija

Podešavanja se slažu iz više izvora, a **kasniji izvor pobeđuje**:

| Redom | Izvor | Napomena |
|---|---|---|
| 1 | `appsettings.json` | osnova, u Gitu, bez tajni |
| 2 | `appsettings.{Environment}.json` | npr. `appsettings.Development.json` |
| 3 | user secrets | samo u Development, van foldera projekta |
| 4 | promenljive okruženja | `ConnectionStrings__Default=…`; `__` zamenjuje `:` |
| 5 | argumenti komandne linije | `--Library:MaxLoans=3` |

**Okruženje** se čita iz `ASPNETCORE_ENVIRONMENT` (ili `DOTNET_ENVIRONMENT`); bez nje je **Production**. U razvoju ga postavlja `launchSettings.json`. Razlike po okruženju: detaljne greške i OpenAPI dokument samo u razvoju, HSTS samo u produkciji.

### Options pattern

```csharp
// appsettings.json: { "Library": { "MaxLoans": 5, "LoanDays": 14 } }
public class LibraryOptions
{
    [Range(1, 20)] public int MaxLoans { get; set; }
    [Range(1, 60)] public int LoanDays { get; set; }
}

builder.Services.AddOptions<LibraryOptions>()
    .BindConfiguration("Library")
    .ValidateDataAnnotations()
    .ValidateOnStart();          // pogrešna vrednost obori aplikaciju PRI STARTU (fail fast)

public class LoanService(IOptions<LibraryOptions> options) { /* options.Value.MaxLoans */ }
```

`IOptions<T>` se pročita jednom (singleton), `IOptionsSnapshot<T>` jednom po zahtevu (scoped), `IOptionsMonitor<T>` prati izmene fajla uživo. Sa `MaxLoans: 0` aplikacija ne startuje: `OptionsValidationException: … 'MaxLoans' … must be between 1 and 20`. Bolje da padne pri deployu nego da radi pogrešno.

### Logovanje

```csharp
public class LoanService(ILogger<LoanService> logger)
{
    public void Lend(int memberId, int bookId) =>
        logger.LogInformation("Member {MemberId} borrowed {BookId}", memberId, bookId);
}
```

**Strukturisano logovanje:** vrednosti ostaju posebna polja (`MemberId`), pa alati filtriraju po njima; zato se ne piše `$"Member {memberId}"`. Nivoi: Trace, Debug, Information, Warning, Error, Critical; minimalni nivo po kategoriji se podešava u `Logging:LogLevel`.

### Sat kao zavisnost

Kod koji direktno čita `DateTimeOffset.UtcNow` ne može da se testira („šta ako je pozajmica istekla juče?”). Ubacuje se `TimeProvider`: `TimeProvider.System` u aplikaciji, lažni sat u testu (`FakeTimeProvider`):

```csharp
builder.Services.AddSingleton(TimeProvider.System);
public class LoanService(TimeProvider time, IOptions<LibraryOptions> o)
{
    public DateTimeOffset DueDate() => time.GetUtcNow().AddDays(o.Value.LoanDays);
}
```

## Dublje

**Zamka sa `.Date`.** `time.GetUtcNow().Date` vraća `DateTime` bez informacije o zoni; kad se on ponovo pretvori u `DateTimeOffset`, dobije pomak lokalne zone servera (npr. +01:00), pa „ponoć UTC” postane ponoć po Beogradu. Za datume računaj nad `DateTimeOffset` (`AddDays`) ili koristi `DateOnly` kad je bitan samo datum.

**`dotnet run` i launchSettings.json.** `dotnet run` primenjuje prvi profil iz `Properties/launchSettings.json`, a njegove promenljive (npr. `ASPNETCORE_ENVIRONMENT=Development`) gaze one postavljene u terminalu. Ko lokalno proverava ponašanje u Production okruženju, pokreće sa `--no-launch-profile` (ili `dotnet bin/.../App.dll`); inače misli da testira produkciju, a radi u razvoju.

**Graceful shutdown.** Na SIGTERM (Docker, Kubernetes) host prestaje da prima nove zahteve, čeka da se započeti završe i gasi `BackgroundService`-e preko `CancellationToken`-a. Vreme čekanja je `HostOptions.ShutdownTimeout`; pozadinski posao koji ignoriše token biće prekinut na pola.

**Konfiguracija bez restarta.** JSON izvori se podrazumevano učitavaju sa `reloadOnChange`, pa `IOptionsMonitor` vidi izmenu fajla. U kontejneru se konfiguracija obično menja novim deployom (promenljive okruženja), pa je predvidljivije da se vrednosti čitaju jednom.

**Gde ide konfiguracija, a gde tajne.** Ne-tajna podešavanja (limiti, adrese) u `appsettings.json`; tajne nikad u Git: lokalno user secrets, u produkciji promenljive okruženja ili sef (Key Vault, region C1), koji je samo još jedan izvor u istom nizu.

## Lab

1. Napravi `dotnet new web -n Biblioteka` i dodaj u `appsettings.json` sekciju `Library` sa `MaxLoans` i `LoanDays`.
2. Napravi `LibraryOptions` sa `[Range]` atributima i registruj ih sa `BindConfiguration`, `ValidateDataAnnotations` i `ValidateOnStart`; endpoint `GET /limit` neka vraća `IOptions<LibraryOptions>.Value`.
3. Postavi `MaxLoans` na 0 i pokreni aplikaciju: zapiši poruku `OptionsValidationException`. Vrati vrednost.
4. Pokreni sa promenljivom okruženja `Library__MaxLoans=3` i proveri da `/limit` vraća 3; zatim isto sa argumentom `--Library:MaxLoans=2`.
5. Dodaj `TimeProvider.System` i servis koji računa rok vraćanja; endpoint `GET /rok` neka vrati datum.
6. Postavi `Logging:LogLevel` tako da se tvoja kategorija loguje na Information, a ostalo na Warning, i dodaj strukturisan log u servis.

**Gotovo je kad:** pogrešna konfiguracija obori aplikaciju pri startu, promenljiva okruženja pobeđuje JSON, a rok vraćanja dolazi iz `TimeProvider`-a.

## Pitanja sa intervjua

**P: Kojim redom ASP.NET Core čita konfiguraciju?**
Podrazumevano: appsettings.json, pa appsettings.{Environment}.json, pa user secrets (u Development), pa promenljive okruženja, pa argumenti komandne linije. Kasniji izvor pregazi raniji. Zato u Dockeru vrednosti postavljaš promenljivim okruženja, bez menjanja fajlova.

**P: Šta je Kestrel?**
Kestrel je ugrađen, višeplatformski web server u ASP.NET Core-u. Može da radi direktno na internetu, ali se u produkciji često stavlja iza reverse proxy-ja (nginx, IIS, Caddy) koji radi HTTPS, kompresiju i statičke fajlove.

**P: Kada biraš minimal API, a kada kontrolere?**
Minimal API je manje ceremonije i brži start, dobar za male i srednje servise. Kontroleri daju strukturu, filtere i konvencije koje veliki timovi poznaju. Oba koriste isti pipeline, DI i model binding; nije pitanje performansi nego organizacije koda.

**P: Kako čuvaš tajne?**
Nikad u Gitu: lokalno user secrets, u produkciji promenljive okruženja ili sef tajni (Key Vault), uz Managed Identity da ni pristup sefu ne traži lozinku.

**P: Šta je options pattern i zašto ValidateOnStart?**
Sekcija konfiguracije se veže za klasu koja se ubacuje kroz DI (`IOptions<T>`), umesto čitanja stringova po kodu. `ValidateOnStart` proverava vrednosti pri pokretanju, pa pogrešna konfiguracija zaustavi deploy umesto da aplikacija radi pogrešno.

**P: Zašto TimeProvider umesto DateTime.UtcNow?**
Sat postaje zavisnost koja se u testu zameni lažnim (`FakeTimeProvider`), pa se proverava „istekla pozajmica” bez čekanja i bez zavisnosti od trenutka pokretanja testa.

## Test

### 1. U appsettings.json je `"Db": "lokalna"`, a promenljiva okruženja je `ConnectionStrings__Db=produkcija`. Šta aplikacija dobija?
- [ ] lokalna
- [x] produkcija
- [ ] Baca izuzetak zbog duplikata
- [ ] Zavisi od operativnog sistema
> Promenljive okruženja se čitaju posle JSON fajlova i pregaze ih. Dvostruka donja crta `__` zamenjuje `:` u ključu.

### 2. Kako aplikacija zna da je u Development okruženju?
- [ ] Po imenu računara
- [x] Iz promenljive `ASPNETCORE_ENVIRONMENT` (ili `DOTNET_ENVIRONMENT`)
- [ ] Po tome da li je pokrenuta iz Visual Studio-a
- [ ] Development je uvek podrazumevan
> Bez te promenljive okruženje je Production. U razvoju je obično postavlja launchSettings.json.

### 3. Šta radi `builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));`?
- [ ] Šalje test mejl
- [x] Vezuje sekciju konfiguracije za klasu, pa se ona ubacuje kao IOptions<SmtpOptions>
- [ ] Upisuje podešavanja u appsettings.json
- [ ] Registruje SMTP server kao middleware
> To je options pattern: umesto čitanja stringova po kodu, dobiješ tipiziranu klasu kroz DI.

### 4. Šta je tačno za Kestrel?
- [ ] Radi samo na Windowsu
- [x] To je ugrađeni web server koji pokreće ASP.NET Core aplikaciju
- [ ] To je biblioteka za rad sa bazom
- [ ] Zamenjuje potrebu za DI kontejnerom
> Kestrel prima HTTP zahteve i predaje ih pipeline-u aplikacije. Radi na Windowsu, Linuxu i macOS-u.

### 5. Gde u lokalnom razvoju čuvaš lozinku za bazu da ne završi u Git-u?
- [ ] U appsettings.json
- [ ] U komentaru u Program.cs
- [x] U user secrets (`dotnet user-secrets`) ili u `.env` fajlu koji je u .gitignore
- [ ] U imenu grane
> User secrets se čuvaju van foldera projekta i čitaju se samo u Development okruženju. U produkciji idu promenljive okruženja ili sef tajni (Key Vault).

## Izvori
- [Microsoft Learn: osnove ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/)
- [Microsoft Learn: konfiguracija](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/)
- [Microsoft Learn: options pattern i ValidateOnStart](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options)
- [Microsoft Learn: okruženja](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments)
- [Microsoft Learn: Kestrel](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel)
- [Microsoft Learn: TimeProvider](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview)
=====
---
id: 9
subtitle: "registracija, Singleton/Scoped/Transient, captive dependency, keyed servisi, HttpClientFactory"
minutes: 45
---
# 9 Dependency Injection

Klasa ne pravi svoje zavisnosti (`new EmailNotifier()`), nego ih **traži u konstruktoru**, a **DI kontejner** ih pravi i ubacuje. Klasa tako zavisi od ugovora (interfejsa), a ne od konkretne implementacije, pa joj se u testu lako da lažna, a životni vek i oslobađanje resursa su na jednom mestu.

## Pojmovi

```csharp
// BEZ DI: čvrsto vezano, test bi slao prave emailove
public class LoanService { private readonly EmailNotifier _n = new("smtp…"); }

// SA DI: zavisi od ugovora
public class LoanService(INotifier notifier, LibraryDb db) { }

// Registracija: "kad neko traži X, daj mu Y"
builder.Services.AddScoped<INotifier, EmailNotifier>();
builder.Services.AddScoped<LoanService>();
builder.Services.AddSingleton(TimeProvider.System);
```

### Životni vek

| Vek | Instanca | Tipično |
|---|---|---|
| Singleton | jedna za celu aplikaciju | `TimeProvider`, keš, podešavanja, `IHttpClientFactory` |
| Scoped | jedna po scope-u; ASP.NET Core pravi scope za svaki HTTP zahtev | `DbContext`, servisi koji ga koriste |
| Transient | nova svaki put kad se zatraži | lagani servisi bez stanja |

`DbContext` mora biti scoped: nije thread-safe i prati izmene jednog posla. Dva istovremena zahteva nikad ne dele isti `DbContext`.

### Captive dependency

Singleton ne sme da zavisi od scoped servisa: živi zauvek, pa bi zadržao prvi `DbContext` i delio ga između svih zahteva. U Development okruženju ASP.NET Core proverava scope-ove i aplikacija pri prvoj upotrebi javi: `Cannot consume scoped service 'LoanService' from singleton 'Zarobljivac'`. Kad singletonu (npr. pozadinskom servisu) ipak treba scoped servis, pravi svoj kratak scope:

```csharp
public class ReminderWorker(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LibraryDb>();   // svež DbContext za ovaj krug
        // ...
    }
}
```

### Više implementacija

Ako je isti interfejs registrovan dvaput, `INotifier` u konstruktoru dobija **poslednju** registraciju, a `IEnumerable<INotifier>` **sve**, redom registracije (osnova Strategy obrasca, P2). Od .NET 8 postoje i **keyed servisi**: `AddKeyedScoped<INotifier, SmsNotifier>("sms")`, pa `[FromKeyedServices("sms")] INotifier n`.

### IHttpClientFactory

`new HttpClient()` za svaki poziv iscrpi sokete (socket exhaustion), a jedan statički `HttpClient` zauvek ne vidi promene DNS-a. `AddHttpClient` rešava oba: konekcije se ponovo koriste i povremeno obnavljaju, podešavanja su na jednom mestu, a u testu se podmetne lažni handler.

```csharp
builder.Services.AddHttpClient<CatalogClient>(c =>
{
    c.BaseAddress = new Uri("https://katalog.example/");
    c.Timeout = TimeSpan.FromSeconds(20);
});
```

## Dublje

**Validacija pri izgradnji.** U Development okruženju host uključuje `ValidateScopes` (otkriva captive dependency) i `ValidateOnBuild` (proverava da se svaki registrovani servis može napraviti, pa nedostajuća registracija pukne pri startu, a ne pri prvom zahtevu). U produkciji su isključene zbog brzine starta, zato greške treba da ispliva u razvoju i testovima.

**Dispose je posao kontejnera.** Kontejner poziva `Dispose` na servisima koje je on napravio, na kraju njihovog scope-a (scoped i transient na kraju zahteva, singleton pri gašenju). Objekat koji si sam napravio i predao (`AddSingleton(new X())`) kontejner ne oslobađa. Transient `IDisposable` napravljen iz korenskog providera živi do gašenja aplikacije, što je česta neprimetna „curenje memorije” zamka.

**Konstruktor kao spisak zavisnosti.** Klasa sa deset parametara u konstruktoru je signal da radi previše (SRP, pogl. 13), a ne razlog za service locator (`provider.GetService` usred koda), koji sakriva zavisnosti i otežava testiranje.

**Typed client i otpornost.** `AddHttpClient<CatalogClient>()` uz `AddStandardResilienceHandler()` (paket `Microsoft.Extensions.Http.Resilience`) dodaje retry, timeout i circuit breaker oko svakog poziva (pogl. 16), bez koda u samom klijentu.

## Lab

1. Napravi `INotifier` sa `ConsoleNotifier` i `FakeNotifier`, i `LoanService` koji ga dobija kroz konstruktor; registruj `ConsoleNotifier` i pozovi servis iz endpointa.
2. Napravi servis koji u konstruktoru ispisuje `Guid.NewGuid()`; registruj ga redom kao Transient, Scoped i Singleton, pozovi ga dvaput u istom zahtevu i u dva zahteva, i zapiši koliko instanci nastaje.
3. Namerno napravi captive dependency (singleton koji traži scoped servis), pokreni u Development i zapiši poruku; popravi preko `IServiceScopeFactory`.
4. Registruj dve implementacije `INotifier` i u jednom servisu traži `IEnumerable<INotifier>`, u drugom `INotifier`; zapiši šta svaki dobija.
5. Napravi typed `HttpClient` sa `BaseAddress` i timeout-om i pozovi njime javni API (npr. `https://httpbin.org/get`).

**Gotovo je kad:** tabela iz koraka 2 pokazuje tri različita ponašanja, captive dependency je otkriven pri startu i ispravljen, a nijedna klasa ne pravi svoje zavisnosti sa `new`.

## Pitanja sa intervjua

**P: Objasni tri životna veka servisa u ASP.NET Core DI-ju.**
Transient: nova instanca svaki put kad se zatraži. Scoped: jedna instanca po scope-u, a ASP.NET Core pravi scope za svaki HTTP zahtev. Singleton: jedna instanca za ceo život aplikacije. DbContext je Scoped, HttpClient fabrika Singleton.

**P: Šta je captive dependency?**
Kada servis dužeg veka drži servis kraćeg veka, npr. Singleton u konstruktoru primi Scoped DbContext. Scoped objekat tada živi koliko i Singleton i deli se između zahteva i niti. U Development okruženju validacija scope-ova to otkriva pri pokretanju.

**P: Zašto je DI koristan, a ne samo „još jedan sloj”?**
Klasa traži zavisnosti kroz konstruktor umesto da ih pravi, pa ne zna konkretnu implementaciju. Zato se u testu ubaci lažna implementacija, a konfiguracija (koja baza, koji provajder) je na jednom mestu.

**P: Zašto IHttpClientFactory, a ne new HttpClient()?**
Novi klijent za svaki poziv iscrpljuje sokete, a jedan statički klijent ne prati promene DNS-a. Fabrika ponovo koristi i povremeno obnavlja konekcije, drži podešavanja na jednom mestu i dozvoljava lažni handler u testu.

**P: Kako dobiješ jednu od više implementacija istog interfejsa?**
`IEnumerable<T>` pa izbor po svojstvu (Strategy), ili keyed servisi (.NET 8+) sa `[FromKeyedServices("ključ")]`.

## Test

### 1. Koji životni vek daje jednu instancu po HTTP zahtevu?
- [ ] Transient
- [x] Scoped
- [ ] Singleton
- [ ] Static
> ASP.NET Core pravi jedan scope po zahtevu, a Scoped servis živi koliko i scope.

### 2. Šta je problem ako Singleton u konstruktoru primi Scoped servis?
- [ ] Ništa, DI to sam reši
- [x] Scoped objekat postaje „zarobljen” i deli se između svih zahteva
- [ ] Singleton postaje Scoped
- [ ] Aplikacija radi sporije, ali ispravno
> To je captive dependency. Za DbContext je posebno opasno, jer nije thread-safe i prati promene jednog posla.

### 3. Kako Singleton (npr. pozadinski servis) bezbedno koristi DbContext?
- [ ] Primi DbContext u konstruktoru
- [ ] Napravi `new DbContext()` jednom i čuva ga
- [x] Kroz IServiceScopeFactory napravi scope, uzme DbContext, uradi posao i zatvori scope
- [ ] Registruje DbContext kao Singleton
> Kratak scope po jedinici posla daje svež DbContext i oslobađa ga posle. Tako radi i BackgroundService.

### 4. Šta dobiješ ako dva puta registruješ isti interfejs i u konstruktoru tražiš `IEnumerable<INotifier>`?
- [ ] Samo prvu registraciju
- [ ] Izuzetak pri pokretanju
- [x] Obe implementacije, redom registracije
- [ ] Samo poslednju registraciju
> Ako tražiš jedan INotifier, dobiješ poslednju registrovanu. Ako tražiš IEnumerable<INotifier>, dobiješ sve. Tako se prave „plugin” liste.

### 5. Zašto je DbContext registrovan kao Scoped?
- [ ] Zato što je skup za pravljenje
- [x] Nije thread-safe i prati promene za jednu jedinicu rada
- [ ] EF Core ne podržava Singleton
- [ ] Da konekcija ostane otvorena zauvek
> Change tracker prati učitane entitete jednog zahteva. Deljenje između zahteva bi mešalo promene i pravilo greške sa nitima.

## Izvori
- [Microsoft Learn: DI u ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)
- [Microsoft Learn: smernice za DI (dispose, root scope)](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
- [Microsoft Learn: IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
- [Microsoft Learn: otpornost HTTP klijenata](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
