---
id: 42
---
## Pitanja sa intervjua

**P: Provedi me kroz jednu prodaju, od klika do baze i nazad.**
React forma pošalje POST /api/prodaje (fetch kroz TanStack mutaciju). nginx prosledi zahtev API-ju; middleware odradi izuzetke, autentifikaciju i autorizaciju; model binding i validacija provere DTO. Servis u jednoj transakciji umanji zalihu atomičnim UPDATE-om sa uslovom i upiše prodaju; commit. API vrati 201, a frontend invalidira upite za zalihe i listu prodaja, pa se ekran osveži.

**P: Kako sprečiš duplu prodaju kad korisnik dvaput klikne „Prodaj”?**
Na frontendu onemogućiš dugme dok zahtev traje. Na serveru, što je pravo rešenje, klijent šalje idempotency key (npr. GUID po pokušaju), a server ga upisuje sa jedinstvenim indeksom: drugi zahtev sa istim ključem vraća isti rezultat umesto nove prodaje.

**P: Gde stavljaš poslovno pravilo „zaliha ne sme ispod nule”?**
U backend: u domenskoj logici i, kao poslednja odbrana, u bazi (CHECK ograničenje ili UPDATE sa uslovom `Kolicina >= @kolicina`). Frontend može da upozori unapred, ali pravilo se sprovodi na serveru.

## Test

### 1. Gde je pravo mesto za transakciju koja umanjuje zalihu i upisuje prodaju?
- [ ] U React komponenti
- [ ] U nginx-u
- [x] U servisu na backendu, oko oba upisa u bazu
- [ ] U dva odvojena HTTP zahteva
> Oba upisa moraju uspeti zajedno. Transakcija pripada sloju koji radi sa bazom, a ne klijentu.

### 2. Kako atomično umanjiti zalihu bez trke dva zahteva?
- [ ] Pročitati količinu, proveriti u C#-u, pa upisati novu
- [x] Jedan UPDATE sa uslovom: `SET Kolicina = Kolicina - @k WHERE Id = @id AND Kolicina >= @k`, pa proveriti broj izmenjenih redova
- [ ] Zaključati celu tabelu na minut
- [ ] Proveru prepustiti frontendu
> Provera i izmena su jedna naredba u bazi, pa između njih niko ne može da uleti. 0 izmenjenih redova znači da zalihe nema.

### 3. Šta API vraća kad zaliha nije dovoljna?
- [ ] 500
- [ ] 200 sa `success: false`
- [x] 409 Conflict (ili 422) sa jasnom porukom
- [ ] 404
> Zahtev je ispravan, ali ga trenutno stanje ne dozvoljava. 500 je za neočekivane greške servera.

### 4. Kako ekran zaliha zna da se posle prodaje osveži?
- [ ] Server šalje e-mail
- [x] U onSuccess mutacije frontend invalidira upite za zalihe i prodaje
- [ ] Korisnik mora ručno da osveži stranicu
- [ ] Pregledač to radi sam
> Invalidacija ponovo učita podatke koji su sada zastareli.

### 5. Šta je najpouzdanija zaštita od duple prodaje pri ponovljenom zahtevu?
- [ ] Onemogućeno dugme na frontendu
- [x] Idempotency key koji server pamti uz jedinstven indeks
- [ ] Duži timeout
- [ ] Captcha
> Onemogućeno dugme pomaže, ali ponovni pokušaj mreže ili drugi tab ga zaobiđu. Server mora da prepozna isti zahtev.
=====
---
id: 43
---
## Pitanja sa intervjua

**P: „Ispričaj mi o projektu na kome si radio.”**
Za oko dva minuta: problem i za koga (kontekst), šta si TI uradio (arhitektura, ključne odluke), jedna konkretna teškoća i kako si je rešio, i rezultat, sa brojem ako ga imaš. Završi time šta bi danas uradio drugačije. Pripremi da ideš u dubinu na svaku odluku.

**P: Šta je STAR metoda?**
Struktura odgovora na bihejvioralna pitanja: Situation (kontekst), Task (tvoj zadatak), Action (šta si konkretno uradio), Result (ishod i šta si naučio). Najviše vremena ide na Action, i to u prvom licu.

**P: Kako odgovaraš na „Šta bi uradio drugačije?”**
Iskreno i konkretno, uz razlog: npr. „ranije bih uveo integracione testove, jer sam bug sa transakcijama otkrio tek ručno”. To pokazuje da razmišljaš o sopstvenim odlukama, što se ceni više od tvrdnje da je sve bilo savršeno.

