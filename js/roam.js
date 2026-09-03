/* ============================================================
   지도 · 배회
   ============================================================ */
function cellKey(x, z){
  return Math.floor((x + 48)/CELL) + ',' + Math.floor((z + 12)/CELL);
}
const INDOOR_CELLS = (function(){
  const set = {};
  for(let x=-IN.x; x<=IN.x; x+=2) for(let z=IN.z0; z<=IN.z1; z+=2) set[cellKey(x, z)] = 1;
  return Object.keys(set);
})();

function markCell(){
  const k = cellKey(truck.x, truck.z);
  if(!G.cells[k]){
    G.cells[k] = 1;
    if(!G.outUnlocked && exploreRate() >= UNLOCK_RATE){
      G.outUnlocked = true;
      toast('도크 셔터가 열렸습니다', true);
      blip(660, 0.18, 'sine', 0.06);
      setTimeout(()=> blip(990, 0.26, 'sine', 0.05), 170);
      saveRoam();
    }
  }
}
function exploreRate(){
  let n = 0;
  for(const k of INDOOR_CELLS) if(G.cells[k]) n++;
  return n / INDOOR_CELLS.length;
}

function pickGoal(){
  const pool = slots.filter(s=> s.y === 0 && !s.practice).concat(zones);
  for(let i=0;i<40;i++){
    const c = pool[Math.floor(Math.random()*pool.length)];
    if(c && Math.hypot(c.x - truck.x, c.z - truck.z) > 22) return c;
  }
  return pool[0];
}
function updateGoal(){
  if(G.mode !== 'roam') return;
  if(!G.goal) G.goal = pickGoal();
  const d = Math.hypot(truck.x - G.goal.x, truck.z - G.goal.z);
  if(d < 3.5){
    G.found++;
    toast(G.goal.id + ' 도착', true);
    blip(820, 0.14, 'triangle', 0.05);
    G.goal = pickGoal();
    saveRoam();
  }
}
function updateDiscoveries(){
  for(const d of discMeshes){
    const got = !!G.disc[d.def.id];
    d.halo.visible = !got;
    if(!got && Math.hypot(truck.x - d.def.x, truck.z - d.def.z) < 2.6){
      G.disc[d.def.id] = 1;
      toast('발견 · ' + d.def.name, true);
      blip(700, 0.16, 'sine', 0.055);
      setTimeout(()=> blip(1050, 0.20, 'sine', 0.045), 150);
      saveRoam();
    }
  }
}

function roamStoreKey(){ return ROAM_KEY + ':' + (G.playerName || 'guest'); }
function saveRoam(){
  try{
    window.localStorage.setItem(roamStoreKey(), JSON.stringify({
      cells: Object.keys(G.cells), dist: Math.round(G.dist),
      found: G.found, disc: Object.keys(G.disc), out: G.outUnlocked
    }));
  }catch(e){}
}
function loadRoam(){
  G.cells = {}; G.dist = 0; G.found = 0; G.disc = {}; G.outUnlocked = false;
  try{
    const raw = window.localStorage.getItem(roamStoreKey());
    if(!raw) return;
    const v = JSON.parse(raw);
    (v.cells || []).forEach(k=> G.cells[k] = 1);
    (v.disc || []).forEach(k=> G.disc[k] = 1);
    G.dist = v.dist || 0; G.found = v.found || 0; G.outUnlocked = !!v.out;
  }catch(e){}
}

