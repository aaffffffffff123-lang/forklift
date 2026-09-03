"use strict";

/* ============================================================
   근무 — 하루 = 미션 N건 + 충전. 일차가 올라가면 상황이 빡빡해진다.
   ============================================================ */
const WORK_DAYS = [
  { n:4, types:['move'],                              lvl:1, cargos:['water','veg'],                ext:0,   unwrap:0,    peds:0, adhShow:true,  time:0  },
  { n:5, types:['move','restock'],                    lvl:2, cargos:['water','veg','frozen'],       ext:0,   unwrap:0,    peds:1, adhShow:true,  time:0  },
  { n:5, types:['move','restock','wrapput'],          lvl:2, cargos:['water','veg','frozen','misc'], ext:0,  unwrap:0.20, peds:2, adhShow:true,  time:0  },
  { n:6, types:['move','restock','wrapput','outbound','audit'], lvl:3, cargos:['water','veg','frozen','misc','oil'], ext:0, unwrap:0.20, peds:2, adhShow:true, time:0 },
  { n:6, types:['move','restock','wrapput','outbound','audit','lift'], lvl:3, cargos:CARGO_ORDER, ext:0, unwrap:0.25, peds:3, adhShow:true, time:0 },
  { n:6, types:['move','restock','wrapput','outbound','audit','lift','inbound'], lvl:3, cargos:CARGO_ORDER, ext:0.20, unwrap:0.25, peds:3, adhShow:false, time:0, extKinds:['euro'] },
  { n:7, types:['move','restock','wrapput','outbound','audit','lift','inbound'], lvl:3, cargos:CARGO_ORDER, ext:0.30, unwrap:0.30, peds:3, adhShow:false, time:20 },
  { n:7, types:['move','restock','wrapput','outbound','audit','lift','inbound','load'], lvl:3, cargos:CARGO_ORDER, ext:0.30, unwrap:0.30, peds:4, adhShow:false, time:20 },
  { n:8, types:['move','restock','wrapput','outbound','audit','lift','inbound','load','unload'], lvl:3, cargos:CARGO_ORDER, ext:0.40, unwrap:0.35, peds:4, adhShow:false, time:20 },
  { n:8, types:['move','restock','wrapput','outbound','audit','lift','inbound','load','unload'], lvl:3, cargos:CARGO_ORDER, ext:0.50, unwrap:0.35, peds:5, adhShow:false, time:18, skew:0.3, overhang:0.2 }
];
function dayParams(day){
  const i = Math.min(day, WORK_DAYS.length) - 1;
  const p = Object.assign({}, WORK_DAYS[i]);
  if(day > WORK_DAYS.length){
    const k = day - WORK_DAYS.length;
    p.n = Math.min(10, 8 + Math.floor(k/3));
    p.ext = Math.min(0.7, p.ext + k*0.03); p.peds = Math.min(6, p.peds + Math.floor(k/2));
    p.time = Math.max(14, 18 - Math.floor(k/2)); p.skew = 0.3; p.overhang = 0.25;
    if(k >= 4) p.full = true;    // 풀 상차
  }
  return p;
}
const WK = { day:1, idx:0, plan:[], params:null, total:0, dayScore:0, doneT:0, closing:0, hist:[] };
const WORK_KEY = 'forklift_work_v1';
function workKey(){ return WORK_KEY + ':' + (G.playerName || 'guest'); }
function workSave(){
  try{ window.localStorage.setItem(workKey(), JSON.stringify({ day:WK.day, total:WK.total, hist:WK.hist.slice(-30), st:G.stAll || {} })); }catch(e){}
}
function workLoad(){
  try{ const r = JSON.parse(window.localStorage.getItem(workKey()) || 'null'); if(r){ WK.day = r.day || 1; WK.total = r.total || 0; WK.hist = r.hist || []; G.stAll = r.st || {}; return r; } }catch(e){}
  WK.day = 1; WK.total = 0; WK.hist = []; G.stAll = {};
  return null;
}
function workGrade(total){
  let g = GRADES[0][1];
  for(const r of GRADES) if(total >= r[0]*0.6) g = r[1];
  return g;
}

