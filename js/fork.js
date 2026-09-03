"use strict";

/* ============================================================
   포크 - 파렛트
   삽입은 발끝이 파렛트의 어느 부위에 닿았는지로 갈린다.
   구멍이면 들어가고, 턱·블록·상판이면 밀리고, 화물이면 찌른다.
   ============================================================ */

/* 랙 단의 여유 높이 — 그 위 빔까지 */
function slotClear(s){
  if(!s || s.kind !== 'slot') return Infinity;
  const li = LEVEL_Y.indexOf(s.y);
  if(li < 0 || li >= LEVEL_Y.length - 1) return Infinity;
  return LEVEL_Y[li+1] - LEVEL_Y[li] - 0.10;
}

/* 놓을 자리 판정 — 랙 칸, 평치, 상판(적재함·엘베), 다른 파렛트 위(얹기), 맨바닥 */
function supportUnder(x, z, lift){
  let best = { y:0, place:null, cost:Infinity, surf:null, base:null };
  for(const s of slots){
    if(s.pallet) continue;
    const dx = Math.abs(x - s.x), dz = Math.abs(z - s.z);
    if(dx > 0.75 || dz > 0.75) continue;
    if(s.y > lift + 0.30) continue;
    const cost = Math.abs(lift - s.y)*2.0 + Math.hypot(dx, dz);
    if(cost < best.cost) best = { y:s.y, place:s, cost:cost, surf:null, base:null };
  }
  for(const z0 of zones){
    if(z0.pallet) continue;
    const d = Math.hypot(x - z0.x, z - z0.z);
    if(d > 0.90) continue;
    const cost = lift*2.0 + d;
    if(cost < best.cost) best = { y:0, place:z0, cost:cost, surf:null, base:null };
  }
  // 얹기 — 외부 파렛트를 규격 파렛트 위에
  if(truck.carry && (PAL_KINDS[truck.carry.kind].ext || G.mode === 'exam')){
    for(const q of pallets){
      if(q === truck.carry || q.carried || q.falling || q.broken || q.cargo !== 'empty' || PAL_KINDS[q.kind].ext || q.stack) continue;
      if(G.mode === 'exam' && q !== EXAM.target) continue;
      const d = Math.hypot(x - q.x, z - q.z);
      if(d > 0.55) continue;
      const top = q.y + PAL_KINDS[q.kind].h;
      if(lift < top - 0.05 || lift > top + 0.60) continue;
      const cost = Math.abs(lift - top)*2.0 + d - 0.2;
      if(cost < best.cost) best = { y:top, place:null, cost:cost, surf:null, base:q };
    }
  }
  if(typeof surfSupport === 'function'){
    const s = surfSupport(x, z, lift);
    if(s && s.cost < best.cost) best = { y:s.y, place:null, cost:s.cost, surf:s.id, base:null };
  }
  return best;
}

function placeTarget(p){
  const goal = objectivePlace();
  if(goal && goal.kind && !goal.pallet &&
     Math.abs(p.x - goal.x) < 1.7 && Math.abs(p.z - goal.z) < 1.7 &&
     truck.lift - goal.y > -0.35 && truck.lift - goal.y < 1.10) return goal;
  let best = null, bc = Infinity;
  const take = (pl, d, dy)=>{ const cost = Math.abs(dy)*2.0 + d; if(cost < bc){ bc = cost; best = pl; } };
  for(const s0 of slots){
    if(s0.pallet) continue;
    const dx = p.x - s0.x, dz = p.z - s0.z;
    if(Math.abs(dx) > 1.7 || Math.abs(dz) > 1.7) continue;
    const dy = truck.lift - s0.y;
    if(dy < -0.35 || dy > 1.10) continue;
    take(s0, Math.hypot(dx, dz), dy);
  }
  for(const z0 of zones){
    if(z0.pallet) continue;
    const d = Math.hypot(p.x - z0.x, p.z - z0.z);
    if(d > 1.7 || truck.lift > 1.10) continue;
    take(z0, d, truck.lift);
  }
  return best;
}

function objectivePlace(){
  if(G.mission && G.mission.to && G.mission.to.kind) return G.mission.to;
  if(G.mode === 'edu'){
    const st = TUT[G.step];
    if(st && st.highlight) return place(st.highlight);
  }
  return null;
}

