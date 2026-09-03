"use strict";

/* ============================================================
   도크 — 화물엘베, 윙바디 트럭, 대기·입고 구역, 순환 도로
   ============================================================ */
const DOCK = { liftDoor:1, liftDoorT:1, liftClosing:false, wingOpen:true, wingT:1, truckMesh:null, wingMesh:null,
               liftDoorL:null, liftDoorR:null, hitCool:0, wingHere:true };

function buildDock(){
  const L = LIFT_ROOM;
  /* ── 화물엘베 ── */
  {
    const g = new THREE.Group();
    const wallM = mat(0x6F7A86, 0.85, 0.2);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L.x1 - L.x0, 0.04, L.z1 - L.z0), mat(0x4C545C, 0.9, 0.3));
    floor.position.set((L.x0+L.x1)/2, L.y, (L.z0+L.z1)/2); floor.receiveShadow = true; g.add(floor);
    const H = 3.0;
    const mk = (w, d, x, z)=>{ const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM); m.position.set(x, H/2, z); m.castShadow = true; g.add(m); };
    mk(0.12, L.z1 - L.z0 + 0.24, L.x1, (L.z0+L.z1)/2);            // 뒷벽
    mk(L.x1 - L.x0, 0.12, (L.x0+L.x1)/2, L.z0);                   // 옆벽
    mk(L.x1 - L.x0, 0.12, (L.x0+L.x1)/2, L.z1);
    mk(0.12, L.doorZ0 - L.z0 + 0.06, L.x0, (L.z0 + L.doorZ0)/2); // 문틀
    mk(0.12, L.z1 - L.doorZ1 + 0.06, L.x0, (L.doorZ1 + L.z1)/2);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, L.z1 - L.z0 + 0.24), wallM);
    lintel.position.set(L.x0, H - 0.25, (L.z0+L.z1)/2); g.add(lintel);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(L.x1 - L.x0, 0.08, L.z1 - L.z0), wallM);
    ceil.position.set((L.x0+L.x1)/2, H, (L.z0+L.z1)/2); g.add(ceil);
    // 문 두 짝
    const dw = (L.doorZ1 - L.doorZ0)/2;
    const dm = mat(0x9AA6B2, 0.55, 0.45);
    DOCK.liftDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.08, H - 0.5, dw), dm);
    DOCK.liftDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.08, H - 0.5, dw), dm);
    DOCK.liftDoorL.position.set(L.x0, (H-0.5)/2, L.doorZ0 + dw/2);
    DOCK.liftDoorR.position.set(L.x0, (H-0.5)/2, L.doorZ1 - dw/2);
    g.add(DOCK.liftDoorL); g.add(DOCK.liftDoorR);
    // 센서선·목표선 — 바닥 도색
    addPaint(L.sensorX, (L.z0+L.z1)/2, 0.08, L.z1 - L.z0 - 0.2, 0xF2B705);
    addPaint(L.line1, (L.z0+L.z1)/2, 0.06, L.z1 - L.z0 - 0.3, 0xE8E8E2);
    addPaint(L.line2, (L.z0+L.z1)/2, 0.06, L.z1 - L.z0 - 0.3, 0xE8E8E2);
    // 문 앞 대기선
    addPaint(L.x0 - 1.2, (L.z0+L.z1)/2, 0.10, 4.0, 0xF2B705);
    g.add(makeSign('화물엘베', 5.2, L.x0 - 0.6, (L.z0+L.z1)/2));
    scene.add(g);
  }
  /* ── 윙바디 ── */
  {
    const W = WING;
    const g = new THREE.Group();
    const body = mat(0xE9EDF1, 0.6, 0.2), dark = mat(0x2E3742, 0.7, 0.3), red = mat(0xC0453C, 0.6, 0.3);
    const len = W.z1 - W.z0, wid = W.x1 - W.x0;
    // 섀시·바퀴
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.3, 0.35, len + 0.4), dark);
    chassis.position.set((W.x0+W.x1)/2, 0.62, (W.z0+W.z1)/2); g.add(chassis);
    for(const zz of [W.z0 + 0.9, W.z0 + 2.1, W.z1 - 0.8]) for(const xx of [W.x0 + 0.25, W.x1 - 0.25]){
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), dark);
      wh.rotation.z = Math.PI/2; wh.position.set(xx, 0.5, zz); g.add(wh);
    }
    // 적재함 바닥·벽
    const floor = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.10, len), mat(0x6E5A3C, 0.9));
    floor.position.set((W.x0+W.x1)/2, W.y - 0.05, (W.z0+W.z1)/2); floor.receiveShadow = true; g.add(floor);
    const H = W.wingH - W.y;
    const far = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, len), body);
    far.position.set(W.x1, W.y + H/2, (W.z0+W.z1)/2); g.add(far);
    const front = new THREE.Mesh(new THREE.BoxGeometry(wid, H, 0.06), body);
    front.position.set((W.x0+W.x1)/2, W.y + H/2, W.z1); g.add(front);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(wid, H, 0.06), body);
    rear.position.set((W.x0+W.x1)/2, W.y + H/2, W.z0); g.add(rear);
    // 닫힌 쪽(동쪽) 윙 — 지붕 절반 + 옆판
    const roofE = new THREE.Mesh(new THREE.BoxGeometry(wid/2, 0.06, len), body);
    roofE.position.set(W.x1 - wid/4, W.wingH, (W.z0+W.z1)/2); g.add(roofE);
    // 열린 쪽(서쪽) 윙 — 지붕 절반과 옆판이 위로 젖혀진다
    const wing = new THREE.Group();
    wing.position.set((W.x0+W.x1)/2, W.wingH, (W.z0+W.z1)/2);
    const roofW = new THREE.Mesh(new THREE.BoxGeometry(wid/2, 0.06, len), body);
    roofW.position.set(-wid/4, 0, 0); wing.add(roofW);
    const sideW = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, len), body);
    sideW.position.set(-wid/2, -H/2, 0); wing.add(sideW);
    wing.rotation.z = -1.35;      // 젖혀진 상태
    g.add(wing); DOCK.wingMesh = wing;
    // 캐빈
    const cab = new THREE.Mesh(new THREE.BoxGeometry(wid, 2.4, 2.1), red);
    cab.position.set((W.x0+W.x1)/2, 1.9, W.z1 + 1.1); cab.castShadow = true; g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.2, 0.9, 0.06), mat(0x9FC4E8, 0.2, 0.5));
    glass.position.set((W.x0+W.x1)/2, 2.5, W.z1 + 2.13); g.add(glass);
    scene.add(g); DOCK.truckMesh = g;
    // 야드 도색 — 접안 위치·지게차 작업선
    addPaint(W.x0 - 2.6, (W.z0+W.z1)/2, 0.12, len + 6, 0xF2B705);
    g.add(makeSign('윙바디 상하차', 5.0, W.x0 - 2.2, W.z0 - 1.5));
  }
  /* ── 대기·입고 구역 ── */
  {
    let i = 0;
    for(const r of STAGE.rows) for(const x of r.xs){
      i++;
      zones.push({ id:'대기-' + i, x:x, y:0, z:r.z, yaw:0, pallet:null, kind:'zone', stage:true });
      addPaint(x, r.z - 0.71, 1.5, 0.08); addPaint(x, r.z + 0.71, 1.5, 0.08);
      addPaint(x - 0.71, r.z, 0.08, 1.5); addPaint(x + 0.71, r.z, 0.08, 1.5);
    }
    INBOUND.xs.forEach((x, k)=>{
      zones.push({ id:'입고-' + (k+1), x:x, y:0, z:INBOUND.z, yaw:0, pallet:null, kind:'zone', inbound:true });
      addPaint(x, INBOUND.z - 0.71, 1.5, 0.08, 0x1A73E8); addPaint(x, INBOUND.z + 0.71, 1.5, 0.08, 0x1A73E8);
    });
    scene.add(makeSign('출고 대기', 4.6, 9, 97.5));
    scene.add(makeSign('입고 하차', 4.6, 9, 90.8));
  }
  /* ── 순환 도로 ── */
  {
    const asph = mat(COLOR.asphalt, 1);
    const strip = (w, d, x, z)=>{ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asph); m.rotation.x = -Math.PI/2; m.position.set(x, -0.003, z); m.receiveShadow = true; scene.add(m); };
    strip(LOOP.x1 - LOOP.x0, 10, 0, LOOP.z1 - 5);
    strip(10, LOOP.z1 - LOOP.z0, LOOP.x0 + 5, (LOOP.z0 + LOOP.z1)/2);
    strip(10, LOOP.z1 - LOOP.z0, LOOP.x1 - 5, (LOOP.z0 + LOOP.z1)/2);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(LOOP.x1 - LOOP.x0 + 60, LOOP.z1 - LOOP.z0 + 60), mat(0x5C6B52, 1));
    grass.rotation.x = -Math.PI/2; grass.position.set(0, -0.02, (LOOP.z0 + LOOP.z1)/2 + 8); scene.add(grass);
    addPaint(0, LOOP.z1 - 5, LOOP.x1 - LOOP.x0, 0.22, 0xE8E8E2);
    addPaint(LOOP.x0 + 5, (LOOP.z0 + LOOP.z1)/2, 0.22, LOOP.z1 - LOOP.z0, 0xE8E8E2);
    addPaint(LOOP.x1 - 5, (LOOP.z0 + LOOP.z1)/2, 0.22, LOOP.z1 - LOOP.z0, 0xE8E8E2);
    // 야드 확장 — 도크 앞 포장
    const ymat = new THREE.MeshStandardMaterial({ map: floorTexture('#5F666D', '#565C63', 30), roughness:1 });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), ymat);
    pad.rotation.x = -Math.PI/2; pad.position.set(15, -0.001, 97); pad.receiveShadow = true; scene.add(pad);
  }
}

