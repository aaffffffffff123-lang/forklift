/* ============================================================
   주행
   ============================================================ */
/* 짐이 무거울수록 마스트가 아래로 처진다. 그래서 더 젖혀야 수평이 된다. */
/* 못 찾은 결함이 실제로 드러나는 순간, 왜 그런지 한 번 알려준다.
   모르면 그냥 버그로 보인다. */
function defectHit(k){
  if(!G.defects[k] || G.defectSeen[k]) return;
  G.defectSeen[k] = true;
  const d = DEFECTS.find(v=> v.k === k);
  if(!d) return;
  toast(d.n + ' 결함 · 시업점검에서 놓친 항목입니다');
  thud(0.25);
}

function loadRatio(){ return truck.carry ? clamp((truck.carry.w || 0)/RATED_KG, 0, 1.3) : 0; }
function forkDroop(){
  return 0.060 * loadRatio() * (0.45 + 0.55 * clamp(truck.lift/CFG.liftMax, 0, 1));
}
/* 레버로 준 각도에서 처짐을 빼고 흔들림을 더한 것이 실제 지겟발 각도 */
function forkAngle(){ return truck.tilt - forkDroop() + G.sway; }

function updateSway(dt){
  const wR = loadRatio();
  const hi = clamp(truck.lift/CFG.liftMax, 0, 1);
  if(wR < 0.02 && Math.abs(G.sway) < 1e-4 && Math.abs(G.swayV) < 1e-4){
    G.sway = 0; G.swayV = 0; G.lastV = truck.v; return;
  }
  // 무겁고 높을수록 느리게, 오래 흔들린다
  const stiff = 32 - 17*wR - 8*hi;
  const damp  = 4.2 - 2.2*wR - 0.8*hi;
  const imp = (truck.v - G.lastV) * 0.85 * wR * (0.25 + 0.75*hi)
            + (-levers.lift.val) * CFG.liftSpeed * dt * 1.6 * wR * hi;
  G.swayV += (-stiff*G.sway - damp*G.swayV) * dt + imp;
  G.sway = clamp(G.sway + G.swayV*dt, -0.075, 0.075);
  G.lastV = truck.v;
}

function speedCap(){
  let cap = Infinity;
  if(G.mode === 'drive' || G.mode === 'train' || (G.mode === 'course' && PR.course && PR.course.fast)){
    if(G.batt <= 0) cap = 0.5;
    return cap;   // 속도 제한 없음 — 전도는 tickDrive 가 본다
  }
  if(G.defects.wheel && Math.abs(truck.v) > 0.6){ cap = Math.min(cap, CFG.maxFwd*0.78); defectHit('wheel'); }
  if(truck.carry) cap = Math.min(cap, CFG.maxFwd*(1 - 0.30*loadRatio()));
  if(truck.lift > CFG.liftTip)   cap = Math.min(cap, 0.70);
  else if(truck.lift > 1.00)     cap = Math.min(cap, 1.10);
  if(G.batt <= 0)                cap = Math.min(cap, 0.35);
  else if(G.batt < 20)           cap = Math.min(cap, 0.85);
  return cap;
}

function confine(prevZ){
  // 셔터가 열려 있고 문 안에 있을 때만 벽을 통과한다
  const gateOk = (G.outUnlocked || G.mode === 'work' || G.mode === 'drive') && GATES.some(gx=> Math.abs(truck.x - gx) < 3.3);
  const outX = (G.mode === 'drive' || G.mode === 'train') ? LOOP.x1 - 1 : OUT.x;
  const outZ = (G.mode === 'drive' || G.mode === 'train') ? LOOP.z1 - 1 : OUT.z1;
  if(!gateOk){
    if(prevZ <= WALL_Z && truck.z > IN.z1){ truck.z = IN.z1; truck.v *= 0.2; }
    if(prevZ >  WALL_Z && truck.z < WALL_Z + 1.2){ truck.z = WALL_Z + 1.2; truck.v *= 0.2; }
  }
  if(truck.z < WALL_Z){
    truck.x = clamp(truck.x, -IN.x, IN.x);
    truck.z = Math.max(truck.z, IN.z0);
  }else{
    truck.x = clamp(truck.x, -outX, outX);
    truck.z = Math.min(truck.z, outZ);
  }
}

