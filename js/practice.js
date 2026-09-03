"use strict";

/* ============================================================
   연습장
   코스는 폭이 있는 차로다. 바퀴가 선을 밟으면 접촉이다.
   자격시험은 실기 채점표대로 점수가 나온다.
   ============================================================ */

/* 코스 정의 — pts 는 차로 중심선, w 는 차로 폭.
   좌표는 연습장(x −38~0, z 58~84) 안. */
const COURSES = {
  exam: { n:'자격시험 코스', w:3.2, timeLimit:240, exam:true,
    start:{x:-33, z:62, h:Math.PI/2},
    pts:[{x:-33,z:62},{x:-20,z:62},{x:-20,z:70},{x:-8,z:70},{x:-8,z:78},{x:-1.0,z:78}],
    pick:{x:-19.6, z:62, yaw:Math.PI/2},           // 하차작업 — 첫 직선 끝에서 파렛트를 꺼낸다 (적재대)
    drop:{x:1.2, z:78, yaw:Math.PI/2},               // 상차작업 — 마지막 직선 끝 파렛트 위에 얹는다
    finish:{x:-33, z:62, r:1.4} },
  eight: { n:'8자 코스', w:2.8, loop:true, start:{x:-27, z:71, h:0},
    pts:(function(){ const o=[]; for(let i=0;i<=48;i++){ const t=i/48*Math.PI*2; const a=8.5; o.push({ x:-19 + a*Math.sin(t)*Math.cos(t)*1.0 + a*Math.sin(t)*0.0, z:71 + a*Math.sin(t)*Math.cos(t)*0 + a*Math.sin(t) }); } return o; })() },
  crank: { n:'크랭크', w:2.6, start:{x:-34, z:64, h:Math.PI/2},
    pts:[{x:-34,z:64},{x:-24,z:64},{x:-24,z:73},{x:-12,z:73},{x:-12,z:81},{x:-3,z:81}], finish:{x:-3, z:81, r:1.5} },
  revS: { n:'후진 S자', w:3.0, reverse:true, start:{x:-4, z:66, h:Math.PI/2},
    pts:[{x:-4,z:66},{x:-10,z:66},{x:-14,z:69},{x:-18,z:72},{x:-24,z:74},{x:-30,z:71},{x:-35,z:68}], finish:{x:-35, z:68, r:1.5} },
  park: { n:'통로 평행주차', w:3.0, park:true, start:{x:-33, z:72, h:Math.PI/2},
    pts:[{x:-33,z:72},{x:-10,z:72}], slot:{x:-14, z:72} },
  slalom: { n:'야드 슬라럼', w:3.4, fast:true, start:{x:-34, z:60, h:Math.PI/2},
    pts:[{x:-34,z:60},{x:-26,z:60},{x:-22,z:66},{x:-16,z:60},{x:-10,z:66},{x:-4,z:60},{x:-2,z:70},{x:-10,z:76},{x:-20,z:76},{x:-30,z:72},{x:-36,z:75}], finish:{x:-36, z:75, r:1.6} },
  train: { n:'열차', w:4.2, train:true, hidden:true, start:{x:-34, z:60, h:Math.PI/2},
    pts:[{x:-34,z:60},{x:-14,z:60},{x:-6,z:66},{x:-6,z:76},{x:-14,z:82},{x:-30,z:82}], finish:{x:-30, z:82, r:2.4}, n8:7 }
};
/* 8자 — 위 식이 어색해서 두 원을 잇는 점열로 다시 만든다 */
COURSES.eight.pts = (function(){
  const o = [], r = 6.2, c1 = {x:-26, z:70}, c2 = {x:-12, z:70};
  for(let i=0;i<=24;i++){ const t = Math.PI/2 + i/24*Math.PI*2; o.push({ x:c1.x + r*Math.cos(t), z:c1.z - r*Math.sin(t) }); }
  for(let i=0;i<=24;i++){ const t = Math.PI/2 + Math.PI - i/24*Math.PI*2; o.push({ x:c2.x + r*Math.cos(t), z:c2.z - r*Math.sin(t) }); }
  return o;
})();
COURSES.eight.start = { x:-19, z:70, h:0 };

