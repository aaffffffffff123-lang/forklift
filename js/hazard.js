/* ============================================================
   위험 동작
   ============================================================ */
/* 사람을 친 것은 되돌릴 수 없는 사고다. 그 자리에서 끝난다. */
function hitPerson(){
  impact('person', 1.0);
  truck.v = 0; G.throttle = 0; setPedal(false);
  G.damage += 5;
  toast('인명사고 · 보행자를 쳤습니다');
  if(typeof driverOops === 'function') driverOops();
  if(G.mode === 'edu' || G.mode === 'work' || G.mode === 'rush' || G.mode === 'exam' || G.mode === 'daily'){
    G.running = false;
    setTimeout(()=>{
      showSheet('<h1>인명사고</h1>' +
        '<div class="sub">보행자를 쳤습니다. 여기서 중단합니다.</div>' +
        '<ul><li>사람이 있는 통로에서는 <b>경적</b>을 울리고 서행합니다</li>' +
        '<li>교차로와 랙 끝단은 사각지대입니다. 정지 후 좌우를 확인하고 진입합니다</li>' +
        '<li>화물이 시야를 가리면 후진으로 이동합니다</li></ul>' +
        '<div class="row"><button class="btn primary" id="btnBack">메뉴</button></div>');
    }, 900);
  }
}

function tipOver(){
  if(truck.carry) breakPallet(truck.carry, '전도 · 적재물 낙하');
  if(typeof driverOops === 'function') driverOops();
  if(G.mode === 'drive' || G.mode === 'train'){ G.driveTip = 3.0; }
  G.damage += 2;
  truck.v = 0; G.throttle = 0; G.highTravel = 0;
  impact('concrete', 1.3);
  setTimeout(()=> impact('steel', 0.9), 200);
  toast('전도 · 마스트를 올린 채 주행했습니다');
}

