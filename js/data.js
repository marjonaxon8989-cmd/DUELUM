// data.js — subjects shown on the home grid + their question banks,
// the league/rating ladder, premium plans and reaction stickers.

// `col` is the subject's accent colour; its icon is ICON_PATHS[k] in icons.js.
const subjects=[
 {k:'math',name:'Matematika',col:'#5b5bd6',on:2458},
 {k:'geom',name:'Geometriya',col:'#0e9f9a',on:860},
 {k:'onatili',name:'Ona tili',col:'#2f6fed',on:3014},
 {k:'adabiyot',name:'Adabiyot',col:'#a64dbd',on:1340},
 {k:'hist',name:'Tarix',col:'#d9822b',on:1862},
 {k:'worldhist',name:'Jahon tarixi',col:'#8c6a3f',on:730},
 {k:'geo',name:'Geografiya',col:'#12a150',on:1005},
 {k:'phys',name:'Fizika',col:'#7c4dff',on:1528},
 {k:'chem',name:'Kimyo',col:'#16a34a',on:1237},
 {k:'bio',name:'Biologiya',col:'#65a30d',on:980},
 {k:'eng',name:'Ingliz tili',col:'#e11d48',on:2193},
 {k:'rus',name:'Rus tili',col:'#2563eb',on:1420},
 {k:'cs',name:'Informatika',col:'#334155',on:1743},
 {k:'huquq',name:"Huquq asoslari",col:'#b7791f',on:612}
];
// Question banks. `c` = index of the correct option in `o`.
// Order of questions AND options is shuffled at the start of every match
// (see shuffleItem in app.js), so `c` here always refers to this file's order.
const qbank={
 math:[{q:"2x + 5 = 15. x ni toping?",o:["3","5","7","10"],c:1},{q:"5² qancha bo'ladi?",o:["10","20","25","30"],c:2},{q:"12 ni 4 ga bo'lsak nechaga teng?",o:["2","3","4","6"],c:1},
  {q:"7 × 8 = ?",o:["54","56","58","64"],c:1},{q:"100 ning 25% i qancha?",o:["20","25","50","75"],c:1},{q:"Eng kichik tub son qaysi?",o:["0","1","2","3"],c:2}],
 geom:[{q:"Uchburchakning ichki burchaklari yig'indisi necha gradus?",o:["90°","180°","270°","360°"],c:1},{q:"Kvadratning barcha tomonlari qanday bo'ladi?",o:["Har xil","Teng","Faqat 2 tasi teng","Noma'lum"],c:1},{q:"Doiraning markazidan chetigacha bo'lgan masofa?",o:["Diametr","Radius","Perimetr","Xorda"],c:1},
  {q:"To'g'ri burchak necha gradusga teng?",o:["45°","90°","180°","360°"],c:1},{q:"Tomoni 5 sm bo'lgan kvadratning yuzi?",o:["10 sm²","20 sm²","25 sm²","30 sm²"],c:2},{q:"Oltiburchakning nechta tomoni bor?",o:["5","6","7","8"],c:1}],
 onatili:[{q:"\"Kitob\" so'zi qaysi so'z turkumiga kiradi?",o:["Fe'l","Ot","Sifat","Ravish"],c:1},{q:"Ega va kesim — bu nima?",o:["Gap bo'laklari","Harflar","Bo'g'inlar","Unlilar"],c:0},{q:"\"Chiroyli\" so'zi qaysi turkumga kiradi?",o:["Ot","Sifat","Fe'l","Son"],c:1},
  {q:"\"Yugurmoq\" so'zi qaysi so'z turkumiga kiradi?",o:["Ot","Sifat","Fe'l","Son"],c:2},{q:"So'roq gap oxiriga qaysi belgi qo'yiladi?",o:["Nuqta","Vergul","So'roq belgisi","Undov belgisi"],c:2},{q:"\"Besh\" so'zi qaysi so'z turkumiga kiradi?",o:["Son","Ot","Ravish","Olmosh"],c:0}],
 adabiyot:[{q:"Alisher Navoiy qaysi janrda ijod qilgan?",o:["Roman","G'azal","Fantastika","Detektiv"],c:1},{q:"\"Shum bola\" asarining muallifi kim?",o:["Oybek","G'afur G'ulom","Abdulla Qahhor","Cho'lpon"],c:1},{q:"\"Mehrobdan chayon\" romani muallifi kim?",o:["Abdulla Qodiriy","Cho'lpon","Oybek","Said Ahmad"],c:0},
  {q:"\"O'tkan kunlar\" romanining muallifi kim?",o:["Abdulla Qodiriy","Oybek","Cho'lpon","Hamza"],c:0},{q:"\"Xamsa\" asarini kim yozgan?",o:["Bobur","Alisher Navoiy","Ogahiy","Mashrab"],c:1},{q:"\"Boburnoma\" muallifi kim?",o:["Amir Temur","Zahiriddin Muhammad Bobur","Mirzo Ulug'bek","Alisher Navoiy"],c:1}],
 hist:[{q:"Amir Temur qaysi asrda yashagan?",o:["XII","XIV","XVI","XVIII"],c:1},{q:"Buyuk ipak yo'li nimani bog'lagan?",o:["Dengizlarni","Sharq va G'arbni","Faqat Osiyoni","Faqat Yevropani"],c:1},{q:"O'zbekiston qachon mustaqillikka erishdi?",o:["1989","1990","1991","1992"],c:2},
  {q:"Mirzo Ulug'bek rasadxonasi qaysi shaharda joylashgan?",o:["Buxoro","Xiva","Samarqand","Toshkent"],c:2},{q:"Amir Temur davlatining poytaxti qaysi shahar edi?",o:["Samarqand","Buxoro","Qo'qon","Termiz"],c:0},{q:"O'zbekiston Mustaqillik kuni qaysi sanada nishonlanadi?",o:["1-yanvar","21-mart","1-sentyabr","8-dekabr"],c:2}],
 worldhist:[{q:"Ikkinchi jahon urushi qaysi yilda tugagan?",o:["1943","1945","1947","1950"],c:1},{q:"Qadimgi Misr piramidalari nima uchun qurilgan?",o:["Ibodatxona","Fir'avnlar maqbarasi","Saroy","Bozor"],c:1},{q:"Rim imperiyasining markazi qaysi qit'ada edi?",o:["Osiyo","Yevropa","Afrika","Amerika"],c:1},
  {q:"Birinchi jahon urushi qaysi yilda boshlangan?",o:["1905","1914","1918","1939"],c:1},{q:"1492-yilda Amerikaga yetib kelgan sayyoh kim?",o:["Magellan","Kolumb","Vasko da Gama","Jeyms Kuk"],c:1},{q:"Buyuk fransuz inqilobi qaysi yilda boshlangan?",o:["1689","1789","1812","1848"],c:1}],
 geo:[{q:"Dunyodagi eng katta okean?",o:["Atlantika","Hind","Tinch","Shimoliy Muz"],c:2},{q:"O'zbekiston poytaxti?",o:["Samarqand","Buxoro","Andijon","Toshkent"],c:3},{q:"Dunyodagi eng baland tog' cho'qqisi?",o:["Elbrus","Everest","Kilimanjaro","Mont Blan"],c:1},
  {q:"Maydoni bo'yicha eng katta qit'a qaysi?",o:["Afrika","Yevropa","Osiyo","Avstraliya"],c:2},{q:"O'rta Osiyodagi eng sersuv daryo qaysi?",o:["Sirdaryo","Amudaryo","Zarafshon","Chirchiq"],c:1},{q:"Yaponiya poytaxti?",o:["Pekin","Seul","Tokio","Bangkok"],c:2}],
 phys:[{q:"Yorug'lik tezligi taxminan?",o:["300 km/s","300 000 km/s","3 000 km/s","30 km/s"],c:1},{q:"Nyutonning 1-qonuni nima haqida?",o:["Inersiya","Gravitatsiya","Elektr","Issiqlik"],c:0},{q:"Suvning qaynash harorati (normal bosimda)?",o:["90°C","100°C","110°C","120°C"],c:1},
  {q:"Kuchning o'lchov birligi?",o:["Joul","Nyuton","Vatt","Paskal"],c:1},{q:"Toza suv normal bosimda necha °C da muzlaydi?",o:["-10°C","0°C","4°C","10°C"],c:1},{q:"Tok kuchi qanday birlikda o'lchanadi?",o:["Volt","Om","Amper","Vatt"],c:2}],
 chem:[{q:"Suvning kimyoviy formulasi qaysi javobda to'g'ri ko'rsatilgan?",o:["CO2","O2","H2O","HO2"],c:2},{q:"Oltin elementining belgisi?",o:["Ag","Au","Fe","Pb"],c:1},{q:"Osh tuzining kimyoviy formulasi?",o:["NaCl","KCl","CaCl2","MgO"],c:0},
  {q:"Kislorodning kimyoviy belgisi?",o:["K","O","Ok","C"],c:1},{q:"Temirning kimyoviy belgisi?",o:["Te","Fe","Ti","F"],c:1},{q:"Kimyoviy elementlar davriy jadvalini kim yaratgan?",o:["Nyuton","Mendeleyev","Lomonosov","Bor"],c:1}],
 bio:[{q:"Katta yoshli inson tanasida taxminan nechta suyak bor?",o:["106","206","306","56"],c:1},{q:"Fotosintez asosan qayerda sodir bo'ladi?",o:["Ildizda","Barglarda","Poyada","Gulda"],c:1},{q:"Odam yuragi necha kameradan iborat?",o:["2","3","4","5"],c:2},
  {q:"Qonni tana bo'ylab qaysi a'zo haydaydi?",o:["O'pka","Jigar","Yurak","Buyrak"],c:2},{q:"O'simliklar fotosintezda qaysi gazni yutadi?",o:["Kislorod","Azot","Karbonat angidrid","Vodorod"],c:2},{q:"Hujayrada irsiy ma'lumot asosan qayerda saqlanadi?",o:["Membranada","Yadroda","Sitoplazmada","Vakuolada"],c:1}],
 eng:[{q:"\"Apple\" so'zi tarjimasi?",o:["Nok","Olma","Uzum","Banan"],c:1},{q:"\"I ___ a student.\"",o:["is","am","are","be"],c:1},{q:"\"Book\" so'zining tarjimasi?",o:["Daftar","Kitob","Qalam","Stol"],c:1},
  {q:"\"Water\" so'zining tarjimasi?",o:["Olov","Suv","Havo","Yer"],c:1},{q:"\"She ___ to school every day.\"",o:["go","goes","going","gone"],c:1},{q:"\"Cat\" so'zining ko'plik shakli?",o:["Cates","Cats","Caties","Cat"],c:1}],
 rus:[{q:"\"Привет\" so'zining ma'nosi?",o:["Xayr","Salom","Rahmat","Kechirasiz"],c:1},{q:"\"Книга\" so'zi nimani anglatadi?",o:["Qalam","Kitob","Stol","Uy"],c:1},{q:"\"Спасибо\" so'zi nimani anglatadi?",o:["Salom","Rahmat","Kechirasiz","Xayr"],c:1},
  {q:"\"Дом\" so'zi nimani anglatadi?",o:["Uy","Daraxt","Ko'cha","Maktab"],c:0},{q:"\"Вода\" so'zi nimani anglatadi?",o:["Non","Suv","Sut","Choy"],c:1},{q:"\"До свидания\" nimani anglatadi?",o:["Salom","Rahmat","Xayr","Marhamat"],c:2}],
 cs:[{q:"HTML nimaning qisqartmasi?",o:["HyperText Markup Language","HighText Machine Lang","Home Tool ML","HyperTransfer ML"],c:0},{q:"2 + 2 ikkilik sanoq tizimida qanday yoziladi?",o:["10","100","11","101"],c:1},{q:"1 bayt necha bitdan iborat?",o:["4","8","16","32"],c:1},
  {q:"CPU nima?",o:["Markaziy protsessor","Tezkor xotira","Monitor","Klaviatura"],c:0},{q:"Quyidagilardan qaysi biri dasturlash tili?",o:["HTTP","Python","JPEG","USB"],c:1},{q:"1 kilobayt (ikkilik tizimda) necha baytga teng?",o:["100","1000","1024","2048"],c:2}],
 huquq:[{q:"Mustaqil O'zbekistonning birinchi Konstitutsiyasi qaysi yili qabul qilingan?",o:["1991","1992","1995","2000"],c:1},{q:"Fuqarolarning huquq va erkinliklarini kim kafolatlaydi?",o:["Davlat","Maktab","Oila","Qo'shni"],c:0},{q:"Qonun chiqaruvchi hokimiyat organi qanday ataladi?",o:["Hukumat","Parlament","Sud","Prokuratura"],c:1},
  {q:"O'zbekistonda Konstitutsiya kuni qachon nishonlanadi?",o:["1-sentyabr","8-dekabr","9-may","21-mart"],c:1},{q:"O'zbekistonda shaxs necha yoshdan voyaga yetgan hisoblanadi?",o:["14","16","18","21"],c:2},{q:"Oliy Majlis necha palatadan iborat?",o:["1","2","3","4"],c:1}]
};
const logicBank=[
 {q:"1, 2, 4, 8, 16, ? Ketma-ketlikni davom ettiring.",o:["18","24","32","20"],c:2},
 {q:"Barcha olmalar — meva. Bu narsa olma. Demak, bu narsa nima?",o:["Sabzavot","Meva","Sut mahsuloti","Gul"],c:1},
 {q:"5 baliqchi 5 soatda 5 baliq tutadi. 100 baliqchi 100 baliqni necha soatda tutadi?",o:["5","20","100","1"],c:0},
 {q:"Qaysi so'z boshqalaridan farq qiladi?",o:["Olma","Banan","Uzum","Stol"],c:3},
 {q:"3 ta qalam 3 so'm turadi. 100 ta qalam necha so'm turadi?",o:["100 so'm","300 so'm","1 so'm","10 so'm"],c:0},
 {q:"Barcha mushuklar uxlaydi. Tom — mushuk. Tom nima qiladi?",o:["O'ynaydi","Uxlaydi","Yuguradi","Uchadi"],c:1},
 {q:"2, 6, 12, 20, 30, ? Keyingi son nima?",o:["36","40","42","44"],c:2},
 {q:"Bugun seshanba. 100 kundan keyin haftaning qaysi kuni bo'ladi?",o:["Dushanba","Seshanba","Chorshanba","Payshanba"],c:3},
 {q:"Mayning onasining 5 ta farzandi bor: Aprel, Iyun, Iyul, Avgust. Beshinchisining ismi nima?",o:["Sentyabr","Mart","May","Fevral"],c:2},
 {q:"Soat roppa-rosa 3:00 da minut va soat millari orasidagi burchak?",o:["60°","90°","120°","180°"],c:1},
 {q:"Qaysi son ortiqcha: 2, 4, 7, 8, 10?",o:["2","4","7","10"],c:2},
 {q:"Ali Validan baland, Vali Solidan baland. Eng past kim?",o:["Ali","Vali","Soli","Aniqlab bo'lmaydi"],c:2}
];
const letters=['a','b','c','d'];