## Test

### 1. Na šta ide najviše vremena u STAR odgovoru?
- [ ] Situation
- [ ] Task
- [x] Action
- [ ] Result
> Ispitivač želi da čuje šta si TI uradio i kako si razmišljao. Kontekst treba da bude kratak.

### 2. Koji opis doprinosa je najjači?
- [ ] „Mi smo napravili ceo sistem.”
- [x] „Ja sam uveo optimističku konkurentnost na zalihama, jer su se dešavale duple prodaje; posle toga ih više nije bilo.”
- [ ] „Radio sam na backendu.”
- [ ] „Koristio sam mnogo tehnologija.”
> Konkretno, prvo lice, problem, odluka i rezultat. „Mi” sakriva tvoj doprinos.

### 3. Koliko traje dobar prvi odgovor na „ispričaj o projektu”?
- [ ] 15 sekundi
- [x] Oko dva minuta, pa detalji na pitanja
- [ ] 15 minuta bez prekida
- [ ] Koliko god treba da se kaže sve
> Kratak pregled ostavlja prostor ispitivaču da bira šta ga zanima. Monolog gubi pažnju.

### 4. Kako odgovaraš na pitanje o odluci koju ne bi ponovio?
- [ ] Kažeš da nema takve odluke
- [x] Iskreno navedeš odluku, zašto je bila pogrešna i šta bi danas uradio
- [ ] Okriviš kolegu
- [ ] Promeniš temu
> Refleksija je znak seniornosti. Niko ne veruje da je projekat bez grešaka.

### 5. Šta treba da pripremiš za svaku tehnologiju koju navedeš u CV-ju?
- [ ] Ništa, dovoljno je navesti
- [x] Primer gde si je koristio i zašto baš nju
- [ ] Datum izlaska prve verzije
- [ ] Spisak svih njenih funkcija
> Svaka stavka iz CV-ja je pozivnica za pitanje. Bolje je manje stavki koje umeš da braniš.
=====
---
id: 44
---
## Pitanja sa intervjua

**P: Kako bi skalirao API koji ne stiže da obradi saobraćaj?**
Prvo meri gde je usko grlo (CPU, baza, spoljni servis). Ako je API, učini ga stateless (sesije i keš van procesa, npr. Redis) i pokreni više instanci iza load balancer-a. Ako je baza: indeksi, keširanje čitanja, read replike, a teške poslove izmesti u red (queue) i pozadinske radnike.

**P: Šta je cache-aside i koji je glavni problem keširanja?**
Aplikacija prvo pita keš; ako nema, čita iz baze i upiše u keš sa rokom (TTL). Glavni problem je invalidacija: posle izmene podataka keš mora da se obriše ili ističe, inače korisnici vide zastarele podatke. Zato se kešira ono što se retko menja ili gde je kratka zastarelost prihvatljiva.

**P: Zašto i kada uvodiš red poruka (queue)?**
Kad posao ne mora da se završi tokom zahteva (e-mail, izveštaj, obrada slike), ili da se izgladi nagli talas zahteva. API upiše poruku i odmah odgovori, a radnici obrađuju svojim tempom. Cena: obrada je asinhrona, poruke mogu stići više puta, pa treba idempotentnost.

## Test

### 1. Šta je uslov da API može da se skalira horizontalno (više instanci)?
- [ ] Da ima više jezgara
- [x] Da instance ne čuvaju stanje korisnika u svojoj memoriji (stateless)
- [ ] Da koristi gRPC
- [ ] Da baza bude na istom serveru
> Ako je sesija u memoriji jedne instance, sledeći zahtev na drugoj je ne vidi. Stanje ide u bazu ili distribuirani keš.

### 2. Šta je glavni rizik keširanja?
- [ ] Previše slobodne memorije
- [x] Zastareli podaci kad se izvor promeni a keš ne
- [ ] Sporiji odgovori
- [ ] Gubitak podataka u bazi
> Keš je kopija. Bez dobre invalidacije ili TTL-a korisnik vidi staro stanje.

### 3. Čemu služe read replike baze?
- [ ] Za backup umesto snimaka
- [x] Da prime upite za čitanje i rasterete glavnu bazu koja prima upise
- [ ] Da ubrzaju upise
- [ ] Da zamene indekse
> Upisi idu na primarnu, čitanja mogu na replike. Replike kasne malo za primarnom, pa čitanje odmah posle upisa ide na primarnu.

