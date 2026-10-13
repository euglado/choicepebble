# ChoicePebble

Discord toplulukları için küçük, tıklanabilir karar anketleri. **Türkçe** aşağıda; [English](#english) follows.

Örnek: Bir okuma kulübü yöneticisi “Gelecek buluşmada ne yapalım?” sorusuna “Kitap tartışması”, “Film sohbeti” ve “Serbest sohbet” seçeneklerini girer. Önizlemeyi onayladıktan sonra üyeler düğmelerle oy verir. Mesajda yalnızca seçenek toplamları görünür; üyeler oylarını değiştirebilir veya geri çekebilir.

Bu, Discord Gateway'e bağlanan gerçek bir bottur. GitHub Actions yalnızca kaynak kodu test eder; botu barındırmaz. Çalıştırmak için kendi Discord uygulamanız, bot tokenınız ve açık kalan bir bilgisayar/sunucu gerekir. Otomatik testler Discord etkileşimlerini taklit eder; bu yayında gerçek tokenla canlı sunucu testi yapılmadı.

## Türkçe

### Amaç ve özellikler

- `/choicepebble` yöneticinin soru ve 2–4 seçenek girdiği bir form açar. Kod düzenlemeniz gerekmez.
- Özel önizleme açıkça onaylanmadan kanala hiçbir anket gönderilmez. Önizleme 10 dakika geçerlidir.
- Metin etiketli, numaralı düğmeler; renk veya emojiye bağımlı olmayan seçenekler ve toplamlar kullanılır. Ekran okuyucu davranışı kullandığınız Discord istemcisinde ayrıca değerlendirilmelidir.
- Her üyenin tek tercihi vardır; başka seçeneğe basarak değiştirir, “Oyumu geri çek” ile kaldırır.
- Yalnızca **Sunucuyu Yönet** yetkilileri anket açabilir veya kapatabilir. Kapatma ayrıca özel onay ister; o sırada yetki tekrar kontrol edilir.
- Türkçe/İngilizce mesajlar birlikte gösterilir. Discord'un saat gösterimi bitiş zamanını üyenin yerel saatine çevirir.
- Hesap, ödeme, veritabanı veya ayrı web paneli gerektirmez. Tek yapılandırılmış Discord sunucusunda çalışır.

Bu bot gizli veya bağlayıcı seçim, moderasyon, kimlik doğrulama, oy hilesi önleme ya da istatistiksel örnekleme sağlamaz. Alternatif Discord hesapları ayrı oy verebilir. Canlı toplamlar oy zamanlamasından tercihlerin tahmin edilmesine izin verebilir. Discord'un yerleşik anketlerini değiştirmez. DM, forum, başlık/thread ve ses kanalları desteklenmez. Hassas kişisel veri içeren sorular sormayın.

### Gereksinimler

1. [Node.js 24 LTS](https://nodejs.org/en/download) ve beraberindeki npm. Başka ana sürümler bu projede desteklenmez. `node --version` çıktısı `v24.` ile başlamalıdır.
2. Botu davet edebildiğiniz bir Discord sunucusu; anket yöneticileri için **Sunucuyu Yönet** yetkisi.
3. İnternet bağlantısı ve botu açık tutacak Windows, macOS veya Linux bilgisayar. Discord hesabı tokenı değil, Developer Portal'dan **bot tokenı** kullanılır.

### Discord Developer Portal: baştan sona

1. [Developer Portal](https://discord.com/developers/applications)'ı açın, **New Application** ile ayrı bir uygulama oluşturun; örneğin ChoicePebble.
2. **General Information** sayfasındaki **Application ID** değerini güvenli biçimde not edin. Public Key veya Client Secret bu projede kullanılmaz.
3. **Bot** sayfasına geçin; gerekirse bot kullanıcısı oluşturun. **Reset Token** ile tokenı alın. Tokenı yalnızca kurulumdaki gizli alana yapıştırın. Sohbete, ekran görüntüsüne, GitHub'a veya hata raporuna koymayın. Açığa çıkarsa hemen aynı sayfada yenileyin.
4. **Privileged Gateway Intents** altında Presence, Server Members ve Message Content anahtarlarını **kapalı** bırakın.
5. **Installation** bölümünde **Guild Install** kullanın; User Install gerekli değildir. Varsayılan kurulum kapsamları `bot` ve `applications.commands`, bot izinleri yalnızca **View Channels** ve **Send Messages** olmalı. Portal adları değişirse [resmi kurulum kılavuzunu](https://docs.discord.com/developers/quick-start/getting-started) izleyin.
6. Discord'da **Kullanıcı Ayarları → Gelişmiş → Geliştirici Modu** seçeneğini açın. Sunucunun simgesine sağ tıklayın ve **Sunucu ID'sini Kopyala** seçeneğini kullanın. Kanal ID'si yerine sunucu ID'si gerekir.
7. Aşağıdaki kurulumu çalıştırın. Yardımcı, Application ID, Server ID ve gizli tokenı sorar; `.env` dosyasını otomatik oluşturur ve tıklanabilir davet bağlantısı yazdırır.
8. Davet bağlantısını açın, doğru sunucuyu seçin ve izinleri onaylayın. Bot katıldıktan sonra yardımcıya dönüp Enter'a basın; komut yalnızca bu sunucuya kaydedilir.

**Yönetici/Administrator**, Manage Messages, Manage Channels, Read Message History, Embed Links, Add Reactions veya oy/üyelik için özel intents vermeyin. Kanalın izin üzerine yazımları botun mesaj göndermesine izin vermelidir. Bot kendi mesajını düzenler; başkalarının mesajlarını düzenlemez veya silmez.

### Kurulum

Depoyu [GitHub'dan](https://github.com/euglado/choicepebble) **Code → Download ZIP** ile indirin. ZIP'i tamamen çıkarın; dosyaları ZIP içinden çalıştırmayın. Node.js kurulumundan sonra terminali yeniden açın.

**Windows:** Çıkarılan klasörde `setup.cmd` dosyasına çift tıklayın. Form sorularını yanıtlayın, daveti açın, bot katıldıktan sonra devam edin. Sonra `start.cmd` dosyasına çift tıklayın. Token girerken ekranda hiçbir karakter görünmez; bu normaldir. PowerShell script çalıştırma politikasını gevşetmeniz gerekmez.

**macOS/Linux:** Terminalde çıkarılan klasöre gidin. Aşağıdaki komutları sırayla çalıştırın; davet ve giriş soruları kurulumu yönlendirir:

```sh
bash setup.sh
bash start.sh
```

**Elle terminal akışı** (Windows'ta Komut İstemi veya `npm.cmd` kullanabilirsiniz):

```sh
npm ci --ignore-scripts
npm run build
npm run setup
# Yazdırılan daveti açın ve botun sunucuya katılmasını bekleyin.
npm run register
npm start
```

`ChoicePebble çevrimiçi / ChoicePebble online` satırı bağlantının kurulduğunu gösterir. İlk denemeyi küçük bir test kanalında yapın. Git kurulu olmak normal kurulum için gerekli değildir.

### Yapılandırma ve güncelleme

Kurulum `.env` dosyasına yalnızca `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID` yazar. Dosya Git tarafından yok sayılır. macOS/Linux'ta yeni dosya yalnızca sahibi okuyabilecek izinle oluşturulur; Windows'ta klasörün hesap erişim izinlerini de siz korumalısınız. Disk şifrelemesi ve erişim kontrolü işletim sisteminizin sorumluluğudur.

Yardımcı mevcut `.env` dosyasının üzerine yazmaz. Yanlış ID, token yenileme veya sunucu değiştirme için botu durdurun, mevcut `.env` dosyasını güvenli bir yere taşıyın ve `npm run setup` ile yeniden kurun. Sonra yeni daveti kullanıp `npm run register` çalıştırın. Eski tokenı içeren dosyayı güvenle kaldırın; tokenı açığa çıkardıysanız Portal'da yenilemeden yeniden kullanmayın. Kaynak kodunu düzenlemeniz gerekmez. Komut kaydı yalnızca `/choicepebble` komutunu ekler/günceller; uygulamanın diğer komutlarını topluca silmez.

Güncellemede botu durdurun; aynı kaynaktan yeni sürümü ayrı klasöre çıkarın, `.env` dosyanızı güvenle taşıyın, `npm ci --ignore-scripts`, `npm run build`, `npm run register` çalıştırın ve yeni klasörden başlatın. Aynı bot tokenıyla **yalnızca bir süreç** çalıştırın. Birden çok süreç/shard veya yatay ölçekleme desteklenmez. Yeniden başlatma devam eden anketleri sona erdirir.

### Kullanım

1. Normal bir sunucu metin kanalında, Sunucuyu Yönet yetkisiyle `/choicepebble` yazın.
2. Kısa bir soru ve her satıra bir seçenek olacak şekilde 2–4 seçenek girin. Başlık 1–80, seçenekler 1–60 karakterdir. Boş, yinelenen veya gizli kontrol/yön karakterli girişler reddedilir; bazı birleşik emojiler de bu nedenle kabul edilmez.
3. Yalnızca size görünen önizlemeyi okuyun. **Yayımla / Publish** mesajı kanala gönderir; **Vazgeç / Cancel** iptal eder. Yeni önizleme aynı sunucudaki eski önizlemenizi değiştirir.
4. Üyeler istedikleri seçeneğe basar. Yanıt yalnızca o üyeye görünür; mesajdaki toplamlar güncellenir. Oy değiştirme ve geri çekme açıktır; aynı seçeneğe tekrar basmak ek oy oluşturmaz.
5. Yönetici **Yönetici: kapat / Manager: close** ve ardından özel **Kapatmayı onayla** düğmesine basar. Düğmeler devre dışı kalır, toplamlar mesajda tutulur ve oy kimlikleri bot belleğinden kaldırılır.
6. Anket yayımdan 24 saat sonra süresi dolar. Sadece zaman dolduğu için Discord mesajı otomatik düzenlenmez; eski düğmeler tıklanınca süresinin dolduğu bildirilir. Discord mesajını temizlemek isterseniz yetkili kişi olarak elle silin.

Sunucuda en çok 2, süreçte 20 açık anket; ankette 500 katılımcı; süreçte 200 önizleme sınırı vardır. Yayımlar arasında sunucuda 30 saniye; anketin başarılı toplam güncellemeleri arasında 1,5 saniye beklenir. Eşzamanlı sunucu yazmaları sıraya alınmak yerine özel “tekrar deneyin” yanıtı alır. Yoğun topluluklarda gecikme/yeniden tıklama gerekir; büyük veya yüksek önemde seçimlere uygun değildir.

### Botu çalışır tutma

Terminal/pencere açık, bilgisayar uyanık ve internet bağlı kalmalıdır. GitHub CI botu 7/24 çalıştırmaz. Bilgisayar kapanırsa bot çevrimdışı olur. Sürekli kullanım için güvendiğiniz bir sunucuda Node.js 24 ile tek süreç çalıştırın; işletim sisteminin servis yöneticisini kullanabilir ve `.env` dosyasını sadece servis hesabına açabilirsiniz. Ücretli barındırma zorunlu değildir; gizli dosyayı yedeklere veya public panellere koymayın. Bu depo otomatik dağıtım veya VDS kurulumu yapmaz.

Ctrl+C veya terminali kapatma botu durdurur. Oylar diske yazılmaz; yeniden başlamada geri gelmez. Yeniden başlatmadan önce anketleri kapatın veya üyelere eski kartların çalışmayacağını bildirin. Eski kartlardaki düğmeler görünmeye devam edebilir; bot bunlara güvenli bir süre doldu yanıtı verir. Komut sadece yapılandırılmış sunucuda dinlenir.

### Güvenlik, veriler ve gizlilik

- Oy kimliği ve seçenek eşlemesi, anket/sunucu/kanal/mesaj kimlikleri ve soru geçici süreç belleğindedir. Önizlemeler ayrıca oluşturan kullanıcının kimliğini tutar. Oy kimlikleri mesajlara veya uygulama loglarına yazılmaz.
- Kapatma başarılı olunca veya üye oyunu çekince ilgili oy kaydı hemen kaldırılır. Süresi dolan kayıtlar etkileşimde veya en geç sonraki yaklaşık bir dakikalık temizlikte kaldırılır. Süreç bitince bellek kaybolur. Bellek anlık görüntüleri, işletim sistemi takası ve hizmet sağlayıcı logları operatörün sorumluluğudur.
- Discord'daki soru, seçenekler ve toplamlar kanal üyelerine görünür; silininceye kadar Discord'da kalır. Özel/ephemeral yanıtlar da Discord tarafından işlenir; bot Discord'un saklama süresini kontrol etmez. Sunucu üyeleri mesajları kopyalayabilir.
- Operatör RAM'e erişebilir. **Anonimlik veya gizli oy güvencesi yoktur.** Canlı toplamlar, zamanlama ve alternatif hesaplar nedeniyle hassas veya bağlayıcı kararlar için kullanmayın.
- Bot yalnızca Guilds intent kullanır; mesaj geçmişini, normal sohbeti, ses verisini, presence veya üye listesini toplamaz. Gelen etkileşimin temel Discord bilgileri yine Discord kütüphanesine ulaşır. Veritabanı, telemetri veya üçüncü taraf analiz servisi yoktur. Mesaj önbelleği kapalıdır.
- Mention gönderimi ve bağlantı önizlemeleri bastırılır; kullanıcı metni Markdown'da kaçışlanır. İzinler her yönetici işleminde kontrol edilir. Önizlemeler kullanıcı/sunucu/kanala, anket düğmeleri kendi kaynak mesajına bağlıdır.
- Hata logları ham Discord yanıtlarını, etkileşim tokenlarını veya `.env` değerlerini yazmaz. Kaynak örüntü taraması tüm gizli bilgileri bulma garantisi değildir. Bir güvenlik denetimi iddiası yapılmaz.
- Bot tokenıyla Discord'a Gateway ve resmi REST API üzerinden bağlanır. Npm kurulumunda npm registry'ye erişilir; çalışma zamanında harici yayın indirme veya müzik aktarımı yapılmaz.

### Sorun giderme

- **Node/npm bulunamadı:** Node.js 24'ü kurup terminali yeniden açın. `node --version` ve `npm --version` çalıştırın. PowerShell `npm.ps1` engellerse Komut İstemi veya `npm.cmd` kullanın.
- **Kurulum girişi görünmüyor:** Token gizlidir ve ekran tamamen boş kalır. Yapıştırıp Enter'a basın. Noninteractive/pipe ile kurulum desteklenmez.
- **`.env` zaten var:** Üzerine yazılmaz. Botu durdurup dosyayı güvenle taşıyın; yeniden kurulum yapın. Tokenı hata raporuna eklemeyin.
- **Komut görünmüyor:** Botun doğru uygulamayla doğru sunucuya davet edildiğini, `applications.commands` kapsamını ve ID'leri kontrol edin. `npm run register` çalıştırın; Discord istemcisini yenileyin. Sunucuyu Yönet izni olmayanlar komutu göremeyebilir.
- **Eksik izin / kanal bulunamadı:** Normal metin kanalı kullanın. Bot için kanal üzerine yazımlarında Kanalı Görüntüle + Mesaj Gönder izinlerini kontrol edin. Ek olarak Administrator vermek çözüm değildir.
- **Anket güncelleniyor / işlem sürüyor:** İki saniye bekleyip tekrar basın; bir oy başarıyla kaydedildiyse özel yanıt gelir. Discord hız sınırı veya ağ kesintisi varsa daha uzun sürebilir.
- **Discord işlemi doğrulanamadı:** Önce kanaldaki gerçek mesajı ve toplamları kontrol edin. Zaman aşımı uzaktaki işlemin gerçekleşip gerçekleşmediğini kesin göstermeyebilir. Yayımlama önizlemesi tekrar göndermeyi önlemek için tüketilir; yalnızca kanalda kart yoksa yeni form açın. Oy/kapama hatasında yerel durum korunur; tekrar denemeden toplamları kontrol edin.
- **Süresi dolmuş / bot yeniden başladı:** Devam eden anketler kalıcı değildir. Yetkili kişi eski mesajı elle silebilir ve yeni anket açabilir.
- **Sınır dolu:** Açık anketleri onaylayarak kapatın veya süre dolmasını bekleyin; yeni önizleme için 10 dakika sonra deneyin. 500 kişilik ankette mevcut üyeler yine oy değiştirebilir/çekebilir.
- **Bağlantı hatası:** İnternet/Discord durumunu ve Portal bot tokenını kontrol edin. Tokenı yenilediyseniz güvenli yeniden kurulum yapın; tokenı destek için paylaşmayın.

### Testler, katkı ve lisans

Node.js 24 ile şu komutlar kullanılır; token veya Discord sunucusu gerektirmez:

```sh
npm ci --ignore-scripts
npm run check
npm audit --audit-level=low
node --check scripts/setup.mjs
node --check scripts/check-supply.mjs
# Bash bulunan ortamlarda:
bash -n setup.sh start.sh
```

`npm run check`: Biome statik analiz/biçim kontrolü, strict TypeScript derlemesi, Node testleri ve bağımlılık lisans/kaynak/SHA-512 bilgisi ile kaynak gizli bilgi örüntü kontrolleridir. `npm ci` kilit dosyasındaki indirme bütünlüğünü doğrular. `npm audit` bilinen npm güvenlik duyurularını kontrol eder; bilinmeyen açıkların yokluğunu kanıtlamaz. CI aynı kontrolleri Windows, Ubuntu ve macOS Intel'de read-only GitHub tokenı ve SHA ile sabitlenmiş action sürümleriyle çalıştırır.

Testler izin kaybı, yanlış önizleme sahibi, geçersiz giriş, kapasite/TTL, oy değiştirme/çekme, eşzamanlı işlem, API yazma hatası ve güvenli yapılandırma hatalarını kapsar. Gerçek Discord gönderimi, Portal kurulumu, tokenın terminalde girilmesi ve ekran okuyucu uyumu operatörün kendi test sunucusunda doğrulamasını gerektirir. Bu yayında VDS veya canlı token kullanılmadı.

Katkılar için [CONTRIBUTING.md](CONTRIBUTING.md), güvenlik bildirimi için [SECURITY.md](SECURITY.md) dosyasını okuyun. Lisans [MIT](LICENSE); bağımlılıkların kendi lisansları geçerlidir. Sorun bildirirken yalnızca güvenli hata mesajını, Node/işletim sistemi sürümünü ve yeniden üretme adımlarını paylaşın.

## English

### Purpose and features

ChoicePebble is a real Discord Gateway bot for low-stakes community decisions. A manager enters a question and 2–4 options, reviews a private preview, then explicitly publishes a button-based poll. Members can change or withdraw their single vote. Only option totals appear publicly. Closing requires Manage Server and a separate private confirmation. All interface messages include Turkish and English; options have text and numbers rather than depending on colors or emojis.

For example, a book club can choose its next activity: discussion, film chat or social evening. No code editing, database, payment, web dashboard or separate user account is needed. This release serves one configured Discord server. Accessibility should still be checked with your Discord client and screen reader.

It does not provide secret or binding ballots, moderation, identity verification, fraud prevention or statistical sampling. Alternate accounts can vote independently. Live totals and timing may reveal preferences. Do not ask for sensitive personal data. It does not alter Discord native polls. DMs, threads, forums and voice channels are unsupported. GitHub Actions tests the code; it does not host the bot. Automated interactions are mocked; this release has not been tested with a real bot token/server.

### Requirements

- [Node.js 24 LTS](https://nodejs.org/en/download) with npm; only major version 24 is supported. `node --version` must start with `v24.`.
- A Discord server where you can invite a bot. Poll organizers require **Manage Server**.
- Windows, macOS or Linux, an internet connection, and a machine that stays awake and connected. Use a **bot token**, never a Discord user-account token.

### Developer Portal and installation

1. Open the [Discord Developer Portal](https://discord.com/developers/applications). Select **New Application**, create a separate app and copy its **Application ID** from General Information. Public Key and Client Secret are not used.
2. Open **Bot**, create the bot user if needed, and use **Reset Token** to obtain its token. Keep it private. Never put it in chat, screenshots, GitHub or issue reports. Reset it immediately if exposed.
3. Leave **Presence**, **Server Members** and **Message Content** privileged intents **off**.
4. In **Installation**, use **Guild Install**, scopes `bot` and `applications.commands`, and only **View Channels** + **Send Messages** bot permissions. User Install is unnecessary. See the [official setup guide](https://docs.discord.com/developers/quick-start/getting-started) if Portal labels change.
5. In Discord, enable **User Settings → Advanced → Developer Mode**. Right-click the server icon and **Copy Server ID**. A channel ID will not work.
6. Download this repository using [Code → Download ZIP](https://github.com/euglado/choicepebble) and fully extract it. Install Node.js 24 and reopen your terminal.
7. **Windows:** double-click `setup.cmd` in the extracted folder. **macOS/Linux:** open a terminal in that folder and run `bash setup.sh`. Provide your token, Application ID and Server ID. The token input displays no characters. The helper writes `.env` automatically and prints an invite URL.
8. Open the invite URL, authorize the bot for your server, then return and press Enter when the bot has joined. The helper registers `/choicepebble` only for this server.
9. **Windows:** double-click `start.cmd`. **macOS/Linux:** run `bash start.sh`. The `ChoicePebble online` message confirms connection. Start with a small test channel.

Do not grant Administrator, Manage Messages/Channels, Read Message History, Embed Links, Add Reactions or privileged intents. Channel overrides must allow View Channel and Send Messages. The bot edits its own messages and does not edit/delete other messages. Command registration upserts only `/choicepebble`; it does not replace other commands for your application.

If using manual terminal commands, run these in order. On Windows use Command Prompt or `npm.cmd` if PowerShell blocks `npm.ps1`:

```sh
npm ci --ignore-scripts
npm run build
npm run setup
# Open the printed invite URL and wait for the bot to join.
npm run register
npm start
```

### Configuration and updates

The interactive helper creates `.env` with `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID` and `DISCORD_GUILD_ID`; no source editing is needed. Git ignores the file. On Unix the new file is owner-only; on Windows protect the folder with your account permissions. The operating system and hosting provider determine disk, swap and backup protection.

Existing `.env` files are never overwritten. To replace a token, correct IDs or move servers, stop the bot, securely move the old file, run `npm run setup` again, invite the bot and run `npm run register`. Securely remove old credential files. Rotate exposed tokens in the Portal first.

To update, stop the bot, extract the new source into a separate folder, securely move `.env`, run `npm ci --ignore-scripts`, `npm run build` and `npm run register`, then start from the new folder. Run **one process** per bot token. Multiple processes/shards and horizontal scaling are unsupported. Restarting ends all active polls; votes do not survive.

### Usage and limits

1. In a regular server text channel, use `/choicepebble` with Manage Server permission.
2. Enter a 1–80-character question and 2–4 distinct options, one per line, each 1–60 characters. Empty, duplicate and hidden/control/direction-character input is rejected; some combined emojis are therefore also rejected.
3. Review the private preview. **Publish** posts a public poll; **Cancel** discards it. Previews expire after ten minutes; a new preview replaces your previous one in the same server.
4. Members select an option, select a different option to change, or use **Withdraw vote**. Responses are private, totals public. Clicking the same choice twice does not add a vote.
5. A manager selects **Manager: close** and confirms privately. The message keeps frozen totals with disabled buttons; voter records leave bot RAM. Permission is checked again at confirmation.
6. After 24 hours the poll expires. Merely reaching expiry does not edit the Discord message; old buttons respond that the poll is unavailable when clicked. An authorized person can delete old cards manually.

Limits: 2 open polls per server, 20 per process, 500 voters per poll, 200 previews per process. Publications have a 30-second server cooldown. Successful aggregate updates have a 1.5-second poll cooldown. Concurrent writes in a server receive a private retry message rather than queuing. Busy communities may need to wait and click again; this is unsuitable for high-volume or high-stakes voting. Existing voters at capacity can still change/withdraw.

### Keeping the bot online

Keep its terminal open and its computer awake and connected. GitHub CI does not run the bot continuously. For ongoing use, run a single Node.js 24 process on a trusted always-on host, optionally under your OS service manager, with `.env` restricted to its service account. Paid hosting is not mandatory. Do not expose the credential file in backups or public dashboards. This repository does not deploy a VDS or install a production service.

Ctrl+C or closing the terminal stops the bot. Close active polls before restarting or tell members that old cards will become unavailable. Old buttons may remain visible, but the bot fails safely when clicked. Only the configured server's interactions are handled.

### Permissions, security and privacy

- Voter-to-option mappings, poll content and server/channel/message IDs stay in temporary process RAM. Previews also hold their owner's user ID. No voter IDs are put in public messages or application logs.
- A successful close removes that poll's vote records; withdrawal removes your record. Expired records are pruned on interaction or within approximately the next one-minute cleanup interval. Process termination loses memory. Host memory snapshots, swap and provider logs remain the operator's responsibility.
- Questions, options and totals remain on Discord until their messages are deleted. Discord also processes ephemeral replies and controls its own retention. Members can copy public content.
- The operator can inspect process memory. **This is not a secret ballot or an anonymity guarantee.** Live totals, timing and alternate accounts make it unsuitable for sensitive or binding decisions.
- Guilds is the only Gateway intent. No ordinary chat/history, voice, presence or member-list collection is used. Basic interaction metadata still reaches the Discord library. Message caching is disabled. There is no database, analytics or third-party telemetry service.
- Mentions and link previews are suppressed; user text is Markdown-escaped. Every manager action checks permissions. Previews are bound to their user/server/channel; poll controls are bound to their source message.
- Logs do not print raw Discord errors, interaction tokens or `.env` values. Source credential-pattern checks have limited coverage; they are not a complete security audit or proof that arbitrary secrets are absent.
- Runtime connections use the official Discord Gateway and REST APIs with your bot token. Installation accesses the npm registry. No unauthorized media downloads or streaming are implemented.

### Troubleshooting

- **Node/npm missing:** install Node.js 24, reopen the terminal, check `node --version` and `npm --version`. Use Command Prompt/`npm.cmd` if PowerShell blocks scripts; no execution-policy change is needed.
- **Token field appears blank:** input is hidden completely. Paste the token and press Enter. Setup requires an interactive terminal; piped input is rejected.
- **Existing `.env`:** stop the bot, securely move it and rerun setup. Never attach the file to support requests.
- **Slash command absent:** verify Application/Server IDs, the bot's invite and `applications.commands` scope. Run `npm run register`, refresh Discord and check Manage Server permission.
- **Missing channel permissions:** use a regular text channel and check bot View Channel + Send Messages overrides. Do not solve this by granting Administrator.
- **Updating / operation in progress:** wait two seconds and retry. Discord rate limits or outages can cause longer delays. A successful vote gets a private acknowledgement.
- **Discord operation could not be confirmed:** check the actual public message and totals first. A network timeout may leave the remote outcome unknown. A publication preview is consumed before sending to prevent duplicate retries; create a new preview only if no card exists. Failed vote/close requests retain local state, so inspect totals before retrying.
- **Expired / restarted:** active votes are not persistent. An authorized manager may manually delete the stale card and create a new poll.
- **Capacity reached:** close existing polls or wait for expiry; previews expire in ten minutes. Existing voters can change/withdraw at the 500-voter limit.
- **Connection failure:** check network/Discord status and bot token in the Portal. Use safe reconfiguration after rotating it. Never share the token for troubleshooting.

### Tests, contributing and license

No token/server is needed for automated checks:

```sh
npm ci --ignore-scripts
npm run check
npm audit --audit-level=low
node --check scripts/setup.mjs
node --check scripts/check-supply.mjs
bash -n setup.sh start.sh
```

The last command requires Bash. `npm run check` runs Biome lint/format, strict TypeScript compilation, Node tests, lockfile license/registry/SHA-512 checks and source credential-pattern checks. `npm ci` verifies downloaded package integrity. `npm audit` checks known npm advisories, not unknown vulnerabilities. Read-only SHA-pinned CI runs the same checks on Windows, Ubuntu and macOS Intel.

Tests cover revoked permissions, foreign previews, validation, TTL/capacity, vote changes/withdrawal, concurrent work, failed API writes and safe configuration failure. Interactions are mocked. Validate real Discord sending, Portal installation, interactive token input and screen-reader behavior in your own test server. No live Discord credentials or VDS were used for this release.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Licensed under [MIT](LICENSE); dependencies retain their own licenses. Issue reports should contain only safe error text, OS/Node versions and reproduction steps.

Official references: [Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding), [components and Label modals](https://docs.discord.com/developers/components/reference), [application commands](https://docs.discord.com/developers/interactions/application-commands), [permissions](https://docs.discord.com/developers/topics/permissions), [Gateway](https://docs.discord.com/developers/events/gateway), [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy).
