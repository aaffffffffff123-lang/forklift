/* ============================================================
   튜토리얼
   ============================================================ */
const TUT = [
  {
    title:'주행 자세 만들기',
    desc:'리프트 레버를 당겨 지겟발을 15~30cm 띄우고, 틸트 레버로 마스트를 후경으로 당기세요. 바닥에 붙인 채 달리면 포크가 갈립니다.',
    check:()=> truck.lift > 0.14 && truck.lift < 0.32 && forkAngle() >= CFG.keepTilt
  },
  {
    title:'브레이크를 밟고 전진으로 이동',
    desc:'브레이크는 밟아야 제동이 풀립니다. 한 번 누르면 밟음, 다시 누르면 뗌. 전후진 레버는 민 만큼 속도가 납니다.',
    marker:{x:-2.0, z:3.40},
    check:()=> near(-2.0, 3.40, 1.7) && Math.abs(truck.v) < 0.35
  },
  {
    title:'핸들을 돌려 표시 지점까지 이동',
    desc:'핸들은 손을 떼도 각도가 남습니다. 뒷바퀴가 조향축이라 앞이 도는 만큼 뒤가 반대로 빠집니다. 구동륜 방향은 계기판에서 봅니다.',
    marker:{x:-11.0, z:8.60},
    check:()=> near(-11.0, 8.60, 2.0) && Math.abs(truck.v) < 0.35
  },
  {
    title:'포크를 올렸다가 주행 자세로 되돌리기',
    desc:'레버는 왼쪽부터 리프트, 틸트, 리치입니다. 1.5m까지 올렸다가 다시 주행 자세로 내리세요. 높이 든 채 통로를 달리는 것이 사고의 가장 큰 원인입니다.',
    check:()=>{
      if(truck.lift > 1.45) G.flags.up = true;
      return G.flags.up && truck.lift > 0.14 && truck.lift < 0.32 && Math.abs(truck.v) < 0.2;
    }
  },
  {
    title:'2F-C1-1-1 팔레트를 포크에 싣기',
    desc:'팔레트에서 2.5m쯤 앞에 정지한 뒤, 리치를 끝까지 내밀어 꽂습니다. 앞다리는 팔레트 밑으로 들어가지 못하므로 차체로 밀고 들어가면 팔레트만 밀려납니다. 조금 틀어진 것은 지겟발로 밀어 맞춰도 됩니다.',
    highlight:'2F-C1-1-1',
    check:()=> truck.carry && truck.carry === G.flags.p
  },
  {
    title:'후경으로 당겨 2F-C1-3-1 로 옮기기',
    desc:'후경으로 당기고 포크를 낮춰 이동합니다. 내리기 전에 마스트를 수평으로 되돌리세요.',
    highlight:'2F-C1-3-1',
    check:()=> place('2F-C1-3-1').pallet === G.flags.p && !truck.carry
  },
  {
    title:'같은 팔레트를 2F-A1-4-2 에 적재',
    desc:'정지 → 단보다 조금 위로 → 마스트 수평 → 리치 아웃 → 포크 하강. 게이지에 자리와 여유 높이가 나옵니다.',
    highlight:'2F-A1-4-2',
    check:()=> place('2F-A1-4-2').pallet === G.flags.p && !truck.carry
  },
  {
    title:'2F-A1-2-2 팔레트를 꺼내 2F-C1-2-1 에 놓기',
    desc:'살짝만 든 상태로 리치를 넣으면 팔레트가 걸려 빠집니다. 충분히 들어올린 다음 넣으세요.',
    highlight:'2F-A1-2-2',
    check:()=>{
      const z = place('2F-C1-2-1');
      return z.pallet && z.pallet === G.flags.p2 && !truck.carry;
    }
  },
  {
    title:'교차로에서 정지하고 경적',
    desc:'통로 끝 교차로에는 정지선이 있습니다. 완전히 정지한 뒤 경적을 울리고, 보행자가 지나가면 진행합니다. 표시된 교차로를 그렇게 통과하세요.',
    marker:{x:36.5, z:21.0},
    check:()=> !!G.flags.xed
  },
  {
    title:'하역 절차 — 리치 인, 하강, 후진',
    desc:'2F-C1-2-1 파렛트를 2F-A1-3-2 에 올린 뒤, 리치를 넣고 포크를 내린 다음에 후진합니다. 리치를 뺀 채 후진하면 옆 파렛트를 긁고, 포크를 올린 채 후진하면 빔에 걸립니다.',
    highlight:'2F-A1-3-2',
    check:()=> place('2F-A1-3-2').pallet && !truck.carry && !G.postDrop && truck.reach < 0.12 && truck.lift < 1.95
  },
  {
    title:'붙은 파렛트 떼어내기',
    desc:'2F-A1-6-2 파렛트는 옆 파렛트와 랩이 붙어 있습니다. 꽂은 채로 핸들을 살짝 돌려 3~8° 틀어 랩을 떼고 나서 들어올리세요. 게이지에 붙음 표시가 사라지면 됩니다.',
    highlight:'2F-A1-6-2',
    check:()=> truck.carry && G.flags.p3 && truck.carry === G.flags.p3
  },
  {
    title:'랩핑 후 적재',
    desc:'들고 있는 파렛트를 2F-C1-5-1 에 내려놓고, 랩 버튼으로 랩핑한 뒤 2F-A1-4-3 에 적재하세요. 미랩핑 파렛트를 랙에 올리면 지적입니다.',
    highlight:'2F-A1-4-3',
    check:()=> place('2F-A1-4-3').pallet && place('2F-A1-4-3').pallet.wrap === 'full' && !truck.carry
  },
  {
    title:'충전 구역으로 이동해 충전',
    desc:'충전 구역 안에 세우고 브레이크를 뗀 뒤, 포크 하강 · 리치 인 하면 절차가 시작됩니다.',
    marker:{x:CHARGE.x, z:CHARGE.z},
    charge:true,
    check:()=> !!G.flags.charged
  }
];