const PICK_LEVELS = [
  { n:'정면 바닥', d:'파렛트가 정면에 반듯하게 놓입니다. 2.5m쯤 앞에 정지해 리치를 끝까지 내밀어 꽂고 들어올리세요.',
    kind:'floor', lat:0, ang:0, need:3 },
  { n:'좌우 편차', d:'파렛트가 좌우로 비껴 놓입니다. 차를 옮겨 중심을 맞추세요. 블록을 밀면 파렛트가 돌아갑니다.',
    kind:'floor', lat:0.60, ang:0, need:3 },
  { n:'각도 편차', d:'파렛트가 비스듬히 놓입니다. 12° 안이면 지겟발로 밀어 맞춰도 됩니다.',
    kind:'floor', lat:0.35, ang:0.30, need:3 },
  { n:'목재 양방향', d:'열린 면이 두 개뿐입니다. 막힌 면에서는 스트링거를 밀기만 합니다. 돌아가서 열린 면으로 꽂으세요.',
    kind:'floor', lat:0.30, ang:0.20, need:3, pal:'wood', turn:true },
  { n:'랙 1단', d:'랙 하단에서 꺼냅니다. 리치를 내밀어 꽂고, 충분히 들어올린 다음 리치를 넣으세요.',
    kind:'rack', level:0, lat:0.30, ang:0.10, need:3 },
  { n:'랙 2단', d:'포크 높이를 단에 맞춰야 합니다. 계기판의 리프트 높이를 보세요.',
    kind:'rack', level:1, lat:0.30, ang:0.10, need:3 },
  { n:'랙 3단', d:'높이 올릴수록 좌우가 크게 흔들립니다. 천천히 맞추세요.',
    kind:'rack', level:2, lat:0.25, ang:0.08, need:2 },
  { n:'붙은 파렛트', d:'옆 파렛트와 랩이 붙어 있습니다. 꽂은 채로 핸들을 살짝 돌려 3~8° 틀어 랩을 떼고 나서 들어올리세요.',
    kind:'rack', level:1, lat:0.20, ang:0.05, need:2, sticky:true }
];

let practiceGroup = null;
const obstacles = [];
const PR = { course:null, touches:0, touchCool:0, wheelOut:false, laps:0, lastT:0, exam:null, best:{}, t:0, chain:0, unlocked:false, parkT:0 };

function clearPractice(){
  if(practiceGroup){ scene.remove(practiceGroup); practiceGroup = null; }
  obstacles.length = 0;
  PR.course = null;
}

/* 차로 도색 — 중심선 양쪽에 흰 선 */
function paintCourse(c){
  practiceGroup = new THREE.Group();
  const w = c.w/2;
  const add = (x, z, len, rot, col)=>{
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.12), new THREE.MeshBasicMaterial({ color:col || 0xF4F4EE }));
    m.rotation.x = -Math.PI/2; m.rotation.z = rot; m.position.set(x, 0.006, z);
    practiceGroup.add(m);
  };
  const pts = c.pts;
  for(let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    const nx = -dz/L, nz = dx/L;
    const rot = Math.atan2(-dz, dx);
    for(const s of [-1, 1]){
      add((a.x+b.x)/2 + nx*w*s, (a.z+b.z)/2 + nz*w*s, L + 0.12, rot);
    }
  }
  // 출발선·도착선
  const s0 = pts[0];
  add(s0.x, s0.z, c.w, Math.atan2(-(pts[1].z - s0.z), pts[1].x - s0.x) + Math.PI/2, 0xF2B705);
  if(c.finish) add(c.finish.x, c.finish.z, c.w, 0, 0xF2B705);
  scene.add(practiceGroup);
}

/* 바퀴가 차로 밖인지 */
function distToPolyline(x, z, pts){
  let best = Infinity;
  for(let i=0;i<pts.length-1;i++){
    const q = segDist(x, z, [pts[i].x, pts[i].z, pts[i+1].x, pts[i+1].z]);
    if(q.d < best) best = q.d;
  }
  return best;
}
function wheelPoints(){
  const fx = dirX(truck.h), fz = dirZ(truck.h), nx = nrmX(truck.h), nz = nrmZ(truck.h);
  return [[1.55, 0.48], [1.55, -0.48], [-0.35, 0.50], [-0.35, -0.50]].map(b=> ({ x: truck.x + fx*b[0] + nx*b[1], z: truck.z + fz*b[0] + nz*b[1] }));
}
function lineCheck(dt){
  const c = PR.course;
  if(!c) return;
  PR.touchCool = Math.max(0, PR.touchCool - dt);
  let out = false;
  for(const w of wheelPoints()){ if(distToPolyline(w.x, w.z, c.pts) > c.w/2 - 0.06){ out = true; break; } }
  if(out && !PR.wheelOut && PR.touchCool <= 0){
    PR.touches++; PR.touchCool = 1.2;
    thud(0.18); blip(240, 0.15, 'square', 0.03);
    toast('검지선 접촉 · ' + PR.touches + '회');
    if(c.exam) examFault('LINE', '검지선 접촉');
  }
  PR.wheelOut = out;
}

