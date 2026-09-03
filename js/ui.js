/* ============================================================
   화면
   ============================================================ */
function showTask(eyebrow, title, desc){
  document.getElementById('taskEyebrow').textContent = eyebrow;
  document.getElementById('taskTitle').innerHTML = title;
  document.getElementById('taskDesc').innerHTML = desc || '';
}
function showSheet(html, corner){
  document.getElementById('sheet').innerHTML = html;
  const ov = document.getElementById('overlay');
  ov.classList.remove('hide');
  ov.classList.toggle('corner', !!corner);
}
function hideSheet(){
  const ov = document.getElementById('overlay');
  ov.classList.add('hide');
  ov.classList.remove('corner');
}

/* 시작 화면 머리 — 작게 센터 이름, 크게 연수원 이름, 옆에 지게차 한 대 */
const BRAND =
  '<div class="brand">' +
  '<svg viewBox="0 0 126 92" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="64" cy="86" rx="52" ry="4.5" fill="#1D2733" opacity=".10"/>' +
    '<rect x="30" y="10" width="7" height="60" rx="3.5" fill="#8A96A2"/>' +
    '<rect x="40" y="10" width="7" height="60" rx="3.5" fill="#8A96A2"/>' +
    '<rect x="29" y="8" width="19" height="6" rx="3" fill="#6E7A86"/>' +
    '<rect x="28" y="60" width="8" height="12" rx="3" fill="#B9C2CC"/>' +
    '<rect x="6" y="68" width="26" height="6" rx="3" fill="#B9C2CC"/>' +
    '<rect x="8" y="52" width="22" height="16" rx="3" fill="#9FBE38" stroke="#6E8626" stroke-width="2"/>' +
    '<rect x="50" y="40" width="46" height="32" rx="9" fill="#F2B705" stroke="#C08F06" stroke-width="2.5"/>' +
    '<rect x="54" y="6" width="42" height="6" rx="3" fill="#3A4553"/>' +
    '<rect x="56" y="10" width="5" height="32" rx="2.5" fill="#3A4553"/>' +
    '<rect x="89" y="10" width="5" height="32" rx="2.5" fill="#3A4553"/>' +
    '<circle cx="75" cy="30" r="7" fill="#D9B08C"/>' +
    '<path d="M68 24 a7 7 0 0 1 14 0 z" fill="#E8E8EA"/>' +
    '<rect x="69" y="37" width="13" height="8" rx="3" fill="#E8F24A"/>' +
    '<circle cx="60" cy="74" r="8.5" fill="#2E3742"/><circle cx="60" cy="74" r="3.2" fill="#8A96A2"/>' +
    '<circle cx="88" cy="74" r="8.5" fill="#2E3742"/><circle cx="88" cy="74" r="3.2" fill="#8A96A2"/>' +
  '</svg>' +
  '<div><h1>지게차 연수원</h1>' +
  '<div class="sub2">리치트럭 · 좁은 통로형</div></div></div>';

function menuSheet(){
  return BRAND +
    '<div class="namebox">' +
      '<input id="menuName" type="text" maxlength="12" placeholder="이름 (선택)" value="' + esc(G.playerName) + '">' +
      '<div class="hint">이름을 넣으면 기록과 이어하기가 따로 저장됩니다. 비워도 바로 시작됩니다.</div>' +
    '</div><ul>' +
    '<li>오른쪽 위 <b>⋯</b> 를 누르면 확대·축소, 시점, 조작반 크기, 전체 화면 버튼이 나옵니다</li>' +
    '<li><b>시점</b> 은 운전석 · 쿼터뷰 · 지겟발 · 자동 넷입니다. 자동은 팔레트가 가까워지면 위에서 내려다보게 바뀝니다</li>' +
    '<li>조작은 <b>교육</b>에서 하나씩 배웁니다. <b>근무</b>는 일차가 올라갈수록 어려워집니다</li>' +
    '</ul><div class="row">' +
    '<button class="btn primary" id="btnEdu">교육</button>' +
    '<button class="btn" id="btnWork">근무</button>' +
    '<button class="btn" id="btnPrac">연습장</button>' +
    '<button class="btn" id="btnSpeed">속도전</button>' +
    '</div><div class="row">' +
    '<button class="btn" id="btnRoam">배회</button>' +
    '<button class="btn" id="btnDrive">드라이브</button>' +
    '<button class="btn" id="btnCert">기록</button>' +
    '</div>';
}
function speedSheet(){
  return '<h1>속도전</h1><ul>' +
    '<li><b>고정 코스</b> 매번 같은 ' + RUSH_COURSE.length + '구간. 본인 최고 기록이 반투명 지게차로 같이 달립니다</li>' +
    '<li><b>일일 과제</b> 오늘 날짜로 정해지는 5구간. 모두 같은 판을 받고, 기록은 오늘 순위에 올라갑니다</li>' +
    '<li>파손 1건당 ' + RUSH_PENALTY + '초, 지적 1건당 ' + RUSH_FAULT + '초가 더해집니다</li></ul>' +
    '<div class="row"><button class="btn primary" id="btnRush">고정 코스</button>' +
    '<button class="btn" id="btnDaily">일일 과제</button>' +
    '<button class="btn" id="btnBack">돌아가기</button></div>';
}

