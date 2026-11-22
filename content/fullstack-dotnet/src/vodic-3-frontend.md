---
id: 20
---
## Pitanja sa intervjua

**P: Zašto je bitan semantički HTML?**
Elementi kao `<button>`, `<nav>`, `<main>`, `<label>` nose značenje: čitač ekrana ih najavljuje, tastatura radi sama (Tab, Enter, Space), a pretraživači bolje razumeju stranicu. `<div onClick>` izgleda isto, ali nije dostupan tastaturi ni čitaču ekrana bez dodatnog posla.

**P: Šta je event delegation?**
Događaji se „penju” (bubbling) od elementa do korena. Umesto da staviš osluškivač na svaku od 1000 stavki liste, staviš jedan na roditelja i u njemu proveriš `event.target`. Manje osluškivača, a radi i za stavke dodate kasnije.

**P: Kada koristiš flexbox, a kada grid?**
Flexbox je jednodimenzionalan: raspoređuje elemente u red ili kolonu (navigacija, dugmad, poravnanje). Grid je dvodimenzionalan: redovi i kolone zajedno (raspored stranice, galerije kartica). Često se kombinuju.

## Test

### 1. Šta radi `box-sizing: border-box`?
- [ ] Dodaje okvir svakom elementu
- [x] Širina elementa uključuje padding i border, pa `width: 200px` ostaje 200px
- [ ] Uklanja margine
- [ ] Pretvara element u flex kontejner
> Podrazumevano (content-box) padding i border se dodaju na širinu. border-box olakšava raspored, pa se postavlja globalno.

### 2. Zašto je `<button>` bolji od `<div onClick>`?
- [ ] Brže se iscrtava
- [x] Fokusira se tastaturom, aktivira Enter/Space i čitač ekrana ga najavljuje kao dugme
- [ ] Ne može da se stilizuje
- [ ] Radi samo u formi
> div zahteva tabindex, role i rukovanje tasterima da bi bio jednako dostupan. button sve to ima ugrađeno.

### 3. Kojim redom se izvršavaju osluškivači pri kliku na dugme u div-u (oba imaju click osluškivač, bez capture)?
- [x] Prvo dugme, pa div (bubbling naviše)
- [ ] Prvo div, pa dugme
- [ ] Samo dugme
- [ ] Samo div
> Podrazumevana faza je bubbling: događaj ide od ciljnog elementa ka korenu. `event.stopPropagation()` ga zaustavlja.

### 4. Koje pravilo ima najveću specifičnost?
- [ ] `p { color: red }`
- [ ] `.tekst { color: red }`
- [x] `#naslov { color: red }`
- [ ] `* { color: red }`
> Specifičnost: ID > klasa/atribut/pseudo-klasa > element > `*`. Inline stil i `!important` su iznad svega, ali ih treba izbegavati.

### 5. Šta treba svaka `<img>` slika sa sadržajem?
- [ ] `title` atribut
- [x] `alt` tekst koji opisuje sliku
- [ ] Fiksnu širinu u pikselima
- [ ] `loading="eager"`
> alt čita čitač ekrana i prikazuje se ako slika ne učita. Dekorativna slika dobija prazan `alt=""` da je čitač preskoči.
=====
---
id: 21
---
## Pitanja sa intervjua

**P: Šta je closure?**
Funkcija „pamti” promenljive iz opsega u kome je napravljena, i kad se pozove kasnije van tog opsega. Koristi se za privatno stanje, fabrike funkcija i callback-e. Klasična zamka: u petlji sa `var` sve funkcije dele istu promenljivu; `let` pravi novu po iteraciji.

**P: Kako radi event loop?**
JS izvršava kod u jednoj niti. Kad se stek isprazni, prvo se izvrše svi microtask-ovi (Promise.then, await nastavci), pa jedan macrotask (setTimeout, događaj, mreža), pa ponovo microtask-ovi. Zato Promise.then ide pre setTimeout(0).

**P: Koja je razlika između `==` i `===`?**
`===` poredi i tip i vrednost bez konverzije. `==` prvo pretvara tipove po složenim pravilima (`"0" == 0` je true, `null == undefined` je true). U praksi se koristi `===`.

## Test

### 1. Šta ispisuje kod?
```js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
```
- [ ] 1 2 3 4
- [x] 1 4 3 2
- [ ] 1 3 4 2
- [ ] 1 4 2 3
> Sinhroni kod ide prvi (1, 4). Zatim microtask (Promise, 3), pa tek onda macrotask (setTimeout, 2).