/* ── 종목 시작·진행 ── */
function courseStart(key){
  const c = COURSES[key];
  hideSheet(); enterMode();
  G.mode = c.train ? 'train' : (c.exam ? 'exam' : 'course');
  G.course = key;
  G.time = 0; G.damage = 0; G.fault = 0; G.defects = {}; G.defectSeen = {}; G.mission = null; G.chargeStep = false;
  applyTime(2);
  resetWorld();
  clearPractice();
  paintCourse(c);
  PR.course = c; PR.touches = 0; PR.touchCool = 0; PR.wheelOut = false; PR.laps = 0; PR.t = 0; PR.lastT = 0; PR.lapPhase = 0; PR.parkT = 0;
  truck.x = c.start.x; truck.z = c.start.z; truck.h = c.start.h;
  truck.v = 0; truck.lift = 0.15; truck.reach = 0; truck.tilt = CFG.keepTilt + 0.02;
  G.wheel = 0; G.throttle = 0; truck.carry = null;
  camera.userData.tx = truck.x; camera.userData.tz = truck.z;
  G.speedMul = c.fast || c.train ? 3.0 : 1;
  targetRing.visible = false; targetPost.visible = false; slotGhost.visible = false;
  if(c.exam) examSetup();
  if(c.park) parkSetup();
  if(c.train) trainSetup();
  if(c.finish && !c.exam){ targetRing.visible = true; targetPost.visible = true; targetRing.position.set(c.finish.x, 0.008, c.finish.z); targetPost.position.set(c.finish.x, 3.5, c.finish.z); }
  setView('cab');
  G.running = true;
  applyLayout();
  courseTask();
}
function courseTask(){
  const c = PR.course;
  if(c.exam){ examTask(); return; }
  const best = PR.best[G.course];
  showTask('연습장 · ' + c.n, c.loop ? '무접촉 연속 ' + PR.laps + '바퀴' : (c.park ? '파렛트 사이에 세우세요' : (c.train ? '열차 ' + (c.n8) + '량 · 사슬 ' + PR.chain + '량' : '도착선까지')),
    (c.reverse ? '후진으로만 갑니다. ' : '') + (c.fast ? '속도 제한 없음. ' : '') +
    '검지선 접촉 <b>' + PR.touches + '</b>회' + (best ? ' · 최고 ' + (c.loop ? best + '바퀴' : fmtTime(best)) : ''));
}
function courseTick(dt){
  const c = PR.course;
  if(!c) return;
  PR.t += dt;
  lineCheck(dt);
  if(c.reverse && truck.v > 0.4 && PR.touchCool <= 0){ PR.touchCool = 1.5; PR.touches++; toast('전진 금지 · 후진으로만'); }
  if(c.exam){ examTick(dt); return; }
  if(c.loop){
    // 출발선 통과로 바퀴 세기 — 접촉 있으면 0으로
    const s = c.start;
    const near0 = Math.hypot(truck.x - s.x, truck.z - s.z) < 1.4;
    if(near0 && PR.lapPhase === 1 && PR.t - PR.lastT > 8){
      if(PR.touches === 0) PR.laps++; else { PR.laps = 0; PR.touches = 0; }
      PR.lastT = PR.t; PR.lapPhase = 0;
      blip(760, 0.12, 'triangle', 0.05);
      if(PR.laps > (PR.best[G.course] || 0)){ PR.best[G.course] = PR.laps; practiceSave(); }
      courseTask();
    }
    if(!near0) PR.lapPhase = 1;
    return;
  }
  if(c.park){
    const s = c.slot;
    const d = Math.hypot(truck.x - s.x, truck.z - s.z);
    if(d < 0.5 && Math.abs(truck.v) < 0.05 && Math.abs(wrapQuarter(truck.h - Math.PI/2)) < 0.06){ PR.parkT += dt; if(PR.parkT > 1.2) courseFinish(); }
    else PR.parkT = 0;
    return;
  }
  if(c.train){
    PR.chain = 0;
    for(const p of pallets) if(p.cargo === 'empty' && palletFree(p)){ const n = chainLength(p); if(n > PR.chain) PR.chain = n; }
    if(Math.floor(PR.t*4) % 4 === 0) courseTask();
    const f = c.finish;
    let inBox = 0;
    for(const p of pallets) if(p.cargo === 'empty' && Math.hypot(p.x - f.x, p.z - f.z) < f.r + 2.5) inBox++;
    if(inBox >= c.n8 && Math.abs(truck.v) < 0.1) courseFinish();
    return;
  }
  if(c.finish && Math.hypot(truck.x - c.finish.x, truck.z - c.finish.z) < c.finish.r && Math.abs(truck.v) < 0.2) courseFinish();
}
function courseFinish(){
  const c = PR.course;
  G.running = false; G.mode = 'done';
  const total = Math.round(PR.t) + PR.touches*3;
  const best = PR.best[G.course];
  const isBest = !best || total < best;
  if(isBest){ PR.best[G.course] = total; practiceSave(); }
  blip(880, 0.16, 'sine', 0.06); setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
  if(c.train && hasNet()) certPost({ kind:'train', name:G.playerName || '이름 없음', total:total, date:todayStr() });
  showSheet('<h1>' + c.n + ' 완주</h1>' +
    '<div class="result">' +
    '<div><div class="k">기록</div><div class="v">' + fmtTime(total) + '</div></div>' +
    '<div><div class="k">주행</div><div class="v">' + fmtTime(PR.t) + '</div></div>' +
    '<div><div class="k">접촉</div><div class="v">' + PR.touches + '</div></div>' +
    '</div><div class="sub">접촉 1회당 3초' + (isBest ? ' · 최고 기록' : ' · 최고 ' + fmtTime(best)) + '</div>' +
    '<div class="row"><button class="btn primary" data-act="courseAgain">다시</button>' +
    '<button class="btn" data-act="practiceMenu">연습장</button><button class="btn" id="btnBack">메뉴</button></div>');
}

