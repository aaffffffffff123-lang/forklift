/* ============================================================
   속도전
   ============================================================ */
function rushStart(){
  readMenuName();
  hideSheet(); enterMode();
  G.mode = 'rush'; G.time = 0; G.damage = 0; G.fault = 0; G.rushIdx = 0; G.rushDone = false;
  G.defects = {}; G.defectSeen = {}; G.st = {};
  applyTime(2);
  resetWorld({ ext:0, unwrap:0, cargos:['water','oil','bottle','frozen'] }, mulberry(77));
  ghostStart();
  G.running = true;
  rushStep();
}
function rushCourse(){ return (G.mode === 'daily' || (G.mode === 'done' && G.rushDaily)) ? G.dailyCourse : RUSH_COURSE; }
function rushStep(){
  const RC = rushCourse();
  if(G.rushIdx >= RC.length){ rushFinish(); return; }
  const c = RC[G.rushIdx];
  const from = place(c.from);
  G.mission = { pallet: from ? from.pallet : null, from:from, to: place(c.to) };
  setHighlight(c.from);
  targetRing.visible = false; targetPost.visible = false;
  if(G.rushIdx === 0) toast((G.mode === 'daily' ? '오늘의 과제 ' : '같은 코스 ') + RC.length + '구간 · 파손 ' + RUSH_PENALTY + '초 · 지적 ' + RUSH_FAULT + '초' + (GH.best ? ' · 고스트 ' + fmtTime(GH.best.total) : ''), true);
  showTask((G.mode === 'daily' ? '일일 과제 ' : '속도전 ') + (G.rushIdx+1) + ' / ' + RC.length,
    '<span class="code">' + c.from + '</span> 팔레트를<br><span class="code">' + c.to + '</span> 로 이동',
    '파손 1건당 ' + RUSH_PENALTY + '초, 지적 1건당 ' + RUSH_FAULT + '초가 더해집니다.');
}
function rushTotal(){ return Math.round(G.time) + G.damage*RUSH_PENALTY + G.fault*RUSH_FAULT; }
function rushFinish(){
  G.running = false;
  G.rushDaily = G.mode === 'daily';
  G.rushBest = ghostFinish(rushTotal());
  G.mode = 'done';
  slotGhost.visible = false;
  showSheet(rushSheet());
}
function rushSheet(){
  return '<h1>완주</h1><div class="sub">' + (G.rushDaily ? '일일 과제 ' + todayStr() : '속도전') + ' · ' + rushCourse().length + '구간' + (G.rushBest ? ' · 고스트 갱신' : '') + '</div>' +
    '<div class="result">' +
    '<div><div class="k">기록</div><div class="v">' + fmtTime(rushTotal()) + '</div></div>' +
    '<div><div class="k">주행</div><div class="v">' + fmtTime(G.time) + '</div></div>' +
    '<div><div class="k">파손</div><div class="v">' + G.damage + '</div></div>' +
    '<div><div class="k">지적</div><div class="v">' + G.fault + '</div></div>' +
    '</div>' +
    '<table class="calc"><tbody>' +
    '<tr><td>주행 시간</td><td class="num">' + Math.round(G.time) + '초</td></tr>' +
    '<tr><td>파손 ' + G.damage + '건</td><td class="num">+' + (G.damage*RUSH_PENALTY) + '초</td></tr>' +
    '<tr><td>지적 ' + G.fault + '건</td><td class="num">+' + (G.fault*RUSH_FAULT) + '초</td></tr>' +
    '<tr class="sum"><td>최종 기록</td><td class="num">' + rushTotal() + '초</td></tr>' +
    '</tbody></table>' +
    '<div class="namebox"><input id="rushName" type="text" maxlength="12" placeholder="이름" value="' + esc(G.playerName) + '"></div>' +
    '<div class="row"><button class="btn primary" data-act="rushSave">기록 등록</button>' +
    '<button class="btn" id="' + (G.rushDaily ? 'btnDaily' : 'btnRush') + '">다시</button></div>';
}
let rushMem = [];
function rushLoad(){
  if(hasNet()) return rushMem;
  try{ return JSON.parse(window.localStorage.getItem(RUSH_KEY) || '[]'); }catch(e){ return []; }
}
function rushSave(){
  const el = document.getElementById('rushName');
  const name = (el && el.value || '').trim();
  if(!name){ if(el){ el.focus(); el.placeholder = '이름을 입력하세요'; } return; }
  G.playerName = name;
  const d = new Date();
  const date = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const row = { name:name, total:rushTotal(), damage:G.damage, date:date, daily:G.rushDaily ? date : '' };
  if(hasNet()){
    rushMem.push(row);
    certPost({ kind: G.rushDaily ? 'daily' : 'rush', name:name, total:row.total, damage:row.damage, date:date });
    setTimeout(()=> refreshCerts(()=>{ if(G.mode !== 'menu') showSheet(certListSheet()); }), 1200);
  }else{
    const list = rushLoad();
    list.push(row);
    try{ window.localStorage.setItem(RUSH_KEY, JSON.stringify(list)); }catch(e){}
  }
  blip(880, 0.16, 'sine', 0.06);
  setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
  showSheet(certListSheet());
}

