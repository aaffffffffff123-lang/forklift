"use strict";

/* ============================================================
   파렛트 — 종류·화물 프리셋·3D 생성·상태
   ============================================================ */

/* 파렛트 종류. sides 4 는 사방차입, 2 는 양방향(앞뒤만). insLo 는 지겟발이
   들어가는 최저 높이(파렛트 바닥 기준). 그보다 낮으면(랙·상판 위 파렛트) 하판 턱을 민다. */
const PAL_KINDS = {
  aj:   { n:'아주렌탈', deck:0x9FBE38, foot:0x86A32C, w:1.10, d:1.10, h:0.150, sides:4, bottom:true,  insLo:0.0,   insHi:0.115, ext:false },
  kpp:  { n:'KPP',      deck:0x7A2333, foot:0x5F1A27, w:1.10, d:1.10, h:0.150, sides:4, bottom:true,  insLo:0.0,   insHi:0.115, ext:false },
  wood: { n:'목재',     deck:0xA97C43, foot:0x8B6233, w:1.10, d:1.10, h:0.140, sides:2, bottom:false, insLo:-0.05, insHi:0.105, ext:true  },
  euro: { n:'수입 1200', deck:0x8F7A5A, foot:0x6E5A3C, w:1.20, d:1.00, h:0.145, sides:4, bottom:true,  insLo:0.0,   insHi:0.110, ext:true  }
};

/* 화물 프리셋 — 높이는 화물만. 무게는 범위. cg 는 무게중심 높이. c 는 깨짐 등급.
   spill 은 미랩핑일 때 상자가 쏟아지기 시작하는 가속도(m/s²). */
const CARGO_PRESETS = {
  empty:  { n:'빈 파렛트',  h:0,    w:[0,0],        cg:0.08, c:0, spill:99,  col:[] },
  misc:   { n:'잡화',       h:1.70, w:[260,420],    cg:0.90, c:0, spill:1.6, col:[0xC9AB74,0x99AACC,0xC2938B,0xB3A7C9,0xD9C9A0] },
  veg:    { n:'채소',       h:1.20, w:[380,480],    cg:0.60, c:0, spill:2.6, col:[0x4E8F3E] },
  frozen: { n:'냉동식품',   h:1.30, w:[650,780],    cg:0.65, c:0, spill:1.8, col:[0xF2F4F6] },
  water:  { n:'생수',       h:1.05, w:[880,960],    cg:0.50, c:1, spill:2.4, col:[0x5FA8E8] },
  oil:    { n:'올리브오일', h:0.80, w:[1000,1120],  cg:0.40, c:2, spill:1.9, col:[0x8B5E2E] },
  bottle: { n:'음료 병제품', h:1.35, w:[1080,1200], cg:0.70, c:2, spill:1.7, col:[0x2E7D52,0x3C4A5C] }
};
const CARGO_ORDER = ['water','veg','frozen','misc','oil','bottle'];

let _deckTex = null, _crateTex = null, _filmMat = null;
const _palMatCache = {};

function palletDeckTex(){
  if(_deckTex) return _deckTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,.26)'; g.lineWidth = 5;
  for(let i=18;i<128;i+=23){
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 9;
  g.strokeRect(5, 5, 118, 118);
  _deckTex = new THREE.CanvasTexture(c);
  return _deckTex;
}
function crateTex(){
  if(_crateTex) return _crateTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0,0,128,64);
  g.fillStyle = 'rgba(0,0,0,.35)';
  for(let x=10;x<128;x+=16) g.fillRect(x, 8, 5, 48);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(2,2,124,60);
  _crateTex = new THREE.CanvasTexture(c);
  _crateTex.wrapS = _crateTex.wrapT = THREE.RepeatWrapping;
  return _crateTex;
}
function palMat(kind){
  if(_palMatCache[kind]) return _palMatCache[kind];
  const k = PAL_KINDS[kind];
  _palMatCache[kind] = {
    deck: new THREE.MeshStandardMaterial({ color:k.deck, map: kind==='wood' ? null : palletDeckTex(), roughness: kind==='wood' ? 0.85 : 0.55 }),
    foot: new THREE.MeshStandardMaterial({ color:k.foot, roughness:0.7 })
  };
  return _palMatCache[kind];
}
function filmMat(){
  if(_filmMat) return _filmMat;
  _filmMat = new THREE.MeshStandardMaterial({ color:0xF4F8FC, transparent:true, opacity:0.30,
    roughness:0.12, metalness:0.15, depthWrite:false, side:THREE.DoubleSide });
  return _filmMat;
}