### 2. Šta ispisuje kod?
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
- [ ] 0 1 2
- [x] 3 3 3
- [ ] 2 2 2
- [ ] undefined tri puta
> `var` ima opseg funkcije: sve tri lambde vide istu `i`, koja je posle petlje 3. Sa `let` svaka iteracija ima svoju `i`, pa se ispisuje 0 1 2.

### 3. Šta je tačno za `const korisnik = { ime: "Ana" };`?
- [ ] Objekat je zamrznut i ne može se menjati
- [x] `korisnik.ime = "Mia"` radi, ali `korisnik = {}` ne radi
- [ ] Ni jedno ni drugo ne radi
- [ ] const važi samo za brojeve i stringove
> const zabranjuje novu dodelu promenljive, ne izmenu objekta. Za zamrzavanje postoji Object.freeze.

### 4. Šta vraća async funkcija?
- [ ] Vrednost iz return, odmah
- [x] Uvek Promise
- [ ] undefined
- [ ] Callback
> I `async function f() { return 5; }` vraća Promise koji se razreši sa 5. Pozivalac mora `await f()` ili `.then`.

### 5. Šta radi spread u `const nova = { ...stara, ime: "Mia" };`?
- [ ] Menja objekat `stara`
- [x] Pravi novi plitki objekat sa svim poljima iz `stara`, a `ime` pregazi
- [ ] Pravi duboku kopiju svih ugnežđenih objekata
- [ ] Baca grešku ako `stara` već ima `ime`
> Kopija je plitka: ugnežđeni objekti se dele. U React-u se tako pravi novo stanje bez menjanja starog.
=====
---
id: 22
---
## Pitanja sa intervjua

**P: Koja je razlika između `any` i `unknown`?**
any isključuje proveru tipova: sve je dozvoljeno, greške se vide tek u izvršavanju. unknown kaže „ne znam šta je” i ne dozvoljava upotrebu dok tip ne suziš proverom (typeof, instanceof, validacija). Za podatke spolja (JSON, API) bolji je unknown.

**P: Šta je strukturno tipiziranje?**
TypeScript poredi oblik, ne ime tipa: objekat koji ima sva tražena polja odgovara tipu, iako nije „deklarisan” kao taj tip. Za razliku od C#-a, gde klasa mora eksplicitno da implementira interfejs.

**P: Da li TypeScript tipovi postoje u izvršavanju?**
Ne. Kompajler ih briše, ostaje čist JS. Zato TS ne proverava JSON koji stigne sa API-ja: ako server vrati nešto drugo, tip laže. Za proveru u izvršavanju koristi se validacija (npr. zod) ili jasan ugovor sa API-jem.

## Test

### 1. Šta je ispravno za vrednost tipa `unknown`?
- [ ] Može se koristiti kao bilo šta, kao any
- [x] Mora se suziti proverom pre upotrebe
- [ ] Uvek je null ili undefined
- [ ] Ne može se dodeliti promenljivoj
> unknown je bezbedna varijanta any: kompajler traži dokaz o tipu (npr. `typeof x === "string"`) pre upotrebe.

### 2. Kako TypeScript zna da je `x` string u grani `if`?
```ts
function duzina(x: string | number) {
  if (typeof x === "string") return x.length;
  return x;
}
```
- [ ] Ne zna, potreban je cast
- [x] Sužavanje tipa (narrowing) na osnovu typeof provere
- [ ] Iz imena parametra
- [ ] Iz poziva funkcije
> Posle provere TS u toj grani zna da je x string, a posle return-a da je ostao samo number.

### 3. Šta pravi `Partial<Korisnik>`?
- [ ] Tip sa samo prvim poljem
- [x] Tip u kome su sva polja opciona
- [ ] Tip bez polja
- [ ] Tip u kome su sva polja readonly
> Partial je koristan za izmene (PATCH). Srodni su Pick (izaberi polja), Omit (izbaci polja), Readonly i Required.

### 4. Da li TypeScript proverava JSON koji stigne sa API-ja u izvršavanju?
- [ ] Da, uvek
- [x] Ne, tipovi se brišu pri kompajliranju
- [ ] Samo u strict režimu
- [ ] Samo za nizove
> `res.json() as Korisnik` je obećanje kompajleru, ne provera. Ako server pošalje drugo, greška će se videti negde kasnije.