function hazards(dt){
  const soft = G.mode === 'drill';      // 연습은 경고만 하고 사고로 잇지 않는다
  const sp = Math.abs(truck.v);
  const moving = sp > 0.45;      // 이 밑은 자리 잡는 중으로 본다
  const step = sp * dt;
  /* 랙 앞에서 작업 중일 때는 주행 판정을 걸지 않는다.
     리치를 내밀었거나 지겟발 앞에 팔레트가 있으면 작업 중이다.
     높이 올리는 것 자체는 잘못이 아니고, 그 상태로 통로를 이동하는 것이 잘못이다. */
  /* 리치를 내민 상태 자체로는 작업 중인지 알 수 없다. 현장에서는 충전할 때 말고는
     리치를 넣지 않으므로, 앞에 팔레트나 놓을 자리가 잡혔는지로 판단한다. */
  const working = G.gauge !== null || G.place !== null;

  let top = null;
  const rank = c => c.lv === 'crit' ? 1 : 0;
  const put = (msg, r, lv)=>{
    const c = { msg:msg, r:clamp(r, 0, 1), lv:lv || 'crit' };
    if(!top || rank(c) > rank(top) || (rank(c) === rank(top) && c.r > top.r)) top = c;
  };

  /* 1. 마스트를 올린 채 통로를 이동 — 누적 이동거리로 본다.
        높을수록 허용 거리가 짧아진다. 포크를 내리면 초기화된다. */
  if(truck.lift <= CFG.liftSafe){
    G.highTravel = 0;
  }else{
    if(moving && !working) G.highTravel += step;
    const warnD = Math.max(1.2, 4.0 - truck.lift*0.9);
    const failD = warnD * 2.6;
    if(G.highTravel > failD){
      // 빈 포크만 올리고 다닌다고 리치트럭이 넘어지지는 않는다. 적재 중일 때만 전도로 본다.
      if(soft) G.highTravel = 0;
      else if(truck.carry && truck.lift > CFG.liftTip) tipOver();
      else if(truck.carry){ breakPallet(truck.carry, '높이 든 채 이동 · 적재물 낙하'); G.highTravel = 0; }
      else{ G.fault += 1; G.highTravel = 0; thud(0.35); toast('빈 포크를 올린 채 이동'); }
    }else if(G.highTravel > warnD){
      put('포크를 내리고 이동하세요', (G.highTravel - warnD)/(failD - warnD));
    }
  }

  /* 2. 지겟발을 바닥에 붙인 채 이동 */
  if(truck.lift < CFG.scrapeLift && moving && !working){
    G.scrapeT += dt;
    SND.scrape = clamp(sp/1.4, 0, 1);
    if(G.scrapeT > 3.0){ if(!soft) G.fault += 1; G.scrapeT = 0; toast('지겟발이 바닥에 끌립니다'); }
    else if(G.scrapeT > 0.5) put('지겟발을 지면에서 띄우고 이동하세요', (G.scrapeT - 0.5)/2.5);
  }else{ G.scrapeT = Math.max(0, G.scrapeT - dt*1.5); SND.scrape = 0; }

  /* 3. 후경 없이 짐을 싣고 이동 — 이것도 거리로 본다 */
  if(!truck.carry || forkAngle() >= CFG.keepTilt){
    G.tiltTravel = 0;
  }else{
    if(moving && !working) G.tiltTravel += step;
    if(G.tiltTravel > 9.0){ if(!soft) breakPallet(truck.carry, '적재물 전방 이탈'); G.tiltTravel = 0; }
    else if(G.tiltTravel > 2.5) put('마스트를 후경으로 당기세요', (G.tiltTravel - 2.5)/6.5);
  }

  /* 4. 랙에서 뽑을 때 들어올림이 모자란 상태 */
  if(truck.carry && G.carryCatch) put('더 올린 다음 리치를 넣으세요', 1, 'warn');

  /* 리치를 내민 채 이동하는 것은 판정하지 않는다. 현장에서는 충전할 때 말고는
     리치를 넣지 않고, 오히려 짐을 든 채 넣다가 팔레트가 차체에 걸려 빠지는 쪽이
     위험하다. 그 걸림은 4번에서 본다. */

  intersections(dt);
  G.risk = top;
  // 습관 통계 — 높이 든 채 이동, 후경 미준수, 최고 속도, 후진 비율
  if(moving && !working && truck.lift > CFG.liftSafe) statAdd('highD', step);
  if(moving && !working && truck.carry && forkAngle() < CFG.keepTilt) statAdd('tiltD', step);
  if(truck.carry && moving){ statAdd('carryD', step); if(truck.v < 0) statAdd('revD', step); }
  if(truck.z < WALL_Z && sp > (G.st && G.st.vmax || 0)) { if(!G.st) G.st = {}; G.st.vmax = sp; }
}

/* 교차로 — 정지 후 경적. 통로 끝에서 안 서고 나가면 지적 */
const INTER = { cur:null, stopped:false, horned:false, cool:0 };
function intersections(dt){
  if(G.mode === 'drive' || G.mode === 'train' || G.mode === 'drill' || G.mode === 'exam' || G.mode === 'course' || G.mode === 'roam') return;
  if(truck.z > WALL_Z - 1) return;
  INTER.cool = Math.max(0, INTER.cool - dt);
  let here = null;
  for(const q of INTERSECTIONS){ if(Math.hypot(truck.x - q.x, truck.z - q.z) < INTER_R){ here = q; break; } }
  if(here && INTER.cur !== here){
    INTER.cur = here; INTER.stopped = false; INTER.horned = false; INTER.entV = Math.abs(truck.v);
  }
  if(INTER.cur){
    if(Math.abs(truck.v) < 0.15) INTER.stopped = true;
    if(G.horn && !G.defects.horn) INTER.horned = true;
    if(!here){
      // 빠져나갔다 — 통과 판정
      const ok = INTER.stopped && INTER.horned;
      statAdd('xN', 1); if(ok){ statAdd('xOk', 1); if(G.mode === 'edu' && G.step === 8 && Math.hypot(INTER.cur.x, INTER.cur.z - 12.5) < 0.1) G.flags.xed = true; }
      if(!ok && INTER.cool <= 0 && INTER.entV > 0.4){
        INTER.cool = 4;
        fault(!INTER.stopped ? '교차로 일시정지 없이 통과' : '교차로 경적 없이 통과', 'H5');
      }
      INTER.cur = null;
    }
  }
}

