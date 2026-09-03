/* ============================================================
   지번 라벨 — 가까운 것만 골라 돌려쓴다
   ============================================================ */
const LABEL_N = 18;
const labelPool = [];
function makeLabelSprite(){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  spr.scale.set(1.5, 0.375, 1);
  spr.visible = false;
  return { spr:spr, cv:c, tex:tex, id:null, hot:false };
}
function paintLabel(L, text, hot){
  const g = L.cv.getContext('2d');
  g.clearRect(0,0,256,64);
  g.fillStyle = hot ? GOAL_CSS : '#DDE3E8';
  g.strokeStyle = hot ? '#9C0F62' : '#9AA5AE'; g.lineWidth = 3;
  g.beginPath(); g.rect(3,3,250,58); g.fill(); g.stroke();
  g.fillStyle = hot ? '#FFFFFF' : '#1D2733';
  g.font = 'bold 27px ui-monospace, "Roboto Mono", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  L.tex.needsUpdate = true;
}
function initLabels(){
  for(let i=0;i<LABEL_N;i++){
    const L = makeLabelSprite();
    labelPool.push(L); scene.add(L.spr);
  }
}
function updateLabels(){
  const near = [];
  const push = (p, y, z, id)=>{
    const d = Math.hypot(truck.x - p.x, truck.z - p.z);
    if(d < 26) near.push({ d:d, x:p.x, y:y, z:z, id:id });
  };
  for(const s of slots) push(s, s.y + 0.42, s.labelZ, s.id);
  for(const z0 of zones) push(z0, 0.55, z0.z + 0.78, z0.id);
  near.sort((a,b)=> a.d - b.d);
  for(let i=0;i<LABEL_N;i++){
    const L = labelPool[i], t = near[i];
    if(!t){ L.spr.visible = false; L.id = null; continue; }
    L.spr.visible = true;
    L.spr.position.set(t.x, t.y, t.z);
    const hot = (t.id === G.ghostId);
    if(L.id !== t.id || L.hot !== hot){ L.id = t.id; L.hot = hot; paintLabel(L, t.id, hot); }
  }
}

/* ============================================================
   3D 리소스
   ============================================================ */
function makeRackRow(row){
  const g = new THREE.Group();
  const step = 2.7, span = step*row.n;
  const upGeo = new THREE.BoxGeometry(0.11, 4.4, 0.11);
  const upMat = mat(COLOR.upright, 0.6);
  const cnt = (row.n + 1) * 2;
  const im = new THREE.InstancedMesh(upGeo, upMat, cnt);
  im.castShadow = true;
  const m = new THREE.Matrix4();
  let k = 0;
  for(let i=0;i<=row.n;i++){
    const x = row.x0 - step/2 + i*step;
    for(const dz of [-0.5, 0.5]){
      m.makeTranslation(x, 2.2, row.z + dz);
      im.setMatrixAt(k++, m);
    }
  }
  im.instanceMatrix.needsUpdate = true;
  g.add(im);

  const bmMat = mat(COLOR.beam, 0.55);
  for(let l=1;l<LEVEL_Y.length;l++){
    const y = LEVEL_Y[l] - 0.09;
    for(const dz of [-0.5, 0.5]){
      const b = new THREE.Mesh(new THREE.BoxGeometry(span + 0.2, 0.14, 0.08), bmMat);
      b.position.set(row.x0 + span/2 - step/2, y, row.z + dz);
      b.castShadow = true; g.add(b);
    }
  }
  return g;
}

const seeThrough = [];
function markSeeThrough(m, faint){
  m.material = m.material.clone();
  m.userData.faint = !!faint;
  m.userData.shadowOrig = !!m.castShadow;
  seeThrough.push(m);
  return m;
}
let seeThroughOn = null;
function setSeeThrough(on){
  if(seeThroughOn === on) return;
  seeThroughOn = on;
  for(const m of seeThrough){
    m.material.transparent = on;
    m.material.opacity = on ? (m.userData.faint ? 0.12 : 0.20) : 1;
    m.material.depthWrite = !on;
    m.material.needsUpdate = true;
    m.castShadow = on ? false : m.userData.shadowOrig;
  }
  const cd = truckGroup && truckGroup.getObjectByName('cabDriver');
  if(cd) cd.visible = !on;
}

