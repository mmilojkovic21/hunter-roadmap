=====
---
id: "0.1"
region: "0"
level: "TEMELJI"
title: "Kako radi računar"
subtitle: "bit, memorija, procesor, program"
minutes: 30
---
# 0.1 Kako radi računar

Program je niz instrukcija koje procesor izvršava jednu za drugom. Sve što program „zna” (brojevi, tekst, slike) u memoriji je zapisano kao bitovi: nule i jedinice. Programski jezik postoji da ti ne bi pisao bitove, nego naredbe koje čovek čita, a prevodilac ih pretvara u instrukcije za mašinu.

## Pojmovi

| Pojam | Šta je | Analogija |
|---|---|---|
| Bit / bajt | 0 ili 1; bajt je 8 bitova (256 vrednosti) | prekidač; red od 8 prekidača |
| CPU | izvršava instrukcije: saberi, uporedi, skoči | kuvar koji prati recept |
| RAM | brza, privremena memorija; briše se pri gašenju | radni sto |
| Disk (SSD) | spora, trajna memorija | ormar |
| Proces | pokrenut program sa svojom memorijom | jedno kuvanje po receptu |
| Nit (thread) | tok izvršavanja unutar procesa | jedan kuvar u kuhinji |

### Od koda do izvršavanja u .NET-u

```
Program.cs  --(C# kompajler)-->  IL kod u .dll  --(JIT u CLR-u, pri pokretanju)-->  mašinske instrukcije
```

C# se ne prevodi direktno u instrukcije procesora, nego u međukod (IL). CLR ga dok program radi prevodi (JIT) za procesor na kom radi, i to metodu po metodu: svaka metoda se prevede kad se prvi put pozove. Zato ista `.dll` radi na Windowsu, Linuxu i Macu. Postoji i prevođenje unapred (ReadyToRun, Native AOT), kad je bitno brzo pokretanje.

### Memorija: stek i hip

- **Stek (stack):** mali, brz, automatski se čisti kad metoda završi. Tu su lokalne promenljive i parametri.
- **Hip (heap):** veliki prostor za objekte koji žive duže; u .NET-u ga čisti Garbage Collector.

Ovo se detaljnije radi u poglavlju 5 vodiča (value i reference tipovi).

## Dublje

**Memorijska hijerarhija.** Procesor ne čita RAM direktno za svaku vrednost, nego kroz keš (L1, L2, L3). Pristup L1 kešu traje nekoliko ciklusa, a RAM-u stotine. Iz RAM-a se uvek prenosi cela **keš linija** (na x86 obično 64 bajta, na Apple M procesorima 128), pa su podaci koji stoje jedan do drugog praktično „besplatni” kad se pročita prvi.

Zato je redosled obilaska bitan. Matrica u C#-u je u memoriji zapisana red po red:

```csharp
for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) s += m[i, j];  // red po red: susedni bajtovi
for (int j = 0; j < N; j++) for (int i = 0; i < N; i++) s += m[i, j];  // kolona po kolona: skok za ceo red
```

Za matricu 4000×4000 drugi način je na M-seriji oko dva puta sporiji, iako je složenost ista, O(n²). Isti razlog čini niz i `List<T>` bržim od povezane liste u praksi: elementi niza su jedan do drugog, a čvorovi liste rasuti po hipu.

**Big-O ne meri ovo.** Dva algoritma iste složenosti mogu se razlikovati više puta zbog keša; zato se performanse mere (pogl. P4), a ne pogađaju.

## Lab

1. Instaliraj .NET 10 SDK i proveri: `dotnet --info`.
2. Napravi projekat: `dotnet new console -n Zdravo` i pokreni ga `dotnet run`.
3. Pronađi `bin/Debug/net10.0/Zdravo.dll`: to je IL, ne mašinski kod.
4. U `Program.cs` ispiši `Environment.ProcessorCount`, `Environment.Is64BitProcess` i `Environment.WorkingSet`.
5. Pokreni program dva puta istovremeno (dva terminala) i u Task Manageru / `ps aux | grep Zdravo` vidi dva procesa.

**Gotovo je kad:** program ispisuje broj jezgara, 64-bitnost i zauzetu memoriju, i možeš da objasniš šta je `.dll` u bin folderu.

## Pitanja sa intervjua

**P: Razlika između procesa i niti?**
Proces ima svoju memoriju i izolovan je od drugih. Niti unutar istog procesa dele memoriju, pa su brže za komunikaciju, ali traže sinhronizaciju.

**P: Zašto se C# prevodi u IL, a ne direktno u mašinski kod?**
Da bi isti fajl radio na više platformi i procesora; JIT svaku metodu prevodi pri prvom pozivu i može da optimizuje za konkretan procesor. Cena je sporiji start, pa .NET nudi i prevođenje unapred (ReadyToRun, Native AOT).

## Test

### 1. Šta se dešava sa sadržajem RAM-a kad se računar ugasi?
- [ ] Prebacuje se na disk automatski
- [x] Briše se
- [ ] Ostaje do sledećeg paljenja
- [ ] Čuva se samo za pokrenute programe
> RAM je privremena memorija. Trajno ostaje samo ono što je program sačuvao na disk ili u bazu.

### 2. Koliko različitih vrednosti može da zapiše jedan bajt?
- [x] 256
- [ ] 128
- [ ] 8
- [ ] 16
> 8 bitova, svaki 0 ili 1: 2⁸ = 256 kombinacija.

### 3. Šta sadrži .dll fajl koji napravi `dotnet build`?
- [ ] Samo podešavanja projekta
- [x] IL međukod koji CLR prevodi pri pokretanju
- [ ] Mašinske instrukcije za tvoj procesor
- [ ] Izvorni C# kod
> Kompajler pravi IL; JIT u CLR-u prevodi svaku metodu u mašinske instrukcije kad se ona prvi put pozove.

### 4. Šta dve niti istog procesa dele?
- [ ] Samo fajlove na disku
- [ ] Ništa, potpuno su izolovane
- [x] Memoriju (hip) procesa
- [ ] Samo stek
> Niti dele memoriju procesa, ali svaka ima svoj stek. Zato deljeni podaci traže zaključavanje.

### 5. Gde završavaju lokalne promenljive metode tipa `int`?
- [ ] Na hipu, dok ih GC ne očisti
- [x] Na steku, i nestaju kad metoda završi
- [ ] Na disku
- [ ] U registru operativnog sistema
> Lokalne value-type promenljive su na steku. (Izuzetak: kad ih „uhvati” lambda, async metoda ili iterator (`yield`), prelaze na hip.)