### 5. Prolazi li ovaj kod proveru tipova?
```ts
interface Tacka { x: number; y: number }
const p = { x: 1, y: 2, boja: "crvena" };
const t: Tacka = p;
```
- [x] Da, jer p ima sva polja koja traži Tacka (strukturno tipiziranje)
- [ ] Ne, jer p nije deklarisan kao Tacka
- [ ] Ne, jer p ima višak polja
- [ ] Samo uz `as Tacka`
> Provera viška polja važi samo za objektni literal dodeljen direktno. Promenljiva sa više polja je kompatibilna jer ima traženi oblik.
=====
---
id: 23
---
## Pitanja sa intervjua

**P: Kada se React komponenta ponovo iscrtava (re-render)?**
Kad se promeni njeno stanje (setState), kad se iscrta roditelj (i props se nisu promenili, osim uz memo), ili kad se promeni context koji koristi. Re-render znači ponovo pozvati funkciju komponente; React zatim upoređuje rezultat i menja samo ono što se razlikuje u DOM-u.

**P: Zašto se stanje ne menja direktno (`niz.push(x)`)?**
React poredi staro i novo stanje po referenci. Ako izmeniš isti niz, referenca je ista i React ne zna da je nešto promenjeno, pa ne iscrta. Novo stanje se pravi kao nova vrednost: `setNiz([...niz, x])`.

**P: Čemu služi `key` u listi?**
key govori React-u koja stavka je koja između dva iscrtavanja, pa može da sačuva stanje i DOM tačne stavke pri dodavanju, brisanju ili promeni redosleda. Treba stabilan, jedinstven ID; indeks niza je loš izbor kad se lista menja.

## Test

### 1. Zašto se lista ne osvežava na ekranu posle klika?
```tsx
const [stavke, setStavke] = useState<string[]>([]);
const dodaj = () => { stavke.push("nova"); setStavke(stavke); };
```
- [ ] useState ne radi sa nizovima
- [x] Ista referenca niza, pa React misli da se stanje nije promenilo
- [ ] Treba pozvati forceUpdate
- [ ] push je asinhron
> React poredi Object.is(staro, novo). Ispravno: `setStavke([...stavke, "nova"])`.

### 2. Šta je loše kod `key={index}` u listi koja se sortira?
- [ ] Ništa, index je uvek jedinstven
- [x] Posle sortiranja ključevi pripadaju drugim stavkama, pa se stanje (npr. unos u polju) „seli” na pogrešnu stavku
- [ ] React baca grešku
- [ ] Lista se ne iscrtava
> key mora da prati identitet stavke (ID iz baze), ne njen položaj.

### 3. Šta su props?
- [ ] Lokalno stanje komponente koje ona menja
- [x] Ulazni podaci koje komponenta dobija od roditelja i ne menja ih
- [ ] Globalne promenljive aplikacije
- [ ] CSS klase komponente
> Props su samo za čitanje. Ako dete treba da promeni podatak, roditelj mu prosledi funkciju (callback).

### 4. Šta je kontrolisana (controlled) forma u React-u?
- [ ] Forma koju kontroliše pregledač
- [x] Vrednost polja dolazi iz stanja, a onChange menja stanje
- [ ] Forma bez dugmeta za slanje
- [ ] Forma koja koristi ref za čitanje vrednosti
> React stanje je „izvor istine” za vrednost polja. Nekontrolisana forma čita vrednost iz DOM-a (ref, FormData).

### 5. Šta vraća funkcijska komponenta?
- [ ] HTML string
- [x] JSX (React elemente) koji opisuju šta treba prikazati
- [ ] DOM čvorove
- [ ] Promise sa HTML-om
> JSX se prevodi u pozive koji prave opis interfejsa. React od tog opisa pravi i ažurira stvarni DOM.
=====
---
id: 24
---
## Pitanja sa intervjua

**P: Koja su pravila hookova?**
Hookovi se pozivaju samo na najvišem nivou komponente ili sopstvenog hooka, nikad u if-u, petlji ili posle ranog return-a, i samo iz React funkcija. React prepoznaje hook po redosledu poziva, pa redosled mora biti isti pri svakom iscrtavanju.