### 4. Korisnik zatraži izveštaj koji se pravi 2 minuta. Kako to dizajniraš?
- [ ] HTTP zahtev koji čeka 2 minuta
- [x] API upiše posao u red i vrati 202 sa ID-jem; radnik pravi izveštaj, a klijent proverava status ili dobije obaveštenje
- [ ] Povećati timeout na 10 minuta
- [ ] Praviti izveštaj u pregledaču
> Dugi poslovi ne drže HTTP vezu. 202 Accepted kaže „primljeno, radi se”.

### 5. Šta je rate limiting?
- [ ] Kompresija odgovora
- [x] Ograničenje broja zahteva po klijentu u vremenu, da jedan klijent ne obori servis
- [ ] Keširanje u CDN-u
- [ ] Sortiranje zahteva po prioritetu
> ASP.NET Core ima ugrađen RateLimiter middleware. Odgovor na prekoračenje je 429 Too Many Requests.
=====
---
id: 45
---
## Pitanja sa intervjua

**P: Zašto je opasno dvaput proći isti IEnumerable?**
Ako je IEnumerable LINQ upit ili `yield` metoda, svaki prolaz ga ponovo izvršava: dva SQL upita, dva čitanja fajla, a rezultati mogu da se razlikuju. Ako ti treba više prolaza, materijalizuj jednom sa ToList().

**P: DateTime.Now ili DateTime.UtcNow?**
Za čuvanje i poređenje vremena UTC (ili DateTimeOffset), jer lokalno vreme zavisi od servera i ima letnje računanje vremena (sat se ponavlja ili preskače). Lokalno vreme samo za prikaz korisniku. Za testabilnost se koristi TimeProvider.

**P: Šta se dešava kad struct staviš u List i pokušaš da mu promeniš polje?**
Indekser vraća KOPIJU struct-a, pa `lista[0].X = 5` ne prolazi kompajliranje (CS1612), jer bi menjao privremenu kopiju. Struct-ovi treba da budu nepromenljivi (readonly struct), a izmena se radi zamenom cele vrednosti.

## Test

