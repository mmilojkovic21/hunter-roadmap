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
subtitle: "pravila hookova, useEffect i cleanup, useRef, memoizacija i React Compiler, context, custom hookovi"
minutes: 50
---
# 24 Hookovi

Hookovi su funkcije koje počinju sa `use` i daju komponenti mogućnosti: stanje, efekte, reference, kontekst. Pravilo: pozivaju se **samo na vrhu komponente** (ili sopstvenog hooka), nikad u `if`-u, petlji ili posle ranog `return`-a, jer ih React prepoznaje **po redosledu poziva**.

## Pojmovi

### Pregled

| Hook | Za šta |
|---|---|
| `useState` | lokalno stanje |
| `useReducer` | složenije stanje sa akcijama (`dispatch({ type: 'add' })`) |
| `useEffect` | sinhronizacija sa spoljnim sistemom posle rendera (tajmer, pretplata, DOM API, veza) |
| `useRef` | vrednost koja preživi render a ne izaziva ga; pristup DOM elementu |
| `useMemo` / `useCallback` | pamti izračunatu vrednost / funkciju dok se zavisnosti ne promene |
| `useContext` | čita vrednost koju je dao neki predak (tema, jezik, korisnik) |
| `useEffectEvent` | (19.2) funkcija koju efekat poziva, a koja vidi najnovije props-e bez ponovnog pokretanja efekta |
| `use` | (19) čita Promise (uz Suspense) ili kontekst; sme i u uslovu |

### useEffect

```tsx
useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 1000)
  return () => clearInterval(id)        // cleanup: pre sledećeg pokretanja i pri uklanjanju
}, [])                                  // [] = samo pri montiranju

useEffect(() => {
  document.title = `Knjige (${count})`
}, [count])                             // ponovo kad se count promeni
```

- Bez niza zavisnosti efekat ide posle **svakog** rendera; sa `[]` jednom; sa `[a, b]` kad se `a` ili `b` promene (poređenje `Object.is`).
- Izostavljena zavisnost = efekat vidi zastarelu vrednost (**stale closure**). Linter (`eslint-plugin-react-hooks`) to hvata; ne ućutkuj ga.
- U razvoju `StrictMode` namerno pokrene efekat, cleanup, pa efekat ponovo: ako to nešto pokvari, fali cleanup.
- **Često efekat nije potreban**: izvedena vrednost se računa u renderu, reakcija na klik ide u handler, reset stanja na promenu props-a ide preko `key`.
- Podaci sa servera se u praksi ne dohvataju ručnim `useEffect` + `fetch` (trke, keš, ponovni pokušaji): koristi se biblioteka (pogl. 25).

### useRef i memoizacija

```tsx
const inputRef = useRef<HTMLInputElement>(null)
<input ref={inputRef} />
inputRef.current?.focus()                                   // pristup DOM-u, bez rendera

const sorted = useMemo(() => [...books].sort(byTitle), [books])   // ne sortiraj pri svakom renderu
const handleLend = useCallback((id: number) => lend(id), [lend])  // ista funkcija između rendera
const Row = memo(function Row({ book }: { book: Book }) { /* ... */ })
```

`useMemo`/`useCallback` i `memo` su **optimizacija**: koriste se kad je merljivo potrebno (React DevTools Profiler), ne svuda. **React Compiler** (stabilan od oktobra 2025.) ih dodaje automatski pri buildu, pa u novim projektima ručna memoizacija treba retko. U React-u 19 `ref` je običan prop: `function Input({ ref, ...p }) { return <input ref={ref} {...p} /> }`, bez `forwardRef`.

### Context

```tsx
const ThemeContext = createContext<'light' | 'dark'>('light')
<ThemeContext value="dark"><App /></ThemeContext>          // React 19: sam context je Provider
const theme = useContext(ThemeContext)                       // bilo gde ispod
```

Context rešava „prop drilling”. Svaka promena vrednosti renderuje **sve** koji ga čitaju, pa nije za podatke koji se često menjaju niti za podatke sa servera. Za deljeno UI stanje sa renderom samo kad se promeni pročitano polje postoje mali store-ovi kao Zustand (Zalihe, pogl. 30).

### Custom hook

```tsx
function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
const search = useDebounced(query)   // pretraga tek kad korisnik prestane da kuca
```

Custom hook deli **logiku**, ne stanje: svaka komponenta koja ga pozove dobija svoje stanje.

## Dublje

**useEffectEvent: rešenje za „efekat zavisi od svega”.** Efekat za vezu sa sobom za ćaskanje treba da se ponovo poveže kad se promeni `roomId`, ali ne i kad se promeni `theme`, koju koristi samo u obaveštenju. Ako `theme` stoji u zavisnostima, veza se prekida pri svakoj promeni teme; ako ne stoji, obaveštenje vidi staru temu. `useEffectEvent` izdvaja taj deo: funkcija uvek vidi najnovije vrednosti, a efekat zavisi samo od `roomId`. Nije za ućutkivanje lintera nego za „događaje” koji se pale iz efekta.

```tsx
const onConnected = useEffectEvent(() => showNotification('Povezano', theme))
useEffect(() => {
  const c = createConnection(roomId)
  c.on('connected', () => onConnected())
  c.connect()
  return () => c.disconnect()
}, [roomId])
```

**useReducer kad stanje ima pravila.** Kad se više polja menja zajedno (lista, filter, izabrana stavka) ili sledeće stanje zavisi od prethodnog po pravilu, reducer `(stanje, akcija) => novoStanje` je čista funkcija koja se testira bez React-a, isto kao pravila igre u `Hunter.Core`.

**Zašto redosled hookova.** React čuva stanje komponente kao listu „ćelija”; prvi `useState` dobija prvu ćeliju, drugi drugu. Hook u `if`-u pomeri sve kasnije ćelije čim se uslov promeni, pa komponenta dobije tuđe stanje. Zato se uslov stavlja **unutar** hooka (`useEffect(() => { if (!user) return; … })`). Izuzetak je `use`, koji sme u uslovu.

## Lab

1. Napiši komponentu `Sat` sa `setInterval` u `useEffect`-u; ukloni cleanup i u `StrictMode` vidi kako se sat ubrzava, pa vrati cleanup.
2. Napiši `useDebounced` i upotrebi ga za pretragu; u Network tabu proveri da zahtev ide tek kad prestaneš da kucaš.
3. Namerno izostavi zavisnost iz efekta, vidi upozorenje lintera i grešku zastarele vrednosti, pa ispravi (zavisnost ili funkcijski update).
4. Prebaci temu u context (React 19 oblik `<ThemeContext value=…>`) i čitaj je u dubokoj komponenti bez props-a.
5. Fokusiraj polje pretrage pri otvaranju stranice preko `useRef`.
6. Napravi listu od 2.000 redova, izmeri render u React DevTools Profiler-u, pa uporedi sa `memo` (ili sa uključenim React Compiler-om).

**Gotovo je kad:** svaki efekat ima tačne zavisnosti i cleanup gde treba, umeš da kažeš kada efekat nije potreban, a memoizaciju dodaješ tek posle merenja.

## Pitanja sa intervjua

**P: Koja su pravila hookova?**
Hookovi se pozivaju samo na najvišem nivou komponente ili sopstvenog hooka, nikad u if-u, petlji ili posle ranog return-a, i samo iz React funkcija. React prepoznaje hook po redosledu poziva, pa redosled mora biti isti pri svakom iscrtavanju.

**P: Čemu služi cleanup funkcija u useEffect?**
Vraća se iz efekta i React je poziva pre sledećeg pokretanja efekta i pri uklanjanju komponente. Tu se odjavljuju pretplate, brišu tajmeri i prekidaju zahtevi (AbortController), da ne bi curela memorija ili stizali odgovori za komponentu koje više nema.

**P: Šta je „stale closure” u hookovima?**
Efekat ili callback uhvati vrednost stanja iz iscrtavanja u kome je napravljen. Ako se ne doda u niz zavisnosti, i dalje vidi staru vrednost. Rešenje: tačne zavisnosti, funkcijski oblik setState (`setBroj(b => b + 1)`) ili useRef za vrednost koja ne treba da izaziva iscrtavanje. Od React 19.2 postoji i `useEffectEvent`: funkcija koju efekat poziva uvek vidi najnovije props-e i stanje, a ne mora u niz zavisnosti (samo za „događaje” iz efekta, ne da bi se ućutkao linter).

**P: Kada ti ne treba useEffect?**
Kad se vrednost može izračunati u renderu (filtrirana lista, zbir), kad reaguješ na akciju korisnika (to ide u handler) i kad treba resetovati stanje na promenu props-a (key). Efekat je za sinhronizaciju sa spoljnim sistemom: pretplata, tajmer, DOM API, veza.

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