**P: Čemu služi cleanup funkcija u useEffect?**
Vraća se iz efekta i React je poziva pre sledećeg pokretanja efekta i pri uklanjanju komponente. Tu se odjavljuju pretplate, brišu tajmeri i prekidaju zahtevi (AbortController), da ne bi curela memorija ili stizali odgovori za komponentu koje više nema.

**P: Šta je „stale closure” u hookovima?**
Efekat ili callback uhvati vrednost stanja iz iscrtavanja u kome je napravljen. Ako se ne doda u niz zavisnosti, i dalje vidi staru vrednost. Rešenje: tačne zavisnosti, funkcijski oblik setState (`setBroj(b => b + 1)`) ili useRef za vrednost koja ne treba da izaziva iscrtavanje.

## Test

### 1. Koliko puta se izvršava efekat sa praznim nizom zavisnosti `useEffect(fn, [])`?
- [ ] Pri svakom iscrtavanju
- [x] Jednom posle prvog iscrtavanja (u dev režimu sa StrictMode dvaput, namerno)
- [ ] Nikad
- [ ] Svake sekunde
> StrictMode u razvoju montira, demontira i ponovo montira komponentu da bi otkrio efekte bez ispravnog cleanup-a. U produkciji se izvršava jednom.

### 2. Šta ispisuje dugme posle jednog klika?
```tsx
const [b, setB] = useState(0);
const klik = () => { setB(b + 1); setB(b + 1); };
```
- [ ] 2
- [x] 1
- [ ] 0
- [ ] Greška
> Oba poziva vide isto `b` (0) iz tog iscrtavanja. `setB(x => x + 1)` dvaput bi dalo 2.

### 3. Koji hook čuva vrednost između iscrtavanja, a njena izmena NE izaziva novo iscrtavanje?
- [ ] useState
- [x] useRef
- [ ] useMemo
- [ ] useEffect
> `ref.current` je obična promenljiva koja preživi iscrtavanja. Koristi se za DOM elemente, tajmere i prethodne vrednosti.

### 4. Zašto je ovaj kod greška?
```tsx
if (korisnik) {
  const [ime, setIme] = useState(korisnik.ime);
}
```
- [ ] useState ne prima početnu vrednost
- [x] Hook u uslovu menja redosled hookova između iscrtavanja
- [ ] korisnik mora biti stanje
- [ ] Nije greška
> React vezuje stanje za redosled poziva hookova. Ako se poziv nekad preskoči, sve kasnije stanje se pomeri.

### 5. Kada useMemo ima smisla?
- [ ] Uvek, za svaku vrednost
- [x] Za skupo izračunavanje ili da referenca objekta ostane ista između iscrtavanja
- [ ] Za čuvanje stanja forme
- [ ] Za pozive API-ja
> useMemo ima svoju cenu. Koristi se kad je izračunavanje skupo ili kad stabilna referenca sprečava suvišna iscrtavanja dece (uz memo).
=====
---
id: 25
---
## Pitanja sa intervjua

**P: Koja je razlika između serverskog i klijentskog stanja?**
Serversko stanje (podaci iz baze) pripada serveru: može da zastari, deli se između korisnika i treba ga keširati i osvežavati. Klijentsko stanje (otvoren meni, unos u formu) živi samo u pregledaču. Za serversko je bolja biblioteka (TanStack Query) nego useState + useEffect.

**P: Šta TanStack Query rešava u odnosu na fetch u useEffect?**
Keširanje po ključu, deduplikaciju istih zahteva, stanja učitavanja i greške, ponovne pokušaje, osvežavanje u pozadini, invalidaciju posle izmene i trku odgovora (stariji odgovor ne pregazi noviji). Ručno sve to je mnogo koda i grešaka.

**P: Kako posle izmene (POST) osvežiš listu na ekranu?**
U onSuccess mutacije pozoveš `queryClient.invalidateQueries({ queryKey: ["porudzbine"] })`. Query se označi kao zastareo i ponovo učita. Alternativa za trenutni prikaz je optimističko ažuriranje keša, uz vraćanje na staro ako server odbije.

## Test

### 1. Šta treba da sadrži queryKey za porudžbine jednog kupca?
- [ ] Samo `["porudzbine"]`
- [x] I parametar, npr. `["porudzbine", kupacId]`
- [ ] URL kao string
- [ ] Nasumičan broj da se keš ne meša
> Ključ identifikuje podatke u kešu. Bez kupacId svi kupci bi delili isti keš i videli tuđe porudžbine.