function makeSign(text, y, x, z){
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const cg = cv.getContext('2d');
  cg.fillStyle = '#F2B705'; cg.strokeStyle = '#8B6E06'; cg.lineWidth = 4;
  cg.beginPath(); cg.rect(3,3,250,58); cg.fill(); cg.stroke();
  cg.fillStyle = '#1D2733'; cg.font = 'bold 30px Pretendard, sans-serif';
  cg.textAlign = 'center'; cg.textBaseline = 'middle';
  cg.fillText(text, 128, 34);
  const tx = new THREE.CanvasTexture(cv);
  tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tx, transparent:true, depthTest:false }));
  s.scale.set(4.2, 1.05, 1); s.position.set(x, y, z); s.renderOrder = 5;
  return s;
}

/* 파렛트 물리용 벽 */
function dockWalls(W){
  const L = LIFT_ROOM;
  W.segs.push([L.x1, L.z0, L.x1, L.z1]);
  W.segs.push([L.x0, L.z0, L.x1, L.z0]);
  W.segs.push([L.x0, L.z1, L.x1, L.z1]);
  W.segs.push([L.x0, L.z0, L.x0, L.doorZ0]);
  W.segs.push([L.x0, L.doorZ1, L.x0, L.z1]);
  const T = WING;
  W.rects.push({ x0:T.x0, x1:T.x1, z0:T.z0 - 0.3, z1:T.z1 + 2.3 });   // 바닥 파렛트는 차 밑으로 못 간다
}

