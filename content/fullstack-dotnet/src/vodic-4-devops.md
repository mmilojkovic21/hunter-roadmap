---
id: 32
subtitle: "fajl sistem, komande koje se stalno koriste, prava pristupa, procesi i signali, promenljive okruženja, bash skripta, SSH i cron"
minutes: 45
---
# 32 Linux i terminal

Gotovo svi serveri i kontejneri rade na Linuxu, a njima se upravlja iz terminala. macOS je srodan (Unix), pa većina komandi radi isto i lokalno. Na Windows-u isto važi u WSL-u.

## Pojmovi

### Fajl sistem

| Putanja | Šta je |
|---|---|
| `/` | koren svega (nema „C:” diska) |
| `/home/ana` ili `~` | lični folder korisnika |
| `/etc` | podešavanja sistema i servisa |
| `/var` | promenljivi podaci: logovi (`/var/log`), baze, keš |
| `/tmp` | privremeni fajlovi (sistem ih briše pri restartu ili posle nekog vremena) |
| `.` / `..` | trenutni / roditeljski folder |

Imena su osetljiva na velika i mala slova: `App.log` i `app.log` su dva fajla.

### Komande koje se stalno koriste

```bash
pwd; ls -la; cd /var/log              # gde sam, šta ima (i skriveno), idi
mkdir -p backup/2026; cp a b; mv a b  # napravi (sa roditeljima), kopiraj, premesti
rm -rf folder                         # obriši bez pitanja (oprezno: nema korpe)
cat fajl; less fajl; tail -f app.log  # prikaži; listaj; prati log uživo
grep -rn "ERROR" /var/log/app         # traži tekst rekurzivno, sa brojem reda
find . -name "*.dump" -mtime +30      # fajlovi starije od 30 dana
du -sh *; df -h; free -h              # veličina foldera, slobodan disk, memorija
ps aux; top; kill 1234                # procesi, opterećenje, ugasi proces
curl -i https://example.com/health    # HTTP zahtev iz terminala, sa zaglavljima
```

**Tokovi**: svaki proces ima ulaz (0, stdin), izlaz (1, stdout) i izlaz za greške (2, stderr).

```bash
cmd1 | cmd2          # izlaz prve je ulaz druge
cmd > out.txt        # izlaz u fajl (pregazi)
cmd >> out.txt       # dopiši na kraj
cmd > log.txt 2>&1   # i greške u isti fajl
```

### Prava pristupa

```
-rw-r----- 1 app app 2048 Oct 27 backup.dump
│└┬┘└┬┘└┬┘   └┬┘ └┬┘
│ │  │  │     │   └ grupa
│ │  │  │     └ vlasnik
│ │  │  └ ostali: ništa
│ │  └ grupa: čitanje
│ └ vlasnik: čitanje i pisanje
└ - fajl, d folder
```

```bash
chmod 600 backup.dump      # samo vlasnik čita i piše (r=4, w=2, x=1 → 4+2=6)
chmod 755 deploy.sh        # vlasnik sve (7), ostali čitaju i izvršavaju (5)
chown app:app /data/keys   # promeni vlasnika i grupu
sudo komanda               # izvrši kao root (administrator)
```

Princip najmanjih privilegija: aplikacija radi kao običan korisnik, ne kao root (i u kontejneru, pogl. 35), a fajlovi sa tajnama imaju prava 600.

### Procesi, signali, servisi

Proces je pokrenut program sa svojim ID-jem (PID). `kill PID` šalje **SIGTERM**: molbu da se proces uredno ugasi (zatvori veze, završi zahteve). `kill -9 PID` šalje **SIGKILL**, koji se ne može uhvatiti ni ignorisati: poslednje sredstvo. Ko zauzima port: `lsof -i :8080` ili `ss -ltnp`.

Server je proces koji ne prestaje, pa ga neko mora pokrenuti posle restarta: **systemd** (`systemctl status nginx`, `journalctl -u nginx`) ili Docker (`restart: unless-stopped`).