function drive(dt){
  let target = 0;
  if(G.pedal && G.throttle !== 0){
    const mul = G.speedMul || 1;
    const mx = (G.throttle > 0 ? CFG.maxFwd : CFG.maxRev) * mul;
    target = G.throttle * mx;
    const cap = speedCap();
    if(Math.abs(target) > cap) target = Math.sign(target) * cap;
  }
  if(target !== 0){
    const mul = G.speedMul || 1;
    const rate = ((Math.sign(target) !== Math.sign(truck.v) && truck.v !== 0) ? CFG.brake : CFG.accel) * (mul > 1 ? 1.6 : 1) * driveMu();
    truck.v += clamp(target - truck.v, -rate*dt, rate*dt);
  }else{
    let rate = (G.pedal ? CFG.coast : CFG.brake) * driveMu();
    if(G.defects.brake){ rate *= 0.45; if(Math.abs(truck.v) > 0.8) defectHit('brake'); }
    const s = Math.sign(truck.v);
    truck.v -= s * Math.min(Math.abs(truck.v), rate*dt);
  }

  const px = truck.x, pz = truck.z;
  const h0 = truck.h;
  truck.h += (-truck.v * Math.sin(truck.steer) / CFG.wheelBase) * dt;
  const md = h0 + truck.steer;
  truck.x += Math.sin(md) * truck.v * dt;
  truck.z += Math.cos(md) * truck.v * dt;
  truck.h = wrapPi(truck.h);

  const bx = truck.x, bz = truck.z;
  confine(pz);
  if((bx !== truck.x || bz !== truck.z) && Math.abs(truck.v) > 0.9 && G.bumpCool <= 0){
    toast('벽 접촉'); impact('concrete', 1.0); G.damage += 1; G.bumpCool = 1.5;
  }
  if(G.bumpCool > 0) G.bumpCool -= dt;

  if(typeof dockCollide === 'function') dockCollide(dt);
  for(const o of obstacles){
    const dx = truck.x - o.x, dz = truck.z - o.z;
    const d = Math.hypot(dx, dz);
    if(d < o.r + 0.55 && d > 0.0001){
      if(!o.hit){
        o.hit = true; G.drillMiss++;
        impact(o.cone ? 'plastic' : 'steel', 0.9);
        toast(o.cone ? '콘 접촉' : '벽 접촉');
      }
      if(o.cone && o.mesh){ o.mesh.position.x += dx/d*0.4; o.mesh.position.z += dz/d*0.4; o.mesh.rotation.z = 0.9; }
      else{
        const push = (o.r + 0.55 - d);
        truck.x += dx/d*push; truck.z += dz/d*push; truck.v *= 0.3;
      }
    }
  }

  /* 랙 충돌 — 마스트는 들어가야 하니 차체만 막는다.
     예전에는 차체 중심을 랙 중심선에서 2.4m 밖으로 밀어냈다. 방향을 보지 않으니
     통로를 나란히 지날 때도 아무것도 없는 허공에서 걸리고, 통로 폭이 3m로 줄어
     A5~A6 같은 통로는 들어가지도 못했다.
     지금은 차체 모서리가 랙 앞면에 닿는지로 본다. 정면으로 서면 앞다리 끝이
     앞면에 닿는 지점이 정지선이라 예전과 같고, 나란히 지날 때는 옆면이 닿을
     때까지 붙을 수 있다. */
  {
    const fx = dirX(truck.h), fz = dirZ(truck.h);
    const nx = nrmX(truck.h), nz = nrmZ(truck.h);
    for(const s of RACK_SLABS){
      if(truck.x < s.x0 - 1.4 || truck.x > s.x1 + 1.4) continue;
      const side = truck.z >= (s.z0 + s.z1)/2 ? 1 : -1;
      const edge = side > 0 ? s.z1 : s.z0;
      let worst = 0;
      for(const b of BODY_PTS){
        const bx = truck.x + fx*b[0] + nx*b[1];
        if(bx < s.x0 - 0.6 || bx > s.x1 + 0.6) continue;
        const bz = truck.z + fz*b[0] + nz*b[1];
        const pen = (bz - edge) * -side;
        if(pen > worst) worst = pen;
      }
      if(worst > 0){
        truck.z += side * worst;
        if(Math.abs(truck.v) > 0.7 && G.bumpCool <= 0){
          toast('랙 접촉'); impact('steel', 1.0); G.damage += 1; G.bumpCool = 1.5;
        }
        truck.v *= 0.22;
      }
    }
  }

  for(const q of PILLARS){
    for(const pt of [{x:truck.x, z:truck.z},
                     {x:truck.x + dirX(truck.h)*1.0, z:truck.z + dirZ(truck.h)*1.0}]){
      const dx = pt.x - q.x, dz = pt.z - q.z;
      const d = Math.hypot(dx, dz);
      if(d < 0.95 && d > 0.0001){
        const push = (0.95 - d);
        truck.x += dx/d * push; truck.z += dz/d * push;
        if(Math.abs(truck.v) > 0.8 && G.bumpCool <= 0){
          toast('기둥 접촉'); impact('concrete', 1.1); G.damage += 1; G.bumpCool = 1.5;
        }
        truck.v *= 0.25;
      }
    }
  }

  G.dist += Math.hypot(truck.x - px, truck.z - pz);

  let hyd = G.batt <= 0 ? 0.40 : 1;
  if(G.defects.chain){ hyd *= 0.55; if(Math.abs(levers.lift.val) > 0.05) defectHit('chain'); }
  hyd *= 1 - 0.42*loadRatio();          // 무거우면 유압이 굼뜨다
  const lift0 = truck.lift, reach0 = truck.reach;
  truck.lift  = clamp(truck.lift  - levers.lift.val  * CFG.liftSpeed  * hyd * dt, 0, CFG.liftMax);
  // 누유 — 올려둔 포크가 저절로 내려간다
  if(G.defects.hose && truck.lift > 0.25 && Math.abs(levers.lift.val) < 0.05){
    truck.lift = Math.max(0, truck.lift - 0.055*dt);
    defectHit('hose');
  }
  // 편마모 — 주행 중 잔진동
  if(G.defects.wheel && Math.abs(truck.v) > 0.4){
    G.jolt += dt;
    if(G.jolt > 0.9){ G.jolt = 0; thud(0.10); }
  }
  const rl = levers.reach.val; truck.reach = clamp(truck.reach + Math.sign(rl)*Math.pow(Math.abs(rl), 1.6) * CFG.reachSpeed * hyd * dt, 0, CFG.reachMax);
  truck.tilt  = clamp(truck.tilt  - levers.tilt.val  * CFG.tiltSpeed  * hyd * dt, -CFG.tiltFwd, CFG.tiltBack);

  // 정격 초과 — 그 높이 이상으로는 올라가지 않는다
  if(truck.carry){
    const lim = maxLiftFor(truck.carry.w || 0);
    if(truck.lift > lim){
      truck.lift = lim;
      if(levers.lift.val < -0.05 && G.capCool <= 0){
        G.capCool = 2.4;
        toast('정격 초과 · 이 높이가 한계입니다');
      }
    }
  }
  if(G.capCool > 0) G.capCool -= dt;

  updateSway(dt);

  SND.relief =
    (Math.abs(levers.lift.val)  > 0.05 && truck.lift  === lift0  && (truck.lift <= 0 || truck.lift >= CFG.liftMax)) ||
    (Math.abs(levers.reach.val) > 0.05 && truck.reach === reach0 && (truck.reach <= 0 || truck.reach >= CFG.reachMax));
}