function startStep(){
  G.flags = {};
  if(G.mode === 'edu') eduSave();
  const st = TUT[G.step];
  if(!st) return;
  if(G.step === 4) G.flags.p = pal('2F-C1-1-1');
  if(G.step === 5) G.flags.p = truck.carry || pal('2F-C1-1-1');
  if(G.step === 6) G.flags.p = pal('2F-C1-3-1') || truck.carry;
  if(G.step === 7) G.flags.p2 = pal('2F-A1-2-2');
  if(G.step === 8){ G.flags.xed = false; INTER.cur = null; }
  if(G.step === 10){
    // 붙은 파렛트 세팅 — A1-6-2 에 미랩핑이 아닌 파렛트를 두고 양옆에 붙인다
    const mk = (id, cargo, seed)=>{ const s0 = place(id); if(!s0) return null; if(s0.pallet) removePallet(s0.pallet);
      const q = createPallet({ kind:'aj', cargo:cargo, wrap:'full', seed:seed }, { x:s0.x, z:s0.z, y:s0.y, yaw:0 }); q.slot = s0; s0.pallet = q; q.pickY = s0.y; q.adh = 1.0; return q; };
    G.flags.p3 = mk('2F-A1-6-2', 'water', 41); mk('2F-A1-5-2', 'water', 42); mk('2F-A1-7-2', 'oil', 43);
  }
  if(G.step === 11){
    if(truck.carry) setWrap(truck.carry, 'none');
    else { const q = G.flags.p3; if(q) setWrap(q, 'none'); }
  }
  if(st.charge && G.batt > 50) G.batt = 42;

  targetRing.visible = !!st.marker;
  targetPost.visible = !!st.marker;
  if(st.marker){
    targetRing.position.set(st.marker.x, 0.008, st.marker.z);
    targetPost.position.set(st.marker.x, 3.5, st.marker.z);
  }
  setHighlight(st.highlight);
  showTask('교육 ' + (G.step+1) + ' / ' + TUT.length, st.title, st.desc);
}

function posGhost(x, y, z){
  slotGhost.visible = true;
  slotGhost.position.set(x, y + 0.45, z);
  const top = Math.max(y + 0.45, 0.85);
  ghostBeam.scale.y = top;
  ghostBeam.position.set(x, top/2, z);
  ghostRing.position.set(x, 0.016, z);
}
function setHighlight(id){
  G.ghostId = id || null;
  if(!id){ slotGhost.visible = false; return; }
  const s = place(id);
  if(!s){ slotGhost.visible = false; return; }
  posGhost(s.x, s.y, s.z);
}

/* ============================================================
   작업
   ============================================================ */
function startChargeStep(){
  G.mission = null; G.chargeStep = true;
  slotGhost.visible = false;
  targetRing.visible = true; targetPost.visible = true;
  targetRing.position.set(CHARGE.x, 0.008, CHARGE.z);
  targetPost.position.set(CHARGE.x, 3.5, CHARGE.z);
  showTask('마지막 순서', '충전 구역으로 이동해 충전',
    '구역 안에 세우고 브레이크를 뗀 뒤, 포크 하강 · 리치 인 하면 절차가 시작됩니다.');
}

/* ============================================================
   교육 모드 — 시업점검 + 운행 실습 + 이어하기
   ============================================================ */
