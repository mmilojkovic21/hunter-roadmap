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
---
## Pitanja sa intervjua

**P: Šta je CLR i šta radi JIT?**
CLR (Common Language Runtime) je izvršno okruženje .NET-a: učitava sklopove, upravlja memorijom (GC), izuzecima i bezbednošću tipova. C# kompajler pravi IL (međukod), a JIT ga pri izvršavanju prevodi u mašinske instrukcije za konkretan procesor.

**P: Koja je razlika između .NET SDK i .NET Runtime?**
SDK služi za razvoj: kompajler, `dotnet build`, `dotnet test`, šabloni. Runtime je samo ono što treba za pokretanje gotove aplikacije. Zato Docker build koristi SDK image, a finalni image samo runtime (`aspnet`).

**P: Kako radi Garbage Collector u .NET-u, ukratko?**
GC automatski oslobađa objekte na hipu do kojih više ne vodi nijedna referenca. Deli ih u generacije (0, 1, 2): većina objekata umre mlada, pa GC najčešće čisti samo generaciju 0, što je brzo. Veliki objekti (preko ~85 KB) idu na Large Object Heap.

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
> Parne verzije (6, 8, 10) su LTS sa tri godine podrške. Neparne (STS) imaju kraću podršku, pa se za produkciju obično bira LTS.

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
=====
---
id: 4
---
## Pitanja sa intervjua

**P: Koja je razlika između value i reference tipova?**
Promenljiva value tipa (int, struct, DateTime) sadrži samu vrednost; dodela pravi kopiju. Promenljiva reference tipa (class, string, niz) sadrži referencu na objekat na hipu; dodela kopira referencu, pa obe promenljive pokazuju na isti objekat.

**P: Zašto je string nepromenljiv (immutable) i šta to znači u praksi?**
Svaka „izmena” stringa pravi novi string. To ga čini bezbednim za deljenje između niti i za ključeve u rečniku. U praksi: spajanje stringova u velikoj petlji pravi mnogo smeća, pa se koristi StringBuilder ili string.Join.

**P: Zašto se za novac koristi decimal, a ne double?**
double je binarni razlomak i ne može tačno da zapiše 0.1, pa sabiranje cena daje greške zaokruživanja (0.1 + 0.2 != 0.3). decimal je decimalni tip sa 28-29 cifara preciznosti, napravljen za finansijske proračune.

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
=====
---
id: 5
---
## Pitanja sa intervjua

**P: Koja je razlika između apstraktne klase i interfejsa?**
Apstraktna klasa može imati stanje (polja), konstruktor i delimičnu implementaciju; klasa nasleđuje samo jednu. Interfejs je ugovor bez stanja; klasa implementira više njih. Interfejs koristiš za sposobnost („može da se sačuva”), apstraktnu klasu za zajedničku osnovu srodnih tipova.

**P: Objasni polimorfizam na primeru.**
Isti poziv radi različito zavisno od stvarnog tipa objekta. Npr. `IPaymentProvider.Charge()` se poziva isto, a izvršava se Stripe ili PayPal implementacija. Pozivalac ne zna i ne mora da zna koja je; zato je kod otvoren za nove implementacije.

**P: Šta znači „composition over inheritance”?**
Umesto da ponašanje dobijaš nasleđivanjem (duboke hijerarhije, krhke osnovne klase), sastavljaš ga od manjih objekata koje dobiješ kroz konstruktor. Kompozicija je fleksibilnija i lakše se testira, jer se delovi zamenjuju.

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
=====
---
id: 6
---
## Pitanja sa intervjua

**P: Šta je odloženo izvršavanje (deferred execution) u LINQ-u?**
Upit poput `lista.Where(x => x.Aktivan)` se ne izvršava kad ga napišeš, već kad ga prođeš (foreach, ToList, Count). Ako ga prođeš dvaput, izvršava se dvaput; ako se izvor u međuvremenu promeni, vidi se nova vrednost. ToList „zamrzava” rezultat.