/* 앞 파렛트와의 간격 — 밀착 게이지용. 같은 면 위에서 진행 방향 앞쪽 */
function frontGap(p){
  let best = null;
  const fx = dirX(truck.h), fz = dirZ(truck.h);
  for(const q of pallets){
    if(q === p || q.carried || q.falling || q.broken) continue;
    if(Math.abs(q.y - p.y) > 0.12) continue;
    const dx = q.x - p.x, dz = q.z - p.z;
    const lon = dx*fx + dz*fz, lat = dx*nrmX(truck.h) + dz*nrmZ(truck.h);
    if(lon < 0.3 || lon > 2.6 || Math.abs(lat) > 0.8) continue;
    const gap = lon - palletHalfD(p) - palletHalfD(q);
    if(best === null || gap < best) best = gap;
  }
  return best;
}

/* ── 놓기 ── */
function precisionGrade(off){
  return off <= 0.03 ? 3 : (off <= 0.10 ? 2 : 1);
}
function dropCarried(){
  const p = truck.carry;
  const pose = carryPose();
  p.x = pose.x; p.z = pose.z; p.yaw = truck.h;
  const sup = supportUnder(p.x, p.z, truck.lift);
  const tilted = Math.abs(forkAngle()) > CFG.putTilt;
  const onRack = sup.place && sup.place.kind === 'slot' && sup.place.y > 0.2;
  if(tilted && onRack){ breakPallet(p, '마스트 기울어짐 · 낙하'); return; }
  if(tilted) toast('마스트를 수평으로 하고 내리세요');
  p.vx = 0; p.vz = 0; p.om = 0; p.surf = null;
  if(sup.place && sup.place.kind === 'slot'){
    const off = Math.hypot(p.x - sup.place.x, p.z - sup.place.z);
    const ang = Math.abs(wrapQuarter(p.yaw - sup.place.yaw));
    if(off <= CFG.putTolXZ && ang <= CFG.putTolAng){
      p.x = sup.place.x; p.z = sup.place.z; p.y = sup.place.y;
      p.yaw = sup.place.yaw + Math.round((p.yaw - sup.place.yaw)/(Math.PI/2))*(Math.PI/2);
      p.pitch = 0; p.slot = sup.place; sup.place.pallet = p; p.pickY = p.y;
      truck.carry = null; p.carried = false; p.inserted = false;
      const gr = precisionGrade(off);
      statAdd('placeN', 1); statAdd('placeErr', off);
      if(gr === 3) statAdd('perfect', 1);
      if(onRack){
        if(p.wrap !== 'full' && p.h > 0) fault('미랩핑 파렛트 랙 적재', 'H7');
        if(p.kind === 'wood' && !p.stack) fault('목재 파렛트째 랙 적재 · 규격 파렛트에 얹으세요', 'H9');
        G.postDrop = { slot:sup.place, t:0, done:false };
      }
      blip(720 + gr*40, 0.13, 'triangle', 0.05);
      toast(gr === 3 ? '적재 완료 · 정중앙' : (gr === 2 ? '적재 완료' : '적재 완료 · 편차 ' + Math.round(off*100) + 'cm'), true);
      if(G.mode === 'exam' && typeof examPlaced === 'function') examPlaced(off);
    }else breakPallet(p, '적재 위치 이탈 · 낙하');
  }else if(sup.place && sup.place.kind === 'zone'){
    p.x = sup.place.x; p.z = sup.place.z; p.y = 0; p.pitch = 0;
    p.zone = sup.place; sup.place.pallet = p; p.pickY = 0;
    truck.carry = null; p.carried = false; p.inserted = false;
    if(G.mode === 'exam' && typeof examPlaced === 'function') examPlaced(0);
  }else if(sup.base){
    stackOnto(p, sup.base);
  }else if(sup.surf){
    p.y = sup.y; p.pitch = 0; p.surf = sup.surf; p.pickY = sup.y;
    truck.carry = null; p.carried = false; p.inserted = false;
    if(typeof surfDropped === 'function') surfDropped(p);
  }else{
    p.y = 0; p.pitch = 0; p.pickY = 0;
    truck.carry = null; p.carried = false; p.inserted = false;
    if(G.mode === 'exam' && typeof examPlaced === 'function') examPlaced(0);
  }
  p.halfIns = false; p.slip = 0;
}