// 10-tier league ladder. `min` = total score needed to REACH that tier.
const LEAGUES=[
 {key:'bronza',min:0,col:'#b07a4a'},
 {key:'kumush',min:1000,col:'#8e9aa6'},
 {key:'oltin',min:2500,col:'#d4a017'},
 {key:'platina',min:5000,col:'#4aa3a2'},
 {key:'olmos',min:10000,col:'#3b82f6'},
 {key:'smaragd',min:20000,col:'#10b981'},
 {key:'afsonaviy',min:35000,col:'#a855f7'},
 {key:'usta',min:50000,col:'#ef4444'},
 {key:'chempion',min:75000,col:'#f59e0b'},
 {key:'grandmaster',min:100000,col:'#e11d48'}
];

// 4 premium plans. `orig` is only used to show a struck-through "before discount" price.
const PREMIUM_PLANS=[
 {id:'day',days:1,price:10000,discount:0,orig:null},
 {id:'week',days:7,price:50000,discount:20,orig:62500},
 {id:'month',days:30,price:150000,discount:50,orig:300000},
 {id:'year',days:365,price:2500000,discount:50,orig:5000000}
];

// Reaction stickers — drawn SVG faces (icons.js: r_laugh, r_angry, ...), not emoji.
const STICKERS=['r_laugh','r_angry','r_fist','r_grimace','r_sleep'];