**Exit kod**: 0 je uspeh, sve ostalo greška. Skripte i CI odlučuju po njemu (`echo $?` pokaže kod poslednje komande).

### Promenljive okruženja

```bash
export DB_PASSWORD='...'       # postavi za ovaj shell i procese koje pokrene
echo "$DB_PASSWORD"            # čitanje
DOTNET_ENVIRONMENT=Production dotnet App.dll   # samo za jedan proces
```

Proces nasleđuje promenljive od onoga ko ga je pokrenuo. Tako se podešavanja i tajne daju aplikaciji bez fajlova u kodu; ASP.NET Core ih čita automatski, a `ConnectionStrings__Db` postaje `ConnectionStrings:Db` (pogl. 19).

### Shell skripta

```bash
#!/usr/bin/env bash
set -euo pipefail                      # prekini na grešci, na nedefinisanoj promenljivoj, na grešci u pipe-u
cd "$(dirname "$0")"                   # radi iz foldera skripte, odakle god je pozvana
stamp="$(date -u +%Y-%m-%dT%H%MZ)"     # izlaz komande u promenljivu
if [[ -n "${REMOTE:-}" ]]; then        # ako je promenljiva postavljena i nije prazna
  echo "Kopiram na $REMOTE"
fi
```

Bez `set -e` skripta nastavlja posle greške; bez `pipefail` se `false | true` smatra uspehom; bez `-u` greška u imenu promenljive postaje prazan string (`rm -rf "$DIR/"` sa praznim `DIR`). Promenljive uvek pod navodnicima: `"$fajl"`, jer ime sa razmakom inače postaje dva argumenta.

### SSH i cron

```bash
ssh-keygen -t ed25519                  # par ključeva: privatni ostaje kod tebe, javni ide na server
ssh-copy-id ana@203.0.113.10           # dodaj javni ključ u ~/.ssh/authorized_keys na serveru
ssh ana@203.0.113.10                   # prijava bez lozinke
scp backup.dump ana@203.0.113.10:/tmp/ # kopiranje preko SSH-a
crontab -e                             # zakazani poslovi
# min sat dan mesec dan-u-nedelji  komanda
  15  3   *   *     *              /opt/app/backup.sh   # svake noći u 03:15
```

Kad ključ radi, prijava lozinkom se gasi (`PasswordAuthentication no` u `sshd_config`), jer su lozinke meta automatskih napada. Cron pokreće posao sa minimalnim okruženjem (drugi `PATH`, bez tvojih promenljivih), pa skripta koristi pune putanje i piše izlaz u log.

## Dublje

**Uredno gašenje u kontejneru.** `docker stop` šalje SIGTERM procesu sa PID 1 i posle 10 s SIGKILL. ASP.NET Core na SIGTERM prestaje da prima nove zahteve i čeka da se tekući završe (`HostOptions.ShutdownTimeout`, podrazumevano 30 s). Ako je PID 1 shell skripta (`CMD ./start.sh` bez `exec`), signal ne stiže do aplikacije i ona umire nasilno posle 10 s. Zato `ENTRYPOINT ["dotnet", "App.dll"]` (exec oblik) ili `exec dotnet App.dll` u skripti.

**Gde gledati kad je server spor.** Redom: `top` ili `htop` (CPU, memorija, ko troši), `free -h` (da li se koristi swap), `df -h` (pun disk ruši baze i logove), `df -i` (ponestalo inode-a od mnogo malih fajlova), `journalctl` i `docker logs` (greške), pa metrike aplikacije i spori upiti u bazi (pogl. 39, 12). Pun disk je najčešći i najlakše se previdi.

**`rm -rf` i prazna promenljiva.** `rm -rf "$BUILD_DIR/"*` sa nepostavljenim `BUILD_DIR` postaje `rm -rf /*`. `set -u` ili `${BUILD_DIR:?nije postavljen}` prekidaju skriptu pre takve komande.

