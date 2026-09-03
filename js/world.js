/* ============================================================
   월드
   ============================================================ */
function floorTexture(base, lineCol, cell){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0,0,128,128);
  g.strokeStyle = lineCol; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0,0); g.lineTo(128,0); g.moveTo(0,0); g.lineTo(0,128); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(cell, cell);
  return t;
}

function addPaint(x, z, w, d, col, rot){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({color:col===undefined?COLOR.line:col}));
  m.rotation.x = -Math.PI/2;
  if(rot) m.rotation.z = rot;
  m.position.set(x, 0.006, z);
  scene.add(m);
  return m;
}

function buildWorld(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.bg);
  scene.fog = new THREE.Fog(COLOR.bg, 46, 118);

  hemiLight = new THREE.HemisphereLight(0xB8C4CE, 0x565D64, 0.44);
  scene.add(hemiLight);
  const sun = new THREE.DirectionalLight(0xFFF0D2, 0.80);
  sun.position.set(9, 16, 11); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0009;
  const sc = sun.shadow.camera;
  sc.left=-17; sc.right=17; sc.top=17; sc.bottom=-17; sc.near=1; sc.far=54;
  scene.add(sun); scene.add(sun.target); sunLight = sun;
  const fill = new THREE.DirectionalLight(0x93A5B4, 0.20);
  fill.position.set(-8, 9, -6); scene.add(fill);

  /* 실내 바닥 */
  const inW = 84, inD = 94, inCz = 40;
  const fmat = new THREE.MeshStandardMaterial({
    map: floorTexture('#767D84', '#636A70', 18), roughness:0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(inW, inD), fmat);
  floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, inCz);
  floor.receiveShadow = true; scene.add(floor);

  /* 야드 + 도로 */
  const ymat = new THREE.MeshStandardMaterial({
    map: floorTexture('#5F666D', '#565C63', 30), roughness:1 });
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(230, 22), ymat);
  yard.rotation.x = -Math.PI/2; yard.position.set(0, -0.002, 98);
  yard.receiveShadow = true; scene.add(yard);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, ROAD.z1 - ROAD.z0),
    mat(COLOR.asphalt, 1));
  road.rotation.x = -Math.PI/2; road.position.set(0, -0.004, (ROAD.z0 + ROAD.z1)/2);
  road.receiveShadow = true; scene.add(road);
  addPaint(0, ROAD.z0 + 0.3, 240, 0.22, 0xE8E8E2);
  addPaint(0, ROAD.z1 - 0.3, 240, 0.22, 0xE8E8E2);
  const dashCv = document.createElement('canvas');
  dashCv.width = 64; dashCv.height = 8;
  const dg2 = dashCv.getContext('2d');
  dg2.fillStyle = 'rgba(0,0,0,0)'; dg2.fillRect(0,0,64,8);
  dg2.fillStyle = '#E0DA9A'; dg2.fillRect(0,2,32,4);
  const dashTex = new THREE.CanvasTexture(dashCv);
  dashTex.wrapS = THREE.RepeatWrapping; dashTex.repeat.set(30, 1);
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(240, 0.34),
    new THREE.MeshBasicMaterial({map:dashTex, transparent:true}));
  dash.rotation.x = -Math.PI/2; dash.position.set(0, 0.006, 116);
  scene.add(dash);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(240, 30), mat(0x5C6B52, 1));
  grass.rotation.x = -Math.PI/2; grass.position.set(0, -0.01, 139); scene.add(grass);

  /* 기둥 */
  for(let px=-33; px<=33; px+=16.5) for(let pz=6; pz<=78; pz+=14.4){
    if(px > YARD.x0 - 1.5 && px < YARD.x1 + 1.5 && pz > YARD.z0 - 1.5 && pz < YARD.z1 + 1.5) continue;
    PILLARS.push({x:px, z:pz});
  }
  const pillGeo = new THREE.BoxGeometry(0.55, 7.0, 0.55);
  const pillIm = new THREE.InstancedMesh(pillGeo, mat(0x8A929A, 0.9), PILLARS.length);
  pillIm.castShadow = true;
  const bandIm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.45, 0.62),
    mat(COLOR.line, 0.8), PILLARS.length);
  const mtx = new THREE.Matrix4();
  PILLARS.forEach((q, i)=>{
    mtx.makeTranslation(q.x, 3.5, q.z); pillIm.setMatrixAt(i, mtx);
    mtx.makeTranslation(q.x, 0.45, q.z); bandIm.setMatrixAt(i, mtx);
  });
  pillIm.instanceMatrix.needsUpdate = true; bandIm.instanceMatrix.needsUpdate = true;
  scene.add(pillIm); scene.add(bandIm);

  /* 벽 */
  const wallMat = mat(COLOR.wall, 1);
  const mkWall = (w, x, y, z, ry, h)=>{
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h || 9), wallMat);
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  };
  mkWall(84, 0, 4.5, -6.5, 0);
  mkWall(94, -42, 4.5, 40, Math.PI/2);
  mkWall(94,  42, 4.5, 40, -Math.PI/2);

  /* 북쪽 벽 — 셔터 3개를 남기고 채운다 */
  const segs = [];
  let cur = -42;
  for(const gx of GATES){ segs.push([cur, gx - 4.2]); cur = gx + 4.2; }
  segs.push([cur, 42]);
  for(const s of segs){
    const w = s[1] - s[0];
    if(w <= 0.1) continue;
    mkWall(w, (s[0]+s[1])/2, 4.5, WALL_Z, Math.PI);
  }
  for(const gx of GATES){
    // 셔터 위 인방
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.0, 0.5), wallMat);
    lintel.position.set(gx, 7.5, WALL_Z); scene.add(lintel);
    const door = new THREE.Mesh(new THREE.BoxGeometry(8.2, 6.0, 0.24),
      mat(0xA8B2BB, 0.6, 0.25));
    door.position.set(gx, 3.0, WALL_Z); door.castShadow = true;
    scene.add(door);
    shutters.push(door);
    addPaint(gx, WALL_Z - 2.4, 8.2, 0.18);
  }

  /* 랙 */
  for(const row of RACK_ROWS){
    scene.add(makeRackRow(row));
    for(let b=0;b<row.n;b++){
      const x = row.x0 + b*2.7;
      LEVEL_Y.forEach((y, li)=>{
        slots.push({
          id:'2F-' + row.id + '-' + (b+1) + '-' + (li+1),
          x:x, y:y, z:row.z, labelZ: row.z + row.face*0.62,
          yaw:0, pallet:null, kind:'slot'
        });
      });
    }
  }

  /* 평치 */
  for(const grp of ZONE_GROUPS){
    let i = 0;
    for(const r of grp.rows) for(const x of r.xs){
      i++;
      const zn = { id:'2F-' + grp.id + '-' + i + '-1', x:x, y:0, z:r.z, yaw:0, pallet:null, kind:'zone' };
      zones.push(zn);
      addPaint(x, r.z - 0.71, 1.5, 0.08);
      addPaint(x, r.z + 0.71, 1.5, 0.08);
      if(grp.id === 'C1'){
        addPaint(x - 0.71, r.z, 0.08, 1.5);
        addPaint(x + 0.71, r.z, 0.08, 1.5);
      }
    }
  }

  /* 통로 표시 */
  for(const z of [-0.95, 1.90, 12.5, 21.0, 30.0, 39.5, 43.0, 57.5]){
    addPaint(0, z, 78, 0.10);
  }

  /* 충전 구역 */
  addPaint(CHARGE.x, CHARGE.z - 1.65, 3.4, 0.10);
  addPaint(CHARGE.x, CHARGE.z + 1.65, 3.4, 0.10);
  addPaint(CHARGE.x - 1.65, CHARGE.z, 0.10, 3.4);
  addPaint(CHARGE.x + 1.65, CHARGE.z, 0.10, 3.4);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 1.30), mat(0xC7CDD3, 0.7));
  cab.position.set(CHARGE.x + 2.85, 0.78, CHARGE.z); cab.castShadow = true; scene.add(cab);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.85), mat(0x2E3742, 0.6));
  face.position.set(CHARGE.x + 2.40, 1.05, CHARGE.z); scene.add(face);
  // 충전 구역 표지 — 멀리서도 보이게 기둥 위에 세운다
  {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.4, 0.14), mat(0x8A929A, 0.8));
    post.position.set(CHARGE.x, 2.7, CHARGE.z + 1.95); post.castShadow = true; scene.add(post);
    // 통로 어디서든 눈에 띄도록 세로 띠를 세운다
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 6.4, 10, 1, true),
      new THREE.MeshBasicMaterial({color:0xF2B705, transparent:true, opacity:0.30, side:THREE.DoubleSide}));
    beam.position.set(CHARGE.x, 3.2, CHARGE.z); scene.add(beam);
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const cg = cv.getContext('2d');
    cg.fillStyle = '#F2B705'; cg.strokeStyle = '#8B6E06'; cg.lineWidth = 4;
    cg.beginPath(); cg.rect(3,3,250,58); cg.fill(); cg.stroke();
    cg.fillStyle = '#1D2733';
    cg.font = 'bold 34px Pretendard, sans-serif';
    cg.textAlign = 'center'; cg.textBaseline = 'middle';
    cg.fillText('충전 구역', 128, 34);
    const tx = new THREE.CanvasTexture(cv);
    tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthTest:false}));
    sign.scale.set(4.2, 1.05, 1);
    sign.position.set(CHARGE.x, 5.7, CHARGE.z + 1.95);
    sign.renderOrder = 5;
    scene.add(sign);
  }

  /* 연습장 — 바닥 도색과 연습용 랙 */
  {
    const cxm = (YARD.x0 + YARD.x1)/2, czm = (YARD.z0 + YARD.z1)/2;
    const w = YARD.x1 - YARD.x0, d = YARD.z1 - YARD.z0;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0x6E757C, 0.95));
    pad.rotation.x = -Math.PI/2; pad.position.set(cxm, 0.001, czm);
    pad.receiveShadow = true; scene.add(pad);
    addPaint(cxm, YARD.z0 + 0.4, w, 0.14);
    addPaint(cxm, YARD.z1 - 0.4, w, 0.14);
    addPaint(YARD.x0 + 0.4, czm, 0.14, d);
    addPaint(YARD.x1 - 0.4, czm, 0.14, d);
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map:(function(){
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#F2B705'; g.strokeStyle = '#8B6E06'; g.lineWidth = 4;
      g.beginPath(); g.rect(3,3,250,58); g.fill(); g.stroke();
      g.fillStyle = '#1D2733'; g.font = 'bold 32px Pretendard, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('연습장', 128, 34);
      const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
      return t;
    })(), transparent:true, depthTest:false }));
    lab.scale.set(3.6, 0.9, 1);
    lab.position.set(cxm, 4.6, YARD.z0 + 1.0);
    lab.renderOrder = 5; scene.add(lab);

    // 연습용 랙 3베이 3단
    const g2 = makeRackRow({ id:'연습', z:PRAC_RACK.z, face:PRAC_RACK.face,
                             x0:PRAC_RACK.xs[0], n:3 });
    scene.add(g2);
    PRAC_RACK.xs.forEach((x, bi)=>{
      LEVEL_Y.forEach((y, li)=>{
        slots.push({ id:'연습-' + (bi+1) + '-' + (li+1), x:x, y:y, z:PRAC_RACK.z,
                     labelZ: PRAC_RACK.z + PRAC_RACK.face*0.62,
                     yaw:0, pallet:null, kind:'slot', practice:true });
      });
    });
  }

  /* 발견물 */
  for(const d of DISCOVERIES){
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(0x8A93A0, 0.8));
    b.position.y = 0.45; b.castShadow = true; g.add(b);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 24),
      new THREE.MeshBasicMaterial({color:0xF2B705, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
    halo.rotation.x = -Math.PI/2; halo.position.y = 0.01; g.add(halo);
    g.position.set(d.x, 0, d.z);
    scene.add(g);
    discMeshes.push({ def:d, mesh:g, halo:halo });
  }

  /* 보행자 — 통로를 왕복한다 */
  const PED_PATHS = [
    { x:-28, z0:6,  z1:78 }, { x:-6, z0:20, z1:70 },
    { x: 12, z0:4,  z1:56 }, { x: 30, z0:14, z1:74 },
    { x:-16, z0:44, z1:82 }, { x: 22, z0:38, z1:80 }
  ];
  PED_PATHS.forEach((p, i)=>{
    const g = makePerson(true);
    g.position.set(p.x, 0, p.z0 + (p.z1-p.z0)*(i/PED_PATHS.length));
    scene.add(g);
    peds.push({ mesh:g, path:p, t:i*0.7, dir: i%2 ? 1 : -1,
                z:g.position.z, side:0, yield:0, phase:i });
  });

  /* 신호수 — 교차 지점에 선다 */
  const SIG_POS = [ {x:0, z:12.5}, {x:0, z:30.0}, {x:-20, z:43.0}, {x:20, z:57.5} ];
  SIG_POS.forEach((p, i)=>{
    const g = makePerson(true);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = i%2 ? Math.PI/2 : 0;
    scene.add(g);
    const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.42,8), mat(0xE0453C, 0.7));
    baton.position.set(0.30, 1.42, 0.10);
    g.add(baton);
    signals.push({ mesh:g, baton:baton, t:i*1.3 });
  });

  /* 도로 위 차량 */
  for(let i=0;i<8;i++){
    const g = makeCar(i);
    const lane = i % 2;
    const dir = lane === 0 ? 1 : -1;
    const x = -110 + i*28;
    g.position.set(x, 0, ROAD.lane[lane]);
    g.rotation.y = dir > 0 ? Math.PI/2 : -Math.PI/2;
    g.visible = false;
    scene.add(g);
    cars.push({ mesh:g, lane:lane, dir:dir, x:x, v:9 + (i%3)*2, base:9 + (i%3)*2, honk:0 });
  }

  /* 목표 표시 — 창고 배경(회색·주황·파랑·노랑)에 없는 색을 쓴다.
     빨강은 위험 게이지와 파손 표시가 이미 쓰고 있어 신호가 섞인다.
     랙 구조물 뒤에 있어도 보여야 하므로 depthTest 를 끈다. */
  targetRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.15, 28),
    new THREE.MeshBasicMaterial({color:GOAL_COL, transparent:true, opacity:0.85,
      side:THREE.DoubleSide, depthTest:false}));
  targetRing.rotation.x = -Math.PI/2; targetRing.position.y = 0.010;
  targetRing.renderOrder = 6;
  targetRing.visible = false; scene.add(targetRing);

  targetPost = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,7.0,12, 1, true),
    new THREE.MeshBasicMaterial({color:GOAL_COL, transparent:true, opacity:0.34,
      side:THREE.DoubleSide, depthTest:false}));
  targetPost.renderOrder = 6;
  targetPost.visible = false; scene.add(targetPost);

  slotGhost = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.94, 1.24),
    new THREE.MeshBasicMaterial({color:GOAL_COL, transparent:true, opacity:0.34, depthTest:false}));
  slotGhost.renderOrder = 7;
  slotGhost.visible = false; scene.add(slotGhost);

  /* 랙 3단을 가리켜도 어디쯤인지 알 수 있게 바닥까지 기둥과 링을 내린다 */
  ghostBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({color:GOAL_COL, transparent:true, opacity:0.26,
      side:THREE.DoubleSide, depthTest:false}));
  ghostBeam.renderOrder = 6;
  ghostBeam.visible = false; scene.add(ghostBeam);

  ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.74, 1.04, 26),
    new THREE.MeshBasicMaterial({color:GOAL_COL, transparent:true, opacity:0.75,
      side:THREE.DoubleSide, depthTest:false}));
  ghostRing.rotation.x = -Math.PI/2; ghostRing.renderOrder = 6;
  ghostRing.visible = false; scene.add(ghostRing);

  truckGroup = makeForklift();
  // 랩집 — 차체 왼쪽 옆판
  const hol = makeWrapHolster(); hol.position.set(-0.60, 0.55, -0.35); truckGroup.add(hol);
  // 운전석 운전자 — 운전석 시점에서는 setSeeThrough 가 숨긴다
  const cabD = makeCabDriver(); cabD.name = 'cabDriver'; truckGroup.add(cabD);
  scene.add(truckGroup);
  buildDock();
  buildWalls();
  initLabels();
}

function place(id){ return slots.find(v=>v.id===id) || zones.find(v=>v.id===id); }
function pal(id){ const s = place(id); return s ? s.pallet : null; }
function near(x, z, r){ return Math.hypot(truck.x - x, truck.z - z) < r; }