function eduKey(){ return EDU_KEY + ':' + (G.playerName || 'guest'); }
function eduSave(){
  try{
    window.localStorage.setItem(eduKey(), JSON.stringify({
      step: G.step, damage: G.damage, fault: G.fault, time: Math.round(G.time),
      miss: G.inspMiss, hit: G.inspHit, defects: Object.keys(G.defects),
      first: false
    }));
  }catch(e){}
}
function eduLoad(){
  try{
    const raw = window.localStorage.getItem(eduKey());
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function eduClear(){ try{ window.localStorage.removeItem(eduKey()); }catch(e){} }

function eduMenuSheet(){
  const sv = eduLoad();
  const cont = sv && sv.step > 0 && sv.step < TUT.length
    ? '<div class="sub">' + esc(G.playerName || '이름 없이') + ' · ' + (sv.step + 1) + '단계까지 진행했습니다</div>'
    : '<div class="sub">시업점검부터 운행 실습까지 한 번에 진행합니다</div>';
  return '<h1>교육 모드</h1>' + cont + '<ul>' +
    '<li><b>교육 과정</b> 시업점검부터 충전까지 ' + TUT.length + '단계</li>' +
    '<li><b>꽂기 연습</b> 지겟발 맞추기만 ' + PICK_LEVELS.length + '단계 · 감점 없음</li>' +
    '<li>주행은 <b>연습장</b>의 자격시험 코스와 검지선 코스에서</li>' +
    '</ul><div class="row">' +
    '<button class="btn primary" data-act="eduCourse">교육 과정</button>' +
    '<button class="btn" data-act="drillPick">꽂기 연습</button>' +
    '<button class="btn" data-act="practiceMenu">연습장</button>' +
    '<button class="btn" id="btnBack">돌아가기</button></div>';
}

function eduEnter(){
  readMenuName();
  const sv = eduLoad();
  if(sv && sv.step > 0 && sv.step < TUT.length){
    showSheet('<h1>이어서 하기</h1>' +
      '<div class="sub">' + esc(G.playerName || '이름 없이') + ' · ' +
      (sv.step + 1) + '단계까지 진행했습니다</div>' +
      '<div class="row"><button class="btn primary" data-act="eduResume">이어서 하기</button>' +
      '<button class="btn" data-act="eduRestart">처음부터</button></div>');
    return;
  }
  eduBegin(!sv);
}

function eduBegin(firstTime){
  hideSheet(); enterMode();
  G.mode = 'edu'; G.step = 0; G.time = 0; G.damage = 0; G.fault = 0;
  G.inspMiss = 0; G.inspHit = 0; G.defects = {}; G.defectSeen = {};
  G.running = false;
  applyTime(2);
  resetWorld({ ext:0, unwrap:0, cargos:['water','veg','oil'] }, mulberry(31));
  showTask('교육', '시업점검', '운행 전에 장비 상태부터 확인합니다.');
  inspStart(firstTime);
}

function eduResume(){
  const sv = eduLoad();
  hideSheet(); enterMode();
  G.mode = 'edu';
  resetWorld({ ext:0, unwrap:0, cargos:['water','veg','oil'] }, mulberry(31));
  applyTime(2);
  G.step = sv ? (sv.step || 0) : 0;
  G.damage = sv ? (sv.damage || 0) : 0;
  G.fault = sv ? (sv.fault || 0) : 0;
  G.time = sv ? (sv.time || 0) : 0;
  G.inspMiss = sv ? (sv.miss || 0) : 0;
  G.inspHit = sv ? (sv.hit || 0) : 0;
  G.defects = {}; G.defectSeen = {};
  if(sv && sv.defects) sv.defects.forEach(k=> G.defects[k] = true);
  G.running = true;
  startStep();
}

function eduDrive(){
  hideSheet();
  G.inspMiss = INSP.miss; G.inspHit = INSP.hit;
  G.step = 0; G.running = true;
  eduSave();
  startStep();
}

function eduFinish(){
  G.running = false; G.mode = 'done';
  targetRing.visible = false; targetPost.visible = false; slotGhost.visible = false;
  const pass = G.inspMiss === 0 && G.damage <= 1 && G.fault <= 4;
  if(pass) eduClear(); else eduSave();
  const head = pass
    ? '<h1>수료</h1><div class="sub">점검을 모두 통과하고 파손 ' + G.damage + '건, 지적 ' + G.fault + '건으로 마쳤습니다</div>'
    : '<h1>미수료</h1><div class="sub">못 찾은 결함 ' + G.inspMiss + '건, 파손 ' + G.damage + '건, 지적 ' + G.fault + '건</div>';
  const detail = '<table class="calc"><tbody>' +
    '<tr><td>시업점검 정답</td><td class="num">' + G.inspHit + ' / ' + DEFECTS.length + '</td></tr>' +
    '<tr><td>못 찾은 결함</td><td class="num">' + G.inspMiss + '</td></tr>' +
    '<tr><td>운행 중 파손</td><td class="num">' + G.damage + '</td></tr>' +
    '<tr><td>운행 중 지적</td><td class="num">' + G.fault + '</td></tr>' +
    '<tr class="sum"><td>소요 시간</td><td class="num">' + fmtTime(G.time) + '</td></tr>' +
    '</tbody></table>' +
    '<div class="sub">수료 기준 · 못 찾은 결함 0건, 파손 1건 이하, 지적 4건 이하</div>';
  const foot = pass
    ? '<div class="namebox"><input id="certName" type="text" maxlength="12" placeholder="이름" value="' + esc(G.playerName) + '"></div>' +
      '<div class="row"><button class="btn primary" data-act="cert">수료자 명단에 등록</button>' +
      '<button class="btn" id="btnMis">작업하기</button></div>'
    : '<div class="row"><button class="btn primary" data-act="eduRestart">처음부터 다시</button>' +
      '<button class="btn" id="btnBack">메뉴</button></div>';
  showSheet(head + detail + foot);
}