/* ── 진입 ── */
function workSheet(){
  readMenuName(); workLoad();
  const p = dayParams(WK.day);
  return '<h1>근무</h1><div class="sub">' + esc(G.playerName || '이름 없이') + ' · ' + WK.day + '일차 · 누적 ' + WK.total + '점 · ' + workGrade(WK.total) + '</div>' +
    '<ul><li>하루 ' + p.n + '건 처리 후 충전. 기본 ' + SCORE.base + '점에서 파손 ' + SCORE.perDamage + '점, 지적 ' + SCORE.perFault + '점씩 깎이고 정중앙 적재는 30점씩 더합니다' +
    (p.time ? ', ' + p.time + '분을 넘기면 초당 ' + SCORE.perSec + '점' : '') + '</li>' +
    '<li>오늘 나오는 일: ' + p.types.map(t=> MISSION_NAMES[t]).join(' · ') + '</li>' +
    (p.ext ? '<li>외부 입고 ' + Math.round(p.ext*100) + '% · 목재·수입 파렛트는 규격 파렛트에 얹어 받습니다</li>' : '') +
    (!p.adhShow ? '<li>이 일차부터 게이지에 붙음 표시가 안 나옵니다</li>' : '') +
    '</ul><div class="row"><button class="btn primary" data-act="workBegin">' + WK.day + '일차 시작</button>' +
    (WK.day > 1 ? '<button class="btn" data-act="workReset">1일차부터</button>' : '') +
    '<button class="btn" id="btnBack">돌아가기</button></div>';
}
const MISSION_NAMES = { move:'이동', restock:'보충', wrapput:'랩핑 후 적재', outbound:'출고 대기', audit:'실사 지원', lift:'화물엘베', inbound:'외부 입고', load:'윙바디 상차', unload:'윙바디 하차' };

function workBegin(){
  hideSheet(); enterMode();
  workLoad();
  const P = dayParams(WK.day);
  WK.params = P; WK.idx = 0; WK.plan = []; WK.closing = 0;
  G.mode = 'work'; G.time = 0; G.damage = 0; G.fault = 0; G.batt = 100; G.lowWarned = false; G.battDead = false;
  G.defects = {}; G.defectSeen = {}; G.chargeStep = false; G.st = {}; G.postDrop = null; G.adhShow = P.adhShow;
  applyTime(2);
  resetWorld({ ext:0, unwrap:P.unwrap, cargos:P.cargos });
  G.pedLimit = P.peds;
  G.outUnlocked = true; G.shutterT = 8.4;
  // 하루 계획
  const types = P.types.slice();
  for(let i=0;i<P.n;i++){
    let t = types[Math.floor(Math.random()*types.length)];
    if(i === 0) t = types[0];
    if(P.full && t === 'load') t = 'loadfull';
    WK.plan.push(t);
  }
  // 새 유형은 하루에 한 번은 나오게
  const newest = P.types[P.types.length - 1];
  if(WK.plan.indexOf(newest) < 0 && P.n > 1) WK.plan[P.n - 1] = P.full && newest === 'load' ? 'loadfull' : newest;
  G.running = true;
  applyLayout();
  toast(WK.day + '일차 · ' + P.n + '건', true);
  startWorkMission();
}
function workReset(){ WK.day = 1; WK.total = 0; WK.hist = []; G.stAll = {}; workSave(); showSheet(workSheet()); }

