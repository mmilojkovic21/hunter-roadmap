---
id: 32
---
## Pitanja sa intervjua

**P: Šta znače dozvole `rwxr-xr-x` (755)?**
Tri grupe po tri: vlasnik, grupa, ostali. r=4, w=2, x=1. 755 znači da vlasnik čita, piše i izvršava (7), a grupa i ostali čitaju i izvršavaju (5). Tipično za skripte i foldere; fajlovi sa tajnama dobijaju 600 (samo vlasnik).

**P: Kako nalaziš proces koji zauzima port i gasiš ga?**
`lsof -i :8080` ili `ss -ltnp | grep 8080` pokaže PID. `kill PID` šalje SIGTERM (molba da se ugasi uredno); ako ne posluša, `kill -9 PID` šalje SIGKILL koji se ne može ignorisati.

**P: Šta radi `2>&1`?**
Preusmerava standardni izlaz za greške (2) tamo gde ide standardni izlaz (1). `komanda > log.txt 2>&1` upisuje i normalan izlaz i greške u isti fajl.

## Test

### 1. Koje dozvole treba fajl `.env` sa lozinkama na serveru?
- [ ] 777
- [ ] 755
- [x] 600
- [ ] 644
> 600 znači da samo vlasnik čita i piše. 644 i 755 dozvoljavaju čitanje svima na sistemu.

### 2. Koja je razlika između `kill PID` i `kill -9 PID`?
- [ ] Nema razlike
- [x] Prvi šalje SIGTERM koji proces može uredno da obradi, drugi SIGKILL koji ga odmah ubija
- [ ] `-9` gasi 9 procesa
- [ ] Prvi radi samo za root-a
> SIGTERM daje procesu priliku da zatvori konekcije i sačuva stanje. SIGKILL je poslednje sredstvo.

### 3. Šta radi `cat app.log | grep ERROR | wc -l`?
- [ ] Briše redove sa ERROR
- [x] Broji redove u logu koji sadrže ERROR
- [ ] Ispisuje prvih 10 grešaka
- [ ] Pravi novi fajl sa greškama
> Pipe `|` šalje izlaz jedne komande na ulaz sledeće: cat ispiše fajl, grep zadrži redove sa ERROR, wc -l ih prebroji.

### 4. Kako pratiš log u realnom vremenu dok se upisuje?
- [ ] `cat app.log`
- [x] `tail -f app.log`
- [ ] `head app.log`
- [ ] `less -n app.log`
> tail -f ostaje otvoren i ispisuje nove redove kako stižu. Za Docker isto radi `docker logs -f`.

### 5. Šta znači `>` u odnosu na `>>` u komandi `echo tekst > fajl`?
- [x] `>` pregazi fajl, `>>` dopisuje na kraj
- [ ] `>>` pregazi fajl, `>` dopisuje
- [ ] Isto je
- [ ] `>` čita iz fajla
> Greškom upotrebljen `>` briše postojeći sadržaj, pa se za logove koristi `>>`.
=====
---
id: 33
---
## Pitanja sa intervjua

**P: Koja je razlika između TCP-a i UDP-a?**
TCP uspostavlja vezu i garantuje da podaci stignu, bez gubitaka i po redu (ponovno slanje, potvrde); koriste ga HTTP, baze, SSH. UDP šalje pakete bez veze i garancija, ali brže i sa manje kašnjenja; koriste ga DNS, video pozivi, igre.

**P: Šta je razlika između `localhost` i `0.0.0.0` kad aplikacija sluša?**
Aplikacija na 127.0.0.1 (localhost) prima veze samo sa iste mašine. Na 0.0.0.0 sluša na svim mrežnim interfejsima, pa je dostupna i spolja. Zato aplikacija u Docker kontejneru mora da sluša na 0.0.0.0, inače je ne vidi ni mapirani port.

