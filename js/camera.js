/* ============================================================
   동기화
   ============================================================ */
function sync(dt){
  truckGroup.position.set(truck.x, 0, truck.z);
  truckGroup.rotation.y = truck.h;
  mastGroup.position.z = CFG.mastBase + truck.reach;
  mastGroup.rotation.x = -forkAngle();
  carriage.position.y = truck.lift;
  innerMast.position.y = truck.lift * 0.5;

  for(const p of pallets){
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.y = p.yaw;
    p.mesh.rotation.x = p.pitch || 0;
    if(p.broken && !p.mesh.userData.tinted){
      p.mesh.userData.tinted = true;
      p.mesh.rotation.x = 0.35;
    }
  }

  // 셔터 개폐
  const wantY = G.outUnlocked ? 8.4 : 3.0;
  G.shutterT += (wantY - G.shutterT) * (1 - Math.exp(-1.6*(dt||0.016)));
  for(const s of shutters) s.position.y = G.shutterT;
}

/* 게이지가 뜨면 그만큼 화면을 왼쪽으로 밀고, 밀린 만큼 화각을 넓혀 잘리지 않게 한다.
   투영 자체를 옮기므로 어느 시점에서든 똑같이 동작한다. */
function panelPad(){
  if(!G.alignShown || G.portrait) return 0;   // 세로에서는 계기판이 아래에 있다
  return (G.panelW || 272) * (G.uipNow || 1) + 26;
}

function effView(){
  if(G.view === 'auto') return (G.gauge || G.place) ? 'fork' : 'quarter';
  return G.view;
}