/* ── 미션 생성 ── */
function freeSlots(minLvl, maxLvl){
  return slots.filter(s=> !s.pallet && !s.practice && s.z < 40 && LEVEL_Y.indexOf(s.y) >= (minLvl||0) && LEVEL_Y.indexOf(s.y) <= (maxLvl==null?2:maxLvl));
}
function fitSlots(p, minLvl, maxLvl){ return freeSlots(minLvl, maxLvl).filter(s=> (p.topY || 0.15) <= slotClear(s)); }
function centerPallets(){
  return pallets.filter(p=> !p.carried && !p.broken && p.cargo !== 'empty' && (p.slot || p.zone) && !(p.slot && p.slot.practice) &&
    !(p.zone && (p.zone.stage || p.zone.inbound)) && (p.slot ? p.slot.z : p.zone.z) < 40);
}
function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
function freeZones(pred){ return zones.filter(z=> !z.pallet && (!pred || pred(z))); }
function spawnAt(zn, prof){
  const p = createPallet(prof, { x:zn.x, z:zn.z, y:0, yaw:0 });
  p.zone = zn; zn.pallet = p; return p;
}
function spawnRandomZonePallet(P){
  const z = rnd(freeZones(zz=> !zz.stage && !zz.inbound && zz.z < 40));
  return z ? spawnAt(z, pickProfile(Math.random, { ext:0, unwrap:0, cargos:P.cargos }, false)) : null;
}
function atPlace(p, to){ return !p.carried && ((p.slot && p.slot === to) || (p.zone && p.zone === to)); }

