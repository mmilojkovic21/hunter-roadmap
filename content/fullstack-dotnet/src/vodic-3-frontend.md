---
id: 20
subtitle: "struktura, DOM, CSS (box model, flex, grid, kaskada), događaji i kako browser crta"
minutes: 45
---
# 20 HTML, CSS i DOM

Stranicu čine tri jezika: HTML kaže šta je na stranici (struktura i značenje), CSS kako izgleda, a JavaScript šta se dešava kad korisnik nešto uradi. React (pogl. 23) ne zamenjuje nijedan od njih: na kraju sve postaje HTML elementi, CSS pravila i DOM događaji.

## Pojmovi

### HTML i semantika

```html
<!doctype html>
<html lang="sr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Biblioteka</title>
    <link rel="stylesheet" href="style.css">
    <script type="module" src="app.js"></script>   <!-- module je odložen kao defer -->
  </head>
  <body>
    <main>
      <h1>Knjige</h1>
      <ul class="list">
        <li>Hobit <button type="button">Pozajmi</button></li>
      </ul>
      <form>
        <label for="q">Pretraga</label>
        <input id="q" name="q">
      </form>
    </main>
  </body>
</html>
```

- Element ima oznaku (`<button>`), atribute (`type`, `class`, `id`) i sadržaj.
- **Semantički elementi** (`button`, `a`, `nav`, `main`, `form`, `label`, `table`) kažu šta nešto jeste: čitač ekrana ih najavljuje, tastatura radi sama (Tab, Enter, Space), pretraživači bolje razumeju stranicu.
- `<div onClick>` izgleda kao dugme, ali nije fokusabilan i čitač ga ne najavljuje. Pravilo: **link vodi negde (`<a href>`), dugme nešto radi (`<button>`)**.
- `<label for>` povezuje opis sa poljem: klik na labelu fokusira polje, čitač ga čita.
- `<img alt>`: opis za čitač; dekorativna slika dobija `alt=""`.
- `lang="sr"` i `viewport` meta: izgovor čitača i ispravan prikaz na telefonu.

### DOM

DOM (Document Object Model) je **stablo objekata** koje browser napravi od HTML-a: `document → html → body → main → ul → li → button`. JavaScript menja stranicu menjajući DOM:

```js
document.querySelector('h1').textContent = 'Knjige (3)'
const li = document.createElement('li'); li.textContent = 'Silmarilion'
document.querySelector('.list').append(li)
```

`textContent` ubacuje tekst; `innerHTML` parsira HTML i zato je opasan sa korisničkim unosom (XSS, pogl. 15). Svaka izmena DOM-a može da natera browser da ponovo računa raspored i crta; zato React grupiše izmene i menja samo ono što mora.

### CSS

```css
*, *::before, *::after { box-sizing: border-box; }       /* širina uključuje padding i border */
.list { display: flex; flex-direction: column; gap: 8px; } /* klasa */
#q { width: 100%; }                                       /* id */
button:hover { background: var(--accent); }               /* stanje + CSS promenljiva */
:root { --accent: #5f7a1f; }                              /* tema = vrednosti promenljivih */
@media (max-width: 600px) { .list { gap: 4px; } }          /* responsive */
```

- **Box model**: sadržaj + `padding` (unutra) + `border` + `margin` (spolja). Podrazumevano (`content-box`) padding i border se dodaju na `width`; `border-box` ih uračunava.
- **Raspored**: `flex` je jednodimenzionalan (red ili kolona: navigacija, dugmad), `grid` dvodimenzionalan (redovi i kolone: raspored stranice, galerija). Često se kombinuju.
- **Kaskada**: kad se pravila sukobe, redom odlučuju poreklo i `!important`, zatim slojevi (`@layer`), pa **specifičnost** (inline stil > id > klasa/atribut/pseudo-klasa > element), pa redosled (kasnije napisano pobeđuje).
- **CSS promenljive** (`--accent`) omogućavaju teme: tamni režim menja samo vrednosti (ova aplikacija tako radi sa `[data-theme]`).
- **Responsive**: isti sadržaj se prilagođava širini (`@media`, fleksibilne jedinice `%`, `rem`, `fr`).

### Događaji

```js
button.addEventListener('click', (event) => { /* ... */ })
form.addEventListener('submit', (event) => {
  event.preventDefault()                     // bez ponovnog učitavanja stranice
  const data = new FormData(form)            // vrednosti polja po atributu name
})
```

Događaj putuje **naviše kroz stablo** (bubbling): klik na dugme je i klik na `li`, `ul`, `body`. Zato radi **event delegation**: jedan osluškivač na roditelju i provera `event.target.closest('button')`, umesto hiljadu osluškivača. `stopPropagation()` zaustavlja penjanje, `preventDefault()` podrazumevanu akciju (slanje forme, praćenje linka).

### Šta browser radi sa stranicom