/* 외부 파렛트를 규격 파렛트 위에 얹는다 — 둘을 하나로 합친다 */
function stackOnto(top, base){
  const off = { x:0, z:0 };
  const c = Math.cos(base.yaw), s = Math.sin(base.yaw);
  const dx = top.x - base.x, dz = top.z - base.z;
  off.x = dx*c - dz*s; off.z = dx*s + dz*c;
  const err = Math.hypot(off.x, off.z);
  if(err > 0.28){ breakPallet(top, '얹기 편차 · 미끄러져 낙하'); return; }
  base.stack = { kind: top.kind, off: off };
  base.cargo = top.cargo; base.cargoName = top.cargoName; base.seed = top.seed;
  base.w = top.w; base.h = top.h; base.cgY = top.cgY; base.c = top.c;
  base.wrap = top.wrap; base.skew = top.skew; base.overhang = top.overhang;
  base.mass = 25 + top.mass;
  removePallet(top);
  buildPalletMesh(base);
  truck.carry = null;
  statAdd('placeN', 1); statAdd('placeErr', err);
  blip(700, 0.13, 'triangle', 0.05);
  toast(err <= 0.05 ? '얹기 완료 · 정중앙' : '얹기 완료 · 편차 ' + Math.round(err*100) + 'cm', true);
  if(G.mission && G.mission.onStack) G.mission.onStack(base);
  if(G.mode === 'exam' && typeof examPlaced === 'function') examPlaced(err);
}

/* 겹친 파렛트의 위층만 들어올렸다 — 아래 규격 파렛트가 남는다 */
function splitStack(p){
  const st = p.stack;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const top = createPallet({ kind:st.kind, cargo:p.cargo, wrap:p.wrap, seed:p.seed, skew:p.skew, overhang:p.overhang },
    { x: p.x + st.off.x*c + st.off.z*s, z: p.z - st.off.x*s + st.off.z*c, y: p.y + PAL_KINDS[p.kind].h, yaw:p.yaw });
  top.w = p.w; top.mass = 25 + p.w; top.h = p.h; top.c = p.c; top.cargoName = p.cargoName;
  p.stack = null; p.cargo = 'empty'; p.cargoName = '빈 파렛트'; p.h = 0; p.w = 0; p.mass = 25; p.c = 0; p.wrap = 'none';
  buildPalletMesh(p);
  return top;
}

function breakPallet(p, msg){
  if(G.mode === 'drill'){
    if(truck.carry === p) truck.carry = null;
    p.carried = false; p.inserted = false;
    G.drillMiss++;
    thud(0.28); toast(msg);
    if(G.drill === 'pick' && p === G.drillPallet){ pickStartPose(); pickSpawn(); }
    drillTask();
    return;
  }
  p.y = Math.max(p.y, 0);
  p.falling = true; p.fallV = 0; p.broken = true; p.pitch = 0;
  if(p.slot){ p.slot.pallet = null; p.slot = null; }
  if(p.zone){ p.zone.pallet = null; p.zone = null; }
  if(truck.carry === p) truck.carry = null;
  p.carried = false; p.inserted = false; p.surf = null;
  p.yaw += 0.35;
  G.damage += 1 + (p.c || 0);
  statAdd('damage', 1);
  thud(0.45);
  if(p.h > 0){ spillAll(p, 1.4); if(p.c >= 2) impact('glass', 0.9); }
  const obj = objectivePallet();
  toast(msg + (obj === p ? ' · 다시 실어 옮기세요' : ''));
  if(G.mode === 'exam' && typeof examFail === 'function') examFail('파렛트 낙하');
}

/* 지적 — 모드별로 경고만 하거나 세거나 */
function fault(msg, code){
  const soft = G.mode === 'drill' || G.mode === 'edu' || G.mode === 'drive' || G.mode === 'roam' || G.mode === 'train';
  if(!soft){ G.fault += 1; statAdd('fault', 1); }
  if(G.mode === 'drill') G.drillMiss++;
  thud(0.22); toast(msg);
  if(G.mode === 'exam' && typeof examFault === 'function') examFault(code, msg);
}