function resultSheet(){
  const r = scoreBreak();
  const head = r.pass
    ? '<h1>수료</h1><div class="sub">기준 ' + SCORE.pass + '점을 넘겼습니다</div>'
    : '<h1>미수료</h1><div class="sub">기준 ' + SCORE.pass + '점에 미달했습니다</div>';
  const detail = '<table class="calc"><tbody>' +
    '<tr><td>기본</td><td class="num">' + SCORE.base + '</td></tr>' +
    '<tr><td>파손 ' + G.damage + '건</td><td class="num">-' + r.dmg + '</td></tr>' +
    '<tr><td>지적 ' + G.fault + '건</td><td class="num">-' + r.flt + '</td></tr>' +
    '<tr><td>시간 초과 ' + r.over + '초</td><td class="num">-' + r.tp + '</td></tr>' +
    '<tr class="sum"><td>합계</td><td class="num">' + r.score + '</td></tr></tbody></table>';
  const foot = r.pass
    ? '<div class="namebox"><input id="certName" type="text" maxlength="12" placeholder="이름" value="' + esc(G.playerName) + '"></div>' +
      '<div class="row"><button class="btn primary" data-act="cert">수료자 명단에 등록</button>' +
      '<button class="btn" id="btnAgain">다시</button></div>'
    : '<div class="row"><button class="btn primary" id="btnAgain">처음부터 다시</button></div>';
  return head + '<div class="result">' +
    '<div><div class="k">점수</div><div class="v">' + r.score + '</div></div>' +
    '<div><div class="k">시간</div><div class="v">' + fmtTime(G.time) + '</div></div>' +
    '<div><div class="k">파손</div><div class="v">' + G.damage + '</div></div>' +
    '<div><div class="k">지적</div><div class="v">' + G.fault + '</div></div>' +
    '</div>' + detail + foot;
}

function resetTruck(){
  truck.x = 7.0; truck.z = 3.40; truck.h = -Math.PI/2;
  truck.v = 0; truck.steer = 0; truck.lift = 0; truck.reach = 0; truck.tilt = 0; truck.carry = null;
  G.wheel = 0; G.wheelHold = 0; G.wheelLast = 0; G.wheelAcc = 0; G.wheelLock = false;
  setPedal(false); releaseLevers();
  G.pan.x = 0; G.pan.z = 0;
  G.gauge = null; G.place = null; G.risk = null; G.headTurn = 0;
  G.sway = 0; G.swayV = 0; G.lastV = 0; G.capCool = 0; G.padNow = 0;
  G.highTravel = 0; G.tiltTravel = 0; G.bumpCool = 0;
  G.scrapeT = 0; G.carryCatch = false; G.legCool = 0; G.riskT = 0;
  SND.scrape = 0;
  camera.userData.tx = truck.x; camera.userData.tz = truck.z;
  document.getElementById('chargeBox').style.display = 'none';
  document.getElementById('risk').style.display = 'none';
}