/* 상판 — 적재함 바닥, 엘베 바닥 */
function surfRect(id){
  if(id === 'bed') return { x0:WING.x0 + 0.03, x1:WING.x1 - 0.03, z0:WING.z0 + 0.03, z1:WING.z1 - 0.03 };
  if(id === 'lift') return { x0:LIFT_ROOM.x0 - 0.6, x1:LIFT_ROOM.x1 - 0.06, z0:LIFT_ROOM.z0 + 0.06, z1:LIFT_ROOM.z1 - 0.06 };
  return null;
}
function surfClear(id){
  if(id === 'bed') return WING.wingH - WING.y - 0.05;
  if(id === 'lift') return 2.6;
  return Infinity;
}
/* 놓을 자리로서의 상판 */
function surfSupport(x, z, lift){
  const T = WING;
  if(x > T.x0 + 0.40 && x < T.x1 - 0.40 && z > T.z0 + 0.45 && z < T.z1 - 0.45 && lift >= T.y - 0.06 && lift < T.y + 0.70)
    return { id:'bed', y:T.y, cost: Math.abs(lift - T.y)*2.0 + 0.3 };
  const L = LIFT_ROOM;
  if(x > L.x0 + 0.20 && x < L.x1 - 0.45 && z > L.z0 + 0.45 && z < L.z1 - 0.45 && lift < 0.70)
    return { id:'lift', y:L.y, cost: lift*2.0 + 0.3 };
  return null;
}
function surfWallGap(id, p){
  if(id === 'bed') return WING.x1 - 0.03 - (p.x + palletHalfW(p));
  if(id === 'lift') return LIFT_ROOM.x1 - 0.06 - (p.x + palletHalfW(p));
  return null;
}
function surfDropped(p){
  if(p.surf === 'bed'){
    const gap = frontGap(p);
    toast(gap != null && gap < 0.04 ? '적재함 · 밀착' : '적재함에 놓았습니다', true);
    blip(660, 0.12, 'triangle', 0.05);
  }else if(p.surf === 'lift'){
    toast(p.x + palletHalfW(p) > LIFT_ROOM.line1 ? '엘베 안쪽까지 들어갔습니다' : '엘베 문턱 근처입니다 · 더 밀어 넣으세요', true);
  }
}