### 2. Šta znači `staleTime: 30_000`?
- [ ] Zahtev ima timeout od 30 s
- [x] 30 s posle učitavanja podaci se smatraju svežim i neće se automatski ponovo učitati
- [ ] Keš se briše posle 30 s
- [ ] Zahtev se ponavlja svakih 30 s
> Dok su podaci sveži, novi korisnik istog ključa dobija keš bez mreže. Brisanje iz keša određuje gcTime.

### 3. Kako posle uspešne mutacije osvežiti prikazanu listu?
- [ ] window.location.reload()
- [x] queryClient.invalidateQueries sa ključem liste
- [ ] Ponovo montirati celu aplikaciju
- [ ] Ništa, osvežava se sama
> Invalidacija označi podatke zastarelim, pa ih aktivni query odmah ponovo učita.

### 4. Koji problem ima fetch u useEffect bez dodatne logike, kad korisnik brzo menja filter?
- [ ] Nijedan
- [x] Spor stariji odgovor može da stigne posle novijeg i prikaže pogrešne podatke
- [ ] Zahtev se nikad ne šalje
- [ ] React baca grešku
> Trka odgovora. Rešava se AbortController-om ili zastavicom u cleanup-u, a TanStack Query je rešava sam.

### 5. Gde se čuva otvorenost padajućeg menija?
- [ ] U TanStack Query kešu
- [x] U lokalnom stanju komponente (useState)
- [ ] U bazi preko API-ja
- [ ] U kolačiću
> To je čisto klijentsko stanje koje niko drugi ne treba. Query je za podatke sa servera.
=====
---
id: 26
---
## Pitanja sa intervjua

**P: Kako radi rutiranje u SPA aplikaciji?**
Server uvek vrati isti index.html, a ruter u pregledaču čita putanju (History API) i prikazuje odgovarajuću komponentu. Klik na Link menja URL bez novog učitavanja stranice. Zato server mora da za nepoznate putanje vrati index.html, inače refresh na `/porudzbine/5` daje 404.

**P: Zašto Link, a ne `<a href>`?**
`<a href>` učitava celu stranicu ponovo: gubi se stanje i keš, i ponovo se preuzima JS. Link menja URL kroz ruter, a React samo zameni prikaz. Za spoljne linkove ostaje običan `<a>`.

**P: Šta su ugnežđene rute?**
Roditeljska ruta crta zajednički okvir (meni, zaglavlje) i `<Outlet />` na mestu gde ide dete. Deca menjaju samo svoj deo, a okvir ostaje montiran sa svojim stanjem.

## Test

### 1. Refresh na `/porudzbine/5` u produkciji vraća 404 iz nginx-a. Šta fali?
- [ ] Ruta u React Router-u
- [x] Fallback na index.html (`try_files $uri /index.html`)
- [ ] HTTPS sertifikat
- [ ] Ključ u listi
> nginx traži fajl `/porudzbine/5` i ne nalazi ga. Treba da vrati index.html, pa da ruter u pregledaču prikaže stranicu.

### 2. Kako se u React Router-u čita `5` iz rute `/porudzbine/:id`?
- [ ] `window.location.id`
- [x] `const { id } = useParams();`
- [ ] `props.id`
- [ ] `useQuery("id")`
> useParams vraća parametre putanje kao stringove. Query string (`?strana=2`) se čita sa useSearchParams.

### 3. Šta je mana `<a href="/mapa">` unutar SPA aplikacije?
- [ ] Ne radi u Chrome-u
- [x] Učitava celu aplikaciju ponovo i gubi stanje u memoriji
- [ ] Ne podržava stilove
- [ ] Ne menja URL
> Link radi navigaciju na klijentu, bez novog zahteva za HTML i JS.

### 4. Čemu služi `<Outlet />`?
- [ ] Za izlaz iz aplikacije
- [x] Mesto gde roditeljska ruta prikazuje aktivnu dete rutu
- [ ] Za preusmeravanje na login
- [ ] Za učitavanje podataka
> Tako zajednički okvir (meni, zaglavlje) ostaje, a menja se samo sadržaj.

### 5. Gde je pravo mesto za stanje „trenutna strana tabele” koje treba da preživi refresh i da se može podeliti linkom?
- [ ] useState
- [x] U URL-u (query string, npr. `?strana=3`)
- [ ] localStorage
- [ ] Globalna promenljiva
> URL je deljivo i trajno stanje: korisnik može da pošalje link, a dugme „nazad” radi kako očekuje.
=====
---
id: 27
---
## Pitanja sa intervjua

