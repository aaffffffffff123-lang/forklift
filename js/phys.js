"use strict";

/* ============================================================
   파렛트 물리 — 바닥 위 2D 강체. 지겟발·앞다리·다른 파렛트·벽에 밀린다.
   여기 숫자만 만지면 손맛이 바뀐다. 단위는 m, kg, s, rad.
   ============================================================ */
const PHYS = {
  g: 9.8,
  muFloor: 0.45, muBed: 0.50, muLift: 0.40,     // 바닥 마찰계수
  rotFric: 0.6,                                  // 회전 마찰 (선형 대비)
  stopV: 0.02, stopOm: 0.03,                      // 완전 정지 판정
  rotK: 2.6,                                      // 접촉점이 중심을 빗나갈 때 도는 정도
  pushV: 1.0,                                     // 밀린 거리 → 속도로 옮기는 비율 (1이면 그대로)
  maxPushV: 1.2,                                  // 한 번에 밀렸을 때 튀어나가지 않게 속도 상한
  wallR: 0.60,                                    // 벽·기둥 판정용 파렛트 반경
  iters: 4,                                       // 파렛트끼리 겹침 해소 반복
  maxFix: 0.15,                                   // 프레임당 최대 관통 해소
  /* 삽입 */
  insLat: 0.12, insAng: 8*Math.PI/180,            // 구멍에 들어가는 좌우·각도 여유
  alignAng: 25*Math.PI/180, alignLat: 0.30,       // 이 안이면 밀어서 정렬된다
  blockLat: 0.30,                                 // 이보다 벗어나면 블록·모서리 접촉
  deepIns: 0.85, halfIns: 0.50,                   // 정삽입 / 반삽입 깊이
  slipHalf: 0.35,                                 // 반삽입으로 들었을 때 앞으로 미끄러지는 속도(후경 0일 때)
  pokeY: 0.20,                                    // 개구 상단보다 이만큼 높으면 화물을 찌른다
  /* 접착 */
  adhTimeRack: 60, adhTimeBed: 25, adhTimeFloor: 90,
  adhForce: 900,                                  // adh 1.0 일 때 붙는 힘(N 상당)
  dragRatio: 0.35,                                // 옆 파렛트 무게 × 이 비율보다 붙는 힘이 크면 딸려 나온다
  peelMin: 3*Math.PI/180, peelMax: 8*Math.PI/180, // 랩 떼기 — 이 사이로 틀면 떨어진다
  peelTime: 0.5,
  /* 쏟아짐 */
  brakeA: 3.6,                                    // 급제동 가속도 (참고)
  spillPartial: 1.6,                              // partial 은 임계 ×
  skewFactor: 0.6
};

/* 자유 파렛트 — 밀 수 있는 것 */
function palletFree(p){
  if(p.carried || p.falling || p.broken) return false;
  if(p.slot && p.slot.y > 0.20) return false;     // 랙 위는 밀면 떨어진다 (fork.js)
  if(p.slot && p.slot.y <= 0.20) return false;     // 1단 안은 기둥에 막혀 안 밀린다
  return true;
}
function palletMu(p){
  if(p.surf === 'bed') return PHYS.muBed;
  if(p.surf === 'lift') return PHYS.muLift;
  return PHYS.muFloor;
}
function palletI(p){
  const a = PAL_KINDS[p.kind].w, b = PAL_KINDS[p.kind].d;
  return p.mass * (a*a + b*b)/12;
}

/* 접촉점 (px,pz) 에서 방향 (nx,nz) 로 dist 만큼 밀기. 위치를 옮기고 속도·회전을 준다. */
function pushPallet(p, nx, nz, dist, px, pz, dt, oneShot){
  if(!palletFree(p)) return false;
  const d = Math.min(dist, PHYS.maxFix*3);
  p.x += nx*d; p.z += nz*d;
  let vv = d/Math.max(dt, 0.008) * PHYS.pushV;
  if(oneShot) vv = Math.min(vv, PHYS.maxPushV);     // 한 번에 툭 민 것은 튀어나가지 않게
  const vn = p.vx*nx + p.vz*nz;
  if(vn < vv){ p.vx += (vv - vn)*nx; p.vz += (vv - vn)*nz; }
  if(px != null){
    const rx = px - p.x, rz = pz - p.z;
    // 2D 외적 — 중심을 빗겨 밀면 돈다. yaw 는 +가 반시계(z→x) 라 부호를 맞춘다.
    const cr = rx*nz - rz*nx;
    p.om += cr * d * PHYS.rotK / Math.max(0.35, palletI(p)/p.mass);
  }
  detachPlace(p);
  return true;
}
/* 자리에서 벗어났으면 점유 해제 */
function detachPlace(p){
  if(p.zone && Math.hypot(p.x - p.zone.x, p.z - p.zone.z) > 0.45){ p.zone.pallet = null; p.zone = null; }
}

