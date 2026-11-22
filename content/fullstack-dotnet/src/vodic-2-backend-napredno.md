---
id: 10
---
## Pitanja sa intervjua

**P: Šta je middleware i zašto je redosled bitan?**
Middleware je komponenta u pipeline-u koja dobije zahtev, može nešto da uradi, pa pozove sledeću (`next`) ili sama vrati odgovor. Redosled registracije je redosled izvršavanja: npr. UseAuthentication mora pre UseAuthorization, a obrada izuzetaka na sam početak da bi uhvatila greške iz svega posle nje.

**P: Koja je razlika između middleware-a i filtera?**
Middleware radi za svaki zahtev, na nivou HTTP-a, i ne zna za akciju ili model. Filteri (action, exception, resource) rade samo oko MVC akcija ili endpointa i vide argumente akcije i rezultat. Za logovanje svih zahteva middleware, za validaciju modela jedne grupe akcija filter.

**P: Šta znači „short-circuit” u pipeline-u?**
Middleware vrati odgovor bez pozivanja `next`, pa ostatak pipeline-a ne radi. Tako radi npr. middleware za statičke fajlove kad nađe fajl, ili provera API ključa koja odmah vrati 401.

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
=====
---
id: 11
---
## Pitanja sa intervjua

**P: Zašto API vraća DTO, a ne entitet iz baze?**
Entitet je model baze: može da ima polja koja klijent ne sme da vidi (lozinka, interni status) ili cikluse koji ruše serijalizaciju. DTO je ugovor sa klijentom koji se menja nezavisno od baze. Na ulazu DTO sprečava overposting: klijent ne može da postavi polje koje nije u DTO-u (npr. `IsAdmin`).

**P: Kako radiš paginaciju u API-ju?**
Najjednostavnije offset/limit (`?page=2&pageSize=20`, u SQL-u OFFSET/FETCH) uz ukupan broj. Za velike i promenljive skupove bolja je keyset (cursor) paginacija: „daj 20 posle ID-ja 4580”, jer ne preskače redove i radi brzo i duboko u listi.

**P: Šta je ProblemDetails?**
Standardni JSON format greške (RFC 9457, ranije 7807): `type`, `title`, `status`, `detail`, a za validaciju i `errors`. ASP.NET Core ga koristi za greške modela i AddProblemDetails, pa klijent uvek dobija isti oblik greške.

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
=====
---
id: 12
---
## Pitanja sa intervjua

**P: Šta je N+1 problem i kako ga rešavaš u EF Core-u?**
Učitaš N porudžbina jednim upitom, pa u petlji za svaku pristupiš stavkama i lazy loading pošalje još N upita. Rešenje: Include (eager loading) ili projekcija sa Select koja odmah uzme potrebne podatke, pa ide jedan (ili nekoliko) upita.

**P: Čemu služi AsNoTracking?**
Upit bez praćenja promena: EF ne pravi snimke entiteta u change tracker-u, pa je brži i troši manje memorije. Koristiš ga za upite samo za čitanje (liste, izveštaji). Ako planiraš izmenu i SaveChanges, treba ti praćenje.

**P: Kako radiš sa migracijama u timu i produkciji?**
Migracija je fajl u repozitorijumu koji opisuje promenu šeme; pravi se sa `dotnet ef migrations add` i ide kroz code review. U produkciji se primenjuje kontrolisano: SQL skripta (`migrations script --idempotent`), korak u CI/CD-u ili MigrateAsync pri startu za jednostavne aplikacije.

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
