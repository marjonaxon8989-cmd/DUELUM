# DUELUM — Bilimlar dueli

O'zbekiston maktab o'quvchilari uchun 1v1 va 4v4 bilim musobaqasi. Sayt: **https://duelum.onrender.com**

- Toza HTML + CSS + vanilla JavaScript: freymvork, `npm install` yoki build yo'q.
- Ma'lumotlar bazasi — **Firebase** (bepul Spark tarifi). Hosting — **Render** (bepul Static Site).
- Telegram bot — `bot/server.js` (bepul Render Web Service, tashqi kutubxonasiz).

## Fayl tuzilishi

```
index.html               barcha ekranlar
css/style.css            dizayn: kirish animatsiyasi, kunduzgi/tungi rejim, SVG ikonlar (emoji yo'q)
js/icons.js              barcha ikonlar (inline SVG)
js/i18n.js               matnlar 3 tilda (uz / ru / en)
js/data.js               fanlar, qo'lda yozilgan savollar, ligalar, premium narxlari, davlatlar
js/questions.js          savollar mexanizmi: generatorlar + fakt jadvallari
js/firebase-config.js    Firebase sozlamasi (onlayn rejim)
js/telegram-config.js    Telegram havolalari va bot integratsiyasi
js/cloud.js              Firebase: akkaunt, reyting, obuna, do'stlar, do'st bilan duel
js/storage.js            saqlash nuqtasi (lokal yoki cloud.js orqali)
js/app.js                ekranlar va o'yin mantig'i
bot/server.js            Telegram bot + ro'yxatdan o'tganlar haqida xabar beruvchi API
firestore.rules          Firebase xavfsizlik qoidalari
firestore.indexes.json   oylik reyting indeksi
```

## Kompyuterda ishga tushirish

`./start.sh` (macOS/Linux) yoki `start.bat` (Windows) → http://localhost:8000.
Python, Node, PHP yoki Ruby'dan qaysi biri o'rnatilgan bo'lsa, o'shani ishlatadi.

## Savollar

- **Cheksiz** (har safar yangi sonlar bilan yaratiladi): Matematika, Geometriya, Fizika,
  Informatika, Mantiq.
- **Fakt jadvallari** (bir faktdan bir necha yo'nalishda savol): Ona tili (~140), Kimyo (~160),
  Geografiya (~200), Ingliz tili (~250), Rus tili (~175), Adabiyot (~60), Tarix (~65),
  Jahon tarixi (~60), Biologiya (~55), Huquq (~30) — jami 1300+ ta.
- **Takrorlanmaydi:** o'yinchi ko'rgan har bir savol eslab qolinadi va unga qayta tushmaydi.
  Boshqa o'yinchiga esa xuddi shu savol tushishi mumkin. Fan bo'yicha hamma savol ko'rib
  bo'linsa, o'sha fan uchun yangi aylanish boshlanadi. Bu "ko'rilgan" ro'yxati qurilmada
  saqlanadi (boshqa telefondan kirsangiz, u yerda alohida hisoblanadi).
- Savol qo'shish: `js/questions.js` dagi jadvallarga qator qo'shing (masalan `COUNTRIES_T`,
  `EN`, `HUQUQ`) yoki `js/data.js` dagi `qbank` ga.

## Ball va ligalar

To'g'ri javob +1. Kumushdan boshlab noto'g'ri javob −1, o'yindan chiqish −10.

| Liga | Kerakli ball |
|---|---|
| Bronza | 0 |
| Kumush | 1 000 |
| Oltin | 2 500 |
| Platina | 5 000 |
| Olmos | 10 000 |
| Smaragd | 20 000 |
| Afsonaviy | 35 000 |
| Usta | 50 000 |
| Chempion | 75 000 |
| Grandmaster | 100 000 |

O'zgartirish: `js/data.js` → `LEAGUES`.

## Onlayn imkoniyatlar (Firebase)

- **Umumiy reyting:** Oylik / Umumiy / Liga bo'yicha, top-50.
- **Obuna (follow):** har kimning profilida "Obuna bo'lish" tugmasi va obunachilar soni.
  Son halol: Firestore qoidalari obunachilar sonini faqat haqiqiy obuna hujjati bilan birga
  +1 / −1 o'zgartirishga ruxsat beradi.
- **Qidiruv:** 8 xonali ID yoki ism/familiya bo'yicha.
- **Xabarlar (chat):** Instagramdagidek. Bir-biriga obuna bo'lganlar (yoki do'stlar) yozisha oladi;
  suhbatlar ro'yxati eng yangisi tepada, o'qilmaganlar belgilanadi. Profildagi 3 nuqta menyusida
  ham "Xabar yozish" bor. Xabarni faqat ikki ishtirokchi o'qiy oladi (Firestore qoidalari).