/* ── OBB ── */
function palletCorners(p){
  const hw = palletHalfW(p), hd = palletHalfD(p);
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return [
    { x: p.x + hw*c + hd*s, z: p.z - hw*s + hd*c },
    { x: p.x - hw*c + hd*s, z: p.z + hw*s + hd*c },
    { x: p.x - hw*c - hd*s, z: p.z + hw*s - hd*c },
    { x: p.x + hw*c - hd*s, z: p.z - hw*s - hd*c }
  ];
}
function palletAxes(p){
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return [ { x:c, z:-s }, { x:s, z:c } ];
}
function projRange(corners, ax){
  let lo = Infinity, hi = -Infinity;
  for(const c of corners){ const v = c.x*ax.x + c.z*ax.z; if(v<lo) lo=v; if(v>hi) hi=v; }
  return [lo, hi];
}
/* 최소 이동 벡터. 겹치지 않으면 null. n 은 A→B 방향. */
function obbMTV(A, B){
  const ca = palletCorners(A), cb = palletCorners(B);
  const axes = palletAxes(A).concat(palletAxes(B));
  let best = null;
  for(const ax of axes){
    const ra = projRange(ca, ax), rb = projRange(cb, ax);
    const o = Math.min(ra[1], rb[1]) - Math.max(ra[0], rb[0]);
    if(o <= 0) return null;
    if(!best || o < best.d) best = { d:o, nx:ax.x, nz:ax.z };
  }
  const dx = B.x - A.x, dz = B.z - A.z;
  if(dx*best.nx + dz*best.nz < 0){ best.nx = -best.nx; best.nz = -best.nz; }
  return best;
}
/* A 상자 위에서 B 중심에 가장 가까운 점 (접촉점 근사) */
function closestOnBox(A, x, z){
  const hw = palletHalfW(A), hd = palletHalfD(A);
  const c = Math.cos(A.yaw), s = Math.sin(A.yaw);
  const dx = x - A.x, dz = z - A.z;
  let lx = dx*c - dz*s, lz = dx*s + dz*c;
  lx = clamp(lx, -hw, hw); lz = clamp(lz, -hd, hd);
  return { x: A.x + lx*c + lz*s, z: A.z - lx*s + lz*c };
}