/* 바닥 파렛트가 엘베 안으로 밀려 들어가면 상판이 바뀐다. 문턱에서 한 번 걸린다. */
function assignSurfaces(dt){
  const L = LIFT_ROOM;
  for(const p of pallets){
    if(p.carried || p.falling || p.broken || p.slot || p.y > 0.12) continue;
    const inside = p.x > L.x0 - 0.2 && p.x < L.x1 && p.z > L.z0 && p.z < L.z1;
    if(inside && p.surf !== 'lift'){
      p.surf = 'lift'; p.y = L.y;
      if(Math.hypot(p.vx, p.vz) > 0.05){ p.vx *= 0.5; p.vz *= 0.5; thud(0.15); }
    }else if(!inside && p.surf === 'lift'){ p.surf = null; p.y = 0; }
  }
}

/* 차체 vs 구조물 — 엘베 센서선, 적재함 옆면·캐빈, 윙 높이 */
function dockCollide(dt){
  DOCK.hitCool = Math.max(0, DOCK.hitCool - dt);
  const fx = dirX(truck.h), fz = dirZ(truck.h), nx = nrmX(truck.h), nz = nrmZ(truck.h);
  const L = LIFT_ROOM;
  // 엘베 — 앞다리가 센서선을 넘으면 사고
  for(const sgn of [1, -1]){
    const lx = truck.x + fx*CFG.legTip + nx*0.48*sgn, lz = truck.z + fz*CFG.legTip + nz*0.48*sgn;
    if(lx > L.sensorX && lz > L.doorZ0 && lz < L.doorZ1 && lx < L.x1){
      if(G.mode === 'drive' || G.mode === 'roam' || G.mode === 'train'){
        truck.x -= (lx - L.sensorX); truck.v *= 0.2;
        if(DOCK.hitCool <= 0){ DOCK.hitCool = 1.5; toast('엘베 안으로는 못 들어갑니다'); }
      }else liftAccident();
      return;
    }
  }
  // 엘베 문틀 — 문 폭 밖으로는 못 들어간다
  for(const b of BODY_PTS){
    const bx = truck.x + fx*b[0] + nx*b[1], bz = truck.z + fz*b[0] + nz*b[1];
    if(bx > L.x0 && (bz < L.doorZ0 || bz > L.doorZ1) && bz > L.z0 - 0.6 && bz < L.z1 + 0.6){
      truck.x -= (bx - L.x0); truck.v *= 0.2;
      if(Math.abs(truck.v) > 0.5 && DOCK.hitCool <= 0){ DOCK.hitCool = 1.5; impact('concrete', 0.9); G.damage += 1; toast('엘베 문틀 접촉'); }
    }
  }
  // 윙바디 — 적재함 옆면·캐빈은 벽이다
  const W = WING;
  if(!DOCK.wingHere) return;
  let hit = false;
  for(const b of BODY_PTS){
    const bx = truck.x + fx*b[0] + nx*b[1], bz = truck.z + fz*b[0] + nz*b[1];
    const inZ = bz > W.z0 - 0.35 && bz < W.z1 + 2.3;
    if(inZ && bx > W.x0 - 0.05 && bx < W.x1 + 0.6){
      truck.x -= (bx - (W.x0 - 0.05)); truck.v *= 0.15; hit = true;
    }
  }
  if(hit && Math.abs(truck.v) > 0.4 && DOCK.hitCool <= 0){
    DOCK.hitCool = 1.6; impact('steel', 1.1);
    if(G.mode !== 'drive' && G.mode !== 'roam' && G.mode !== 'train'){ G.damage += 3; statAdd('damage', 3); }
    toast('적재함 접촉 · 차량 파손');
  }
  // 윙 높이 — 마스트가 윙 밑으로 들어갈 때
  const tipX = truck.x + fx*(CFG.mastBase + truck.reach + CFG.forkTip);
  const tipZ = truck.z + fz*(CFG.mastBase + truck.reach + CFG.forkTip);
  if(tipX > W.x0 - 0.2 && tipZ > W.z0 && tipZ < W.z1){
    const mastTop = 2.25 + Math.max(0, truck.lift - 1.55) + (truck.carry ? Math.max(0, (truck.carry.topY || 0.15) + truck.lift - 2.25) : 0);
    if(mastTop > W.wingH - 0.05 && DOCK.hitCool <= 0){
      DOCK.hitCool = 2.0; impact('steel', 1.0);
      if(G.mode !== 'drive' && G.mode !== 'roam') { G.damage += 3; statAdd('damage', 3); }
      toast('윙 천장 접촉 · 포크를 내리세요');
      truck.lift = Math.max(0, truck.lift - 0.15);
    }
  }
}

