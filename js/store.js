/* ============================================================
   기록
   ============================================================ */
const CERT_KEY = 'forklift_sim_cert_v1';
// 앱스스크립트 웹앱을 배포한 뒤 /exec 주소를 여기에 붙이면 수료자 명단이 공유됩니다.
// 비워두면 이 기기 안에서만 남습니다.
const CERT_URL = 'https://script.google.com/macros/s/AKfycbzKmIYdOCYXNwXbNzvZWR2mQZk59Hhbpk7le-86VGqwzrgJZYqwGegYmRHcKhQ59fVV/exec';
let certMem = [];
function hasNet(){ return !!CERT_URL; }
function loadCerts(){ return certMem; }

// 조회는 JSONP — 깃허브에서 앱스스크립트를 부르면 CORS 에 막히는 경우가 있습니다
function certFetch(cb){
  if(!hasNet()){ cb(null); return; }
  let done = false;
  const fn = 'certCb' + Date.now().toString(36);
  const sc = document.createElement('script');
  const cleanup = ()=>{
    try{ delete window[fn]; }catch(e){ window[fn] = undefined; }
    if(sc.parentNode) sc.parentNode.removeChild(sc);
  };
  const fail = ()=>{ if(done) return; done = true; cleanup(); cb(null); };
  window[fn] = list =>{ if(done) return; done = true; cleanup(); cb(list); };
  sc.onerror = fail;
  sc.src = CERT_URL + (CERT_URL.indexOf('?') >= 0 ? '&' : '?') +
           'game=forklift&callback=' + fn + '&t=' + Date.now();
  document.head.appendChild(sc);
  setTimeout(fail, 6000);
}
function certPost(body){
  if(!hasNet()) return;
  try{
    fetch(CERT_URL, {
      method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ game:'forklift' }, body)),
      keepalive: true
    }).catch(()=>{});
  }catch(e){}
}

function refreshCerts(done){
  if(hasNet()){
    certFetch(d =>{
      if(d){ certMem = d.certs || []; rushMem = d.rush || []; }
      if(done) done();
    });
  }else{
    try{ certMem = JSON.parse(window.localStorage.getItem(CERT_KEY) || '[]'); }catch(e){}
    if(done) done();
  }
}
function persistCert(rec){
  certMem.push(rec);
  if(hasNet()){
    certPost({ kind:'cert', name:rec.name, score:rec.score,
               damage:rec.damage, time:rec.time, date:rec.date });
    setTimeout(()=> refreshCerts(), 1200);
  }else{
    try{ window.localStorage.setItem(CERT_KEY, JSON.stringify(certMem)); }catch(e){}
  }
}
function scoreBreak(){
  const over = Math.max(0, Math.round(G.time) - SCORE.timeFree);
  const dmg = G.damage * SCORE.perDamage;
  const flt = G.fault * SCORE.perFault;
  const tp = over * SCORE.perSec;
  const score = Math.max(0, SCORE.base - dmg - flt - tp);
  return { over:over, dmg:dmg, flt:flt, tp:tp, score:score, pass: score >= SCORE.pass };
}
function recordRows(){
  const by = {};
  const get = n =>{
    if(!by[n]) by[n] = { name:n, score:null, damage:null, date:'', rush:null, rdate:'' };
    return by[n];
  };
  for(const c of loadCerts()){
    const r = get(String(c.name));
    if(r.score === null || c.score > r.score){ r.score = c.score; r.damage = c.damage; r.date = c.date || ''; }
  }
  for(const c of rushLoad()){
    const r = get(String(c.name));
    if(r.rush === null || c.total < r.rush){ r.rush = c.total; r.rdate = c.date || ''; }
  }
  const list = [];
  for(const k in by) list.push(by[k]);
  list.sort((a,b)=>{
    if((b.score||0) !== (a.score||0)) return (b.score||0) - (a.score||0);
    return (a.rush === null ? 1e9 : a.rush) - (b.rush === null ? 1e9 : b.rush);
  });
  return list;
}
function certListSheet(){
  const list = recordRows();
  const rows = list.length
    ? list.map((c,i)=> '<tr><td>' + (i+1) + '</td><td>' + esc(c.name) + '</td>' +
        '<td class="num">' + (c.score === null ? '-' : c.score + '점') + '</td>' +
        '<td class="num">' + (c.rush === null ? '-' : fmtTime(c.rush)) + '</td>' +
        '<td class="dt">' + esc(c.date || c.rdate || '') + '</td></tr>').join('')
    : '<tr><td colspan="5" class="none">아직 기록이 없습니다</td></tr>';
  return '<h1>기록</h1><div class="sub">수료 기준 ' + SCORE.pass +
    '점 · 속도전은 파손 1건당 ' + RUSH_PENALTY + '초</div>' +
    '<table><thead><tr><th></th><th>이름</th><th class="num">수료 점수</th>' +
    '<th class="num">속도전</th><th class="dt">일자</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="row"><button class="btn primary" id="btnBack">돌아가기</button></div>';
}