/* ============================================================
   보행자 · 신호수 · 도로 차량
   ============================================================ */
function updatePeds(dt){
  const roam = G.mode === 'roam';
  const lim = (G.mode === 'work' && G.pedLimit != null) ? G.pedLimit : peds.length;
  peds.forEach((p, i)=>{ p.mesh.visible = i < lim; });
  for(const p of peds){
    if(!p.mesh.visible) continue;
    const dx = truck.x - p.mesh.position.x;
    const dz = truck.z - p.mesh.position.z;
    const d = Math.hypot(dx, dz);

    // 지게차가 다가오면 비켜준다. 경적을 울리면 더 빨리 물러난다
    if(G.horn && G.defects.horn) defectHit('horn');
    const hornOk = G.horn && !G.defects.horn;
    if(G.defects.light && d < 12) defectHit('light');
    const see = (hornOk ? 11 : 7) * (G.defects.light ? 0.6 : 1);
    const alert = d < see && Math.abs(truck.v) > 0.15;
    p.yield += ((alert ? 1 : 0) - p.yield) * (1 - Math.exp(-(hornOk ? 6 : 3)*dt));
    p.side += ((alert ? (dx > 0 ? -1.5 : 1.5) : 0) - p.side) * (1 - Math.exp(-2.6*dt));

    const speed = alert ? 0.25 : 1.15;
    p.z += p.dir * speed * dt;
    if(p.z > p.path.z1){ p.z = p.path.z1; p.dir = -1; }
    if(p.z < p.path.z0){ p.z = p.path.z0; p.dir = 1; }

    p.mesh.position.set(p.path.x + p.side, 0, p.z);
    p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;

    p.t += dt * speed * 3.2;
    const sw = Math.sin(p.t) * 0.5;
    const u = p.mesh.userData;
    u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
    u.armL.rotation.x = -sw*0.7; u.armR.rotation.x = sw*0.7;

    // 접촉 — 사람은 다른 어떤 사고보다 크게 다룬다
    if(d < 1.6 && Math.abs(truck.v) > 0.55 && G.npcHitCool <= 0){
      G.npcHitCool = 3.0;
      p.side += dx > 0 ? -1.8 : 1.8;
      if(roam){ impact('plastic', 0.6); toast('보행자가 놀라 물러났습니다'); }
      else if(G.mode === 'drill'){ G.drillMiss++; impact('person', 0.8); toast('보행자 접촉'); drillTask(); }
      else hitPerson();
    }
  }
  if(G.npcHitCool > 0) G.npcHitCool -= dt;

  for(const s of signals){
    s.t += dt;
    s.mesh.userData.armR.rotation.x = -1.1 + Math.sin(s.t*2.1)*0.55;
  }
}

function updateCars(dt){
  const on = G.outUnlocked;
  for(const c of cars){
    c.mesh.visible = on;
    if(!on) continue;
    const lz = ROAD.lane[c.lane];
    // 지게차가 같은 차선 앞에 있으면 감속하고 경적을 울린다
    let blocked = false;
    if(Math.abs(truck.z - lz) < 3.4){
      const ahead = (truck.x - c.x) * c.dir;
      if(ahead > 0 && ahead < 26) blocked = true;
    }
    const want = blocked ? Math.min(2.0, Math.abs(truck.v) + 0.6) : c.base;
    c.v += (want - c.v) * (1 - Math.exp(-1.8*dt));
    c.x += c.dir * c.v * dt;
    if(c.x > 126) c.x = -126;
    if(c.x < -126) c.x = 126;
    c.mesh.position.set(c.x, 0, lz);

    c.honk -= dt;
    if(blocked && c.v < 3.2 && c.honk <= 0){
      c.honk = 1.1 + Math.random()*1.4;
      carHonk();
    }
  }
}