**P: Koji DNS zapisi su najčešći?**
A povezuje ime sa IPv4 adresom, AAAA sa IPv6, CNAME je alias na drugo ime, MX određuje server za poštu, TXT nosi tekst (provere domena, SPF). TTL određuje koliko dugo se odgovor kešira.

## Test

### 1. Koji protokol garantuje da podaci stignu po redu i bez gubitka?
- [x] TCP
- [ ] UDP
- [ ] ICMP
- [ ] DNS
> TCP numeriše segmente, potvrđuje prijem i ponovo šalje izgubljene. UDP to ne radi.

### 2. API u kontejneru sluša na `127.0.0.1:8080`, port je mapiran (`-p 8080:8080`), ali spolja ne radi. Zašto?
- [ ] Docker ne podržava port 8080
- [x] Aplikacija prima veze samo iz samog kontejnera; treba da sluša na `0.0.0.0`
- [ ] Treba koristiti UDP
- [ ] Fali HTTPS
> Mapiran saobraćaj stiže na mrežni interfejs kontejnera, a ne na njegov loopback. ASP.NET Core u kontejneru zato sluša na `http://+:8080`.

### 3. Koji DNS zapis pravi alias `www.shop.rs` na `shop.rs`?
- [ ] A
- [ ] MX
- [x] CNAME
- [ ] TXT
> CNAME kaže „ovo ime je isto što i ono ime”. A zapis vodi direktno na IP adresu.

### 4. Zašto promena DNS zapisa ne važi svuda odmah?
- [ ] DNS se menja samo noću
- [x] Resolveri keširaju stare odgovore dok ne istekne TTL
- [ ] Treba restartovati server
- [ ] Pregledač ne podržava nove zapise
> Pre selidbe servera dobro je smanjiti TTL, da se promena brzo proširi.

### 5. Šta je NAT na kućnom ruteru?
- [ ] Šifrovanje saobraćaja
- [x] Više uređaja sa privatnim adresama izlazi na internet preko jedne javne IP adrese
- [ ] Brži DNS
- [ ] Zaštita od virusa
> Ruter prepisuje adrese i portove. Zato spolja ne možeš direktno do računara u kućnoj mreži bez prosleđivanja porta.
=====
---
id: 34
---
## Pitanja sa intervjua

**P: Koja je razlika između merge-a i rebase-a?**
Merge spaja grane i pravi merge commit; istorija ostaje kakva je bila, sa granama. Rebase premešta tvoje commit-ove na vrh druge grane, pa je istorija linearna, ali se commit-ovi prepisuju (novi heševi). Pravilo: ne rebase-uj grane koje su drugi već povukli.

**P: Kako poništavaš commit koji je već na deljenoj grani?**
`git revert <commit>` pravi novi commit koji poništava izmene; istorija se ne prepisuje, pa je bezbedno za deljene grane. `git reset` pomera granu unazad i menja istoriju; koristi se samo lokalno, pre push-a.

**P: Kako bi opisao dobar commit i pull request?**
Commit radi jednu logičku stvar i ima poruku koja kaže šta i zašto (npr. Conventional Commits: `fix: ...`). PR je mali, ima opis problema i rešenja, kako je testirano i šta reviewer treba da pogleda. Mali PR-ovi se brže i kvalitetnije pregledaju.

## Test

### 1. Kako bezbedno poništiti commit koji je već push-ovan na main?
- [ ] `git reset --hard HEAD~1` pa `git push --force`
- [x] `git revert <commit>` pa push
- [ ] Obrisati granu main
- [ ] `git checkout <commit>`
> revert dodaje novi commit i ne menja tuđu istoriju. Force push na deljenu granu briše posao drugih.

### 2. Šta je glavna razlika između merge-a i rebase-a?
- [ ] Rebase briše izmene
- [x] Rebase prepisuje commit-ove na vrh druge grane i daje linearnu istoriju, merge čuva istoriju i dodaje merge commit
- [ ] Merge radi samo lokalno
- [ ] Nema razlike
> Oba spajaju izmene. Razlika je u obliku istorije i u tome da rebase menja heševe commit-ova.