/* ── 벽 ── */
const WALLS = { segs:[], circles:[], rects:[] };   // rects: 파렛트가 못 들어가는 상자
function buildWalls(){
  WALLS.segs.length = 0; WALLS.circles.length = 0; WALLS.rects.length = 0;
  const S = WALLS.segs;
  S.push([-IN.x, IN.z0, IN.x, IN.z0]);
  S.push([-IN.x, IN.z0, -IN.x, WALL_Z]);
  S.push([IN.x, IN.z0, IN.x, WALL_Z]);
  let cur = -IN.x;
  for(const gx of GATES){ S.push([cur, WALL_Z, gx - 4.1, WALL_Z]); cur = gx + 4.1; }
  S.push([cur, WALL_Z, IN.x, WALL_Z]);
  for(const s of RACK_SLABS) WALLS.rects.push({ x0:s.x0, x1:s.x1, z0:s.z0, z1:s.z1 });
  for(const q of PILLARS) WALLS.circles.push({ x:q.x, z:q.z, r:0.32 });
  if(typeof dockWalls === 'function') dockWalls(WALLS);
}
function segDist(px, pz, a){
  const dx = a[2]-a[0], dz = a[3]-a[1];
  const L2 = dx*dx + dz*dz || 1e-9;
  let t = ((px-a[0])*dx + (pz-a[1])*dz)/L2; t = clamp(t, 0, 1);
  const cx = a[0] + dx*t, cz = a[1] + dz*t;
  return { d: Math.hypot(px-cx, pz-cz), cx:cx, cz:cz };
}
function wallsResolve(p){
  const r = PHYS.wallR;
  let hit = false;
  // 상판(적재함·엘베) 위 파렛트는 그 상자 안에만 가둔다 — 원 근사 벽은 좁은 방에서 너무 보수적이다
  if(p.surf) return surfConfine(p);
  for(const a of WALLS.segs){
    const q = segDist(p.x, p.z, a);
    if(q.d < r && q.d > 1e-6){
      const push = r - q.d; const nx = (p.x - q.cx)/q.d, nz = (p.z - q.cz)/q.d;
      p.x += nx*push; p.z += nz*push;
      const vn = p.vx*nx + p.vz*nz; if(vn < 0){ p.vx -= vn*nx; p.vz -= vn*nz; }
      hit = true;
    }
  }
  for(const c of WALLS.circles){
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), R = c.r + r*0.85;
    if(d < R && d > 1e-6){
      p.x += dx/d*(R-d); p.z += dz/d*(R-d);
      const nx = dx/d, nz = dz/d; const vn = p.vx*nx + p.vz*nz; if(vn < 0){ p.vx -= vn*nx; p.vz -= vn*nz; }
      hit = true;
    }
  }
  for(const rc of WALLS.rects){
    // 랙 안·상판 위 파렛트는 바닥 벽과 무관하다
    if(p.slot || p.surf) continue;
    const ex = Math.max(rc.x0 - r*0.8, Math.min(rc.x1 + r*0.8, p.x));
    const ez = Math.max(rc.z0 - r*0.8, Math.min(rc.z1 + r*0.8, p.z));
    if(ex === p.x && ez === p.z){
      // 안에 있다 — 가장 가까운 면으로 밀어낸다
      const dl = p.x - (rc.x0 - r*0.8), dr = (rc.x1 + r*0.8) - p.x;
      const du = p.z - (rc.z0 - r*0.8), dd = (rc.z1 + r*0.8) - p.z;
      const m = Math.min(dl, dr, du, dd);
      if(m === dl) p.x -= dl; else if(m === dr) p.x += dr; else if(m === du) p.z -= du; else p.z += dd;
      p.vx *= 0.2; p.vz *= 0.2; hit = true;
    }
  }
  return hit;
}
function surfConfine(p){
  let hit = false;
  if(typeof surfRect === 'function'){
    const rc = surfRect(p.surf);
    if(rc){
      const c = Math.abs(Math.cos(p.yaw)), s = Math.abs(Math.sin(p.yaw));
      const hx = c*palletHalfW(p) + s*palletHalfD(p), hz = s*palletHalfW(p) + c*palletHalfD(p);
      let fx = 0, fz = 0;
      if(p.x - hx < rc.x0){ fx = rc.x0 - (p.x - hx); }
      if(p.x + hx > rc.x1){ fx = rc.x1 - (p.x + hx); }
      if(p.z - hz < rc.z0){ fz = rc.z0 - (p.z - hz); }
      if(p.z + hz > rc.z1){ fz = rc.z1 - (p.z + hz); }
      if(fx || fz){
        p.x += fx; p.z += fz;
        if(fx) p.vx = 0; if(fz) p.vz = 0;
        p.om *= 0.5;
        hit = true;
        p.wallHit = (p.wallHit || 0) + 1;
      }
    }
  }
  return hit;
}

/* ── 접착 ── */
function palletNeighbors(p){
  const out = [];
  for(const q of pallets){
    if(q === p || q.carried || q.falling || q.broken) continue;
    if(Math.abs(q.y - p.y) > 0.12) continue;
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    const lim = palletHalfW(p) + palletHalfW(q) + 0.12;
    if(d < lim && d > 0.3) out.push({ q:q, d:d });
  }
  return out;
}
function adhTime(p){
  if(p.slot) return PHYS.adhTimeRack;
  if(p.surf === 'bed') return PHYS.adhTimeBed;
  return PHYS.adhTimeFloor;
}
function updateAdhesion(dt){
  for(const p of pallets){
    if(p.carried || p.falling || p.broken || p.wrap === 'none') continue;
    if(Math.hypot(p.vx, p.vz) > 0.05) continue;
    const nb = palletNeighbors(p);
    let any = false;
    for(const n of nb) if(n.q.wrap !== 'none') any = true;
    if(any) p.adh = clamp(p.adh + dt/adhTime(p) * (p.wrap === 'partial' ? 0.5 : 1), 0, 1);
  }
}