/* 랙 위 파렛트를 밀면 떨어지고, 바닥·평치는 밀린다 */
function shovePallet(p, nx, nz, dist, cx, cz, dt, oneShot){
  if(palletFree(p)){ pushPallet(p, nx, nz, dist, cx, cz, dt, oneShot); return; }
  if(p.slot){
    p.x += nx*dist; p.z += nz*dist;
    const off = Math.hypot(p.x - p.slot.x, p.z - p.slot.z);
    if(off > 0.50 && p.slot.y > 0.2){ impact('steel', 0.8); breakPallet(p, '랙에서 파렛트 낙하'); }
    else if(off > 0.50){ p.slot.pallet = null; p.slot = null; }
  }
}

/* 앞다리 — 파렛트 밑으로 못 들어간다. 차체로 밀면 파렛트가 밀린다. */
function legPush(dt){
  const REACH = CFG.legTip;
  for(const p of pallets){
    if(p.carried || p.falling || p.inserted) continue;
    if(p.y > 0.26) continue;
    const dx = p.x - truck.x, dz = p.z - truck.z;
    const lon = dx*dirX(truck.h) + dz*dirZ(truck.h);
    const lat = dx*nrmX(truck.h) + dz*nrmZ(truck.h);
    if(lon < 0.3 || lon > REACH + palletHalfD(p) + 0.05) continue;
    if(Math.abs(lat) > palletHalfW(p) + 0.55) continue;
    const over = REACH + palletHalfD(p) - lon;
    if(over <= 0.02) continue;
    const legLat = clamp(lat, -0.48, 0.48);
    const cx = truck.x + dirX(truck.h)*REACH + nrmX(truck.h)*legLat;
    const cz = truck.z + dirZ(truck.h)*REACH + nrmZ(truck.h)*legLat;
    shovePallet(p, dirX(truck.h), dirZ(truck.h), over, cx, cz, dt);
    if(G.bumpCool <= 0){
      G.bumpCool = 1.4;
      thud(0.20);
      if(G.mode !== 'drive' && G.mode !== 'train') fault('앞다리가 파렛트를 밀고 있습니다', 'LEG');
      else toast('앞다리로 밀고 있습니다');
    }
  }
}

/* 발끝 접촉 분류 */
function tipState(p, r, dy){
  const k = PAL_KINDS[p.kind];
  let insLo = k.insLo, insHi = k.insHi, band = 0;
  const topK = p.stack ? PAL_KINDS[p.stack.kind] : null;
  if(topK){
    const lo2 = k.h + topK.insLo, hi2 = k.h + topK.insHi;
    if(dy >= lo2 - 0.05 && dy < hi2 + 0.06){ insLo = lo2; insHi = hi2; band = 1; }
  }
  const palTop = (topK ? k.h + topK.h : k.h);
  const cargoTop = palTop + p.h;
  let side = false;
  if(k.sides === 2 || (topK && band === 1 && topK.sides === 2)){
    let a = wrapPi(p.yaw - truck.h);
    while(a > Math.PI/2) a -= Math.PI; while(a < -Math.PI/2) a += Math.PI;
    side = Math.abs(a) > Math.PI/4;
  }
  if(dy < insLo - 0.10) return { s:'under', band:band };
  if(dy >= cargoTop + 0.02) return { s:'over', band:band };
  if(dy >= palTop - 0.02 && p.h > 0) return { s:'poke', band:band };
  if(side) return { s:'side', band:band };
  if(dy < insLo) return { s:'lip', band:band };
  if(dy > insHi) return { s:'deck', band:band };
  const lat = Math.abs(r.lat), ang = Math.abs(r.ang);
  if(lat < PHYS.insLat && ang < PHYS.insAng) return { s:'in', band:band };
  if(lat < PHYS.alignLat && ang < PHYS.alignAng) return { s:'align', band:band };
  return { s:'block', band:band };
}

function fold180(a){ a = wrapPi(a); while(a > Math.PI/2) a -= Math.PI; while(a < -Math.PI/2) a += Math.PI; return a; }