### 3. Dodao si `appsettings.Secret.json` u .gitignore, ali Git ga i dalje prati. Zašto?
- [ ] .gitignore radi samo za foldere
- [x] Fajl je već commit-ovan; .gitignore važi samo za fajlove koji se još ne prate
- [ ] Treba restartovati Git
- [ ] Ime fajla ima tačku
> Treba `git rm --cached fajl` i commit. Ako je u fajlu bila tajna, ona je već u istoriji: promeni je.

### 4. Šta radi `git cherry-pick <commit>`?
- [ ] Briše commit
- [x] Primenjuje izmene tog jednog commit-a na trenutnu granu
- [ ] Bira najbolju granu
- [ ] Spaja sve grane
> Koristi se npr. da se jedna ispravka prenese na granu izdanja bez ostalih izmena.

### 5. Šta znači „detached HEAD”?
- [ ] Repozitorijum je oštećen
- [x] Nalaziš se na konkretnom commit-u, a ne na grani, pa novi commit-ovi ne pripadaju nijednoj grani
- [ ] Glavna grana je obrisana
- [ ] Nema interneta
> Ako tu nešto commit-uješ, napravi granu (`git switch -c nova`) da se commit-ovi ne izgube.
=====
---
id: 35
---
## Pitanja sa intervjua

**P: Koja je razlika između image-a i kontejnera?**
Image je nepromenljiv šablon: slojevi sa fajlovima i podešavanjima pokretanja. Kontejner je pokrenuta instanca image-a sa sopstvenim slojem za pisanje. Iz jednog image-a možeš pokrenuti više kontejnera; brisanjem kontejnera nestaje sve što je upisano u njega, osim u volumenima.

**P: Zašto je bitan redosled naredbi u Dockerfile-u?**
Svaka naredba pravi sloj, a Docker kešira slojeve dok se ulaz ne promeni. Zato se prvo kopiraju fajlovi zavisnosti (.csproj, package.json) i radi restore, pa tek onda ostatak koda. Izmena koda tada ne pokreće ponovno preuzimanje paketa.

**P: Šta je multi-stage build?**
Dockerfile sa više FROM faza: u prvoj, sa SDK-om, gradiš aplikaciju; u poslednjoj, sa malim runtime image-om, kopiraš samo rezultat. Finalni image je manji, brže se preuzima i nema alata za build (manja površina napada).

## Test

### 1. Šta se dešava sa podacima upisanim u kontejner kad ga obrišeš (`docker rm`)?
- [ ] Ostaju u image-u
- [x] Nestaju, osim onoga što je bilo u volumenu
- [ ] Automatski se čuvaju u backup
- [ ] Prelaze u sledeći kontejner
> Sloj za pisanje pripada kontejneru. Baza zato uvek ide na volumen.

### 2. Koji redosled u Dockerfile-u bolje koristi keš?
- [ ] `COPY . .` pa `RUN dotnet restore`
- [x] `COPY *.csproj .` pa `RUN dotnet restore`, pa `COPY . .`
- [ ] Redosled ne utiče na keš
- [ ] `RUN dotnet restore` pre bilo kog COPY
> Restore se ponavlja samo kad se promeni .csproj. Izmena .cs fajla ruši keš tek od drugog COPY-ja.

### 3. Šta radi `EXPOSE 8080` u Dockerfile-u?
- [ ] Objavljuje port na računaru domaćinu
- [x] Samo dokumentuje da kontejner sluša na 8080; objavljivanje radi `-p` ili `ports:`
- [ ] Otvara port u firewall-u
- [ ] Menja port aplikacije
> EXPOSE je metapodatak. Bez `-p 8080:8080` port nije dostupan sa domaćina.

### 4. Zašto finalni image za .NET aplikaciju ne sadrži SDK?
- [ ] SDK ne radi u Linuxu
- [x] Manji je, brže se preuzima i nema alata koje napadač može da iskoristi
- [ ] SDK je plaćen
- [ ] Runtime image ne može da pokrene .dll
> SDK treba samo za build. Multi-stage build kopira objavljenu aplikaciju u aspnet image.