## Izvori
- [Microsoft Learn: Uvod u .NET](https://learn.microsoft.com/en-us/dotnet/core/introduction)
- [Microsoft Learn: Upravljanje memorijom i GC](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
- [Microsoft Learn: Proces izvršavanja (JIT pri prvom pozivu metode)](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)
=====
---
id: "0.2"
region: "0"
level: "TEMELJI"
title: "Promenljive i tipovi"
subtitle: "int, double, string, bool, var, konverzije"
minutes: 30
---
# 0.2 Promenljive i tipovi

Promenljiva je imenovano mesto u memoriji. Tip kaže koliko mesta zauzima i šta sme da se radi sa vrednošću. C# je strogo tipiziran: tip se zna pri kompajliranju, pa kompajler hvata greške pre nego što program krene. U vodiču su tipovi u pogl. 4 (C# osnove), uz razlog zašto je za novac `decimal`, a ne `double`.

## Pojmovi

```csharp
int brojKnjiga = 12;          // ceo broj, 32 bita
long ukupnoCitanja = 3_000_000_000; // veći ceo broj, 64 bita
double prosek = 4.75;         // decimalni, brz, ali neprecizan
decimal cena = 1299.90m;      // decimalni, precizan: za novac
bool dostupna = true;
char slovo = 'A';
string naslov = "Na Drini ćuprija";
var autor = "Andrić";         // tip zaključi kompajler: string
```

| Kada | Tip |
|---|---|
| brojanje, indeksi | `int` |
| novac, porezi | `decimal` (nikad `double`) |
| merenja, procenti | `double` |
| da/ne | `bool` |
| tekst | `string` |

### Konverzije

```csharp
int a = 7;
double b = a;                 // implicitno: nema gubitka
int c = (int)3.99;            // eksplicitno: 3, decimala se odseca
int d = int.Parse("42");      // baca izuzetak ako tekst nije broj
bool ok = int.TryParse("4x", out int e); // ok = false, bez izuzetka
```

### Zamka: deljenje celih brojeva

```csharp
Console.WriteLine(7 / 2);     // 3, ne 3.5
Console.WriteLine(7 / 2.0);   // 3.5
Console.WriteLine(0.1 + 0.2 == 0.3); // False za double
```

### Zamka: Math.Round zaokružuje „na paran”

```csharp
Math.Round(2.5m);                                  // 2, ne 3
Math.Round(2.345m, 2);                             // 2.34
Math.Round(2.345m, 2, MidpointRounding.AwayFromZero); // 2.35, „školsko” zaokruživanje
```

Podrazumevano `Math.Round` tačnu polovinu zaokružuje na najbliži paran broj (bankarsko zaokruživanje). Za račune i PDV, gde se očekuje „5 i više naviše”, prosledi `MidpointRounding.AwayFromZero`.

## Dublje

**Kako `double` čuva broj (IEEE 754).** 64 bita: znak, eksponent i 52 bita razlomka (53 sa skrivenim bitom). To daje oko 15–17 značajnih cifara. Posledice koje se pitaju:

```csharp
0.1.ToString("G17");              // 0.10000000000000001: 0.1 nije tačno zapisan
Math.Abs(0.1 + 0.2 - 0.3) < 1e-9; // true: double se poredi sa tolerancijom, ne sa ==
double.NaN == double.NaN;         // false: NaN nije jednak ni sebi; koristi double.IsNaN
1.0 / 0;                          // ∞ (double.PositiveInfinity), bez izuzetka
(double)9007199254740993L;        // 9007199254740992: iznad 2^53 ne staje svaki ceo broj
(float)16777217;                  // 16777216: float ima samo 24 bita preciznosti
```

**Celi brojevi su u dvojnom komplementu.** Zato `int.MaxValue + 1` postaje `int.MinValue` (bez `checked`), a deljenje celog broja nulom baca `DivideByZeroException`, dok `double` daje beskonačnost.

**`decimal` nije besplatan.** Tačan je za decimalne iznose, ali procesor nema instrukcije za njega, pa je računanje sporije od `double`. Za novac je to prava cena; za fiziku, grafiku i statistiku nije potreban.

## Lab

1. Napravi konzolnu aplikaciju `Kalkulator`.
2. Učitaj dva broja sa `Console.ReadLine()` pomoću `decimal.TryParse`.
3. Ako unos nije broj, ispiši poruku i pitaj ponovo (bez pada programa).
4. Ispiši zbir, razliku, proizvod i količnik; za deljenje nulom ispiši upozorenje.
5. Dodaj izbor PDV-a 20%: ispiši iznos sa PDV-om zaokružen na 2 decimale (`Math.Round(x, 2, MidpointRounding.AwayFromZero)`).

**Gotovo je kad:** unos „abc” ne obara program, `10 / 0` ne obara program, a `0.1 + 0.2` sa `decimal` daje tačno `0.3`.

## Pitanja sa intervjua

**P: Zašto se za novac koristi decimal, a ne double?**
`double` je binarni zapis i ne može tačno da predstavi vrednosti kao 0,1, pa se greške sabiraju. `decimal` je decimalni zapis sa 28–29 cifara preciznosti.

**P: Koliko je `Math.Round(2.5)` u C#-u?**
2. Podrazumevano se tačna polovina zaokružuje na najbliži paran broj (bankarsko zaokruživanje), da se greške zaokruživanja ne bi gomilale naviše. Za „školsko” zaokruživanje: `MidpointRounding.AwayFromZero`.

**P: Šta radi var?**
Kompajler zaključi tip iz desne strane. Promenljiva je i dalje strogo tipizirana; `var` nije dinamički tip.

## Test

### 1. Šta ispisuje `Console.WriteLine(7 / 2);`?
- [x] 3
- [ ] 3.5
- [ ] 4
- [ ] Greška pri kompajliranju
> Oba operanda su `int`, pa je deljenje celobrojno i decimala se odbacuje.

### 2. Koji tip je pravi izbor za cenu artikla?
- [ ] double
- [ ] float
- [x] decimal
- [ ] int
> `decimal` čuva decimalne razlomke kao 0,1 tačno (do 28–29 cifara), bez binarnih grešaka zaokruživanja koje ima `double`.

### 3. Šta je `x` posle `var x = 5.0;`?
- [ ] decimal
- [ ] dynamic
- [x] double
- [ ] int
> Literal `5.0` je `double`; za `decimal` bi trebalo `5.0m`.

### 4. Koja metoda pretvara tekst u broj bez bacanja izuzetka?
- [ ] int.Parse
- [ ] Convert.ToInt32
- [x] int.TryParse
- [ ] (int)tekst
> `TryParse` vraća `bool` uspeha, a vrednost daje kroz `out` parametar.

### 5. Koliko je `(int)9.99`?
- [ ] 10
- [x] 9
- [ ] 9.99
- [ ] Greška pri izvršavanju
> Eksplicitna konverzija u `int` odseca decimalni deo; ne zaokružuje.

## Izvori
- [Microsoft Learn: Ugrađeni tipovi u C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/built-in-types)
- [Microsoft Learn: Tipovi sa pokretnim zarezom (float, double, decimal)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types)
- [Microsoft Learn: Math.Round i MidpointRounding](https://learn.microsoft.com/en-us/dotnet/api/system.math.round)
- [Exercism: C# staza sa vežbama](https://exercism.org/tracks/csharp)
=====
---
id: "0.3"
region: "0"
level: "TEMELJI"
title: "Uslovi i petlje"
subtitle: "if, switch, for, while, foreach, break"
minutes: 35
---
# 0.3 Uslovi i petlje

Uslovi biraju koji deo koda se izvršava, a petlje ponavljaju deo koda. Sa ova dva alata i promenljivama može da se napiše skoro svaki algoritam. C# sintaksa za njih (`if`, `switch` izraz, petlje) je i u vodiču, pogl. 4.

## Pojmovi

```csharp
int naStanju = 3;

if (naStanju == 0)
    Console.WriteLine("Nema");
else if (naStanju < 5)
    Console.WriteLine("Malo");
else
    Console.WriteLine("Ima");

// switch izraz: kraće kad se bira vrednost
string status = naStanju switch
{
    0 => "Nema",
    < 5 => "Malo",
    _ => "Ima"
};
```

| Petlja | Kada |
|---|---|
| `for` | znaš koliko puta, ili ti treba indeks |
| `foreach` | prolaziš kroz sve elemente kolekcije |
| `while` | ponavljaš dok uslov važi, ne znaš unapred koliko |
| `do … while` | telo se izvrši bar jednom (npr. meni) |

```csharp
for (int i = 1; i <= 5; i++) Console.Write(i);      // 12345

var knjige = new[] { "Seobe", "Derviš i smrt", "Prokleta avlija" };
foreach (var k in knjige)
{
    if (k.StartsWith("D")) continue;  // preskoči ovu
    if (k.StartsWith("P")) break;     // izađi iz petlje
    Console.WriteLine(k);
}
```

### Logički operatori

`&&` (i), `||` (ili), `!` (ne). `&&` i `||` su „kratki”: ako je rezultat poznat posle leve strane, desna se ne izvršava. Zato je `knjiga != null && knjiga.Dostupna` bezbedno.

## Dublje

**Ne menjaj kolekciju dok je obilaziš.** `foreach` nad `List<T>` proverava da se lista nije promenila i baca `InvalidOperationException` („Collection was modified”) ako se u telu ukloni ili doda element.

```csharp
foreach (var x in lista) if (x % 2 == 0) lista.Remove(x);     // InvalidOperationException

for (int i = lista.Count - 1; i >= 0; i--)                     // unazad: indeksi ispred se ne pomeraju
    if (lista[i] % 2 == 0) lista.RemoveAt(i);

lista.RemoveAll(x => x % 2 == 0);                              // najjasnije i O(n)
```

Uklanjanje unapred sa `for` preskače elemente (posle `RemoveAt(i)` sledeći element dođe na mesto `i`), a `RemoveAt` u petlji je O(n²) za veliku listu; `RemoveAll` prođe jednom.

**`switch` nad enumom i iscrpnost.** Ako `switch` izraz ne pokriva sve vrednosti enuma, kompajler upozorava, a nepokrivena vrednost u izvršavanju baca `SwitchExpressionException`. Kad se enumu doda nova vrednost, upozorenje pokaže sva mesta koja treba dopuniti, pa je `_ =>` grana koja tiho „guta” nove vrednosti ponekad gora od upozorenja.

**Petlja sa `while (true)`** mora imati jasan izlaz (`break` ili `return`) i, u serverskom kodu, `CancellationToken` (pogl. 7), inače se ne može prekinuti pri gašenju aplikacije.

## Lab

1. FizzBuzz: ispiši brojeve 1–100; umesto deljivih sa 3 „Fizz”, sa 5 „Buzz”, sa oba „FizzBuzz”.
2. Pogađanje broja: program zamisli broj 1–100 (`Random.Shared.Next(1, 101)`), korisnik pogađa, program kaže „veće/manje” dok ne pogodi i na kraju ispiše broj pokušaja.
3. Meni sa `do … while`: 1 – dodaj knjigu, 2 – prikaži sve, 0 – izlaz. Knjige čuvaj u `List<string>`.

**Gotovo je kad:** sva tri programa rade, a pogrešan unos u meniju (slovo umesto broja) ne obara program.

## Pitanja sa intervjua

**P: Razlika između break i continue?**
`break` izlazi iz cele petlje, `continue` preskače ostatak trenutnog prolaza i ide na sledeći.

**P: Šta je short-circuit evaluacija?**
Kod `a && b`, ako je `a` netačno, `b` se ne izračunava. Koristi se za zaštitu od null-a i skupih poziva.

## Test

### 1. Koliko puta se izvrši telo petlje?
```csharp
for (int i = 0; i < 10; i += 3) { }
```
- [ ] 3
- [ ] 10
- [ ] Beskonačno
- [x] 4
> Vrednosti i: 0, 3, 6, 9. Za 12 uslov više ne važi.

### 2. Koja petlja sigurno izvrši telo bar jednom?
- [ ] for
- [x] do … while
- [ ] while
- [ ] foreach
> Uslov se proverava posle tela.

### 3. Šta se desi u `if (k != null && k.Length > 3)` kad je `k` null?
- [x] Desna strana se ne izvršava, uslov je netačan
- [ ] NullReferenceException
- [ ] Greška pri kompajliranju
- [ ] Uslov je tačan
> `&&` je kratki operator: leva strana je netačna, pa se desna preskače.

### 4. Šta radi `continue` u petlji?
- [ ] Završava program
- [ ] Izlazi iz petlje
- [ ] Ponavlja isti prolaz
- [x] Preskače ostatak trenutnog prolaza
> Izvršavanje skače na sledeći prolaz (i proveru uslova).

### 5. Šta ispisuje kod?
```csharp
int x = 7;
Console.WriteLine(x switch { < 5 => "A", < 10 => "B", _ => "C" });
```
- [ ] AB
- [ ] A
- [ ] C
- [x] B
> Proverava se redom: 7 nije < 5, jeste < 10, pa je rezultat "B".

## Izvori
- [Microsoft Learn: Naredbe za izbor (if, switch)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/selection-statements)
- [Microsoft Learn: Petlje](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements)
- [Microsoft Learn: switch izraz (iscrpnost)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression)
=====
---
id: "0.4"
region: "0"
level: "TEMELJI"
title: "Funkcije"
subtitle: "parametri, povratna vrednost, opseg, čiste funkcije"
minutes: 35
---
# 0.4 Funkcije

Funkcija (u C#-u metoda) je imenovan deo koda koji prima ulaz, radi jednu stvar i vraća rezultat. Dobra funkcija ima ime koje kaže šta radi, malo parametara i jednu odgovornost. Tako se kod čita kao rečenice i lako testira. U vodiču su metode, podrazumevani i imenovani argumenti u pogl. 4, a delegati i lambde u pogl. 6.

## Pojmovi

```csharp
static decimal SaPdv(decimal iznos, decimal stopa = 0.20m)
{
    return Math.Round(iznos * (1 + stopa), 2, MidpointRounding.AwayFromZero); // „školsko” zaokruživanje (pogl. 0.2)
}

decimal a = SaPdv(1000m);          // 1200.00, podrazumevana stopa
decimal b = SaPdv(1000m, 0.10m);   // 1100.00
decimal c = SaPdv(stopa: 0.10m, iznos: 1000m); // imenovani argumenti

static bool JeParan(int n) => n % 2 == 0;   // telo u jednom izrazu
```

### Prenos argumenata

| Način | Šta funkcija dobija |
|---|---|
| podrazumevano (value tip) | kopiju vrednosti; izmena ne utiče na pozivaoca |
| podrazumevano (reference tip) | kopiju reference; izmene objekta se vide spolja |
| `ref` | samu promenljivu pozivaoca |
| `out` | promenljivu koju funkcija mora da postavi |

### Čista funkcija

Isti ulaz uvek daje isti izlaz i ne menja ništa spolja (bez upisa u bazu, fajl, globalnu promenljivu). Ovakve funkcije se najlakše testiraju; zato se pravila poslovanja pišu kao čiste funkcije, a bazu i mrežu gurneš na ivicu sistema.

### Rekurzija

Funkcija može da pozove samu sebe; to je tema poglavlja 0.6.

## Dublje

**Closure: lambda pamti promenljivu, ne vrednost.** Lambda „zarobi” promenljivu iz okoline i vidi njenu vrednost u trenutku poziva:

```csharp
var akcije = new List<Func<int>>();
for (int i = 0; i < 3; i++) akcije.Add(() => i);      // sve tri vide ISTO i: posle petlje je 3
// rezultat: 3, 3, 3
foreach (var i in new[] { 0, 1, 2 }) akcije.Add(() => i);  // foreach pravi novu promenljivu po krugu
// rezultat: 0, 1, 2
```

Ista zamka postoji u JavaScriptu sa `var` (pogl. 46).

**Referenca se prenosi po vrednosti.** Kad metodi pošalješ listu, metoda dobija kopiju reference: može da menja isti objekat, ali dodela novog objekta parametru ne menja promenljivu pozivaoca. Tek `ref` prenosi samu promenljivu.

```csharp
static void Promeni(List<int> x) { x.Add(2); x = new List<int>(); }   // pozivalac vidi Add, ne vidi novu listu
static void Zameni(ref List<int> x) => x = new List<int>();            // pozivalac dobija novu listu
```

**Lokalne funkcije i `params`.** Pomoćna funkcija koja se koristi samo u jednoj metodi može da bude lokalna (`static` ako ne koristi promenljive okoline, pa ne pravi closure). `params int[] brojevi` dozvoljava poziv `Zbir(1, 2, 3)` i `Zbir()`; od C# 13 `params` može biti i `ReadOnlySpan<int>`, bez alokacije niza.

## Lab

1. Napiši funkcije `Povrsina(double r)`, `JeProst(int n)`, `Obrni(string s)` i `BrojSamoglasnika(string s)`.
2. Napiši `ProsekOcena(int[] ocene)` koja vraća `double`; za prazan niz vrati 0.
3. Napravi xUnit projekat (`dotnet new xunit`) i za svaku funkciju napiši bar dva testa, uključujući granične slučajeve (0, 1, prazan string, negativan broj).

**Gotovo je kad:** `dotnet test` prolazi sa bar 10 testova, a nijedna funkcija ne čita sa konzole niti piše na nju.

## Pitanja sa intervjua

**P: Šta je čista funkcija i zašto je korisna?**
Rezultat zavisi samo od ulaza i nema sporednih efekata. Lako se testira, kešira i paralelizuje.

**P: Razlika između ref i out?**
`ref` promenljiva mora biti postavljena pre poziva; `out` ne mora, ali je funkcija mora postaviti pre povratka.

## Test

### 1. Šta ispisuje kod?
```csharp
static void Uvecaj(int x) { x++; }
int a = 5; Uvecaj(a); Console.WriteLine(a);
```
- [ ] Greška
- [x] 5
- [ ] 6
- [ ] 0
> `int` je value tip; funkcija menja svoju kopiju.

### 2. Šta ispisuje kod?
```csharp
static void Dodaj(List<int> l) { l.Add(1); }
var lista = new List<int>(); Dodaj(lista); Console.WriteLine(lista.Count);
```
- [ ] 0
- [x] 1
- [ ] Greška
- [ ] null
> Prosleđena je kopija reference na isti objekat, pa se izmena liste vidi spolja.

### 3. Koja funkcija je čista?
- [ ] Ona koja upisuje log u fajl
- [ ] Ona koja vraća `DateTime.Now.Year`
- [ ] Ona koja menja statičko polje
- [x] Ona koja vraća zbir dva parametra
> Samo zbir zavisi isključivo od ulaza i nema sporednih efekata.

### 4. Šta važi za `out` parametar?
- [ ] Isto je što i povratna vrednost void
- [x] Funkcija mora da mu dodeli vrednost pre povratka
- [ ] Mora biti postavljen pre poziva
- [ ] Može se koristiti samo sa stringovima
> `out` služi da funkcija vrati dodatnu vrednost, kao kod `int.TryParse`.

### 5. Kako se zove poziv `SaPdv(stopa: 0.1m, iznos: 50m)`?
- [x] Imenovani argumenti
- [ ] Preopterećenje
- [ ] Generički poziv
- [ ] Rekurzija
> Argumenti se vezuju po imenu, pa redosled nije bitan.

## Izvori
- [Microsoft Learn: Metode u C#](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/methods)
- [Microsoft Learn: Unit testovi sa xUnit](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-csharp-with-xunit)
- [Microsoft Learn: lambda izrazi i zarobljene promenljive](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions)
- [Microsoft Learn: params](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/params)
=====
---
id: "0.5"
region: "0"
level: "SREDNJI NIVO"
title: "Nizovi i liste"
subtitle: "indeks, iteracija, dva pokazivača, prozor"
minutes: 40
---
# 0.5 Nizovi i liste

Niz je blok memorije sa elementima istog tipa jedan do drugog, pa se svakom pristupa preko indeksa za isto vreme. Lista (`List<T>`) je niz koji sam raste kad se napuni. Na intervjuima je velik deo zadataka zapravo rad sa nizom: pronađi, prebroj, obrni, spoji. Kolekcije u .NET-u (`List`, `Dictionary`, `HashSet`) i LINQ su u vodiču, pogl. 6.

## Pojmovi

```csharp
int[] niz = { 5, 3, 8, 1 };     // fiksna dužina
Console.WriteLine(niz[0]);      // 5, indeksi kreću od 0
Console.WriteLine(niz[^1]);     // 1, poslednji element
int[] deo = niz[1..3];          // { 3, 8 }

var lista = new List<int> { 5, 3 };
lista.Add(8);                   // na kraj: brzo
lista.Insert(0, 9);             // na početak: pomera sve elemente
lista.Remove(3);
```

| Operacija | Niz / List<T> |
|---|---|
| pristup po indeksu | O(1) |
| dodavanje na kraj (samo List<T>; niz ima fiksnu dužinu) | O(1) u proseku |
| ubacivanje/brisanje na početku | O(n), svi se pomeraju |
| pretraga vrednosti | O(n) |

### Dve tehnike koje rešavaju mnogo zadataka

**Dva pokazivača:** jedan indeks sa početka, drugi sa kraja, približavaju se.

```csharp
static bool JePalindrom(string s)
{
    int l = 0, d = s.Length - 1;
    while (l < d)
        if (s[l++] != s[d--]) return false;
    return true;
}
```

**Klizni prozor:** računa se nešto nad uzastopnim delom niza, bez ponovnog sabiranja.

```csharp
static int NajveciZbirK(int[] a, int k)
{
    int zbir = a[..k].Sum(), max = zbir;
    for (int i = k; i < a.Length; i++)
    {
        zbir += a[i] - a[i - k];   // dodaj novi, izbaci najstariji
        max = Math.Max(max, zbir);
    }
    return max;
}
```

## Dublje

**Range na nizu pravi kopiju, `Span` ne.** `niz[1..3]` vraća **nov niz** sa kopiranim elementima, pa izmena ne utiče na original. `Span<T>` je pogled na deo postojećeg niza, bez kopiranja i alokacije:

```csharp
int[] niz = { 10, 20, 30, 40 };
var kopija = niz[1..3]; kopija[0] = 99;          // niz[1] je i dalje 20
Span<int> pogled = niz.AsSpan(1, 2); pogled[0] = 99;   // niz[1] je sada 99
```

Za `string` je isto: `s[1..3]` pravi novi string, a `s.AsSpan(1, 2)` ne. `Span<T>` živi samo na steku (ne može biti polje klase ni preživeti `await`), zato se koristi u parserima i bibliotekama, a u poslovnom kodu retko.

**Kapacitet liste.** `List<T>` drži niz veći od broja elemenata; kad se napuni, pravi dvostruko veći i kopira sve. Ako unapred znaš broj elemenata, `new List<T>(n)` (ili `EnsureCapacity`) izbegava ta kopiranja.

**Dva pokazivača i prozor su O(n) jer svaki indeks ide samo napred.** Ako se u rešenju jedan pokazivač vraća unazad za svaki korak drugog, to je ponovo O(n²); proveri to pre nego što kažeš složenost.

## Lab

1. Bez LINQ-a napiši: `Max`, `Obrni` (u mestu), `UkloniDuplikate` (sortiran niz), `Rotiraj(niz, k)`.
2. Reši „Two Sum” na sortiranom nizu tehnikom dva pokazivača.
3. Reši „najduži podstring bez ponavljanja karaktera” kliznim prozorom.
4. Za svaku funkciju napiši testove i u komentaru napiši složenost (O(n), O(n²)…).

**Gotovo je kad:** testovi prolaze i za svako rešenje znaš da kažeš složenost po vremenu i po memoriji.

## Pitanja sa intervjua

**P: Zašto je ubacivanje na početak liste sporo?**
`List<T>` je niz ispod haube; svaki element mora da se pomeri za jedno mesto, pa je to O(n).

**P: Kad biraš niz, a kad List<T>?**
Niz kad je dužina fiksna i poznata (malo brži, bez rezerve). Lista kad broj elemenata raste ili se menja.

## Test

### 1. Koja je složenost pristupa elementu niza po indeksu?
- [x] O(1)
- [ ] O(log n)
- [ ] O(n)
- [ ] O(n²)
> Adresa se izračuna direktno: početak + indeks × veličina elementa.

### 2. Šta vraća `niz[^1]` za `int[] niz = { 4, 7, 9 };`?
- [x] 9
- [ ] 4
- [ ] 7
- [ ] IndexOutOfRangeException
> `^1` je prvi element od kraja, tj. poslednji.

### 3. Zašto je `lista.Insert(0, x)` O(n)?
- [ ] Zbog Garbage Collector-a
- [x] Svi postojeći elementi se pomeraju za jedno mesto
- [ ] Lista mora da se sortira
- [ ] Pravi se nova lista svaki put
> List<T> čuva elemente u nizu, pa ubacivanje na početak pomera sve.

### 4. Koja tehnika je najprirodnija za „najveći zbir k uzastopnih elemenata”?
- [ ] Binarna pretraga
- [ ] Sortiranje
- [ ] Rekurzija
- [x] Klizni prozor
> Prozor se pomera za jedan: dodaje se novi element, oduzima najstariji. O(n) umesto O(n·k).

### 5. Šta je `niz[1..3]` za `{ 10, 20, 30, 40 }`?
- [ ] { 10, 20, 30 }
- [ ] { 20, 30, 40 }
- [x] { 20, 30 }
- [ ] { 30, 40 }
> Početak je uključen, kraj nije: indeksi 1 i 2.

## Izvori
- [Microsoft Learn: Nizovi](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays)
- [NeetCode roadmap (zadaci po temama)](https://neetcode.io/roadmap)
- [Microsoft Learn: Span i Memory](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/)
- [Microsoft Learn: indeksi i opsezi (ranges)](https://learn.microsoft.com/en-us/dotnet/csharp/tutorials/ranges-indexes)
=====
---
id: "0.6"
region: "0"
level: "SREDNJI NIVO"
title: "Rekurzija"
subtitle: "bazni slučaj, stek poziva, memoizacija"
minutes: 40
---
# 0.6 Rekurzija

Rekurzivna funkcija rešava problem tako što pozove samu sebe na manjem delu istog problema. Uvek ima dva dela: **bazni slučaj** (kad se staje) i **rekurzivni korak** (problem se smanjuje). Bez baznog slučaja poziva se beskonačno dok se stek ne prepuni.

## Pojmovi

```csharp
static int Faktorijel(int n)
{
    if (n <= 1) return 1;          // bazni slučaj
    return n * Faktorijel(n - 1);  // rekurzivni korak
}
```

Svaki poziv dobija svoj okvir na steku poziva (call stack). `Faktorijel(4)` → `4 * Faktorijel(3)` → `3 * Faktorijel(2)` → … Kad se dođe do baznog slučaja, rezultati se vraćaju unazad.

| Pojam | Značenje |
|---|---|
| Stack overflow | previše ugnježdenih poziva; stek je mali (podrazumevano 1 MB po niti na Windowsu, na Linuxu zavisi od sistema) |
| Memoizacija | pamćenje već izračunatih rezultata |
| Rekurzija nad stablom | prirodan način za fajl sistem, menije, kategorije, JSON |

### Zašto naivni Fibonači puca

```csharp
static long Fib(int n) => n < 2 ? n : Fib(n - 1) + Fib(n - 2);   // O(2ⁿ)

static long FibMemo(int n, Dictionary<int, long>? m = null)
{
    m ??= new();
    if (n < 2) return n;
    if (m.TryGetValue(n, out var v)) return v;
    return m[n] = FibMemo(n - 1, m) + FibMemo(n - 2, m);          // O(n)
}
```

`Fib(45)` traje sekundama jer se iste vrednosti računaju milionima puta; `FibMemo(45)` je trenutan.

### Iteracija ili rekurzija?

Svaka rekurzija može da se napiše petljom (uz sopstveni stek). Rekurziju biraj kad je struktura prirodno rekurzivna (stablo, ugnježdene kategorije); petlju kad je dubina velika ili nepoznata. C# ne garantuje optimizaciju repnog poziva (tail call), pa i „repna” rekurzija može da prepuni stek.

## Dublje

**Od rekurzije do eksplicitnog steka.** Svaka rekurzija može da se prepiše u petlju sa sopstvenim `Stack<T>`: umesto poziva, na stek staviš ono što bi bio sledeći poziv. Stek tada živi na hipu i nema ograničenje dubine kao stek poziva, pa obilazak lanca od milion čvorova radi bez `StackOverflowException`:

```csharp
var stek = new Stack<Cvor>();
stek.Push(koren);
while (stek.Count > 0)
{
    var c = stek.Pop();
    Obradi(c);
    foreach (var dete in c.Deca) stek.Push(dete);     // umesto rekurzivnog poziva
}
```

**Memoizacija (odozgo) i tabela (odozdo).** Memoizacija zadrži rekurziju i pamti rezultate u rečniku. Tabelarni pristup (bottom-up) računa od najmanjih slučajeva naviše i često treba samo poslednjih nekoliko vrednosti:

```csharp
static long Fib(int n) { long a = 0, b = 1; for (int i = 0; i < n; i++) (a, b) = (b, a + b); return a; }  // O(n) vreme, O(1) memorija
```

`Fib(90)` je 2.880.067.194.370.816.120 i staje u `long`; `Fib(93)` ga već prekoračuje.

**Repna rekurzija.** Neki jezici rekurzivni poziv na samom kraju funkcije pretvaraju u skok, bez novog okvira na steku. C# kompajler to ne garantuje, pa se na to ne oslanja: duboka rekurzija u C#-u se piše kao petlja.

## Lab

1. Rekurzivno: `Zbir(int[] a)`, `Stepen(x, n)`, `ObrniString(s)`.
2. Ispiši sve fajlove u folderu i podfolderima rekurzivno (`Directory.GetDirectories`, `Directory.GetFiles`) sa uvlačenjem po dubini.
3. Napiši stablo kategorija (`record Kategorija(string Ime, List<Kategorija> Deca)`) i funkciju koja broji sve kategorije.
4. Izmeri vreme `Fib(40)` i `FibMemo(40)` pomoću `Stopwatch`.

**Gotovo je kad:** svi testovi prolaze, a merenje pokazuje razliku od više redova veličine između dve verzije Fibonačija.

## Pitanja sa intervjua

**P: Šta mora da ima svaka rekurzivna funkcija?**
Bazni slučaj koji zaustavlja rekurziju i korak koji problem sigurno smanjuje ka baznom slučaju.

**P: Kada rekurzija izaziva StackOverflowException i kako se to izbegava?**
Kad je dubina prevelika. U .NET-u se `StackOverflowException` ne može uhvatiti try/catch-om: proces se ugasi. Zato se ne „hvata”, nego sprečava: iteracija sa sopstvenim `Stack<T>` ili ograničenje dubine.

## Test

### 1. Šta nedostaje funkciji koja izaziva StackOverflowException?
- [x] Bazni slučaj (ili korak koji ga dostiže)
- [ ] Parametar
- [ ] Try/catch
- [ ] Povratna vrednost
> Bez baznog slučaja pozivi se gomilaju na steku dok se ne prepuni. Try/catch ne pomaže: `StackOverflowException` ne može da se uhvati i proces se gasi.

### 2. Kolika je složenost naivnog rekurzivnog Fibonačija?
- [ ] O(n)
- [ ] O(n log n)
- [ ] O(n²)
- [x] O(2ⁿ)
> Svaki poziv pravi dva nova, a isti podproblemi se računaju iznova.

### 3. Šta je memoizacija?
- [ ] Brisanje steka posle poziva
- [ ] Pretvaranje rekurzije u petlju
- [ ] Paralelno izvršavanje poziva
- [x] Čuvanje već izračunatih rezultata da se ne računaju ponovo
> Uz memoizaciju Fibonači pada sa O(2ⁿ) na O(n).

### 4. Šta vraća `F(3)`?
```csharp
static int F(int n) => n == 0 ? 0 : n + F(n - 1);
```
- [ ] Beskonačna rekurzija
- [x] 6
- [ ] 3
- [ ] 0
> 3 + 2 + 1 + 0 = 6.

### 5. Za koji problem je rekurzija najprirodnija?
- [x] Obilazak stabla kategorija proizvoljne dubine
- [ ] Zbir dva broja
- [ ] Ispis brojeva od 1 do 10
- [ ] Zamena dve promenljive
> Stablo je rekurzivna struktura: svaki čvor je opet stablo.

## Izvori
- [VisuAlgo: vizuelizacija rekurzije](https://visualgo.net/en/recursion)
- [Microsoft Learn: Directory klasa](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory)
- [Microsoft Learn: StackOverflowException (ne može da se uhvati)](https://learn.microsoft.com/en-us/dotnet/api/system.stackoverflowexception)
=====
---
id: "0.7"
region: "0"
level: "SREDNJI NIVO"
title: "Big-O složenost"
subtitle: "O(1), O(log n), O(n), O(n log n), O(n²)"
minutes: 35
---
# 0.7 Big-O složenost

Big-O opisuje kako raste vreme (ili memorija) kad raste ulaz. Ne meri sekunde, nego oblik rasta: da li je za duplo više podataka posao isti, dvostruk ili četvorostruk. Na intervjuu se posle svakog rešenja pita „koja je složenost i može li bolje?”. Tabela složenosti .NET struktura je i u vodiču, pogl. 47.

## Pojmovi

| Oznaka | Ime | Primer | n = 1.000.000 |
|---|---|---|---|
| O(1) | konstantna | pristup po indeksu, Dictionary lookup | 1 korak |
| O(log n) | logaritamska | binarna pretraga | ~20 koraka |
| O(n) | linearna | jedan prolaz kroz niz | 10⁶ |
| O(n log n) | | dobro sortiranje | ~2·10⁷ |
| O(n²) | kvadratna | dve ugnježdene petlje | 10¹² (presporo) |
| O(2ⁿ) | eksponencijalna | sve podskupove | nemoguće |

### Pravila računanja

- Konstante se bacaju: `2n` je O(n).
- Zadržava se najveći član: `n² + n` je O(n²).
- Uzastopni delovi se sabiraju (O(n) + O(n) = O(n)), ugnježdeni se množe (O(n) · O(n) = O(n²)).
- Različiti ulazi dobijaju različita slova: petlja kroz `a` u petlji kroz `b` je O(a·b).

### Klasičan primer: duplikati

```csharp
// O(n²): svaki sa svakim
static bool ImaDuplikat1(int[] a)
{
    for (int i = 0; i < a.Length; i++)
        for (int j = i + 1; j < a.Length; j++)
            if (a[i] == a[j]) return true;
    return false;
}

// O(n) vreme, O(n) memorija: HashSet
static bool ImaDuplikat2(int[] a)
{
    var vidjeni = new HashSet<int>();
    foreach (var x in a)
        if (!vidjeni.Add(x)) return true;
    return false;
}
```

Česta razmena: **više memorije za manje vremena**.

### Složenost u .NET kolekcijama

| Operacija | List<T> | HashSet<T> / Dictionary | SortedDictionary |
|---|---|---|---|
| Contains / pretraga | O(n) | O(1) | O(log n) |
| Dodavanje | O(1)* | O(1)* | O(log n) |

\* u proseku

## Dublje

**Najbolji, prosečni i najgori slučaj.** Big-O obično opisuje najgori slučaj, ali ne uvek: `Dictionary` je O(1) **u proseku**, a O(n) u najgorem (svi ključevi u istoj kanti). Quicksort je prosečno O(n log n), najgore O(n²); zato .NET koristi introsort, koji pređe na heapsort kad rekurzija postane preduboka.

**Amortizovana složenost.** `List.Add` je ponekad O(n) (kopiranje u dvostruko veći niz), ali posle n dodavanja ukupno je urađeno oko 2n kopiranja, pa je cena po dodavanju u proseku konstantna. To je „amortizovano O(1)”, što nije isto što i „prosečno” za slučajan ulaz.

**Memorijska složenost** se računa isto: `HashSet` za proveru duplikata je O(n) vremena, ali i O(n) dodatne memorije; sortiranje na mestu pa poređenje suseda je O(n log n) vremena i O(1) dodatne memorije (ako se sme menjati ulaz). Na intervjuu reci obe.

**Konstante za mali n.** O(n) pretraga kroz niz od 10 elemenata može biti brza kao heš, jer nema računanja heša i podaci su u kešu (dublje u 0.1). Big-O kaže kako raste posao, ne koliko je brzo za tvoje stvarne brojeve; za to se meri.

**Θ i Ω.** Formalno, O je gornja granica, Ω donja, a Θ obe. U praksi (i na intervjuima) „O(n log n)” se koristi u smislu Θ: tačna stopa rasta.

## Lab

1. Za 8 kratkih funkcija koje sam napišeš (petlje, ugnježdene petlje, binarna pretraga, HashSet) zapiši složenost pre merenja.
2. Pomoću `Stopwatch` izmeri `ImaDuplikat1` i `ImaDuplikat2` za n = 1.000, 10.000 i 100.000 i zapiši vremena u tabelu.
3. Proveri: kad n poraste 10 puta, da li O(n²) verzija poraste ~100 puta?
4. Izmeri `List.Contains` naspram `HashSet.Contains` u petlji od 10.000 pretraga.

**Gotovo je kad:** tvoja tabela merenja potvrđuje predviđene složenosti i možeš da objasniš zašto.

## Pitanja sa intervjua

**P: Koja je složenost ovog rešenja i može li bolje?**
Prvo se izbroje petlje i operacije nad kolekcijama; zatim se traži struktura koja menja O(n) pretragu u O(1) (HashSet, Dictionary) ili sortiranje + binarna pretraga.

**P: Šta znači da je dodavanje u List<T> O(1) „u proseku”?**
Kad se unutrašnji niz napuni, pravi se dvostruko veći i kopira (O(n)), ali to se dešava retko, pa je prosečna cena po dodavanju konstantna.

## Test

### 1. Koja je složenost?
```csharp
for (int i = 0; i < n; i++)
    for (int j = 0; j < 10; j++) { }
```
- [ ] O(n²)
- [ ] O(10n²)
- [ ] O(log n)
- [x] O(n)
> Unutrašnja petlja je konstantna (10), a konstante se odbacuju.

### 2. Koliko je približno koraka binarne pretrage za milion sortiranih elemenata?
- [ ] 1.000
- [x] 20
- [ ] 500.000
- [ ] 1
> log₂(1.000.000) ≈ 20, jer se svaki korak polovi opseg.

### 3. Koja je složenost `HashSet<int>.Contains` u proseku?
- [ ] O(n log n)
- [ ] O(log n)
- [x] O(1)
- [ ] O(n)
> Hash određuje mesto elementa direktno.

### 4. Šta je složenost `n² + 3n + 100`?
- [ ] O(n² + n)
- [ ] O(n)
- [x] O(n²)
- [ ] O(100)
> Zadržava se najbrže rastući član.

### 5. Šta je tipična cena prelaska sa O(n²) na O(n) kod traženja duplikata?
- [ ] Ništa, uvek je besplatno
- [ ] Niz mora biti sortiran unapred
- [x] Dodatna memorija (npr. HashSet) od O(n)
- [ ] Rezultat je manje tačan
> Razmenjuje se memorija za vreme.

## Izvori
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/)
- [Microsoft Learn: Izbor kolekcije](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class)
- [Microsoft Learn: List<T>.Add (O(1), O(n) kad raste kapacitet)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.add)
=====
---
id: "0.8"
region: "0"
level: "NAPREDNI NIVO"
title: "Strukture podataka"
subtitle: "hash tabela, stek, red, povezana lista, stablo, graf, heap"
minutes: 50
---
# 0.8 Strukture podataka

Struktura podataka je način da se podaci rasporede tako da su česte operacije brze. Pravi izbor strukture je često cela poenta rešenja: isti zadatak sa listom je O(n²), sa hash tabelom O(n). Isto poređenje za .NET kolekcije je u vodiču, pogl. 6 i 47.

## Pojmovi

| Struktura | U .NET-u | Brzo radi | Primer upotrebe |
|---|---|---|---|
| Hash tabela | `Dictionary<K,V>`, `HashSet<T>` | pretraga po ključu O(1) | keš, brojanje pojavljivanja |
| Stek (LIFO) | `Stack<T>` | push/pop sa vrha O(1) | undo, provera zagrada, DFS |
| Red (FIFO) | `Queue<T>` | enqueue/dequeue O(1) | red poslova, BFS |
| Prioritetni red | `PriorityQueue<T,P>` | uzmi najmanji O(log n) | najkraći put, zakazivanje |
| Povezana lista | `LinkedList<T>` | ubacivanje kad imaš čvor O(1) | LRU keš |
| Stablo pretrage | `SortedDictionary`, `SortedSet` | sortirani pristup O(log n) | rang liste, opsezi |
| Graf | `Dictionary<T, List<T>>` | odnosi između čvorova | mreža puteva, zavisnosti |

### Hash tabela: kako radi

Ključ se kroz `GetHashCode()` pretvori u broj koji kaže u koju „kofu” ide. Dva ključa u istoj kofi (kolizija) se razlikuju preko `Equals()`. Zato tip koji je ključ mora da ima usklađene `Equals` i `GetHashCode` (record to radi sam).

```csharp
// Brojanje reči: klasičan hash zadatak
var broj = new Dictionary<string, int>();
foreach (var rec in tekst.Split(' '))
    broj[rec] = broj.GetValueOrDefault(rec) + 1;
```

### Stek: provera zagrada

```csharp
static bool Validno(string s)
{
    var st = new Stack<char>();
    var par = new Dictionary<char, char> { [')'] = '(', [']'] = '[', ['}'] = '{' };
    foreach (var c in s)
    {
        if (c is '(' or '[' or '{') st.Push(c);
        else if (par.TryGetValue(c, out var o) && (st.Count == 0 || st.Pop() != o)) return false;
    }
    return st.Count == 0;
}
```

### Graf

Graf je skup čvorova i veza. Najčešće se čuva kao lista suseda: `Dictionary<string, List<string>>`. Obilasci (BFS, DFS) su u sledećem poglavlju.

## Dublje

**Kako je napravljen `Dictionary` u .NET-u.** Dva niza: `buckets` (indeks kante) i `entries` (ključ, vrednost, heš i indeks sledećeg unosa u istoj kanti). Kolizije se rešavaju lancem kroz `entries` (separate chaining). Kad se popuni, pravi veći niz (veličina je prost broj) i premesti sve unose, zato je i `Add` amortizovano O(1).

**Heš stringova je nasumičan po procesu.** U modernom .NET-u `"abc".GetHashCode()` daje drugi broj pri svakom pokretanju programa. To štiti od napada u kome neko pošalje mnogo ključeva sa istim hešom i pretvori svaku pretragu u O(n). Posledica: heš se nikad ne čuva u bazi ni u fajlu; za trajan otisak koristi se kriptografski heš (SHA-256).

**`PriorityQueue` nije stabilan.** Elementi sa istim prioritetom ne izlaze redom kojim su ušli (pet elemenata sa prioritetom 1 izađu npr. kao a, e, d, c, b). Ako je redosled bitan, prioritet se proširi rednim brojem: `(prioritet, redniBroj)`.

**Kada koja struktura iz .NET-a:**

| Potreba | Struktura | Složenost |
|---|---|---|
| sortirani ključevi uz česte izmene | `SortedDictionary` (crveno-crno stablo) | O(log n) |
| sortirana lista koja se retko menja | `SortedList` (dva niza) | pretraga O(log n), ubacivanje O(n) |
| ubacivanje u sredinu kad imaš čvor | `LinkedList` | O(1) uz čvor, ali loša lokalnost |
| deljenje između niti | `ConcurrentDictionary`, `ConcurrentQueue` | bez spoljnog `lock`-a |
| nepromenljiva kolekcija za čitanje | `FrozenDictionary` (.NET 8+) | brže čitanje, skupa izgradnja |

## Lab

1. Implementiraj sopstveni `MojStek<T>` nad nizom (Push, Pop, Peek, Count; niz raste duplo kad se napuni).
2. Implementiraj `LruKes<K,V>` kapaciteta N sa O(1) za Get i Put (`Dictionary` + `LinkedList`).
3. Reši: grupiši anagrame (`["sat","tas","ast","kuća"]`) pomoću `Dictionary`.
4. Napravi graf gradova (Niš, Leskovac, Beograd, Novi Sad, Kragujevac) kao listu suseda i ispiši susede svakog grada.

**Gotovo je kad:** LRU keš prolazi testove „najstariji neiskorišćen ispada”, a sve operacije nemaju petlju kroz celu kolekciju.

## Pitanja sa intervjua

**P: Kako radi Dictionary i šta je kolizija?**
Hash ključa bira kofu; više ključeva u istoj kofi je kolizija i razlikuju se preko Equals. Loš GetHashCode (svima isti) pretvara O(1) u O(n).

**P: Stek ili red za obilazak stabla po nivoima?**
Red (BFS). Stek daje obilazak u dubinu (DFS).

## Test

### 1. Koja struktura je najbolja za „undo” operaciju?
- [ ] Queue<T>
- [x] Stack<T>
- [ ] HashSet<T>
- [ ] SortedSet<T>
> Poslednja akcija se prva poništava: LIFO.

### 2. Šta se desi ako `GetHashCode` za sve objekte vraća 0?
- [x] Svi ključevi su u istoj kofi i pretraga postaje O(n)
- [ ] Dictionary radi isto brzo
- [ ] Ključevi se gube
- [ ] Dictionary baca izuzetak
> Ispravnost ostaje (Equals ih razlikuje), ali performanse padaju na linearne.

### 3. Šta vraća `Dequeue()` posle `Enqueue(1); Enqueue(2); Enqueue(3);`?
- [ ] 3
- [ ] 2
- [x] 1
- [ ] Ceo red
> Red je FIFO: prvi koji uđe, prvi izlazi.

### 4. Koja kombinacija daje LRU keš sa O(1) operacijama?
- [ ] List<T> + sortiranje
- [ ] Stack<T> + Queue<T>
- [x] Dictionary + dvostruko povezana lista
- [ ] SortedDictionary
> Dictionary nalazi čvor za O(1), lista ga za O(1) premešta na početak i izbacuje kraj.

### 5. Koju strukturu koristiš za „uvek uzmi zadatak najvišeg prioriteta”?
- [x] PriorityQueue<T, P>
- [ ] Stack<T>
- [ ] LinkedList<T>
- [ ] Dictionary<K, V>
> Prioritetni red (heap) vraća element sa najmanjom vrednošću prioriteta za O(log n); „najviši prioritet” zato zapiši kao najmanji broj (ili prosledi obrnut `IComparer`).

## Izvori
- [Microsoft Learn: Kolekcije u .NET-u](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [VisuAlgo: hash tabele, heap, grafovi](https://visualgo.net/en)
- [Microsoft Learn: String.GetHashCode (nije stabilan između procesa)](https://learn.microsoft.com/en-us/dotnet/api/system.string.gethashcode)
- [Microsoft Learn: PriorityQueue](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2)
- [dotnet/runtime: izvorni kod Dictionary](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs)
=====
---
id: "0.9"
region: "0"
level: "NAPREDNI NIVO"
title: "Algoritmi"
subtitle: "sortiranje, binarna pretraga, BFS, DFS, dinamičko programiranje"
minutes: 60
---
# 0.9 Algoritmi

Algoritam je tačan postupak za rešavanje problema. Za posao ne moraš da znaš stotine algoritama, ali live coding na intervjuu skoro uvek proverava nekoliko istih obrazaca: pretragu, sortiranje, obilazak grafa i pamćenje međurezultata. Kako se zadatak radi uživo, korak po korak, i pet rešenih primera (two sum, zagrade, anagrami...) su u vodiču, pogl. 47.

## Pojmovi

### Binarna pretraga (sortiran niz, O(log n))

```csharp
static int Nadji(int[] a, int cilj)
{
    int lo = 0, hi = a.Length - 1;
    while (lo <= hi)
    {
        int mid = lo + (hi - lo) / 2;   // ne (lo+hi)/2: izbegava prelivanje
        if (a[mid] == cilj) return mid;
        if (a[mid] < cilj) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
```

### Sortiranje

| Algoritam | Složenost | Napomena |
|---|---|---|
| Bubble / insertion | O(n²) | za učenje; insertion je dobar za skoro sortirane nizove |
| Merge sort | O(n log n) uvek | stabilan, treba dodatna memorija |
| Quick sort | O(n log n) prosek, O(n²) najgore | u mestu, brz u praksi |
| `Array.Sort` / LINQ `OrderBy` | O(n log n) | u praksi koristiš ovo; `Array.Sort` je introsort i nije stabilan, `OrderBy` jeste |

### BFS i DFS

```csharp
// BFS: najkraći put (u broju koraka) u grafu bez težina
static int Koraci(Dictionary<string, List<string>> g, string od, string doGrada)
{
    var red = new Queue<(string grad, int d)>();
    var vidjeni = new HashSet<string> { od };
    red.Enqueue((od, 0));
    while (red.Count > 0)
    {
        var (grad, d) = red.Dequeue();
        if (grad == doGrada) return d;
        foreach (var s in g.GetValueOrDefault(grad, []))   // čvor bez suseda nema ključ u rečniku
            if (vidjeni.Add(s)) red.Enqueue((s, d + 1));
    }
    return -1;
}
```

DFS ide u dubinu (rekurzija ili `Stack<T>`): koristi se za „da li postoji put”, otkrivanje ciklusa i topološko sortiranje (redosled migracija, zavisnosti paketa).

### Dinamičko programiranje

Problem se deli na manje koji se ponavljaju, a rezultati se pamte (memoizacija odozgo ili tabela odozdo). Primer: na koliko načina se penje uz n stepenica ako se ide po 1 ili 2.

```csharp
static long Nacini(int n)
{
    long a = 1, b = 1;            // f(0), f(1)
    for (int i = 2; i <= n; i++) (a, b) = (b, a + b);
    return b;
}
```

### Kako pristupiti zadatku na intervjuu

1. Ponovi zadatak svojim rečima i pitaj za granične slučajeve (prazan ulaz, duplikati, negativni brojevi).
2. Reci naivno rešenje i njegovu složenost.
3. Traži bolje: hash, sortiranje, dva pokazivača, prozor, BFS/DFS, DP.
4. Piši kod naglas, pa ga „izvrši” na malom primeru.

## Dublje

**Topološko sortiranje (Kahn).** Kad postoje zavisnosti (projekti u solutionu, migracije, koraci posla), redosled je: prvo ono od čega niko ne zavisi. Algoritam broji ulazne zavisnosti, stavi u red sve sa nulom, i svakim izlaskom smanji brojač onima koji od njega zavise. Ako na kraju ostanu čvorovi, postoji ciklus (isto ono što `dotnet build` javi za kružnu referencu).

```csharp
// Domain ← Application ← Infrastructure, Web zavisi od Application i Infrastructure
// rezultat: Domain -> Application -> Infrastructure -> Web
```

**Dijkstra sa `PriorityQueue`.** .NET-ov `PriorityQueue` nema operaciju „smanji prioritet”, pa se čvor ubaci ponovo sa boljom udaljenošću, a zastareo unos se preskoči pri vađenju:

```csharp
while (pq.TryDequeue(out var u, out var du))
{
    if (du > dist[u]) continue;                          // zastareo unos
    foreach (var (v, w) in graf[u])
        if (!dist.TryGetValue(v, out var dv) || du + w < dv) { dist[v] = du + w; pq.Enqueue(v, du + w); }
}
```

Složenost je O((V + E) log V). Radi samo sa nenegativnim težinama; za negativne se koristi Bellman-Ford.

**Pohlepno ili dinamičko programiranje.** Pohlepni algoritam uzima lokalno najbolji izbor i ne vraća se; tačan je samo kad problem to dozvoljava (apoeni 1, 2, 5, 10…). Za apoene 1, 3, 4 i iznos 6 pohlepno daje 4+1+1 (tri novčića), a DP nalazi 3+3 (dva). Kad nisi siguran da pohlepno važi, DP je bezbedan izbor; na intervjuu pokaži kontraprimer.

## Lab

1. Implementiraj merge sort i testiraj ga na nasumičnim nizovima upoređujući sa `Array.Sort`.
2. Binarna pretraga: prvi indeks na kom se pojavljuje vrednost u nizu sa duplikatima.
3. BFS: broj ostrva u matrici `0/1` (susedi gore, dole, levo, desno).
4. DP: najmanji broj apoena (1, 2, 5, 10, 20, 50 dinara) za dati iznos; probaj i apoene 1, 3, 4 za iznos 6, gde pohlepno rešenje greši.
5. Reši 10 zadataka „Easy” sa NeetCode liste (Arrays & Hashing, Two Pointers, Stack) u C#-u.

**Gotovo je kad:** svih pet tačaka ima testove, a za svako rešenje možeš da kažeš složenost i naivnu alternativu.

## Pitanja sa intervjua

**P: Zašto se mid računa kao lo + (hi - lo) / 2?**
`lo + hi` može da pređe maksimalnu vrednost `int`-a kod velikih nizova; ovaj oblik daje isti rezultat bez prelivanja.

**P: BFS ili DFS za najkraći put u grafu bez težina?**
BFS, jer obilazi po nivoima pa prvi put kad stigne do cilja ima najmanji broj koraka. Za nenegativne težine se koristi Dijkstra (prioritetni red); sa negativnim težinama Bellman-Ford.

**P: Da li je `Array.Sort` stabilan?**
Nije. Koristi introsort (quicksort, uz heapsort i insertion sort), pa jednaki elementi mogu da promene redosled. Kad je redosled jednakih bitan (npr. sortiranje po ceni pa po datumu), koristi LINQ `OrderBy`/`ThenBy`, koji je stabilan.

## Test

### 1. Šta je preduslov za binarnu pretragu?
- [ ] Elementi moraju biti jedinstveni
- [x] Niz mora biti sortiran
- [ ] Niz mora biti List<T>
- [ ] Niz mora imati paran broj elemenata
> Svaki korak odbacuje polovinu na osnovu poređenja sa sredinom, što važi samo za sortiran niz.

### 2. Koji algoritam sortiranja garantuje O(n log n) i u najgorem slučaju?
- [x] Merge sort
- [ ] Quick sort
- [ ] Bubble sort
- [ ] Insertion sort
> Merge sort uvek deli na pola i spaja linearno; quick sort može pasti na O(n²).

### 3. Koja struktura se koristi u BFS-u?
- [ ] Stack<T>
- [ ] SortedSet<T>
- [x] Queue<T>
- [ ] LinkedList<T>
> Red čuva čvorove po redosledu otkrivanja, pa se obilazi nivo po nivo.

### 4. Šta je suština dinamičkog programiranja?
- [ ] Nasumično biranje rešenja
- [ ] Sortiranje pre obrade
- [ ] Paralelno izvršavanje
- [x] Pamćenje rešenja podproblema koji se ponavljaju
> Isti podproblem se reši jednom, pa se rezultat koristi ponovo.

### 5. Zadatak: koji je prvi korak na live coding intervjuu?
- [ ] Pitati da li može LINQ
- [ ] Napisati testove za sve slučajeve
- [ ] Odmah pisati optimalno rešenje
- [x] Ponoviti zadatak i pitati za granične slučajeve
> Razjašnjavanje zadatka sprečava rešavanje pogrešnog problema i pokazuje kako razmišljaš.

## Izvori
- [NeetCode roadmap](https://neetcode.io/roadmap)
- [Microsoft Learn: Array.Sort (introsort, nestabilno)](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort)
- [VisuAlgo: sortiranje i grafovi](https://visualgo.net/en)
- [LeetCode](https://leetcode.com/problemset/)
- [Microsoft Learn: PriorityQueue (bez smanjenja prioriteta)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2)