function forkLogic(dt){
  if(G.postDrop) postDropCheck(dt);
  if(truck.carry){ carriedLogic(dt); legPush(dt); fallLogic(dt); return; }
  G.carryCatch = false;
  G.place = null;

  let gt = null, gcost = Infinity;
  for(const p of pallets){
    if(p.carried || p.falling) continue;
    if(Math.abs(p.x - truck.x) > 5 || Math.abs(p.z - truck.z) > 5) continue;
    const r = relToFork(p);
    if(PAL_KINDS[p.kind].sides === 2) r.ang = fold180(p.yaw - truck.h);
    if(r.long < -0.3 || r.long > 2.4 || Math.abs(r.lat) > 0.85){ p.inserted = false; continue; }
    const d0 = truck.lift - p.y;
    if(d0 < -0.30 || d0 > (p.topY || 0.15) + 0.4){ p.inserted = false; continue; }
    const cost = Math.abs(d0 - 0.06)*1.5 + Math.max(0, r.long);
    if(cost < gcost){ gcost = cost; gt = { p:p, r:r }; }
  }
  if(!gt){ G.gauge = null; legPush(dt); fallLogic(dt); return; }

  const p = gt.p, r = gt.r;
  const pen = CFG.forkTip + palletHalfD(p) - r.long;
  const dy = truck.lift - p.y;
  const okT = Math.abs(forkAngle()) < CFG.tolTilt;
  const st = tipState(p, r, dy);
  const nb = palletNeighbors(p);
  const sticky = p.adh > 0.3 && p.wrap !== 'none' && nb.some(n=> n.q.wrap !== 'none');
  G.gauge = { lat:r.lat, ang:r.ang, dy:dy - 0.06, tilt:forkAngle(), pen:pen, state:st.s, band:st.band,
              ok: st.s === 'in' && okT, reach:truck.reach, room: Math.max(0, CFG.reachMax - truck.reach),
              over: st.s === 'over', under: st.s === 'under', nudge: st.s === 'align',
              sticky: sticky, peeled: p.adh <= 0.05, twist: p.inserted ? Math.abs(wrapPi(truck.h - p.insYaw)) : 0,
              kind:p.kind, stack: !!p.stack, side: st.s === 'side', inserted: p.inserted };

  const adv = truck.v + Math.max(0, levers.reach.val) * CFG.reachSpeed;

  if(pen <= 0 || st.s === 'over' || st.s === 'under'){
    p.inserted = false;
    legPush(dt); fallLogic(dt); return;
  }

  if(p.inserted){
    // 꽂힌 파렛트는 바닥에 그대로 있고 지겟발만 미끄러져 들어간다. 각도만 지겟발을 따른다.
    const tw = Math.abs(wrapPi(truck.h - p.insYaw));
    if(palletFree(p)){
      p.yaw = truck.h + p.insRel;
      p.vx = 0; p.vz = 0; p.om = 0;
      detachPlace(p);
      // 끝까지 들어간 뒤 더 밀면 캐리지가 파렛트를 민다
      const full = palletHalfD(p)*2;
      if(pen > full + 0.02 && adv > 0.05){
        shovePallet(p, dirX(truck.h), dirZ(truck.h), Math.min(pen - full, adv*dt*1.6 + 0.004), null, null, dt);
        SND.scrape = 0.3;
      }
    }
    if(sticky){
      if(tw >= PHYS.peelMin && tw <= PHYS.peelMax){
        p.peelT = (p.peelT || 0) + dt;
        if(p.peelT >= PHYS.peelTime && p.adh > 0.05){
          p.adh = 0; for(const n of nb) n.q.adh = Math.min(n.q.adh, 0.2);
          statAdd('peelN', 1);
          blip(300, 0.18, 'sawtooth', 0.04); toast('랩이 떨어졌습니다', true);
        }
      }else if(tw > PHYS.peelMax && !p.scraped){ p.scraped = true; fault('옆 파렛트 긁힘', 'H8'); }
    }
    p.insDepth = Math.max(p.insDepth, Math.min(pen, palletHalfD(p)*2));
    if(pen < -0.02) p.inserted = false;
    else if(truck.lift > p.insLift + 0.035){
      if((p.insDepth || 0) < 0.30){
        // 발끝만 걸친 채 들었다 — 파렛트가 앞으로 밀려 넘어간다
        p.inserted = false; shovePallet(p, dirX(truck.h), dirZ(truck.h), 0.20, null, null, dt, true);
        fault('삽입 부족 · 파렛트가 밀려 넘어갑니다', 'INS');
      }else liftPallet(p, st.band, nb);
    }
    legPush(dt); fallLogic(dt); return;
  }

  if(st.s === 'in' && okT){
    if(pen > 0.02){
      p.inserted = true; p.insYaw = truck.h; p.insRel = wrapPi(p.yaw - truck.h); p.insLift = truck.lift;
      const pose = carryPose();
      p.insLon = (p.x - pose.x)*dirX(truck.h) + (p.z - pose.z)*dirZ(truck.h);
      p.insDepth = pen; p.peelT = 0; p.scraped = false;
      statAdd('insTry', 1); statAdd('insOk', 1);
      blip(420, 0.06, 'triangle', 0.03);
    }
    legPush(dt); fallLogic(dt); return;
  }

  // 접촉 — 밀린다
  if(adv > 0.05 && pen > 0){
    const push = Math.min(pen, adv*dt*1.6 + 0.004);
    const fx = dirX(truck.h), fz = dirZ(truck.h);
    let latC = 0;
    if(st.s === 'block' || st.s === 'lip' || st.s === 'side' || st.s === 'deck'){
      const l1 = r.lat - CFG.forkGap, l2 = r.lat + CFG.forkGap;
      const in1 = Math.abs(l1) < palletHalfW(p), in2 = Math.abs(l2) < palletHalfW(p);
      latC = -(in1 && in2 ? r.lat : (in1 ? l1 : l2));
    }
    const cx = p.x + nrmX(truck.h)*latC, cz = p.z + nrmZ(truck.h)*latC;
    if(st.s === 'align'){
      shovePallet(p, fx, fz, push*0.6, null, null, dt);
      if(palletFree(p) || p.slot){
        p.yaw -= (PAL_KINDS[p.kind].sides === 2 ? fold180(p.yaw - truck.h) : wrapQuarter(p.yaw - truck.h)) * Math.min(1, push*3.4);
        const d2 = -r.lat * Math.min(1, push*2.6);
        p.x += nrmX(truck.h)*d2; p.z += nrmZ(truck.h)*d2;
      }
      if(G.bumpCool <= 0){ toast('밀어서 정렬 중', true); G.bumpCool = 1.0; }
      SND.scrape = 0.4;
    }else if(st.s === 'poke'){
      shovePallet(p, fx, fz, push*0.5, cx, cz, dt);
      if(G.bumpCool <= 0){
        G.bumpCool = 1.6;
        if(p.h > 0 && (p.wrap === 'none' || p.c >= 1)){
          spillTop(p, 3, fx, fz, 0.8);
          G.damage += 1; statAdd('damage', 1); impact(p.c >= 2 ? 'glass' : 'plastic', 0.8);
          toast('지겟발이 화물을 찔렀습니다 · 파손');
        }else fault('지겟발이 화물을 찌릅니다 · 포크를 내리세요', 'POKE');
      }
    }else{
      shovePallet(p, fx, fz, push, cx, cz, dt);
      SND.scrape = st.s === 'lip' ? 0.7 : 0.3;
      if(G.bumpCool <= 0){
        G.bumpCool = 1.4;
        statAdd('insTry', 1);
        const msg = st.s === 'lip' ? '하판 턱을 밀고 있습니다 · 포크를 올리세요'
                  : st.s === 'deck' ? '상판을 밀고 있습니다 · 포크를 내리세요'
                  : st.s === 'side' ? '막힌 면입니다 · 열린 면으로 돌아가세요'
                  : (!okT ? '포크 기울어짐' : (Math.abs(r.ang) >= PHYS.alignAng ? '각도 불량 · 파렛트가 돌아갑니다' : '좌우 불량 · 블록을 밀고 있습니다'));
        if(G.mode === 'drive' || G.mode === 'train') toast(msg); else fault(msg, 'INS');
      }
    }
  }
  legPush(dt); fallLogic(dt);
}