function resetWorld(params, rng){
  for(const p of pallets) scene.remove(p.mesh);
  pallets.length = 0;
  G.drillPallet = null;
  for(const sl of slots) sl.pallet = null;
  for(const zn of zones) zn.pallet = null;
  clearDebris();
  driverReset();
  G.postDrop = null; G.busy = false; G.driveTip = 0; G.speedMul = 1; G.st = G.st || {};
  if(truckGroup) truckGroup.rotation.z = 0;
  INTER.cur = null;
  if(typeof setRain === 'function') setRain(false);
  if(typeof liftDoor === 'function') liftDoor(true);
  setupPallets(rng || Math.random, params);
  resetTruck();
  G.time = 0; G.damage = 0; G.fault = 0; G.batt = 100; G.lowWarned = false; G.battDead = false;
  G.step = 0; G.flags = {}; G.missionIdx = 0; G.mission = null; G.chargeStep = false;
  targetRing.visible = false; targetPost.visible = false; slotGhost.visible = false;
}

function backToMenu(){
  CH.open = false;
  if(G.mode === 'roam') saveRoam();
  G.running = false;
  G.mode = 'menu';
  clearPractice();
  resetWorld();
  applyTime(2);
  if(scene.fog){ scene.fog.near = TIMES[2].fog[0]; scene.fog.far = TIMES[2].fog[1]; }
  refreshCerts();
  showTask('준비', '지게차 연수원', '');
  showSheet(menuSheet());
}
function enterMode(){
  try{ history.pushState({ sim:1 }, ''); }catch(e){}
  if(!tourDone()) setTimeout(tourStart, 400);
}
function readMenuName(){
  const el = document.getElementById('menuName');
  if(el) G.playerName = (el.value || '').trim();
}
function registerCert(){
  const el = document.getElementById('certName');
  const name = (el && el.value || '').trim();
  if(!name){ if(el){ el.focus(); el.placeholder = '이름을 입력하세요'; } return; }
  G.playerName = name;
  const r = scoreBreak();
  const d = new Date();
  persistCert({
    name:name, score:r.score, damage:G.damage, time:Math.round(G.time),
    date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  });
  blip(880, 0.16, 'sine', 0.06);
  setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
  showSheet(certListSheet());
  refreshCerts(()=>{ if(G.mode !== 'menu') showSheet(certListSheet()); });
}

function startRoam(){
  hideSheet(); enterMode();
  G.mode = 'roam'; G.time = 0; G.damage = 0; G.chargeStep = false; G.defects = {}; G.defectSeen = {};
  targetRing.visible = false; targetPost.visible = false; slotGhost.visible = false;
  loadRoam();
  G.goal = pickGoal();
  G.shutterT = G.outUnlocked ? 8.4 : 3.0;
  const tn = applyTime(Math.floor(Math.random()*TIMES.length));
  G.running = true;
  applyLayout();
  showTask('배회', tn + '의 센터',
    G.outUnlocked ? '셔터 밖에 야드와 도로가 있습니다.'
                  : '돌아다니면 지도가 채워집니다. 다 채우면 셔터가 열립니다.');
}

