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

  /* =========================== GENERATORS ===========================
     Every generator takes a difficulty level L:
       0 = oson (Bronza, Kumush)   1 = o'rta (Oltin, Platina)
       2 = qiyin (Olmos, Smaragd)  3 = juda qiyin (Afsonaviy va yuqori)
     Higher levels use bigger numbers, more steps, and extra question types
     (g(fn, minLevel) — a type that only appears from that level up).      */
  const g=(fn,min)=>{ fn.min=min||0; return fn; };
  const lv=(L,arr)=>arr[Math.min(L,arr.length-1)];                 // value for this level
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const dec=x=>String(Math.round(x*100)/100).replace('.',',');
  const GEN={
    math:[
      g(L=>{ const [lo,hi]=lv(L,[[10,99],[100,999],[1000,9999],[10000,99999]]); const a=R(lo,hi),b=R(lo,hi); return item(`m+${a}+${b}`,`${a} + ${b} = ?`,a+b,near(a+b)); }),
      g(L=>{ const [lo,hi]=lv(L,[[20,99],[100,999],[1000,9999],[10000,99999]]); const a=R(lo,hi),b=R(Math.floor(lo/2),a-1); return item(`m-${a}-${b}`,`${a} − ${b} = ?`,a-b,near(a-b)); }),
      g(L=>{ const [a,b]=lv(L,[[R(2,9),R(2,9)],[R(11,99),R(2,9)],[R(11,99),R(11,99)],[R(101,999),R(11,99)]]); return item(`m*${a}*${b}`,`${a} × ${b} = ?`,a*b,near(a*b).concat([a*(b+1),a*(b-1)])); }),
      g(L=>{ const [b,q]=lv(L,[[R(2,9),R(2,10)],[R(2,12),R(10,60)],[R(11,25),R(10,99)],[R(12,50),R(50,500)]]); return item(`m/${b*q}/${b}`,`${b*q} ÷ ${b} = ?`,q,near(q)); }),
      g(L=>{
        if(L===0){ const x=R(1,30),b=R(1,40); return item(`meq1x${b}=${x+b}`,`x + ${b} = ${x+b}. x = ?`,x,near(x,4)); }
        if(L===1){ const a=R(2,9),x=R(1,20),b=R(1,30); return item(`meq${a}x${b}=${a*x+b}`,`${a}x + ${b} = ${a*x+b}. x = ?`,x,near(x,4)); }
        if(L===2){ const a=R(4,12),c=R(1,a-1),x=R(1,20),b=R(1,30),d=(a-c)*x+b; return item(`meq${a}x${b}=${c}x${d}`,`${a}x + ${b} = ${c}x + ${d}. x = ?`,x,near(x,4)); }
        const a=R(2,9),b=R(1,15),x=R(b+1,b+25); return item(`meqp${a}(x-${b})=${a*(x-b)}`,`${a}(x − ${b}) = ${a*(x-b)}. x = ?`,x,near(x,4).concat([x-b,x-2*b]));
      }),
      g(L=>{
        if(L<=1){ const p=lv(L,[pick([10,25,50]),pick([20,30,40,75])]),n=pick([40,60,80,120,200,240,300,400,500,800]); return item(`m%${p}of${n}`,`${n} ning ${p}% i nechaga teng?`,n*p/100,near(n*p/100).concat([n*p/10,p])); }
        const p=R(1,19)*5,n=R(2,40)*20;
        if(L===2) return item(`m%${p}of${n}`,`${n} ning ${p}% i nechaga teng?`,n*p/100,near(n*p/100).concat([n*p/10,p]));
        return item(`m%up${p}of${n}`,`${n} sonini ${p}% ga oshirsak, nechaga teng bo'ladi?`,n+n*p/100,[n*p/100,n-n*p/100,n+p].concat(near(n+n*p/100)));
      }),
      g(L=>{ const n=R(...lv(L,[[2,12],[11,20],[21,40],[41,99]])); return item(`msq${n}`,`${n}² = ?`,n*n,near(n*n).concat([n*2,n*n+n])); }),
      g(L=>{ const n=R(...lv(L,[[2,10],[11,20],[21,40],[41,99]])); return item(`msqrt${n*n}`,`√${n*n} = ?`,n,near(n,4)); }),
      g(L=>{
        if(L===0){ const a=R(2,20),b=R(2,9),c=R(2,9); return item(`mord${a}+${b}x${c}`,`${a} + ${b} × ${c} = ?`,a+b*c,[(a+b)*c].concat(near(a+b*c))); }
        if(L===1){ const a=R(2,20),b=R(2,20),c=R(2,9),d=R(1,20); return item(`mord(${a}+${b})x${c}-${d}`,`(${a} + ${b}) × ${c} − ${d} = ?`,(a+b)*c-d,[a+b*c-d,(a+b)*(c-d)].concat(near((a+b)*c-d))); }
        if(L===2){ const a=R(2,15),b=R(2,15),c=R(2,12),d=R(2,12); return item(`mord${a}x${b}-${c}x${d}`,`${a} × ${b} − ${c} × ${d} = ?`,a*b-c*d,[(a*b-c)*d].concat(near(a*b-c*d))); }
        const e=R(2,9),q=R(2,12),a=R(2,12),b=R(2,15),c=R(2,15); return item(`mord${a}(${b}+${c})-${e*q}/${e}`,`${a} × (${b} + ${c}) − ${e*q} ÷ ${e} = ?`,a*(b+c)-q,[a*b+c-q,a*(b+c-q)].concat(near(a*(b+c)-q)));
      }),
      g(L=>{ const [a,b]=lv(L,[[R(2,5),R(2,3)],[R(2,9),R(2,3)],[R(2,6),R(4,5)],[R(2,3),R(6,10)]]); return item(`mpow${a}^${b}`,`${a}^${b} (${a} ning ${b}-darajasi) = ?`,Math.pow(a,b),[a*b,Math.pow(a,b-1),Math.pow(a,b)+a,Math.pow(b,a)].concat(near(Math.pow(a,b)))); }),
      g(L=>{
        if(L<=1){ const gg=R(2,lv(L,[5,9])),a=R(1,9),b=R(a+1,12); if(gcd(a,b)!==1) return null; return item(`mfrac${a*gg}/${b*gg}`,`${a*gg}/${b*gg} kasrni qisqartiring`,`${a}/${b}`,[`${a+1}/${b}`,`${a}/${b+1}`,`${b}/${a}`,`${a*2}/${b}`]); }
        const b=R(3,12),d=L===2?b:R(3,12),a=R(1,b-1),c=R(1,d-1),num=a*d+c*b,den=b*d,k=gcd(num,den),N=num/k,Dd=den/k;
        const ans=Dd===1?String(N):`${N}/${Dd}`;
        return item(`mfadd${a}/${b}+${c}/${d}`,`${a}/${b} + ${c}/${d} = ? (qisqargan holda)`,ans,[`${a+c}/${b+d}`,`${a+c}/${den/k}`,`${N+1}/${Dd}`,`${N}/${Dd+1}`,`${a*c}/${den}`]);
      }),
      g(L=>{
        if(L===3){ const x=R(100,9999)/100, r=Math.round(x*10)/10; return item(`mrndd${x}`,`${dec(x)} sonini o'ndan birlargacha yaxlitlang`,dec(r),[dec(r+0.1),dec(r-0.1),dec(Math.round(x)),dec(Math.floor(x*10)/10===r?r+0.2:Math.floor(x*10)/10)]); }
        const [lo,hi,u,un]=lv(L,[[100,999,10,"o'nlar"],[1000,9999,100,'yuzlar'],[10000,99999,1000,'minglar']]); const a=R(lo,hi),r=Math.round(a/u)*u;
        return item(`mround${a}-${u}`,`${a} sonini ${un}gacha yaxlitlang`,r,[r+u,r-u,Math.round(a/(u*10))*u*10,a]);
      }),
      g(L=>{ const b=R(3,lv(L,[9,9,15,25])),a=R(b+1,lv(L,[50,50,200,999])); return item(`mmod${a}%${b}`,`${a} ni ${b} ga bo'lgandagi qoldiq nechaga teng?`,a%b,[Math.floor(a/b)].concat(near(a%b,3)).filter(v=>v<b||v===Math.floor(a/b))); },1),
      g(L=>{ const n=lv(L,[3,3,4,5]),xs=Array.from({length:n},()=>R(2,L>=3?99:40)); const s=xs.reduce((p,c)=>p+c,0); const m=Math.round(s/n); const ys=xs.slice(0,n-1).concat([m*n-(s-xs[n-1])]); if(ys[n-1]<1) return null;
        return item(`mavg${ys.join(',')}`,`${ys.join(', ')} sonlarining o'rta arifmetigi?`,m,near(m,5).concat([m*n])); },1),
      g(L=>{ const k=R(2,lv(L,[9,9,12,25])),a=k*R(2,9),b=k*R(2,9); if(a===b) return null; return item(`mgcd${a},${b}`,`${a} va ${b} sonlarining EKUB i (eng katta umumiy bo'luvchisi)?`,gcd(a,b),[k,a*b/gcd(a,b),gcd(a,b)*2,Math.abs(a-b)].filter(v=>v!==gcd(a,b)||false).concat(near(gcd(a,b),3))); },2),
      g(L=>{ const a=R(2,lv(L,[12,12,15,30])),b=R(2,lv(L,[12,12,15,30])); if(a===b) return null; const l=a*b/gcd(a,b); return item(`mlcm${a},${b}`,`${a} va ${b} sonlarining EKUK i (eng kichik umumiy karralisi)?`,l,[a*b===l?l*2:a*b,gcd(a,b),a+b].concat(near(l))); },2),
      g(L=>{ const a=R(10,200),b=R(10,200),c=R(1,99); return item(`mneg-${a}+${b}-${c}`,`−${a} + ${b} − ${c} = ?`,-a+b-c,[a+b-c,-a-b-c,-a+b+c,a-b+c]); },3),
    ],
    geom:[
      g(L=>{ const m=lv(L,[12,25,60,150]),a=R(2,m),b=R(2,m); return item(`grectS${a}x${b}`,`Tomonlari ${a} sm va ${b} sm bo'lgan to'g'ri to'rtburchakning yuzi?`,a*b,[2*(a+b),a+b,a*b+a].concat(near(a*b)),' sm²'); }),
      g(L=>{ const m=lv(L,[15,25,80,250]),a=R(2,m),b=R(2,m); return item(`grectP${a}x${b}`,`Tomonlari ${a} sm va ${b} sm bo'lgan to'g'ri to'rtburchakning perimetri?`,2*(a+b),[a*b,a+b,4*a].concat(near(2*(a+b))),' sm'); }),
      g(L=>{ const a=R(2,lv(L,[12,30,60,99])); return item(`gsqS${a}`,`Tomoni ${a} sm bo'lgan kvadratning yuzi?`,a*a,[4*a,2*a].concat(near(a*a)),' sm²'); }),
      g(L=>{ const a=R(2,lv(L,[20,40,99])); if(L>=2){ return item(`gsqPS${4*a}`,`Perimetri ${4*a} sm bo'lgan kvadratning yuzi?`,a*a,[4*a*4*a,2*a*a,a].concat(near(a*a)),' sm²'); } return item(`gsqP${a}`,`Tomoni ${a} sm bo'lgan kvadratning perimetri?`,4*a,[a*a,2*a].concat(near(4*a)),' sm'); }),
      g(L=>{ const x=R(20,100),y=R(20,160-x); return item(`gtri${x}-${y}`,`Uchburchakning ikki burchagi ${x}° va ${y}°. Uchinchi burchagi necha gradus?`,180-x-y,[360-x-y,x+y].concat(near(180-x-y,15)),'°'); }),
      g(L=>{ const t=pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25],[20,21,29],[9,40,41]]),k=R(1,lv(L,[2,4,6,9])); return item(`ghyp${t[0]*k}-${t[1]*k}`,`To'g'ri burchakli uchburchakning katetlari ${t[0]*k} va ${t[1]*k}. Gipotenuza?`,t[2]*k,[(t[0]+t[1])*k,t[2]*k+k,t[2]*k-k,t[1]*k+1]); },1),
      g(L=>{ const n=R(3,lv(L,[6,12,20,30])); return item(`gpoly${n}`,`${n} burchakli qavariq ko'pburchak ichki burchaklari yig'indisi?`,(n-2)*180,[n*180,(n-1)*180,(n-3)*180,n*90].filter(v=>v>0),'°'); },1),
      g(L=>{ const a=R(2,lv(L,[5,12,20,30])); return item(`gcube${a}`,`Qirrasi ${a} sm bo'lgan kubning hajmi?`,a*a*a,[a*a*6,a*a,12*a].concat(near(a*a*a)),' sm³'); }),
      g(L=>{ const m=lv(L,[8,15,25,40]),a=R(2,m),b=R(2,m),c=R(2,m); return item(`gbox${a}-${b}-${c}`,`O'lchamlari ${a}×${b}×${c} sm bo'lgan to'g'ri burchakli parallelepiped hajmi?`,a*b*c,[a*b+c,2*(a*b+b*c+a*c),a+b+c].concat(near(a*b*c)),' sm³'); },1),
      g(L=>{ const r=R(1,lv(L,[10,10,20,50])); return item(`gcircC${r}`,`Radiusi ${r} sm bo'lgan aylana uzunligi (π ≈ 3,14)?`,dec(2*3.14*r),[dec(3.14*r),dec(3.14*r*r),dec(2*3.14*r+3.14),dec(4*3.14*r)],' sm'); },1),
      g(L=>{ const r=R(1,lv(L,[10,10,15,30])); return item(`gcircS${r}`,`Radiusi ${r} sm bo'lgan doiraning yuzi (π ≈ 3,14)?`,dec(3.14*r*r),[dec(2*3.14*r),dec(3.14*r*2*r*2),dec(3.14*r*r+3.14),dec(6.28*r*r)],' sm²'); },2),
      g(L=>{ const m=lv(L,[10,20,40,80]),a=R(1,m)*2,h=R(2,m); return item(`gtriS${a}-${h}`,`Asosi ${a} sm, balandligi ${h} sm bo'lgan uchburchak yuzi?`,a*h/2,[a*h,a+h,a*h/4].concat(near(a*h/2)),' sm²'); }),
      g(L=>{ const x=R(10,170); return item(`gadj${x}`,`Qo'shni burchaklardan biri ${x}°. Ikkinchisi necha gradus?`,180-x,[90-x>0?90-x:x+5,360-x,x].concat(near(180-x,10)),'°'); }),
      g(L=>{ const a=R(2,lv(L,[0,0,20,40])),b=R(a+1,a+30),h=R(2,30)*2; return item(`gtrap${a}-${b}-${h}`,`Trapetsiyaning asoslari ${a} sm va ${b} sm, balandligi ${h} sm. Yuzi?`,(a+b)*h/2,[(a+b)*h,a*b*h/2,(b-a)*h/2].concat(near((a+b)*h/2)),' sm²'); },2),
      g(L=>{ const d1=R(2,30)*2,d2=R(2,30); return item(`grhomb${d1}-${d2}`,`Rombning diagonallari ${d1} sm va ${d2} sm. Yuzi?`,d1*d2/2,[d1*d2,d1+d2,2*(d1+d2)].concat(near(d1*d2/2)),' sm²'); },2),
      g(L=>{ const n=pick([5,6,8,9,10,12,15,18,20]); return item(`gregint${n}`,`Muntazam ${n} burchakli ko'pburchakning bitta ichki burchagi necha gradus?`,(n-2)*180/n,[360/n,(n-2)*180,180-(n-2)*180/n+10,(n-1)*180/n].map(v=>Math.round(v)),'°'); },3),
      g(L=>{ const r=R(1,10),h=R(2,20); return item(`gcyl${r}-${h}`,`Radiusi ${r} sm, balandligi ${h} sm silindr hajmi (π ≈ 3,14)?`,dec(3.14*r*r*h),[dec(2*3.14*r*h),dec(3.14*r*h),dec(3.14*r*r*h/3),dec(3.14*r*r*h*2)],' sm³'); },3),
      g(L=>{ const x=R(20,80),y=R(20,80); return item(`gext${x}-${y}`,`Uchburchakning ikki ichki burchagi ${x}° va ${y}°. Uchinchi burchakka qo'shni tashqi burchak necha gradus?`,x+y,[180-x-y,180-x,360-x-y].concat(near(x+y,10)),'°'); },2),
    ],
    phys:[
      g(L=>{ const v=R(2,lv(L,[20,30,60,120])),t=R(2,lv(L,[10,20,60,120])); return item(`ps${v}-${t}`,`Jism ${v} m/s tezlik bilan ${t} s harakatlandi. Bosib o'tgan yo'li?`,v*t,[v+t,v*t+v].concat(near(v*t)),' m'); }),
      g(L=>{ const v=R(2,30),t=R(2,lv(L,[10,20,40,90])); return item(`pv${v*t}-${t}`,`Jism ${v*t} m yo'lni ${t} s da bosib o'tdi. Tezligi?`,v,[v*t*t,v+t].concat(near(v,5)),' m/s'); }),
      g(L=>{ const m=R(1,lv(L,[20,50,200,900])),a=R(1,lv(L,[5,10,20,30])); return item(`pF${m}-${a}`,`Massasi ${m} kg jismga ${a} m/s² tezlanish berish uchun qancha kuch kerak?`,m*a,[m+a].concat(near(m*a)),' N'); }),
      g(L=>{ const m=R(1,lv(L,[50,90,500])); return item(`pP${m}`,`Massasi ${m} kg bo'lgan jismning og'irligi (g = 10 m/s²)?`,m*10,[m,m*100,m+10].concat(near(m*10)),' N'); }),
      g(L=>{ const r=R(2,lv(L,[20,50,200,500])),i=R(1,lv(L,[5,10,20,40])); return item(`pU${r}-${i}`,`Qarshiligi ${r} Ω o'tkazgichdan ${i} A tok o'tmoqda. Kuchlanish?`,r*i,[r+i].concat(near(r*i)),' V'); },1),
      g(L=>{ const r=R(2,30),i=R(1,lv(L,[10,10,20,40])); return item(`pI${r*i}-${r}`,`${r*i} V kuchlanishda ${r} Ω qarshilikdan qancha tok o'tadi?`,i,[r*i*r,r].concat(near(i,4)),' A'); },1),
      g(L=>{ const F=R(2,lv(L,[50,100,500,2000])),s=R(2,lv(L,[20,50,100,300])); return item(`pA${F}-${s}`,`${F} N kuch jismni ${s} m ga ko'chirdi. Bajarilgan ish?`,F*s,[F+s].concat(near(F*s)),' J'); },1),
      g(L=>{ const t=R(2,lv(L,[10,20,60])),N=R(5,lv(L,[50,100,500])); return item(`pN${N*t}-${t}`,`${t} s da ${N*t} J ish bajarildi. Quvvat?`,N,[N*t*t,N+t].concat(near(N,8)),' W'); },1),
      g(L=>{ const V=R(2,20),rho=pick([1000,800,2700,7800,11300,900]); return item(`prho${rho*V}-${V}`,`Hajmi ${V} m³, massasi ${rho*V} kg bo'lgan moddaning zichligi?`,rho,[rho/10,rho*V*V,rho+V].concat(near(rho)),' kg/m³'); },1),
      g(L=>{ const k=R(1,lv(L,[5,10,30,60]))*18; return item(`pkmh${k}`,`${k} km/soat necha m/s ga teng?`,k/3.6,[k*3.6,k/36,k/10,k/3.6+5].map(x=>Math.round(x*10)/10),' m/s'); }),
      g(L=>{ const m=R(1,lv(L,[10,20,50,200])),v=R(1,10)*2; return item(`pEk${m}-${v}`,`Massasi ${m} kg jism ${v} m/s tezlikda. Kinetik energiya (mv²/2)?`,m*v*v/2,[m*v,m*v*v,m*v/2].concat(near(m*v*v/2)),' J'); },2),
      g(L=>{ const m=R(1,lv(L,[10,10,50,200])),h=R(2,lv(L,[10,10,50,200])); return item(`pEp${m}-${h}`,`Massasi ${m} kg jism ${h} m balandlikda. Potensial energiyasi (g = 10 m/s²)?`,m*10*h,[m*h,m*10+h,m*h/2].concat(near(m*10*h)),' J'); },1),
      g(L=>{ const t=R(1,lv(L,[0,0,6,12])); return item(`pfall${t}`,`Jism ${t} s erkin tushdi (g = 10 m/s², boshlang'ich tezlik 0). Qancha balandlikdan tushgan?`,5*t*t,[10*t,10*t*t,5*t].concat(near(5*t*t)),' m'); },2),
      g(L=>{ const S=pick([1,2,4,5,10]),p=R(2,lv(L,[0,0,50,500]))*10; return item(`ppres${p*S}-${S}`,`${p*S} N kuch ${S} m² yuzaga ta'sir qilmoqda. Bosim?`,p,[p*S*S,p*S,p+S].concat(near(p)),' Pa'); },2),
      g(L=>{ const a=R(2,60),b=R(2,60); return item(`pser${a}-${b}`,`${a} Ω va ${b} Ω rezistorlar ketma-ket ulangan. Umumiy qarshilik?`,a+b,[a*b,Math.abs(a-b),Math.round(a*b/(a+b))].concat(near(a+b)),' Ω'); },2),
      g(L=>{ const r=R(1,50)*2,n=pick([2,4,5]); return item(`ppar${r}-${n}`,`Har biri ${r*n} Ω bo'lgan ${n} ta bir xil rezistor parallel ulangan. Umumiy qarshilik?`,r,[r*n*n,r*n,r*2].concat(near(r)),' Ω'); },3),
      g(L=>{ const m=R(1,10),dt=R(2,40); return item(`pheat${m}-${dt}`,`${m} kg suvni ${dt} °C ga isitish uchun qancha issiqlik kerak (c = 4200 J/(kg·°C))?`,4200*m*dt,[4200*m,4200*dt,420*m*dt,42000*m*dt],' J'); },3),
    ],
    cs:[
      g(L=>{ const k=R(1,lv(L,[16,64,512])); return item(`cbyte${k}`,`${k} bayt necha bitga teng?`,k*8,[k*10,k*4,k*16,k*8+8],' bit'); }),
      g(L=>{ const k=pick([1,2,3,4,5,8,10,16]); return item(`ckb${k}`,`${k} KB necha baytga teng?`,k*1024,[k*1000,k*512,k*2048,k*100],' bayt'); }),
      g(L=>{ const k=pick([1,2,4,8,16,32]); return item(`cmb${k}`,`${k} GB necha MB ga teng?`,k*1024,[k*1000,k*512,k*100,k*2048],' MB'); }),
      g(L=>{ const n=R(2,lv(L,[15,31,255,1023])); return item(`cbin${n}`,`${n} sonining ikkilik sanoq tizimidagi ko'rinishi?`,n.toString(2),[(n+1).toString(2),(n-1).toString(2),(n^1).toString(2),(n+2).toString(2),(n<<1).toString(2)]); },1),
      g(L=>{ const n=R(2,lv(L,[15,31,127,1023])); return item(`cdec${n}`,`Ikkilik ${n.toString(2)} sonini o'nlik sanoq tizimiga o'tkazing`,n,near(n,6).concat([parseInt(n.toString(2),10)%1000])); },1),
      g(L=>{ const n=R(1,lv(L,[4,8,10,16])); return item(`cbits${n}`,`${n} bit yordamida nechta turli qiymatni ifodalash mumkin?`,Math.pow(2,n),[n*2,n*n,Math.pow(2,n)-1,Math.pow(2,n+1)]); }),
      g(L=>{ const n=R(10,lv(L,[0,0,255,4095])); return item(`chex${n}`,`${n} sonining o'n oltilik (hex) ko'rinishi?`,n.toString(16).toUpperCase(),[(n+1).toString(16).toUpperCase(),(n+16).toString(16).toUpperCase(),(n-1).toString(16).toUpperCase(),n.toString(8)]); },2),
      g(L=>{ const a=R(3,63),b=R(3,63); return item(`cbadd${a}+${b}`,`Ikkilik sanoq tizimida: ${a.toString(2)} + ${b.toString(2)} = ?`,(a+b).toString(2),[(a+b+1).toString(2),(a+b-1).toString(2),(a^b).toString(2),(a|b).toString(2),(a+b+2).toString(2)]); },3),
      g(L=>{ const N=R(3,2000),bits=Math.ceil(Math.log2(N)); return item(`cneed${N}`,`${N} ta turli belgini kodlash uchun kamida necha bit kerak?`,bits,[bits+1,bits-1,bits+2,Math.ceil(N/8)].filter(v=>v>0),' bit'); },3),
      g(L=>{ const x=R(8,511); return item(`coct${x}`,`${x} sonining sakkizlik sanoq tizimidagi ko'rinishi?`,x.toString(8),[(x+1).toString(8),x.toString(16),(x-1).toString(8),(x+8).toString(8)]); },2),
    ],
    logic:[
      g(L=>{ const a=R(1,lv(L,[20,30,99,999])),d=L>=2?pick([-1,1])*R(3,lv(L,[0,0,25,99])):R(2,lv(L,[5,15])); const s=[0,1,2,3,4].map(i=>a+i*d); return item(`lar${a}-${d}`,`${s.join(', ')}, ? Keyingi son?`,a+5*d,near(a+5*d,Math.abs(d)).concat([a+4*d+1,a+6*d])); }),
      g(L=>{ const a=R(1,5),r=R(2,lv(L,[3,4,5,6])); const s=[0,1,2,3].map(i=>a*Math.pow(r,i)); return item(`lgeo${a}-${r}`,`${s.join(', ')}, ? Keyingi son?`,a*Math.pow(r,4),[a*Math.pow(r,3)*2+1,a*Math.pow(r,3)+r,a*Math.pow(r,4)+a,a*Math.pow(r,3)*(r+1)]); },1),
      g(L=>{ const k=R(1,lv(L,[8,8,15,30])); const s=[0,1,2,3].map(i=>(k+i)*(k+i)); return item(`lsq${k}`,`${s.join(', ')}, ? Keyingi son?`,(k+4)*(k+4),near((k+4)*(k+4),8)); },1),
      g(L=>{ const days=["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"]; const d=R(0,6),n=R(...lv(L,[[2,6],[8,60],[60,400],[400,3000]])); return item(`lday${d}-${n}`,`Bugun ${days[d].toLowerCase()}. ${n} kundan keyin haftaning qaysi kuni bo'ladi?`,days[(d+n)%7],others(days,days[(d+n)%7])); }),
      g(L=>{ const h=R(1,11),m=L>=3?pick([30,20,40,10,50]):0; let a=Math.abs(30*h-5.5*m); a=Math.min(a,360-a); const tt=`${h}:${String(m).padStart(2,'0')}`;
        return item(`lclock${tt}`,`Soat roppa-rosa ${tt} da soat va minut millari orasidagi kichik burchak?`,a,[360-a===a?a+30:360-a,a+30,Math.abs(a-30)||45,a+15,90].filter(v=>v!==a),'°'); },1),
      g(L=>{ const m=pick([3,4,5,6,7,9]); const base=R(1,9); const good=[0,1,2,3].map(i=>m*(base+i*R(1,2))); const bad=m*R(2,20)+R(1,m-1); return item(`lodd${m}-${good.join('.')}-${bad}`,`Qaysi son ortiqcha: ${shuffle(good.concat([bad])).join(', ')}?`,bad,good); },1),
      g(L=>{ const a=R(5,15),d=R(2,8),y=lv(L,[5,5,7,12]); return item(`lage${a}-${d}-${y}`,`Ali ${a} yoshda, akasi undan ${d} yosh katta. ${y} yildan keyin akasi necha yoshda bo'ladi?`,a+d+y,[a+d,a+y,a+d+y+5,a+d+y-1]); }),
      g(L=>{ const n=R(3,lv(L,[6,12,25,60])); return item(`lhand${n}`,`${n} kishi bir-biri bilan bir martadan qo'l berib ko'rishdi. Jami nechta qo'l berish bo'ldi?`,n*(n-1)/2,[n*(n-1),n*n,n*2,n*(n-1)/2+n]); },1),
      g(L=>{ const a=R(2,lv(L,[9,9,20,50])),b=R(2,lv(L,[9,9,20,50])); const s=[a,b,a+b,a+2*b]; return item(`lfib${a}-${b}`,`${s.join(', ')}, ? (har son oldingi ikkitasining yig'indisi)`,2*a+3*b,near(2*a+3*b,5)); },2),
      g(L=>{ const a=R(2,9),k=R(1,9); const s=[a,2*a,2*a+k,4*a+2*k,4*a+3*k]; return item(`lalt${a}-${k}`,`${s.join(', ')}, ? Keyingi son?`,8*a+6*k,[4*a+4*k,8*a+3*k,8*a+7*k,8*a+4*k]); },3),
      g(L=>{ const w=R(2,9),d=R(2,6),k=R(2,6); return item(`lwork${w}-${d}-${k}`,`${w} ta ishchi bir ishni ${d*k} kunda tugatadi. ${w*k} ta ishchi shu ishni necha kunda tugatadi?`,d,[d*k*k,d+k,d*k,Math.max(1,d-1)]); },3),
      g(L=>{ const n=R(4,lv(L,[0,0,8,12])); const f=[1,1,2,6,24,120,720,5040,40320,362880,3628800,39916800,479001600][n]; return item(`lperm${n}`,`${n} ta turli kitobni javonga necha xil usulda qatorlab terish mumkin?`,f,[n*n,n*(n-1),f/n,2*f]); },2),
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

  // Harder hand-checked questions: [question, correct, [3 wrong], difficulty 1..3]
  const HARD={
    onatili:[
      ["O'zbek tilida nechta kelishik bor?","6 ta",["5 ta","7 ta","8 ta"],2],
      ["Qaratqich kelishigining qo'shimchasi qaysi?","-ning",["-ni","-ga","-dan"],2],
      ["Tushum kelishigining qo'shimchasi qaysi?","-ni",["-ning","-da","-ga"],2],
      ["Chiqish kelishigining qo'shimchasi qaysi?","-dan",["-da","-ga","-ning"],2],
      ["O'rin-payt kelishigining qo'shimchasi qaysi?","-da",["-dan","-ni","-ga"],2],
      ["Jo'nalish kelishigining qo'shimchasi qaysi?","-ga",["-da","-ni","-dan"],2],
      ["Gapning bosh bo'laklari qaysilar?","Ega va kesim",["To'ldiruvchi va hol","Aniqlovchi va hol","Ega va to'ldiruvchi"],1],
      ["Gapning ikkinchi darajali bo'laklari qaysilar?","To'ldiruvchi, aniqlovchi, hol",["Ega va kesim","Ega, kesim, hol","Undalma va kirish so'z"],2],
      ["\"Men kitobni o'qidim\" gapida \"kitobni\" qaysi gap bo'lagi?","To'ldiruvchi",["Ega","Kesim","Hol"],2],
      ["\"Ishchi\" so'zidagi \"-chi\" qanday qo'shimcha?","So'z yasovchi",["Kelishik qo'shimchasi","Ko'plik qo'shimchasi","Egalik qo'shimchasi"],3],
      ["\"Kitoblar\" so'zidagi \"-lar\" qanday qo'shimcha?","Ko'plik qo'shimchasi",["So'z yasovchi","Kelishik qo'shimchasi","Egalik qo'shimchasi"],1],
      ["O'zbek tilida nechta unli tovush bor?","6 ta",["5 ta","8 ta","10 ta"],2],
      ["Qo'shma gap turlari qaysilar?","Bog'langan, ergashgan, bog'lovchisiz",["Sodda va murakkab","Darak, so'roq, buyruq","Yoyiq va yig'iq"],3],
      ["Maqsadiga ko'ra gap turlari qaysilar?","Darak, so'roq, buyruq",["Sodda va qo'shma","Yoyiq va yig'iq","Bog'langan va ergashgan"],2],
      ["Bir xil yoziladigan, lekin ma'nosi boshqa-boshqa so'zlar qanday ataladi?","Omonimlar",["Sinonimlar","Antonimlar","Paronimlar"],2],
    ],
    adabiyot:[
      ["\"Xamsa\" nechta dostondan iborat?","5 ta",["3 ta","4 ta","7 ta"],1],
      ["Qaysi doston \"Xamsa\"ga kirmaydi?","Lison ut-tayr",["Hayrat ul-abror","Farhod va Shirin","Layli va Majnun"],3],
      ["Alisher Navoiy forsiy she'rlarini qaysi taxallus bilan yozgan?","Foniy",["Navoiy","Nodira","Zebunniso"],2],
      ["Alisher Navoiy qaysi shaharda tug'ilgan?","Hirot",["Samarqand","Buxoro","Andijon"],1],
      ["\"O'tkan kunlar\" romanining bosh qahramoni kim?","Otabek",["Anvar","Yo'lchi","Mirzo Ulug'bek"],1],
      ["Cho'lponning asl ismi nima?","Abdulhamid Sulaymon o'g'li",["Abdulla Qodiriy","Muso Toshmuhammad o'g'li","Abdulla Avloniy"],3],
      ["Oybekning asl ismi nima?","Muso Toshmuhammad o'g'li",["Abdulhamid Sulaymon o'g'li","Hamid Olimjon","G'afur G'ulom"],3],
      ["\"Shum bola\" asarining janri?","Qissa",["Roman","Doston","G'azal"],2],
      ["Ruboiy necha misradan iborat?","4 ta",["2 ta","6 ta","8 ta"],2],
      ["G'azalning birinchi bayti qanday ataladi?","Matla'",["Maqta'","Radif","Qofiya"],3],
      ["G'azalning so'nggi bayti qanday ataladi?","Maqta'",["Matla'","Radif","Tuyuq"],3],
      ["\"Ruhlar isyoni\" dostoni muallifi?","Erkin Vohidov",["Abdulla Oripov","Hamid Olimjon","Muhammad Yusuf"],2],
      ["\"Yulduzli tunlar\" romani kim haqida?","Zahiriddin Muhammad Bobur",["Amir Temur","Alisher Navoiy","Mirzo Ulug'bek"],2],
      ["Mahmudxo'ja Behbudiyning mashhur dramasi?","Padarkush",["Boy ila xizmatchi","Mehrobdan chayon","Kecha va kunduz"],3],
      ["\"Kecha va kunduz\" romani muallifi?","Cho'lpon",["Oybek","Abdulla Qodiriy","Abdulla Qahhor"],1],
    ],
    hist:[
      ["Muhammad Shayboniyxon qaysi sulolaga asos solgan?","Shayboniylar",["Temuriylar","Ashtarxoniylar","Mang'itlar"],2],
      ["Buxoro amirligida hukmronlik qilgan sulola?","Mang'itlar",["Minglar","Qo'ng'irotlar","Temuriylar"],3],
      ["Xiva xonligidagi so'nggi hukmron sulola?","Qo'ng'irotlar",["Mang'itlar","Minglar","Shayboniylar"],3],
      ["Qo'qon xonligida hukmronlik qilgan sulola?","Minglar",["Mang'itlar","Qo'ng'irotlar","Ashtarxoniylar"],3],
      ["Qo'qon xonligi Rossiya imperiyasi tomonidan qaysi yili tugatilgan?","1876",["1865","1868","1920"],3],
      ["Somoniylar davlatining poytaxti qaysi shahar bo'lgan?","Buxoro",["Samarqand","Marv","Urganch"],2],
      ["Mirzo Ulug'bekning mashhur astronomik asari?","Ziji jadidi Ko'ragoniy",["Tib qonunlari","Boburnoma","Qutadg'u bilig"],3],
      ["Registondagi Ulug'bek madrasasi qachon qurilgan?","1417–1420-yillarda",["1370–1375-yillarda","1500–1505-yillarda","1619–1636-yillarda"],3],
      ["Jadidchilik harakatining yetakchilaridan biri kim?","Mahmudxo'ja Behbudiy",["Amir Temur","Shayboniyxon","Alisher Navoiy"],2],
      ["Turkiston muxtoriyati qaysi yili e'lon qilingan?","1917",["1905","1924","1991"],3],
      ["Amir Temur qaysi yili hokimiyatni qo'lga olib, Samarqandni poytaxt qilgan?","1370",["1336","1405","1395"],3],
      ["Temuriylar davrida Movarounnahrni uzoq yillar boshqargan olim-hukmdor?","Mirzo Ulug'bek",["Husayn Boyqaro","Bobur","Shohruh"],2],
    ],
    worldhist:[
      ["\"Buyuk erkinliklar xartiyasi\" (Magna Carta) qaysi davlatda qabul qilingan?","Angliya",["Fransiya","Ispaniya","Germaniya"],3],
      ["Yuz yillik urush qaysi davlatlar o'rtasida bo'lgan?","Angliya va Fransiya",["Rossiya va Turkiya","Ispaniya va Portugaliya","Germaniya va Avstriya"],2],
      ["Uyg'onish davri (Renessans) qaysi mamlakatda boshlangan?","Italiya",["Angliya","Fransiya","Gretsiya"],2],
      ["Kitob bosish dastgohini Yevropada kim ixtiro qilgan?","Iogann Gutenberg",["Leonardo da Vinchi","Galileo Galiley","Isaak Nyuton"],2],
      ["Martin Lyuter boshlagan diniy harakat qanday ataladi?","Reformatsiya",["Renessans","Salib yurishlari","Inkvizitsiya"],3],
      ["Pyotr I asos solgan shahar?","Sankt-Peterburg",["Moskva","Kiyev","Novgorod"],2],
      ["Birinchi jahon urushiga bahona bo'lgan voqea qaysi shaharda yuz bergan?","Sarayevo",["Berlin","Vena","Parij"],3],
      ["Meyji islohotlari qaysi davlatda o'tkazilgan?","Yaponiya",["Xitoy","Koreya","Hindiston"],3],
      ["\"Sovuq urush\" asosan qaysi davlatlar o'rtasidagi qarama-qarshilik edi?","AQSH va SSSR",["Angliya va Fransiya","Xitoy va Yaponiya","Germaniya va Italiya"],2],
      ["Rim imperiyasining birinchi imperatori kim?","Oktavian Avgust",["Yuliy Sezar","Neron","Konstantin"],3],
      ["Qadimgi Bobil podshohi Hammurapi nima bilan mashhur?","Qonunlar to'plami bilan",["Piramidalar qurdirgani bilan","Olimpiya o'yinlarini boshlagani bilan","Ipak yo'lini ochgani bilan"],3],
      ["Yevropa Ittifoqining asosiy valyutasi?","Yevro",["Dollar","Funt sterling","Frank"],1],
    ],
    geo:[
      ["Dunyodagi eng baland cho'qqi?","Everest (Jomolungma)",["Elbrus","Kilimanjaro","Monblan"],1],
      ["O'zbekistondagi eng baland nuqta?","Hazrati Sulton cho'qqisi",["Chimyon","Katta Chimyon","Beshtor"],3],
      ["Eng katta okean?","Tinch okeani",["Atlantika okeani","Hind okeani","Shimoliy Muz okeani"],1],
      ["Eng katta qit'a (materik)?","Yevrosiyo",["Afrika","Shimoliy Amerika","Antarktida"],1],
      ["Orol dengiziga quyiladigan ikki daryo?","Amudaryo va Sirdaryo",["Zarafshon va Chirchiq","Volga va Ural","Ili va Chu"],2],
      ["O'zbekiston nechta davlat bilan chegaradosh?","5 ta",["3 ta","4 ta","6 ta"],2],
      ["Dengizga chiqish uchun kamida ikki davlatni kesib o'tish kerak bo'lgan davlatlar: O'zbekiston va ...?","Lixtenshteyn",["Shveytsariya","Mongoliya","Qozog'iston"],3],
      ["Qizilqum cho'li qaysi daryolar oralig'ida joylashgan?","Amudaryo va Sirdaryo",["Zarafshon va Qashqadaryo","Chirchiq va Ohangaron","Sirdaryo va Chu"],3],
      ["Dunyodagi eng katta issiq cho'l?","Sahroi Kabir",["Qizilqum","Gobi","Atakama"],2],
      ["Dunyodagi eng chuqur ko'l?","Baykal",["Kaspiy","Issiqko'l","Viktoriya"],2],
      ["Ekvator qaysi materikni kesib o'tmaydi?","Avstraliya",["Afrika","Janubiy Amerika","Osiyo (orollar)"],3],
      ["Farg'ona vodiysidan qaysi yirik daryo oqib o'tadi?","Sirdaryo",["Amudaryo","Zarafshon","Qashqadaryo"],2],
      ["Hozir aholisi eng ko'p davlat (2023-yildan beri)?","Hindiston",["Xitoy","AQSH","Indoneziya"],2],
    ],
    chem:[
      ["Suvning molyar massasi?","18 g/mol",["16 g/mol","20 g/mol","10 g/mol"],2],
      ["pH = 7 bo'lgan muhit qanday?","Neytral",["Kislotali","Ishqoriy","Kuchli kislotali"],2],
      ["Kislotalar lakmusni qanday rangga bo'yaydi?","Qizil",["Ko'k","Yashil","Rangsiz"],2],
      ["Ishqorlar fenolftaleinni qanday rangga bo'yaydi?","Pushti (malina rang)",["Rangsiz qoladi","Sariq","Ko'k"],3],
      ["Avogadro soni taxminan nechaga teng?","6,02·10²³",["3,14·10²³","9,8·10²³","1,6·10⁻¹⁹"],3],
      ["Kimyoviy elementlar davriy jadvalini kim yaratgan?","D. I. Mendeleyev",["M. Lomonosov","A. Lavuaze","D. Dalton"],1],
      ["Eng yengil gaz qaysi?","Vodorod",["Geliy","Kislorod","Azot"],1],
      ["Havo tarkibida eng ko'p bo'lgan gaz?","Azot",["Kislorod","Karbonat angidrid","Argon"],2],
      ["Olmos qaysi elementning allotropik shakli?","Uglerod",["Kremniy","Bor","Oltingugurt"],2],
      ["NaCl moddasida qanday kimyoviy bog' bor?","Ion bog'",["Kovalent qutbsiz","Metall bog'","Vodorod bog'"],3],
      ["H₂ molekulasidagi kimyoviy bog' turi?","Kovalent qutbsiz",["Ion bog'","Kovalent qutbli","Metall bog'"],3],
      ["Inert (nodir) gazlar davriy jadvalning qaysi guruhida?","VIII A (18-guruh)",["I A (1-guruh)","VII A (17-guruh)","II A (2-guruh)"],3],
      ["Temir zanglashi uchun nima zarur?","Kislorod va namlik",["Faqat issiqlik","Faqat yorug'lik","Azot va vodorod"],2],
    ],
    bio:[
      ["DNK qisqartmasi nimani bildiradi?","Dezoksiribonuklein kislota",["Ribonuklein kislota","Aminokislota","Adenozin trifosfat"],2],
      ["Odam yuragi nechta kameradan iborat?","4 ta",["2 ta","3 ta","5 ta"],1],
      ["Insulin qaysi bezda ishlab chiqariladi?","Oshqozon osti bezida",["Qalqonsimon bezda","Jigarda","Buyrak usti bezida"],3],
      ["Qaysi organoid faqat o'simlik hujayrasida bo'ladi?","Xloroplast",["Mitoxondriya","Yadro","Ribosoma"],2],
      ["Katta yoshli odam skeletida taxminan nechta suyak bor?","206 ta",["106 ta","306 ta","412 ta"],2],
      ["Odam tanasidagi eng uzun suyak?","Son suyagi",["Yelka suyagi","Umurtqa","Qovurg'a"],2],
      ["Evolyutsiya nazariyasi muallifi?","Charlz Darvin",["Gregor Mendel","Lui Paster","Ibn Sino"],1],
      ["Irsiyat qonunlarini kashf etgan olim?","Gregor Mendel",["Charlz Darvin","Lui Paster","Robert Kox"],3],
      ["Penitsillinni kim kashf etgan?","Aleksandr Fleming",["Lui Paster","Robert Kox","Edvard Jenner"],3],
      ["AB0 tizimi bo'yicha odamda nechta qon guruhi bor?","4 ta",["2 ta","3 ta","8 ta"],2],
      ["Fotosintez hujayraning qaysi qismida boradi?","Xloroplastlarda",["Mitoxondriyalarda","Yadroda","Hujayra qobig'ida"],2],
    ],
    eng:[
      ["She ___ to school every day.","goes",["go","going","gone"],1],
      ["I ___ my homework yesterday.","did",["do","does","done"],1],
      ["\"Child\" so'zining ko'plik shakli?","children",["childs","childes","childrens"],1],
      ["\"Mouse\" so'zining ko'plik shakli?","mice",["mouses","mices","mouse"],2],
      ["\"Tooth\" so'zining ko'plik shakli?","teeth",["tooths","teeths","toothes"],2],
      ["\"Good\" so'zining qiyosiy darajasi?","better",["gooder","best","more good"],2],
      ["\"Bad\" so'zining orttirma darajasi?","the worst",["the baddest","the worse","the most bad"],2],
      ["If I ___ rich, I would travel the world.","were",["am","will be","be"],3],
      ["She has lived here ___ 2010.","since",["for","from","during"],3],
      ["I have been waiting ___ two hours.","for",["since","during","from"],3],
      ["\"Write\" fe'lining III shakli (Past Participle)?","written",["wrote","writed","writing"],3],
      ["\"Go\" fe'lining III shakli (Past Participle)?","gone",["went","goed","going"],2],
      ["He ___ TV when I called him.","was watching",["watched","is watching","watches"],3],
      ["This book ___ by millions of people.","is read",["reads","is reading","read"],3],
    ],
    rus:[
      ["\"Окно\" so'zi qaysi rodda?","Средний род",["Мужской род","Женский род","Rodi yo'q"],2],
      ["\"Стол\" so'zi qaysi rodda?","Мужской род",["Женский род","Средний род","Rodi yo'q"],2],
      ["\"Книга\" so'zi qaysi rodda?","Женский род",["Мужской род","Средний род","Rodi yo'q"],1],
      ["\"Друг\" so'zining ko'plik shakli?","друзья",["други","друга","друзи"],3],
      ["\"Человек\" so'zining ko'plik shakli?","люди",["человеки","человека","людьи"],2],
      ["\"Ребёнок\" so'zining ko'plik shakli?","дети",["ребёнки","ребята","детя"],2],
      ["Rus tilida nechta kelishik (падеж) bor?","6 ta",["4 ta","5 ta","7 ta"],2],
      ["Rus alifbosida nechta harf bor?","33 ta",["26 ta","30 ta","35 ta"],2],
      ["\"Я читаю книгу\" gapida \"книгу\" qaysi kelishikda?","Винительный",["Именительный","Родительный","Дательный"],3],
      ["\"Я ___ в школу\" (идти fe'li, hozirgi zamon)","иду",["идёт","идём","идут"],2],
    ],
    huquq:[
      ["O'zbekiston Respublikasi Konstitutsiyasi (2023-yilgi tahrir) nechta moddadan iborat?","155 ta",["128 ta","100 ta","175 ta"],3],
      ["O'zbekiston Respublikasi Prezidentligiga nomzod kamida necha yoshda bo'lishi kerak?","35 yosh",["25 yosh","30 yosh","40 yosh"],3],
      ["Oliy Majlis Qonunchilik palatasi deputatlari soni?","150 ta",["100 ta","120 ta","250 ta"],3],
      ["Jinoiy javobgarlik umumiy qoidaga ko'ra necha yoshdan boshlanadi?","16 yoshdan",["14 yoshdan","18 yoshdan","12 yoshdan"],3],
    ],
  };
  const LEVELS_D={  // what share of a match comes from each difficulty, per player level
    0:[0.70,0.30,0,0], 1:[0.25,0.50,0.25,0], 2:[0.05,0.30,0.45,0.20], 3:[0,0.15,0.40,0.45]
  };
  // difficulty of the table/bank questions (0..3), decided from their id
  const FAMOUS_CAP=["O'zbekiston","Qozog'iston","Qirg'iziston","Tojikiston","Turkmaniston","Rossiya","Turkiya","Xitoy","Yaponiya","Germaniya","Fransiya","Buyuk Britaniya","Italiya","AQSH","Misr","Hindiston","Ispaniya","Janubiy Koreya","Kanada"];
  function diffOf(subj,id){
    let m;
    if(/^qlogic/.test(id)) return 1;
    if(/^q/.test(id)) return 0;                                 // basic hand-written bank
    if(/^lb/.test(id)) return 1;
    if((m=/^ch([snz])(.+)$/.exec(id))){ const e=ELEMENTS.find(x=>x[0]===m[2]); const z=e?e[2]:99;
      if(m[1]==='s') return z<=20?0:1; if(m[1]==='n') return z<=20?1:2; return z<=10?1:z<=20?2:3; }
    if((m=/^ch([fg])(\d+)$/.exec(id))){ const i=+m[2], b=i<3?0:i<10?1:2; return m[1]==='f'?b:Math.min(3,b+1); }
    if((m=/^g(cap|cou|con)(\d+)$/.exec(id))){ const c=COUNTRIES_T[+m[2]], fam=FAMOUS_CAP.includes(c[0]); const b=fam?0:(c[2]==='Yevropa'||c[2]==='Osiyo')?1:2; return m[1]==='cap'?b:m[1]==='cou'?Math.min(3,b+1):(fam?0:1); }
    if(/^greg/.test(id)) return 1;
    if((m=/^e(en|uz)(\d+)$/.exec(id))){ const i=+m[2], b=i<44?0:1; return m[1]==='en'?b:b+1; }
    if((m=/^eirr(\d+)$/.exec(id))) return +m[1]<6?2:3;
    if((m=/^r(ru|uz)(\d+)$/.exec(id))){ const i=+m[2], b=i<46?0:1; return m[1]==='ru'?b:b+1; }
    if((m=/^opos(Ot|Sifat|Fe'l|Son|Olmosh|Ravish)/.exec(id))) return {Ot:0,Sifat:0,"Fe'l":0,Son:1,Olmosh:1,Ravish:2}[m[1]];
    if(/^oant/.test(id)) return 1; if(/^osyn/.test(id)) return 2;
    if((m=/^abk(\d+)$/.exec(id))){ const i=+m[1]; return [0,3,4,8,9,22,23,27].includes(i)?0:[1,2,5,6,7,13,14,18,19,20,24,25,26,28].includes(i)?1:2; }
    if(/^aau/.test(id)) return 2;
    if((m=/^hy(\d+)$/.exec(id))){ const i=+m[1]; return [0,14,18].includes(i)?1:[1,2,3,13,15,16].includes(i)?2:3; }
    if((m=/^hc(\d+)$/.exec(id))){ const i=+m[1]; return [0,1,2,3,14,18].includes(i)?1:2; }
    if((m=/^hx(\d+)$/.exec(id))){ const i=+m[1]; return [0,4,6,13].includes(i)?0:[3,5,7,9,12].includes(i)?2:1; }
    if(/^hp/.test(id)) return 1;
    if((m=/^wy(\d+)$/.exec(id))){ const i=+m[1]; return [0,1,2,3,4,9,10].includes(i)?1:[5,6,12,13,14,18,20,21].includes(i)?3:2; }
    if((m=/^wc(\d+)$/.exec(id))){ const i=+m[1]; return [0,1,2,3,4,9,10].includes(i)?1:2; }
    if((m=/^wx(\d+)$/.exec(id))){ const i=+m[1]; return [2,5,7,11].includes(i)?0:[8,10].includes(i)?2:1; }
    if((m=/^ban(\d+)$/.exec(id))){ const i=+m[1]; return [3,6,7,13,15,16,17].includes(i)?0:i===2?2:1; }
    if(/^borg/.test(id)) return 0; if(/^borf/.test(id)) return 1; if(/^bvit/.test(id)) return 1;
    if((m=/^bx(\d+)$/.exec(id))) return [1,2,2,3,1,1,2,2,1,0][+m[1]] ?? 1;
    if((m=/^hq(\d+)$/.exec(id))){ return [0,0,2,1,1,1,1,1,2,0,1,0,3,3,3,2,3,3,3,1,2,1,1,0][+m[1]] ?? 1; }
    if((m=/^hd\w+?-(\d)$/.exec(id))) return +m[1];
    return 1;
  }

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
    (HARD[subj]||[]).forEach(([qq,c,w,d],i)=>{ const it=item('hd'+subj+i+'-'+d,qq,c,w); if(it) out.push(it); });
    if(subj==='huquq') HUQUQ.forEach(([q,c,w],i)=>{ const it=item('hq'+i,q,c,w); if(it) out.push(it); });
    return out;
  }

  /* ========================= PUBLIC API ========================= */
  const cache={};
  // All finite questions of a subject (tables + hand-written bank)
  function finitePool(subj){
    if(cache[subj]) return cache[subj];
    const manual=(subj==='logic'?logicBank:(qbank[subj]||[])).map((it,i)=>({id:'q'+subj+i+':'+it.q.slice(0,24),q:it.q,o:it.o.slice(),c:it.c}));
    return cache[subj]=manual.concat(tableItems(subj)).map(it=>(it.d=diffOf(subj,it.id),it));
  }
  function shuffleOpts(it){ const order=shuffle([0,1,2,3]); return {id:it.id,q:it.q,o:order.map(i=>it.o[i]),c:order.indexOf(it.c),d:it.d}; }

  // Player level from total score: 0 Bronza–Kumush, 1 Oltin–Platina, 2 Olmos–Smaragd, 3 Afsonaviy+
  function levelFor(score){ score=+score||0; return score<2500?0:score<10000?1:score<35000?2:3; }
  function pickDiff(L){ const w=LEVELS_D[L]||LEVELS_D[0]; let r=Math.random(); for(let d=0;d<4;d++){ if((r-=w[d])<0) return d; } return 1; }

  // Returns `count` questions for `subj` the player has not seen (seen = Set of ids),
  // matched to the player's level L (0..3) and ordered from easier to harder.
  function build(subj,count,seen,L){
    seen=seen||new Set(); L=Math.max(0,Math.min(3,+L||0));
    const out=[], used=new Set();
    const gens=GEN[subj]||[];
    let pool=shuffle(finitePool(subj).filter(q=>!seen.has(q.id)));
    let resetPool=false;
    for(let k=0;k<count;k++){
      const t=pickDiff(L);
      const wantGen = gens.length && (pool.length===0 || t>0 || Math.random()<0.7);   // the fixed bank of these subjects is basic
      let q=null;
      if(wantGen){
        const ok=gens.filter(f=>f.min<=t);
        for(let tries=0;tries<60 && !q;tries++){ const it=pick(ok)(t); if(it && !seen.has(it.id) && !used.has(it.id)){ q=it; q.d=t; } }
      }
      if(!q){
        if(!pool.length){ pool=shuffle(finitePool(subj).filter(x=>!used.has(x.id))); resetPool=true; } // every question seen -> start a new cycle
        // closest difficulty to the target among unseen questions (ties: the easier one)
        let best=-1, bd=9;
        for(let i=0;i<pool.length;i++){ const dd=Math.abs((pool[i].d||0)-t)*2+((pool[i].d||0)>t?1:0); if(dd<bd){ bd=dd; best=i; if(dd===0) break; } }
        if(best>=0){ q=pool.splice(best,1)[0]; q=shuffleOpts(q); }
      }
      if(!q) break;
      used.add(q.id); out.push(q);
    }
    out.sort((a,b)=>(a.d||0)-(b.d||0));                 // a match warms up, then gets harder
    return {questions:out, resetPool};
  }
  function poolSize(subj){ return finitePool(subj).length + ((GEN[subj]||[]).length ? Infinity : 0); }
  return { build, poolSize, finitePool, GEN, levelFor };
})();