- **Do'stlar:** so'rov yuborish/qabul qilish, do'stni 1v1 duelga chaqirish (bir xil savollar,
  jonli hisob, stikerlar).
- **Real raqib:** bir vaqtda bir xil fanni tanlagan ikki o'yinchi (dunyoning istalgan joyidan)
  avtomatik juftlanadi; 15 soniyada odam topilmasa — AI.
- **4v4 onlayn:** xona yaratiladi, do'stlar 12 xonali ID (va parol) bilan istalgan qurilmadan
  qo'shiladi; jamoa tanlanadi; host boshlaydi; hammaga bir xil 50 savol; bo'sh joylar AI bilan
  to'ldiriladi (natija hamma qurilmada bir xil). "Begonalar bilan" — ochiq xona, 45 soniyada
  o'zi boshlanadi.
- **Obunachilar/obunalar ro'yxati:** profildagi raqamlarni bosing (o'zingiz va boshqalar uchun).
- **Chatda media:** rasm (avtomatik siqiladi), fayl va ovozli xabar (60 soniyagacha). Firebase'ning
  bepul tarifida fayl xizmati (Storage) yo'qligi sababli media bazaning o'zida saqlanadi —
  har bir element 700 KB gacha.
- **Kirish:** telefon + parol. Brauzer parolni saqlashni taklif qiladi. Kirishda davlat kodi
  adashib tanlansa ham kirish ishlaydi (raqamning davlat kodi eslab qolinadi).

Firebase'ni sozlash (yangi loyiha uchun): Authentication → Email/Password yoqiladi; Firestore
yaratiladi; **Rules** ga `firestore.rules` mazmuni qo'yiladi → Publish; **Indexes** da
`users`: `monthKey` ↑, `monthScore` ↓ indeksi yaratiladi.

## Admin panel

- Admin raqami: **+998 77 485 97 17** (`js/admin-config.js`). Shu raqam bilan ro'yxatdan
  o'tilganda akkaunt **madam1novde@gmail.com** ga bog'lanadi va Gmail'ga tasdiqlash xati
  keladi. Xatdagi havola bosilgach, menyuda **Admin panel** paydo bo'ladi (huquqni
  `firestore.rules` dagi `isAdmin()` ham tekshiradi — faqat tasdiqlangan shu Gmail).
- Panelda: jami foydalanuvchilar, hozir onlayn (oxirgi 3 daqiqada faol), bugun qo'shilganlar,
  jami to'g'ri/xato javoblar va o'yinlar; foydalanuvchilar ro'yxati (Onlayn / Hammasi, qidiruv).
- Foydalanuvchini bossangiz: ism, familiya, telefon, ID, Telegram, ball, liga, to'g'ri/xato
  javoblar (%), o'yinlar, kirishlar soni, oxirgi kirish, onlayn holati, ro'yxatdan o'tgan sana,
  obunachilar/obunalar/do'stlar va suhbatlari (xabarlarni o'qish mumkin). Ballni tuzatish va
  ko'k "tasdiqlangan" belgisini berish.