/* 지겟발이 파렛트를 띄우는 순간 */
function liftPallet(p, band, nb){
  if(p.adh > 0.3 && p.wrap !== 'none'){
    for(const n of nb){
      const q = n.q;
      if(q.wrap === 'none' || q.carried) continue;
      const f = Math.min(p.adh, q.adh) * PHYS.adhForce;
      if(f < 150) continue;
      if(f > q.mass * PHYS.g * PHYS.dragRatio){
        breakPallet(q, '랩 접착 · 옆 파렛트가 딸려 나와 낙하');
      }else{
        if(q.c >= 1 && q.h > 0){ G.damage += 1; statAdd('damage', 1); impact(q.c >= 2 ? 'glass' : 'plastic', 0.7); toast('랩이 찢어지며 옆 화물 파손'); }
        else fault('랩 접착 · 옆 파렛트 랩 손상', 'H8');
        setWrap(q, 'partial'); q.adh = 0;
      }
    }
    statAdd('adhN', 1);
  }else if(p.adh <= 0.05 && nb.length && p.wrap !== 'none') statAdd('adhN', 1);
  p.adh = 0;
  let cp = p;
  if(band === 1 && p.stack){ cp = splitStack(p); toast('위층 파렛트만 들렸습니다'); fault('겹친 파렛트 위층만 삽입', 'H9'); }
  cp.pickY = cp.slot ? cp.slot.y : (cp.zone ? 0 : cp.y);
  if(cp.slot){ cp.slot.pallet = null; cp.slot = null; }
  if(cp.zone){ cp.zone.pallet = null; cp.zone = null; }
  cp.surf = null;
  cp.carried = true; cp.inserted = false; truck.carry = cp;
  cp.halfIns = (p.insDepth || 0) < PHYS.deepIns;
  cp.slip = 0;
  blip(560, 0.10, 'triangle', 0.05);
  if(cp.halfIns) toast('반삽입 · 후경을 주고 천천히');
}