function makeForklift(){
  const g = new THREE.Group();
  const body = mat(COLOR.body, 0.55), dark = mat(COLOR.dark, 0.7), steel = mat(COLOR.steel, 0.4, 0.35);

  const power = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.10, 1.00), body);
  power.position.set(0, 0.62, -0.02); power.castShadow = true; g.add(power);
  markSeeThrough(power, true);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.50, 0.62), dark);
  seat.position.set(0.10, 1.42, -0.02); seat.castShadow = true; g.add(seat);
  markSeeThrough(seat, true);
  for(const px of [-0.44, 0.44]) for(const pz of [-0.40, 0.42]){
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.10, 0.07), dark);
    post.position.set(px, 1.05, pz); g.add(post); markSeeThrough(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 1.00), dark);
  roof.position.set(0, 2.12, 0.01); roof.castShadow = true; g.add(roof); markSeeThrough(roof);
  for(const px of [-0.46, 0.46]){
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 1.60), body);
    leg.position.set(px, 0.14, 1.05); leg.castShadow = true; g.add(leg);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 1.50), mat(COLOR.steel, 0.35, 0.5));
    rail.position.set(px, 0.27, 1.05); g.add(rail);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.11,12), dark);
    wheel.rotation.z = Math.PI/2; wheel.position.set(px, 0.13, 1.70); g.add(wheel);
  }
  const drive = new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.20,0.16,14), dark);
  drive.rotation.z = Math.PI/2; drive.position.set(0, 0.20, -0.02); g.add(drive);

  mastGroup = new THREE.Group();
  mastGroup.position.set(0, 0, CFG.mastBase);
  for(const px of [-0.36, 0.36]){
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.60, 0.14), steel);
    rail.position.set(px, 1.30, 0); rail.castShadow = true; mastGroup.add(rail);
    markSeeThrough(rail);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.10, 0.10), steel);
  cross.position.set(0, 2.56, 0); mastGroup.add(cross); markSeeThrough(cross);

  innerMast = new THREE.Group();
  for(const px of [-0.24, 0.24]){
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.40, 0.10), mat(COLOR.dark, 0.5, 0.3));
    rail.position.set(px, 1.20, 0.02); innerMast.add(rail); markSeeThrough(rail);
  }
  mastGroup.add(innerMast);

  carriage = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.46, 0.07), steel);
  back.position.set(0, 0.26, 0.02); back.castShadow = true; carriage.add(back);
  markSeeThrough(back);
  for(const px of [-CFG.forkGap, CFG.forkGap]){
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, CFG.forkTip - 0.05), steel);
    fork.position.set(px, 0.028, 0.05 + (CFG.forkTip - 0.05)/2);
    fork.castShadow = true; carriage.add(fork);
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.20, 0.05), steel);
    heel.position.set(px, 0.12, 0.05); carriage.add(heel);
  }
  mastGroup.add(carriage);
  g.add(mastGroup);
  return g;
}

function makePerson(vest){
  const g = new THREE.Group();
  const skin = mat(COLOR.skin, 0.9);
  const cloth = mat(vest ? COLOR.vest : 0x46536B, 0.9);
  const pants = mat(0x2E3742, 0.9);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), cloth);
  torso.position.y = 1.10; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skin);
  head.position.y = 1.52; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.26), mat(0xE8E8EA, 0.8));
  cap.position.y = 1.68; g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.80, 0.16), pants);
  legL.position.set(-0.11, 0.42, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.11; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.12), cloth);
  armL.position.set(-0.27, 1.12, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.27; g.add(armR);
  g.userData = { legL:legL, legR:legR, armL:armL, armR:armR };
  return g;
}

function makeCar(seed){
  const g = new THREE.Group();
  const c = COLOR.car[seed % COLOR.car.length];
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.30, 0.80, 1.78), mat(c, 0.5, 0.25));
  body.position.y = 0.66; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.62, 1.62), mat(0x2A323B, 0.35, 0.2));
  cabin.position.set(-0.15, 1.32, 0); cabin.castShadow = true; g.add(cabin);
  const wg = new THREE.CylinderGeometry(0.33, 0.33, 0.20, 12);
  const wm = mat(0x1B2027, 0.9);
  for(const dx of [-1.42, 1.42]) for(const dz of [-0.82, 0.82]){
    const w = new THREE.Mesh(wg, wm);
    w.rotation.x = Math.PI/2; w.position.set(dx, 0.33, dz); g.add(w);
  }
  return g;
}