### 5. Kako proveriš šta radi kontejner koji se stalno ruši?
- [ ] `docker build`
- [x] `docker logs <kontejner>` (i `docker ps -a` za izlazni kod)
- [ ] `docker rmi`
- [ ] `docker push`
> Logovi pokazuju izuzetak pri startu. `docker ps -a` pokazuje i ugašene kontejnere sa izlaznim kodom.
=====
---
id: 36
---
## Pitanja sa intervjua

**P: Kako se servisi u Docker Compose-u međusobno pronalaze?**
Compose pravi mrežu za projekat, a svaki servis je dostupan drugima po imenu servisa preko ugrađenog DNS-a. API se povezuje na bazu sa `Host=db`, ne sa localhost: localhost u kontejneru je sam taj kontejner.

**P: Da li `depends_on` čeka da baza bude spremna?**
Samo `depends_on: [db]` čeka da kontejner baze bude POKRENUT, ne da prima veze. Za spremnost treba healthcheck na bazi i `depends_on: db: condition: service_healthy`, a aplikacija i dalje treba da ponovi pokušaj povezivanja.

**P: Koja je razlika između imenovanog volumena i bind mount-a?**
Imenovani volumen (`pgdata:/var/lib/postgresql/data`) je prostor kojim upravlja Docker, dobar za podatke baze. Bind mount (`./packs:/packs`) mapira folder sa domaćina, dobar za konfiguraciju i kod u razvoju; vidiš i menjaš fajlove direktno.

## Test

### 1. Kako API u Compose-u adresira bazu iz servisa `db`?
- [ ] `localhost:5432`
- [x] `db:5432`
- [ ] IP adresa domaćina
- [ ] `127.0.0.1:5432`
> Ime servisa je DNS ime u mreži projekta. localhost u API kontejneru je sam API kontejner.

### 2. Šta garantuje `depends_on: [db]` bez uslova?
- [ ] Da baza prima veze
- [x] Samo da se kontejner baze pokrene pre API-ja
- [ ] Da su migracije primenjene
- [ ] Ništa
> Za stvarnu spremnost treba healthcheck i `condition: service_healthy`, plus ponovni pokušaj u aplikaciji.

### 3. Šta radi `docker compose down -v`?
- [ ] Gasi kontejnere, podaci ostaju
- [x] Gasi i briše kontejnere, mreže i imenovane volumene, pa se podaci baze brišu
- [ ] Samo restartuje servise
- [ ] Ažurira image-e
> `-v` briše volumene. Bez njega podaci baze prežive gašenje.

### 4. Gde stavljaš lozinku baze za Compose da ne bude u Git-u?
- [ ] Direktno u docker-compose.yml
- [x] U `.env` fajl (u .gitignore) i koristiš `${POSTGRES_PASSWORD}`
- [ ] U Dockerfile
- [ ] U ime servisa
> Compose sam čita .env iz foldera projekta. U repozitorijum ide samo `.env.example` bez pravih vrednosti.

### 5. Čemu služi drugi compose fajl (npr. `docker-compose.dev.yml`) uz `-f`?
- [ ] Zamenjuje prvi fajl u potpunosti
- [x] Dopunjuje ili menja podešavanja osnovnog fajla za određeno okruženje
- [ ] Pokreće drugi projekat
- [ ] Služi samo za dokumentaciju
> Npr. osnovni fajl ne izlaže port baze, a dev dodatak ga izlaže na localhost. Fajlovi se spajaju redom kojim su navedeni.
=====
---
id: 37
---
## Pitanja sa intervjua

**P: Kako radi HTTPS ukratko?**
Server ima sertifikat koji je potpisao sertifikacioni autoritet (CA) kome pregledač veruje. U TLS rukovanju pregledač proveri sertifikat i ime domena, pa se strane dogovore o ključu sesije. Ostatak saobraćaja je šifrovan simetrično, pa niko između ne vidi ni ne menja sadržaj.