function carriedLogic(dt){
  const p = truck.carry;
  const pose = carryPose();
  p.x = pose.x; p.z = pose.z; p.yaw = truck.h; p.y = truck.lift; p.pitch = -forkAngle();

  let overRack = false;
  for(const row of ALL_ROWS) if(Math.abs(p.z - row.z) < 0.95){ overRack = true; break; }
  const clear = truck.lift - (p.pickY || 0);
  G.carryCatch = overRack && (p.pickY || 0) > 0.20 && clear < CFG.pickClear;
  if(G.carryCatch && levers.reach.val < -0.05 && truck.reach > 0.03){
    breakPallet(p, '들어올림 부족 · 파렛트가 걸려 이탈');
    G.carryCatch = false; return;
  }

  if(p.halfIns){
    const back = clamp(forkAngle()/CFG.keepTilt, 0, 1);
    if(Math.abs(truck.v) > 0.2 || Math.abs(levers.lift.val) > 0.1) p.slip += dt * PHYS.slipHalf * (1 - back);
    if(p.slip > 0.30){ breakPallet(p, '반삽입 · 앞으로 미끄러져 낙하'); return; }
  }

  if(p.h > 0 && p.wrap !== 'full' && p.layers && p.layers.length > 1){
    const aLon = Math.abs(truck.v - (G.prevV || 0))/Math.max(dt, 0.008);
    const aLat = Math.abs(truck.v * truck.v * Math.sin(truck.steer) / CFG.wheelBase);
    const a = Math.hypot(aLon, aLat) + Math.abs(levers.lift.val) * 0.3;
    let thr = CARGO_PRESETS[p.cargo].spill * (p.wrap === 'partial' ? PHYS.spillPartial : 1);
    if(p.skew && (Math.abs(p.skew.x) > 0.05 || Math.abs(p.skew.z) > 0.05)) thr *= PHYS.skewFactor;
    G.spillCool = Math.max(0, (G.spillCool || 0) - dt);
    if(a > thr && G.spillCool <= 0){
      G.spillCool = 1.5;
      const bx = dirX(truck.h), bz = dirZ(truck.h);
      const sgn = truck.v - (G.prevV || 0) > 0 ? -1 : 1;
      spillTop(p, 4 + Math.floor(Math.random()*3), bx*sgn, bz*sgn, 0.8 + Math.min(1.5, a*0.3));
      G.damage += 1; statAdd('damage', 1); impact('plastic', 0.6);
      toast('상자가 쏟아졌습니다 · ' + (p.wrap === 'none' ? '미랩핑' : '랩핑 불량'));
    }
  }
  G.prevV = truck.v;

  const t = placeTarget(p);
  const sup = supportUnder(p.x, p.z, truck.lift);
  if(t){
    const rx = p.x - t.x, rz = p.z - t.z;
    const cl = slotClear(t);
    G.place = { lat: rx*nrmX(truck.h) + rz*nrmZ(truck.h), lon: rx*dirX(truck.h) + rz*dirZ(truck.h),
                ang: wrapQuarter(t.yaw - truck.h), dy: truck.lift - t.y, tilt: forkAngle(),
                rack: t.kind === 'slot' && t.y > 0.20, id: t.id, clear: cl, fit: (p.topY || 0.15) <= cl, surf:null, gap:null, base:false };
  }else if(sup.base){
    const rx = p.x - sup.base.x, rz = p.z - sup.base.z;
    G.place = { lat: rx*nrmX(truck.h) + rz*nrmZ(truck.h), lon: rx*dirX(truck.h) + rz*dirZ(truck.h),
                ang: wrapQuarter(sup.base.yaw - truck.h), dy: truck.lift - sup.y, tilt: forkAngle(),
                rack:false, id:'얹기', clear:Infinity, fit:true, surf:null, gap:null, base:true };
  }else if(sup.surf){
    G.place = { lat:0, lon:0, ang:0, dy: truck.lift - sup.y, tilt: forkAngle(), rack:false, id: sup.surf,
                clear: (typeof surfClear === 'function' ? surfClear(sup.surf) : Infinity), fit:true, surf:sup.surf,
                gap: frontGap(p), wall: (typeof surfWallGap === 'function' ? surfWallGap(sup.surf, p) : null), base:false };
  }else G.place = null;

  const lonC = CFG.mastBase + truck.reach + 0.68;
  const onLegs = lonC < CFG.legTip + CFG.palHalf - 0.02;
  const supY = sup.y;
  const floorY = (onLegs && supY < 0.05) ? 0.30 : supY;
  if(G.legCool > 0) G.legCool -= dt;
  // 높이 안 맞는 단 — 파렛트가 실제로 칸 위에 들어가 있을 때만 위 빔에 걸린다
  if(G.place && !G.place.fit && G.place.dy < 0.35 && sup.place && sup.place.kind === 'slot' &&
     Math.hypot(G.place.lat, G.place.lon) < 0.55 && truck.reach > 0.25){
    if(truck.lift < sup.y + 0.30){
      truck.lift = Math.max(truck.lift, sup.y + 0.30);
      if(G.legCool <= 0){ G.legCool = 2.4; impact('steel', 0.6); fault('화물이 위 빔에 걸립니다 · 이 단에는 안 들어갑니다', 'FIT'); }
      return;
    }
  }
  if(truck.lift <= floorY + 0.005){
    truck.lift = floorY;
    if(onLegs && supY < 0.05){
      if(G.legCool <= 0){ G.legCool = 2.6; toast('앞다리 위입니다 · 리치를 내밀고 내리세요'); }
    }else dropCarried();
  }
  G.gauge = null;
}