## Lab

1. Napravi folder sa tri `.log` fajla različite starosti (`touch -d '40 days ago' star.log`) i nađi one starije od 30 dana sa `find`.
2. Prebroji greške u logu: `grep -c ERROR app.log`, pa najčešće poruke: `grep ERROR app.log | sort | uniq -c | sort -rn | head`.
3. Napiši skriptu `backup.sh` sa `set -euo pipefail` koja pravi fajl sa vremenom u imenu i pravima 600; proveri `ls -l`. Dodaj `false | true` i vidi da skripta staje.
4. Pokreni `dotnet run` jedne aplikacije, nađi njen PID preko porta (`lsof -i :5000`) i ugasi je sa `kill`; u logu vidi uredno gašenje.
5. Napravi SSH ključ `ed25519` i (ako imaš server ili VM) prijavi se bez lozinke.
6. Napiši cron red za skriptu svakog dana u 03:15 i proveri ga na sajtu crontab.guru.

**Gotovo je kad:** bez traženja po internetu nalaziš fajl, tekst u logu, proces na portu i zauzet disk, a tvoja skripta staje na prvoj grešci.

## Pitanja sa intervjua

**P: Šta znače dozvole `rwxr-xr-x` (755)?**
Tri grupe po tri: vlasnik, grupa, ostali. r=4, w=2, x=1. 755 znači da vlasnik čita, piše i izvršava (7), a grupa i ostali čitaju i izvršavaju (5). Tipično za skripte i foldere; fajlovi sa tajnama dobijaju 600 (samo vlasnik).

**P: Kako nalaziš proces koji zauzima port i gasiš ga?**
`lsof -i :8080` ili `ss -ltnp | grep 8080` pokaže PID. `kill PID` šalje SIGTERM (molba da se ugasi uredno); ako ne posluša, `kill -9 PID` šalje SIGKILL koji se ne može ignorisati.

**P: Šta radi `2>&1`?**
Preusmerava standardni izlaz za greške (2) tamo gde ide standardni izlaz (1). `komanda > log.txt 2>&1` upisuje i normalan izlaz i greške u isti fajl.

**P: Kako bi našao zašto je server spor?**
top (CPU, memorija, ko troši), free -h (swap), df -h (pun disk), logovi (journalctl, docker logs, tail -f), pa metrike aplikacije i spori upiti u bazi. Pun disk je najčešći uzrok koji se previdi.

**P: Zašto SSH ključ, a ne lozinka?**
Privatni ključ ne napušta tvoj računar i ne može se pogoditi; server dobija samo javni ključ. Lozinke su meta automatskih napada, pa se posle podešavanja ključa prijava lozinkom gasi (PasswordAuthentication no).

**P: Šta radi set -euo pipefail u bash skripti?**
-e prekida skriptu na prvoj komandi koja padne, -u na upotrebi nedefinisane promenljive, a pipefail čini da pipe padne ako padne bilo koja komanda u njemu, ne samo poslednja.

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