/* ── 자격시험 ── */
const EXAM = { stage:0, score:100, faults:[], failed:null, pallet:null, target:null, placed:false, t:0 };
function examSetup(){
  const c = COURSES.exam;
  // 적재대 — 인출할 파렛트, 반대편 상차 파렛트
  const a = createPallet({ kind:'aj', cargo:'water', wrap:'full', seed:11 }, { x:c.pick.x, z:c.pick.z, y:0, yaw:c.pick.yaw });
  const b = createPallet({ kind:'kpp', cargo:'empty', wrap:'none', seed:12 }, { x:c.drop.x, z:c.drop.z, y:0, yaw:c.drop.yaw });
  EXAM.pallet = a; EXAM.target = b; EXAM.stage = 0; EXAM.score = 100; EXAM.faults = []; EXAM.failed = null; EXAM.placed = false; EXAM.t = 0;
  // 적재대 표시
  addPracticeMark(c.pick.x, c.pick.z, 0x1A73E8); addPracticeMark(c.drop.x, c.drop.z, 0x1A73E8);
}
function addPracticeMark(x, z, col){
  const r = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 24), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.7, side:THREE.DoubleSide }));
  r.rotation.x = -Math.PI/2; r.position.set(x, 0.007, z); practiceGroup.add(r);
}
const EXAM_STAGES = ['출발 → 적재대 파렛트 인출 (하차작업)', '코스 주행 → 반대편 파렛트 위에 적재 (상차작업)', '후진으로 코스를 되돌아 출발선 정지'];
function examTask(){
  showTask('자격시험 · 남은 시간 ' + fmtTime(Math.max(0, COURSES.exam.timeLimit - EXAM.t)), EXAM_STAGES[EXAM.stage],
    '점수 <b>' + Math.max(0, EXAM.score) + '</b> · 검지선 접촉 ' + PR.touches + '회' +
    (EXAM.faults.length ? '<br>' + EXAM.faults.slice(-3).map(f=> '− ' + f).join('<br>') : ''));
}
function examFault(code, msg){
  if(G.mode !== 'exam' || EXAM.failed) return;
  const pen = { LINE:5, H6:5, INS:5, FIT:5, LEG:5, POKE:10, H8:5, H7:5, H9:5, H5:5 }[code] || 5;
  EXAM.score -= pen; EXAM.faults.push(msg + ' −' + pen);
  examTask();
}
function examFail(reason){
  if(EXAM.failed) return;
  EXAM.failed = reason;
  G.running = false; G.mode = 'done';
  showSheet('<h1>실격</h1><div class="sub">' + esc(reason) + '</div>' +
    '<div class="row"><button class="btn primary" data-act="courseAgain">다시</button><button class="btn" data-act="practiceMenu">연습장</button></div>');
}
function examPlaced(off){
  if(G.mode !== 'exam' || EXAM.stage !== 1) return;
  const t = EXAM.target;
  if(!t.stack){ examFail('파렛트를 적재대가 아닌 바닥에 내려놓았습니다'); return; }
  if(off > 0.20){ EXAM.score -= 10; EXAM.faults.push('적재 편차 ' + Math.round(off*100) + 'cm −10'); }
  EXAM.placed = true; EXAM.stage = 2;
  targetRing.visible = true; targetPost.visible = true;
  targetRing.position.set(COURSES.exam.finish.x, 0.008, COURSES.exam.finish.z); targetPost.position.set(COURSES.exam.finish.x, 3.5, COURSES.exam.finish.z);
  examTask();
}
function examTick(dt){
  if(EXAM.failed) return;
  EXAM.t += dt;
  if(EXAM.t > COURSES.exam.timeLimit){ examFail('제한시간 4분 초과'); return; }
  const c = COURSES.exam;
  // 주행 구간 포크 높이
  if(EXAM.stage !== 0 && Math.abs(truck.v) > 0.4 && truck.lift > 0.50 && !G.gauge && !G.place && PR.touchCool <= 0){
    PR.touchCool = 2; examFault('H1', '주행 중 포크 50cm 초과');
  }
  if(EXAM.stage === 0 && truck.carry === EXAM.pallet){
    EXAM.stage = 1;
    if((EXAM.pallet.insDepth || 0) < 0.85){ EXAM.score -= 10; EXAM.faults.push('삽입 20cm 이상 부족 −10'); }
    toast('하차작업 완료 · 코스 주행', true);
    examTask();
  }

  if(EXAM.stage === 2){
    const f = c.finish;
    if(Math.hypot(truck.x - f.x, truck.z - f.z) < f.r && Math.abs(truck.v) < 0.1 && Math.abs(truck.lift) < 0.35){
      examFinish();
    }
  }
  if(Math.floor(EXAM.t*2) !== Math.floor((EXAM.t - dt)*2)) examTask();
}
function examFinish(){
  G.running = false; G.mode = 'done';
  const pass = EXAM.score >= 60;
  const rows = EXAM.faults.length ? EXAM.faults.map(f=> '<tr><td colspan="2">' + esc(f) + '</td></tr>').join('') : '<tr><td colspan="2">감점 없음</td></tr>';
  if(pass && hasNet()) certPost({ kind:'exam', name:G.playerName || '이름 없음', score:EXAM.score, time:Math.round(EXAM.t), date:todayStr() });
  practiceSave();
  blip(880, 0.16, 'sine', 0.06); setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
  showSheet('<h1>' + (pass ? '합격' : '불합격') + '</h1><div class="sub">' + EXAM.score + '점 · 합격 기준 60점 · ' + fmtTime(EXAM.t) + '</div>' +
    '<table class="calc"><tbody>' + rows + '<tr class="sum"><td>최종</td><td class="num">' + EXAM.score + '</td></tr></tbody></table>' +
    '<div class="row"><button class="btn primary" data-act="courseAgain">다시</button><button class="btn" data-act="practiceMenu">연습장</button><button class="btn" id="btnBack">메뉴</button></div>');
}