/* ── 한 프레임 ── */
function physStep(dt){
  // 적분·마찰
  for(const p of pallets){
    if(!palletFree(p)) continue;
    if(p.inserted) { p.vx = 0; p.vz = 0; p.om = 0; continue; }   // 꽂힌 파렛트는 지겟발이 잡고 있다
    const v = Math.hypot(p.vx, p.vz);
    if(v > 0){
      p.x += p.vx*dt; p.z += p.vz*dt;
      const dec = palletMu(p) * PHYS.g * dt;
      const nv = Math.max(0, v - dec);
      p.vx *= nv/v; p.vz *= nv/v;
      if(nv < PHYS.stopV){ p.vx = 0; p.vz = 0; }
      detachPlace(p);
    }
    if(p.om !== 0){
      p.yaw = wrapPi(p.yaw + p.om*dt);
      const dec = palletMu(p) * PHYS.g * PHYS.rotFric * dt;
      const s = Math.sign(p.om);
      p.om = s * Math.max(0, Math.abs(p.om) - dec);
      if(Math.abs(p.om) < PHYS.stopOm) p.om = 0;
    }
  }
  // 파렛트끼리
  const free = pallets.filter(palletFree);
  for(let it=0; it<PHYS.iters; it++){
    for(let i=0;i<free.length;i++) for(let j=i+1;j<free.length;j++){
      const A = free[i], B = free[j];
      if(Math.abs(A.y - B.y) > 0.12) continue;
      if(Math.abs(A.x - B.x) > 1.8 || Math.abs(A.z - B.z) > 1.8) continue;
      const m = obbMTV(A, B);
      if(!m) continue;
      const d = Math.min(m.d, PHYS.maxFix);
      const aFix = A.inserted ? 0 : (B.inserted ? 1 : B.mass/(A.mass + B.mass));
      const bFix = 1 - aFix;
      A.x -= m.nx*d*aFix; A.z -= m.nz*d*aFix;
      B.x += m.nx*d*bFix; B.z += m.nz*d*bFix;
      // 속도 — 법선 방향은 함께 움직인다 (완전 비탄성)
      const va = A.vx*m.nx + A.vz*m.nz, vb = B.vx*m.nx + B.vz*m.nz;
      if(va > vb){
        const vc = A.inserted ? va : (B.inserted ? vb : (A.mass*va + B.mass*vb)/(A.mass + B.mass));
        if(!A.inserted){ A.vx += (vc - va)*m.nx; A.vz += (vc - va)*m.nz; }
        if(!B.inserted){ B.vx += (vc - vb)*m.nx; B.vz += (vc - vb)*m.nz; }
      }
      // 회전 — 접촉점이 중심을 빗나간 만큼
      const cp = closestOnBox(A, B.x, B.z);
      const ra = cp.x - A.x, rz = cp.z - A.z;
      const rb = cp.x - B.x, rbz = cp.z - B.z;
      const push = Math.max(0.0, va - vb) * dt + d*0.5;
      const ka = PHYS.rotK / Math.max(0.35, palletI(A)/A.mass);
      const kb = PHYS.rotK / Math.max(0.35, palletI(B)/B.mass);
      if(!A.inserted) A.om -= (ra*m.nz - rz*m.nx) * push * ka * 0.5;
      if(!B.inserted) B.om += (rb*m.nz - rbz*m.nx) * push * kb;
      detachPlace(A); detachPlace(B);
    }
    for(const p of free) wallsResolve(p);
  }
  updateAdhesion(dt);
  updateDebris(dt);
}

/* 열차 — 서로 붙어 함께 움직이는 자유 파렛트 사슬 길이 */
function chainLength(p){
  const seen = new Set([p]);
  const stack = [p];
  while(stack.length){
    const a = stack.pop();
    for(const q of pallets){
      if(seen.has(q) || !palletFree(q) || Math.abs(q.y - a.y) > 0.12) continue;
      const d = Math.hypot(q.x - a.x, q.z - a.z);
      if(d < palletHalfW(a) + palletHalfW(q) + 0.25){ seen.add(q); stack.push(q); }
    }
  }
  return seen.size;
}