### 1. Šta ispisuje kod?
```csharp
var akcije = new List<Action>();
for (int i = 0; i < 3; i++)
    akcije.Add(() => Console.Write(i));
foreach (var a in akcije) a();
```
- [ ] 012
- [x] 333
- [ ] 222
- [ ] Greška pri kompajliranju
> U `for` petlji sve lambde hvataju istu promenljivu i, koja je posle petlje 3. (U `foreach` od C# 5 svaka iteracija ima svoju promenljivu, pa bi bilo 012.)

### 2. Koliko SQL upita šalje ovaj kod?
```csharp
IEnumerable<Kupac> kupci = db.Kupci.Where(k => k.Aktivan);
var broj = kupci.Count();
var prvi = kupci.First();
```
- [ ] 1
- [x] 2
- [ ] 0
- [ ] 3
> Svaki prolaz izvršava upit ponovo: jedan za Count, jedan za First. ToList bi dao jedan upit (ali učitao sve redove), pa biraj prema potrebi.

### 3. Šta ispisuje kod?
```csharp
object a = "hunter";
object b = new string("hunter".ToCharArray());
Console.WriteLine(a == b);
```
- [ ] True
- [x] False
- [ ] Greška pri kompajliranju
- [ ] NullReferenceException
> Promenljive su tipa object, pa `==` poredi reference, a to su dva različita objekta. `a.Equals(b)` ili poređenje kao string bi dalo True.

### 4. Zašto se `lista[0].X = 5;` ne kompajlira kad je `lista` tipa `List<Tacka>`, a Tacka je struct?
- [ ] List ne podržava struct
- [x] Indekser vraća kopiju struct-a, pa bi izmena bila izgubljena
- [ ] Polje X je private
- [ ] Mora se koristiti `ref` pri dodavanju
> Kompajler sprečava tihu grešku. Kod niza (`niz[0].X = 5`) radi, jer indeksiranje niza daje referencu na element.

### 5. Šta je pravi izbor za vreme kada je porudžbina napravljena, ako server može biti u drugoj vremenskoj zoni?
- [ ] DateTime.Now
- [x] DateTime.UtcNow ili DateTimeOffset
- [ ] string sa lokalnim vremenom
- [ ] Broj sekundi od ponoći
> UTC je nedvosmislen i ne skače pri prelasku na letnje vreme. Pretvaranje u lokalno vreme ide tek u prikazu.
=====
---
id: 46
---
## Pitanja sa intervjua

**P: Zašto `{broj && <Bedz />}` ponekad prikaže „0”?**
`&&` vraća levu vrednost ako je lažna. Za broj 0 izraz je 0, a React broj 0 prikazuje kao tekst. Ispravno: `{broj > 0 && <Bedz />}` ili ternarni operator.

**P: Zašto `setInterval(() => setBroj(broj + 1), 1000)` u efektu sa `[]` ostane na 1?**
Efekat se izvršio jednom i lambda je uhvatila `broj` iz prvog iscrtavanja (0). Svake sekunde postavlja 0 + 1. Rešenje je funkcijski oblik `setBroj(b => b + 1)`, uz cleanup `clearInterval`.

**P: Zašto je `0.1 + 0.2 !== 0.3` u JS-u?**
Brojevi su binarni IEEE 754 double, a 0.1 i 0.2 nemaju tačan binarni zapis, pa je zbir 0.30000000000000004. Za novac se računa u najmanjim jedinicama (pare kao celi brojevi) ili se koristi biblioteka za decimale.

## Test

### 1. Šta je rezultat `0.1 + 0.2 === 0.3` u JavaScript-u?
- [ ] true
- [x] false
- [ ] undefined
- [ ] Baca grešku
> Zbir je 0.30000000000000004. Isto važi za double u C#-u; zato decimal za novac.

### 2. Šta su `"5" + 1` i `"5" - 1`?
- [ ] 6 i 4
- [x] "51" i 4
- [ ] "51" i "4"
- [ ] 6 i "51"
> `+` sa stringom spaja tekst, a `-` postoji samo za brojeve, pa pretvara "5" u broj.

### 3. Šta vraća `typeof null`?
- [ ] "null"
- [x] "object"
- [ ] "undefined"
- [ ] Baca grešku
> Poznata istorijska greška jezika koja je ostala zbog kompatibilnosti. Za proveru null koristi `x === null`.

### 4. Šta prikazuje `{stavke.length && <Lista stavke={stavke} />}` kad je niz prazan?
- [ ] Ništa
- [x] 0
- [ ] Praznu listu
- [ ] false
> length je 0, `&&` vraća 0, a React ispiše broj. Ispravno: `stavke.length > 0 && ...`.

### 5. Brojač sa `useEffect(() => { const id = setInterval(() => setBroj(broj + 1), 1000); return () => clearInterval(id); }, [])` stane na 1. Kako ga popraviti?
- [ ] Dodati `broj` u niz zavisnosti i ništa drugo
- [x] Koristiti `setBroj(b => b + 1)`
- [ ] Ukloniti cleanup
- [ ] Koristiti setTimeout umesto setInterval
> Funkcijski oblik uvek dobija najnovije stanje, pa lambda ne zavisi od uhvaćene vrednosti. Dodavanje zavisnosti bi takođe radilo, ali bi interval pravio iznova svake sekunde.
=====
---
id: 47
---
## Pitanja sa intervjua

**P: Koja je razlika između WHERE i HAVING?**
WHERE filtrira redove pre grupisanja i ne može da koristi agregatne funkcije. HAVING filtrira grupe posle GROUP BY i radi nad agregatima: „kupci sa više od 5 porudžbina” je `GROUP BY KupacId HAVING COUNT(*) > 5`.

**P: Kako nalaziš poslednju porudžbinu svakog kupca?**
Window funkcijom: `ROW_NUMBER() OVER (PARTITION BY KupacId ORDER BY Datum DESC)` u podupitu ili CTE-u, pa uzmeš redove gde je broj 1. Radi u jednom prolazu i daje ceo red, ne samo datum.

**P: Zašto `WHERE Email = NULL` ne vraća ništa?**
NULL znači „nepoznato”, a poređenje sa nepoznatim daje nepoznato (ni true ni false), pa red ne prolazi. Za proveru se koristi `IS NULL` ili `IS NOT NULL`.

## Test

### 1. Kako dobiti kupce sa više od 5 porudžbina?
- [ ] `SELECT KupacId FROM Porudzbine WHERE COUNT(*) > 5 GROUP BY KupacId`
- [x] `SELECT KupacId FROM Porudzbine GROUP BY KupacId HAVING COUNT(*) > 5`
- [ ] `SELECT KupacId FROM Porudzbine ORDER BY COUNT(*) > 5`
- [ ] `SELECT DISTINCT KupacId FROM Porudzbine LIMIT 5`
> Agregat (COUNT) nad grupama ide u HAVING. WHERE se izvršava pre grupisanja.

### 2. Kolona Telefon ima 3 NULL vrednosti od 10 redova. Šta vraćaju `COUNT(*)` i `COUNT(Telefon)`?
- [ ] 10 i 10
- [x] 10 i 7
- [ ] 7 i 7
- [ ] 7 i 10
> COUNT(*) broji redove, COUNT(kolona) samo one gde kolona nije NULL.

### 3. Šta se desi sa ovim upitom?
```sql
SELECT k.Ime, p.Id
FROM Kupci k
LEFT JOIN Porudzbine p ON p.KupacId = k.Id
WHERE p.Status = 'Plaćena';
```
- [ ] Vraća sve kupce, i one bez porudžbina
- [x] Kupci bez porudžbina nestaju, jer je za njih p.Status NULL i WHERE ih izbaci (radi kao INNER JOIN)
- [ ] Baca grešku
- [ ] Vraća samo kupce bez porudžbina
> Uslov nad desnom tabelom treba staviti u ON (`... AND p.Status = 'Plaćena'`) ako želiš da zadržiš sve kupce.

### 4. Kako proveriti da kolona nema vrednost?
- [ ] `WHERE Email = NULL`
- [ ] `WHERE Email == NULL`
- [x] `WHERE Email IS NULL`
- [ ] `WHERE Email = ''`
> Poređenje sa NULL je uvek nepoznato. Prazan string i NULL su različite stvari.

### 5. Koja funkcija numeriše redove unutar svake grupe (npr. porudžbine svakog kupca po datumu)?
- [ ] GROUP BY sa COUNT
- [x] `ROW_NUMBER() OVER (PARTITION BY KupacId ORDER BY Datum DESC)`
- [ ] DISTINCT
- [ ] UNION
> Window funkcije računaju preko grupe redova bez spajanja redova u jedan, pa je lako izabrati „prvi u grupi”.
=====
---
id: 48
---
## Pitanja sa intervjua

**P: Šta odgovaraš kad ne znaš odgovor?**
Kažeš iskreno da ne znaš, pa pokažeš kako razmišljaš: šta znaš o srodnoj temi, kako bi pretpostavio odgovor i kako bi ga proverio (dokumentacija, mali eksperiment). Izmišljanje se brzo prepozna i ruši poverenje; razmišljanje naglas se ceni.

**P: Kako se ponašaš na live coding zadatku?**
Prvo ponoviš zadatak svojim rečima i pitaš za granične slučajeve. Kažeš plan pre kucanja, pa kreneš od jednostavnog rešenja koje radi i tek onda ga poboljšavaš. Razmišljaš naglas, testiraš na primeru i na kraju kažeš složenost i šta bi poboljšao.

**P: Koja pitanja postavljaš ispitivaču?**
Kako izgleda tipičan dan i proces (code review, deploy, dežurstva), kako tim donosi tehničke odluke, šta bi bio moj prvi zadatak, kako se meri uspeh u prvih 90 dana, kakav je mentorstvo i učenje. Pitanja pokazuju interes i pomažu tebi da proceniš posao.

## Test

### 1. Ispitivač pita nešto što ne znaš. Šta je najbolje?
- [ ] Smisliti uverljiv odgovor
- [x] Reći da ne znaš, pa naglas razmisliti kako bi došao do odgovora
- [ ] Preći na drugu temu
- [ ] Ćutati dok ne postavi drugo pitanje
> Ispitivač proverava i kako razmišljaš. Iskrenost plus rasuđivanje je jači signal od pogađanja.

### 2. Šta je prvi korak na live coding zadatku?
- [ ] Odmah kucati optimalno rešenje
- [x] Ponoviti zadatak i pitati za ulaze i granične slučajeve
- [ ] Tražiti rešenje na internetu
- [ ] Pitati koliko vremena ima
> Pogrešno shvaćen zadatak je najskuplja greška. Pitanja pokazuju i zrelost.

### 3. Zašto se razmišlja naglas tokom zadatka?
- [ ] Da prođe vreme
- [x] Ispitivač vidi tok misli i može da pomogne ako zastaneš
- [ ] Zbog snimanja
- [ ] Nije preporučljivo
> I nepotpuno rešenje sa jasnim rasuđivanjem može da prođe. Tiho kucanje ne pokazuje ništa dok ne završiš.

### 4. Koje pitanje je dobro postaviti na kraju intervjua?
- [ ] „Koliko slobodnih dana imam prve nedelje?”
- [x] „Kako izgleda proces od zadatka do produkcije u vašem timu?”
- [ ] „Da li sam prošao?”
- [ ] Nijedno, pitanja ostavljaju loš utisak
> Pitanje o procesu pokazuje interes za rad i daje ti informaciju da li ti posao odgovara.

### 5. Na live coding-u si napisao rešenje koje radi, ali je O(n²). Šta dalje?
- [ ] Ništa, radi
- [x] Reći složenost, predložiti bolje rešenje (npr. HashSet za O(n)) i proveriti primerom
- [ ] Obrisati i početi ispočetka u tišini
- [ ] Reći da optimizacija nije bitna
> Prvo ispravno, pa brzo. Svest o složenosti i ideja za poboljšanje su deo očekivanog odgovora.
=====
---
id: 49
---
## Pitanja sa intervjua

**P: Koja je razlika između latencije i propusnosti?**
Latencija je koliko traje jedan zahtev (npr. 120 ms). Propusnost je koliko zahteva sistem obradi u jedinici vremena (npr. 500 u sekundi). Keš smanjuje latenciju, više instanci povećava propusnost; nije isto i ne poboljšavaju se istim merama.

**P: Šta je tehnički dug?**
Kompromis koji ubrzava isporuku danas, a kasnije košta dodatnim radom (nedostatak testova, prečica u dizajnu, zastarela biblioteka). Nije uvek loš ako je svestan i zapisan; problem je kad se „kamata” gomila jer se nikad ne vraća.

**P: Šta je ORM i koja je njegova mana?**
Object-Relational Mapper (EF Core) mapira tabele na klase i LINQ na SQL, pa nema ručnog pisanja SQL-a za tipične operacije. Mana: lako je napisati neefikasan upit (N+1, učitavanje previše kolona) bez da vidiš SQL, pa treba gledati generisane upite.

## Test

### 1. Šta je idempotentna operacija?
- [ ] Ona koja je uvek brza
- [x] Ona čije ponavljanje ostavlja isto stanje kao jedno izvršavanje
- [ ] Ona koja ne menja bazu
- [ ] Ona koja se izvršava samo jednom
> PUT i DELETE su idempotentni; „povećaj za 1” nije. Bitno je za retry i poruke koje stižu više puta.

### 2. Keširanje odgovora sa 300 ms na 20 ms poboljšava pre svega:
- [x] Latenciju
- [ ] Propusnost baze podataka u upisu
- [ ] Bezbednost
- [ ] Veličinu bundle-a
> Kraće vreme jednog zahteva je latencija. Usput može da poveća i propusnost jer baza ima manje posla, ali direktan efekat je na latenciju.

### 3. Šta je race condition?
- [ ] Takmičenje u brzini kodiranja
- [x] Ishod zavisi od nepredvidivog redosleda istovremenih operacija nad istim podacima
- [ ] Spor mrežni zahtev
- [ ] Greška pri kompajliranju
> Npr. dva zahteva istovremeno prodaju poslednji komad. Rešava se atomičnim operacijama, zaključavanjem ili optimističkom konkurentnošću.

### 4. Šta je DTO?
- [ ] Tabela u bazi
- [x] Objekat za prenos podataka između slojeva ili preko mreže, bez poslovne logike
- [ ] Vrsta indeksa
- [ ] Test objekat
> DTO je ugovor (npr. API odgovor), odvojen od entiteta baze, da se oba mogu menjati nezavisno.

### 5. Šta je SPA?
- [ ] Aplikacija bez backenda
- [x] Web aplikacija koja učita jednu HTML stranicu, a dalje menja prikaz JavaScript-om i podatke vuče preko API-ja
- [ ] Aplikacija koja radi samo offline
- [ ] Stranica bez CSS-a
> Single Page Application: navigacija bez ponovnog učitavanja stranice, kao ova aplikacija sa React Router-om.