**P: Da li je validacija na klijentu dovoljna?**
Ne. Klijentska validacija je za brzu povratnu informaciju korisniku. Svako može da zaobiđe frontend i pošalje zahtev direktno, pa server uvek ponovo proverava. Idealno su pravila ista (npr. ista ograničenja dužine), a server je izvor istine.

**P: Šta čini formu pristupačnom?**
Svako polje ima `<label>` povezan sa njim (htmlFor/id), greške su tekstom uz polje i povezane sa `aria-describedby`, fokus ide na prvu grešku posle slanja, a forma radi tastaturom (Enter šalje). Boja nije jedini nosilac informacije o grešci.

**P: Kako prikazuješ datume i iznose za različite jezike?**
Preko Intl API-ja: `Intl.NumberFormat("sr-Latn-RS", { style: "currency", currency: "RSD" })` i `Intl.DateTimeFormat`. Tekstovi idu u fajlove prevoda (npr. i18next), a ne u kod. Datumi se čuvaju i šalju u UTC, a lokalno se samo prikazuju.

## Test

### 1. Zašto server mora da validira podatke iako ih frontend već proverava?
- [ ] Ne mora
- [x] Zahtev može da stigne i mimo frontenda (curl, Postman, napadač)
- [ ] Frontend validacija ne radi u Safariju
- [ ] Zbog performansi
> Klijent je pod kontrolom korisnika. Sve što je bitno za bezbednost i ispravnost podataka proverava server.

### 2. Kako se `<label>` povezuje sa poljem?
- [ ] Mora biti odmah iznad polja
- [x] `htmlFor` na labeli jednak `id` polja (ili polje unutar labele)
- [ ] Istim CSS klasama
- [ ] Preko `title` atributa
> Klik na labelu fokusira polje, a čitač ekrana čita labelu kad je polje u fokusu.

### 3. Šta sprečava `event.preventDefault()` u onSubmit forme?
- [ ] Validaciju
- [x] Podrazumevano slanje forme i ponovno učitavanje stranice
- [ ] Slanje fetch zahteva
- [ ] Unos u polja
> Bez toga pregledač pošalje formu klasično i učita novu stranicu, pa se SPA stanje izgubi.

### 4. Kako ispravno prikazati 1234.5 kao iznos u dinarima za srpski jezik?
- [ ] `iznos + " RSD"`
- [x] `new Intl.NumberFormat("sr-Latn-RS", { style: "currency", currency: "RSD" }).format(iznos)`
- [ ] `iznos.toFixed(2)`
- [ ] `String(iznos).replace(".", ",")`
> Intl zna separatore hiljada, decimalni zarez i položaj valute za dati jezik.

### 5. U kom obliku je najbolje slati datum i vreme između frontenda i API-ja?
- [ ] Kao tekst „22.11.2026. 14:30”
- [x] ISO 8601 u UTC (npr. `2026-11-22T13:30:00Z`)
- [ ] Kao broj dana od 1900.
- [ ] Bez vremenske zone, lokalno vreme
> ISO 8601 sa zonom je nedvosmislen. Lokalni prikaz se radi tek u interfejsu.
=====
---
id: 28
---
## Pitanja sa intervjua

**P: Gde treba da živi stanje u React aplikaciji?**
Što bliže mestu gde se koristi (colocation). Ako ga koristi više komponenti, podigni ga do najbližeg zajedničkog roditelja. Serverski podaci idu u TanStack Query, deljeno stanje kroz URL ili context, a globalni store (Zustand, Redux) tek kad je zaista potreban.

**P: Koja je mana Context-a za stanje koje se često menja?**
Kad se vrednost context-a promeni, iscrtavaju se SVE komponente koje ga koriste, čak i ako im treba samo deo vrednosti. Za teme i prijavljenog korisnika to je u redu; za brzo promenljivo stanje bolji su manji context-i ili store sa selektorima.

**P: Kako smanjuješ veličinu JS bundle-a?**
Code splitting po rutama (React.lazy + Suspense), uklanjanje nekorišćenih biblioteka, uvoz samo potrebnih delova (tree shaking), analiza bundle-a i odlaganje teških komponenti (grafici, editori) dok ne zatrebaju.

## Test