## Izvori
- [Rules of Hooks (react.dev)](https://react.dev/reference/rules/rules-of-hooks)
- [useEffect (react.dev)](https://react.dev/reference/react/useEffect)
- [You Might Not Need an Effect (react.dev)](https://react.dev/learn/you-might-not-need-an-effect)
- [useEffectEvent (react.dev)](https://react.dev/reference/react/useEffectEvent)
- [createContext: context kao Provider u React 19 (react.dev)](https://react.dev/reference/react/createContext)
- [React Compiler (react.dev)](https://react.dev/learn/react-compiler)
=====
---
id: 25
subtitle: "serversko i klijentsko stanje, TanStack Query (ključ, staleTime, mutacije, invalidacija), polling, SSE, WebSocket, SignalR"
minutes: 55
---
# 25 Podaci sa servera

Postoje dve vrste stanja: **stanje UI-ja** (otvoren modal, uneti tekst) i **stanje sa servera** (knjige, pozajmice). Ovo drugo nije naše: može da zastari, deli se između ekrana, treba ga keširati i osvežavati. Zato za njega postoje posebne biblioteke.

## Pojmovi

### Ručno: koliko toga treba

```tsx
const [books, setBooks] = useState<Book[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)
useEffect(() => {
  const ac = new AbortController()                     // trka: stari odgovor ne sme da pregazi novi
  fetch(`/api/books?search=${encodeURIComponent(search)}`, { signal: ac.signal })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then(setBooks)
    .catch((e) => { if (e.name !== 'AbortError') setError(e) })
    .finally(() => setLoading(false))
  return () => ac.abort()
}, [search])
// i dalje nema: keša, deljenja između ekrana, ponovnih pokušaja, osvežavanja posle izmene…
```

### TanStack Query

```tsx
const { data, isPending, isError, error } = useQuery({
  queryKey: ['books', { search, page }],              // ključ keša: sve od čega zavise podaci
  queryFn: ({ signal }) => getJson<Book[]>(`/api/books?search=${search}&page=${page}`, signal),
  staleTime: 30_000,                                  // 30 s smatraj sveže
})

const queryClient = useQueryClient()
const lend = useMutation({
  mutationFn: (bookId: number) => postJson(`/api/books/${bookId}/loans`, { days: 14 }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }), // sve liste knjiga
})
lend.mutate(42)                                       // lend.isPending, lend.error za UI
```

- **Keš po ključu**: komponente sa istim ključem dele podatke i jedan zahtev (deduplikacija). Ključ sadrži sve parametre; `['books']` invalidira i `['books', { page: 2 }]` (poklapanje po prefiksu).
- Posle izmene, mutacija proglasi povezane ključeve **zastarelim**; aktivni upiti se odmah ponovo učitaju.

| Pojam | Značenje (podrazumevano u v5) |
|---|---|
| `staleTime` | koliko su podaci „sveži”, bez novog zahteva; **0** |
| `gcTime` | koliko nekorišćen keš ostaje u memoriji; **5 min** |
| `refetchOnWindowFocus` | osveži kad se korisnik vrati na tab; **uključeno** |
| `retry` | ponovni pokušaji upita: **3** u browseru, sa pauzom 1, 2, 4 s… (najviše 30 s); mutacije **0**; za 4xx nema smisla |
| `isPending` | još nema podataka (u v5 zamenio stari `isLoading` za ovo značenje) |
| optimistic update | UI se promeni odmah, pre odgovora, i vrati ako server odbije |

### Kad podatke promeni neko drugi

Invalidacija posle mutacije osveži samo tab koji je napravio izmenu. Ako kolega upiše prijem robe, tvoj ekran to ne zna dok se ne vratiš na prozor. Server mora nekako da javi:

| Način | Kako radi | Dobro | Loše |
|---|---|---|---|
| Polling | klijent pita na N sekundi (`refetchInterval: 10_000`) | najjednostavnije | kašnjenje do N s, prazni zahtevi |
| Long polling | zahtev „visi” dok nema novosti, pa odmah sledeći | običan HTTP | otvorena veza po klijentu |
| SSE | jedna HTTP veza, server šalje događaje (`EventSource`) | jednostavno, sam se ponovo poveže | samo server → klijent, samo tekst |
| WebSocket | HTTP zahtev se nadogradi (`Upgrade`) u trajnu dvosmernu vezu | najbrže, oba smera | ponovno povezivanje i grupe su tvoj posao |

**SignalR** je .NET biblioteka iznad toga: bira WebSocket, a ako ne može, SSE ili long polling; daje grupe, ponovno povezivanje i pozive po imenu poruke (`@microsoft/signalr` za klijent).

```csharp
public class LibraryHub : Hub { }                          // klijenti samo slušaju
await hub.Clients.All.SendAsync("booksChanged");          // posle uspešnog upisa (IHubContext iz DI)
```

```ts
connection.on('booksChanged', () => queryClient.invalidateQueries({ queryKey: ['books'] }))
```

**Obavesti, pa učitaj.** Poruka koja nosi samo „promenilo se” je bezbednija od poruke sa podacima: svako učita kroz isti API sa svojim pravima, a izgubljena poruka se nadoknadi sledećim osvežavanjem. Cena je jedan GET više po ekranu (Zalihe, pogl. 18).

## Dublje

**Zašto `staleTime: 0` nije „bez keša”.** Sa nulom podaci su odmah zastareli, ali keš se i dalje koristi: komponenta odmah prikaže ono što ima, a u pozadini pošalje novi zahtev (stale-while-revalidate). Zato prelaz između stranica deluje trenutno. `staleTime` se podiže za podatke koji se retko menjaju (podešavanja, šifarnici), a `gcTime` određuje koliko dugo napuštena stranica „pamti” svoje podatke.

**Optimistic update bez rupe.** U `onMutate` otkaži tekuće upite za taj ključ (`cancelQueries`), sačuvaj stari keš, upiši očekivani rezultat (`setQueryData`); u `onError` vrati stari; u `onSettled` invalidiraj, da konačnu vrednost ipak potvrdi server. Za jednostavan prikaz u jednoj komponenti postoji i React 19 `useOptimistic`. Optimistic je dobar za lajk ili štikliranje, loš kad konačnu vrednost računa server (cena, stanje zaliha).

**Šta se izgubi kad veza pukne.** Poruke poslate dok veze nije bilo. Zato posle ponovnog povezivanja (`onreconnected` u SignalR-u) invalidiraj sve aktivne upite ili traži „sve posle verzije X”. SSE i WebSocket ne garantuju isporuku; garancija je uvek ponovno čitanje iz izvora istine.

## Lab

1. Napiši listu knjiga ručno (`useEffect` + `fetch` + `AbortController`), pa brzo menjaj pretragu i u Network tabu vidi otkazane zahteve.
2. Prepiši je na `useQuery` sa ključem `['books', { search, page }]`; otvori istu listu u dve komponente i proveri da ide jedan zahtev.
3. Dodaj mutaciju „Pozajmi” sa `invalidateQueries`; proveri da se lista osveži bez ručnog `setState`.
4. Postavi `staleTime: 30_000` i objasni razliku pri povratku na stranicu (DevTools za TanStack Query).
5. Pretvori „Pozajmi” u optimistic update sa vraćanjem na staro kad server vrati grešku (simuliraj 500).
6. Dodaj SignalR (ili SSE) obaveštenje „booksChanged” i otvori aplikaciju u dva taba: izmena u jednom osveži drugi.

**Gotovo je kad:** nijedan podatak sa servera nije u `useState`, ključevi sadrže sve parametre, a izmena u jednom tabu se vidi u drugom bez ručnog osvežavanja.

## Pitanja sa intervjua

**P: Koja je razlika između serverskog i klijentskog stanja?**
Serversko stanje (podaci iz baze) pripada serveru: može da zastari, deli se između korisnika i treba ga keširati i osvežavati. Klijentsko stanje (otvoren meni, unos u formu) živi samo u pregledaču. Za serversko je bolja biblioteka (TanStack Query) nego useState + useEffect.

**P: Šta TanStack Query rešava u odnosu na fetch u useEffect?**
Keširanje po ključu, deduplikaciju istih zahteva, stanja učitavanja i greške, ponovne pokušaje, osvežavanje u pozadini, invalidaciju posle izmene i trku odgovora (stariji odgovor ne pregazi noviji). Ručno sve to je mnogo koda i grešaka.

**P: Kako posle izmene (POST) osvežiš listu na ekranu?**
U onSuccess mutacije pozoveš `queryClient.invalidateQueries({ queryKey: ["porudzbine"] })`. Query se označi kao zastareo i ponovo učita. Alternativa za trenutni prikaz je optimističko ažuriranje keša, uz vraćanje na staro ako server odbije.

**P: Šta su podrazumevana podešavanja TanStack Query-ja i zašto su bitna?**
staleTime 0 (podaci odmah zastareli, ali se keš prikaže i osveži u pozadini), gcTime 5 minuta, osvežavanje pri povratku na tab i 3 ponovna pokušaja upita u browseru (mutacije 0). Zato šifarnici dobijaju veći staleTime, a za 4xx greške se isključuju ponovni pokušaji.

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

## Izvori
- [Important Defaults (TanStack Query)](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [Query Keys (TanStack Query)](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Invalidations from Mutations (TanStack Query)](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
- [Optimistic Updates (TanStack Query)](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [WebSockets API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Overview of ASP.NET Core SignalR (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
=====
---
id: 26
subtitle: "History API, React Router 8: ugnežđene rute, Outlet, guard, parametri, lazy rute, fallback na serveru"
minutes: 40
---
# 26 Rutiranje

U SPA aplikaciji adresu u browseru menja JavaScript (History API), bez novog učitavanja stranice. Ruter za svaku adresu bira koje komponente se prikazuju. Aktuelna verzija je React Router 8 (jun 2026.); sve se uvozi iz paketa `react-router`, a delovi vezani za DOM (npr. `RouterProvider` koji koristi `flushSync`) i iz `react-router/dom`. Raniji paket `react-router-dom` je u v7 bio samo prelazni omot, a v8 ga je uklonio.

## Pojmovi

### Definicija ruta

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,              // guard: nije prijavljen → /login
    children: [{
      element: <Layout />,                 // meni + <Outlet /> gde ide stranica
      children: [
        { index: true, element: <HomePage /> },
        { path: 'books/:id', lazy: async () => ({ Component: (await import('./BookPage')).BookPage }) },
      ],
    }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
```

- **Ugnežđene rute**: roditelj renderuje `<Outlet />` na mestu gde ide dete. Layout (meni, zaglavlje) se piše jednom i ostaje montiran sa svojim stanjem dok se menja samo stranica.
- **Guard** ne crta ništa svoje, samo odluči: pusti dalje (`<Outlet />`) ili preusmeri (`<Navigate to="/login" replace />`). To je UX; prava zaštita je na API-ju (401/403).
- `index: true` je podrazumevano dete (adresa roditelja bez dodatka).

### Navigacija i parametri

```tsx
const { id } = useParams()                        // '/books/:id' → id je string (ili undefined)
const [params, setParams] = useSearchParams()     // ?page=2
const page = Number(params.get('page') ?? 1)
const navigate = useNavigate()
navigate(`/books/${id}`)                          // iz koda (posle uspešne forme)
<Link to="/books">Knjige</Link>                   // umesto <a href>: bez punog učitavanja
<NavLink to="/map">Mapa</NavLink>                 // zna da li je aktivan (aria-current="page")
```

**URL je stanje**: strana tabele, filter i izabrana kartica u URL-u preživljavaju refresh, mogu se poslati linkom, a dugme „nazad” radi kako korisnik očekuje (ova aplikacija tako drži izabrano poglavlje na mapi: `?c=`).

### Lazy rute (code splitting)

Stranica je poseban JS fajl, preuzet tek kad se otvori; prvo učitavanje je manje. U React Router-u preko `lazy` na ruti, ili sa `React.lazy` + `<Suspense>` (tako radi ova aplikacija, pogl. 28).

### Server mora da sarađuje

`/books/42` otvoren direktno ide na server, koji takav fajl nema. Server za sve nepoznate putanje (osim `/api/...` i statičkih fajlova) mora da vrati `index.html`, pa ruter u browseru preuzme:

```nginx
location / { try_files $uri /index.html; }
```

U ASP.NET Core-u isto radi `app.MapFallbackToFile("index.html")` (Zalihe, pogl. 18). Nepoznat `/api/...` treba da ostane 404, a ne da vrati HTML.

## Dublje

**Tri načina rada React Router-a (od v7, i dalje u v8).** *Declarative* (`<BrowserRouter>` + `<Routes>`): samo mapiranje adresa. *Data* (`createBrowserRouter`): uz rute idu `loader` (podaci pre prikaza), `action` (slanje forme) i stanja navigacije. *Framework* (Vite plugin, nasleđe Remix-a): rutiranje po fajlovima, SSR, prerender i tipovi po ruti. SPA sa TanStack Query-jem obično koristi data ili declarative način i ostavlja podatke Query-ju; loader je koristan kad podaci moraju da stignu pre prikaza (bez „treperenja” praznog ekrana).

**Fokus i pristupačnost posle navigacije.** Pun reload sam vraća fokus na vrh stranice i čitač ekrana najavi novi naslov; SPA to ne radi. Zato se posle promene rute postavi `document.title` i fokus pomeri na `<main>` ili naslov stranice, a meni koristi `NavLink` sa `aria-current="page"`. Ova aplikacija posle boot ekrana takođe vraća fokus na `<main>`.

**Kada ne SPA.** Javne stranice kojima trebaju pretraživači i brzo prvo iscrtavanje (prodavnica, blog) bolje rade sa SSR-om ili prerenderom (React Router framework način, Next.js). Interni alat iza prijave (Zalihe, Hunter Roadmap) je dobar SPA: SEO nije bitan, a prvo učitavanje se plati jednom.

## Lab

1. Napravi ruter sa `Layout`-om (meni + `<Outlet />`), početnom stranom i stranom `/books/:id` koja čita `useParams`.
2. Dodaj `RequireAuth` guard koji neprijavljenog šalje na `/login` sa `replace`, i posle prijave ga vrati na adresu sa koje je došao (`state.from`).
3. Stavi stranu tabele u `?page=` preko `useSearchParams`; proveri da refresh i „nazad” rade.
4. Napravi `/books/:id` lazy rutom i u Network tabu vidi da se fajl preuzima tek pri otvaranju.
5. Napravi build, posluži `dist` kroz nginx (ili `vite preview`) i otvori `/books/42` direktno: bez fallback-a 404, sa `try_files` radi.
6. Zameni jedan `<a href>` u meniju sa `<Link>` i u Network tabu uporedi broj zahteva.

**Gotovo je kad:** refresh na bilo kojoj adresi radi i u produkcijskom buildu, stanje tabele je u URL-u, a zaštićene strane preusmeravaju neprijavljenog korisnika.

## Pitanja sa intervjua

**P: Kako radi rutiranje u SPA aplikaciji?**
Server uvek vrati isti index.html, a ruter u pregledaču čita putanju (History API) i prikazuje odgovarajuću komponentu. Klik na Link menja URL bez novog učitavanja stranice. Zato server mora da za nepoznate putanje vrati index.html, inače refresh na `/porudzbine/5` daje 404.

**P: Zašto Link, a ne `<a href>`?**
`<a href>` učitava celu stranicu ponovo: gubi se stanje i keš, i ponovo se preuzima JS. Link menja URL kroz ruter, a React samo zameni prikaz. Za spoljne linkove ostaje običan `<a>`.

**P: Šta su ugnežđene rute?**
Roditeljska ruta crta zajednički okvir (meni, zaglavlje) i `<Outlet />` na mestu gde ide dete. Deca menjaju samo svoj deo, a okvir ostaje montiran sa svojim stanjem.

**P: Koji su načini rada React Router-a?**
Declarative (BrowserRouter i Routes, samo mapiranje adresa), Data (createBrowserRouter sa loader-ima, action-ima i stanjem navigacije) i Framework (Vite plugin: rutiranje po fajlovima, SSR, prerender, tipovi po ruti). SPA sa TanStack Query-jem obično koristi Data ili Declarative način.

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

## Izvori
- [Picking a Mode (React Router)](https://reactrouter.com/start/modes)
- [Routing u Data načinu (React Router)](https://reactrouter.com/start/data/routing)
- [NavLink (React Router)](https://reactrouter.com/api/components/NavLink)
- [History API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [Static files i MapFallbackToFile (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/map-static-files)
=====
---
id: 27
subtitle: "kontrolisane forme, validacija na dva mesta, React 19 Actions, pristupačne greške, i18n i Intl"
minutes: 45
---
# 27 Forme i jezici

Forma je mesto gde korisnik šalje podatke, pa tu greške najviše bole: izgubljen unos, nejasna poruka, duplo slanje. Drugi deo poglavlja je prikaz teksta, brojeva i datuma na jeziku korisnika.

## Pojmovi

### Kontrolisana forma

```tsx
function LoanForm({ onSubmit }: { onSubmit: (days: number) => void }) {
  const [days, setDays] = useState('14')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {  // React 19.3 tipovi: SubmitEvent (FormEvent je zastareo)
    e.preventDefault()                                    // bez ponovnog učitavanja stranice
    const n = Number(days)
    if (!Number.isInteger(n) || n < 1) { setError('Unesite broj dana'); return }
    onSubmit(n)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="days">Broj dana</label>
      <input id="days" inputMode="numeric" value={days}
        onChange={(e) => { setDays(e.target.value); setError(null) }}
        aria-invalid={!!error} aria-describedby={error ? 'days-error' : undefined} />
      {error && <p id="days-error" role="alert">{error}</p>}
      <button type="submit">Pozajmi</button>
    </form>
  )
}
```

- Svako polje ima `<label>` (`htmlFor` = `id`); greška je **tekst** uz polje, povezan sa `aria-describedby`, a `aria-invalid` kaže čitaču da polje nije ispravno. Boja nije jedini nosilac greške.
- Posle neuspelog slanja fokus ide na prvo polje sa greškom.
- Dugme je `type="submit"`, pa Enter šalje formu; `noValidate` isključuje ugrađene poruke browsera kad prikazuješ svoje.

### Validacija na dva mesta

Klijent radi **udobnosti** (odmah, bez zahteva), server radi **ispravnosti** (uvek, jer svako može da pošalje zahtev mimo frontenda). Pravila koja traže bazu („član je dostigao limit”) zna samo server, pa forma mora da prikaže i njegove greške po poljima: ASP.NET Core vraća `ValidationProblemDetails` sa `errors: { "days": ["…"] }` (pogl. 11), a frontend ih mapira na polja. Za velike forme postoje biblioteke (React Hook Form, TanStack Form), često sa šemom (zod) koja daje i tipove.

### React 19 Actions

```tsx
async function pozajmi(_prev: string | null, formData: FormData) {
  const r = await fetch('/api/loans', { method: 'POST', body: formData })
  return r.ok ? null : 'Pozajmica nije uspela'
}

function LoanForm2() {
  const [error, formAction, isPending] = useActionState(pozajmi, null)
  return (
    <form action={formAction}>
      <label htmlFor="days2">Broj dana</label>
      <input id="days2" name="days" defaultValue="14" />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isPending}>{isPending ? 'Šaljem…' : 'Pozajmi'}</button>
    </form>
  )
}
```

Forma dobija funkciju kao `action`: React sam spreči ponovno učitavanje, prosledi `FormData`, vodi `isPending` (nema duplog slanja) i posle uspeha resetuje nekontrolisana polja. `useFormStatus` daje stanje slanja dugmetu u dubini forme, a `useOptimistic` odmah prikaže očekivani ishod.

### Prevodi (i18n)

```json
// sr-Latn.json                                  // en.json
{ "books": { "lend": "Pozajmi",                  { "books": { "lend": "Lend",
             "left": "Ostalo: {{count}}" } }                  "left": "Left: {{count}}" } }
```

```tsx
const { t } = useTranslation()                    // react-i18next
<button>{t('books.lend')}</button>
<span>{t('books.left', { count: 3 })}</span>
```

Tekst nikad direktno u komponenti; ključevi grupisani po oblasti. **API ne šalje prevedene poruke, nego kodove** (`item.sku_duplicate`), koje frontend prevodi. Test proverava da svi jezici imaju iste ključeve.

### Brojevi, datumi, novac: Intl

| | sr-Latn | en |
|---|---|---|
| `new Intl.NumberFormat(lang).format(1284350.5)` | 1.284.350,5 | 1,284,350.5 |
| `new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })` | 1. 10. 2026. | Oct 1, 2026 |
| `Intl.NumberFormat('sr-Latn-RS', { style: 'currency', currency: 'RSD' })` | 1.234,50 RSD | |

Prikaz uvek preko `Intl`, nikad ručno. Unos je teži: u srpskom je zarez decimalni separator, pa polje mora da prihvati `12,5`, a „2.000” je dve hiljade, ne dva. U API ide JSON broj sa tačkom; jezik postoji samo u UI-ju. Server čuva vreme u UTC, a browser ga prikazuje u lokalnoj zoni.

## Dublje

**Množina nije „1 ili više”.** Srpski ima tri oblika: 1 knjiga, 3 knjige, 5 knjiga (i 21 knjiga, 22 knjige). `Intl.PluralRules('sr-Latn').select(n)` vraća kategoriju `one`, `few` ili `other`, a i18next po njoj bira ključ (`left_one`, `left_few`, `left_other`). Zato se tekst sa brojem nikad ne sklapa nadovezivanjem stringova.

**Kontrolisano ili nekontrolisano.** Kontrolisano polje (vrednost u stanju) je dobro kad UI reaguje na svaki znak (pretraga, maska, zavisna polja). Nekontrolisano (`defaultValue` + `FormData` ili `ref`) ima manje rendera i prirodno radi sa React 19 `action`-om i sa formama bez JS-a. Mešanje (polje koje prelazi iz `undefined` u vrednost) daje upozorenje: početna vrednost kontrolisanog polja je `''`, ne `undefined`.

**Duplo slanje i idempotentnost.** Onemogućeno dugme dok traje slanje pomaže, ali ne garantuje: korisnik može da osveži stranicu ili da mreža ponovi zahtev. Za važne operacije (plaćanje, porudžbina) server prima ključ idempotentnosti (`Idempotency-Key`) i isti zahtev ne izvrši dvaput (pogl. 16).

## Lab

1. Napiši `LoanForm` sa labelom, porukom o grešci povezanom kroz `aria-describedby` i fokusom na polje posle neuspelog slanja; proveri tastaturom i čitačem ekrana (VoiceOver: Cmd+F5).
2. Pošalji neispravan unos mimo forme (curl) i pokaži da server vraća 400 sa greškama po poljima; prikaži te greške uz polja.
3. Prepiši formu na React 19 `action` + `useActionState`; proveri da dugme ne može da se klikne dvaput dok traje slanje.
4. Dodaj prevode za srpski i engleski (react-i18next) i test koji proverava da oba jezika imaju iste ključeve.
5. Prikaži broj, datum i iznos u dinarima preko `Intl` za oba jezika; dodaj množinu „1 knjiga / 3 knjige / 5 knjiga” preko `PluralRules`.
6. Napiši funkciju koja parsira „12,5” i „2.000” po srpskim pravilima i testiraj je.

**Gotovo je kad:** forma radi tastaturom, prikazuje i klijentske i serverske greške uz polja, ne šalje dvaput, a brojevi, datumi i množina su ispravni na oba jezika.

## Pitanja sa intervjua

**P: Da li je validacija na klijentu dovoljna?**
Ne. Klijentska validacija je za brzu povratnu informaciju korisniku. Svako može da zaobiđe frontend i pošalje zahtev direktno, pa server uvek ponovo proverava. Idealno su pravila ista (npr. ista ograničenja dužine), a server je izvor istine.

**P: Šta čini formu pristupačnom?**
Svako polje ima `<label>` povezan sa njim (htmlFor/id), greške su tekstom uz polje i povezane sa `aria-describedby`, fokus ide na prvu grešku posle slanja, a forma radi tastaturom (Enter šalje). Boja nije jedini nosilac informacije o grešci.

**P: Kako prikazuješ datume i iznose za različite jezike?**
Preko Intl API-ja: `Intl.NumberFormat("sr-Latn-RS", { style: "currency", currency: "RSD" })` i `Intl.DateTimeFormat`. Tekstovi idu u fajlove prevoda (npr. i18next), a ne u kod. Datumi se čuvaju i šalju u UTC, a lokalno se samo prikazuju.

**P: Šta React 19 menja u radu sa formama?**
Forma može da dobije funkciju kao `action`: React sam spreči ponovno učitavanje, prosledi `FormData`, a posle uspeha resetuje nekontrolisana polja. `useActionState` daje rezultat poslednjeg slanja i `isPending`, `useFormStatus` dugmetu kaže da je slanje u toku, a `useOptimistic` odmah prikaže očekivani ishod. Za složenu validaciju i dalje su korisne biblioteke formi.

**P: Kako radiš množinu u srpskom prevodu?**
Srpski ima tri oblika (1 knjiga, 3 knjige, 5 knjiga, ali 21 knjiga). Intl.PluralRules('sr-Latn') vraća one, few ili other, a i18next po tome bira ključ (_one, _few, _other). Tekst sa brojem se nikad ne sklapa nadovezivanjem.

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

## Izvori
- [useActionState (react.dev)](https://react.dev/reference/react/useActionState)
- [<form> i action (react.dev)](https://react.dev/reference/react-dom/components/form)
- [useFormStatus (react.dev)](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [User notifications in forms (W3C WAI)](https://www.w3.org/WAI/tutorials/forms/notifications/)
- [aria-describedby (MDN)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby)
- [Intl.NumberFormat (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Intl.PluralRules (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
- [Plurals (i18next)](https://www.i18next.com/translation-function/plurals)
=====
---
id: 28
subtitle: "generisani API klijent, jedan omotač oko fetch-a, gde živi koje stanje, performanse, design tokeni, pristupačnost"
minutes: 45
---
# 28 Arhitektura frontenda

Kad aplikacija preraste nekoliko ekrana, pitanje više nije „kako napisati komponentu”, nego gde živi koji podatak, kako frontend ostaje usklađen sa API-jem i kako ostaje brz i pristupačan. Ovo poglavlje skuplja ta pravila.

## Pojmovi

### Ugovor sa API-jem: generisani klijent

Backend (kontroleri ili minimal API) objavljuje opis API-ja `openapi.json` (pogl. 11). Generator (orval, openapi-ts, NSwag) iz njega pravi tipove (`BookDto`) i funkcije ili hookove (`useGetBooks`). Ako backend promeni ugovor tako da lomi frontend, greška se vidi pri buildu (`tsc`), a ne kod korisnika.

```ts
// orval.config.ts: iz openapi.json → tipovi + TanStack Query hookovi
export default defineConfig({
  app: {
    input: { target: './openapi.json' },              // fajl je u gitu: izmena API-ja se vidi u diffu
    output: {
      target: './src/api/generated', client: 'react-query', httpClient: 'fetch',
      override: { mutator: { path: './src/api/http.ts', name: 'apiFetch' } },   // svi pozivi kroz jedan omotač
    },
  },
})
```

### Jedan omotač oko fetch-a

```ts
export class ApiError extends Error {
  constructor(public status: number, public errors: Record<string, string[]> = {}) {
    super(`HTTP ${status}`)
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.method && init.method !== 'GET') {
    const token = readCookie('XSRF-TOKEN')                  // CSRF (pogl. 15)
    if (token) headers.set('X-XSRF-TOKEN', token)
  }
  const res = await fetch(url, { ...init, headers, credentials: 'same-origin' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)          // ProblemDetails, ako ga ima (pogl. 11)
    throw new ApiError(res.status, body?.errors)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
```

`fetch` ne baca grešku za 404 ili 500, samo za mrežni prekid. Omotač zato pretvara svaki ne-2xx odgovor u tipiziranu grešku. To je jedino mesto koje se menja kad se promeni prijava, zaglavlja ili format grešaka.

### Gde živi koje stanje

| Vrsta stanja | Gde | Primer |
|---|---|---|
| podaci sa servera | TanStack Query keš (pogl. 25) | lista knjiga, trenutni korisnik |
| u adresi | URL (`useSearchParams`) | filter, strana, izabrani tab: preživi osvežavanje i šalje se linkom |
| lokalno za komponentu | `useState` | otvoren meni, tekst u polju |
| globalno, retko menjano | context | tema, jezik |
| deljeno UI stanje | mali store (Zustand, pogl. 30) | prozor koji otvara više mesta |
| preferencije u browseru | `localStorage` (u `try/catch`) | izabrana tema, zatvoren savet |

Pravilo: stanje stoji što bliže mestu gde se koristi (colocation), a podiže se tek kad ga zatreba još neko. Podaci sa servera se ne kopiraju u `useState` ni u store: tada postoje dve verzije koje ručno usklađuješ.

### Struktura foldera po funkcionalnosti

```
src/
  api/          generated/ (orval), http.ts, errors.ts
  components/   deljeno: Button, Modal, Window
  features/
    books/      BooksPage.tsx, BookCard.tsx, useBookFilters.ts, books.test.tsx
    loans/      ...
  lib/          čiste funkcije: format.ts, dates.ts (sa testovima)
```

Kod koji se menja zajedno stoji zajedno. Deljene komponente i čiste funkcije imaju svoje foldere.

### Performanse

- **Prvo izmeri**: React DevTools Profiler (koja komponenta se renderuje i koliko traje), Lighthouse i Network tab (veličina JS-a).
- **Code splitting po rutama** (`lazy`, pogl. 26); biblioteke koje se retko menjaju (React, UI biblioteka) u posebnim fajlovima, da ih browser čuva preko deployova.
- **Paginacija na serveru**; za vrlo duge liste **virtualizacija** (TanStack Virtual): u DOM-u su samo vidljivi redovi.
- **Manje rendera**: stanje bliže upotrebi, `memo` gde je izmereno da pomaže. React Compiler (1.0) memoizaciju radi sam pri buildu.
- **Loader sa zakašnjenjem**: odgovor koji stigne za 100 ms ne treba da „trepne” spinnerom.

### UI biblioteka, design tokeni, CSS moduli

- **Biblioteka komponenti** (Mantine, MUI, Chakra, shadcn/ui): gotovi Modal, Table i Input sa pristupačnošću (fokus, Escape, ARIA). Prilagođava se kroz temu, ne prepisivanjem stilova.
- **Design tokeni**: boje, fontovi i razmaci definisani jednom (tema, CSS promenljive). Komponenta piše `var(--surface)`, nikad `#1e1e2e`, pa tamni režim radi bez izmena komponenti.
- **CSS moduli** (`Card.module.css`): klase su lokalne za fajl, pa nema sudara imena.

### Pristupačnost (a11y)

Semantički elementi (`button`, `nav`, `label`), labele na svim poljima, greške sa `role="alert"`, rad tastaturom (vidljiv fokus, Escape zatvara modal, fokus se vraća na dugme koje ga je otvorilo), kontrast teksta bar 4,5:1 (WCAG 2.2, AA), `prefers-reduced-motion` za animacije. Test koji traži element po ulozi i labeli (pogl. 29) usput proverava pristupačnost.

## Dublje

**Zašto ne ručno pisani tipovi?** Ručni `interface BookDto` je kopija ugovora koja zastareva bez upozorenja: backend preimenuje polje, frontend se uredno kompajlira i u produkciji prikaže `undefined`. Generisan klijent pravi jedan izvor istine; cena je korak „preuzmi `openapi.json` i generiši” posle izmene API-ja, i lošiji tipovi ako backend ne opiše dobro odgovore (nedostaju `[ProducesResponseType]` ili `TypedResults`).

**Context i česte promene.** Kad se vrednost context-a promeni, renderuju se sve komponente koje ga čitaju, čak i ako im treba samo deo vrednosti. Za temu i jezik to je u redu (retko se menjaju). Za stanje koje se menja često bolje je više manjih context-a ili store sa selektorima, gde se komponenta renderuje samo kad se promeni polje koje ona bira.

**Virtualizacija ima cenu.** Redovi van ekrana ne postoje u DOM-u: `Ctrl+F` u browseru ih ne nalazi, čitač ekrana ne zna ukupan broj (pomaže `aria-rowcount`), a skok na red traži poznatu visinu. Zato je prvi izbor paginacija na serveru, a virtualizacija tek za liste od hiljada redova koje moraju biti na jednom ekranu.

## Lab

1. U svom projektu (ili u ovoj aplikaciji, `web/src/api.ts`) nađi mesto gde se poziva `fetch` i proveri da li sve ide kroz jedan omotač; dodaj tipiziranu grešku sa statusom.
2. Napravi `openapi.json` iz svog ASP.NET Core API-ja i generiši klijent (orval ili openapi-ts); preimenuj jedno polje u DTO-u i pokaži da `tsc` pada.
3. Premesti filter i stranu jedne liste u URL (`useSearchParams`); proveri da osvežavanje i dugme Nazad čuvaju prikaz.
4. Izmeri početni JS (Network tab ili izlaz `vite build`), uvedi lazy rute i izmeri ponovo.
5. Zameni sve hex boje u jednoj komponenti CSS promenljivama i dodaj tamnu temu bez izmene komponente.
6. Prođi jedan ekran samo tastaturom (Tab, Enter, Escape) i proveri kontrast u DevTools-u (Accessibility panel).

**Gotovo je kad:** svi pozivi idu kroz jedan omotač sa tipiziranom greškom, filter preživi osvežavanje, početni JS je manji posle lazy ruta i ekran radi tastaturom.

## Pitanja sa intervjua

**P: Gde treba da živi stanje u React aplikaciji?**
Što bliže mestu gde se koristi (colocation). Ako ga koristi više komponenti, podigni ga do najbližeg zajedničkog roditelja. Serverski podaci idu u TanStack Query, deljeno stanje kroz URL ili context, a globalni store (Zustand, Redux) tek kad je zaista potreban.

**P: Koja je mana Context-a za stanje koje se često menja?**
Kad se vrednost context-a promeni, iscrtavaju se SVE komponente koje ga koriste, čak i ako im treba samo deo vrednosti. Za teme i prijavljenog korisnika to je u redu; za brzo promenljivo stanje bolji su manji context-i ili store sa selektorima.

**P: Kako smanjuješ veličinu JS bundle-a?**
Code splitting po rutama (React.lazy + Suspense), uklanjanje nekorišćenih biblioteka, uvoz samo potrebnih delova (tree shaking), analiza bundle-a i odlaganje teških komponenti (grafici, editori) dok ne zatrebaju.

**P: Zašto generisan API klijent umesto ručno pisanih tipova?**
Jedan izvor istine (openapi.json), nema ručnog prepisivanja tipova, a promena ugovora koja lomi frontend pada već pri buildu (tsc), ne kod korisnika.

**P: Kako ubrzavaš React aplikaciju?**
Prvo izmeri (React DevTools Profiler, Network tab); zatim code splitting po rutama, paginacija ili virtualizacija dugih lista, stanje bliže upotrebi i memo tamo gde merenje kaže da pomaže (ili React Compiler).

**P: Šta je design token?**
Imenovana vrednost dizajna (boja, razmak, font) koja se koristi umesto konkretne vrednosti, npr. var(--surface) umesto hex boje. Tema i tamni režim se menjaju na jednom mestu.

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

## Izvori
- [orval: React Query klijent](https://orval.dev/docs/guides/react-query)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [<Profiler> (react.dev)](https://react.dev/reference/react/Profiler)
- [Vite: Building for Production](https://vite.dev/guide/build)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [WCAG 2.2 (W3C)](https://www.w3.org/TR/WCAG22/)
=====
---
id: 29
subtitle: "Vite u razvoju i za produkciju, proxy, heš u imenu fajla, lint i tsc, Vitest, React Testing Library, MSW, E2E"
minutes: 45
---
# 29 Build i testovi

Izvorni kod frontenda (TSX, stotine modula, CSS) nije ono što browser na kraju preuzima. Ovo poglavlje prati put od `npm run dev` do fajlova u `dist/` i pokazuje kako se frontend testira kao što ga koristi čovek.

## Pojmovi

### Vite: razvoj

`npm run dev` pokreće Vite dev server (`:5173`). Kod se ne pakuje unapred: browser traži ES module, a Vite svaki fajl prevede kad stigne zahtev (TSX → JS, tipovi se samo brišu). Zato start traje kratko i kod velike aplikacije.

- **HMR** (Hot Module Replacement): izmenjen modul se zameni u browseru bez ponovnog učitavanja stranice, pa stanje komponenti ostaje.
- **Proxy**: browser zove `/api/...` na istom poreklu kao frontend, a Vite prosleđuje API-ju na drugi port. Nema CORS-a ni problema sa cookie-jem.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
})
```

### Vite: produkcija

`npm run build` je obično `tsc -b && vite build`:

1. `tsc` proverava tipove (Vite ih ne proverava, samo briše).
2. **Bundling**: stotine modula u nekoliko fajlova. Od Vite 8 to radi **Rolldown** (Rust), isti alat i za razvoj i za build.
3. **Tree shaking**: neiskorišćen kod iz ES modula ne ulazi u bundle.
4. **Minifikacija**: kraća imena, bez razmaka i komentara.
5. **Heš u imenu**: `dist/assets/index-C0ffee42.js`. Ime se menja samo kad se promeni sadržaj.

Zato server šalje `/assets/*` sa `Cache-Control: public, max-age=31536000, immutable`, a `index.html` sa `no-cache`: nova verzija stiže preko novog `index.html` koji pokazuje na nova imena (cache busting).

### Promenljive okruženja

`import.meta.env.VITE_API_URL` se pri buildu ugrađuje u JS kao običan tekst. Sve sa prefiksom `VITE_` vidi svako ko otvori aplikaciju, pa tu nikad ne idu tajne. Ključ koji frontend mora da ima (mape, analitika) mora biti javan i ograničen po domenu.

### Lint i provera tipova

Linter (ESLint, oxlint) hvata sumnjiv kod: nekorišćene promenljive, pravila hookova (`react-hooks/rules-of-hooks`, `exhaustive-deps`), `==` umesto `===`. `tsc` hvata greške tipova. TypeScript 7 (prepisan u Go) proveru radi oko deset puta brže. Oba idu u proveru pre commita ili u CI (pogl. 38): build, lint i testovi moraju proći.

### Vitest i React Testing Library

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

it('Submit_EmptyDays_ShowsErrorWithoutCallingApi', async () => {
  // Arrange
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<LoanForm onSubmit={onSubmit} />)
  // Act: kao korisnik
  await user.clear(screen.getByLabelText('Broj dana'))
  await user.click(screen.getByRole('button', { name: 'Pozajmi' }))
  // Assert: šta korisnik vidi
  expect(screen.getByRole('alert')).toHaveTextContent('Unesite broj dana')
  expect(onSubmit).not.toHaveBeenCalled()
})
```

- **Vitest**: test runner sa API-jem kao Jest (`describe`, `it`, `expect`, `vi.fn`) koji koristi Vite konfiguraciju; `environment: 'jsdom'` daje lažni DOM u Node-u.
- **React Testing Library (RTL)**: testiraj kao korisnik (po ulozi, labeli, tekstu), ne implementaciju (stanje, klase, struktura DOM-a). Refaktorisanje ne lomi testove.
- **Redosled upita**: `getByRole` (sa `name`) → `getByLabelText` → `getByText` → ... → `getByTestId` tek kad drugog načina nema.
- `getBy*` baca grešku ako nema elementa, `queryBy*` vraća `null` (za „ne postoji”), `findBy*` čeka (asinhrono).
- `toHaveTextContent` i slični dolaze iz `@testing-library/jest-dom`, koji se uključi u `setupFiles`.

### Lažni API: MSW

Test ne zove pravi server. Najjednostavnije je lažirati `fetch` (`vi.spyOn(globalThis, 'fetch')`); **MSW** (Mock Service Worker) presreće zahteve na nivou mreže, pa se isti lažni API koristi u testovima, u razvoju i u Storybook-u.

```ts
const server = setupServer(
  http.get('/api/books', () => HttpResponse.json([{ id: 1, title: 'Na Drini ćuprija' }])),
)
beforeAll(() => server.listen()); afterEach(() => server.resetHandlers()); afterAll(() => server.close())
```

### Šta se testira

| Nivo | Alat | Šta |
|---|---|---|
| jedinični | Vitest | čiste funkcije: formatiranje, parsiranje, pravila |
| komponenta | Vitest + RTL | forme, validacija, greške, guardovi |
| E2E | Playwright, Cypress | pravi browser kroz celu aplikaciju: frontend, API i baza |

E2E je najbliži korisniku, ali najsporiji, pa se piše za nekoliko najvažnijih tokova (prijava, kupovina). Ova aplikacija ih ima u `web/e2e/*.e2e.ts`.

## Dublje

**`act` i asinhronost.** RTL umotava `render` i `userEvent` u `act`, pa React završi rendere pre provere. Upozorenje „not wrapped in act(...)” znači da se stanje promenilo posle testa (npr. stigao je odgovor). Rešenje nije ručni `act`, nego čekanje na ono što korisnik vidi: `await screen.findByText(...)` ili `await waitFor(...)`.

**`userEvent` umesto `fireEvent`.** `fireEvent.click` pošalje jedan DOM događaj. `userEvent.click` odigra ceo niz kao pravi korisnik (pointerdown, mousedown, focus, pointerup, mouseup, click) i ne klikne na onemogućeno dugme. Zato `userEvent` hvata više grešaka; od v14 sve njegove metode su asinhrone i pozivaju se sa `await`.

**Zašto E2E testovi pucaju bez razloga („flaky”).** Fiksne pauze (`sleep(500)`), zavisnost od redosleda testova i deljeni podaci. Playwright sam čeka da element bude vidljiv i spreman pre klika (auto-waiting), a `expect(locator).toBeVisible()` ponavlja proveru do isteka vremena. Svaki test priprema svoje podatke i ne zavisi od drugih.

## Lab

1. Pokreni `npm run build` u `web/` ove aplikacije i pogledaj `dist/assets`: imena sa hešom, veličine fajlova, posebne fajlove lazy stranica.
2. Promeni jedan red u komponenti, ponovo napravi build i uporedi koja imena fajlova su se promenila.
3. Napiši Vitest test za čistu funkciju (npr. formatiranje broja) po šablonu Arrange-Act-Assert i nazivu `Metoda_Uslov_Ishod`.
4. Dodaj RTL i napiši test forme iz pogl. 27: prazno polje → poruka sa `role="alert"`, API se ne zove.
5. Lažiraj `GET /api/books` (MSW ili `vi.spyOn(globalThis, 'fetch')`) i proveri da lista prikazuje stavke i poruku o grešci za 500.
6. Pokreni `tools/e2e.sh` i pročitaj jedan E2E test; nađi gde čeka na element umesto da spava.

**Gotovo je kad:** razumeš svaki fajl u `dist/`, imaš bar jedan test čiste funkcije i jedan test forme koji traži elemente po ulozi i labeli, i znaš zašto se `index.html` ne kešira.

## Pitanja sa intervjua

**P: Šta radi Vite u razvoju, a šta pri build-u?**
U razvoju servira izvorne fajlove kao ES module, pa start i HMR traju trenutno, bez pakovanja cele aplikacije. Pri build-u pakuje kod u optimizovane bundle-ove: minifikacija, tree shaking, podela na delove, heš u imenima fajlova za keširanje.

**P: Zašto se u Testing Library-ju traži element po ulozi (getByRole)?**
Test tako koristi aplikaciju kao korisnik i čitač ekrana: „dugme Sačuvaj”, „polje Email”. Ne zavisi od CSS klasa i strukture DOM-a, pa ne puca pri refaktorisanju, a usput proverava pristupačnost.

**P: Da li je `VITE_API_KEY` u .env fajlu tajna?**
Nije. Sve promenljive sa prefiksom VITE_ se ugrađuju u JS bundle i vidi ih svako ko otvori aplikaciju. Tajne ostaju na serveru; frontend zove svoj backend, a backend koristi ključ.

**P: Da li Vite proverava TypeScript tipove?**
Ne. Vite pri prevođenju samo briše tipove, da bi bio brz; tipove proverava `tsc` (zato je build `tsc -b && vite build`, a u razvoju greške prikazuje editor). Od Vite 8 i produkcijski build i razvoj idu kroz jedan bundler, Rolldown (Rust), a TypeScript 7 je proveru tipova ubrzao oko deset puta.

**P: Zašto heš u imenu fajla?**
Cache busting: fajl sa istim imenom nikad ne menja sadržaj, pa se kešira godinu dana (immutable); nova verzija dobija novo ime preko index.html, koji se ne kešira.

**P: Šta je HMR?**
Hot Module Replacement: izmenjen modul se zameni u browseru bez ponovnog učitavanja stranice, pa stanje komponenti ostaje.

**P: getBy, queryBy ili findBy u Testing Library-ju?**
getBy baca grešku ako elementa nema (očekuješ da postoji), queryBy vraća null (proveravaš da ne postoji), findBy vraća Promise i čeka (element se pojavi posle odgovora API-ja).

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

## Izvori
- [Vite: Features (HMR, TypeScript)](https://vite.dev/guide/features)
- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vite: server.proxy](https://vite.dev/config/server-options)
- [Vitest: Getting Started](https://vitest.dev/guide/)
- [Testing Library: redosled upita](https://testing-library.com/docs/queries/about/)
- [user-event (Testing Library)](https://testing-library.com/docs/user-event/intro)
- [Mock Service Worker](https://mswjs.io/docs/)
- [Playwright: Auto-waiting](https://playwright.dev/docs/actionability)
- [Cache-Control (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
=====
---
id: 30
subtitle: "pojmovi iz poglavlja 20–29 na pravom kodu: provideri, guardovi, orval, jedna forma do kraja, žive promene, Zustand"
minutes: 50
---
# 30 React u Zalihama

Frontend Zaliha je u `src/web`: React 19, TypeScript, Vite 8, React Router 8, TanStack Query 5, Mantine 9, react-i18next, orval i Zustand 5. Ovde se pojmovi iz poglavlja 20–29 vide na pravom kodu, onako kako bi ih objasnio na intervjuu.

## Pojmovi

### Ulazna tačka i provideri

```tsx
// main.tsx
import './i18n'                                 // prevodi se podese pre prvog rendera
createRoot(document.getElementById('root')!).render(
  <StrictMode>                                  {/* u razvoju dvostruki render i efekti (pogl. 23) */}
    <AppProviders>                              {/* tema (Mantine) + QueryClient */}
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

// AppProviders.tsx: isti provideri i u testovima
export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  const [client] = useState(() => queryClient ?? createQueryClient())   // jednom po montiranju
  return (
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MantineProvider>
  )
}
```

`AppProviders` je izdvojen da bi komponenta u testu dobila istu temu i keš kao u aplikaciji. `QueryClient` se pravi u `useState(() => ...)` (lenja početna vrednost), a ne u telu komponente, gde bi se pravio pri svakom renderu i gubio keš.

### Rute i guardovi

```
router
├─ PublicOnly (prijavljen? → /)        → AuthLayout: /login, /register
├─ AuthLayout: /invite/:token, /reset-password
└─ RequireAuth (nije? → /login)        → AppLayout (meni + <Outlet />)
     ├─ /, /items, /items/:id, /orders, /settings/...
     └─ RequirePermission "manage"     → /reports, /items/import
```

```tsx
export function RequireAuth() {
  const location = useLocation()
  const { user, isAnonymous, isPending, error } = useCurrentUser()
  const display = useLoadingDisplay(isPending)                    // loader tek posle kratke pauze
  if (isPending || display !== 'content') return <FullPageLoader visible={display === 'loader'} />
  if (isAnonymous) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user) return <Text role="alert">{formErrorMessage(t, error)}</Text>
  return <Outlet />
}

// useCurrentUser: custom hook (pogl. 24) nad generisanim upitom
const query = useGetCurrentUser({ query: { staleTime: 5 * 60 * 1000, retryOnMount: false } })
const isAnonymous = query.error instanceof ApiError && query.error.status === 401
```

Guard → layout → stranica (pogl. 26). Prijava i početna su u glavnom bundlu, ostale stranice su lazy. `state.from` pamti odakle je korisnik poslat na prijavu, pa se posle prijave vraća tamo. Guard je samo UX: API svaki zahtev proverava sam (401/403).

### API klijent: orval + `customFetch`

```ts
// orval.config.ts
output: { client: 'react-query', httpClient: 'fetch', target: './src/api/generated',
          override: { mutator: { path: './src/api/http.ts', name: 'customFetch' } } }

// http.ts: svaki generisani poziv ide kroz ovo
export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (!SAFE_METHODS.includes(method)) {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers.set('X-XSRF-TOKEN', token)                    // CSRF (pogl. 15)
  }
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' })
  if (!response.ok) throw await ApiError.fromResponse(response)     // ProblemDetails → ApiError
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
```

`npm run api` preuzme `openapi.json` iz pokrenutog API-ja (fajl je u gitu) i ponovo generiše klijent. `errors.ts` prevodi greške po poljima (`fieldErrorMessages`) i opštu grešku forme (`formErrorMessage`). `queryClient.ts`: `shouldRetry` ne ponavlja 4xx (odgovor se neće promeniti), a mrežne greške i 5xx pokuša još dva puta.

### Jedna forma do kraja: `MovementModal`

Modal za prijem, prodaju, povrat i korekciju na prebrojano. Prodaja se čuva kao ručna porudžbina sa jednom stavkom, ostalo kao kretanje zaliha.

```tsx
export function MovementModal({ item, kind, onClose }: MovementModalProps) {
  const [quantity, setQuantity] = useState('')                     // kontrolisani unos, kao tekst
  async function onSaved() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetItemQueryKey(item.id) }),
      queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
      // ... istorija, grafik, sažetak, stanje u prodavnici
    ])
    await saved.confirm()                                          // „Sačuvano” na dugmetu, pa zatvori
    close()
  }
  const record = useRecordStockMovement({ mutation: { onSuccess: onSaved, onError: shake.shake } })
  const sell = useCreateOrder({ mutation: { onSuccess: onSaved, onError: shake.shake } })
  const save = kind === 'sale' ? sell : record

  // izvedeno stanje, ne useState: pregled „posle” samo pomaže, pravu promenu računa API
  const value = readDecimal(quantity)                              // number | null | 'invalid'
  const amount = typeof value === 'number' ? value : null
  const change = amount === null ? null : kind === 'sale' ? -amount : kind === 'count' ? amount - item.stock : amount
  const after = change === null ? null : item.stock + change

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (value === 'invalid' || value === null) { setQuantityError(/* ... */); shake.shake(); return }  // klijent: udobnost
    if (kind === 'sale') sell.mutate({ data: { lines: [{ itemId: item.id, quantity: value }], reference, note } })
    else record.mutate({ itemId: item.id, data: { kind, quantity: value, note } })
  }
  const serverErrors = fieldErrorMessages(t, save.error)           // server: ispravnost, ispod polja
  // ...
}
```

U jednoj komponenti: props (pogl. 23), kontrolisan unos i izvedeno stanje (23), generisane mutacije i invalidacija (25, 28), validacija na dva mesta i decimalni zarez (27).

### Brojevi i jezik

`lib/format.ts` uvek koristi `Intl` (nikad ručno formatiranje), a `readDecimal("1,5")` vraća `1.5` ili `'invalid'`. Jezici su `['sr-Latn', 'en'] as const`, tekstovi u `locales/sr-Latn.json` i `locales/en.json`, a test `Keys_BothLanguages_AreTheSame` pada kad ključ postoji samo u jednom jeziku.

### Žive promene: `useLiveUpdates`

```ts
const COMPANY_DATA = ['/api/items', '/api/orders', '/api/receipts', '/api/stock', '/api/dashboard', '/api/reports']
export const GATHER_MS = 1000

export function startLiveUpdates(queryClient: QueryClient, connection: ChangesConnection) {
  let gathering: ReturnType<typeof setTimeout> | undefined
  const reload = () => {
    gathering = undefined
    void queryClient.invalidateQueries({ predicate: (q) => isCompanyDataQuery(q.queryKey) })
  }
  connection.on('dataChanged', () => { gathering ??= setTimeout(reload, GATHER_MS) })   // 50 poruka = 1 osvežavanje
  connection.onreconnected(reload)                  // propuštene poruke: osveži sve što je na ekranu
  // ... prvo spajanje sa rastućim pauzama; vraća funkciju koja zaustavlja vezu
}

export function useLiveUpdates() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const connection = new HubConnectionBuilder().withUrl('/hubs/changes').withAutomaticReconnect(/* ... */).build()
    return startLiveUpdates(queryClient, connection)   // cleanup zatvara vezu
  }, [queryClient])
}
```

- Ključ upita je putanja (orval pravi `['/api/items', params]`), pa `predicate` lako bira „podatke firme”.
- **Skupljanje**: uvoz 200 artikala ne pravi 200 osvežavanja, nego jedno, sekundu posle prve poruke.
- **Cleanup je obavezan**: StrictMode u razvoju pokrene efekat dvaput; bez `stop()` bi ostale dve veze.
- **Testabilno bez servera**: `startLiveUpdates` prima mali interfejs `ChangesConnection`; test daje lažnu vezu i lažni sat (`vi.useFakeTimers`).

### Deljeno UI stanje: Zustand

Brzu pretragu (Ctrl+K) i formu za utisak otvara više mesta: meni, zaglavlje na telefonu, prečica, ekrani. Dok je stanje bilo u `AppLayout`-u, ekran bi do njega stigao samo kroz props preko `<Outlet />` (prop drilling). Zato je u malom store-u:

```ts
// stores/ui.ts
const initialState = { quickSearchOpen: false, feedbackOpen: false }
export const useUiStore = create<UiState>()((set) => ({
  ...initialState,
  openQuickSearch: () => set({ quickSearchOpen: true, feedbackOpen: false }),   // samo jedan prozor
  closeQuickSearch: () => set({ quickSearchOpen: false }),
  openFeedback: () => set({ feedbackOpen: true, quickSearchOpen: false }),
  closeFeedback: () => set({ feedbackOpen: false }),
}))
export function resetUiStore() { useUiStore.setState(initialState) }           // za testove