function genMission(type, P){
  const lvlMax = P.lvl - 1;
  if(type === 'move'){
    const src = centerPallets().filter(p=> !p.slot || LEVEL_Y.indexOf(p.slot.y) <= lvlMax);
    const s = src.length ? rnd(src) : spawnRandomZonePallet(P);
    if(!s) return null;
    const dests = fitSlots(s, 0, lvlMax).concat(freeZones(z=> !z.stage && !z.inbound && z.z < 40));
    const to = rnd(dests);
    return { type:type, pallet:s, from:s.slot || s.zone, to:to, title: MISSION_NAMES.move,
      desc:'<span class="code">' + (s.slot||s.zone).id + '</span> ' + s.cargoName + ' 파렛트를<br><span class="code">' + to.id + '</span> 로', done:()=> atPlace(s, to) };
  }
  if(type === 'restock'){
    let src = centerPallets().filter(p=> p.slot && LEVEL_Y.indexOf(p.slot.y) >= 1 && LEVEL_Y.indexOf(p.slot.y) <= lvlMax);
    if(!src.length){ const s0 = rnd(freeSlots(1, lvlMax)); if(!s0) return null; const p = createPallet(pickProfile(Math.random, { ext:0, unwrap:0, cargos:P.cargos }, false), { x:s0.x, z:s0.z, y:s0.y, yaw:0 }); p.slot = s0; s0.pallet = p; p.pickY = s0.y; p.adh = 0.8; src = [p]; }
    const s = rnd(src);
    const to = rnd(freeSlots(0, 0).filter(z=> Math.abs(z.x - s.slot.x) < 12 && (s.topY||0.15) <= slotClear(z)));
    if(!to) return null;
    return { type:type, pallet:s, from:s.slot, to:to, title: MISSION_NAMES.restock,
      desc:'<span class="code">' + s.slot.id + '</span> 상단 ' + s.cargoName + '을<br>피킹면 <span class="code">' + to.id + '</span> 로 내리기', done:()=> atPlace(s, to) };
  }
  if(type === 'wrapput'){
    let s = rnd(centerPallets().filter(p=> p.zone && p.wrap !== 'full' && fitSlots(p, 1, lvlMax).length));
    if(!s){
      const z = rnd(freeZones(zz=> !zz.stage && !zz.inbound && zz.z < 40));
      if(!z) return null;
      const cargos = P.cargos.filter(c=> lvlMax >= 2 || CARGO_PRESETS[c].h + 0.15 <= 1.30);
      s = spawnAt(z, pickProfile(Math.random, { ext:0, unwrap:0, cargos: cargos.length ? cargos : ['water'] }, false));
      setWrap(s, 'none'); s.adh = 0;
    }
    const to = rnd(fitSlots(s, 1, lvlMax));
    if(!to) return null;
    return { type:type, pallet:s, from:s.zone, to:to, title: MISSION_NAMES.wrapput,
      desc:'<span class="code">' + s.zone.id + '</span> 미랩핑 ' + s.cargoName + ' 파렛트를<br>랩핑한 뒤 <span class="code">' + to.id + '</span> 에 적재', done:()=> atPlace(s, to) && s.wrap === 'full' };
  }
  if(type === 'outbound'){
    const s = rnd(centerPallets().filter(p=> p.slot && LEVEL_Y.indexOf(p.slot.y) <= lvlMax));
    if(!s) return null;
    const to = rnd(freeZones(z=> z.stage));
    if(!to) return null;
    return { type:type, pallet:s, from:s.slot, to:to, title: MISSION_NAMES.outbound,
      desc:'<span class="code">' + s.slot.id + '</span> ' + s.cargoName + ' 파렛트를<br>출고 대기 <span class="code">' + to.id + '</span> 로', done:()=> atPlace(s, to) };
  }
  if(type === 'audit'){
    const s = rnd(centerPallets().filter(p=> p.slot && LEVEL_Y.indexOf(p.slot.y) <= lvlMax && LEVEL_Y.indexOf(p.slot.y) >= 1));
    if(!s) return null;
    const home = s.slot;
    const m = { type:type, pallet:s, from:home, to:null, out:false, title: MISSION_NAMES.audit,
      desc:'<span class="code">' + home.id + '</span> ' + s.cargoName + ' 파렛트를 꺼내 평치에 내려놓고<br>실사 신호 후 <span class="code">' + home.id + '</span> 에 그대로 다시 적재',
      done:()=>{
        if(!m.out){ if(s.zone && !s.carried){ m.out = true; m.to = home; toast('실사 완료 · 원위치에 다시 적재', true); blip(700, 0.12, 'triangle', 0.05); showWorkTask(); } return false; }
        return atPlace(s, home);
      } };
    return m;
  }
  if(type === 'inbound'){
    const zin = freeZones(z=> z.inbound);
    if(zin.length < 2) return null;
    const kinds = P.extKinds || ['wood','euro'];
    const prof = pickProfile(Math.random, { ext:1, unwrap:P.unwrap, cargos:P.cargos, skew:P.skew||0, overhang:P.overhang||0 }, true);
    prof.kind = rnd(kinds);
    const top = spawnAt(zin[0], prof);
    top.yaw = prof.kind === 'wood' && Math.random() < 0.5 ? Math.PI/2 : 0;
    const base = spawnAt(zin[1], { kind: Math.random() < 0.5 ? 'aj' : 'kpp', cargo:'empty', wrap:'none' });
    const m = { type:type, pallet:top, from:zin[0], to:null, base:base, stacked:false, title: MISSION_NAMES.inbound,
      desc:'입고 <span class="code">' + zin[0].id + '</span> ' + PAL_KINDS[prof.kind].n + ' 파렛트를<br>빈 규격 파렛트 <span class="code">' + zin[1].id + '</span> 위에 얹고, 그대로 랙에 적재',
      onStack:(b)=>{ if(b !== base) return; m.stacked = true; m.pallet = base; const to = rnd(fitSlots(base, 0, lvlMax)); m.to = to; m.desc = '얹은 파렛트를<br><span class="code">' + (to ? to.id : '-') + '</span> 에 적재' + (base.wrap !== 'full' ? ' · 랩핑 확인' : ''); showWorkTask(); },
      done:()=> m.stacked && m.to && atPlace(base, m.to) };
    return m;
  }
  if(type === 'lift'){
    const n = P.lvl >= 3 && Math.random() < 0.5 ? 2 : 1;
    const zs = freeZones(z=> z.stage);
    if(zs.length < n) return null;
    const ps = [];
    for(let i=0;i<n;i++) ps.push(spawnAt(zs[i], pickProfile(Math.random, { ext:0, unwrap:0, cargos:['water','oil','veg'] }, false)));
    liftDoor(true);
    const m = { type:type, pallet:ps[0], pallets:ps, from:zs[0], to:null, closing:0, title: MISSION_NAMES.lift,
      desc:'출고 대기 파렛트 ' + n + '개를 화물엘베 안쪽 선 너머까지 넣기<br>지게차 앞다리는 센서선 안으로 <b>절대</b> 들어가면 안 됩니다',
      done:()=>{
        const inside = palletsInLift();
        const deep = inside.filter(q=> q.x - palletHalfW(q) > LIFT_ROOM.line1 - 0.02);
        const all = ps.every(q=> deep.indexOf(q) >= 0);
        const truckOut = truck.x + dirX(truck.h)*CFG.legTip < LIFT_ROOM.x0 - 0.3;
        if(all && truckOut && Math.abs(truck.v) < 0.1){
          if(m.closing === 0){ liftDoor(false); toast('문 닫힘', true); blip(520, 0.2, 'sine', 0.05); }
          m.closing += 0.016;
          if(m.closing > 2.2){ for(const q of ps) removePallet(q); return true; }
        }else if(m.closing > 0 && !all){ m.closing = 0; liftDoor(true); }
        return false;
      } };
    return m;
  }
  if(type === 'load' || type === 'loadfull'){
    const n = type === 'loadfull' ? 12 : (P.lvl >= 3 ? 4 + Math.floor(Math.random()*3) : 4);
    const zs = freeZones(z=> z.stage);
    if(zs.length < Math.min(n, 12)) return null;
    for(const q of palletsOnBed()) removePallet(q);
    const ps = [];
    for(let i=0;i<Math.min(n, zs.length);i++) ps.push(spawnAt(zs[i], pickProfile(Math.random, { ext:0, unwrap:0, cargos:['water','oil','bottle','frozen'] }, false)));
    const cells = bedCells(n);
    DOCK.wingHere = true; DOCK.truckMesh.visible = true; DOCK.wingOpen = true;
    const m = { type:type, pallet:ps[0], pallets:ps, from:zs[0], to:null, cells:cells, title: type === 'loadfull' ? '윙바디 풀 상차' : MISSION_NAMES.load,
      desc:'출고 대기 파렛트 ' + ps.length + '개를 윙바디 적재함에 2열로 밀착 상차<br>안쪽 열부터. 앞 파렛트와 간격 5cm 이내, 적재함 벽·윙을 치지 마세요',
      done:()=>{
        const on = palletsOnBed();
        if(on.length < ps.length) return false;
        let ok = 0;
        for(const c of cells){ if(on.some(q=> Math.hypot(q.x - c.x, q.z - c.z) < 0.14 && Math.abs(q.om) < 0.02 && Math.hypot(q.vx, q.vz) < 0.02)) ok++; }
        if(ok < cells.length){ if(!m.hint || G.time - m.hint > 8){ m.hint = G.time; toast('칸에서 벗어난 파렛트가 있습니다 · ' + ok + ' / ' + cells.length); } return false; }
        return true;
      } };
    return m;
  }
  if(type === 'unload'){
    const n = 4;
    const zs = freeZones(z=> z.stage);
    if(zs.length < n) return null;
    for(const q of palletsOnBed()) removePallet(q);
    const cells = bedCells(n);
    const ps = [];
    for(const c of cells){
      const q = createPallet(pickProfile(Math.random, { ext:0, unwrap:0, cargos:['water','oil','bottle'] }, false), { x:c.x, z:c.z, y:WING.y, yaw:0 });
      q.surf = 'bed'; q.pickY = WING.y; q.adh = 0.85; ps.push(q);
    }
    DOCK.wingHere = true; DOCK.truckMesh.visible = true; DOCK.wingOpen = true;
    return { type:type, pallet:ps[0], pallets:ps, from:null, to:null, title: MISSION_NAMES.unload,
      desc:'윙바디 적재함의 파렛트 ' + n + '개를 하차해 출고 대기 구역에 놓기<br>붙어 있습니다. 바깥 열부터, 랩을 떼고 빼세요',
      done:()=> ps.every(q=> q.broken || (q.zone && q.zone.stage && !q.carried)) };
  }
  return null;
}

