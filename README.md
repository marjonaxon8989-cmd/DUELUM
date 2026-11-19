# 1v1 Duel — Viktorina

O'zbekiston maktab o'quvchilari uchun 1v1 va 4v4 bilim musobaqasi. Mobil ilovaga
o'xshaydi, lekin oddiy **statik sayt**: faqat HTML + CSS + vanilla JavaScript.

- Freymvork yo'q, `npm install` yo'q, build-jarayon yo'q.
- Server tomonida hech qanday til (PHP, Python, Node…) va uning **versiyasi talab qilinmaydi** —
  fayllarni istalgan hostingga yoki mavjud saytingiz papkasiga shunchaki ko'chirasiz.
- Barcha ulanadigan xizmatlar **bepul tarifga** moslangan; keyinroq pulli tarifga o'tish kodni
  o'zgartirmasdan, faqat xizmat panelida amalga oshadi.

## Fayl tuzilishi

```
index.html                 # faqat markup (barcha ekranlar)
css/style.css              # barcha dizayn
js/i18n.js                 # 3 tilli matnlar (uz / ru / en)
js/data.js                 # fanlar, savollar banki, ligalar, premium rejalar, davlat kodlari
js/firebase-config.js      # ONLAYN rejimni yoqish uchun yagona tahrirlanadigan fayl
js/cloud.js                # Firebase: akkaunt, umumiy reyting, do'stlar, do'st bilan duel
js/storage.js              # app.js saqlash uchun murojaat qiladigan yagona joy (lokal yoki cloud.js)
js/app.js                  # ekranlar, o'yin mantig'i, auth, profil, 4v4, kalkulyator, AI
server/cloudflare-worker.js# AI yordamchi uchun ixtiyoriy backend-proksi (API kalit shu yerda yashirin)
server/wrangler.toml       # Worker'ni terminaldan joylashtirish uchun (ixtiyoriy)
firestore.rules            # Firebase xavfsizlik qoidalari (kim nimani o'qiy/yoza oladi)
firestore.indexes.json     # Oylik reyting uchun kerakli indeks
firebase.json              # Firebase CLI uchun (ixtiyoriy)
netlify.toml               # Netlify uchun tayyor sozlama (build yo'q)
start.sh / start.bat       # lokal serverni bir buyruq bilan ishga tushirish
.nojekyll                  # GitHub Pages uchun
```

## Kompyuterda ishga tushirish

**Eng oson yo'l:**

```bash
./start.sh          # macOS / Linux
start.bat           # Windows (ikki marta bosing)
```

Skript kompyuteringizda nima o'rnatilgan bo'lsa (Python 3 yoki 2, Node, PHP, Ruby) o'shani
o'zi topib ishlatadi. Keyin brauzerda oching: **http://localhost:8000**

Qo'lda xohlasangiz, istalgan bittasi:

```bash
python3 -m http.server 8000     # Python 3.x (istalgan versiya)
python -m http.server 8000      # Windows'da ko'pincha shunday
npx serve .                     # Node
php -S localhost:8000           # PHP
```

`index.html` ni to'g'ridan-to'g'ri ikki marta bosib ochsangiz ham ishlaydi; faqat "Do'stlarni
taklif qilish" tugmasi `file://` manzilini nusxalaydi va clipboard o'rniga oyna chiqaradi.

## GitHub + Netlify orqali joylashtirish (~5 daqiqa, bepul)