// AppLayout.tsx: jedan selektor po polju
const feedbackOpen = useUiStore((s) => s.feedbackOpen)
const openQuickSearch = useUiStore((s) => s.openQuickSearch)
useHotkeys([['mod+K', openQuickSearch]], [])     // drugi argument: tagovi u kojima se prečica ignoriše
```

- `create` napravi store i vrati hook; `set` plitko spaja novo stanje sa postojećim.
- Selektor određuje pretplatu: posle svakog `set` Zustand pozove selektore i uporedi rezultat (`Object.is`); komponenta se renderuje samo ako se njen rezultat promenio.
- Ispod je Reactov `useSyncExternalStore`, standardan način da React čita spoljni store bez „tearinga”.
- Store je modul, jedna instanca za ceo proces: `test/setup.ts` posle svakog testa zove `resetUiStore()`.

### Gde živi koje stanje (u Zalihama)

| Vrsta | Gde | Primer |
|---|---|---|
| podaci sa servera | TanStack Query | artikli, porudžbine, trenutni korisnik |
| deljeno UI stanje | Zustand | brza pretraga, forma za utisak |
| stanje jednog ekrana | `useState` | otvoren meni, tekst u polju |
| filter, pretraga, strana | URL | `?search=majica&page=2` |

Najvažnija rečenica: podaci sa servera se nikad ne kopiraju u Zustand.

## Dublje

**Zamka sa selektorom u Zustand-u 5.** `useUiStore((s) => ({ a: s.quickSearchOpen, b: s.feedbackOpen }))` vraća nov objekat pri svakom pozivu. Zustand 5 koristi `useSyncExternalStore`, koji traži da isti snapshot daje isti rezultat, pa takav selektor pravi beskonačnu petlju („Maximum update depth exceeded”), ne samo višak rendera kao u v4. Rešenje: jedan selektor po polju (kao u Zalihama) ili `useShallow((s) => ({ ... }))` iz `zustand/react/shallow`, koji poredi polja objekta.

**Priča: build je uhvatio grešku.** Pri prelasku na store u `useHotkeys` kao drugi argument stavljen je `[openQuickSearch]`, kao niz zavisnosti kod `useEffect`. Tamo je to spisak tagova (`INPUT`, `TEXTAREA`) u kojima se prečica ignoriše. Testovi su prošli, a `tsc` u buildu je prijavio grešku tipa (funkcija nije string). Vraćen je `[]`, pa Ctrl+K radi i u polju. Pouka: zadatak nije gotov dok ne prođu testovi, build i lint.

**Zašto `invalidateQueries`, a ne ručna izmena keša posle prodaje.** Prodaja menja stanje artikla, listu, istoriju, grafik, sažetak i porudžbine. Ručno ažuriranje svih tih keševa (`setQueryData`) dupliralo bi pravila backenda na frontendu. Invalidacija samo kaže „zastarelo je”: aktivni upiti se odmah ponovo učitaju, a neaktivni kad se ekran otvori.

## Lab

1. Kloniraj Zalihe, pokreni `npm run dev` u `src/web` i u React DevTools-u nađi `AppProviders`, `RequireAuth` i `AppLayout` u stablu komponenti.
2. Otvori `/items` kao odjavljen korisnik i prati preusmerenje na `/login` i nazad posle prijave (`state.from`).
3. U Network tabu zabeleži prodaju i nađi `POST /api/orders` sa zaglavljem `X-XSRF-TOKEN`, pa sve `GET` zahteve koje je invalidacija pokrenula.
4. Otvori aplikaciju u dva taba, proizvod prodaj u jednom i gledaj kako se drugi osveži; u Network tabu nađi WebSocket vezu `/hubs/changes`.
5. Pokreni `npm test -- MovementModal liveUpdates ui` i pročitaj po jedan test iz svakog fajla.
6. Napiši selektor koji vraća objekat bez `useShallow`, vidi grešku u konzoli, pa ga popravi.

**Gotovo je kad:** možeš da pratiš jedan klik od forme, kroz `customFetch` i invalidaciju, do osvežene liste u drugom tabu, i da objasniš gde koje stanje živi i zašto.

## Pitanja sa intervjua

**P: Kako frontend zna za promene API-ja?**
`openapi.json` je u gitu; orval iz njega generiše tipove i TanStack Query hookove. Promena koja lomi frontend pada na `tsc` buildu, a izmena ugovora se vidi u diffu.

**P: Kako osvežavaš ekran posle prodaje?**
Mutacija u `onSuccess` invalidira ključeve artikla, liste, istorije, sažetka i porudžbina; aktivni upiti se odmah ponovo dohvate, ostali kad se ekran otvori. Pravila računanja ostaju na backendu.

**P: Kako se ekran osveži kad neko drugi proda robu?**
SignalR poruka „dataChanged” → posle sekunde skupljanja `invalidateQueries` sa predikatom za podatke firme → aktivni upiti se ponovo dohvate. Tab koji je izmenu napravio server preskače (zaglavlje `X-Connection-Id`).

**P: Kako to testiraš bez servera?**
Logika je u funkciji koja prima mali interfejs veze (`ChangesConnection`); test daje lažnu vezu i lažni sat (`vi.useFakeTimers`) i proverava kad se zove invalidacija.

**P: Zašto Zustand za dve boolean vrednosti? Zar Context nije dovoljan?**
Iskreno: za dve vrednosti bi i Context radio. Context traži Provider i renderuje sve koji ga čitaju kad se promeni bilo šta u vrednosti. Zustand nema Provider, a selektor renderuje komponentu samo kad se promeni njeno polje. Spreman je kad deljenog UI stanja bude više.

**P: Zustand ili Redux?**
Isti princip (jedan store, selektori), ali Zustand traži mnogo manje koda. Redux Toolkit ima smisla za veliko klijentsko stanje, middleware i devtools. Kad su podaci sa servera u TanStack Query-ju, klijentskog stanja ostane malo.

**P: Zašto resetuješ store u testovima?**
Store je modul, jedna instanca za ceo proces; bez reseta bi prozor otvoren u jednom testu ostao otvoren u sledećem. Kod `useState` to ne treba, jer stanje nestane kad se komponenta demontira.

**P: Kako si rešio decimalni zarez?**
Polje čuva tekst, `readDecimal` ga parsira po jeziku u broj ili `'invalid'`, API dobija JSON broj (`1.5`); prikaz ide preko `Intl.NumberFormat`.

## Test

### 1. Zašto se `QueryClient` u `AppProviders` pravi kao `useState(() => createQueryClient())`?
- [ ] Da bi se pravio pri svakom renderu
- [x] Da nastane jednom po montiranju, pa keš ne nestaje pri ponovnom renderu
- [ ] Zato što `QueryClient` mora biti u stanju da bi radio
- [ ] Da bi se delio između tabova
> Lenja početna vrednost (funkcija) poziva se samo pri prvom renderu. `new QueryClient()` u telu komponente bi pri svakom renderu napravio nov, prazan keš.

### 2. Šta guard `RequireAuth` radi kad API za trenutnog korisnika vrati 401?
- [ ] Prikaže praznu stranicu
- [x] Preusmeri na `/login` i u `state` zapamti odakle je korisnik došao
- [ ] Pokuša zahtev beskonačno puta
- [ ] Sam prijavi korisnika
> `<Navigate to="/login" replace state={{ from: location.pathname }} />`; posle prijave korisnik se vraća tamo. Prava zaštita je i dalje na API-ju.

### 3. Uvoz 200 artikala pošalje 200 SignalR poruka „dataChanged”. Koliko puta se otvoren ekran ponovo učita?
- [ ] 200 puta
- [ ] Nijednom
- [x] Jednom, sekundu posle prve poruke
- [ ] Jednom posle poslednje poruke, koliko god trajalo
> `gathering ??= setTimeout(reload, GATHER_MS)`: prva poruka zakaže osvežavanje, ostale ga ne dodaju dok ono ne prođe.

### 4. Šta se dešava sa `useUiStore((s) => ({ a: s.quickSearchOpen, b: s.feedbackOpen }))` u Zustand-u 5?
- [ ] Radi normalno
- [ ] Komponenta se nikad ne renderuje ponovo
- [x] Selektor vraća nov objekat pri svakom pozivu, pa React prijavi beskonačnu petlju („Maximum update depth exceeded”)
- [ ] TypeScript ne dozvoljava takav selektor
> `useSyncExternalStore` traži stabilan rezultat za isto stanje. Rešenje: jedan selektor po polju ili `useShallow`.

### 5. Gde u Zalihama živi lista artikala koju vraća API?
- [ ] U Zustand store-u, da bi bila dostupna svima
- [ ] U `useState` stranice
- [x] U TanStack Query kešu; Zustand drži samo deljeno UI stanje
- [ ] U `localStorage`
> Kopija serverskih podataka u store-u bi bila druga verzija istih podataka koju treba ručno usklađivati; TanStack Query već radi keš, osvežavanje i invalidaciju.

## Izvori
- [Zustand: Introduction (dokumentacija)](https://zustand.docs.pmnd.rs/learn/getting-started/introduction)
- [Zustand: prelazak na v5 i stabilni selektori](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)
- [Zustand: useShallow](https://zustand.docs.pmnd.rs/reference/hooks/use-shallow)
- [useSyncExternalStore (react.dev)](https://react.dev/reference/react/useSyncExternalStore)
- [TanStack Query: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [orval: React Query klijent](https://orval.dev/docs/guides/react-query)
- [ASP.NET Core SignalR JavaScript klijent (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [Mantine: use-hotkeys](https://mantine.dev/hooks/use-hotkeys/)
=====
---
id: 31
subtitle: "ceo frontend deo na jednom mestu: brza pitanja i odgovori, sa uputnicom na poglavlje"
minutes: 30
---
# 31 Podsetnik: React

Kratki odgovori na pitanja koja se najčešće čuju na intervjuu za frontend deo full stack posla. Broj u zagradi je poglavlje sa punim objašnjenjem. Cilj nije učenje napamet, nego provera: ako odgovor ne možeš da objasniš primerom, vrati se na poglavlje.

## Pojmovi

### Web, JavaScript, TypeScript

| Pitanje | Odgovor |
|---|---|
| Semantički HTML? | Element koji kaže šta nešto jeste (`button`, `nav`, `label`): pristupačnost i manje koda. (20) |
| Box model? | Sadržaj + padding + border + margin; `box-sizing: border-box` uračunava padding i border u širinu. (20) |
| `==` ili `===`? | Sa konverzijom tipova ili bez; uvek `===`. (21) |
| Closure? | Funkcija pamti promenljive iz opsega u kome je nastala. (21) |
| Event loop? | Jedna nit; završeni asinhroni poslovi čekaju u redu; mikrozadaci (Promise) pre makrozadataka (`setTimeout`). (21, 46) |
| `any` ili `unknown`? | Bez provere ili mora da se suzi pre upotrebe. (22) |
| `strict` u TypeScript-u? | Uključen podrazumevano od TS 6.0; uključuje `strictNullChecks` i ostale stroge provere. (22) |

### React

| Pitanje | Odgovor |
|---|---|
| Props ili state? | Od roditelja, samo za čitanje, ili svoje, menja se setterom. (23) |
| Šta izaziva render? | Promena stanja, konteksta ili render roditelja. (23) |
| `key` u listi? | Stabilan identitet elementa između rendera; ne indeks ako se lista menja. (23) |
| Kontrolisan input? | Vrednost u stanju, `onChange` je menja. (23, 27) |
| Lifting state up? | Zajedničko stanje ide u najbližeg zajedničkog roditelja. (23) |
| StrictMode? | U razvoju dvostruki render i efekti, da se vide nečiste komponente i efekti bez cleanup-a. (23) |
| Pravila hookova? | Samo na vrhu komponente ili hooka, uvek istim redom. (24) |
| Zavisnosti `useEffect`-a? | Efekat se ponovo pokreće kad se promene; `[]` jednom; cleanup pre sledećeg i pri demontiranju. (24) |
| `useMemo` ili `useCallback`? | Pamti vrednost ili funkciju; React Compiler to radi sam. (24) |
| Context? | Vrednost kroz stablo bez props-a; za temu i jezik, ne za podatke sa servera. (24) |
| Prop drilling? | Props kroz komponente kojima ne trebaju; rešava ga kompozicija, context ili store. (24, 30) |
| Stale closure? | Funkcija iz starog rendera vidi staro stanje; setter sa funkcijom ili `useEffectEvent`. (24, 46) |
| Error boundary? | Hvata greške pri renderu dece i prikaže zamenski UI. (46) |

### Podaci, rute, forme, build

| Pitanje | Odgovor |
|---|---|
| Server state? | TanStack Query: keš po ključu, deduplikacija, ponovni pokušaji, invalidacija. (25) |
| Optimistic update? | UI odmah, vrati ako server odbije. (25) |
| Polling, SSE, WebSocket? | Klijent pita periodično / server šalje u jednom smeru / dvosmerna trajna veza. (25) |
| Tuđe izmene na ekranu? | Poruka „promenilo se” → `invalidateQueries` → ponovo učitaj. (25, 30) |
| Code splitting? | Dinamički `import`, lazy rute. (26, 28) |
| SPA 404 na osvežavanje? | Server mora da vrati `index.html` za nepoznate putanje (fallback). (26) |
| Validacija? | Klijent za udobnost, server za ispravnost. (27) |
| XSS u React-u? | JSX escapuje tekst; bez `dangerouslySetInnerHTML`; HttpOnly cookie. (15, 23) |
| Gde živi stanje? | Server: TanStack Query; deljeno UI: Zustand; ekran: `useState`; filter: URL. (28, 30) |
| Zustand selektor? | Komponenta se renderuje samo kad se promeni polje koje bira (`Object.is`). (30) |
| Cache busting? | Heš u imenu fajla; `index.html` se ne kešira. (29) |
| Šta testiraš? | Ponašanje kroz RTL: forme, greške, formatiranje, guardove; ključne tokove E2E. (29) |
| CSR, SSR, SSG? | Render u browseru / na serveru po zahtevu / unapred pri buildu. (1) |

### Kako odgovarati

1. **Definicija u jednoj rečenici**, pa **primer iz projekta** („u Zalihama prodaja invalidira ključeve artikla i liste”).
2. **Kompromis**: kada nešto ne bi koristio („za dve vrednosti bi i Context radio”).
3. Ako ne znaš: reci šta znaš i kako bi proverio (dokumentacija, mali eksperiment), ne izmišljaj.

## Dublje

**Najčešće greške u React kodu (i šta reći umesto njih).**
- Menjanje stanja direktno (`items.push(x)`) → nov niz (`[...items, x]`), jer React poredi reference.
- Indeks kao `key` u listi koja se menja → stabilan id iz podataka.
- `useEffect` + `setState` za vrednost koja se može izračunati → izračunati u renderu.
- `fetch` u efektu bez cleanup-a → trka odgovora; bolje TanStack Query.
- Podaci sa servera kopirani u globalni store → dve verzije istih podataka.
- `div` sa `onClick` umesto `button` → nema tastature ni uloge za čitač ekrana.

**Šta je novo, da ne zvučiš zastarelo (stanje: novembar 2026).** React 19.3 (Actions i `useActionState`, `ref` kao običan prop, `<Context value>` kao provider, `useEffectEvent`, `<Activity>`), React Compiler 1.0, React Router 8 (bez paketa `react-router-dom`), TanStack Query 5, Vite 8 sa Rolldown-om, TypeScript 7 (kompajler u Go-u), Node 24 koji pokreće `.ts` fajlove (type stripping), Zustand 5.

## Lab

1. Pokrij desnu kolonu tabela i odgovori naglas na svako pitanje; označi ona gde zastaneš.
2. Za svako označeno pitanje otvori poglavlje iz zagrade i napiši odgovor svojim rečima sa jednim primerom koda.
3. Za pet pitanja pripremi primer iz svog projekta (Zalihe ili ova aplikacija).
4. Snimi sebe kako odgovaraš na tri pitanja (do jednog minuta po pitanju) i preslušaj: definicija, primer, kompromis.

**Gotovo je kad:** na svako pitanje iz tabela odgovaraš za manje od minuta, sa primerom, i znaš poglavlje u kome je duži odgovor.

## Pitanja sa intervjua

**P: Kako bi objasnio React nekome ko zna samo HTML i JS?**
Interfejs opisuješ kao funkciju stanja: komponenta prima podatke (props, stanje) i vraća šta treba prikazati. Kad se stanje promeni, React ponovo pozove komponentu i sam izmeni samo potrebne delove DOM-a. Ne pišeš „promeni ovaj element”, nego „ovako izgleda za ovo stanje”.

**P: Koje greške najčešće vidiš u React kodu?**
Menjanje stanja direktno, indeks kao key, useEffect za stvari koje mogu da se izračunaju tokom iscrtavanja, fetch bez rukovanja trkom i greškom, pogrešne zavisnosti efekta, previše globalnog stanja i div umesto dugmeta.

**P: Kada ti NE treba useEffect?**
Kad se vrednost može izračunati iz props-a i stanja tokom iscrtavanja (filtrirana lista, zbir), i kad reaguješ na akciju korisnika (to ide u event handler). Efekat je za sinhronizaciju sa spoljnim sistemom: pretplata, tajmer, DOM API, mreža bez biblioteke.

**P: Šta je novo u React ekosistemu (2026)?**
React 19.3 (Actions, useActionState, ref kao prop, <Context value>, useEffectEvent, <Activity>), React Compiler 1.0, React Router 8 bez paketa react-router-dom, Vite 8 sa Rolldown-om, TypeScript 7 (kompajler u Go-u), Zustand 5.

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

## Izvori
- [React dokumentacija (react.dev)](https://react.dev/reference/react)
- [React Router: Updating from v7](https://reactrouter.com/upgrading/v7)
- [React Router: načini rada](https://reactrouter.com/start/modes)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Vite](https://vite.dev/guide/)
- [Testing Library: redosled upita](https://testing-library.com/docs/queries/about/)