- **Parollar ko'rinmaydi** — Firebase ularni qaytarib bo'lmaydigan shaklda saqlaydi.
- Admin obunachilarini boshqalardan yashirish mumkin; admin oddiy o'yinchi kabi o'ynay oladi.
- **Parolni unutish / o'zgartirish:** kirish oynasida admin raqamini yozib "Parolni
  unutdingizmi?" → Gmail'ga havola keladi. Admin panelda ham shu tugma bor.
- **Kirish ogohlantirishlari:** har bir admin kirish urinishi (to'g'ri yoki noto'g'ri parol)
  bot serveriga yuboriladi: Telegram'ga xabar (BOT_TOKEN kerak) va Gmail'ga xat — buning uchun
  bot serverida `BREVO_API_KEY` bo'lishi kerak (brevo.com, bepul: kuniga 300 xat).
- Ro'yxatdan o'tish oynasida foydalanuvchilar administrator ma'lumotlarni (xabarlarni ham)
  ko'rib chiqishi mumkinligi haqida ogohlantiriladi.

## Telegram bot (`bot/server.js`)

Bot va sayt birga ishlaydi:
- `/start` — **majburiy obuna**: kanalga obuna bo'lmaguncha bot faqat "Kanalga obuna bo'lish"
  va "Tekshirish" tugmalarini ko'rsatadi.
- Saytda ro'yxatdan o'tishda **Telegram orqali tasdiqlash** va kanalga obunani tekshirish.
- Har bir yangi ro'yxatdan o'tgan odam haqida adminga xabar: ism, familiya, ID raqami,
  Telegram username va ID.

Render'da joylash: **New → Web Service** → shu repo → Root Directory `bot` → Build Command
`echo ok` → Start Command `node server.js` → Free. Environment o'zgaruvchilari:

| Kalit | Qiymat |
|---|---|
| `BOT_TOKEN` | BotFather bergan token (**maxfiy**, faqat shu yerga yoziladi) |
| `ADMIN_CHAT_ID` | admin Telegram ID raqami |
| `CHANNEL` | `@duelum` |
| `SITE_URL` | `https://duelum.onrender.com` |

Webhook server ishga tushganda o'zi ulanadi. Telegram tomonida 2 ta qadam kerak:
1. Botni **@duelum kanaliga admin** qilib qo'shish (obunani tekshirishi uchun).
2. **@BotFather → /setdomain** → botni tanlash → `duelum.onrender.com` (saytdagi Telegram
   tugmasi ishlashi uchun).

Shundan keyin `js/telegram-config.js` da `loginWidget: true` qilinadi.

Bepul Render web-xizmati 15 daqiqa ishlatilmasa "uxlaydi" va birinchi so'rovda ~1 daqiqada
uyg'onadi. Sayt ochilganda serverni oldindan uyg'otadi; bot xabarlari esa uyg'ongach yetib keladi.

## Halollik: cheklovlar

1. Raqib qidirishda 15 soniyada odam topilmasa AI o'ynaydi; 4v4 dagi bo'sh joylar AI.
2. 4v4 lobbidagi ovozli chat (mikrofon tugmasi) — hozircha belgi (WebRTC server kerak).
3. Premium hali sotilmaydi: reja tanlansa "Hali premium xizmatimiz mavjud emas" chiqadi.
   To'lov (Payme / Click / Stripe) ulanganda premiumni server berishi kerak.
4. Ballni brauzer yozadi; qoidalar bir yozuvda ±60 dan ortiq o'zgarishga yo'l qo'ymaydi.
   To'liq aldovdan himoya uchun javoblarni serverda tekshirish kerak (Cloud Functions — pulli).
5. "X o'yinchi onlayn" raqamlari bezak.
6. Parolni unutgan foydalanuvchi uchun avtomatik tiklash yo'q (SMS pulli). Admin Firebase
   konsolida (Authentication) akkauntni o'chirib, qayta ro'yxatdan o'tishga ruxsat berishi mumkin.