function liftAccident(){
  if(G.mode === 'done') return;
  G.running = false; G.mode = 'done';
  setPedal(false); releaseLevers(); truck.v = 0;
  impact('steel', 1.2); buzz(400);
  showSheet('<h1>사고</h1><div class="sub">지게차가 화물엘베 안으로 들어갔습니다. 파렛트만 밀어 넣어야 합니다.</div>' +
    '<div class="row"><button class="btn primary" id="btnBack">메뉴</button></div>');
}

/* 엘베 문 — 미션 완료 시 닫힌다 */
function liftDoor(open){ DOCK.liftDoor = open ? 1 : 0; }
function tickDock(dt){
  DOCK.liftDoorT += (DOCK.liftDoor - DOCK.liftDoorT) * (1 - Math.exp(-2.2*dt));
  const L = LIFT_ROOM, dw = (L.doorZ1 - L.doorZ0)/2;
  if(DOCK.liftDoorL){
    DOCK.liftDoorL.position.z = L.doorZ0 + dw/2 - dw*DOCK.liftDoorT;
    DOCK.liftDoorR.position.z = L.doorZ1 - dw/2 + dw*DOCK.liftDoorT;
  }
  if(DOCK.wingMesh){
    DOCK.wingT += ((DOCK.wingOpen ? 1 : 0) - DOCK.wingT) * (1 - Math.exp(-1.5*dt));
    DOCK.wingMesh.rotation.z = -1.35*DOCK.wingT;
  }
  assignSurfaces(dt);
}

/* 적재함 칸 — 미션용 */
function bedCells(n){
  const out = [];
  for(let r=0;r<WING.rows && out.length < n;r++){
    for(const c of [1, 0]){   // 안쪽 열 먼저
      if(out.length >= n) break;
      out.push({ x:WING.cols[c], z:WING.row0 + r*WING.pitch, col:c, row:r });
    }
  }
  return out;
}
function palletsOnBed(){ return pallets.filter(p=> p.surf === 'bed' && !p.carried && !p.broken); }
function palletsInLift(){ return pallets.filter(p=> p.surf === 'lift' && !p.carried && !p.broken); }