**P: Šta je Let's Encrypt i kako se obnavlja sertifikat?**
Besplatan CA koji izdaje sertifikate na 90 dana, uz automatsku proveru da kontrolišeš domen (ACME protokol). Caddy i certbot sertifikate traže i obnavljaju sami; bez automatizacije sertifikat istekne i sajt prestane da radi.

**P: Šta podesiš na novom serveru pre nego što pustiš aplikaciju?**
SSH samo ključem (bez lozinke i root prijave), firewall koji pušta samo 22, 80 i 443, automatska bezbednosna ažuriranja, korisnik bez root prava za aplikaciju, HTTPS sa preusmerenjem sa HTTP-a, i backup koji si probao da vratiš.

## Test

### 1. Koliko traje Let's Encrypt sertifikat?
- [ ] 10 godina
- [ ] 1 godinu
- [x] 90 dana, uz automatsku obnovu
- [ ] Dok se ne restartuje server
> Kratko trajanje tera automatizaciju. Caddy i certbot obnavljaju sertifikat pre isteka.

### 2. Koje portove firewall tipično pušta na web serveru?
- [ ] Sve
- [x] 22 (SSH), 80 (HTTP) i 443 (HTTPS)
- [ ] Samo 5432
- [ ] Nijedan
> Port baze nikad ne treba izložiti internetu. HTTP (80) ostaje zbog preusmerenja i ACME provere.

### 3. Šta radi HSTS zaglavlje?
- [ ] Ubrzava stranicu
- [x] Kaže pregledaču da sajt ubuduće otvara samo preko HTTPS-a
- [ ] Šifruje bazu
- [ ] Blokira robote
> Posle prve HTTPS posete pregledač sam menja http:// u https://, pa napadač ne može da „spusti” vezu na HTTP.

### 4. Kako je najbezbednije prijavljivanje na server preko SSH-a?
- [ ] Root sa lozinkom
- [x] Korisnik sa SSH ključem, prijava lozinkom isključena
- [ ] Lozinka od 6 cifara
- [ ] Bez prijave, otvoren port
> Ključ se ne može pogoditi grubom silom kao lozinka. Root prijava se isključuje, a sudo se koristi po potrebi.

### 5. Gde se najčešće završava HTTPS kad je aplikacija iza reverse proxy-ja?
- [ ] U bazi
- [x] Na reverse proxy-ju (nginx, Caddy), a do aplikacije ide HTTP unutar privatne mreže
- [ ] U pregledaču
- [ ] U DNS-u
> To je TLS termination. Aplikacija tada treba ForwardedHeaders middleware da zna da je originalni zahtev bio HTTPS.
=====
---
id: 38
---
## Pitanja sa intervjua

**P: Koja je razlika između CI i CD?**
CI (Continuous Integration): svaki push automatski se build-uje i testira, pa se greške vide odmah, a main je uvek zelen. CD (Continuous Delivery/Deployment): prošao build se automatski pakuje i isporučuje na okruženje; kod Delivery puštanje u produkciju je jedan klik, kod Deployment ide samo.

**P: Kako vraćaš loše izdanje (rollback)?**
Ako je svako izdanje image sa tagom verzije ili commit heša, rollback je ponovno pokretanje prethodnog image-a. Migracije baze treba pisati unazad kompatibilno (prvo dodaj kolonu, kasnije ukloni staru), da stara verzija koda radi i sa novom šemom.

**P: Gde CI čuva tajne (lozinke, ključeve)?**
U tajnama CI sistema (GitHub Actions secrets, environment secrets), koje se ubacuju kao promenljive okruženja i maskiraju u logovima. Nikad u YAML fajlu ili repozitorijumu.

## Test