**P: Koja je razlika između IEnumerable<T> i IQueryable<T> kod EF Core-a?**
IQueryable gradi stablo izraza koje EF prevodi u SQL, pa se filter izvršava u bazi. Kad pređeš na IEnumerable (npr. posle AsEnumerable ili ToList), ostatak se izvršava u memoriji nad svim učitanim redovima.

**P: Kada koristiš Dictionary, a kada List?**
List za redosled i prolazak kroz sve elemente; pretraga po vrednosti je O(n). Dictionary za brzu pretragu po ključu, prosečno O(1). Ako u petlji tražiš elemente po ID-ju, napravi Dictionary jednom pre petlje.

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
=====
---
id: 7
---
## Pitanja sa intervjua

**P: Da li async/await pravi novu nit?**
Ne. await na I/O operaciji (baza, HTTP) oslobađa trenutnu nit dok operacija čeka, a nastavak se izvršava kad stigne rezultat, često na drugoj niti iz pool-a. Zato async povećava propusnost servera: niti ne stoje blokirane čekajući mrežu.

**P: Zašto je `async void` opasan?**
Pozivalac ne može da sačeka takvu metodu niti da uhvati njen izuzetak; neuhvaćen izuzetak ruši proces. async void je prihvatljiv samo za event handlere. Inače vraćaj Task.

**P: Zašto ne treba pozivati `.Result` ili `.Wait()` na Task-u?**
Blokira nit dok se Task ne završi. U okruženjima sa SynchronizationContext-om (stari ASP.NET, UI) to može da izazove deadlock, a u ASP.NET Core-u troši niti iz pool-a i obara propusnost. Koristi await do kraja („async all the way”).

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
=====
---
id: 8
---
## Pitanja sa intervjua

**P: Kojim redom ASP.NET Core čita konfiguraciju?**
Podrazumevano: appsettings.json, pa appsettings.{Environment}.json, pa user secrets (u Development), pa promenljive okruženja, pa argumenti komandne linije. Kasniji izvor pregazi raniji. Zato u Dockeru vrednosti postavljaš kroz promenljive okruženja (npr. `ConnectionStrings__Db`).

**P: Šta je Kestrel?**
Kestrel je ugrađen, višeplatformski web server u ASP.NET Core-u. Može da radi direktno na internetu, ali se u produkciji često stavlja iza reverse proxy-ja (nginx, IIS, Caddy) koji radi HTTPS, kompresiju i statičke fajlove.

**P: Kada biraš minimal API, a kada kontrolere?**
Minimal API je manje ceremonije i brži start, dobar za male i srednje servise. Kontroleri daju strukturu, filtere i konvencije koje veliki timovi poznaju. Oba koriste isti pipeline, DI i model binding; nije pitanje performansi nego organizacije koda.

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
=====
---
id: 9
---
## Pitanja sa intervjua

**P: Objasni tri životna veka servisa u ASP.NET Core DI-ju.**
Transient: nova instanca svaki put kad se zatraži. Scoped: jedna instanca po scope-u, a ASP.NET Core pravi scope za svaki HTTP zahtev. Singleton: jedna instanca za ceo život aplikacije. DbContext je Scoped, HttpClient fabrika i keš su obično Singleton.

**P: Šta je captive dependency?**
Kada servis dužeg veka drži servis kraćeg veka, npr. Singleton u konstruktoru primi Scoped DbContext. Scoped objekat tada živi koliko i Singleton i deli se između zahteva i niti. U Development okruženju validacija scope-a baca izuzetak. Rešenje: IServiceScopeFactory i kratak scope po poslu.

**P: Zašto je DI koristan, a ne samo „još jedan sloj”?**
Klasa traži zavisnosti kroz konstruktor umesto da ih pravi, pa ne zna konkretnu implementaciju. Zato se u testu ubaci lažna implementacija, a konfiguracija (koja baza, koji provajder) je na jednom mestu.

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