const miniCtx = document.getElementById('mini').getContext('2d');
function drawMini(){
  const W = 364, H = 300;
  const x0 = -48, x1 = 48, z0 = -12, z1 = 144;
  const sx = W/(x1-x0), sz = H/(z1-z0);
  const px = x => (x - x0)*sx, pz = z => (z - z0)*sz;

  miniCtx.clearRect(0,0,W,H);
  miniCtx.fillStyle = '#E3EAF1'; miniCtx.fillRect(0,0,W,H);

  // 탐사한 칸
  miniCtx.fillStyle = '#CBDCEA';
  for(const k in G.cells){
    const p = k.split(',');
    const cx = (+p[0])*CELL - 48, cz = (+p[1])*CELL - 12;
    miniCtx.fillRect(px(cx), pz(cz), CELL*sx, CELL*sz);
  }

  // 연습장
  miniCtx.strokeStyle = '#C8A85E'; miniCtx.lineWidth = 1.5;
  miniCtx.setLineDash([4,3]);
  miniCtx.strokeRect(px(YARD.x0), pz(YARD.z0), (YARD.x1-YARD.x0)*sx, (YARD.z1-YARD.z0)*sz);
  miniCtx.setLineDash([]);

  // 랙
  miniCtx.fillStyle = '#B0684E';
  for(const row of ALL_ROWS){
    const w = row.n*2.7;
    miniCtx.fillRect(px(row.x0 - 1.35), pz(row.z) - 2, w*sx, 4);
  }
  // 평치
  miniCtx.fillStyle = '#C8A85E';
  for(const z of zones) miniCtx.fillRect(px(z.x)-2, pz(z.z)-2, 4, 4);

  // 벽 · 셔터
  miniCtx.strokeStyle = '#8A96A2'; miniCtx.lineWidth = 2;
  miniCtx.strokeRect(px(-42), pz(-6.5), 84*sx, (WALL_Z+6.5)*sz);
  miniCtx.fillStyle = G.outUnlocked ? '#17A673' : '#9AA5AE';
  for(const gx of GATES) miniCtx.fillRect(px(gx)-3.5, pz(WALL_Z)-2, 7, 4);

  // 도로
  miniCtx.fillStyle = '#8E959C';
  miniCtx.fillRect(0, pz(ROAD.z0), W, (ROAD.z1-ROAD.z0)*sz);

  // 충전 구역
  miniCtx.fillStyle = '#F2B705';
  miniCtx.fillRect(px(CHARGE.x)-4, pz(CHARGE.z)-4, 8, 8);
  miniCtx.strokeStyle = '#8B6E06'; miniCtx.lineWidth = 1.4;
  miniCtx.strokeRect(px(CHARGE.x)-4, pz(CHARGE.z)-4, 8, 8);

  // 발견물
  for(const d of discMeshes){
    miniCtx.fillStyle = G.disc[d.def.id] ? '#17A673' : '#F2B705';
    miniCtx.beginPath(); miniCtx.arc(px(d.def.x), pz(d.def.z), 3.4, 0, 7); miniCtx.fill();
  }

  // 목표
  if(G.goal){
    miniCtx.strokeStyle = '#1A73E8'; miniCtx.lineWidth = 2;
    miniCtx.beginPath(); miniCtx.arc(px(G.goal.x), pz(G.goal.z), 6, 0, 7); miniCtx.stroke();
  }

  // 지게차
  miniCtx.save();
  miniCtx.translate(px(truck.x), pz(truck.z));
  miniCtx.rotate(-truck.h);
  miniCtx.fillStyle = '#E03B36';
  miniCtx.beginPath();
  miniCtx.moveTo(0, -7); miniCtx.lineTo(5, 6); miniCtx.lineTo(-5, 6);
  miniCtx.closePath(); miniCtx.fill();
  miniCtx.restore();
}

function updateRoamPanel(dt){
  if(G.mode !== 'roam') return;
  if(G.showMap){
    G.miniT -= dt;
    if(G.miniT <= 0){ G.miniT = 0.25; drawMini(); }
  }
  const rate = exploreRate();
  const ex = document.getElementById('rExp');
  ex.textContent = Math.round(rate*100) + '%';
  ex.className = 'v' + (G.outUnlocked ? ' ok' : '');
  document.getElementById('rDist').textContent = fmtDist(G.dist);
  document.getElementById('rGrade').textContent = gradeOf(G.dist);
  let dn = 0; for(const k in G.disc) dn++;
  document.getElementById('rDisc').textContent = dn + ' / ' + DISCOVERIES.length;
  document.getElementById('rGoal').textContent = G.goal ? G.goal.id : '-';
  document.getElementById('rGoalD').textContent = G.goal
    ? Math.round(Math.hypot(truck.x - G.goal.x, truck.z - G.goal.z)) + 'm · 누적 ' + G.found + '곳'
    : '';
}