1. [github.com/new](https://github.com/new) da yangi repo yarating (masalan `duel`), so'ng shu
   papka ichida:
   ```bash
   git init
   git add .
   git commit -m "1v1 Duel"
   git branch -M main
   git remote add origin https://github.com/<foydalanuvchi>/<repo>.git
   git push -u origin main
   ```
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
   → **GitHub** → repo'ni tanlang. `netlify.toml` tufayli sozlamalar avtomatik to'ladi
   (Build command — bo'sh, Publish directory — `.`). **Deploy** bosing.
3. Bir daqiqada `https://<nom>.netlify.app` manzili tayyor bo'ladi. Keyingi har bir
   `git push` saytni avtomatik yangilaydi.

Boshqa variantlar (hammasi bepul, sozlashsiz):
- **GitHub Pages**: repo → Settings → Pages → *Deploy from branch* → `main` / `/ (root)`.
- **Cloudflare Pages / Vercel**: repo'ni ulang, build buyrug'ini bo'sh qoldiring.
- **O'z saytingiz**: butun papkani serverdagi istalgan katalogga ko'chiring (masalan `sayt.uz/duel/`).

## Ikki rejim: LOKAL va ONLAYN

| | LOKAL (standart) | ONLAYN (Firebase ulangan) |
|---|---|---|
| Qachon | `js/firebase-config.js` da `FIREBASE_CONFIG = null` | config to'ldirilgan |
| Akkaunt | faqat shu brauzerda | istalgan telefondan shu raqam + parol bilan kirish |
| Reyting | faqat o'zingiz | **ro'yxatdan o'tgan hamma**: Oylik / Umumiy / Liga bo'yicha, top-50 |
| Do'stlar | yo'q | **8 xonali ID orqali qo'shish**, so'rovni qabul/rad qilish, o'chirish |
| Do'st bilan duel | yo'q | **do'stni 1v1 duelga chaqirish** — ikkalangiz bir xil 10 savolni o'ynaysiz, raqib balini jonli ko'rasiz, stikerlar ham boradi |
| Tasodifiy raqib | AI | AI (o'zgarmaydi — cheklovlarga qarang) |

Firebase ulanmaguncha ilova LOKAL rejimda to'liq ishlayveradi.

## ONLAYN rejimni yoqish — Firebase (bepul, ~10 daqiqa)

Firebase'ning **Spark** tarifi bepul va karta talab qilmaydi: kuniga 50 000 o'qish, 20 000 yozish,
1 GB ma'lumot. Bitta reyting sahifasini ochish ≈ 50 o'qish, bitta o'yin ≈ 10–20 yozish — maktab
miqyosidagi auditoriyaga bemalol yetadi. Ko'payib ketsa, Firebase panelida loyihani **Blaze**
(ishlatganingcha to'lash) tarifiga o'tkazasiz — kod o'zgarmaydi.

1. **Loyiha yarating.** [console.firebase.google.com](https://console.firebase.google.com) →
   *Create a project* → nom bering (masalan `duel-uz`). Google Analytics shart emas.
2. **Web ilova qo'shing.** Loyiha bosh sahifasida `</>` (Web) belgisini bosing → nom bering →
   *Register app*. Ekranda `const firebaseConfig = { ... }` chiqadi. Shu `{ ... }` qismini
   nusxalab, `js/firebase-config.js` dagi `null` o'rniga qo'ying:
   ```js
   const FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "duel-uz.firebaseapp.com",
     projectId: "duel-uz",
     storageBucket: "duel-uz.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```
   Bu qiymatlar **maxfiy emas** — Firebase web-config ochiq bo'lishi uchun mo'ljallangan,
   ma'lumotlarni `firestore.rules` qoidalari himoya qiladi. (Anthropic API kaliti esa
   haqiqatan maxfiy — uni bu yerga yozmang.)
3. **Kirishni yoqing.** *Build → Authentication* → *Get started* → *Sign-in method* →
   **Email/Password** → *Enable* → *Save*. (Ilova telefon raqamidan ichki email yasaydi,
   masalan `998901234567@phone.1v1duel.app`, shuning uchun pulli SMS xizmati kerak emas.)
4. **Bazani yarating.** *Build → Firestore Database* → *Create database* → yaqin region
   (masalan `europe-west` yoki `asia-south1`) → **Production mode**.
5. **Qoidalarni joylang.** Firestore → **Rules** → u yerdagi matnni o'chirib, `firestore.rules`
   faylining butun mazmunini qo'ying → **Publish**.
6. **Oylik reyting indeksini yarating.** Firestore → **Indexes** → *Composite* → *Create index*:
   Collection ID `users`; `monthKey` — Ascending, `monthScore` — Descending → *Create*.
   (Yoki saytda Reyting → Oylik ni ochsangiz, brauzer konsolida indeksni bir bosishda
   yaratadigan havola chiqadi.) Indeks 1–3 daqiqada tayyor bo'ladi.
7. **Saytni yangilang:** `git add . && git commit -m "Firebase" && git push` — Netlify
   avtomatik qayta joylaydi. Tayyor!

Terminal orqali (ixtiyoriy, Node.js kerak): `npx firebase-tools login`, so'ng shu papkada
`npx firebase-tools deploy --only firestore --project <loyiha-id>` — 5- va 6-qadamni birdaniga bajaradi.

**Tekshirish:** ikki xil telefonda (yoki bitta kompyuterda oddiy + inkognito oynada) ikki
akkaunt oching → Do'stlar → biriga ikkinchisining ID'sini kiriting → so'rovni qabul qiling →
⚔️ Duel → fan tanlab chaqiring → ikkinchisida "sizni duelga chaqirmoqda" oynasi chiqadi.

### Do'st bilan duel qanday ishlaydi
- Chaqiruvchi fan tanlaydi → 60 soniya javob kutiladi (qabul qilinmasa — bekor bo'ladi).
- Qabul qilingach, ikkalangizga **aynan bir xil 10 savol, bir xil tartibda** beriladi. Har kim
  o'z tezligida javob beradi; raqibning bali va nechanchi savolda ekani jonli ko'rinadi.
- Ball qoidalari oddiy duel bilan bir xil (+1 / Kumushdan −1, chiqib ketish −10).
- Ikkalangiz tugatgach g'olib aniqlanadi; raqib chiqib ketsa — g'olib siz.
- Chaqiruv ilovani **ochib turgan** do'stga keladi. Ilova yopiq bo'lganda ham telefonga
  bildirishnoma kelishi uchun Firebase Cloud Messaging qo'shish kerak (keyingi qadam).

## Ma'lumotlar qanday saqlanadi

**LOKAL rejimda** hamma narsa (profil, til, ball, avatar, premium muddati, 4v4 xonalar)
brauzerning `localStorage` ida — faqat shu qurilmada. Brauzer xotirasi bloklangan bo'lsa,
ilova buzilmaydi, sessiya davomida xotirada ishlaydi.

**ONLAYN rejimda** profil va ball Firestore'da (`users`), parol esa Firebase Auth'da Google
tomonida xeshlangan holda saqlanadi — telefon raqami va parol ochiq profilda **yo'q**.
Faqat til tanlovi va 4v4 xonalar lokal qoladi.

`app.js` saqlash uchun faqat `Store.*` funksiyalarini chaqiradi; `storage.js` rejimga qarab
localStorage'ga yoki `cloud.js` ga yo'naltiradi. Supabase'ga o'tmoqchi bo'lsangiz, faqat
`cloud.js` ni almashtirasiz.

## O'yin qoidalari

- **1v1 duel**: har o'yin aniq 10 savol, har savolga 15 soniya. Savollar va variantlar har
  o'yinda aralashtiriladi. Fan dueli — fan tanlanadi; pastki menyudagi **Duel** — mantiq savollari.
- **Ball**: to'g'ri javob +1. **Kumush** ligasidan boshlab noto'g'ri javob (yoki vaqt tugashi) −1.
  Bronzada jarima yo'q.
- **Chiqib ketish**: Kumush+ da −10 ball (Bronzada 0).
- **Ligalar**: Bronza 0 → Kumush 250 → Oltin 500 → Platina 800 → Olmos 1100 → Smaragd 1500 →
  Afsonaviy 2000 → Usta 2700 → Chempion 3500 → Grandmaster 4500 (`js/data.js` → `LEAGUES`).
- **Yordamchilar**: 50:50 (bir marta; to'g'ri javob + bitta noto'g'ri qoladi), Skip, va faqat
  Premium uchun 💡 Yordam (o'yinda 2 marta, har safar bitta noto'g'ri variantni o'chiradi).
- **Stikerlar** 😂 😠 🤜🤛 😬 😴 — faqat oddiy fan duelida.
- **4v4**: 50 savol, o'yin davomida jamoa ballari yashirin. *Do'stlar bilan*: g'alaba +10,
  mag'lubiyat −10 (Bronzada 0), chiqib ketish −20. *Begonalar bilan* (Kumush+): g'alaba +to'g'ri
  javoblar soni, mag'lubiyat −xato javoblar soni, chiqib ketish −(xatolar + 10).
- **Premium**: 1 kun 10 000, 1 hafta 50 000 (−20%), 1 oy 150 000 (−50%), 1 yil 2 500 000 (−50%) so'm.
  Qayta sotib olinsa, muddat uzaytiriladi.

## ⚠️ Halollik: hozircha simulyatsiya yoki cheklangan qismlar

Bular backend yo'qligi sababli ataylab shunday qilingan va kodda ochiq izoh bilan belgilangan:

1. **Tasodifiy raqib qidirish doim AI bilan tugaydi** (har ikki rejimda). Notanish odam bilan
   real vaqtda juftlash uchun navbat-server kerak (`app.js` → `startSearch`). AI ligangizga
   qarab ~55–85% to'g'ri javob beradi. **Do'st bilan duel esa ONLAYN rejimda haqiqiy.**
2. **Jamoaviy xonalar faqat bitta brauzerda ishlaydi.** Xona ID'sini boshqa telefondan topib
   bo'lmaydi. Tuzatish uchun real vaqtli backend kerak: Firebase Realtime DB / Firestore yoki
   Supabase Realtime (`Store.getRooms/saveRooms` ni almashtirasiz).
3. **4v4 o'yindagi 3 jamoadosh va 4 raqib simulyatsiya qilingan** (`simulateAITeamCorrect`).
4. **Ovozli chat (🎙️) — faqat belgi.** Haqiqiy ovoz uchun WebRTC xizmati (Agora, Twilio,
   LiveKit) va signaling-server kerak.
5. **To'lov ekrani — faqat vizual demo.** Karta raqami faqat format bo'yicha tekshiriladi
   (16 raqam, OO/YY, oy 01–12) va darhol o'chiriladi — hech qayerga saqlanmaydi yoki
   yuborilmaydi, haqiqiy pul yechilmaydi. Haqiqiy to'lov uchun **Payme** yoki **Click**
   (O'zbekiston) yoki **Stripe** ni backend orqali ulang va `submitPayment()` ni ularning
   to'lov sahifasiga yo'naltirish bilan almashtiring. Hech qachon haqiqiy karta raqamlarini
   oddiy client-side formada yig'mang.
6. **LOKAL rejimda reyting va avatar faqat shu qurilmada.** ONLAYN rejimda hamma bir-birini
   ko'radi. Ikkala rejimda ham soxta o'yinchilar hech qachon ko'rsatilmaydi.
   ONLAYN reytingda o'zgarishlar qoidalar bilan cheklangan (bir yozuvda ±60 ball), lekin
   brauzer orqali aldashni 100% to'sish uchun javoblarni serverda tekshirish kerak —
   bu Cloud Functions (pulli Blaze tarifi) talab qiladi.
7. **AI Yordamchi faqat `AI_PROXY_URL` to'ldirilib, Worker joylashtirilgandan keyin ishlaydi.**
   Unga qadar ekranda buni tushuntiruvchi xabar chiqadi.
8. **"X o'yinchi onlayn" raqamlari bezak** — real hisoblagich emas.
9. **LOKAL rejimda parol `localStorage` da ochiq saqlanadi** — faqat demo uchun maqbul.
   ONLAYN rejimda bu muammo yo'q (Firebase Auth).
10. **Premium ONLAYN rejimda ham demo** — to'lov haqiqiy emas, premium holatini brauzer o'zi
   yozadi. Haqiqiy to'lov ulanganda premiumni server (to'lov tizimi webhook'i) belgilashi kerak.
11. **4v4 xonalar ONLAYN rejimda ham lokal** va jamoadoshlar simulyatsiya — real 4v4 keyingi bosqich.

## AI Yordamchini ishga tushirish (`server/cloudflare-worker.js`)

API kalit **hech qachon** sayt kodiga yozilmaydi — uni har kim "View Source" orqali ko'rib,
hisobingizdan pul sarflashi mumkin. Kalit faqat Cloudflare'da *Secret* sifatida turadi.

**Narx:** Cloudflare Workers bepul tarifi — kuniga 100 000 so'rov, karta kerak emas.
Anthropic API esa ishlatilgan token uchun to'lanadi; standart holatda eng arzon model
(`claude-haiku-5-5`) tanlangan. [console.anthropic.com](https://console.anthropic.com) →
Settings → Limits da oylik limit qo'ying.

**A variant — brauzerda (o'rnatishsiz):**
1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Worker.
2. `server/cloudflare-worker.js` mazmunini muharrirga joylab, **Deploy** bosing.
3. Settings → Variables and Secrets → Add → turi **Secret**, nomi `ANTHROPIC_API_KEY`,
   qiymati — Anthropic kalitingiz. (Ixtiyoriy: oddiy o'zgaruvchi `ALLOWED_ORIGIN` =
   `https://<nom>.netlify.app` — shunda Worker'dan faqat sizning saytingiz foydalana oladi.)
4. Worker manzilini nusxalang: `https://<nom>.<subdomain>.workers.dev`.
5. `js/app.js` da `AI_PROXY_URL` ga shu manzilni yozing, `git push` qiling.

**B variant — terminaldan (Node.js 18+):**
```bash
cd server
npx wrangler login
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
```

Agar kalitni biror marta chatga, xabarga yoki kod fayliga yozgan bo'lsangiz — uni
[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) da o'chirib,
yangisini yarating va faqat Cloudflare Secret maydoniga kiriting.

## Sozlash uchun tez-tez kerak bo'ladigan joylar

| Nima | Qayerda |
|---|---|
| Telegram kanal / bot / YouTube / Qo'llab-quvvatlash havolalari | `index.html`, ☰ menyudagi `EXTERNAL LINKS` izohi orasida, va Profil ekranidagi Qo'llab-quvvatlash qatori |
| Savollar qo'shish | `js/data.js` → `qbank` (fan bo'yicha) va `logicBank`; `c` — to'g'ri variant indeksi (0–3) |
| Liga chegaralari | `js/data.js` → `LEAGUES` |
| Premium narxlari | `js/data.js` → `PREMIUM_PLANS` |
| Matnlar / tarjimalar | `js/i18n.js` |
| Firebase sozlamasi (onlayn rejim) | `js/firebase-config.js` |
| Savol vaqti, raund soni, qidiruv vaqti | `js/app.js` boshida: `QUESTION_SECONDS`, `ROUND_LIMIT_1V1`, `ROUND_LIMIT_TEAM`, `SEARCH_SECONDS` |
| AI modeli | `server/cloudflare-worker.js` → `MODEL` (yoki Worker'da `MODEL` o'zgaruvchisi) |

## Ushbu versiyada qo'shilgan (onlayn rejim)

- Umumiy reyting: Oylik / Umumiy / Liga, top-50, o'z o'rningiz ajratib ko'rsatiladi.
- Real akkauntlar: istalgan qurilmadan kirish, ball yo'qolmaydi.
- Do'stlar: ID orqali qo'shish, kiruvchi/chiquvchi so'rovlar, qabul/rad/o'chirish,
  pastki menyuda qizil bildirishnoma raqami.
- Do'stni duelga chaqirish: bir xil savollar, raqibning jonli bali, sinxron stikerlar,
  chiqib ketishni aniqlash, 60 soniyalik kutish va bekor qilish.
- "Do'stlarni taklif qilish" endi ID'ingizni ham ulashadi (telefonda — ulashish oynasi).

## Oldingi versiyada tuzatilgan xatolar

- Qidiruv va to'lov ekranlarida oq fonda oq matn bo'lib qolgani — to'q fon qo'shildi.
- Telefon maydoniga `+` yozilganda u darhol o'chib ketardi, shuning uchun `+998…` kodini
  qo'lda yozib bo'lmasdi — tuzatildi; uzun raqamlarning guruhlanishi ham to'g'rilandi.
- Login raqamni formatga emas, faqat raqamlarga qarab solishtiradi (autofill ham ishlaydi).
- Javobdan so'ng 1 soniya ichida o'yindan chiqilsa, keyingi savol yashirin ekranda yana
  boshlanib ketardi — "match token" bilan to'xtatildi.
- Duel ekranida chapga surish (swipe) jarimasiz chiqib ketishga imkon berardi — endi oddiy
  "Chiqib ketish" kabi tasdiq va jarima bilan ishlaydi.
- 50:50 "Yordam"dan keyin ishlatilsa ikkita noto'g'ri variant qolishi mumkin edi — tuzatildi.
- Natija oynasida qo'shilgan/ayirilgan ball, g'alaba/mag'lubiyat/durang va yangi liga ko'rsatiladi.
- Savollar har bir fanda 3 tadan 6 taga ko'paytirildi, mantiq savollari 12 ta; har o'yinda
  savollar va variantlar aralashtiriladi.
- Faktik xatolar: "Seshanbadan 100 kun keyin" — to'g'ri javob Payshanba; "May" topishmog'i
  tuzatildi; Konstitutsiya savoli 2023-yilgi yangi Konstitutsiyani hisobga olib aniqlashtirildi.
- Katta avatar rasmlari brauzer xotirasini to'ldirib, jimgina saqlanmay qolardi — endi 256px
  gacha kichraytiriladi.
- Kalkulyatorda `0.1 + 0.2 = 0.30000000000000004` va `7 ÷ 0` holatlari to'g'rilandi.
- 4v4 xonalari ham `storage.js` orqali ishlaydi (backendga o'tish uchun yagona nuqta).
- Xona nomi orqali HTML kiritish (XSS) bloklandi; tashqi havolalarga `rel="noopener"` qo'shildi.
- Parolni o'zgartirishda ham 8 belgi talabi; to'lovda karta raqami va muddat avtomatik formatlanadi.
- Worker yangilandi: Anthropic xatolarini aniq qaytaradi, kalit sozlanmaganini aytadi,
  tilga mos tizim ko'rsatmasi va `ALLOWED_ORIGIN` himoyasi qo'shildi.