Preuzme HTML → pravi DOM → preuzme CSS (CSSOM) → izračuna stilove → **layout** (gde je šta i koliko je veliko) → **paint** (crtanje) → composite (slojevi). Običan `<script>` zaustavlja parsiranje HTML-a dok se ne preuzme i izvrši; zato se stavlja na kraj `body` ili dobija `defer` (izvrši se posle parsiranja, redom). `type="module"` je podrazumevano odložen kao `defer`; `async` se izvrši čim stigne, bez garancije redosleda.

## Dublje

**Specifičnost kao tri broja.** Selektor se boduje kao (id, klasa, element): `#naslov` je (1,0,0), `.kartica .naslov` (0,2,0), `ul li a` (0,0,3). Poredi se s leva: jedan id pobeđuje bilo koliko klasa. `:where()` ima specifičnost 0 (dobar za podrazumevane stilove biblioteka), a `:is()` uzima najveću specifičnost iz liste. `@layer` rešava sukob pre specifičnosti: pravilo u kasnijem sloju pobeđuje i specifičnije pravilo iz ranijeg, pa se biblioteke stave u niži sloj umesto da se bore sa `!important`; stilovi van svih slojeva pobeđuju sve slojeve.

**Šta je skupo pri crtanju.** Promena `width`, `top` ili dodavanje elemenata traži ponovni layout (reflow); promena boje samo paint; `transform` i `opacity` se obično rade samo u kompoziciji, na GPU-u. Zato animacije u ovoj aplikaciji koriste `transform`/`opacity`. Druga zamka je čitanje rasporeda posle pisanja u petlji (`el.style.width = …; el.offsetHeight`): browser mora odmah da preračuna, pa nastaje „layout thrashing”; prvo sva čitanja, pa sva pisanja.

**Pristupačnost u praksi.** Prava `<button>`/`<a>`, vidljiv fokus (`:focus-visible`, ne `outline: none` bez zamene), kontrast teksta bar 4,5:1 (WCAG AA), dodirne površine dovoljno velike i ARIA tek kad semantički element ne postoji („no ARIA is better than bad ARIA”). Ova aplikacija ima ta pravila u CLAUDE.md.

## Lab

1. Napiši stranicu iz primera (lista knjiga, forma za pretragu) bez ijednog `<div>`-a koji je klikabilan; proveri da se sve radi samo tastaturom (Tab, Enter, Space).
2. Dodaj `box-sizing: border-box` i proveri u DevTools (Elements → Computed) kako se menja ukupna širina elementa sa paddingom.
3. Napravi raspored stranice gridom (zaglavlje, meni, sadržaj) i listu dugmadi flexom; suzi prozor ispod 600px i promeni raspored kroz `@media`.
4. Napiši dva sukobljena pravila (`#q` i `.polje`) i u DevTools-u vidi koje je precrtano i zašto.
5. Dodaj jedan `click` osluškivač na `<ul>` (event delegation) koji ispiše koja knjiga je kliknuta; dodaj novu stavku iz JS-a i proveri da i ona radi.
6. Forma: `submit` sa `preventDefault()` i čitanje vrednosti preko `FormData`.

**Gotovo je kad:** stranica radi samo tastaturom, umeš da objasniš box model i specifičnost na primeru iz DevTools-a, a jedan osluškivač na roditelju obrađuje i kasnije dodate stavke.

## Pitanja sa intervjua

**P: Zašto je bitan semantički HTML?**
Elementi kao `<button>`, `<nav>`, `<main>`, `<label>` nose značenje: čitač ekrana ih najavljuje, tastatura radi sama (Tab, Enter, Space), a pretraživači bolje razumeju stranicu. `<div onClick>` izgleda isto, ali nije dostupan tastaturi ni čitaču ekrana bez dodatnog posla.

**P: Šta je event delegation?**
Događaji se „penju” (bubbling) od elementa do korena. Umesto da staviš osluškivač na svaku od 1000 stavki liste, staviš jedan na roditelja i u njemu proveriš `event.target`. Manje osluškivača, a radi i za stavke dodate kasnije.

**P: Kada koristiš flexbox, a kada grid?**
Flexbox je jednodimenzionalan: raspoređuje elemente u red ili kolonu (navigacija, dugmad, poravnanje). Grid je dvodimenzionalan: redovi i kolone zajedno (raspored stranice, galerije kartica). Često se kombinuju.

**P: Kako browser od HTML-a dođe do piksela?**
Parsira HTML u DOM i CSS u CSSOM, izračuna stilove, uradi layout (gde je šta i koliko je veliko), pa paint i kompoziciju slojeva. Običan script blokira parsiranje, zato defer ili type=module. Za animacije se koriste transform i opacity, jer ne traže ponovni layout.

**P: Kako se rešava sukob dva CSS pravila?**
Kaskada: prvo poreklo i !important, zatim slojevi (@layer), pa specifičnost (inline > id > klasa/atribut/pseudo-klasa > element), pa redosled, kasnije pobeđuje. U praksi se izbegavaju id selektori i !important, a stilovi biblioteka stave u niži sloj.

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