/* ㅍ자 파렛트 — 상판, 블록 9개, 하판 프레임(테두리 + 십자).
   목재는 널판 상판 + 스트링거 3개. 로컬 원점은 바닥 중앙. */
function makePalletMesh(kind){
  const k = PAL_KINDS[kind], m = palMat(kind);
  const g = new THREE.Group();
  const W = k.w, D = k.d;
  if(kind === 'wood'){
    // 상판 널 7장 — x 방향으로 놓이고, 스트링거는 z 방향(앞뒤로 열림)
    for(let i=0;i<7;i++){
      const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.022, 0.13), m.deck);
      b.position.set(0, 0.129, -D/2 + 0.075 + i*(D-0.15)/6); b.castShadow = true; g.add(b);
    }
    for(const sx of [-0.505, 0, 0.505]){
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.100, D), m.foot);
      s.position.set(sx, 0.05, 0); s.castShadow = true; g.add(s);
    }
    // 하단 널 3장
    for(const sz of [-0.46, 0, 0.46]){
      const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.018, 0.10), m.deck);
      b.position.set(0, 0.009, sz); g.add(b);
    }
    return g;
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.040, D), m.deck);
  deck.position.y = k.h - 0.020; deck.castShadow = true; g.add(deck);
  const fi = new THREE.InstancedMesh(new THREE.BoxGeometry(0.20, 0.080, 0.20), m.foot, 9);
  const mx = new THREE.Matrix4();
  let i = 0;
  for(const bx of [-(W/2-0.12), 0, (W/2-0.12)]) for(const bz of [-(D/2-0.12), 0, (D/2-0.12)]){
    mx.makeTranslation(bx, 0.030 + 0.040, bz); fi.setMatrixAt(i++, mx);
  }
  fi.instanceMatrix.needsUpdate = true; g.add(fi);
  // 하판 — 테두리 4개 + 십자 2개. 앞뒤 가로대가 "턱"이다.
  const bt = 0.030;
  const rim = [
    [W, 0.09, 0, 0, -(D/2-0.045)], [W, 0.09, 0, 0, (D/2-0.045)],
    [0.09, D, -(W/2-0.045), 0, 0], [0.09, D, (W/2-0.045), 0, 0],
    [W, 0.09, 0, 0, 0], [0.09, D, 0, 0, 0]
  ];
  for(const r of rim){
    const b = new THREE.Mesh(new THREE.BoxGeometry(r[0], bt, r[1]), m.foot);
    b.position.set(r[2], bt/2, r[4]); g.add(b);
  }
  return g;
}

/* 화물 — 층 단위 메시. 상자 개별은 쏟아질 때만 만든다. */
function makeCargoMesh(cargo, seed, kindW, kindD){
  const cp = CARGO_PRESETS[cargo];
  const g = new THREE.Group();
  const layers = [];
  if(cp.h <= 0) return { group:g, layers:layers };
  const fw = Math.min(kindW, 1.10) - 0.06, fd = Math.min(kindD, 1.10) - 0.06;
  const rnd = n => ((seed*9301 + n*49297) % 233280) / 233280;
  const addLayer = (y, h, w, d, color, rough, extra)=>{
    const mm = new THREE.MeshStandardMaterial({ color:color, roughness:rough==null?0.85:rough,
      transparent: cargo==='water', opacity: cargo==='water' ? 0.82 : 1 });
    if(cargo === 'veg'){ mm.map = crateTex(); mm.map.repeat.set(2,1); }
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm);
    b.position.y = y + h/2; b.castShadow = true;
    if(extra) extra(b);
    g.add(b); layers.push({ mesh:b, y:y, h:h, w:w, d:d, color:color });
  };
  let y = 0;
  if(cargo === 'misc'){
    const n = 4;
    for(let i=0;i<n;i++){
      const h = 0.36 + rnd(i)*0.12;
      const w = fw - rnd(i+7)*0.10, d = fd - rnd(i+3)*0.10;
      addLayer(y, h, w, d, cp.col[(seed+i)%cp.col.length], 0.9, b=>{ b.rotation.y = (rnd(i+11)-0.5)*0.06; });
      y += h;
    }
  }else if(cargo === 'veg'){
    for(let i=0;i<6;i++){ addLayer(y, 0.20, fw, fd, cp.col[0], 0.7); y += 0.20; }
  }else if(cargo === 'frozen'){
    for(let i=0;i<5;i++){ addLayer(y, 0.26, fw, fd, i===4 ? 0xEAF3FA : cp.col[0], 0.95); y += 0.26; }
  }else if(cargo === 'water'){
    for(let i=0;i<5;i++){
      addLayer(y, 0.21, fw, fd, cp.col[0], 0.25, b=>{
        // 번들 경계 — 흰 캡 줄
        const cap = new THREE.Mesh(new THREE.BoxGeometry(fw*0.98, 0.02, fd*0.98), new THREE.MeshStandardMaterial({color:0xF3F6F8, roughness:0.5}));
        cap.position.y = 0.105 - 0.01; b.add(cap);
      });
      y += 0.21;
    }
  }else if(cargo === 'oil'){
    for(let i=0;i<3;i++){ addLayer(y, 0.265, fw, fd, cp.col[0], 0.9); y += 0.265; }
  }else if(cargo === 'bottle'){
    for(let i=0;i<4;i++){ addLayer(y, 0.335, fw, fd, i%2 ? cp.col[1] : cp.col[0], 0.6); y += 0.335; }
  }
  return { group:g, layers:layers };
}