### 1. Šta je „prop drilling”?
- [ ] Brisanje props-a koje se ne koriste
- [x] Prosleđivanje props-a kroz više slojeva komponenti koje ih same ne koriste
- [ ] Validacija props-a
- [ ] Pretvaranje props-a u stanje
> Rešava se kompozicijom (children), context-om ili podizanjem komponente, a ne odmah globalnim store-om.

### 2. Šta radi `const Mapa = React.lazy(() => import("./MapPage"));`?
- [ ] Učitava MapPage odmah pri startu
- [x] Izdvaja MapPage u poseban fajl koji se preuzima tek kad se prvi put prikaže
- [ ] Kešira MapPage u localStorage
- [ ] Iscrtava MapPage na serveru
> Uz `<Suspense fallback={...}>` početni bundle je manji, a stranica se učitava kad zatreba.

### 3. Prijavljen korisnik treba skoro svim komponentama. Šta je razuman izbor?
- [ ] Prosleđivati ga props-ima kroz sve slojeve
- [x] Context (ili query keš) sa korisnikom
- [ ] Globalna promenljiva `window.korisnik`
- [ ] Čitati ga iz localStorage u svakoj komponenti
> Retko se menja, a treba mnogima: tipičan slučaj za context.

### 4. Šta je tree shaking?
- [ ] Brisanje node_modules
- [x] Uklanjanje koda koji se nigde ne uvozi iz finalnog bundle-a
- [ ] Sortiranje komponenti po imenu
- [ ] Testiranje stabla komponenti
> Radi sa ES modulima: bundler vidi šta je uvezeno i izbacuje ostalo. Zato je bolje `import { debounce } from ...` nego uvoz cele biblioteke.

### 5. Kako organizovati foldere u većoj React aplikaciji?
- [ ] Sve komponente u jednom folderu
- [x] Po funkcionalnosti (feature): stranica, njene komponente, hookovi i API pozivi zajedno
- [ ] Po tipu fajla, uvek (svi hookovi u /hooks)
- [ ] Svaka komponenta u svom repozitorijumu
> Kod koji se menja zajedno stoji zajedno. Zajedničke komponente (dugme, modal) idu u poseban deljeni folder.
=====
---
id: 29
---
## Pitanja sa intervjua

**P: Šta radi Vite u razvoju, a šta pri build-u?**
U razvoju servira izvorne fajlove kao ES module, pa start i HMR traju trenutno, bez pakovanja cele aplikacije. Pri build-u pakuje kod u optimizovane bundle-ove: minifikacija, tree shaking, podela na delove, heš u imenima fajlova za keširanje.

**P: Zašto se u Testing Library-ju traži element po ulozi (getByRole)?**
Test tako koristi aplikaciju kao korisnik i čitač ekrana: „dugme Sačuvaj”, „polje Email”. Ne zavisi od CSS klasa i strukture DOM-a, pa ne puca pri refaktorisanju, a usput proverava pristupačnost.

**P: Da li je `VITE_API_KEY` u .env fajlu tajna?**
Nije. Sve promenljive sa prefiksom VITE_ se ugrađuju u JS bundle i vidi ih svako ko otvori aplikaciju. Tajne ostaju na serveru; frontend zove svoj backend, a backend koristi ključ.

## Test

### 1. Ko vidi vrednost `import.meta.env.VITE_MAPS_KEY` u produkciji?
- [ ] Samo server
- [x] Svako ko preuzme JS aplikacije
- [ ] Samo administratori
- [ ] Niko, Vite je šifruje
> Vite je ugrađuje u bundle kao običan tekst. Takav ključ mora biti javan i ograničen (npr. po domenu).

### 2. Koji upit je najbolji za pronalaženje dugmeta u testu?
- [ ] `container.querySelector(".btn-primary")`
- [x] `screen.getByRole("button", { name: "Sačuvaj" })`
- [ ] `screen.getByTestId("dugme-1")`
- [ ] `document.getElementsByTagName("button")[0]`
> getByRole prati kako korisnik vidi stranicu. data-testid je izlaz u nuždi kad element nema ulogu ni tekst.

### 3. Zašto Vite u razvoju startuje brzo i kod velike aplikacije?
- [ ] Ne proverava greške
- [x] Ne pakuje celu aplikaciju unapred, nego servira module na zahtev pregledača
- [ ] Koristi keš iz produkcije
- [ ] Preskače TypeScript fajlove
> Pregledač sam traži module koje uvozi. Pakovanje se radi tek za produkciju.