### 1. Šta je cilj Continuous Integration-a?
- [ ] Ručno testiranje pre izdanja
- [x] Svaka izmena se automatski build-uje i testira, pa se problemi otkriju odmah
- [ ] Puštanje u produkciju jednom mesečno
- [ ] Pisanje dokumentacije
> Što ranije pukne, to je jeftinije popraviti. Zato CI radi na svakom push-u i pull request-u.

### 2. Zašto se Docker image označava commit hešom ili verzijom, a ne samo `latest`?
- [ ] latest je zabranjen
- [x] Tačno se zna šta radi u produkciji, a rollback je pokretanje prethodnog taga
- [ ] Zbog veličine image-a
- [ ] Tako je brži build
> latest se menja ispod tebe. Nepromenljiv tag daje ponovljivost i lak povratak.

### 3. Gde držiš lozinku za deploy u GitHub Actions-u?
- [ ] U workflow YAML fajlu
- [x] U repository/environment secrets, a u workflow-u je čitaš kao `${{ secrets.IME }}`
- [ ] U README-ju
- [ ] U imenu grane
> Secrets su šifrovani i maskirani u logovima. Sve u YAML-u je vidljivo svima sa pristupom repozitorijumu.

### 4. Šta je blue-green deployment?
- [ ] Dve teme interfejsa
- [x] Nova verzija se podigne pored stare, pa se saobraćaj prebaci kad je spremna; povratak je prebacivanje nazad
- [ ] Deploy samo vikendom
- [ ] Testiranje u dva pregledača
> Nema prekida rada, a rollback je trenutan. Cena je duplo resursa tokom prelaza.

### 5. Kojim redom ide tipičan pipeline?
- [ ] Deploy, test, build
- [x] Restore i build, testovi, pakovanje (image), deploy
- [ ] Test, deploy, build
- [ ] Samo deploy
> Svaki korak se oslanja na prethodni. Ako testovi padnu, nema pakovanja ni deploy-a.
=====
---
id: 39
---
## Pitanja sa intervjua

**P: Šta su strukturisani logovi i zašto su bolji?**
Log je zapis sa poljima, a ne samo tekst: `log.LogInformation("Porudžbina {OrderId} plaćena", id)` čuva OrderId kao polje. U alatu za logove (Seq, Loki, Application Insights) onda filtriraš po polju umesto da pretražuješ tekst.

**P: Koja je razlika između liveness i readiness provere?**
Liveness odgovara „da li je proces živ” (ako ne, restartuj ga). Readiness odgovara „da li može da prima saobraćaj” (baza dostupna, startup završen); ako ne, load balancer mu privremeno ne šalje zahteve, ali ga ne restartuje.

**P: Kako znaš da backup radi?**
Tek kad ga vratiš. Backup se automatski pravi i čuva van servera, a povremeno se vraća na odvojenu bazu i proverava. Backup koji nikad nije vraćen je samo nada.

## Test

### 1. Koji zapis loga je bolji za pretragu u produkciji?
- [ ] `log.LogInformation("Porudžbina " + id + " plaćena");`
- [x] `log.LogInformation("Porudžbina {OrderId} plaćena", id);`
- [ ] `Console.WriteLine(id);`
- [ ] Ne logovati ništa
> Šablon sa imenovanim mestom čuva OrderId kao polje, pa možeš da filtriraš sve logove jedne porudžbine. Spajanje stringova gubi strukturu.

### 2. Readiness provera API-ja padne jer baza ne odgovara. Šta treba da se desi?
- [ ] Kontejner se odmah restartuje
- [x] Load balancer privremeno prestane da mu šalje zahteve
- [ ] Brišu se podaci
- [ ] Ništa
> Restart ne bi popravio bazu. Readiness skida instancu iz saobraćaja dok se uslov ne vrati.

### 3. Šta je pravi dokaz da backup baze radi?
- [ ] Postoji fajl backup-a
- [x] Uspešno vraćanje backup-a na test bazu
- [ ] Backup je veliki
- [ ] Skripta nije prijavila grešku
> Backup može biti prazan, oštećen ili nepotpun. Samo vraćanje pokazuje da je upotrebljiv.