/* 하역 절차 — 랙에 놓고 나서 리치 인 → 포크 하강 → 후진 */
function postDropCheck(dt){
  const q = G.postDrop;
  q.t += dt;
  const slot = q.slot;
  const reachIn = truck.reach < 0.12, low = truck.lift < slot.y + 0.45;
  if(reachIn && low){ G.postDrop = null; statAdd('procOk', 1); statAdd('procN', 1); return; }
  if(q.t > 20 || Math.hypot(truck.x - slot.x, truck.z - slot.z) > 6){ G.postDrop = null; statAdd('procN', 1); return; }
  if(truck.v < -0.3 && !q.done){
    q.done = true; statAdd('procN', 1);
    fault(!reachIn ? '하역 절차 위반 · 리치를 넣고 후진하세요' : '하역 절차 위반 · 포크를 내리고 후진하세요', 'H6');
    G.postDrop = null;
  }
}

function fallLogic(dt){
  for(const p of pallets){
    if(!p.falling) continue;
    p.fallV += 9.8 * dt;
    p.y -= p.fallV * dt;
    if(p.y <= 0){ p.y = 0; p.falling = false; p.fallV = 0; }
  }
}

/* 통계 — 습관 리포트 */
function statAdd(k, v){
  if(!G.st) G.st = {};
  G.st[k] = (G.st[k] || 0) + v;
}