/* ── 평행주차 세팅 — 파렛트 두 개 사이 ── */
function parkSetup(){
  const s = COURSES.park.slot;
  createPallet({ kind:'aj', cargo:'water', wrap:'full', seed:21 }, { x:s.x - 2.75, z:s.z, y:0, yaw:0 });
  createPallet({ kind:'kpp', cargo:'oil', wrap:'full', seed:22 }, { x:s.x + 2.75, z:s.z, y:0, yaw:0 });
  addPracticeMark(s.x, s.z, GOAL_COL);
}
/* ── 열차 세팅 — 빈 파렛트 7개 일렬 ── */
function trainSetup(){
  const c = COURSES.train;
  for(const p of pallets.slice()) if(p.cargo === 'empty') removePallet(p);
  for(let i=0;i<c.n8;i++) createPallet({ kind: i%2 ? 'kpp' : 'aj', cargo:'empty', wrap:'none', seed:i }, { x:c.start.x + 3.2 + i*1.15, z:c.start.z, y:0, yaw:0 });
  PR.chain = 0;
}

/* ── 꽂기 연습 (기존 유지) ── */
function drillPallet(){
  if(G.drillPallet) return G.drillPallet;
  const lv = PICK_LEVELS[G.drillLv];
  const p = createPallet({ kind: lv.pal || 'aj', cargo:'veg', wrap:'full', seed:5 }, { x:0, z:0, y:0, yaw:0 });
  p.id = 'DRILL';
  G.drillPallet = p;
  return p;
}
function pickSpawn(){
  const lv = PICK_LEVELS[G.drillLv];
  if(G.drillPallet && (G.drillPallet.kind !== (lv.pal || 'aj'))){ removePallet(G.drillPallet); G.drillPallet = null; }
  const p = drillPallet();
  if(p.slot){ p.slot.pallet = null; p.slot = null; }
  for(const q of pallets.slice()) if(q.sticky){ removePallet(q); }
  const jl = (Math.random()*2 - 1) * lv.lat;
  const ja = (Math.random()*2 - 1) * lv.ang;
  if(lv.kind === 'rack'){
    const bi = lv.sticky ? 1 : Math.floor(Math.random()*PRAC_RACK.xs.length);
    const s0 = place('연습-' + (bi+1) + '-' + (lv.level+1));
    p.x = s0.x + jl; p.z = s0.z; p.y = s0.y; p.yaw = ja;
    p.slot = s0; s0.pallet = p; p.pickY = s0.y;
    if(lv.sticky){
      p.adh = 1.0;
      for(const nbi of [0, 2]){
        const s1 = place('연습-' + (nbi+1) + '-' + (lv.level+1));
        const q = createPallet({ kind:'kpp', cargo:'water', wrap:'full', seed:30 + nbi }, { x:s1.x, z:s1.z, y:s1.y, yaw:0 });
        q.slot = s1; s1.pallet = q; q.adh = 1.0; q.sticky = true; q.pickY = s1.y;
      }
    }
  }else{
    const d = 3.2;
    p.x = truck.x + dirX(truck.h)*d + nrmX(truck.h)*jl;
    p.z = truck.z + dirZ(truck.h)*d + nrmZ(truck.h)*jl;
    p.y = 0; p.yaw = truck.h + ja + (lv.turn && Math.random() < 0.6 ? Math.PI/2 : 0);
  }
  p.pitch = 0; p.carried = false; p.inserted = false; p.falling = false; p.vx = 0; p.vz = 0; p.om = 0; p.adh = lv.sticky ? 1.0 : 0;
  truck.carry = null;
}
function pickStartPose(){
  const lv = PICK_LEVELS[G.drillLv];
  if(lv.kind === 'rack'){ truck.x = PRAC_RACK.xs[1]; truck.z = PRAC_RACK.z - 3.6; truck.h = 0; }
  else { truck.x = -19; truck.z = 66; truck.h = 0; }
  truck.v = 0; truck.lift = 0.06; truck.reach = 0; truck.tilt = 0;
  G.wheel = 0; G.throttle = 0; truck.carry = null;
}
function drillTask(){
  const lv = PICK_LEVELS[G.drillLv];
  showTask('꽂기 연습 ' + (G.drillLv+1) + ' / ' + PICK_LEVELS.length, lv.n,
    lv.d + '<br><b>' + G.drillN + ' / ' + lv.need + '</b> 성공 · 헛손질 ' + G.drillMiss + '회');
}
function drillLoadLevel(){
  G.drillN = 0; G.drillI = 0; G.drillMiss = 0;
  G.damage = 0; G.fault = 0;
  clearPractice();
  targetRing.visible = false; targetPost.visible = false;
  pickStartPose();
  pickSpawn();
  camera.userData.tx = truck.x; camera.userData.tz = truck.z;
  drillTask();
}
function drillStart(kind){
  hideSheet(); enterMode();
  G.mode = 'drill'; G.drill = 'pick'; G.drillLv = 0;
  G.time = 0; G.damage = 0; G.fault = 0; G.defects = {}; G.defectSeen = {}; G.chargeStep = false; G.mission = null;
  applyTime(2);
  resetWorld();
  slotGhost.visible = false;
  setView('fork');
  drillLoadLevel();
  G.running = true;
  applyLayout();
}
function drillPass(){
  G.running = false;
  const last = G.drillLv + 1 >= PICK_LEVELS.length;
  blip(880, 0.16, 'sine', 0.06);
  setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
  showSheet('<h1>' + PICK_LEVELS[G.drillLv].n + ' 통과</h1>' +
    '<div class="sub">헛손질 ' + G.drillMiss + '회</div>' +
    (last
      ? '<div class="sub">꽂기 연습을 모두 마쳤습니다.</div>' +
        '<div class="row"><button class="btn primary" data-act="eduCourse">교육 과정</button>' +
        '<button class="btn" data-act="drillAgain">다시</button><button class="btn" id="btnBack">메뉴</button></div>'
      : '<div class="row"><button class="btn primary" data-act="drillNext">다음 단계</button>' +
        '<button class="btn" data-act="drillAgain">다시</button><button class="btn" id="btnBack">메뉴</button></div>'));
}
function drillNext(){ if(G.drillLv + 1 < PICK_LEVELS.length) G.drillLv++; hideSheet(); drillLoadLevel(); G.running = true; }
function drillAgain(){ hideSheet(); drillLoadLevel(); G.running = true; }
function drillCheck(){
  const lv = PICK_LEVELS[G.drillLv];
  const p = G.drillPallet;
  if(p && truck.carry === p){
    G.drillN++;
    blip(780, 0.13, 'triangle', 0.05);
    p.carried = false; truck.carry = null;
    if(G.drillN >= lv.need){ drillPass(); return; }
    pickStartPose(); pickSpawn(); drillTask();
  }
}