function bindSheet(){
  document.getElementById('overlay').addEventListener('click', e=>{
    resumeAudio();
    const act = e.target.getAttribute && e.target.getAttribute('data-act');
    if(act === 'cert'){ registerCert(); return; }
    if(act === 'inspGood'){ inspAnswer(false); return; }
    if(act === 'inspBad'){ inspAnswer(true); return; }
    if(act === 'inspNext'){ inspNext(); return; }
    if(act === 'inspFix'){ inspFix(); return; }
    if(act === 'eduDrive'){ eduDrive(); return; }
    if(act === 'eduCourse'){ autoFull(); eduEnter(); return; }
    if(act === 'drillPick'){ autoFull(); drillStart('pick'); return; }
    if(act === 'practiceMenu'){ if(G.mode !== 'menu'){ G.running = false; G.mode = 'menu'; clearPractice(); resetWorld(); } showSheet(practiceSheet()); return; }
    if(act && act.indexOf('course:') === 0){ autoFull(); readMenuName(); courseStart(act.slice(7)); return; }
    if(act === 'courseAgain'){ autoFull(); courseStart(G.course); return; }
    if(act === 'workBegin'){ autoFull(); workBegin(); return; }
    if(act === 'workReset'){ workReset(); return; }
    if(act === 'drillNext'){ drillNext(); return; }
    if(act === 'drillAgain'){ drillAgain(); return; }
    if(act === 'eduResume'){ eduResume(); return; }
    if(act === 'eduRestart'){ eduClear(); eduBegin(true); return; }
    if(act === 'rushSave'){ rushSave(); return; }
    if(act){ chargeAct(act); return; }
    const id = e.target.id;
    if(id === 'btnEdu'){
      autoFull(); readMenuName(); showSheet(eduMenuSheet());
    }else if(id === 'btnWork' || id === 'btnMis'){
      autoFull(); readMenuName(); if(G.mode !== 'menu'){ G.running = false; G.mode = 'menu'; clearPractice(); resetWorld(); } showSheet(workSheet());
    }else if(id === 'btnPrac'){
      autoFull(); readMenuName(); showSheet(practiceSheet());
    }else if(id === 'btnSpeed'){
      autoFull(); readMenuName(); showSheet(speedSheet());
    }else if(id === 'btnRush'){
      autoFull(); rushStart();
    }else if(id === 'btnDaily'){
      autoFull(); dailyStart();
    }else if(id === 'btnDrive'){
      autoFull(); readMenuName(); startDrive();
    }else if(id === 'btnRoam'){
      autoFull(); readMenuName(); startRoam();
    }else if(id === 'btnCert'){
      readMenuName(); refreshCerts(()=> showSheet(certListSheet()));
    }else if(id === 'btnBack'){
      if(G.mode !== 'menu') backToMenu(); else showSheet(menuSheet());
    }else if(id === 'btnAgain'){
      if(history.state && history.state.sim) history.back(); else backToMenu();
    }
  });
}

/* ============================================================
   HUD
   ============================================================ */