function makeFilmMesh(p){
  const k = PAL_KINDS[p.kind];
  const h = p.wrap === 'full' ? p.h + 0.04 : (p.wrap === 'partial' ? p.h*0.55 : 0);
  if(h <= 0 || p.h <= 0) return null;
  const w = Math.min(k.w, 1.10) - 0.02, d = Math.min(k.d, 1.10) - 0.02;
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), filmMat());
  f.position.y = (p.stack ? PAL_KINDS[p.stack.kind].h : 0) + k.h + h/2 - 0.02;
  f.renderOrder = 3;
  return f;
}

/* 파렛트 그룹을 통째로 다시 만든다 (랩 상태·겹침이 바뀔 때) */
function buildPalletMesh(p){
  if(p.mesh){ scene.remove(p.mesh); }
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const k = PAL_KINDS[p.kind];
  g.add(makePalletMesh(p.kind));
  let top = k.h;
  if(p.stack){
    const s = makePalletMesh(p.stack.kind);
    s.position.set(p.stack.off.x, top, p.stack.off.z);
    g.add(s);
    top += PAL_KINDS[p.stack.kind].h;
  }
  const cg = makeCargoMesh(p.cargo, p.seed, k.w, k.d);
  cg.group.position.set(p.skew.x + (p.stack ? p.stack.off.x : 0), top, p.skew.z + (p.stack ? p.stack.off.z : 0));
  if(p.overhang > 0) cg.group.scale.set(1 + p.overhang, 1, 1 + p.overhang*0.5);
  g.add(cg.group);
  p.layers = cg.layers;
  p.cargoGroup = cg.group;
  const film = makeFilmMesh(p);
  if(film){ film.position.x = p.skew.x; film.position.z = p.skew.z; g.add(film); }
  p.film = film;
  p.mesh = g;
  p.topY = top + p.h;          // 파렛트 바닥 기준 전체 높이
  scene.add(g);
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw;
}

let _pid = 0;
/* 프로파일에서 파렛트 객체를 만든다. pose:{x,z,y,yaw} */
function createPallet(prof, pose){
  const k = PAL_KINDS[prof.kind];
  const cp = CARGO_PRESETS[prof.cargo];
  const seed = prof.seed != null ? prof.seed : Math.floor(Math.random()*100000);
  const w = cp.w[0] + (cp.w[1]-cp.w[0]) * (((seed*7919) % 1000)/1000);
  const p = {
    id:'P' + (_pid++), kind:prof.kind, cargo:prof.cargo, seed:seed,
    w: Math.round(w), h: cp.h, cgY: cp.cg, c: cp.c,
    wrap: prof.wrap || (cp.h > 0 ? 'full' : 'none'),
    stack: prof.stack || null,
    skew: prof.skew || {x:0, z:0},
    overhang: prof.overhang || 0,
    broken:false, spilled:false,
    x:pose.x, z:pose.z, y:pose.y||0, yaw:pose.yaw||0, pitch:0,
    vx:0, vz:0, om:0,
    mass: 25 + Math.round(w), mu:0.45,
    adh:0,
    slot:null, zone:null, surf:null,
    carried:false, inserted:false, insDepth:0, insYaw:0, twist:0, pickY:pose.y||0,
    falling:false, fallV:0, mesh:null, layers:[], film:null
  };
  p.cargoName = cp.n;
  buildPalletMesh(p);
  pallets.push(p);
  return p;
}
function palletHalfW(p){ return PAL_KINDS[p.kind].w/2; }
function palletHalfD(p){ return PAL_KINDS[p.kind].d/2; }
function palletTop(p){ return p.y + (p.topY || 0.15); }

