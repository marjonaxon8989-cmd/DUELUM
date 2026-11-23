// questions.js — question engine.
//
// Every subject gets questions from two kinds of sources:
//   • GENERATORS  — build a new question from random numbers each time
//                   (math, geometry, physics, informatics, logic). Practically
//                   unlimited: millions of different combinations.
//   • TABLES      — a fact table turned into many questions in several
//                   directions (e.g. country -> capital AND capital -> country).
// Plus the hand-written questions from data.js (qbank / logicBank).
//
// Every question has a stable `id`. The app remembers which ids a player has
// already seen (Store.getSeen/addSeen) and never gives the same one again
// until that subject's whole pool is used up (then the memory for that subject
// resets). Two different players can of course get the same question.

const QGen = (function(){
  const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));          // random int in [a,b]
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const fmt=n=>String(n);

  // Build a 4-option item from the correct answer + candidate distractors.
  function item(id,q,correct,distractors,suffix){
    suffix=suffix||'';
    const c=String(correct)+suffix, seen=new Set([c]), opts=[c];
    for(const d of shuffle(distractors)){ const s=String(d)+suffix; if(opts.length>=4) break; if(!seen.has(s) && s!==''){ seen.add(s); opts.push(s); } }
    // not enough distinct distractors (e.g. small numbers) -> fill with neighbours of a numeric answer
    const num=parseFloat(String(correct).replace(',','.'));
    for(let k=1; opts.length<4 && !isNaN(num) && /^-?[\d.,]+$/.test(String(correct)) && k<50; k++){
      for(const v of [num+k,num-k]){ if(opts.length>=4||v<0) continue; const s=String(v).replace('.',',')+suffix; if(!seen.has(s)){ seen.add(s); opts.push(s);} }
    }
    if(opts.length<4) return null;
    const o=shuffle(opts);
    return {id,q,o,c:o.indexOf(c)};
  }
  // numeric distractors near the answer
  function near(x,spread){ spread=spread||Math.max(2,Math.round(Math.abs(x)*0.15)); const out=[]; for(let i=1;i<=6;i++){ out.push(x+i*Math.ceil(spread/3)); if(x-i*Math.ceil(spread/3)>=0) out.push(x-i*Math.ceil(spread/3)); } return out.concat([x+1,x-1,x+10,x*2]); }
  // pick 3 other values from a list as distractors
  const others=(list,correct)=>list.filter(v=>v!==correct);

  /* =========================== GENERATORS =========================== */
  const GEN={
    math:[
      ()=>{ const a=R(12,999),b=R(12,999); return item(`m+${a}+${b}`,`${a} + ${b} = ?`,a+b,near(a+b)); },
      ()=>{ let a=R(50,999),b=R(10,a); return item(`m-${a}-${b}`,`${a} − ${b} = ?`,a-b,near(a-b)); },
      ()=>{ const a=R(11,99),b=R(2,9); return item(`m*${a}*${b}`,`${a} × ${b} = ?`,a*b,near(a*b).concat([a*(b+1),a*(b-1)])); },
      ()=>{ const b=R(2,12),q=R(3,60); return item(`m/${b*q}/${b}`,`${b*q} ÷ ${b} = ?`,q,near(q)); },
      ()=>{ const a=R(2,9),x=R(1,20),b=R(1,30); return item(`meq${a}x${b}=${a*x+b}`,`${a}x + ${b} = ${a*x+b}. x = ?`,x,near(x,4)); },
      ()=>{ const p=pick([10,20,25,30,40,50,75]),n=pick([40,60,80,120,200,240,300,400,500,800]); return item(`m%${p}of${n}`,`${n} ning ${p}% i nechaga teng?`,n*p/100,near(n*p/100).concat([n*p/10,p])); },
      ()=>{ const n=R(11,30); return item(`msq${n}`,`${n}² = ?`,n*n,near(n*n).concat([n*2,n*n+n])); },
      ()=>{ const n=R(4,25); return item(`msqrt${n*n}`,`√${n*n} = ?`,n,near(n,4)); },
      ()=>{ const a=R(2,20),b=R(2,9),c=R(2,9); return item(`mord${a}+${b}x${c}`,`${a} + ${b} × ${c} = ?`,a+b*c,[(a+b)*c].concat(near(a+b*c))); },
      ()=>{ const a=R(2,9),b=R(2,5); return item(`mpow${a}^${b}`,`${a}^${b} (${a} ning ${b}-darajasi) = ?`,Math.pow(a,b),[a*b,Math.pow(a,b-1),Math.pow(a,b)+a,Math.pow(b,a)].concat(near(Math.pow(a,b)))); },
      ()=>{ const g=R(2,9),a=R(1,9),b=R(a+1,12); return item(`mfrac${a*g}/${b*g}`,`${a*g}/${b*g} kasrni qisqartiring`,`${a}/${b}`,[`${a+1}/${b}`,`${a}/${b+1}`,`${b}/${a}`,`${a*2}/${b}`]); },
      ()=>{ const a=R(100,999); const r=Math.round(a/10)*10; return item(`mround${a}`,`${a} sonini o'nlargacha yaxlitlang`,r,[r+10,r-10,Math.round(a/100)*100,a]); },
    ],
    geom:[
      ()=>{ const a=R(2,25),b=R(2,25); return item(`grectS${a}x${b}`,`Tomonlari ${a} sm va ${b} sm bo'lgan to'g'ri to'rtburchakning yuzi?`,a*b,[2*(a+b),a+b,a*b+a].concat(near(a*b)),' sm²'); },
      ()=>{ const a=R(2,25),b=R(2,25); return item(`grectP${a}x${b}`,`Tomonlari ${a} sm va ${b} sm bo'lgan to'g'ri to'rtburchakning perimetri?`,2*(a+b),[a*b,a+b,4*a].concat(near(2*(a+b))),' sm'); },
      ()=>{ const a=R(2,30); return item(`gsqS${a}`,`Tomoni ${a} sm bo'lgan kvadratning yuzi?`,a*a,[4*a,2*a].concat(near(a*a)),' sm²'); },
      ()=>{ const a=R(2,40); return item(`gsqP${a}`,`Tomoni ${a} sm bo'lgan kvadratning perimetri?`,4*a,[a*a,2*a].concat(near(4*a)),' sm'); },
      ()=>{ const x=R(20,100),y=R(20,160-x); return item(`gtri${x}-${y}`,`Uchburchakning ikki burchagi ${x}° va ${y}°. Uchinchi burchagi necha gradus?`,180-x-y,[360-x-y,x+y].concat(near(180-x-y,15)),'°'); },
      ()=>{ const t=pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25]]),k=R(1,4); return item(`ghyp${t[0]*k}-${t[1]*k}`,`To'g'ri burchakli uchburchakning katetlari ${t[0]*k} va ${t[1]*k}. Gipotenuza?`,t[2]*k,[(t[0]+t[1])*k,t[2]*k+k,t[2]*k-k,t[1]*k+1]); },
      ()=>{ const n=R(3,12); return item(`gpoly${n}`,`${n} burchakli qavariq ko'pburchak ichki burchaklari yig'indisi?`,(n-2)*180,[n*180,(n-1)*180,(n-3)*180,n*90].filter(v=>v>0),'°'); },
      ()=>{ const a=R(2,12); return item(`gcube${a}`,`Qirrasi ${a} sm bo'lgan kubning hajmi?`,a*a*a,[a*a*6,a*a,12*a].concat(near(a*a*a)),' sm³'); },
      ()=>{ const a=R(2,15),b=R(2,15),c=R(2,15); return item(`gbox${a}-${b}-${c}`,`O'lchamlari ${a}×${b}×${c} sm bo'lgan to'g'ri burchakli parallelepiped hajmi?`,a*b*c,[a*b+c,2*(a*b+b*c+a*c),a+b+c].concat(near(a*b*c)),' sm³'); },
      ()=>{ const r=R(1,20), v=x=>String(Math.round(x*100)/100).replace('.',','); return item(`gcircC${r}`,`Radiusi ${r} sm bo'lgan aylana uzunligi (π ≈ 3,14)?`,v(2*3.14*r),[v(3.14*r),v(3.14*r*r),v(2*3.14*r+3.14),v(4*3.14*r)],' sm'); },
      ()=>{ const a=R(2,20),h=R(2,20); return item(`gtriS${a}-${h}`,`Asosi ${a} sm, balandligi ${h} sm bo'lgan uchburchak yuzi?`,a*h/2,[a*h,a+h,a*h/4].concat(near(a*h/2)),' sm²'); },
      ()=>{ const x=R(10,170); return item(`gadj${x}`,`Qo'shni burchaklardan biri ${x}°. Ikkinchisi necha gradus?`,180-x,[90-x>0?90-x:x+5,360-x,x].concat(near(180-x,10)),'°'); },
    ],
    phys:[
      ()=>{ const v=R(2,30),t=R(2,20); return item(`ps${v}-${t}`,`Jism ${v} m/s tezlik bilan ${t} s harakatlandi. Bosib o'tgan yo'li?`,v*t,[v+t,v*t+v].concat(near(v*t)),' m'); },
      ()=>{ const v=R(2,30),t=R(2,20); return item(`pv${v*t}-${t}`,`Jism ${v*t} m yo'lni ${t} s da bosib o'tdi. Tezligi?`,v,[v*t*t,v+t].concat(near(v,5)),' m/s'); },
      ()=>{ const m=R(1,50),a=R(1,10); return item(`pF${m}-${a}`,`Massasi ${m} kg jismga ${a} m/s² tezlanish berish uchun qancha kuch kerak?`,m*a,[m+a].concat(near(m*a)),' N'); },
      ()=>{ const m=R(1,90); return item(`pP${m}`,`Massasi ${m} kg bo'lgan jismning og'irligi (g = 10 m/s²)?`,m*10,[m,m*100,m+10].concat(near(m*10)),' N'); },
      ()=>{ const r=R(2,50),i=R(1,10); return item(`pU${r}-${i}`,`Qarshiligi ${r} Ω o'tkazgichdan ${i} A tok o'tmoqda. Kuchlanish?`,r*i,[r+i].concat(near(r*i)),' V'); },
      ()=>{ const r=R(2,30),i=R(1,10); return item(`pI${r*i}-${r}`,`${r*i} V kuchlanishda ${r} Ω qarshilikdan qancha tok o'tadi?`,i,[r*i*r,r].concat(near(i,4)),' A'); },
      ()=>{ const F=R(2,100),s=R(2,50); return item(`pA${F}-${s}`,`${F} N kuch jismni ${s} m ga ko'chirdi. Bajarilgan ish?`,F*s,[F+s].concat(near(F*s)),' J'); },
      ()=>{ const t=R(2,20),N=R(5,100); return item(`pN${N*t}-${t}`,`${t} s da ${N*t} J ish bajarildi. Quvvat?`,N,[N*t*t,N+t].concat(near(N,8)),' W'); },
      ()=>{ const V=R(2,20),rho=pick([1000,800,2700,7800]); return item(`prho${rho*V}-${V}`,`Hajmi ${V} m³, massasi ${rho*V} kg bo'lgan moddaning zichligi?`,rho,[rho/10,rho*V*V,rho+V].concat(near(rho)),' kg/m³'); },
      ()=>{ const k=R(1,30)*18; return item(`pkmh${k}`,`${k} km/soat necha m/s ga teng?`,k/3.6,[k*3.6,k/36,k/10,k/3.6+5].map(x=>Math.round(x*10)/10),' m/s'); },
      ()=>{ const m=R(1,20),v=R(1,10)*2; return item(`pEk${m}-${v}`,`Massasi ${m} kg jism ${v} m/s tezlikda. Kinetik energiya (mv²/2)?`,m*v*v/2,[m*v,m*v*v,m*v/2].concat(near(m*v*v/2)),' J'); },
    ],
    cs:[
      ()=>{ const n=R(2,255); return item(`cbin${n}`,`${n} sonining ikkilik sanoq tizimidagi ko'rinishi?`,n.toString(2),[(n+1).toString(2),(n-1).toString(2),(n^1).toString(2),(n+2).toString(2),(n<<1).toString(2)]); },
      ()=>{ const n=R(2,127); return item(`cdec${n}`,`Ikkilik ${n.toString(2)} sonini o'nlik sanoq tizimiga o'tkazing`,n,near(n,6).concat([parseInt(n.toString(2),10)%1000])); },
      ()=>{ const k=R(1,64); return item(`cbyte${k}`,`${k} bayt necha bitga teng?`,k*8,[k*10,k*4,k*16,k*8+8],' bit'); },
      ()=>{ const k=pick([1,2,3,4,5,8,10,16]); return item(`ckb${k}`,`${k} KB necha baytga teng?`,k*1024,[k*1000,k*512,k*2048,k*100],' bayt'); },
      ()=>{ const k=pick([1,2,4,8,16,32]); return item(`cmb${k}`,`${k} GB necha MB ga teng?`,k*1024,[k*1000,k*512,k*100,k*2048],' MB'); },
      ()=>{ const n=R(1,8); return item(`cbits${n}`,`${n} bit yordamida nechta turli qiymatni ifodalash mumkin?`,Math.pow(2,n),[n*2,n*n,Math.pow(2,n)-1,Math.pow(2,n+1)]); },
      ()=>{ const n=R(10,255); return item(`chex${n}`,`${n} sonining o'n oltilik (hex) ko'rinishi?`,n.toString(16).toUpperCase(),[(n+1).toString(16).toUpperCase(),(n+16).toString(16).toUpperCase(),(n-1).toString(16).toUpperCase(),n.toString(8)]); },
    ],
    logic:[
      ()=>{ const a=R(1,30),d=R(2,15); const s=[0,1,2,3,4].map(i=>a+i*d); return item(`lar${a}-${d}`,`${s.join(', ')}, ? Keyingi son?`,a+5*d,near(a+5*d,d).concat([a+4*d+1,a+6*d])); },
      ()=>{ const a=R(1,5),r=R(2,4); const s=[0,1,2,3].map(i=>a*Math.pow(r,i)); return item(`lgeo${a}-${r}`,`${s.join(', ')}, ? Keyingi son?`,a*Math.pow(r,4),[a*Math.pow(r,3)*2+1,a*Math.pow(r,3)+r,a*Math.pow(r,4)+a,a*Math.pow(r,3)*(r+1)]); },
      ()=>{ const k=R(1,8); const s=[0,1,2,3].map(i=>(k+i)*(k+i)); return item(`lsq${k}`,`${s.join(', ')}, ? Keyingi son?`,(k+4)*(k+4),near((k+4)*(k+4),8)); },
      ()=>{ const days=["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"]; const d=R(0,6),n=R(8,400); return item(`lday${d}-${n}`,`Bugun ${days[d].toLowerCase()}. ${n} kundan keyin haftaning qaysi kuni bo'ladi?`,days[(d+n)%7],others(days,days[(d+n)%7])); },
      ()=>{ const h=R(1,11); const ang=Math.min(30*h,360-30*h); return item(`lclock${h}`,`Soat roppa-rosa ${h}:00 da soat va minut millari orasidagi kichik burchak?`,ang,[30*h===ang?360-ang:30*h,ang+30,Math.abs(ang-30)||45,90].filter(v=>v!==ang),'°'); },
      ()=>{ const m=pick([3,4,5,6,7,9]); const base=R(1,9); const good=[0,1,2,3].map(i=>m*(base+i*R(1,2))); const bad=m*R(2,20)+R(1,m-1); return item(`lodd${m}-${good.join('.')}-${bad}`,`Qaysi son ortiqcha: ${shuffle(good.concat([bad])).join(', ')}?`,bad,good); },
      ()=>{ const a=R(5,15),d=R(2,8); return item(`lage${a}-${d}`,`Ali ${a} yoshda, akasi undan ${d} yosh katta. 5 yildan keyin akasi necha yoshda bo'ladi?`,a+d+5,[a+d,a+5,a+d+10,a+d+4]); },
      ()=>{ const n=R(3,12); return item(`lhand${n}`,`${n} kishi bir-biri bilan bir martadan qo'l berib ko'rishdi. Jami nechta qo'l berish bo'ldi?`,n*(n-1)/2,[n*(n-1),n*n,n*2,n*(n-1)/2+n]); },
      ()=>{ const a=R(2,9),b=R(2,9); const s=[a,b,a+b,a+2*b]; return item(`lfib${a}-${b}`,`${s.join(', ')}, ? (har son oldingi ikkitasining yig'indisi)`,2*a+3*b,near(2*a+3*b,5)); },
    ],
  };

  /* ============================= TABLES ============================= */
  // [symbol, name, atomic number]
  const ELEMENTS=[["H","Vodorod",1],["He","Geliy",2],["Li","Litiy",3],["Be","Berilliy",4],["B","Bor",5],["C","Uglerod",6],["N","Azot",7],["O","Kislorod",8],["F","Ftor",9],["Ne","Neon",10],["Na","Natriy",11],["Mg","Magniy",12],["Al","Alyuminiy",13],["Si","Kremniy",14],["P","Fosfor",15],["S","Oltingugurt",16],["Cl","Xlor",17],["Ar","Argon",18],["K","Kaliy",19],["Ca","Kalsiy",20],["Cr","Xrom",24],["Mn","Marganets",25],["Fe","Temir",26],["Co","Kobalt",27],["Ni","Nikel",28],["Cu","Mis",29],["Zn","Rux",30],["Br","Brom",35],["Ag","Kumush",47],["Sn","Qalay",50],["I","Yod",53],["Ba","Bariy",56],["Pt","Platina",78],["Au","Oltin",79],["Hg","Simob",80],["Pb","Qo'rg'oshin",82],["U","Uran",92]];
  const FORMULAS=[["H₂O","Suv"],["CO₂","Karbonat angidrid"],["NaCl","Osh tuzi"],["H₂SO₄","Sulfat kislota"],["HCl","Xlorid kislota"],["HNO₃","Nitrat kislota"],["NH₃","Ammiak"],["CH₄","Metan"],["O₃","Ozon"],["CaCO₃","Kalsiy karbonat (bo'r)"],["NaOH","Natriy gidroksid"],["C₂H₅OH","Etil spirti"],["C₆H₁₂O₆","Glyukoza"],["H₂O₂","Vodorod peroksid"],["CO","Is gazi (uglerod monoksid)"],["SO₂","Oltingugurt dioksid"],["CaO","So'ndirilmagan ohak"],["Fe₂O₃","Temir (III) oksid"],["KOH","Kaliy gidroksid"],["NaHCO₃","Ichimlik sodasi"]];
  // [country, capital, continent]
  const COUNTRIES_T=[["O'zbekiston","Toshkent","Osiyo"],["Qozog'iston","Astana","Osiyo"],["Qirg'iziston","Bishkek","Osiyo"],["Tojikiston","Dushanbe","Osiyo"],["Turkmaniston","Ashxobod","Osiyo"],["Afg'oniston","Kobul","Osiyo"],["Rossiya","Moskva","Yevropa"],["Turkiya","Anqara","Osiyo"],["Xitoy","Pekin","Osiyo"],["Yaponiya","Tokio","Osiyo"],["Janubiy Koreya","Seul","Osiyo"],["Hindiston","Nyu-Dehli","Osiyo"],["Pokiston","Islomobod","Osiyo"],["Eron","Tehron","Osiyo"],["Saudiya Arabistoni","Ar-Riyod","Osiyo"],["BAA","Abu-Dabi","Osiyo"],["Misr","Qohira","Afrika"],["Germaniya","Berlin","Yevropa"],["Fransiya","Parij","Yevropa"],["Buyuk Britaniya","London","Yevropa"],["Italiya","Rim","Yevropa"],["Ispaniya","Madrid","Yevropa"],["Portugaliya","Lissabon","Yevropa"],["Niderlandiya","Amsterdam","Yevropa"],["Belgiya","Bryussel","Yevropa"],["Shveytsariya","Bern","Yevropa"],["Avstriya","Vena","Yevropa"],["Shvetsiya","Stokgolm","Yevropa"],["Norvegiya","Oslo","Yevropa"],["Finlyandiya","Xelsinki","Yevropa"],["Polsha","Varshava","Yevropa"],["Chexiya","Praga","Yevropa"],["Vengriya","Budapesht","Yevropa"],["Gretsiya","Afina","Yevropa"],["Ukraina","Kiyev","Yevropa"],["Belarus","Minsk","Yevropa"],["Gruziya","Tbilisi","Osiyo"],["Ozarbayjon","Boku","Osiyo"],["Armaniston","Yerevan","Osiyo"],["AQSH","Vashington","Shimoliy Amerika"],["Kanada","Ottava","Shimoliy Amerika"],["Meksika","Mexiko","Shimoliy Amerika"],["Braziliya","Braziliya","Janubiy Amerika"],["Argentina","Buenos-Ayres","Janubiy Amerika"],["Chili","Santyago","Janubiy Amerika"],["Peru","Lima","Janubiy Amerika"],["Kolumbiya","Bogota","Janubiy Amerika"],["Avstraliya","Kanberra","Avstraliya"],["Yangi Zelandiya","Vellington","Avstraliya"],["Nigeriya","Abuja","Afrika"],["Keniya","Nayrobi","Afrika"],["Efiopiya","Addis-Abeba","Afrika"],["Marokash","Rabot","Afrika"],["Janubiy Afrika","Pretoriya","Afrika"],["Indoneziya","Jakarta","Osiyo"],["Malayziya","Kuala-Lumpur","Osiyo"],["Tailand","Bangkok","Osiyo"],["Vyetnam","Xanoy","Osiyo"],["Mongoliya","Ulan-Bator","Osiyo"],["Iroq","Bag'dod","Osiyo"]];
  const UZ_REGIONS=[["Andijon viloyati","Andijon"],["Buxoro viloyati","Buxoro"],["Farg'ona viloyati","Farg'ona"],["Jizzax viloyati","Jizzax"],["Xorazm viloyati","Urganch"],["Namangan viloyati","Namangan"],["Navoiy viloyati","Navoiy"],["Qashqadaryo viloyati","Qarshi"],["Samarqand viloyati","Samarqand"],["Sirdaryo viloyati","Guliston"],["Surxondaryo viloyati","Termiz"],["Qoraqalpog'iston Respublikasi","Nukus"]];
  // [English, Uzbek]
  const EN=[["apple","olma"],["book","kitob"],["water","suv"],["house","uy"],["dog","it"],["cat","mushuk"],["bird","qush"],["tree","daraxt"],["flower","gul"],["sun","quyosh"],["moon","oy"],["star","yulduz"],["sky","osmon"],["sea","dengiz"],["river","daryo"],["mountain","tog'"],["school","maktab"],["teacher","o'qituvchi"],["student","talaba"],["friend","do'st"],["family","oila"],["mother","ona"],["father","ota"],["brother","aka / uka"],["sister","opa / singil"],["child","bola"],["city","shahar"],["village","qishloq"],["road","yo'l"],["car","mashina"],["bread","non"],["milk","sut"],["tea","choy"],["egg","tuxum"],["meat","go'sht"],["fish","baliq"],["table","stol"],["chair","stul"],["window","deraza"],["door","eshik"],["pen","ruchka"],["pencil","qalam"],["notebook","daftar"],["bag","sumka"],["red","qizil"],["green","yashil"],["blue","ko'k"],["white","oq"],["black","qora"],["yellow","sariq"],["big","katta"],["small","kichik"],["new","yangi"],["old","eski"],["good","yaxshi"],["bad","yomon"],["hot","issiq"],["cold","sovuq"],["fast","tez"],["slow","sekin"],["happy","baxtli"],["beautiful","chiroyli"],["strong","kuchli"],["to read","o'qimoq"],["to write","yozmoq"],["to run","yugurmoq"],["to swim","suzmoq"],["to sleep","uxlamoq"],["to eat","yemoq"],["to drink","ichmoq"],["to speak","gapirmoq"],["to listen","tinglamoq"],["to work","ishlamoq"],["to play","o'ynamoq"],["to buy","sotib olmoq"],["to open","ochmoq"],["to close","yopmoq"],["morning","ertalab"],["evening","kechqurun"],["night","tun"],["day","kun"],["week","hafta"],["month","oy (vaqt)"],["year","yil"],["today","bugun"],["tomorrow","ertaga"],["yesterday","kecha"],["hand","qo'l"],["head","bosh"],["eye","ko'z"],["heart","yurak"],["money","pul"],["time","vaqt"],["work","ish"],["word","so'z"],["question","savol"],["answer","javob"],["window","deraza"],["garden","bog'"],["horse","ot"],["cow","sigir"],["sheep","qo'y"],["winter","qish"],["summer","yoz"],["spring","bahor"],["autumn","kuz"]];
  // [infinitive, past simple]
  const IRREG=[["go","went"],["see","saw"],["eat","ate"],["drink","drank"],["write","wrote"],["read","read"],["take","took"],["give","gave"],["come","came"],["make","made"],["buy","bought"],["think","thought"],["teach","taught"],["catch","caught"],["bring","brought"],["swim","swam"],["run","ran"],["sing","sang"],["begin","began"],["know","knew"],["fly","flew"],["speak","spoke"],["sleep","slept"],["sit","sat"],["get","got"],["find","found"],["tell","told"],["leave","left"],["feel","felt"],["meet","met"]];
  const RU=[["дом","uy"],["книга","kitob"],["вода","suv"],["хлеб","non"],["молоко","sut"],["школа","maktab"],["учитель","o'qituvchi"],["друг","do'st"],["мама","ona"],["папа","ota"],["брат","aka / uka"],["сестра","opa / singil"],["город","shahar"],["улица","ko'cha"],["окно","deraza"],["дверь","eshik"],["стол","stol"],["стул","stul"],["ручка","ruchka"],["тетрадь","daftar"],["собака","it"],["кошка","mushuk"],["птица","qush"],["дерево","daraxt"],["цветок","gul"],["солнце","quyosh"],["луна","oy"],["небо","osmon"],["море","dengiz"],["река","daryo"],["гора","tog'"],["красный","qizil"],["зелёный","yashil"],["синий","ko'k"],["белый","oq"],["чёрный","qora"],["большой","katta"],["маленький","kichik"],["новый","yangi"],["старый","eski"],["хороший","yaxshi"],["плохой","yomon"],["тёплый","iliq"],["холодный","sovuq"],["быстро","tez"],["медленно","sekin"],["читать","o'qimoq"],["писать","yozmoq"],["бегать","yugurmoq"],["спать","uxlamoq"],["есть","yemoq"],["пить","ichmoq"],["говорить","gapirmoq"],["работать","ishlamoq"],["играть","o'ynamoq"],["утро","ertalab"],["вечер","kechqurun"],["ночь","tun"],["день","kun"],["неделя","hafta"],["год","yil"],["сегодня","bugun"],["завтра","ertaga"],["вчера","kecha"],["рука","qo'l"],["голова","bosh"],["глаз","ko'z"],["сердце","yurak"],["деньги","pul"],["время","vaqt"],["работа","ish"],["слово","so'z"],["вопрос","savol"],["ответ","javob"],["зима","qish"],["лето","yoz"],["весна","bahor"],["осень","kuz"],["спасибо","rahmat"],["привет","salom"],["пожалуйста","marhamat"],["до свидания","xayr"],["извините","kechirasiz"],["да","ha"],["нет","yo'q"]];
  // Uzbek words by part of speech
  const POS={
    "Ot":["kitob","maktab","daraxt","shahar","daryo","qalam","bola","osmon","non","stol","tog'","gul","ota","do'stlik","bilim","Vatan","quyosh","daftar","eshik","bahor"],
    "Sifat":["chiroyli","katta","kichik","qizil","shirin","baland","aqlli","yashil","issiq","sovuq","yangi","eski","kuchli","mehribon","toza","yorug'","keng","tor","achchiq","oq"],
    "Fe'l":["yugurmoq","o'qimoq","yozmoq","kelmoq","bormoq","gapirmoq","ko'rmoq","eshitmoq","o'ynamoq","uxlamoq","ishlamoq","sevmoq","kulmoq","yig'lamoq","so'ramoq","bermoq","olmoq","o'tirmoq","turmoq","yashamoq"],
    "Son":["besh","o'n","yuz","ming","ikkinchi","uchta","yetti","birinchi","to'qqiz","qirq","oltmish","sakkizinchi"],
    "Olmosh":["men","sen","u","biz","siz","ular","bu","shu","kim","nima","o'zim","hamma"],
    "Ravish":["tez","sekin","bugun","ertaga","kecha","ko'p","oz","doim","hozir","yuqorida","pastda","birga"],
  };
  const ANTONYMS=[["katta","kichik"],["issiq","sovuq"],["baland","past"],["yaxshi","yomon"],["oq","qora"],["tez","sekin"],["yangi","eski"],["kun","tun"],["kirmoq","chiqmoq"],["boy","kambag'al"],["keng","tor"],["og'ir","yengil"],["shirin","achchiq"],["kulmoq","yig'lamoq"],["do'st","dushman"],["uzoq","yaqin"],["ochmoq","yopmoq"],["to'la","bo'sh"],["quvnoq","g'amgin"],["ko'p","oz"]];
  const SYNONYMS=[["chiroyli","go'zal"],["aqlli","dono"],["katta","ulkan"],["tez","chaqqon"],["xursand","shod"],["qo'rqoq","yuraksiz"],["bahodir","qahramon"],["yuz","bet"],["mehnatkash","ishchan"],["sokin","tinch"],["dushman","yov"],["vatan","yurt"],["ozoda","toza"],["kuchli","baquvvat"],["yolg'on","kizb"]];
  // [work, author]
  const BOOKS=[["O'tkan kunlar","Abdulla Qodiriy"],["Mehrobdan chayon","Abdulla Qodiriy"],["Kecha va kunduz","Cho'lpon"],["Shum bola","G'afur G'ulom"],["Sariq devni minib","Xudoyberdi To'xtaboyev"],["Navoiy (roman)","Oybek"],["Qutlug' qon","Oybek"],["Ulug'bek xazinasi","Odil Yoqubov"],["Boburnoma","Zahiriddin Muhammad Bobur"],["Xamsa","Alisher Navoiy"],["Mahbub ul-qulub","Alisher Navoiy"],["Lison ut-tayr","Alisher Navoiy"],["Sinchalak","Abdulla Qahhor"],["O'g'ri (hikoya)","Abdulla Qahhor"],["Yulduzli tunlar","Pirimqul Qodirov"],["Ufq","Said Ahmad"],["Kelinlar qo'zg'aloni","Said Ahmad"],["Otamdan qolgan dalalar","Tog'ay Murod"],["Dunyoning ishlari","O'tkir Hoshimov"],["Ikki eshik orasi","O'tkir Hoshimov"],["Shaytanat","Tohir Malik"],["Mirzo Ulug'bek (tragediya)","Maqsud Shayxzoda"],["Hamlet","Uilyam Shekspir"],["Romeo va Julyetta","Uilyam Shekspir"],["Urush va tinchlik","Lev Tolstoy"],["Jinoyat va jazo","Fyodor Dostoyevskiy"],["Don Kixot","Migel de Servantes"],["Robinzon Kruzo","Daniel Defo"],["Shohnoma","Abulqosim Firdavsiy"],["Qutadg'u bilig","Yusuf Xos Hojib"],["Devonu lug'otit turk","Mahmud Koshg'ariy"],["Hibat ul-haqoyiq","Ahmad Yugnakiy"]];
  // [event, year]
  const UZ_HIST=[["Amir Temur tug'ilgan yil","1336"],["Amir Temur vafot etgan yil","1405"],["Alisher Navoiy tug'ilgan yil","1441"],["Zahiriddin Muhammad Bobur tug'ilgan yil","1483"],["Mirzo Ulug'bek tug'ilgan yil","1394"],["Abu Ali ibn Sino tug'ilgan yil","980"],["Abu Rayhon Beruniy tug'ilgan yil","973"],["Panipat jangi (Bobur Hindistonda saltanat asos solgan) yili","1526"],["Chingizxon qo'shinlari Buxoroni egallagan yil","1220"],["Toshkentni Rossiya imperiyasi bosib olgan yil","1865"],["Turkiston general-gubernatorligi tuzilgan yil","1867"],["Buxoro amirligi tugatilgan yil","1920"],["O'zbekiston SSR tuzilgan yil","1924"],["Toshkent zilzilasi yili","1966"],["O'zbekiston mustaqillikka erishgan yil","1991"],["O'zbekiston davlat bayrog'i qabul qilingan yil","1991"],["Mustaqil O'zbekistonning birinchi Konstitutsiyasi qabul qilingan yil","1992"],["Milliy valyuta — so'm to'liq muomalaga kiritilgan yil","1994"],["O'zbekistonning yangi tahrirdagi Konstitutsiyasi qabul qilingan yil","2023"]];
  const UZ_PEOPLE=[["Abu Ali ibn Sino","Tibbiyot"],["Muhammad al-Xorazmiy","Algebra (matematika)"],["Mirzo Ulug'bek","Astronomiya"],["Imom al-Buxoriy","Hadis ilmi"],["Kamoliddin Behzod","Miniatura rassomligi"],["Alisher Navoiy","She'riyat va adabiyot"],["Abu Rayhon Beruniy","Qomusiy olim (geografiya, astronomiya)"],["Ahmad al-Farg'oniy","Astronomiya"]];
  const WORLD_HIST=[["Birinchi jahon urushi boshlangan yil","1914"],["Birinchi jahon urushi tugagan yil","1918"],["Ikkinchi jahon urushi boshlangan yil","1939"],["Ikkinchi jahon urushi tugagan yil","1945"],["Kolumb Amerikaga yetib kelgan yil","1492"],["Buyuk fransuz inqilobi boshlangan yil","1789"],["AQSH Mustaqillik deklaratsiyasi qabul qilingan yil","1776"],["Berlin devori qulagan yil","1989"],["SSSR parchalangan yil","1991"],["Yuriy Gagarin koinotga uchgan yil","1961"],["Inson ilk bor Oyga qadam qo'ygan yil","1969"],["BMT tashkil topgan yil","1945"],["Konstantinopol (Istanbul) usmonlilar tomonidan fath etilgan yil","1453"],["G'arbiy Rim imperiyasi qulagan yil","476"],["Vaterloo jangi bo'lgan yil","1815"],["Rossiyada Oktyabr inqilobi bo'lgan yil","1917"],["Titanik kemasi cho'kkan yil","1912"],["Hindiston mustaqillikka erishgan yil","1947"],["Xitoy Xalq Respublikasi tashkil topgan yil","1949"],["Inson huquqlari umumjahon deklaratsiyasi qabul qilingan yil","1948"],["Magellan dunyo bo'ylab sayohatini boshlagan yil","1519"],["AQSHda fuqarolar urushi boshlangan yil","1861"]];
  // [animal, class]
  const ANIMALS=[["Kit","Sutemizuvchilar"],["Delfin","Sutemizuvchilar"],["Ko'rshapalak","Sutemizuvchilar"],["Fil","Sutemizuvchilar"],["Pingvin","Qushlar"],["Tuyaqush","Qushlar"],["Burgut","Qushlar"],["Ilon","Sudralib yuruvchilar"],["Toshbaqa","Sudralib yuruvchilar"],["Timsoh","Sudralib yuruvchilar"],["Kaltakesak","Sudralib yuruvchilar"],["Qurbaqa","Suvda hamda quruqlikda yashovchilar"],["Baqa","Suvda hamda quruqlikda yashovchilar"],["Akula","Baliqlar"],["Laqqa","Baliqlar"],["Chumoli","Hasharotlar"],["Kapalak","Hasharotlar"],["Asalari","Hasharotlar"],["Chigirtka","Hasharotlar"]];
  const ORGANS=[["Yurak","Qonni tana bo'ylab haydaydi"],["O'pka","Nafas olish — gaz almashinuvi"],["Buyrak","Qonni tozalab, siydik hosil qiladi"],["Oshqozon","Ovqatni hazm qiladi"],["Bosh miya","Tana faoliyatini boshqaradi"],["Teri","Tanani tashqi muhitdan himoya qiladi"],["Ko'z","Ko'rish"],["Quloq","Eshitish"]];
  const VITAMINS=[["C vitamini","Sitrus mevalar (limon, apelsin)"],["D vitamini","Quyosh nuri ta'sirida terida hosil bo'ladi"],["A vitamini","Sabzi"],["B12 vitamini","Go'sht va hayvon mahsulotlari"]];

  const romanBig=n=>{ let out=''; for(const [v,r] of [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]) while(n>=v){ out+=r; n-=v; } return out; };
  const century=y=>romanBig(Math.ceil(+y/100))+' asr';
  // extra hand-checked facts: [question, correct, [wrong, wrong, wrong]]
  const HUQUQ=[
    ["O'zbekistonning davlat tili qaysi?","O'zbek tili",["Rus tili","Ingliz tili","Tojik tili"]],
    ["O'zbekiston Respublikasining poytaxti?","Toshkent",["Samarqand","Buxoro","Namangan"]],
    ["O'zbekiston Respublikasi Prezidenti (2023-yilgi Konstitutsiya bo'yicha) necha yil muddatga saylanadi?","7 yil",["4 yil","5 yil","10 yil"]],
    ["Oliy Majlis necha palatadan iborat?","2 ta",["1 ta","3 ta","4 ta"]],
    ["Oliy Majlisning quyi palatasi qanday ataladi?","Qonunchilik palatasi",["Senat","Vazirlar Mahkamasi","Konstitutsiyaviy sud"]],
    ["Oliy Majlisning yuqori palatasi qanday ataladi?","Senat",["Qonunchilik palatasi","Hukumat","Oliy sud"]],
    ["O'zbekistonda fuqaro necha yoshdan saylash huquqiga ega?","18 yoshdan",["16 yoshdan","21 yoshdan","25 yoshdan"]],
    ["O'zbekistonda shaxs necha yoshdan voyaga yetgan hisoblanadi?","18 yosh",["14 yosh","16 yosh","21 yosh"]],
    ["O'zbekistonda nikoh yoshi (erkak va ayol uchun) necha yosh?","18 yosh",["16 yosh","17 yosh","20 yosh"]],
    ["O'zbekiston Mustaqillik kuni qachon nishonlanadi?","1-sentyabr",["8-dekabr","21-mart","9-may"]],
    ["O'zbekistonda Konstitutsiya kuni qachon nishonlanadi?","8-dekabr",["1-sentyabr","1-oktyabr","14-yanvar"]],
    ["O'zbekiston davlat ramzlariga qaysilar kiradi?","Bayroq, gerb va madhiya",["Bayroq va pul","Gerb va pasport","Madhiya va poytaxt"]],
    ["O'zbekiston davlat bayrog'i qachon qabul qilingan?","1991-yil 18-noyabr",["1991-yil 1-sentyabr","1992-yil 8-dekabr","1992-yil 2-iyul"]],
    ["O'zbekiston davlat gerbi qachon qabul qilingan?","1992-yil 2-iyul",["1991-yil 18-noyabr","1992-yil 10-dekabr","1991-yil 31-avgust"]],
    ["O'zbekiston davlat madhiyasi qachon qabul qilingan?","1992-yil 10-dekabr",["1992-yil 2-iyul","1991-yil 18-noyabr","1993-yil 1-sentyabr"]],
    ["O'zbekiston davlat madhiyasi so'zlari muallifi kim?","Abdulla Oripov",["Erkin Vohidov","G'afur G'ulom","Muhammad Yusuf"]],
    ["O'zbekiston davlat madhiyasi musiqasi muallifi kim?","Mutal Burhonov",["Yunus Rajabiy","Mutavakkil Burhonov","To'xtasin Jalilov"]],
    ["BMT Bola huquqlari to'g'risidagi konvensiyasi qaysi yili qabul qilingan?","1989",["1948","1991","2000"]],
    ["Inson huquqlari umumjahon deklaratsiyasi qaysi yili qabul qilingan?","1948",["1945","1966","1991"]],
    ["Qonunlarni qabul qiladigan hokimiyat tarmog'i qanday ataladi?","Qonun chiqaruvchi hokimiyat",["Ijro etuvchi hokimiyat","Sud hokimiyati","Mahalliy hokimiyat"]],
    ["Ijro etuvchi hokimiyatni O'zbekistonda qaysi organ amalga oshiradi?","Vazirlar Mahkamasi",["Oliy Majlis","Konstitutsiyaviy sud","Prokuratura"]],
    ["Odil sudlovni kim amalga oshiradi?","Sudlar",["Hokimlar","Vazirliklar","Mahalla"]],
    ["Qonunlar va boshqa normativ hujjatlar ichida eng yuqori yuridik kuchga ega hujjat?","Konstitutsiya",["Farmon","Qaror","Buyruq"]],
    ["Fuqaroning shaxsini tasdiqlovchi asosiy hujjat?","ID-karta (pasport)",["Diplom","Haydovchilik guvohnomasi","Tug'ilganlik guvohnomasi"]],
  ];
  const HIST_EXTRA=[
    ["Amir Temur saltanatining poytaxti qaysi shahar edi?","Samarqand",["Buxoro","Shahrisabz","Hirot"]],
    ["Amir Temur qayerda tug'ilgan?","Kesh (Shahrisabz) yaqinida",["Samarqand","Buxoro","Xiva"]],
    ["Mirzo Ulug'bek rasadxonasi qaysi shaharda?","Samarqand",["Buxoro","Toshkent","Xiva"]],
    ["\"Boburnoma\" qaysi tilda yozilgan?","Turkiy (eski o'zbek) tilida",["Fors tilida","Arab tilida","Urdu tilida"]],
    ["Buyuk ipak yo'li qaysi mintaqalarni bog'lagan?","Sharq va G'arbni",["Shimol va Janubni","Faqat Yevropani","Faqat Afrikani"]],
    ["Xiva shahridagi qadimiy ichki shahar qanday ataladi?","Ichan qal'a",["Registon","Ark","Ko'kaldosh"]],
    ["Samarqanddagi mashhur maydon nomi?","Registon",["Ichan qal'a","Mustaqillik maydoni","Labi hovuz"]],
    ["Buxorodagi qadimiy qal'a qanday ataladi?","Ark",["Registon","Ichan qal'a","Shohizinda"]],
    ["Amir Temur maqbarasi qanday ataladi?","Go'ri Amir",["Shohizinda","Bibixonim","Oqsaroy"]],
    ["Shahrisabzdagi Amir Temur qurdirgan saroy?","Oqsaroy",["Go'ri Amir","Ark","Registon"]],
    ["Al-Xorazmiy qaysi fanning asoschisi sifatida tanilgan?","Algebra",["Kimyo","Biologiya","Geografiya"]],
    ["Ibn Sinoning mashhur tibbiy asari?","Tib qonunlari",["Boburnoma","Xamsa","Qutadg'u bilig"]],
    ["Jaloliddin Manguberdi kimga qarshi kurashgan?","Chingizxon qo'shinlariga",["Amir Temurga","Rossiya imperiyasiga","Arab xalifaligiga"]],
    ["O'zbekistonning birinchi Prezidenti kim bo'lgan?","Islom Karimov",["Shavkat Mirziyoyev","Sharof Rashidov","Usmon Yusupov"]],
  ];
  const WORLD_EXTRA=[
    ["AQSHning birinchi prezidenti kim?","Jorj Vashington",["Avraam Linkoln","Tomas Jefferson","Benjamin Franklin"]],
    ["Napoleon Bonapart qaysi davlat imperatori bo'lgan?","Fransiya",["Germaniya","Italiya","Ispaniya"]],
    ["Qadimgi Misr hukmdorlari qanday atalgan?","Fir'avnlar",["Sultonlar","Imperatorlar","Xonlar"]],
    ["Qadimgi Olimpiya o'yinlari qayerda boshlangan?","Qadimgi Yunonistonda",["Qadimgi Rimda","Qadimgi Misrda","Xitoyda"]],
    ["Buyuk Xitoy devori nima maqsadda qurilgan?","Ko'chmanchi bosqinchilardan himoyalanish uchun",["Daryo toshqinidan saqlanish","Savdo yo'li sifatida","Ibodat uchun"]],
    ["Koinotga birinchi uchgan inson kim?","Yuriy Gagarin",["Nil Armstrong","Valentina Tereshkova","German Titov"]],
    ["Oyga birinchi qadam qo'ygan inson kim?","Nil Armstrong",["Yuriy Gagarin","Bazz Oldrin","Maykl Kollinz"]],
    ["Amerikani 1492-yilda kim kashf etgan?","Xristofor Kolumb",["Fernan Magellan","Vasko da Gama","Jeyms Kuk"]],
    ["Hindistonga dengiz yo'lini birinchi ochgan sayyoh?","Vasko da Gama",["Kolumb","Magellan","Marko Polo"]],
    ["Rim imperiyasining poytaxti qaysi shahar bo'lgan?","Rim",["Afina","Iskandariya","Karfagen"]],
    ["Aleksandr Makedonskiy kimning shogirdi bo'lgan?","Aristotel",["Platon","Suqrot","Pifagor"]],
    ["Piramidalar asosan qaysi mamlakatda joylashgan?","Misr",["Hindiston","Meksika","Iroq"]],
  ];
  const BIO_EXTRA=[
    ["Inson tanasidagi eng katta a'zo?","Teri",["Jigar","O'pka","Yurak"]],
    ["Qon tarkibida kislorod tashuvchi hujayralar?","Eritrotsitlar",["Leykotsitlar","Trombotsitlar","Neyronlar"]],
    ["Organizmni mikroblardan himoya qiluvchi qon hujayralari?","Leykotsitlar",["Eritrotsitlar","Trombotsitlar","Plazma"]],
    ["Qon ivishida ishtirok etuvchi hujayralar?","Trombotsitlar",["Eritrotsitlar","Leykotsitlar","Limfa"]],
    ["O'simliklarga yashil rang beruvchi modda?","Xlorofill",["Gemoglobin","Melanin","Karotin"]],
    ["Fotosintez natijasida o'simliklar qaysi gazni ajratadi?","Kislorod",["Karbonat angidrid","Azot","Vodorod"]],
    ["Odamda nechta xromosoma bor?","46 ta",["23 ta","44 ta","48 ta"]],
    ["Hujayraning \"energiya stansiyasi\" deb ataladigan organoidi?","Mitoxondriya",["Yadro","Ribosoma","Vakuola"]],
    ["Katta yoshli odamda nechta tish bo'ladi (aql tishlari bilan)?","32 ta",["28 ta","30 ta","36 ta"]],
    ["Eng katta sutemizuvchi hayvon?","Ko'k kit",["Fil","Jirafa","Oq ayiq"]],
  ];

  function tableItems(subj){
    const out=[];
    const add=(id,q,c,pool)=>{ const it=item(id,q,c,others(pool,c)); if(it) out.push(it); };
    if(subj==='chem'){
      const syms=ELEMENTS.map(e=>e[0]), names=ELEMENTS.map(e=>e[1]), nums=ELEMENTS.map(e=>String(e[2]));
      ELEMENTS.forEach(([s,n,z])=>{ add('chs'+s,`${n} elementining kimyoviy belgisi?`,s,syms); add('chn'+s,`${s} — qaysi element belgisi?`,n,names); add('chz'+s,`${n} elementining tartib raqami?`,String(z),nums); });
      const fs=FORMULAS.map(f=>f[0]), fn=FORMULAS.map(f=>f[1]);
      FORMULAS.forEach(([f,n],i)=>{ add('chf'+i,`${f} — bu qaysi modda?`,n,fn); add('chg'+i,`"${n}" moddasining formulasi?`,f,fs); });
    }
    if(subj==='geo'){
      const caps=COUNTRIES_T.map(c=>c[1]), cs=COUNTRIES_T.map(c=>c[0]), conts=["Osiyo","Yevropa","Afrika","Shimoliy Amerika","Janubiy Amerika","Avstraliya"];
      COUNTRIES_T.forEach(([c,cap,cont],i)=>{ add('gcap'+i,`${c} poytaxti?`,cap,caps); if(c!==cap) add('gcou'+i,`${cap} — qaysi davlatning poytaxti?`,c,cs); add('gcon'+i,`${c} qaysi qit'ada joylashgan?`,cont,conts); });
      const rc=UZ_REGIONS.map(r=>r[1]);
      UZ_REGIONS.forEach(([r,c],i)=>add('greg'+i,`${r}ning markazi qaysi shahar?`,c,rc));
    }
    if(subj==='eng'){
      const ens=EN.map(e=>e[0]), uzs=EN.map(e=>e[1]);
      EN.forEach(([e,u],i)=>{ add('een'+i,`"${e}" so'zining tarjimasi?`,u,uzs); add('euz'+i,`"${u}" ingliz tilida qanday?`,e,ens); });
      const past=IRREG.map(v=>v[1]);
      IRREG.forEach(([v,p],i)=>{ const reg=v.endsWith('e')?v+'d':v+'ed'; const it=item('eirr'+i,`"${v}" fe'lining o'tgan zamon (Past Simple) shakli?`,p,[reg,v+'ing'].concat(others(past,p))); if(it) out.push(it); });
    }
    if(subj==='rus'){
      const rus=RU.map(r=>r[0]), uzs=RU.map(r=>r[1]);
      RU.forEach(([r,u],i)=>{ add('rru'+i,`"${r}" so'zining ma'nosi?`,u,uzs); add('ruz'+i,`"${u}" rus tilida qanday?`,r,rus); });
    }
    if(subj==='onatili'){
      const kinds=Object.keys(POS);
      kinds.forEach(k=>POS[k].forEach(w=>add('opos'+k+w,`"${w}" so'zi qaysi so'z turkumiga kiradi?`,k,kinds)));
      const allW=ANTONYMS.flat(), allS=SYNONYMS.flat();
      ANTONYMS.forEach(([a,b],i)=>{ add('oant'+i,`"${a}" so'zining zid ma'noli (antonim) jufti?`,b,others(allW,a)); });
      SYNONYMS.forEach(([a,b],i)=>{ add('osyn'+i,`"${a}" so'zining ma'nodoshi (sinonimi)?`,b,others(allS,a)); });
    }
    if(subj==='adabiyot'){
      const authors=[...new Set(BOOKS.map(b=>b[1]))], works=BOOKS.map(b=>b[0]);
      BOOKS.forEach(([w,a],i)=>{ add('abk'+i,`"${w}" asarining muallifi kim?`,a,authors); });
      authors.forEach((a,i)=>{ const mine=BOOKS.filter(b=>b[1]===a).map(b=>b[0]); const it=item('aau'+i+'-'+mine.length,`Quyidagilardan qaysi biri ${a} asari?`,pick(mine),works.filter(w=>!mine.includes(w))); if(it){ it.id='aau'+i+'-'+it.o[it.c]; out.push(it);} });
    }
    if(subj==='hist'){
      const years=UZ_HIST.map(h=>h[1]);
      UZ_HIST.forEach(([e,y],i)=>{ add('hy'+i,`${e}?`,y,years.concat([String(+y+1),String(+y-2),String(+y+10)]));
        const c=century(y); const it=item('hc'+i,`${e} qaysi asrga to'g'ri keladi?`,c,[+y+100,+y-100,+y+200,+y-200,+y+300].filter(v=>v>0&&v<=2100).map(century)); if(it) out.push(it); });
      HIST_EXTRA.forEach(([q,c,w],i)=>{ const it=item('hx'+i,q,c,w); if(it) out.push(it); });
      const fields=UZ_PEOPLE.map(p=>p[1]);
      UZ_PEOPLE.forEach(([p,f],i)=>add('hp'+i,`${p} qaysi soha bilan mashhur?`,f,fields));
    }
    if(subj==='worldhist'){
      const years=WORLD_HIST.map(h=>h[1]);
      WORLD_HIST.forEach(([e,y],i)=>{ add('wy'+i,`${e}?`,y,years.concat([String(+y+1),String(+y-3),String(+y+10)]));
        const c=century(y); const it=item('wc'+i,`${e} qaysi asrga to'g'ri keladi?`,c,[+y+100,+y-100,+y+200,+y-200,+y+300].filter(v=>v>0&&v<=2100).map(century)); if(it) out.push(it); });
      WORLD_EXTRA.forEach(([q,c,w],i)=>{ const it=item('wx'+i,q,c,w); if(it) out.push(it); });
    }
    if(subj==='bio'){
      const cls=["Sutemizuvchilar","Qushlar","Sudralib yuruvchilar","Suvda hamda quruqlikda yashovchilar","Baliqlar","Hasharotlar"];
      ANIMALS.forEach(([a,c],i)=>add('ban'+i,`${a} qaysi sinfga kiradi?`,c,cls));
      const fn=ORGANS.map(o=>o[1]), on=ORGANS.map(o=>o[0]);
      ORGANS.forEach(([o,f],i)=>{ add('borg'+i,`${o}ning asosiy vazifasi?`,f,fn); add('borf'+i,`"${f}" — bu qaysi a'zoning vazifasi?`,o,on); });
      const vs=VITAMINS.map(v=>v[1]);
      VITAMINS.forEach(([v,s],i)=>add('bvit'+i,`${v} manbai sifatida qaysi biri to'g'ri?`,s,vs));
      BIO_EXTRA.forEach(([q,c,w],i)=>{ const it=item('bx'+i,q,c,w); if(it) out.push(it); });
    }
    if(subj==='huquq') HUQUQ.forEach(([q,c,w],i)=>{ const it=item('hq'+i,q,c,w); if(it) out.push(it); });
    return out;
  }

  /* ========================= PUBLIC API ========================= */
  const cache={};
  // All finite questions of a subject (tables + hand-written bank)
  function finitePool(subj){
    if(cache[subj]) return cache[subj];
    const manual=(subj==='logic'?logicBank:(qbank[subj]||[])).map((it,i)=>({id:'q'+subj+i+':'+it.q.slice(0,24),q:it.q,o:it.o.slice(),c:it.c}));
    return cache[subj]=manual.concat(tableItems(subj));
  }
  function shuffleOpts(it){ const order=shuffle([0,1,2,3]); return {id:it.id,q:it.q,o:order.map(i=>it.o[i]),c:order.indexOf(it.c)}; }

  // Returns `count` questions for `subj` the player has not seen (seen = Set of ids).
  function build(subj,count,seen){
    seen=seen||new Set();
    const out=[], used=new Set();
    const gens=GEN[subj]||[];
    let pool=shuffle(finitePool(subj).filter(q=>!seen.has(q.id)));
    let resetPool=false;
    // mix: subjects with generators use ~70% generated questions
    for(let k=0;k<count;k++){
      const wantGen = gens.length && (pool.length===0 || Math.random()<0.7);
      let q=null;
      if(wantGen){
        for(let tries=0;tries<60 && !q;tries++){ const it=pick(gens)(); if(it && !seen.has(it.id) && !used.has(it.id)) q=it; }
      }
      if(!q){
        if(!pool.length){ pool=shuffle(finitePool(subj).filter(x=>!used.has(x.id))); resetPool=true; } // every question seen -> start a new cycle
        q=pool.shift();
        if(q) q=shuffleOpts(q);
      }
      if(!q) break;
      used.add(q.id); out.push(q);
    }
    return {questions:out, resetPool};
  }
  function poolSize(subj){ return finitePool(subj).length + ((GEN[subj]||[]).length ? Infinity : 0); }
  return { build, poolSize, finitePool, GEN };
})();