function startWorkMission(){
  if(WK.idx >= WK.plan.length){ startChargeStep(); return; }
  let m = null, tries = 0;
  while(!m && tries++ < 6) m = genMission(WK.plan[WK.idx], WK.params) || genMission('move', WK.params);
  if(!m){ startChargeStep(); return; }
  G.mission = m;
  if(m.from) setHighlight(m.from.id);
  targetRing.visible = false; targetPost.visible = false;
  if(m.type === 'lift'){ targetRing.visible = true; targetPost.visible = true; targetRing.position.set(LIFT_ROOM.x0 - 1.4, 0.008, (LIFT_ROOM.z0+LIFT_ROOM.z1)/2); targetPost.position.set(LIFT_ROOM.x0 - 1.4, 3.5, (LIFT_ROOM.z0+LIFT_ROOM.z1)/2); }
  if(m.type === 'load' || m.type === 'loadfull' || m.type === 'unload'){ targetRing.visible = true; targetPost.visible = true; targetRing.position.set(WING.x0 - 3.2, 0.008, (WING.z0+WING.z1)/2); targetPost.position.set(WING.x0 - 3.2, 3.5, (WING.z0+WING.z1)/2); }
  showWorkTask();
}
function showWorkTask(){
  const m = G.mission; if(!m) return;
  const P = WK.params;
  showTask(WK.day + '일차 · ' + (WK.idx+1) + ' / ' + WK.plan.length + ' · ' + m.title, m.desc,
    P.time ? '제한 ' + P.time + '분 · 남은 ' + fmtTime(Math.max(0, P.time*60 - G.time)) : '');
}