function setWrap(p, state){
  p.wrap = state;
  if(p.film){ p.mesh.remove(p.film); p.film = null; }
  const f = makeFilmMesh(p);
  if(f){ f.position.x = p.skew.x; f.position.z = p.skew.z; p.mesh.add(f); }
  p.film = f;
}

/* 세팅용 난수 — 일일 과제는 날짜 시드로 같은 배치가 나와야 한다 */
function mulberry(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 프로파일 뽑기. params: { ext:0~1 외부 입고 비율, unwrap:0~1 미랩핑 비율,
   cargos:[...], skew:0~1, overhang:0~1 } */
function pickProfile(rng, params, forceExt){
  const P = params || {};
  const cargos = P.cargos && P.cargos.length ? P.cargos : CARGO_ORDER;
  const ext = forceExt != null ? forceExt : (rng() < (P.ext || 0));
  const kind = ext ? (rng() < 0.6 ? 'wood' : 'euro') : (rng() < 0.5 ? 'aj' : 'kpp');
  const cargo = cargos[Math.floor(rng()*cargos.length)];
  const r = rng();
  const unwrap = P.unwrap || 0;
  const wrap = r < unwrap*0.7 ? 'none' : (r < unwrap ? 'partial' : 'full');
  const prof = { kind:kind, cargo:cargo, wrap: cargo==='empty' ? 'none' : wrap, seed: Math.floor(rng()*100000) };
  if(ext && rng() < (P.skew || 0)) prof.skew = { x:(rng()-0.5)*0.30, z:(rng()-0.5)*0.30 };
  if(ext && rng() < (P.overhang || 0)) prof.overhang = 0.05 + rng()*0.07;
  return prof;
}

/* 센터 초기 배치 */
function setupPallets(rng, params){
  rng = rng || Math.random;
  const P = params || { ext:0, unwrap:0.05, cargos:CARGO_ORDER };
  const put = (id, prof)=>{
    const s = place(id);
    if(!s || s.pallet) return null;
    // 그 단에 안 들어가는 화물은 다른 화물로 바꾼다
    if(s.kind === 'slot' && typeof slotClear === 'function'){
      const cl = slotClear(s);
      let guard = 0;
      while(CARGO_PRESETS[prof.cargo].h + PAL_KINDS[prof.kind].h > cl && guard++ < 8) prof.cargo = (P.cargos || CARGO_ORDER)[Math.floor(rng()*(P.cargos || CARGO_ORDER).length)];
      if(CARGO_PRESETS[prof.cargo].h + PAL_KINDS[prof.kind].h > cl) prof.cargo = 'water';
    }
    const p = createPallet(prof, { x:s.x, z:s.z, y:s.y, yaw:s.yaw||0 });
    if(s.kind === 'slot'){ p.slot = s; } else { p.zone = s; }
    s.pallet = p; p.pickY = s.y;
    p.adh = (p.wrap === 'full' && s.kind === 'slot') ? 0.6 + rng()*0.4 : 0;
    return p;
  };
  ['2F-A1-1-1','2F-A1-2-2','2F-A1-3-1','2F-A1-5-2','2F-A1-6-1','2F-A1-7-3']
    .forEach(id=> put(id, pickProfile(rng, P, false)));
  ['2F-C1-1-1','2F-C1-4-1','2F-C1-7-1','2F-C1-10-1']
    .forEach(id=> put(id, pickProfile(rng, P, false)));
  for(const row of ['A2','A3','A4','A5','A6','A7']){
    for(const b of [5, 15]){
      for(const l of [1, 2]){
        if(rng() < 0.5) put('2F-' + row + '-' + b + '-' + l, pickProfile(rng, P, false));
      }
    }
  }
  for(let i=1;i<=24;i+=6) put('2F-C2-' + i + '-1', pickProfile(rng, P, false));
  // 야드 빈 파렛트 열 (열차 재료)
  if(typeof EMPTY_ROW !== 'undefined'){
    for(let i=0;i<EMPTY_ROW.n;i++){
      createPallet({ kind: i%2 ? 'kpp' : 'aj', cargo:'empty', wrap:'none', seed:i },
        { x:EMPTY_ROW.x + i*1.16, z:EMPTY_ROW.z, y:0, yaw:0 });
    }
  }
}

function removePallet(p){
  if(p.slot){ p.slot.pallet = null; p.slot = null; }
  if(p.zone){ p.zone.pallet = null; p.zone = null; }
  if(truck.carry === p) truck.carry = null;
  if(p.mesh) scene.remove(p.mesh);
  const i = pallets.indexOf(p);
  if(i >= 0) pallets.splice(i, 1);
}

/* ── 쏟아짐·파편 ── */
const debris = [];
function spawnDebris(x, y, z, w, h, d, color, vx, vy, vz, rough){
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color:color, roughness:rough==null?0.85:rough }));
  b.position.set(x, y, z); b.castShadow = true;
  scene.add(b);
  debris.push({ mesh:b, x:x, y:y, z:z, vx:vx, vy:vy, vz:vz, rx:(Math.random()-0.5)*4, ry:(Math.random()-0.5)*4, h:h, t:0, done:false });
}
/* 파렛트 맨 위 층을 상자 여러 개로 흩는다 */
function spillTop(p, count, dirX0, dirZ0, power){
  if(!p.layers || !p.layers.length) return false;
  const L = p.layers.pop();
  p.cargoGroup.remove(L.mesh);
  const cols = 3, rows = 3;
  const bw = L.w/cols, bd = L.d/rows;
  let n = 0;
  const baseY = p.y + (p.cargoGroup.position.y) + L.y;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  for(let i=0;i<cols && n < count;i++) for(let j=0;j<rows && n < count;j++){
    const lx = -L.w/2 + bw*(i+0.5), lz = -L.d/2 + bd*(j+0.5);
    const wx = p.x + lx*c + lz*s, wz = p.z - lx*s + lz*c;
    spawnDebris(wx, baseY + L.h/2, wz, bw*0.92, L.h, bd*0.92, L.color,
      dirX0*power + (Math.random()-0.5)*1.2, 1.0 + Math.random()*1.2, dirZ0*power + (Math.random()-0.5)*1.2);
    n++;
  }
  p.h = Math.max(0, p.h - L.h);
  p.spilled = true;
  if(p.film){ p.mesh.remove(p.film); p.film = null; }
  return true;
}
/* 낙하 파손 — 화물 전부를 흩는다 */
function spillAll(p, power){
  let guard = 0;
  while(p.layers && p.layers.length && guard++ < 8) spillTop(p, 9, Math.sin(p.yaw), Math.cos(p.yaw), power || 1.2);
  if(p.cargo === 'water' && typeof addPaint === 'function'){
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.9 + Math.random()*0.5, 18), new THREE.MeshBasicMaterial({ color:0x3D5266, transparent:true, opacity:0.45 }));
    d.rotation.x = -Math.PI/2; d.position.set(p.x + (Math.random()-0.5), 0.012, p.z + (Math.random()-0.5));
    scene.add(d); debris.push({ mesh:d, x:d.position.x, y:0.012, z:d.position.z, vx:0, vy:0, vz:0, rx:0, ry:0, h:0, t:0, done:true, stain:true });
  }
}
function updateDebris(dt){
  for(const b of debris){
    if(b.done) continue;
    b.vy -= 9.8*dt;
    b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt;
    b.mesh.rotation.x += b.rx*dt; b.mesh.rotation.y += b.ry*dt;
    const floor = b.h/2;
    if(b.y <= floor){
      b.y = floor;
      if(b.vy < -0.8){ b.vy = -b.vy*0.25; b.vx *= 0.6; b.vz *= 0.6; b.rx *= 0.5; b.ry *= 0.5; }
      else{ b.vy = 0; b.vx *= 0.85; b.vz *= 0.85; b.rx = 0; b.ry = 0; b.mesh.rotation.x = Math.round(b.mesh.rotation.x/(Math.PI/2))*(Math.PI/2); }
    }
    b.t += dt;
    if(b.t > 3.0 || (b.y <= floor + 0.001 && Math.hypot(b.vx, b.vz) < 0.05)) b.done = true;
    b.mesh.position.set(b.x, b.y, b.z);
  }
}
function clearDebris(){
  for(const b of debris) scene.remove(b.mesh);
  debris.length = 0;
}