// World phone country codes: [ISO2, dial code, display name]. The flag is
// drawn from the ISO2 code at render time (see flagEmoji in app.js) rather
// than stored, to keep this list short and typo-free.
const COUNTRIES=[
['UZ','998',"O'zbekiston"],['KZ','7',"Qozog'iston"],['KG','996',"Qirg'iziston"],['TJ','992',"Tojikiston"],
['TM','993',"Turkmaniston"],['AF','93',"Afg'oniston"],['RU','7',"Rossiya"],['TR','90',"Turkiya"],
['CN','86',"Xitoy"],['JP','81',"Yaponiya"],['KR','82',"Janubiy Koreya"],['KP','850',"Shimoliy Koreya"],
['IN','91',"Hindiston"],['PK','92',"Pokiston"],['IR','98',"Eron"],['SA','966',"Saudiya Arabistoni"],
['AE','971',"BAA"],['EG','20',"Misr"],['DE','49',"Germaniya"],['FR','33',"Fransiya"],
['GB','44',"Buyuk Britaniya"],['IT','39',"Italiya"],['ES','34',"Ispaniya"],['PT','351',"Portugaliya"],
['NL','31',"Niderlandiya"],['BE','32',"Belgiya"],['CH','41',"Shveytsariya"],['AT','43',"Avstriya"],
['SE','46',"Shvetsiya"],['NO','47',"Norvegiya"],['DK','45',"Daniya"],['FI','358',"Finlyandiya"],
['PL','48',"Polsha"],['CZ','420',"Chexiya"],['SK','421',"Slovakiya"],['HU','36',"Vengriya"],
['RO','40',"Ruminiya"],['BG','359',"Bolgariya"],['GR','30',"Gretsiya"],['UA','380',"Ukraina"],
['BY','375',"Belarus"],['MD','373',"Moldova"],['GE','995',"Gruziya"],['AM','374',"Armaniston"],
['AZ','994',"Ozarbayjon"],['US','1',"AQSH"],['CA','1',"Kanada"],['MX','52',"Meksika"],
['BR','55',"Braziliya"],['AR','54',"Argentina"],['CL','56',"Chili"],['CO','57',"Kolumbiya"],
['PE','51',"Peru"],['VE','58',"Venesuela"],['EC','593',"Ekvador"],['BO','591',"Boliviya"],
['PY','595',"Paragvay"],['UY','598',"Urugvay"],['CU','53',"Kuba"],['DO','1',"Dominikan Resp."],
['GT','502',"Gvatemala"],['HN','504',"Gonduras"],['SV','503',"Salvador"],['NI','505',"Nikaragua"],
['CR','506',"Kosta-Rika"],['PA','507',"Panama"],['HT','509',"Gaiti"],['JM','1',"Yamayka"],
['AU','61',"Avstraliya"],['NZ','64',"Yangi Zelandiya"],['FJ','679',"Fiji"],['PG','675',"Papua-Yangi Gvineya"],
['ZA','27',"Janubiy Afrika"],['NG','234',"Nigeriya"],['KE','254',"Keniya"],['ET','251',"Efiopiya"],
['GH','233',"Gana"],['CI','225',"Kot-d'Ivuar"],['SN','221',"Senegal"],['CM','237',"Kamerun"],
['UG','256',"Uganda"],['TZ','255',"Tanzaniya"],['ZW','263',"Zimbabve"],['ZM','260',"Zambiya"],
['AO','244',"Angola"],['MZ','258',"Mozambik"],['SD','249',"Sudan"],['SS','211',"Janubiy Sudan"],
['RW','250',"Ruanda"],['SO','252',"Somali"],['CD','243',"KDR Kongo"],['CG','242',"Kongo"],
['GA','241',"Gabon"],['MA','212',"Marokash"],['DZ','213',"Jazoir"],['TN','216',"Tunis"],
['LY','218',"Liviya"],['IQ','964',"Iroq"],['SY','963',"Suriya"],['IL','972',"Isroil"],
['PS','970',"Falastin"],['JO','962',"Iordaniya"],['LB','961',"Livan"],['KW','965',"Quvayt"],
['QA','974',"Qatar"],['BH','973',"Bahrayn"],['OM','968',"Ummon"],['YE','967',"Yaman"],
['TH','66',"Tailand"],['VN','84',"Vyetnam"],['ID','62',"Indoneziya"],['MY','60',"Malayziya"],
['SG','65',"Singapur"],['PH','63',"Filippin"],['MM','95',"Myanma"],['KH','855',"Kambodja"],
['LA','856',"Laos"],['BD','880',"Bangladesh"],['LK','94',"Shri-Lanka"],['NP','977',"Nepal"],
['BT','975',"Butan"],['MV','960',"Maldiv or."],['MN','976',"Mongoliya"],['HK','852',"Gonkong"],
['TW','886',"Tayvan"],['BN','673',"Bruney"],['IE','353',"Irlandiya"],['IS','354',"Islandiya"],
['LU','352',"Lyuksemburg"],['HR','385',"Xorvatiya"],['RS','381',"Serbiya"],['SI','386',"Sloveniya"],
['BA','387',"Bosniya va Gersegovina"],['MK','389',"Shim. Makedoniya"],['AL','355',"Albaniya"],
['LT','370',"Litva"],['LV','371',"Latviya"],['EE','372',"Estoniya"],['CY','357',"Kipr"],['MT','356',"Malta"]
];