### 4. Šta testira E2E (end-to-end) test, npr. u Playwright-u?
- [ ] Jednu funkciju izolovano
- [x] Ceo tok kroz pravi pregledač: frontend, API i bazu zajedno
- [ ] Samo CSS
- [ ] Samo TypeScript tipove
> E2E je najbliži korisniku, ali najsporiji i najkrhkiji, pa se piše za ključne tokove (prijava, kupovina).

### 5. Zašto build dodaje heš u ime fajla (`index-a1b2c3.js`)?
- [ ] Zbog bezbednosti
- [x] Da pregledač može dugo da kešira fajl, a nova verzija dobije novo ime
- [ ] Da se fajl ne bi mogao preuzeti
- [ ] Zbog kompresije
> Ime se menja samo kad se sadržaj promeni. Zato se može postaviti dugo keširanje bez straha od stare verzije.
=====
---
id: 31
---
## Pitanja sa intervjua

**P: Kako bi objasnio React nekome ko zna samo HTML i JS?**
Interfejs opisuješ kao funkciju stanja: komponenta prima podatke (props, stanje) i vraća šta treba prikazati. Kad se stanje promeni, React ponovo pozove komponentu i sam izmeni samo potrebne delove DOM-a. Ne pišeš „promeni ovaj element”, nego „ovako izgleda za ovo stanje”.

**P: Koje greške najčešće vidiš u React kodu?**
Menjanje stanja direktno, indeks kao key, useEffect za stvari koje mogu da se izračunaju tokom iscrtavanja, fetch bez rukovanja trkom i greškom, pogrešne zavisnosti efekta, previše globalnog stanja i div umesto dugmeta.

**P: Kada ti NE treba useEffect?**
Kad se vrednost može izračunati iz props-a i stanja tokom iscrtavanja (filtrirana lista, zbir), i kad reaguješ na akciju korisnika (to ide u event handler). Efekat je za sinhronizaciju sa spoljnim sistemom: pretplata, tajmer, DOM API, mreža bez biblioteke.

## Test

### 1. Kako izračunati filtriranu listu iz `stavke` i `filter` (oba su stanje)?
- [ ] useEffect koji postavlja novo stanje `filtrirane`
- [x] Izračunati direktno tokom iscrtavanja (po potrebi uz useMemo)
- [ ] Čuvati u localStorage
- [ ] Poslati zahtev serveru pri svakoj promeni
> Izvedena vrednost ne treba svoje stanje. useEffect + setState pravi dodatno iscrtavanje i rizik od neusklađenosti.

### 2. Kako dete komponenta javlja roditelju da je korisnik izabrao stavku?
- [ ] Menja props roditelja
- [x] Poziva funkciju koju je dobila kroz props (npr. `onIzbor(id)`)
- [ ] Postavlja globalnu promenljivu
- [ ] Šalje DOM događaj ručno
> Podaci idu nadole kroz props, a događaji naviše kroz callback-e.

### 3. Šta TanStack Query radi bolje od useState + useEffect za podatke sa API-ja?
- [ ] Ništa, isto je
- [x] Keš, deduplikaciju, ponovne pokušaje, stanje učitavanja i invalidaciju posle izmena
- [ ] Iscrtava brže
- [ ] Zamenjuje backend
> To je biblioteka za serversko stanje: rešava probleme koje ručni fetch ima (trka, zastarelost, duplikati).

### 4. Šta je tačno za Strict Mode u razvoju?
- [ ] Usporava produkcijski build
- [x] Namerno dvaput poziva neke funkcije i efekte da bi otkrio nečiste komponente i efekte bez cleanup-a
- [ ] Zabranjuje useEffect
- [ ] Isključuje TypeScript proveru
> Ponašanje važi samo u razvoju. Ako ti efekat „puca” u Strict Mode-u, verovatno mu fali cleanup.

### 5. Kako sprečiti da `<Lista stavke={...} />` iscrtava sve stavke kad se promeni nevezano stanje roditelja?
- [ ] Nikako
- [x] Umotati stavku u memo i obezbediti stabilne props-e (useCallback/useMemo gde treba)
- [ ] Prebaciti sve u context
- [ ] Koristiti class komponente
> memo preskače iscrtavanje kad su props isti po referenci. Prvo izmeri (React DevTools Profiler), pa optimizuj.
