"use strict";

/* ============================================================
   운전자 — 맨살에 형광조끼 입은 아저씨. 운전석에 서 있다가
   시업점검·랩핑·사고 때 내려온다.
   ============================================================ */
const DRV = { mesh:null, state:'ride', t:0, target:null, pallet:null, laps:0, film:null, face:null, faceTex:{},
              walkPhase:0, onDone:null, arms:null, legs:null, roll:null, uiBtn:null };

function makeDriverMesh(){
  const g = new THREE.Group();
  const skin = mat(0xE0B48C, 0.75), belly = mat(0xE6BC96, 0.7);
  const vestM = mat(0xFF7A1A, 0.6), stripe = new THREE.MeshStandardMaterial({ color:0xE8E8E2, roughness:0.3, emissive:0x333333 });
  const pants = mat(0x4A5560, 0.85), boot = mat(0x2A2F36, 0.7), glove = mat(0xF3F4F6, 0.8), helmet = mat(0xF6F7F9, 0.35, 0.1);
  // 다리
  const legs = [];
  for(const sx of [-0.11, 0.11]){
    const lg = new THREE.Group(); lg.position.set(sx, 0.78, 0);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 10), pants); th.position.y = -0.21; lg.add(th);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 10), pants); sh.position.y = -0.58; lg.add(sh);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.26), boot); bt.position.set(0, -0.78, 0.05); lg.add(bt);
    g.add(lg); legs.push(lg);
  }
  // 몸통 — 배 나온 맨몸
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), belly);
  torso.scale.set(0.95, 1.05, 0.85); torso.position.y = 1.02; torso.castShadow = true; g.add(torso);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.30, 12), skin);
  chest.position.y = 1.28; g.add(chest);
  const navel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), mat(0xC8966E, 0.9)); navel.position.set(0, 1.00, 0.235); g.add(navel);
  // 조끼 — 앞판 두 장(배 사이로 벌어짐) + 뒤판 + 어깨끈
  for(const sx of [-1, 1]){
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.03), vestM);
    fr.position.set(sx*0.15, 1.20, 0.245); fr.rotation.y = sx*0.35; g.add(fr);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.035), stripe);
    st.position.set(sx*0.15, 1.10, 0.262); st.rotation.y = sx*0.35; g.add(st);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.30), vestM);
    sh.position.set(sx*0.15, 1.44, 0.0); g.add(sh);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.03), vestM);
  back.position.set(0, 1.20, -0.23); g.add(back);
  const bst = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.035), stripe); bst.position.set(0, 1.10, -0.245); g.add(bst);
  // 팔
  const arms = [];
  for(const sx of [-1, 1]){
    const ar = new THREE.Group(); ar.position.set(sx*0.26, 1.40, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.30, 10), skin); up.position.y = -0.15; ar.add(up);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 10), skin); fo.position.y = -0.42; ar.add(fo);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glove); gl.position.y = -0.58; ar.add(gl);
    g.add(ar); arms.push(ar);
  }
  // 머리·안전모·얼굴
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skin); head.position.y = 1.66; head.castShadow = true; g.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 10, 0, Math.PI*2, 0, Math.PI*0.55), helmet); hm.position.y = 1.69; g.add(hm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 16), helmet); brim.position.set(0, 1.66, 0.02); g.add(brim);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshBasicMaterial({ map:faceTex('calm'), transparent:true }));
  face.position.set(0, 1.64, 0.158); g.add(face); DRV.face = face;
  const stubble = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI*2, Math.PI*0.6, Math.PI*0.4), mat(0xB89066, 0.9));
  stubble.position.set(0, 1.62, 0.05); g.add(stubble);
  // 랩 롤 (손에 들 때만)
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 12), new THREE.MeshStandardMaterial({ color:0xF4F8FC, transparent:true, opacity:0.75, roughness:0.2 }));
  roll.visible = false; g.add(roll); DRV.roll = roll;
  DRV.arms = arms; DRV.legs = legs;
  return g;
}
function faceTex(kind){
  if(DRV.faceTex[kind]) return DRV.faceTex[kind];
  const c = document.createElement('canvas'); c.width = 110; c.height = 80;
  const g = c.getContext('2d');
  g.clearRect(0,0,110,80);
  g.fillStyle = '#2A2F36';
  // 눈썹
  g.lineWidth = 6; g.strokeStyle = '#2A2F36'; g.lineCap = 'round';
  const tilt = kind === 'tense' ? -6 : (kind === 'oops' ? 8 : 0);
  g.beginPath(); g.moveTo(20, 24 + tilt); g.lineTo(42, 22 - tilt); g.stroke();
  g.beginPath(); g.moveTo(68, 22 - tilt); g.lineTo(90, 24 + tilt); g.stroke();
  // 눈
  g.beginPath(); g.arc(32, 38, kind === 'oops' ? 6 : 4.5, 0, Math.PI*2); g.fill();
  g.beginPath(); g.arc(78, 38, kind === 'oops' ? 6 : 4.5, 0, Math.PI*2); g.fill();
  // 입
  g.lineWidth = 4; g.beginPath();
  if(kind === 'calm'){ g.moveTo(42, 60); g.quadraticCurveTo(55, 68, 68, 60); }
  else if(kind === 'tense'){ g.moveTo(42, 63); g.lineTo(68, 63); }
  else { g.arc(55, 62, 8, 0, Math.PI*2); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  DRV.faceTex[kind] = t; return t;
}
function driverFace(kind){ if(DRV.face) DRV.face.material.map = faceTex(kind); }

/* 지게차에 달린 랩집 */
function makeWrapHolster(){
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.16, 12, 1, true), new THREE.MeshStandardMaterial({ color:0x272E38, roughness:0.7, side:THREE.DoubleSide }));
  cup.position.y = 0.08; g.add(cup);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.50, 12), new THREE.MeshStandardMaterial({ color:0xF4F8FC, transparent:true, opacity:0.78, roughness:0.2 }));
  roll.position.y = 0.33; g.add(roll);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), mat(0x8B6E3C, 0.8)); core.position.y = 0.33; g.add(core);
  return g;
}

