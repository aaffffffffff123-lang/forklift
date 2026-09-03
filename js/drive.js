"use strict";

/* ============================================================
   드라이브 — 속도 제한 없이 떠돈다. 점수 없음.
   속도전 고스트 · 일일 과제
   ============================================================ */
const DRIVE_KEY = 'forklift_drive_v1';
const WEATHERS = [
  { n:'맑음', mu:1.0, fog:1.0 }, { n:'흐림', mu:1.0, fog:0.8, dim:0.7 }, { n:'비', mu:0.7, fog:0.6, dim:0.55, rain:true }
];
const DV = { dist:0, weather:null, rain:null, tipT:0 };

function startDrive(){
  hideSheet(); enterMode();
  G.mode = 'drive'; G.time = 0; G.damage = 0; G.fault = 0; G.chargeStep = false; G.defects = {}; G.defectSeen = {}; G.mission = null;
  targetRing.visible = false; targetPost.visible = false; slotGhost.visible = false;
  resetWorld({ ext:0, unwrap:0.1, cargos:CARGO_ORDER });
  try{ DV.dist = parseFloat(window.localStorage.getItem(DRIVE_KEY) || '0') || 0; }catch(e){ DV.dist = 0; }
  G.outUnlocked = true; G.shutterT = 8.4;
  const tn = applyTime(Math.floor(Math.random()*TIMES.length));
  DV.weather = WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
  if(DV.weather.dim){ sunLight.intensity *= DV.weather.dim; }
  scene.fog.far *= DV.weather.fog;
  setRain(!!DV.weather.rain);
  G.speedMul = 3.2;
  truck.x = 0; truck.z = 96; truck.h = Math.PI/2;
  camera.userData.tx = truck.x; camera.userData.tz = truck.z;
  G.running = true;
  applyLayout();
  showTask('드라이브', tn + ' · ' + DV.weather.n, '점수도 지적도 없습니다. 셔터는 열려 있고 바깥에 순환 도로가 있습니다.<br>누적 ' + fmtDist(DV.dist));
}
function setRain(on){
  if(DV.rain){ scene.remove(DV.rain); DV.rain = null; }
  if(!on) return;
  const n = 900, pos = new Float32Array(n*3);
  for(let i=0;i<n;i++){ pos[i*3] = (Math.random()-0.5)*60; pos[i*3+1] = Math.random()*14; pos[i*3+2] = (Math.random()-0.5)*60; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  DV.rain = new THREE.Points(g, new THREE.PointsMaterial({ color:0xC8D6E4, size:0.06, transparent:true, opacity:0.7 }));
  scene.add(DV.rain);
}
function tickDrive(dt){
  if(G.mode !== 'drive' && G.mode !== 'train') return;
  if(DV.rain && G.mode === 'drive'){
    const a = DV.rain.geometry.attributes.position.array;
    for(let i=0;i<a.length;i+=3){ a[i+1] -= 9*dt; if(a[i+1] < 0){ a[i+1] = 14; a[i] = (Math.random()-0.5)*60; a[i+2] = (Math.random()-0.5)*60; } }
    DV.rain.geometry.attributes.position.needsUpdate = true;
    DV.rain.position.set(truck.x, 0, truck.z);
    DV.rain.visible = truck.z > WALL_Z;
  }
  // 전도 — 고속 회전
  const tip = Math.abs(truck.v) * Math.abs(Math.sin(truck.steer)) * (1 + truck.lift*0.8);
  if(tip > 2.9 && DV.tipT <= 0){ DV.tipT = 3.0; tipOver(); G.driveTip = 3.0; truck.v = 0; }
  if(G.driveTip > 0){
    G.driveTip -= dt;
    truckGroup.rotation.z = -Math.sin(Math.min(1, (3 - G.driveTip)*2.5)) * 0.9;
    if(G.driveTip <= 0){ truckGroup.rotation.z = 0; driverReset(); toast('제자리에서 다시', true); }
  }
  DV.tipT = Math.max(0, DV.tipT - dt);
  if(G.mode === 'drive'){
    DV.dist += Math.abs(truck.v)*dt;
    if(Math.floor(G.time) % 10 === 0 && Math.floor(G.time) !== G.lastSaveS){ G.lastSaveS = Math.floor(G.time); try{ window.localStorage.setItem(DRIVE_KEY, String(Math.round(DV.dist))); }catch(e){} }
    trainUnlockCheck(dt);
  }
}
function driveMu(){ return (G.mode === 'drive' && DV.weather && truck.z > WALL_Z) ? DV.weather.mu : 1; }

/* ── 고스트 ── */
const GH = { rec:[], t:0, best:null, mesh:null, play:false };
function ghostKey(){ return 'forklift_ghost_v1:' + (G.mode === 'daily' ? 'daily:' + todayStr() : 'rush') + ':' + (G.playerName || 'guest'); }
function ghostStart(){
  GH.rec = []; GH.t = 0; GH.play = false;
  try{ const r = JSON.parse(window.localStorage.getItem(ghostKey()) || 'null'); GH.best = r && r.frames ? r : null; }catch(e){ GH.best = null; }
  if(!GH.mesh){
    GH.mesh = makeForklift();
    GH.mesh.traverse(o=>{ if(o.isMesh && o.material){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.32; o.material.depthWrite = false; o.castShadow = false; } });
    scene.add(GH.mesh);
  }
  GH.mesh.visible = !!GH.best;
  GH.play = !!GH.best;
}
function ghostTick(dt){
  if(G.mode !== 'rush' && G.mode !== 'daily'){ if(GH.mesh) GH.mesh.visible = false; return; }
  GH.t += dt;
  if(Math.floor(GH.t*10) !== Math.floor((GH.t - dt)*10)) GH.rec.push([+truck.x.toFixed(2), +truck.z.toFixed(2), +truck.h.toFixed(3), +truck.lift.toFixed(2), +truck.reach.toFixed(2)]);
  if(GH.play && GH.best){
    const fr = GH.best.frames, i = Math.min(fr.length - 1, Math.floor(GH.t*10));
    const f = fr[i];
    if(f){ GH.mesh.position.set(f[0], 0, f[1]); GH.mesh.rotation.y = f[2]; GH.mesh.visible = true; }
    if(i >= fr.length - 1) GH.mesh.visible = false;
  }
}
function ghostFinish(total){
  if(!GH.best || total < GH.best.total){
    try{ window.localStorage.setItem(ghostKey(), JSON.stringify({ total:total, frames:GH.rec })); }catch(e){}
    return true;
  }
  return false;
}

/* ── 일일 과제 — 날짜 시드로 같은 코스 ── */
function dailySeed(){ const d = new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); }
function dailyCourse(rng){
  const src = [], dst = [];
  for(const s of slots){ if(s.z < 40 && !s.practice){ if(s.pallet) src.push(s); else dst.push(s); } }
  for(const z of zones){ if(z.z < 40 && !z.stage && !z.inbound){ if(z.pallet) src.push(z); else dst.push(z); } }
  const out = [], used = new Set();
  let guard = 0;
  while(out.length < 5 && guard++ < 200){
    const a = src[Math.floor(rng()*src.length)], b = dst[Math.floor(rng()*dst.length)];
    if(!a || !b || used.has(a.id) || used.has(b.id)) continue;
    if(a.pallet && (a.pallet.topY || 0.15) > slotClear(b)) continue;
    used.add(a.id); used.add(b.id);
    out.push({ from:a.id, to:b.id });
  }
  return out;
}
function dailyStart(){
  readMenuName();
  hideSheet(); enterMode();
  G.mode = 'daily'; G.time = 0; G.damage = 0; G.fault = 0; G.rushIdx = 0; G.rushDone = false;
  G.defects = {}; G.defectSeen = {}; G.chargeStep = false; G.st = {};
  applyTime(2);
  const rng = mulberry(dailySeed());
  resetWorld({ ext:0, unwrap:0, cargos:['water','oil','bottle','frozen'] }, rng);
  G.dailyCourse = dailyCourse(rng);
  ghostStart();
  G.running = true;
  rushStep();
}