## Izvori
- [HTML: A good basis for accessibility (MDN)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [Introduction to the DOM (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)
- [The box model (MDN)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)
- [Specificity (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity)
- [@layer (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [Grid i drugi načini rasporeda (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Relationship_of_grid_layout_with_other_layout_methods)
- [Event bubbling (MDN)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)
- [<script>: defer, async, type=module (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
=====
---
id: 21
subtitle: "tipovi i poređenje, funkcije i closure, objekti po referenci, moduli, event loop, Promise i async/await"
minutes: 50
---
# 21 JavaScript

JavaScript je jedini jezik koji browser izvršava. Dinamički je tipiziran (tip ima vrednost, ne promenljiva), funkcije su vrednosti kao i sve ostalo, a sav kod jedne stranice radi u **jednoj niti**. Ovo poglavlje je osnova za TypeScript (pogl. 22) i React (pogl. 23).

## Pojmovi

### Promenljive, tipovi, poređenje

```js
const naslov = 'Hobit'   // nema nove dodele (objekat i dalje može da se menja)
let broj = 0             // može nova dodela; var se više ne koristi
0.1 + 0.2                // 0.30000000000000004: number je binarni double
'5' == 5                 // true: == pretvara tipove
'5' === 5                // false: uvek ===
typeof null              // 'object': poznata istorijska greška jezika
```

- **Primitivni tipovi**: `string`, `number` (i celi i decimalni), `bigint`, `boolean`, `undefined`, `null`, `symbol`. Sve ostalo je **object**, i nizovi i funkcije.
- `let` i `const` imaju **blok opseg**; `var` ima opseg funkcije. I `let`/`const` se „podižu”, ali do deklaracije su u **TDZ** (temporal dead zone): pristup baca `ReferenceError`, dok `var` tiho vrati `undefined`.
- Lažne vrednosti (falsy): `false`, `0`, `''`, `null`, `undefined`, `NaN`. Zato `if (count)` ne razlikuje 0 od „nema”.

### Funkcije i closure

```js
function zakasnina(dana, poDanu = 20) { return dana * poDanu }
const dupla = (x) => x * 2                          // arrow funkcija (nema svoj this)
const dostupne = knjige.filter((k) => k.slobodno > 0) // funkcija kao argument

function brojac() {
  let n = 0
  return () => ++n                                  // closure: pamti svoje n
}
const sledeci = brojac()
sledeci(); sledeci()                                // 1, 2
```

**Closure** je funkcija koja pamti promenljive iz opsega u kome je napravljena, i kad se pozove kasnije, van njega. Na tome počivaju React hookovi (pogl. 24) i zamka „zastarelog” stanja.

### Objekti i nizovi

```js
const knjiga = { id: 42, naslov: 'Hobit', autor: { ime: 'Tolkin' } }
const { naslov, id } = knjiga                        // destrukturiranje
const izmenjena = { ...knjiga, naslov: 'Hobit (2. izd.)' } // spread: NOV plitki objekat
knjiga.autor?.ime                                    // optional chaining
const strana = knjiga.strana ?? 0                    // zamena samo za null/undefined (|| bi zamenio i 0)
const naslovi = knjige.map((k) => k.naslov)
const ukupno = knjige.reduce((s, k) => s + k.slobodno, 0)
const hobit = knjige.find((k) => k.id === 42)
const sortirane = knjige.toSorted((a, b) => a.naslov.localeCompare(b.naslov)) // ne menja original
```

**Referenca, ne kopija.** `const b = knjiga; b.naslov = 'X'` menja i `knjiga`. Porede se po referenci: `{} === {}` je `false`. Zato se u React-u stanje ne menja na mestu nego se pravi nova vrednost. `sort` i `reverse` menjaju niz; `toSorted`, `toReversed`, `with` vraćaju nov. Spread je plitka kopija; duboka je `structuredClone(obj)`.

### Moduli

```js
// format.js
export function formatNumber(n) { /* ... */ }
// app.js
import { formatNumber } from './format.js'
const { Stranica } = await import('./stranica.js')   // dinamički: učitaj tek kad zatreba
```

ES moduli imaju sopstveni opseg (ništa ne curi u globalni), `import` je statičan i omogućava „tree shaking”, a dinamički `import()` deli bundle na delove (lazy rute, pogl. 28).

### Event loop i asinhronost

JavaScript ima **jednu nit**: dugo računanje zamrzne ceo ekran. Čekanje (mreža, tajmer, klik) radi browser van te niti, a nastavak čeka u redu:

1. Izvrši se sav sinhroni kod (call stack se isprazni).
2. Izvrše se **svi microtask-ovi** (`Promise.then`, nastavci posle `await`, `queueMicrotask`).
3. Uzme se **jedan macrotask** (tajmer, događaj, poruka), pa opet svi microtask-ovi; između toga browser može da crta.

```js
// Promise: vrednost koja će stići kasnije
fetch('/api/books').then((r) => r.json()).then(prikazi).catch(prikaziGresku)

async function ucitaj() {
  const odgovor = await fetch('/api/books')
  if (!odgovor.ok) throw new Error(`HTTP ${odgovor.status}`)   // fetch NE baca za 404/500!
  return odgovor.json()
}
const [knjige, clanovi] = await Promise.all([ucitaj(), ucitajClanove()]) // istovremeno
```

- `async` funkcija **uvek vraća Promise**; `await` pauzira samo tu funkciju, ne celu nit.
- `fetch` odbija Promise samo za mrežnu grešku ili prekid; status 404/500 je „uspešan” odgovor sa `ok: false`.
- `Promise.all` pada na prvu grešku; `Promise.allSettled` čeka sve i vraća ishod svakog.
- Prekid zahteva: `AbortController` (`fetch(url, { signal })`), isto kao `CancellationToken` u .NET-u (pogl. 7).

## Dublje

**Zašto `Promise.then` ide pre `setTimeout(…, 0)`.** Posle sinhronog koda event loop prvo isprazni ceo red microtask-ova, pa tek onda uzme sledeći macrotask. Posledica: beskonačan lanac microtask-ova može da zamrzne stranicu isto kao petlja, jer browser ne dobije priliku da crta. Za duge proračune: podeli posao (`setTimeout`, `scheduler.yield()` gde postoji) ili ga prebaci u Web Worker.

**`this` i arrow funkcije.** Obična funkcija dobija `this` od načina poziva (`obj.metoda()` → `obj`; ista funkcija prosleđena kao callback gubi `obj`). Arrow funkcija nema svoj `this`, nego ga uzima iz okolnog opsega; zato su callback-ovi u klasama i događajima najčešće arrow. Funkcijske React komponente uopšte ne koriste `this`.

**Poređenje sa C#-om.** `async/await` liči na C#, ali u JS-u nema niti iz pool-a: nastavak uvek ide na istu (jedinu) nit kroz red microtask-ova. Zato u JS-u nema „deadlocka sa `.Result`”, ali ima zamrzavanja ekrana dugim sinhronim kodom. `number` je kao `double` (zato 0,1 + 0,2); za novac se računa u celim parama ili sa decimalnom bibliotekom, a za velike cele brojeve postoji `bigint`.

## Lab

1. U konzoli pregledača (ili `node`) pokreni primere poređenja i `typeof`, i zapiši rezultate koji te iznenade (`typeof null`, `0.1 + 0.2`, `null == undefined`).
2. Napiši `brojac()` sa closure-om i dva nezavisna brojača; pokaži da ne dele stanje.
3. Pokreni primer sa `console.log(1)`, `setTimeout(… 2)`, `Promise.resolve().then(… 3)`, `console.log(4)` i objasni redosled 1, 4, 3, 2.
4. Napiši `ucitaj()` sa proverom `response.ok` i pozovi URL koji vraća 500; pokaži da bez provere `fetch` ne baca grešku.
5. Učitaj dve stvari sa `Promise.all`, pa jednu namerno obori i uporedi sa `Promise.allSettled`.
6. Dodaj `AbortController` i prekini zahtev posle 100 ms.

**Gotovo je kad:** umeš da predvidiš redosled ispisa u zadacima sa event loop-om, objasniš closure na sopstvenom primeru i tvoj `fetch` kod ispravno obrađuje 500 i prekid.

## Pitanja sa intervjua

**P: Šta je closure?**
Funkcija „pamti” promenljive iz opsega u kome je napravljena, i kad se pozove kasnije van tog opsega. Koristi se za privatno stanje, fabrike funkcija i callback-e. Klasična zamka: u petlji sa `var` sve funkcije dele istu promenljivu; `let` pravi novu po iteraciji.

**P: Kako radi event loop?**
JS izvršava kod u jednoj niti. Kad se stek isprazni, prvo se izvrše svi microtask-ovi (Promise.then, await nastavci), pa jedan macrotask (setTimeout, događaj, mreža), pa ponovo microtask-ovi. Zato Promise.then ide pre setTimeout(0).

**P: Koja je razlika između `==` i `===`?**
`===` poredi i tip i vrednost bez konverzije. `==` prvo pretvara tipove po složenim pravilima (`"0" == 0` je true, `null == undefined` je true). U praksi se koristi `===`.

**P: Da li fetch baca grešku kad server vrati 500?**
Ne. fetch odbija Promise samo za mrežnu grešku ili prekid (AbortController); 404 i 500 su uspešni odgovori sa ok: false, pa se response.ok proverava ručno i baca greška.

**P: Koja je razlika između let, const i var?**
let i const imaju blok opseg i do deklaracije su u TDZ (pristup baca ReferenceError); const zabranjuje novu dodelu, ne izmenu objekta. var ima opseg funkcije i pre deklaracije tiho vraća undefined, pa se ne koristi.

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

## Izvori
- [JavaScript data types and data structures (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)
- [Equality operators (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality)
- [Closures (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [JavaScript execution model: event loop (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [Microtasks (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [Window.fetch() (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
=====
---
id: 22
subtitle: "tipovi u editoru, ne u izvršavanju: interfejsi, unije, sužavanje, generici, pomoćni tipovi, strict"
minutes: 45
---
# 22 TypeScript

TypeScript je JavaScript sa tipovima koji postoje **samo pri pisanju i buildu**: kompajler proveri tipove, zatim ih obriše i ostaje običan JS. Greške poput „pogrešno ime polja” i „možda je undefined” vidiš u editoru, a ne kod korisnika. Aktuelna verzija je TypeScript 7 (jul 2026.), kompajler prenet u Go, oko deset puta brži, sa istom proverom tipova kao 6.0.

## Pojmovi

### Opis oblika

```ts
interface Book {
  id: number
  title: string
  author?: string          // opciono: string | undefined
  readonly isbn: string    // samo za čitanje (u kompajleru)
}

type LoanStatus = 'active' | 'returned' | 'overdue'                  // literal unija
type Result = { ok: true; loan: Loan } | { ok: false; error: string } // discriminated union

function lateFee(days: number, perDay = 20): number { return days * perDay }

async function getJson<T>(url: string): Promise<T> {                  // generik
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>   // obećanje kompajleru, NE provera
}
const books = await getJson<Book[]>('/api/books')
```

- **Strukturno tipiziranje**: poredi se oblik, ne ime. Objekat sa svim traženim poljima odgovara tipu, iako nigde ne piše `implements` (za razliku od C#-a).
- `interface` ili `type`: oba opisuju objekte; `type` zna i unije i izvedene tipove, `interface` se može proširivati (`extends`, spajanje deklaracija). U praksi: dosledno jedno.

### Sužavanje tipa (narrowing)

```ts
function show(r: Result) {
  if (r.ok) console.log(r.loan.id)   // ovde je r { ok: true; loan }
  else console.log(r.error)
}

function duzina(x: string | number) {
  if (typeof x === 'string') return x.length   // typeof suzi na string
  return x                                      // ostao je samo number
}

function isStatus(x: unknown): x is LoanStatus {   // type guard: sopstvena provera
  return x === 'active' || x === 'returned' || x === 'overdue'
}
```

Sužavaju `typeof`, `instanceof`, `in`, poređenje sa literalom, provera `null`/`undefined` i type guard. **Iscrpna provera**: u `default` grani `switch`-a dodela `const never_: never = x` ne prolazi ako je neki slučaj zaboravljen.

### Korisni alati

```ts
const statuses = ['active', 'returned'] as const      // readonly ['active', 'returned']
type S = (typeof statuses)[number]                    // 'active' | 'returned'
type BookPreview = Pick<Book, 'id' | 'title'>         // samo neka polja
type BookDraft = Partial<Book>                        // sva polja opciona (PATCH)
type NoIsbn = Omit<Book, 'isbn'>
type ById = Record<number, Book>
const cfg = { width: 'wide' } satisfies { width: string } // proveri, ali zadrži precizan tip
```

- `unknown` umesto `any`: `any` isključuje proveru, `unknown` traži sužavanje pre upotrebe. Za JSON i podatke spolja: `unknown`.
- **`strict`** uključuje proveru `null`/`undefined`, implicitnog `any` i još desetak provera. Od TypeScript 6.0 je **podrazumevano uključen**; ostavi `"strict": true` eksplicitno u `tsconfig.json`, da se vidi namera.
- `noUncheckedIndexedAccess`: `niz[i]` je `T | undefined`, jer indeks može da promaši. Nije deo `strict`-a, ali hvata prave greške.

### Tipovi u izvršavanju ne postoje

```ts
const data: Book = await (await fetch('/api/books/1')).json()   // tip laže ako server pošalje drugo
```

Za podatke spolja postoje dva puta: verovati ugovoru koji je **generisan** iz API-ja (OpenAPI → tipovi, pa se neslaganje vidi pri buildu) ili ih **proveriti** u izvršavanju bibliotekom za šeme (npr. zod), pa iz šeme izvesti tip. U ovoj aplikaciji je ugovor ručno usklađen: svaka izmena u `Contracts.cs` ide uz istu u `web/src/api.ts`.

## Dublje

**Šta znači „brisanje tipova”.** Node.js od verzija 22.18 i 23.6 sam izvršava `.ts` fajlove tako što obriše tipove (type stripping, stabilno od 24.12), bez provere. Zato podržava samo sintaksu koja se može samo obrisati: `enum`, `namespace` sa kodom i parametarska svojstva konstruktora traže transformaciju i tu ne rade. Opcija `erasableSyntaxOnly` u `tsconfig.json` zabranjuje takvu sintaksu, pa isti kod radi i u Node-u i u bundleru. Umesto `enum`-a: unija literala ili `as const` objekat. Provera tipova i dalje ide kroz `tsc` (u CI-ju `tsc --noEmit`).

**Provera viška polja.** `const t: Tacka = { x: 1, y: 2, boja: 'c' }` je greška (objektni literal sa nepoznatim poljem je verovatno greška u kucanju), a `const p = { x: 1, y: 2, boja: 'c' }; const t: Tacka = p` prolazi: promenljiva sa više polja ima traženi oblik. Ista pravila objašnjavaju zašto `satisfies` hvata grešku u konfiguraciji, a i dalje zadržava precizan tip.

**Kompromisi pri migraciji.** TypeScript 7 uklanja opcije zastarele u 6.0 (npr. `target: es5`, `moduleResolution: node10`); kod koji čisto prolazi 6.0 bez `ignoreDeprecations` prolazi isto i u 7.0. Projekat koji se oslanjao na stari podrazumevani `strict: false` sada mora to da napiše eksplicitno ili da ispravi greške. Za intervju: „TS ne proverava ništa u izvršavanju; zato granice sistema (API, localStorage, poruke) validiram, a unutra verujem tipovima.”

## Lab

1. Napravi folder, `npm i -D typescript`, prazan `tsconfig.json` (`{}`) i fajl sa `function f(x: string | undefined) { return x.length }`; pokreni `npx tsc --noEmit` i vidi da `strict` hvata grešku i bez podešavanja.
2. Opiši `Result` kao discriminated union i napiši `show(r)` koji u svakoj grani koristi samo polja te grane.
3. Dodaj `switch` po `LoanStatus` sa iscrpnom proverom (`never`), pa dodaj nov status i vidi gde kompajler pukne.
4. Napiši `getJson<T>` i pozovi ga sa pogrešnim tipom; pokaži da kompajler ne vidi grešku, pa dodaj proveru u izvršavanju (ručni type guard ili šemu).
5. Pokreni `.ts` fajl direktno u Node-u (`node app.ts`, Node 22.18+), pa dodaj `enum` i vidi grešku; uključi `erasableSyntaxOnly`.
6. Iz `Book` napravi `Pick`, `Partial` i `Omit` tipove i upotrebi ih u funkciji za izmenu knjige.

**Gotovo je kad:** umeš da objasniš zašto TS ne proverava JSON sa servera i kako to rešavaš, a sužavanje i discriminated union koristiš bez `as` kastovanja.

## Pitanja sa intervjua

**P: Koja je razlika između `any` i `unknown`?**
any isključuje proveru tipova: sve je dozvoljeno, greške se vide tek u izvršavanju. unknown kaže „ne znam šta je” i ne dozvoljava upotrebu dok tip ne suziš proverom (typeof, instanceof, validacija). Za podatke spolja (JSON, API) bolji je unknown.

**P: Šta je strukturno tipiziranje?**
TypeScript poredi oblik, ne ime tipa: objekat koji ima sva tražena polja odgovara tipu, iako nije „deklarisan” kao taj tip. Za razliku od C#-a, gde klasa mora eksplicitno da implementira interfejs.

**P: Da li TypeScript tipovi postoje u izvršavanju?**
Ne. Kompajler ih briše, ostaje čist JS. Zato TS ne proverava JSON koji stigne sa API-ja: ako server vrati nešto drugo, tip laže. Za proveru u izvršavanju koristi se validacija (npr. zod) ili jasan ugovor sa API-jem.

**P: Šta se promenilo u TypeScript-u 6 i 7?**
TS 6.0 je uključio strict kao podrazumevan i zastareo stare opcije (target es5, moduleResolution node10); TS 7.0 (jul 2026.) je kompajler prenet u Go, oko deset puta brži, sa istom proverom tipova, a zastarele opcije su uklonjene.

**P: Zašto izbegavaš enum u novom TypeScript kodu?**
enum nije samo tip nego pravi kod pri prevođenju, pa ne radi u alatima koji samo brišu tipove (Node type stripping, erasableSyntaxOnly). Unija string literala ili as const objekat daje istu sigurnost bez generisanog koda.

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

## Izvori
- [Narrowing (TypeScript Handbook)](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility types (TypeScript Handbook)](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Type compatibility (TypeScript Handbook)](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [Announcing TypeScript 6.0 (strict podrazumevan)](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Node.js: Modules: TypeScript (type stripping)](https://nodejs.org/api/typescript.html)
=====
---
id: 23
subtitle: "UI = f(stanje): komponente, JSX, props, stanje, render i commit, liste i key, kontrolisana polja"
minutes: 50
---
# 23 React osnove

React je biblioteka za korisnički interfejs u kojoj opisuješ **kako ekran treba da izgleda za dato stanje**, a React sam menja DOM kad se stanje promeni: UI = f(stanje). Ne pišeš „dodaj red u tabelu”, nego „tabela prikazuje ove knjige”. Aktuelna verzija je React 19 (19.3).

## Pojmovi

### Komponenta i JSX

```tsx
function BookCard({ book, onLend }: { book: Book; onLend: (id: number) => void }) {
  return (
    <article className="card">
      <h3>{book.title}</h3>                         {/* {} ubacuje JS izraz */}
      {book.available === 0 && <p>Nema slobodnih</p>} {/* uslovni prikaz */}
      <button type="button" disabled={book.available === 0} onClick={() => onLend(book.id)}>
        Pozajmi
      </button>
    </article>
  )
}
```

- Komponenta je **funkcija koja vraća JSX**; ime počinje velikim slovom.
- JSX se prevodi u pozive funkcija koje prave opis interfejsa. Razlike od HTML-a: `className`, `htmlFor`, `onClick`, jedan koreni element (ili fragment `<>…</>`).
- React **escapuje tekst**: naslov `<script>…` se prikaže kao tekst (zaštita od XSS). Rupe ostaju `dangerouslySetInnerHTML` i korisnički URL u `href` (React 19 blokira `javascript:` URL, ali proveri i ostale šeme).
- Zamka uslovnog prikaza: `{count && <p/>}` za `count = 0` ispiše „0”; piši `{count > 0 && …}`.

### Props: podaci naniže, događaji naviše

**Jednosmerni tok**: roditelj drži stanje i šalje ga deci kroz props (samo za čitanje). Dete ne menja props, nego pozove funkciju koju je dobilo (`onLend(id)`), a roditelj promeni stanje. Kad dve komponente dele stanje, ono ide u njihovog najbližeg zajedničkog roditelja („lifting state up”). `children` je prop sa sadržajem između oznaka (`<Window>…</Window>`).

### Stanje i ciklus rendera

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  return <button type="button" onClick={() => setCount((c) => c + 1)}>Klikova: {count}</button>
}
```

Događaj → `setState` → **render** (React ponovo pozove funkciju komponente) → poređenje novog i starog stabla elemenata → **commit** (menja se samo razlika u pravom DOM-u).

- **Render mora biti čist**: bez poziva API-ja i menjanja spoljnih promenljivih, jer ga React može pozvati više puta. `StrictMode` u razvoju namerno renderuje dvaput (i dvaput pokreće efekte) da takve greške izađu na videlo.
- Stanje se **ne menja na mestu**: `setBooks([...books, nova])`, ne `books.push(nova)`. React poredi `Object.is(staro, novo)`; ista referenca znači „ništa se nije promenilo”.
- **Funkcijski update** kad nova vrednost zavisi od stare: `setCount((c) => c + 1)`. Vrednost `count` u jednom renderu je konstanta (snimak); tri puta `setCount(count + 1)` daje +1, a tri puta `setCount(c => c + 1)` daje +3.
- **Izvedeno stanje se ne čuva**: `const available = books.filter(…)` se računa u renderu, ne ide u `useState`.
- Render izazivaju: promena sopstvenog stanja, render roditelja i promena konteksta koji komponenta koristi.

### Liste i key

```tsx
<ul>{books.map((b) => <BookCard key={b.id} book={b} onLend={lend} />)}</ul>
```

`key` govori React-u koji element je koji između dva rendera. Stabilan ID čuva stanje i DOM pravog reda; indeks niza kao key „seli” stanje na pogrešnu stavku kad se lista sortira ili se iz nje briše. Promena `key`-a namerno pravi novu instancu komponente (resetuje joj stanje).

### Kontrolisano polje

```tsx
const [query, setQuery] = useState('')
<input value={query} onChange={(e) => setQuery(e.target.value)} />
```

Vrednost je u React stanju, pa je stanje jedini izvor istine (lako validirati, očistiti, menjati programski). **Nekontrolisano** polje čuva vrednost u DOM-u i čita se po potrebi (`ref`, `FormData`); React 19 forme sa `action` (pogl. 27) rade baš tako.

## Dublje

**Zašto React ne menja DOM odmah.** Svaki `setState` u istom događaju se grupiše (batching, od React 18 i u Promise-ima i tajmerima), pa sledi jedan render i jedan commit. Poređenje stabala (reconciliation) radi po pretpostavkama: drugi tip elementa na istom mestu znači novo podstablo, a deca liste se upare po `key`-u. Zato je `key` deo identiteta, a ne ukras.

**React 19 u praksi.** `ref` je običan prop (bez `forwardRef`), `<title>` i `<meta>` iz komponente idu u `<head>`, Actions (`useActionState`, `useOptimistic`, `<form action>`) i `use()` za čitanje Promise-a i konteksta. React 19.2 je dodao `<Activity>` (sakrij deo ekrana uz očuvano stanje) i `useEffectEvent`. React Compiler 1.0 (oktobar 2025.) sam memoizuje komponente pri buildu, pa ručni `useMemo`/`useCallback` postaje ređi (pogl. 24, 28).

**Šta reći na intervjuu o virtuelnom DOM-u.** Nije poenta da je „virtuelni DOM brži od DOM-a” (dodatni posao ne može biti brži od direktne izmene), nego da deklarativni opis plus poređenje daje dovoljno brze izmene bez ručnog praćenja šta se promenilo. Za stvarna uska grla postoje memoizacija, virtualizacija dugih lista i deljenje stanja.

## Lab

1. Napravi projekat (`npm create vite@latest`, šablon react-ts) i komponentu `BookCard` sa props-ima `book` i `onLend`.
2. U `BooksPage` drži listu knjiga u stanju; „Pozajmi” smanjuje `available` pravljenjem novog niza (`map` + spread), ne izmenom.
3. Napiši namerno `books.push(...)` + `setBooks(books)`, uveri se da se ekran ne osvežava, pa ispravi.
4. Dodaj sortiranje i u svaku karticu `<input>` za belešku; prikaži razliku između `key={index}` i `key={b.id}` posle sortiranja.
5. Dodaj pretragu kao kontrolisano polje i filtriranu listu kao izvedenu vrednost (bez drugog `useState`-a).
6. U `StrictMode` dodaj `console.log` u telo komponente i objasni zašto se ispisuje dvaput.

**Gotovo je kad:** podaci teku naniže, događaji naviše, nijedno stanje se ne menja na mestu, a umeš da pokažeš grešku sa `key={index}` i objasniš je.

## Pitanja sa intervjua

**P: Kada se React komponenta ponovo iscrtava (re-render)?**
Kad se promeni njeno stanje (setState), kad se iscrta roditelj (i props se nisu promenili, osim uz memo), ili kad se promeni context koji koristi. Re-render znači ponovo pozvati funkciju komponente; React zatim upoređuje rezultat i menja samo ono što se razlikuje u DOM-u.

**P: Zašto se stanje ne menja direktno (`niz.push(x)`)?**
React poredi staro i novo stanje po referenci. Ako izmeniš isti niz, referenca je ista i React ne zna da je nešto promenjeno, pa ne iscrta. Novo stanje se pravi kao nova vrednost: `setNiz([...niz, x])`.

**P: Čemu služi `key` u listi?**
key govori React-u koja stavka je koja između dva iscrtavanja, pa može da sačuva stanje i DOM tačne stavke pri dodavanju, brisanju ili promeni redosleda. Treba stabilan, jedinstven ID; indeks niza je loš izbor kad se lista menja.

**P: Zašto se komponenta u razvoju renderuje dvaput?**
StrictMode u razvoju namerno poziva render (i efekte) dvaput, da izađu na videlo nečiste komponente i efekti bez čišćenja. U produkciji toga nema; ako dupli render nešto kvari, render ima sporedni efekat.

**P: Šta je novo u React-u 19 što koristiš?**
ref kao običan prop umesto forwardRef, Actions sa useActionState i useOptimistic, use() za Promise i kontekst, title i meta iz komponente, a od 19.2 Activity i useEffectEvent; React Compiler 1.0 sam memoizuje pri buildu.

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

## Izvori
- [React 19 (react.dev blog)](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2 (react.dev blog)](https://react.dev/blog/2025/10/01/react-19-2)
- [React Compiler v1.0 (react.dev blog)](https://react.dev/blog/2025/10/07/react-compiler-1)
- [Render and Commit (react.dev)](https://react.dev/learn/render-and-commit)
- [Updating Arrays in State (react.dev)](https://react.dev/learn/updating-arrays-in-state)
- [Rendering Lists: key (react.dev)](https://react.dev/learn/rendering-lists)
- [Sharing State Between Components (react.dev)](https://react.dev/learn/sharing-state-between-components)
- [StrictMode (react.dev)](https://react.dev/reference/react/StrictMode)
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
Efekat ili callback uhvati vrednost stanja iz iscrtavanja u kome je napravljen. Ako se ne doda u niz zavisnosti, i dalje vidi staru vrednost. Rešenje: tačne zavisnosti, funkcijski oblik setState (`setBroj(b => b + 1)`) ili useRef za vrednost koja ne treba da izaziva iscrtavanje. Od React 19.2 postoji i `useEffectEvent`: funkcija koju efekat poziva uvek vidi najnovije props-e i stanje, a ne mora u niz zavisnosti (samo za „događaje” iz efekta, ne da bi se ućutkao linter).

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
> useMemo ima svoju cenu. Koristi se kad je izračunavanje skupo ili kad stabilna referenca sprečava suvišna iscrtavanja dece (uz memo). Uz React Compiler (stabilan od oktobra 2025.) memoizacija se dodaje automatski pri buildu, pa ručni useMemo ostaje za retke slučajeve.
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

**P: Šta React 19 menja u radu sa formama?**
Forma može da dobije funkciju kao `action`: React sam spreči ponovno učitavanje, prosledi `FormData`, a posle uspeha resetuje nekontrolisana polja. `useActionState` daje rezultat poslednjeg slanja i `isPending`, `useFormStatus` dugmetu kaže da je slanje u toku, a `useOptimistic` odmah prikaže očekivani ishod. Za složenu validaciju i dalje su korisne biblioteke formi.

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

**P: Da li Vite proverava TypeScript tipove?**
Ne. Vite pri prevođenju samo briše tipove, da bi bio brz; tipove proverava `tsc` (zato je build `tsc -b && vite build`, a u razvoju greške prikazuje editor). Od Vite 8 i produkcijski build i razvoj idu kroz jedan bundler, Rolldown (Rust), a TypeScript 7 je proveru tipova ubrzao oko deset puta.

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
> memo preskače iscrtavanje kad su props isti po referenci. Prvo izmeri (React DevTools Profiler), pa optimizuj. React Compiler (1.0, oktobar 2025.) ovo radi sam pri buildu, pa u novim projektima ručni memo/useCallback treba ređe.