/* ── 연습장 메뉴 ── */
function practiceSheet(){
  const b = PR.best;
  const row = (key, label, unit)=> '<button class="btn" data-act="course:' + key + '">' + label +
    (b[key] ? '<small>' + (unit === 'lap' ? b[key] + '바퀴' : fmtTime(b[key])) + '</small>' : '') + '</button>';
  return '<h1>연습장</h1><div class="sub">콘이 아니라 검지선입니다. 바퀴가 선을 밟으면 접촉으로 셉니다.</div>' +
    '<div class="row">' + row('exam', '자격시험 코스') + '<button class="btn" data-act="drillPick">꽂기 연습</button></div>' +
    '<div class="row">' + row('crank', '크랭크') + row('eight', '8자', 'lap') + row('revS', '후진 S자') + '</div>' +
    '<div class="row">' + row('park', '통로 평행주차') + row('slalom', '야드 슬라럼') +
    (PR.unlocked ? row('train', '열차') : '') + '</div>' +
    '<div class="row"><button class="btn" id="btnBack">돌아가기</button></div>';
}
function practiceSave(){
  try{ window.localStorage.setItem('forklift_prac_v1', JSON.stringify({ best:PR.best, unlocked:PR.unlocked })); }catch(e){}
}
function practiceLoad(){
  try{ const r = JSON.parse(window.localStorage.getItem('forklift_prac_v1') || '{}'); PR.best = r.best || {}; PR.unlocked = !!r.unlocked; }catch(e){}
}
/* 드라이브에서 빈 파렛트 5개를 붙여 5m 밀면 열린다 */
function trainUnlockCheck(dt){
  if(PR.unlocked) return;
  let longest = 0;
  for(const p of pallets) if(p.cargo === 'empty' && palletFree(p) && Math.hypot(p.vx, p.vz) > 0.1){ const n = chainLength(p); if(n > longest) longest = n; }
  if(longest >= 5){ G.trainD = (G.trainD || 0) + Math.abs(truck.v)*dt; }
  if((G.trainD || 0) > 5){ PR.unlocked = true; practiceSave(); toast('연습장에 새 종목이 열렸습니다', true); blip(1040, 0.3, 'sine', 0.06); }
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