/* ── 판정 (전 모드) ── */
function checkObjective(){
  if((G.mode === 'rush' || G.mode === 'daily') && G.mission){
    const m = G.mission;
    if(!m.pallet && m.from) m.pallet = m.from.pallet;
    if(m.pallet){
      if(atPlace(m.pallet, m.to)){ G.rushIdx++; blip(760, 0.12, 'triangle', 0.05); rushStep(); }
      else if(truck.carry === m.pallet) setHighlight(m.to.id);
    }
    return;
  }
  if(G.mode === 'edu'){
    const st = TUT[G.step];
    if(!st) return;
    if((G.step === 5 || G.step === 6) && !G.flags.p && truck.carry) G.flags.p = truck.carry;
    if(!G.flags.p && (G.step === 5 || G.step === 6)) return;
    if(st.check()){
      G.step++;
      if(G.step >= TUT.length) eduFinish();
      else{ blip(760, 0.12, 'triangle', 0.05); toast(G.step + ' / ' + TUT.length + ' 단계 통과', true); eduSave(); startStep(); }
    }
    return;
  }
  if(G.mode === 'work' && G.mission){
    const m = G.mission;
    if(m.done()){
      WK.idx++;
      blip(760, 0.12, 'triangle', 0.05);
      statAdd('missions', 1);
      startWorkMission();
    }else if(m.to && truck.carry === m.pallet) setHighlight(m.to.id);
    if(WK.params.time && Math.floor(G.time) % 5 === 0) showWorkTask();
  }
}
function objectivePallet(){
  if(G.mode === 'edu') return G.flags.p3 || G.flags.p2 || G.flags.p || null;
  if(G.mission) return G.mission.pallet || null;
  return null;
}
function markLoose(){
  const p = objectivePallet();
  if(!p || truck.carry === p || p.slot || p.zone || p.surf) return;
  posGhost(p.x, p.y, p.z);
}