## Izvori
- [GNU Bash Reference Manual: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [chmod (Linux man-pages)](https://man7.org/linux/man-pages/man1/chmod.1.html)
- [signal(7): SIGTERM i SIGKILL](https://man7.org/linux/man-pages/man7/signal.7.html)
- [crontab(5)](https://man7.org/linux/man-pages/man5/crontab.5.html)
- [ssh-keygen (OpenBSD manual)](https://man.openbsd.org/ssh-keygen)
- [docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/)
- [Generic Host: gašenje (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/generic-host)
=====
---
id: 33
subtitle: "IP i portovi, DNS zapisi i TTL, TCP i UDP, NAT i firewall, localhost u kontejneru, TLS 1.3 i sertifikati"
minutes: 45
---
# 33 Mreža

Web aplikacija je niz mrežnih poziva: browser traži ime, povezuje se na server, dogovara šifrovanje i šalje HTTP. Kad nešto „ne radi”, skoro uvek je problem u jednom od tih koraka, pa ih treba znati redom.

## Pojmovi

### Od laptopa do servera

```
laptop 192.168.1.20 ── ruter (NAT, javna IP 77.46.1.9) ── internet ── server 203.0.113.10
                                                                       firewall: otvoreni 22, 80, 443
DNS: example.com → 203.0.113.10                                        :22 SSH  :443 HTTPS
                                                                       :8080 app i :5432 baza nisu dostupni spolja
```

**IP adresa** označava računar, **port** program na njemu. **DNS** pretvara ime u IP. Ruter kod kuće (**NAT**) deli jednu javnu adresu na više uređaja. **Firewall** na serveru pušta samo portove koji treba da budu javni.

| Pojam | Značenje |
|---|---|
| IP adresa | IPv4 `203.0.113.10`, IPv6 `2001:db8::1`; privatne `10.*`, `172.16–31.*`, `192.168.*` se ne vide sa interneta |
| `localhost` / `127.0.0.1` | „ovaj računar”; u kontejneru znači sam kontejner, ne domaćina |
| port | 22 SSH, 80 HTTP, 443 HTTPS, 5432 PostgreSQL, 6379 Redis |
| TCP / UDP | pouzdana veza sa redosledom (HTTP/1.1 i 2, baze, SSH) / bez garancija, manje kašnjenja (DNS, video; HTTP/3 preko QUIC-a) |
| DNS zapisi | `A` ime → IPv4, `AAAA` → IPv6, `CNAME` ime → drugo ime, `MX` server za poštu, `TXT` provere (SPF, DKIM, potvrda domena) |
| TTL | koliko dugo se DNS odgovor kešira; zato promena DNS-a ne važi odmah |
| firewall | pravila koji portovi su otvoreni (`ufw allow 443/tcp`) |

### Na čemu aplikacija sluša

Aplikacija koja sluša na `127.0.0.1:8080` prima veze samo sa iste mašine; na `0.0.0.0:8080` sluša na svim mrežnim interfejsima. U Docker kontejneru mapiran port (`-p 8080:8080`) stiže na mrežni interfejs kontejnera, pa aplikacija mora da sluša na `0.0.0.0`. Zvanične .NET slike to već podešavaju (`ASPNETCORE_HTTP_PORTS=8080`, sluša na svim adresama).

U Docker Compose mreži servisi se zovu **po imenu**: API se na bazu povezuje sa `Host=db`, ne `localhost`. Do domaćina se iz kontejnera stiže preko `host.docker.internal` (Docker Desktop; na Linuxu uz `extra_hosts: host-gateway`).

### Alati

```bash
dig example.com A +short          # šta DNS kaže (ili nslookup)
dig example.com A                 # i TTL, i koji server je odgovorio
curl -v https://example.com       # DNS, TCP, TLS rukovanje i HTTP, korak po korak
nc -zv db.example.com 5432        # da li je port otvoren
ss -ltnp                          # na kojim portovima i adresama ovde nešto sluša
traceroute example.com            # kroz koje rutere ide put
```

### TLS 1.3 i HTTPS

1. Browser pošalje **ClientHello**: podržane šifre i svoj deo razmene ključeva (Diffie-Hellman, `key_share`).
2. Server odgovori svojim delom. Iz ta dva dela obe strane izračunaju isti **simetrični ključ**, a da on nikad ne putuje mrežom; sve dalje ide šifrovano (simetrično šifrovanje je mnogo brže od asimetričnog).
3. Server pošalje **sertifikat** (javni ključ + domen, potpisan od sertifikacionog tela, CA) i potpis rukovanja svojim privatnim ključem, čime dokazuje da je vlasnik sertifikata.
4. Browser proveri lanac potpisa do CA kome veruje, domen i rok važenja. Tek tada ide HTTP zahtev.

Rezultat: **poverljivost** (niko ne čita), **integritet** (niko ne menja), **autentičnost** (to je stvarno taj server). TLS 1.3 to radi za jedan povratni put mrežom (TLS 1.2 je trebalo dva).

**Let's Encrypt** izdaje besplatne sertifikate automatski (protokol ACME), uz dokaz da kontrolišeš domen (HTTP-01: fajl na `/.well-known/acme-challenge/`, ili DNS-01: TXT zapis). Sertifikati traju sve kraće: od 15. 3. 2026. najviše 200 dana, od 2027. 100, a od 2029. 47 dana (CA/Browser Forum); Let's Encrypt sa 90 prelazi na 64 dana (februar 2027.) i 45 dana (februar 2028.). Obnavljanje zato mora biti automatsko (Caddy, certbot, cert-manager).

## Dublje

**Šta se tačno dešava kad otvoriš sajt.** (1) Browser pita DNS resolver za ime (keš browsera, sistema, resolvera; TTL). (2) TCP rukovanje na 443 (SYN, SYN-ACK, ACK), ili QUIC preko UDP-a za HTTP/3. (3) TLS 1.3 rukovanje sa proverom sertifikata. (4) HTTP zahtev sa cookie-jem; odgovor, pa browser parsira HTML, traži CSS i JS (često iz keša, pogl. 29) i crta stranicu. Na svakom koraku može da pukne nešto drugo: DNS (`NXDOMAIN`), firewall (timeout), sertifikat (istekao, pogrešan domen), aplikacija (5xx).

**Timeout i odbijena veza nisu ista greška.** „Connection refused” znači da je računar dostupan, ali na tom portu niko ne sluša (aplikacija ne radi ili sluša na `127.0.0.1`). Timeout znači da paketi ne stižu ili odgovor ne dolazi: najčešće firewall ili pogrešna IP adresa. Ova razlika odmah sužava pretragu.

**HSTS.** Zaglavlje `Strict-Transport-Security` (u ASP.NET Core `UseHsts`) kaže browseru da domen ubuduće otvara samo preko HTTPS-a, pa napadač u istoj mreži ne može da ga vrati na HTTP pri prvom kliku na `http://` link.

## Lab

1. `dig` za svoj ili poznat domen: nađi `A`, `AAAA`, `MX` i TTL; ponovi i vidi kako TTL opada iz keša resolvera.
2. `curl -v https://letsencrypt.org` i pročitaj redom: IP, TCP, TLS verzija i šifra, sertifikat, HTTP odgovor.
3. `echo | openssl s_client -connect letsencrypt.org:443 -servername letsencrypt.org | openssl x509 -noout -dates -issuer` i izračunaj koliko dana sertifikat važi.
4. Pokreni ASP.NET Core aplikaciju u kontejneru tako da sluša na `127.0.0.1` i pokaži da mapiran port ne radi; ispravi na `0.0.0.0` (ili `ASPNETCORE_HTTP_PORTS`).
5. U `docker-compose.yml` ove aplikacije nađi kako API dolazi do baze (ime servisa) i zašto baza nema izložen port.
6. Na zatvorenom i na nepostojećem portu uporedi grešku `nc -zv`: „refused” ili timeout.

**Gotovo je kad:** umeš da ispričaš put od imena u browseru do odgovora servera, korak po korak, i za svaku tipičnu grešku znaš u kom koraku je nastala.

## Pitanja sa intervjua

**P: Koja je razlika između TCP-a i UDP-a?**
TCP uspostavlja vezu i garantuje da podaci stignu, bez gubitaka i po redu (ponovno slanje, potvrde); koriste ga HTTP, baze, SSH. UDP šalje pakete bez veze i garancija, ali brže i sa manje kašnjenja; koriste ga DNS, video pozivi, igre.

**P: Šta je razlika između `localhost` i `0.0.0.0` kad aplikacija sluša?**
Aplikacija na 127.0.0.1 (localhost) prima veze samo sa iste mašine. Na 0.0.0.0 sluša na svim mrežnim interfejsima, pa je dostupna i spolja. Zato aplikacija u Docker kontejneru mora da sluša na 0.0.0.0, inače je ne vidi ni mapirani port.

**P: Koji DNS zapisi su najčešći?**
A povezuje ime sa IPv4 adresom, AAAA sa IPv6, CNAME je alias na drugo ime, MX određuje server za poštu, TXT nosi tekst (provere domena, SPF). TTL određuje koliko dugo se odgovor kešira.

**P: Šta se dešava kad otvoriš sajt?**
DNS pretvori ime u IP, TCP veza na 443 (ili QUIC za HTTP/3), TLS 1.3 rukovanje (razmena ključeva, sertifikat, provera), HTTP zahtev, odgovor, pa browser parsira HTML, preuzme CSS i JS i nacrta stranicu.

**P: Zašto je localhost u kontejneru zamka?**
U kontejneru localhost je sam kontejner. Drugi servis u compose mreži se zove po imenu (Host=db), a domaćin preko host.docker.internal. Aplikacija u kontejneru mora da sluša na 0.0.0.0.

**P: Connection refused ili timeout?**
Refused: računar je dostupan, ali na portu niko ne sluša (aplikacija ne radi ili sluša samo na 127.0.0.1). Timeout: paketi ne stižu ili nema odgovora, najčešće firewall ili pogrešna adresa.

**P: Koliko traje TLS sertifikat danas?**
Od 15. 3. 2026. najviše 200 dana, od 2027. 100, od 2029. 47 dana (CA/Browser Forum). Let's Encrypt izdaje 90-dnevne i prelazi na 64 (2027.) pa 45 dana (2028.), pa obnavljanje mora biti automatsko.

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

## Izvori
- [RFC 8446: TLS 1.3, pregled rukovanja](https://www.rfc-editor.org/rfc/rfc8446#section-2)
- [How HTTPS works / What happens when (MDN: How the web works)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
- [Let's Encrypt: Certificate Lifetime Rationale and Plans](https://letsencrypt.org/docs/cert-lifetimes/)
- [Let's Encrypt: from 90 to 45 days](https://letsencrypt.org/2025/12/02/from-90-to-45)
- [CA/Browser Forum: Ballot SC-081v3](https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/)
- [Let's Encrypt: Challenge Types](https://letsencrypt.org/docs/challenge-types/)
- [Docker: Networking in Compose](https://docs.docker.com/compose/how-tos/networking/)
- [.NET 8: podrazumevani port 8080 (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port)
- [Strict-Transport-Security (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
=====
---
id: 34
subtitle: "commit kao snimak, tri mesta izmena, grane, merge i rebase, revert i reset, konflikti, pull request, .gitignore i tajne"
minutes: 45
---
# 34 Git

Git je distribuirani sistem za verzionisanje: svaki commit je snimak celog projekta sa porukom, autorom i roditeljem, pa se istorija može čitati, porediti i vraćati. Svaki klon ima celu istoriju, pa se većina rada odvija lokalno, bez servera.

## Pojmovi

### Tri mesta i put izmene

```
radni folder ──add──▶ staging (index) ──commit──▶ lokalni repo ──push──▶ remote (GitHub)
     ▲                                                  │
     └──────────────────────── pull (fetch + merge/rebase) ◀──┘
```

```bash
git status; git diff                  # šta je izmenjeno (diff: još nije u staging-u)
git diff --staged                     # šta ide u sledeći commit
git add src/Book.cs                   # dodaj u staging (git add -p: deo po deo)
git commit -m "feat: late fee for loans"
git switch -c feature/reminders       # nova grana (stariji oblik: git checkout -b)
git log --oneline --graph             # istorija
git fetch; git pull --rebase; git push
git stash; git stash pop              # skloni izmene privremeno
git restore src/Book.cs               # odbaci izmene u fajlu (radni folder)
```

Commit se prepoznaje po hešu (`a1b2c3d`), izračunatom iz sadržaja, roditelja i metapodataka: isti commit ima isti heš na svakom klonu. **Grana** je samo pokazivač na commit koji se pomera sa svakim novim commit-om; **HEAD** pokazuje gde si sada.

### Merge i rebase

```
merge:   main ──A──B──────M        rebase:  main ──A──B
                \        /                             \
         feature C──D──┘                     feature    C'──D'   (novi heševi)
```

- **Merge** spaja grane i pravi merge commit; istorija ostaje kakva je bila.
- **Rebase** prepisuje tvoje commit-ove na vrh druge grane: istorija je linearna, ali commit-ovi dobijaju nove heševe. Zato se ne radi na granama koje su drugi već povukli.
- **Squash merge** (opcija u GitHub PR-u) spaja ceo PR u jedan commit na `main`-u.

### Poništavanje

| Komanda | Šta radi | Kad |
|---|---|---|
| `git revert abc123` | nov commit koji poništava stari | deljena grana: istorija se ne menja |
| `git reset --soft HEAD~1` | vrati granu, izmene ostaju u staging-u | popravka poslednjeg lokalnog commit-a |
| `git reset --hard HEAD~1` | vrati granu i obriši izmene | samo lokalno, pre push-a |
| `git commit --amend` | izmeni poslednji commit | samo pre push-a |
| `git reflog` | spisak gde je HEAD bio | „spasavanje” posle pogrešnog reset-a |

Revert merge commit-a traži roditelja koji ostaje: `git revert -m 1 <merge>`.

### Konflikti

Dve izmene istih linija. Git označi oba dela:

```
<<<<<<< HEAD                 ← tvoja verzija
var fee = days * 10;
=======                      ← razdvaja dve verzije
var fee = days * Rate;
>>>>>>> feature/rate         ← verzija koja stiže
```

Spoji ručno (često treba zadržati deo oba), obriši oznake, pokreni build i testove, `git add` i `git commit` (ili `git rebase --continue`).

### Rad u timu

Grana po zadatku → **pull request** sa opisom (šta, zašto, kako je testirano) → **pregled koda** → **CI** pokrene build i testove na PR-u (pogl. 38) → merge u `main` tek kad sve prođe. `main` je uvek spreman za isporuku, a zaštita grane (branch protection) zabranjuje direktan push i force push.

**Dobra poruka**: kratko šta i zašto, u imperativu. Česta konvencija je Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`), kao u ovom repou. Mali commit-ovi, jedna celina po commit-u.

### `.gitignore` i tajne

`.gitignore`: `bin/`, `obj/`, `node_modules/`, `.env`, `appsettings.*.local.json`. Važi samo za fajlove koji se još ne prate (za već praćen: `git rm --cached fajl`). **Tajna koja je jednom commitovana smatra se procurelom**: brisanje iz poslednjeg commit-a ne briše je iz istorije ni iz tuđih klonova, pa se ključ odmah menja. GitHub push protection i secret scanning odbijaju ili prijavljuju poznate formate tajni.

## Dublje

**Kako Git čuva podatke.** Četiri vrste objekata: *blob* (sadržaj fajla), *tree* (folder: imena i pokazivači na blob-ove i tree-jeve), *commit* (pokazivač na tree, roditelji, autor, poruka) i *tag*. Svaki je imenovan hešom svog sadržaja, pa nepromenjen fajl ne zauzima novo mesto, a izmena bilo čega u prošlosti menja heševe svih kasnijih commit-ova (zato rebase pravi „nove” commit-ove). Danas je heš SHA-1; Git 3.0 (najavljen, još nije izašao; poslednja verzija je 2.56) za nove repozitorijume prelazi na SHA-256 i podrazumevanu granu `main`.

**`git bisect`: koji commit je pokvario.** `git bisect start`, `git bisect bad` (sada ne radi), `git bisect good v1.4` (tada je radilo); Git binarnom pretragom predloži commit u sredini, ti kažeš good ili bad. Za 1000 commit-ova treba oko 10 koraka; `git bisect run dotnet test` to radi sam.

**`fetch` pa odluka.** `git pull` je `fetch` + `merge` (ili `rebase` uz `--rebase` ili `pull.rebase=true`). Kad nisi siguran šta stiže, prvo `git fetch` i `git log HEAD..origin/main`, pa tek onda spajanje. `git push --force-with-lease` je bezbednija verzija force push-a: odbija ako je na serveru nešto što još nisi video.

## Lab

1. U praznom folderu napravi repo, dva commit-a na `main`-u i granu sa jednim commit-om; nacrtaj istoriju sa `git log --oneline --graph --all`.
2. Uradi rebase grane na `main` i uporedi heš commit-a pre i posle.
3. Napravi konflikt (ista linija na dve grane), razreši ga i završi merge.
4. Merge-uj granu sa `--no-ff`, pa poništi taj merge sa `git revert -m 1 HEAD`; proveri sadržaj fajla.
5. Uradi `git reset --hard HEAD~1`, pa vrati izgubljeni commit preko `git reflog`.
6. Dodaj `.env` sa lažnom lozinkom, commit-uj ga, pa ga ukloni sa `git rm --cached` i `.gitignore`; pokaži da je lozinka i dalje u istoriji (`git log -p`).

**Gotovo je kad:** bez straha radiš rebase, revert i razrešavanje konflikta, znaš da vratiš „izgubljen” commit i objasniš zašto se commitovana tajna menja.

## Pitanja sa intervjua

**P: Koja je razlika između merge-a i rebase-a?**
Merge spaja grane i pravi merge commit; istorija ostaje kakva je bila, sa granama. Rebase premešta tvoje commit-ove na vrh druge grane, pa je istorija linearna, ali se commit-ovi prepisuju (novi heševi). Pravilo: ne rebase-uj grane koje su drugi već povukli.

**P: Kako poništavaš commit koji je već na deljenoj grani?**
`git revert <commit>` pravi novi commit koji poništava izmene; istorija se ne prepisuje, pa je bezbedno za deljene grane. `git reset` pomera granu unazad i menja istoriju; koristi se samo lokalno, pre push-a.

**P: Kako bi opisao dobar commit i pull request?**
Commit radi jednu logičku stvar i ima poruku koja kaže šta i zašto (npr. Conventional Commits: `fix: ...`). PR je mali, ima opis problema i rešenja, kako je testirano i šta reviewer treba da pogleda. Mali PR-ovi se brže i kvalitetnije pregledaju.

**P: fetch ili pull?**
fetch samo preuzme nove commit-ove sa remote-a i ne dira tvoju granu; pull je fetch + merge (ili rebase uz --rebase). Kad nisi siguran šta stiže: fetch, pa git log HEAD..origin/main, pa spajanje.

**P: Kako vraćaš commit izgubljen posle git reset --hard?**
git reflog pokaže gde je HEAD bio; nađeš heš i uradiš git reset --hard <heš> ili napraviš granu na njemu. Reflog je lokalan i čuva se oko 90 dana.

**P: Kako nalaziš commit koji je uveo grešku?**
git bisect: označiš jedan dobar i jedan loš commit, Git binarnom pretragom predlaže commit-ove u sredini. Za 1000 commit-ova oko 10 koraka; git bisect run <test> to radi automatski.

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

## Izvori
- [Pro Git (knjiga, git-scm.com)](https://git-scm.com/book/en/v2)
- [Pro Git: Rebasing i opasnosti](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
- [Pro Git: Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [git revert](https://git-scm.com/docs/git-revert)
- [git reflog](https://git-scm.com/docs/git-reflog)
- [git bisect](https://git-scm.com/docs/git-bisect)
- [Git: BreakingChanges (Git 3.0)](https://git-scm.com/docs/BreakingChanges)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [GitHub: Push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)
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