const _eye = new THREE.Vector3(), _look = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
function updateCamera(dt){
  const v = effView();
  const z = camera.userData.z;

  if(v === 'quarter'){
    if(Math.abs(truck.v) > 0.20){
      const b = 1 - Math.exp(-3.0*dt);
      G.pan.x -= G.pan.x * b;
      G.pan.z -= G.pan.z * b;
    }
    const k = 1 - Math.exp(-4.5*dt);
    camera.userData.tx += (truck.x + G.pan.x - camera.userData.tx) * k;
    camera.userData.tz += (truck.z + G.pan.z - camera.userData.tz) * k;
    camera.userData.z  += (G.zoom - z) * (1 - Math.exp(-7*dt));
    const zz = camera.userData.z;
    _eye.set(camera.userData.tx + 4.2*zz, 11.4*zz, camera.userData.tz + 9.6*zz);
    _look.set(camera.userData.tx, 1.0, camera.userData.tz);
    _up.set(0, 1, 0);
  }else{
    camera.userData.z += (G.zoom - z) * (1 - Math.exp(-7*dt));
    camera.userData.tx = truck.x; camera.userData.tz = truck.z;
    G.pan.x = 0; G.pan.z = 0;
    const fx = dirX(truck.h), fz = dirZ(truck.h);
    const nx = nrmX(truck.h), nz = nrmZ(truck.h);
    if(v === 'cab'){
      /* 실제로는 옆을 보고 서지만, 화면에서는 진행 방향을 정면으로 둔다.
         후진을 넣으면 고개를 돌리듯 시선이 뒤로 넘어간다. */
      /* 랙 앞에서 잠깐 뺐다 넣는 동작까지 시점이 돌면 아무것도 안 보인다.
         작업 중이거나 짧게 물러나는 정도면 앞을 그대로 본다. */
      const backing = (G.throttle < -0.05 || truck.v < -0.25);
      const working = G.gauge || G.place;
      /* 쌓인 값에 상한을 두지 않으면 오래 후진할수록 앞으로 돌아오는 데
         그만큼 오래 걸린다. 0.9 에서 멈추고, 전진을 넣으면 더 빨리 푼다. */
      const back = G.rearLook && backing && !working;
      G.backT = back ? Math.min(0.9, G.backT + dt)
                     : Math.max(0, G.backT - dt*(G.throttle > 0.05 ? 8.0 : 4.0));
      const wantBack = G.backT > 0.55 ? 1 : 0;
      G.headTurn += (wantBack - G.headTurn) * (1 - Math.exp(-4.2*dt));
      const hv = truck.h + G.headTurn*Math.PI;
      const vx = Math.sin(hv), vz = Math.cos(hv);
      /* 눈을 옆으로 빼면 가까이 있는 지겟발이 한쪽으로 치우쳐 보인다.
         실제 운전석은 옆에 있지만, 화면에서는 차체 중심선에 둔다. */
      _eye.set(truck.x - vx*1.15, 2.15, truck.z - vz*1.15);
      const ahead = CFG.mastBase + truck.reach + CFG.forkTip + 3.4;
      _look.set(truck.x + vx*ahead,
                0.45 + truck.lift*0.55*(1 - G.headTurn),
                truck.z + vz*ahead);
      _up.set(0, 1, 0);
    }else{
      // 지겟발 바로 위에서 내려다본다
      const fb = forkBase();
      const ox = fb.x + fx*0.78, oz = fb.z + fz*0.78;
      const hgt = 4.4 * clamp(camera.userData.z/1.35, 0.65, 1.7);
      _eye.set(ox, truck.lift + hgt, oz);
      _look.set(ox, truck.lift, oz);
      _up.set(fx, 0, fz);
    }
  }

  // 화각 — 운전석은 넓게. 게이지가 뜬 만큼 더 넓혀서 밀려도 잘리지 않게 한다.
  const W = window.innerWidth, H = window.innerHeight;
  G.padNow += (panelPad() - G.padNow) * (1 - Math.exp(-4.0*dt));
  G.padYNow += ((G.padY || 0) - G.padYNow) * (1 - Math.exp(-4.0*dt));
  const widen = Math.max(1 + Math.min(G.padNow / Math.max(W, 1), 0.55),
                         1 + Math.min(G.padYNow / Math.max(H, 1), 0.55));
  const base = v === 'cab' ? 66 : (v === 'fork' ? 42 : 38);
  const wantFov = Math.min(94,
    2 * Math.atan(Math.tan(base*Math.PI/360) * widen) * 180/Math.PI);
  G.fovNow += (wantFov - G.fovNow) * (1 - Math.exp(-6*dt));
  camera.fov = G.fovNow;
  if(G.padNow > 2 || G.padYNow > 2)
    camera.setViewOffset(W, H, G.padNow*0.5, G.padYNow*0.5, W, H);
  else if(camera.view && camera.view.enabled) camera.clearViewOffset();
  else camera.updateProjectionMatrix();

  setSeeThrough(v === 'cab');

  const s2 = 1 - Math.exp(-11*dt);
  camera.position.lerp(_eye, s2);
  if(!camera.userData.look) camera.userData.look = _look.clone();
  camera.userData.look.lerp(_look, s2);
  camera.up.lerp(_up, s2).normalize();
  camera.lookAt(camera.userData.look);

  sunLight.position.set(truck.x + 9, 16, truck.z + 11);
  sunLight.target.position.set(truck.x, 0, truck.z);
  sunLight.target.updateMatrixWorld();
}

/* 시간대 — 배회 모드에 들어갈 때마다 달라진다 */
const TIMES = [
  { n:'새벽', sky:0x6E7A88, sun:0xC8D2E0, si:0.42, hi:0.40, fog:[40,104] },
  { n:'아침', sky:0x9DAAB4, sun:0xFFE8C0, si:0.86, hi:0.48, fog:[52,130] },
  { n:'한낮', sky:0x7C8996, sun:0xFFF0D2, si:0.92, hi:0.46, fog:[54,136] },
  { n:'해질녘', sky:0x93858A, sun:0xFFC98A, si:0.70, hi:0.40, fog:[44,116] },
  { n:'심야', sky:0x4A535E, sun:0x9FB0C4, si:0.30, hi:0.34, fog:[34,92] }
];
function applyTime(i){
  const t = TIMES[i % TIMES.length];
  scene.background = new THREE.Color(t.sky);
  scene.fog.color = new THREE.Color(t.sky);
  scene.fog.near = t.fog[0]; scene.fog.far = t.fog[1];
  sunLight.color = new THREE.Color(t.sun);
  sunLight.intensity = t.si;
  hemiLight.intensity = t.hi;
  return t.n;
}