### 4. Šta treba da izazove noćni alarm (page)?
- [ ] Svaki zapis sa nivoom Warning
- [x] Simptom koji pogađa korisnike (npr. mnogo 5xx odgovora ili API ne odgovara)
- [ ] Svaki restart kontejnera
- [ ] Svaka sporija stranica
> Previše alarma dovodi do toga da se ignorišu. Alarmira se ono što zahteva hitnu reakciju čoveka.

### 5. Šta od navedenog NE treba upisivati u logove?
- [ ] ID zahteva
- [ ] Trajanje upita
- [x] Lozinke, tokene i pune brojeve kartica
- [ ] Statusni kod odgovora
> Logovi se čuvaju dugo i čita ih više ljudi. Osetljivi podaci u logu su curenje podataka.
=====
---
id: 41
---
## Pitanja sa intervjua

**P: Kako bi opisao put koda od commit-a do produkcije?**
Push pokrene CI: build, testovi, pa image sa tagom commit-a ide u registry. Deploy korak na serveru povuče taj image i pokrene ga (npr. docker compose up -d), migracije se primene, health check potvrdi da radi, a reverse proxy sa HTTPS-om šalje saobraćaj. Rollback je pokretanje prethodnog taga.

**P: Šta radiš kad se produkcija sruši u 2 noću?**
Prvo vratiš uslugu (rollback ili restart), pa tek onda tražiš uzrok. Pogledaš logove, metrike i šta je poslednje pušteno. Posle napišeš kratak postmortem bez traženja krivca: šta se desilo, zašto, i šta menjaš da se ne ponovi.

**P: Koje komande najčešće koristiš pri otklanjanju problema na serveru?**
`docker ps -a`, `docker logs -f`, `docker compose ps`, `df -h` (disk), `free -m` (memorija), `top` ili `htop`, `ss -ltnp` (portovi), `curl -v` (da li odgovara), `journalctl -u servis`.

## Test

### 1. Aplikacija ne odgovara posle deploy-a. Šta je prvi korak?
- [ ] Prepisati kod
- [x] Vratiti prethodnu verziju, pa istražiti uzrok
- [ ] Obrisati bazu
- [ ] Čekati da proradi sama
> Prvo se vraća usluga korisnicima, a uzrok se traži bez pritiska.

### 2. Server prijavljuje greške pri upisu fajlova. Koja komanda brzo proverava zauzeće diska?
- [ ] `free -m`
- [x] `df -h`
- [ ] `top`
- [ ] `ls -la`
> df pokazuje slobodan prostor po particiji. Česti krivci su logovi i stari Docker image-i (`docker system df`).

### 3. Kako proveravaš da li API na serveru odgovara, bez pregledača?
- [ ] `ping api`
- [x] `curl -v http://localhost:8080/health`
- [ ] `ls /api`
- [ ] `git status`
> curl šalje pravi HTTP zahtev i pokazuje status i zaglavlja. ping proverava samo mrežnu dostupnost.

### 4. Šta je postmortem „bez krivca” (blameless)?
- [ ] Izveštaj koji imenuje krivca
- [x] Analiza incidenta koja traži uzroke u sistemu i procesu, ne u ljudima
- [ ] Brisanje logova posle incidenta
- [ ] Izveštaj koji se ne piše
> Kad ljudi ne strahuju od kazne, iskreno kažu šta se desilo, pa tim stvarno popravi proces.

### 5. Šta je razlog da se tajne ne stavljaju u Docker image?
- [ ] Image bi bio veći
- [x] Image se deli i čuva u registry-ju, pa bi tajna bila dostupna svakome ko ga preuzme
- [ ] Docker ne podržava tajne
- [ ] Usporava pokretanje
> Tajne se ubacuju pri pokretanju (promenljive okruženja, secrets). Image treba da bude isti za sva okruženja.