function initDriver(){
  DRV.mesh = makeDriverMesh();
  DRV.mesh.visible = false;
  scene.add(DRV.mesh);
  DRV.uiBtn = document.getElementById('wrapBtn');
}

/* 랩핑 조건 — 정지, 브레이크 뗌, 짐 없음, 앞 3m 안에 미랩핑 파렛트 */
function wrapCandidate(){
  if(truck.carry || G.pedal || Math.abs(truck.v) > 0.05) return null;
  let best = null, bd = 3.0;
  for(const p of pallets){
    if(p.carried || p.falling || p.broken || p.h <= 0 || p.wrap === 'full') continue;
    if(p.slot && p.slot.y > 0.2) continue;
    const dx = p.x - truck.x, dz = p.z - truck.z;
    const lon = dx*dirX(truck.h) + dz*dirZ(truck.h);
    const d = Math.hypot(dx, dz);
    if(lon < 0.8 || d > bd) continue;
    bd = d; best = p;
  }
  return best;
}
function startWrap(){
  if(DRV.state !== 'ride') return;
  const p = wrapCandidate();
  if(!p){ toast('랩핑할 파렛트가 앞에 없습니다'); return; }
  DRV.pallet = p; DRV.state = 'walkTo'; DRV.t = 0; DRV.laps = 0;
  DRV.mesh.visible = true;
  DRV.mesh.position.set(truck.x - dirX(truck.h)*0.9, 0, truck.z - dirZ(truck.h)*0.9);
  DRV.roll.visible = true;
  G.busy = true;
  setPedal(false); releaseLevers();
  const film = new THREE.Mesh(new THREE.BoxGeometry(Math.min(PAL_KINDS[p.kind].w, 1.1), 0.01, Math.min(PAL_KINDS[p.kind].d, 1.1)), filmMat());
  film.position.set(0, PAL_KINDS[p.kind].h + (p.stack ? PAL_KINDS[p.stack.kind].h : 0), 0);
  p.mesh.add(film); DRV.film = film;
  if(p.film){ p.mesh.remove(p.film); p.film = null; }
  statAdd('wrapN', 1);
}
function tickDriver(dt){
  if(DRV.state === 'ride') return;
  DRV.t += dt;
  const p = DRV.pallet;
  const m = DRV.mesh;
  const walk = (tx, tz, spd)=>{
    const dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz);
    if(d < 0.05) return true;
    const s = Math.min(d, spd*dt);
    m.position.x += dx/d*s; m.position.z += dz/d*s;
    m.rotation.y = Math.atan2(dx, dz);
    DRV.walkPhase += dt*9;
    for(let i=0;i<2;i++){ DRV.legs[i].rotation.x = Math.sin(DRV.walkPhase + i*Math.PI)*0.6; DRV.arms[i].rotation.x = Math.sin(DRV.walkPhase + (1-i)*Math.PI)*0.5; }
    return false;
  };
  if(DRV.state === 'walkTo'){
    const R = palletHalfW(p) + 0.55;
    const tx = p.x + Math.sin(p.yaw)*R*-1, tz = p.z + Math.cos(p.yaw)*R*-1;
    if(walk(tx, tz, 1.6)){ DRV.state = 'wrap'; DRV.t = 0; DRV.ang = Math.atan2(m.position.x - p.x, m.position.z - p.z); }
  }else if(DRV.state === 'wrap'){
    const total = p.wrap === 'partial' ? 1.5 : 3.0;
    const speed = 1.15;             // 바퀴/초
    DRV.ang += speed*Math.PI*2*dt;
    const R = palletHalfW(p) + 0.55;
    m.position.x = p.x + Math.sin(DRV.ang)*R; m.position.z = p.z + Math.cos(DRV.ang)*R;
    m.rotation.y = DRV.ang + Math.PI/2;
    DRV.walkPhase += dt*10;
    for(let i=0;i<2;i++) DRV.legs[i].rotation.x = Math.sin(DRV.walkPhase + i*Math.PI)*0.55;
    // 팔 — 롤을 파렛트 쪽으로 내밀고 높이가 올라간다
    const prog = clamp(DRV.t*speed/total, 0, 1);
    const hy = 0.25 + prog*(p.h + 0.1);
    DRV.arms[0].rotation.x = -1.3; DRV.arms[1].rotation.x = -1.4;
    DRV.roll.position.set(-0.25, 0.85 + (hy - 0.6)*0.8, 0.40); DRV.roll.rotation.z = 0.15;
    if(DRV.film){ const h = Math.max(0.01, prog*(p.h + 0.04)); DRV.film.scale.y = h/0.01; DRV.film.position.y = PAL_KINDS[p.kind].h + (p.stack ? PAL_KINDS[p.stack.kind].h : 0) + h/2; }
    if(!DRV.snd || DRV.snd <= 0){ DRV.snd = 0.28; blip(180 + Math.random()*60, 0.10, 'sawtooth', 0.02); }
    DRV.snd -= dt;
    if(prog >= 1){ DRV.state = 'walkBack'; p.mesh.remove(DRV.film); DRV.film = null; setWrap(p, 'full'); p.adh = 0; }
  }else if(DRV.state === 'walkBack'){
    const tx = truck.x - dirX(truck.h)*0.9, tz = truck.z - dirZ(truck.h)*0.9;
    if(walk(tx, tz, 1.8)){ DRV.state = 'ride'; m.visible = false; DRV.roll.visible = false; G.busy = false; toast('랩핑 완료', true); blip(760, 0.12, 'triangle', 0.05); }
  }else if(DRV.state === 'inspect' || DRV.state === 'oops'){
    // 차 옆에 서서 두리번
    m.rotation.y += Math.sin(DRV.t*1.3)*dt*0.4;
    DRV.arms[1].rotation.x = DRV.state === 'oops' ? -2.6 + Math.sin(DRV.t*6)*0.15 : -0.3;
    DRV.arms[0].rotation.x = -0.2;
  }
}
/* 사고 후 — 내려서 머리 긁기 */
function driverOops(){
  if(!DRV.mesh) return;
  DRV.state = 'oops'; DRV.t = 0;
  DRV.mesh.visible = true; DRV.roll.visible = false;
  DRV.mesh.position.set(truck.x - dirX(truck.h)*1.0 + nrmX(truck.h)*0.9, 0, truck.z - dirZ(truck.h)*1.0 + nrmZ(truck.h)*0.9);
  DRV.mesh.rotation.y = truck.h;
  driverFace('oops');
}
function driverReset(){
  if(!DRV.mesh) return;
  DRV.state = 'ride'; DRV.mesh.visible = false; DRV.roll.visible = false; G.busy = false;
  if(DRV.film && DRV.pallet){ DRV.pallet.mesh.remove(DRV.film); DRV.film = null; }
  driverFace('calm');
}
/* 운전석에 서 있는 모습 — 쿼터뷰·지겟발 시점에서만. 차체 그룹에 붙인 별도 인스턴스 */
function makeCabDriver(){
  const d = makeDriverMesh();
  d.scale.set(0.92, 0.92, 0.92);
  d.position.set(0.02, 0.18, -0.55);
  d.rotation.y = 0;
  return d;
}
function updateWrapButton(){
  if(!DRV.uiBtn) return;
  const can = G.running && DRV.state === 'ride' && !!wrapCandidate() && G.mode !== 'drill';
  DRV.uiBtn.classList.toggle('can', can);
  DRV.uiBtn.disabled = !can;
}