/* ── 하루 결산 ── */
function workScore(){
  const P = WK.params || { time:0 };
  const st = G.st || {};
  const over = P.time ? Math.max(0, Math.round(G.time) - P.time*60) : 0;
  const dmg = G.damage * SCORE.perDamage, flt = G.fault * SCORE.perFault, tp = over * SCORE.perSec;
  const bonus = (st.perfect || 0) * 30;
  return { over:over, dmg:dmg, flt:flt, tp:tp, bonus:bonus, score: Math.max(0, SCORE.base - dmg - flt - tp + bonus) };
}
function finish(){
  G.running = false; G.mode = 'done';
  slotGhost.visible = false;
  const r = workScore();
  const st = G.st || {};
  WK.total += r.score;
  WK.hist.push({ day:WK.day, score:r.score, date:todayStr() });
  const all = G.stAll || {};
  for(const k in st) all[k] = (all[k] || 0) + st[k];
  if(st.vmax > (all.vmaxAll || 0)) all.vmaxAll = st.vmax;
  G.stAll = all;
  const doneDay = WK.day; WK.day++;
  workSave();
  if(hasNet()) certPost({ kind:'log', name:G.playerName || '이름 없음', day:doneDay, score:r.score, time:Math.round(G.time), damage:G.damage, fault:G.fault, date:todayStr() });
  showSheet(dayReportSheet(doneDay, r, st, all));
}
function fmtM(v){ return v >= 1000 ? (v/1000).toFixed(2) + 'km' : Math.round(v) + 'm'; }
function pct(a, b){ return b ? Math.round(a/b*100) + '%' : '-'; }
function dayReportSheet(day, r, st, all){
  const row = (k, v, va)=> '<tr><td>' + k + '</td><td class="num">' + v + '</td><td class="num dim">' + va + '</td></tr>';
  const habits =
    row('포크 올린 채 이동', fmtM(st.highD||0), fmtM(all.highD||0)) +
    row('후경 미준수 거리', fmtM(st.tiltD||0), fmtM(all.tiltD||0)) +
    row('교차로 준수율', pct(st.xOk||0, st.xN||0), pct(all.xOk||0, all.xN||0)) +
    row('적재 평균 편차', st.placeN ? Math.round((st.placeErr||0)/st.placeN*100) + 'cm' : '-', all.placeN ? Math.round((all.placeErr||0)/all.placeN*100) + 'cm' : '-') +
    row('정중앙 적재', (st.perfect||0) + '회', (all.perfect||0) + '회') +
    row('첫 시도 삽입', pct(st.insOk||0, st.insTry||0), pct(all.insOk||0, all.insTry||0)) +
    row('하역 절차 준수', pct(st.procOk||0, st.procN||0), pct(all.procOk||0, all.procN||0)) +
    row('랩 떼기', pct(st.peelN||0, st.adhN||0), pct(all.peelN||0, all.adhN||0)) +
    row('짐 싣고 후진 비율', pct(st.revD||0, st.carryD||0), pct(all.revD||0, all.carryD||0)) +
    row('통로 최고 속도', ((st.vmax||0)*3.6).toFixed(1) + 'km/h', ((all.vmaxAll||0)*3.6).toFixed(1) + 'km/h') +
    row('랩핑', (st.wrapN||0) + '회', (all.wrapN||0) + '회');
  return '<h1>' + day + '일차 종료</h1><div class="sub">' + r.score + '점 · 누적 ' + WK.total + '점 · ' + workGrade(WK.total) + '</div>' +
    '<div class="result">' +
    '<div><div class="k">시간</div><div class="v">' + fmtTime(G.time) + '</div></div>' +
    '<div><div class="k">파손</div><div class="v">' + G.damage + '</div></div>' +
    '<div><div class="k">지적</div><div class="v">' + G.fault + '</div></div>' +
    '<div><div class="k">정중앙</div><div class="v">' + (st.perfect||0) + '</div></div></div>' +
    '<table class="calc"><tbody>' +
    '<tr><td>기본</td><td class="num">' + SCORE.base + '</td></tr>' +
    '<tr><td>파손 ' + G.damage + '건</td><td class="num">−' + r.dmg + '</td></tr>' +
    '<tr><td>지적 ' + G.fault + '건</td><td class="num">−' + r.flt + '</td></tr>' +
    (r.tp ? '<tr><td>시간 초과 ' + r.over + '초</td><td class="num">−' + r.tp + '</td></tr>' : '') +
    (r.bonus ? '<tr><td>정중앙 적재</td><td class="num">+' + r.bonus + '</td></tr>' : '') +
    '<tr class="sum"><td>오늘</td><td class="num">' + r.score + '</td></tr></tbody></table>' +
    '<div class="sub" style="margin-top:10px">습관 · 오늘 / 누적</div>' +
    '<table class="calc habits"><tbody>' + habits + '</tbody></table>' +
    '<div class="row"><button class="btn primary" data-act="workBegin">' + WK.day + '일차 시작</button>' +
    '<button class="btn" id="btnBack">메뉴</button></div>';
}
function sendScore(payload){ if(hasNet()) certPost(Object.assign({ kind:'log' }, payload)); }