const _gv = new THREE.Vector3();
function updateGuide(){
  const el = document.getElementById('guide');
  let p = null;
  if(targetPost.visible) p = targetPost.position;
  else if(slotGhost.visible) p = slotGhost.position;
  if(!p){ el.style.display = 'none'; return; }
  _gv.set(p.x, 1.2, p.z).project(camera);
  const behind = _gv.z > 1;
  let nx = _gv.x, ny = _gv.y;
  if(behind){ nx = -nx; ny = -ny; }
  if(!behind && Math.abs(nx) < 0.88 && Math.abs(ny) < 0.80){ el.style.display = 'none'; return; }
  const W = window.innerWidth, H = window.innerHeight;
  // 조작반이 덮는 아래쪽을 뺀 실제 보이는 영역 안에 붙인다
  const band = G.padYNow || 0;
  const cy2 = (H - band)/2;
  const mx = W/2 - 84, my = cy2 - 74;
  let dx = nx, dy = -ny;
  if(Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) dy = 1;
  const t = Math.min(mx/Math.max(Math.abs(dx),1e-4), my/Math.max(Math.abs(dy),1e-4));
  el.style.display = 'flex';
  el.style.left = (W/2 + dx*t) + 'px';
  el.style.top = (cy2 + dy*t) + 'px';
  document.getElementById('guideArrow').style.transform = 'rotate(' + (Math.atan2(dy, dx)*180/Math.PI) + 'deg)';
  document.getElementById('guideDist').textContent = Math.round(Math.hypot(truck.x - p.x, truck.z - p.z)) + 'm';
}
function updateRisk(){
  const el = document.getElementById('risk');
  if(!G.risk || !G.running){ el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.className = G.risk.lv === 'warn' ? 'warn' : '';
  document.getElementById('riskMsg').textContent = G.risk.msg;
  document.getElementById('riskBar').style.width = (G.risk.r*100).toFixed(0) + '%';
}
function updateHUD(dt){
  const roam = G.mode === 'roam';
  const bare = roam || G.mode === 'drill' || G.mode === 'drive' || G.mode === 'course' || G.mode === 'train';
  document.getElementById('stat').style.display = bare ? 'none' : 'flex';
  document.getElementById('zoom').classList.toggle('up', bare);
  document.getElementById('btnMap').classList.toggle('hide', !roam);
  document.getElementById('btnRear').classList.toggle('hide', effView() !== 'cab');
  document.getElementById('statTime').textContent = fmtTime(G.time);
  const d = document.getElementById('statDmg');
  d.textContent = G.damage; d.className = 'v' + (G.damage > 0 ? ' bad' : '');
  const fl = document.getElementById('statFault');
  fl.textContent = G.fault; fl.className = 'v' + (G.fault > 0 ? ' blue' : '');
  const b = document.getElementById('statBatt');
  b.textContent = Math.round(G.batt) + '%';
  b.className = 'v' + (G.batt < 20 ? ' bad' : '');
  updateChargePanel();
  if(G.toastT > 0){
    G.toastT -= dt;
    if(G.toastT <= 0) document.getElementById('toast').className = '';
  }
  drawInstruments();
  drawGauge();
  updateRisk();
  tickRiskBeep(dt);
  updateRoamPanel(dt);
  paintControls();
  updateGuide();
}

/* ============================================================
   레이아웃
   ============================================================ */
function applyLayout(){
  const w = window.innerWidth, h = window.innerHeight;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  document.body.classList.toggle('touch', coarse);
  const portrait = h > w;
  document.body.classList.toggle('portrait', portrait);
  G.portrait = portrait;

  const cl = document.getElementById('ctlLeft');
  const cr = document.getElementById('ctlRight');
  const panel = document.getElementById('panel');

  /* 배치는 세로·가로가 같다. 폭에 맞춰 배율만 달라진다.
     아래 줄 = [핸들 + 브레이크] ... [레버 모듈 + 경음기]
     그 위   = 납작한 계기판, 필요할 때 정렬 게이지가 그 위에 겹친다. */
  let ui = UI_STEPS[G.uiStep] || 0;
  if(!ui) ui = coarse ? clamp(h/430, 0.85, 1.45) : clamp(h/840, 0.82, 1.10);
  const natW = cl.offsetWidth + cr.offsetWidth + 40;
  const natH = Math.max(cl.offsetHeight, cr.offsetHeight, 1);
  ui = clamp(Math.min(ui, w/natW, (h*(portrait ? 0.30 : 0.46))/natH), 0.5, 1.9);
  document.documentElement.style.setProperty('--ui', ui.toFixed(3));
  G.uiNow = ui;

  const ctlH = natH*ui;
  panel.style.bottom = Math.round(ctlH + 20) + 'px';
  // 계기판 좌우 상자를 아래 조작반과 같은 폭으로 맞춘다
  document.getElementById('panelL').style.width = Math.round(cl.offsetWidth*ui) + 'px';
  document.getElementById('panelR').style.width = Math.round(cr.offsetWidth*ui) + 'px';
  const ay = Math.round(ctlH + 20 + panel.offsetHeight + 8);
  document.getElementById('alignL').style.bottom = ay + 'px';
  document.getElementById('alignR').style.bottom = ay + 'px';

  // 계기판은 자리를 차지하고, 정렬 게이지는 그 위에 겹치기만 한다
  G.padY = portrait ? (ctlH + panel.offsetHeight + 30) : 0;
  G.uipNow = 0; G.panelW = 0;

  // 지시서가 시간·파손·배터리 카드를 침범하지 않게 폭을 잘라준다
  const taskEl = document.getElementById('task');
  const statEl = document.getElementById('stat');
  const statW = (statEl.style.display === 'none') ? 0 : statEl.offsetWidth;
  taskEl.style.maxWidth = Math.max(150, w - statW - 36) + 'px';

  document.getElementById('risk').style.top =
    Math.round(Math.min(140, (h - (G.padY || 0))*0.42)) + 'px';
  document.getElementById('toast').style.top =
    Math.round(Math.min(92, (h - (G.padY || 0))*0.22)) + 'px';
}

/* ============================================================
   첫 진입 안내 — 글로만 적어두면 아무도 못 찾는다.
   실제 버튼을 하나씩 짚어가며 보여주고, 한 번 보면 다시 뜨지 않는다.
   ============================================================ */
const TOUR_KEY = 'forklift_tour_v1';
const TOUR = [
  { el:'btnFull', t:'전체 화면',
    d:'시작할 때 자동으로 켜집니다. 원하지 않으면 이 버튼으로 끄면 되고, 그 뒤로는 자동으로 켜지지 않습니다.' },
  { el:'btnView', t:'시점 바꾸기',
    d:'운전석 · 쿼터뷰 · 지겟발 · 자동 넷입니다. 자동은 팔레트가 가까워지면 위에서 내려다보게 바뀝니다.' },
  { el:'zoomOut', t:'확대와 축소',
    d:'− 로 넓게, + 로 가깝게 봅니다. 화면을 손가락 두 개로 벌려도 됩니다.' },
  { el:'btnUi', t:'조작반 크기',
    d:'조작반이 작거나 크면 여기서 바꿉니다. 자동부터 155%까지 돌아가고 기기에 기억됩니다.' },
  { el:null, t:'화면 끌어서 둘러보기',
    d:'화면 가운데를 손가락으로 끌면 주변을 둘러볼 수 있습니다. 다시 움직이면 지게차로 돌아옵니다.' },
  { el:'btnExit', t:'나가기',
    d:'언제든 메뉴로 나옵니다. 뒤로가기나 Esc 도 같습니다.' }
];
const TOUR_S = { i:0, on:false };

function tourDone(){
  try{ return window.localStorage.getItem(TOUR_KEY) === '1'; }catch(e){ return true; }
}
function tourEnd(){
  TOUR_S.on = false;
  document.getElementById('tour').style.display = 'none';
  document.getElementById('tourRing').style.display = 'none';
  try{ window.localStorage.setItem(TOUR_KEY, '1'); }catch(e){}
}
function tourVisible(id){
  if(!id) return true;
  const el = document.getElementById(id);
  if(!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}
function tourShow(){
  // 지금 화면에 없는 버튼은 건너뛴다
  while(TOUR_S.i < TOUR.length && !tourVisible(TOUR[TOUR_S.i].el)) TOUR_S.i++;
  const step = TOUR[TOUR_S.i];
  if(!step){ tourEnd(); return; }
  const box = document.getElementById('tour');
  const ring = document.getElementById('tourRing');
  document.getElementById('tourTtl').textContent = step.t;
  document.getElementById('tourTxt').textContent = step.d;
  document.getElementById('tourN').textContent = (TOUR_S.i+1) + ' / ' + TOUR.length;
  document.getElementById('tourNext').textContent =
    (TOUR_S.i + 1 >= TOUR.length) ? '시작' : '다음';
  box.style.display = 'block';

  const W = window.innerWidth, H = window.innerHeight;
  const bw = box.offsetWidth, bh = box.offsetHeight;
  const el = step.el ? document.getElementById(step.el) : null;
  if(el){
    const r = el.getBoundingClientRect();
    ring.style.display = 'block';
    ring.style.left = Math.round(r.left - 5) + 'px';
    ring.style.top = Math.round(r.top - 5) + 'px';
    ring.style.width = Math.round(r.width + 10) + 'px';
    ring.style.height = Math.round(r.height + 10) + 'px';
    box.style.left = Math.round(clamp(r.left + r.width/2 - bw/2, 10, W - bw - 10)) + 'px';
    box.style.top = Math.round(clamp(r.bottom + 12, 10, H - bh - 10)) + 'px';
  }else{
    ring.style.display = 'none';
    box.style.left = Math.round((W - bw)/2) + 'px';
    box.style.top = Math.round((H - bh)/2) + 'px';
  }
}
function tourNext(){ TOUR_S.i++; tourShow(); }
function tourStart(){
  if(tourDone() || TOUR_S.on) return;
  // 점검표 같은 화면이 덮고 있으면 그게 끝날 때까지 기다린다
  const ov = document.getElementById('overlay');
  if(!ov.classList.contains('hide') || !G.running){
    setTimeout(tourStart, 500);
    return;
  }
  TOUR_S.i = 0; TOUR_S.on = true;
  if(!G.barOpen){ G.barOpen = true; paintBar(); applyLayout(); }
  setTimeout(tourShow, 80);
}

/* 시작 버튼을 누르는 그 동작에 전체 화면을 얹는다.
   브라우저가 사용자 조작 없이는 허용하지 않기 때문이다.
   한 번 직접 끈 사람에게는 다시 걸지 않는다. */
const FULL_KEY = 'forklift_full_v1';
function autoFull(){
  try{ if(window.localStorage.getItem(FULL_KEY) === '0') return; }catch(e){}
  if(document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if(!fn) return;
  try{
    const r = fn.call(el);
    if(r && r.catch) r.catch(()=>{});
    if(screen.orientation && screen.orientation.lock){
      screen.orientation.lock('landscape').catch(()=>{});
    }
    setTimeout(resize, 350);
  }catch(e){}
}

/* 브라우저 주소창·툴바가 차지하는 세로를 되찾는다. 모바일에서 체감이 크다. */
function toggleFull(){
  const el = document.documentElement;
  try{
    if(document.fullscreenElement || document.webkitFullscreenElement){
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      try{ window.localStorage.setItem(FULL_KEY, '0'); }catch(err){}
    }else{
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      try{ window.localStorage.setItem(FULL_KEY, '1'); }catch(err){}
      if(screen.orientation && screen.orientation.lock){
        screen.orientation.lock('landscape').catch(()=>{});
      }
    }
  }catch(e){ toast('이 브라우저에서는 전체 화면을 쓸 수 없습니다'); }
  setTimeout(resize, 350);
}

/* 후진할 때 시점을 뒤로 돌릴지. 사람에 따라 방향 감각이 끊기기도 한다. */
function toggleRear(){
  G.rearLook = !G.rearLook;
  try{ window.localStorage.setItem(REAR_KEY, G.rearLook ? '1' : '0'); }catch(e){}
  document.getElementById('btnRear').classList.toggle('on', G.rearLook);
  toast(G.rearLook ? '후진할 때 뒤를 봅니다' : '후진해도 앞을 봅니다', true);
}

function setView(v){
  G.view = v;
  try{ window.localStorage.setItem(VIEW_KEY, v); }catch(e){}
}
function cycleView(){
  setView(VIEWS[(VIEWS.indexOf(G.view) + 1) % VIEWS.length]);
  toast('시점 ' + VIEW_NAME[G.view], true);
}

/* 접을 수 있다는 걸 모르면 계속 펼쳐둔 채로 쓰게 된다.
   한 번이라도 접어봤으면 그 뒤로는 깜빡이지 않는다. */
function barLearned(){
  try{ return window.localStorage.getItem(BARLEARN_KEY) === '1'; }catch(e){ return true; }
}
function paintBar(){
  const bar = document.getElementById('zoom');
  const btn = document.getElementById('btnBar');
  bar.classList.toggle('closed', !G.barOpen);
  btn.textContent = G.barOpen ? '✕' : '⋯';
  btn.title = G.barOpen ? '접기' : '펼치기';
  btn.classList.toggle('blink', G.barOpen && !barLearned());
}
function toggleBar(){
  G.barOpen = !G.barOpen;
  if(!G.barOpen){
    try{ window.localStorage.setItem(BARLEARN_KEY, '1'); }catch(e){}
  }
  try{ window.localStorage.setItem(BAR_KEY, G.barOpen ? '1' : '0'); }catch(e){}
  paintBar();
}

function toggleMap(){
  G.showMap = !G.showMap;
  document.getElementById('roamMore').classList.toggle('on', G.showMap);
  document.getElementById('btnMap').classList.toggle('on', G.showMap);
  try{ window.localStorage.setItem(MAP_KEY, G.showMap ? '1' : '0'); }catch(e){}
  if(G.showMap){ G.miniT = 0; drawMini(); }
}

function cycleUi(){
  G.uiStep = (G.uiStep + 1) % UI_STEPS.length;
  try{ window.localStorage.setItem(UI_KEY, String(G.uiStep)); }catch(e){}
  applyLayout();
  toast('조작반 크기 ' + (G.uiStep ? Math.round(G.uiNow*100) + '%' : '자동') , true);
}
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  applyLayout();
  if(TOUR_S.on) tourShow();
}

