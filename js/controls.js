/* ============================================================
   포크 좌표
   ============================================================ */
function forkBase(){
  const d = CFG.mastBase + truck.reach;
  return { x: truck.x + dirX(truck.h)*d, z: truck.z + dirZ(truck.h)*d };
}
function carryPose(){
  const fb = forkBase();
  return { x: fb.x + dirX(truck.h)*0.68, z: fb.z + dirZ(truck.h)*0.68 };
}
function relToFork(p){
  const fb = forkBase();
  const rx = p.x - fb.x, rz = p.z - fb.z;
  return {
    long: rx*dirX(truck.h) + rz*dirZ(truck.h),
    lat:  rx*nrmX(truck.h) + rz*nrmZ(truck.h),
    ang:  wrapQuarter(p.yaw - truck.h)
  };
}

/* ============================================================
   조작반
   ============================================================ */
function setPedal(on){
  G.pedal = on;
  const b = document.getElementById('pedal');
  b.classList.toggle('on', on);
  document.getElementById('pedalSt').textContent = on ? '해제' : '제동';
  b.title = on ? '브레이크 해제됨 (Space)' : '브레이크 제동 중 (Space)';
}

function buildLevers(){
  const wrap = document.getElementById('levers');
  wrap.innerHTML = '';
  LEVER_ORDER.forEach((name, i)=>{
    const m = LEVER_META[name];
    const h = 104 - i*14;
    const el = document.createElement('div');
    el.className = 'lever';
    el.setAttribute('data-lever', name);
    el.innerHTML =
      '<div class="dir">' + m.up + '</div>' +
      '<div class="slot" style="height:' + h + 'px"><div class="mid"></div><div class="stem"></div><div class="knob"></div></div>' +
      '<div class="dir">' + m.down + '</div>' +
      '<div class="cap">' + m.name + ' <b>' + m.keys + '</b></div>';
    wrap.appendChild(el);
    const L = levers[name];
    L.el = el; L.h = h;
    L.knob = el.querySelector('.knob');
    L.stem = el.querySelector('.stem');
  });
}

function bindControls(){
  const wrap = document.getElementById('wheelWrap');
  const svg = document.getElementById('wheelSvg');
  let wDrag = false, wLast = 0;
  const angleOf = e=>{
    const r = wrap.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height/2), e.clientX - (r.left + r.width/2));
  };
  /* 중심에 가까울수록 손가락이 조금만 움직여도 각도가 크게 튄다.
     안쪽 구역에서는 각도를 이어받기만 하고 돌리지는 않는다. */
  const radOf = e=>{
    const r = wrap.getBoundingClientRect();
    return Math.hypot(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2))
           / (r.width/2 || 1);
  };
  wrap.addEventListener('pointerdown', e=>{
    e.preventDefault(); wDrag = true; wLast = angleOf(e);
    try{ wrap.setPointerCapture(e.pointerId); }catch(err){}
  });
  wrap.addEventListener('pointermove', e=>{
    if(!wDrag) return;
    e.preventDefault();
    const a = angleOf(e);
    let d = a - wLast;
    while(d >  Math.PI) d -= 2*Math.PI;
    while(d < -Math.PI) d += 2*Math.PI;
    wLast = a;
    if(radOf(e) < 0.30) return;            // 축 근처는 무시
    d = clamp(d, -0.6, 0.6);               // 한 번에 튀는 양 제한
    G.wheel = clamp(G.wheel + d, -CFG.wheelMax, CFG.wheelMax);
  });
  const wEnd = ()=>{ wDrag = false; };
  wrap.addEventListener('pointerup', wEnd);
  wrap.addEventListener('pointercancel', wEnd);
  wrap.addEventListener('lostpointercapture', wEnd);
  svg.style.pointerEvents = 'none';

  document.querySelectorAll('.lever').forEach(el=>{
    const name = el.getAttribute('data-lever');
    const L = levers[name];
    const slot = el.querySelector('.slot');
    let sy = 0, sv = 0;
    slot.addEventListener('pointerdown', e=>{
      e.preventDefault(); L.drag = true; sy = e.clientY; sv = L.val;
      el.classList.add('act'); buzz(12);
      try{ slot.setPointerCapture(e.pointerId); }catch(err){}
    });
    slot.addEventListener('pointermove', e=>{
      if(!L.drag) return;
      L.val = clamp(sv + (sy - e.clientY)/((L.h/2) - 15), -1, 1);
    });
    const end = ()=>{ if(L.drag){ L.drag = false; L.val = 0; el.classList.remove('act'); } };
    slot.addEventListener('pointerup', end);
    slot.addEventListener('pointercancel', end);
    slot.addEventListener('lostpointercapture', end);
  });

  // 손을 대고 있는 동안만 조작반이 진해진다
  let liveT = null;
  window.addEventListener('pointerdown', e=>{
    const c = e.target.closest && e.target.closest('.ctl, #task, #zoom');
    if(!c) return;
    c.classList.add('live');
    if(liveT) clearTimeout(liveT);
  }, true);
  window.addEventListener('pointerup', ()=>{
    if(liveT) clearTimeout(liveT);
    liveT = setTimeout(()=>{
      const l = document.querySelectorAll('.live');
      for(let i=0;i<l.length;i++) l[i].classList.remove('live');
    }, 1400);
  }, true);

  window.addEventListener('pointerup', releaseLevers);
  window.addEventListener('pointercancel', releaseLevers);
  window.addEventListener('blur', releaseLevers);

  const thrEl = document.getElementById('thr');
  const thrSlot = thrEl.querySelector('.slot');
  let ty = 0, tv = 0;
  thrSlot.addEventListener('pointerdown', e=>{
    e.preventDefault(); THR.drag = true; ty = e.clientY; tv = G.throttle;
    thrEl.classList.add('act'); buzz(12);
    try{ thrSlot.setPointerCapture(e.pointerId); }catch(err){}
  });
  thrSlot.addEventListener('pointermove', e=>{
    if(!THR.drag) return;
    G.throttle = clamp(tv + (ty - e.clientY)/((THR.h/2) - 16), -1, 1);
  });
  const tEnd = ()=>{ if(THR.drag){ THR.drag = false; G.throttle = 0; thrEl.classList.remove('act'); } };
  thrSlot.addEventListener('pointerup', tEnd);
  thrSlot.addEventListener('pointercancel', tEnd);
  thrSlot.addEventListener('lostpointercapture', tEnd);

  const hornEl = document.getElementById('horn');
  hornEl.addEventListener('pointerdown', e=>{
    e.preventDefault(); resumeAudio(); setHorn(true);
    try{ hornEl.setPointerCapture(e.pointerId); }catch(err){}
  });
  const hOff = ()=> setHorn(false);
  hornEl.addEventListener('pointerup', hOff);
  hornEl.addEventListener('pointercancel', hOff);
  hornEl.addEventListener('lostpointercapture', hOff);
  document.getElementById('wrapBtn').addEventListener('pointerdown', e=>{ e.preventDefault(); resumeAudio(); startWrap(); });

  document.getElementById('tourNext').addEventListener('click', e=>{ e.stopPropagation(); tourNext(); });
  document.getElementById('tourSkip').addEventListener('click', e=>{ e.stopPropagation(); tourEnd(); });

  const ped = document.getElementById('pedal');
  ped.addEventListener('pointerdown', e=> e.stopPropagation());
  ped.addEventListener('click', e=>{ e.stopPropagation(); setPedal(!G.pedal); buzz(18); });

  document.getElementById('chargeStart').addEventListener('click', ()=>{
    if(chargeChecks().every(c=>c.ok)) openCharge();
  });
  document.getElementById('btnExit').addEventListener('click', ()=>{
    if(G.mode === 'menu') return;
    if(history.state && history.state.sim) history.back(); else backToMenu();
  });
  document.getElementById('btnMute').addEventListener('click', e=>{
    resumeAudio(); SND.on = !SND.on;
    e.target.classList.toggle('off', !SND.on);
  });
  document.getElementById('zoom').addEventListener('click', e=>{
    if(e.target.getAttribute('data-b')){ toggleBar(); return; }
    if(e.target.getAttribute('data-v')){ cycleView(); return; }
    if(e.target.getAttribute('data-r')){ toggleRear(); return; }
    if(e.target.getAttribute('data-f')){ toggleFull(); return; }
    if(e.target.getAttribute('data-m')){ toggleMap(); return; }
    if(e.target.getAttribute('data-u')){ cycleUi(); return; }
    const z = e.target.getAttribute('data-z');
    if(!z) return;
    G.zoom = clamp(G.zoom * (z === 'in' ? 0.82 : 1.22), 0.70, 3.6);
  });

  const cv = document.getElementById('scene');
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    G.zoom = clamp(G.zoom * (1 + Math.sign(e.deltaY)*0.10), 0.70, 3.8);
  }, {passive:false});

  let pDrag = false, pLX = 0, pLY = 0;
  cv.addEventListener('pointerdown', e=>{
    e.preventDefault(); resumeAudio();
    pDrag = true; pLX = e.clientX; pLY = e.clientY;
    try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  });
  cv.addEventListener('pointermove', e=>{
    if(!pDrag) return;
    e.preventDefault();
    const dx = e.clientX - pLX, dy = e.clientY - pLY;
    pLX = e.clientX; pLY = e.clientY;
    const k = 0.021 * camera.userData.z;
    G.pan.x -= (dx*0.913 + dy*0.408) * k;
    G.pan.z -= (dx*-0.408 + dy*0.913) * k;
    const d = Math.hypot(G.pan.x, G.pan.z);
    if(d > 130){ G.pan.x *= 130/d; G.pan.z *= 130/d; }
  });
  const pEnd = ()=>{ pDrag = false; };
  cv.addEventListener('pointerup', pEnd);
  cv.addEventListener('pointercancel', pEnd);
  cv.addEventListener('lostpointercapture', pEnd);

  document.addEventListener('touchmove', e=>{
    const ov = document.getElementById('overlay');
    if(!ov.classList.contains('hide') && ov.contains(e.target)) return;
    if(e.cancelable) e.preventDefault();
  }, { passive:false });
  document.addEventListener('gesturestart', e=> e.preventDefault());
  document.addEventListener('dblclick', e=> e.preventDefault());

  const block = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '];
  window.addEventListener('keydown', e=>{
    if(e.target && e.target.tagName === 'INPUT') return;
    if(e.key === 'Escape'){ if(G.mode !== 'menu'){ if(history.state && history.state.sim) history.back(); else backToMenu(); } return; }
    if(block.indexOf(e.key) >= 0) e.preventDefault();
    const k = e.key.toLowerCase();
    if(!e.repeat && k === ' ') setPedal(!G.pedal);
    if(!e.repeat && k === 'h') setHorn(true);
    if(!e.repeat && k === 'l') startWrap();
    keys[k] = true;
  });
  window.addEventListener('keyup', e=>{
    if(e.target && e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if(k === 'h') setHorn(false);
    keys[k] = false;
  });
  window.addEventListener('blur', ()=>{ for(const k in keys) keys[k] = false; setHorn(false); });
}

function readControls(dt){
  let ws = 0;
  if(keys['a'] || keys['arrowleft'])  ws -= 1;
  if(keys['d'] || keys['arrowright']) ws += 1;
  if(ws !== 0){
    G.wheelHold += dt;
    const t = Math.min(G.wheelHold / CFG.wheelRamp, 1);
    const rate = CFG.wheelRate0 + (CFG.wheelRate1 - CFG.wheelRate0) * t;
    G.wheel = clamp(G.wheel + ws*rate*dt, -CFG.wheelMax, CFG.wheelMax);
  }else G.wheelHold = 0;

  if(!THR.drag){
    const ti = ((keys['w'] || keys['arrowup']) ? 1 : 0) - ((keys['s'] || keys['arrowdown']) ? 1 : 0);
    if(ti !== 0) G.throttle = clamp(G.throttle + ti * dt / CFG.thrRise, -1, 1);
    else{
      const s = Math.sign(G.throttle);
      G.throttle -= s * Math.min(Math.abs(G.throttle), dt / CFG.thrFall);
    }
  }

  const kb = {
    lift:  (keys['f']?1:0) - (keys['r']?1:0),
    reach: (keys['e']?1:0) - (keys['q']?1:0),
    tilt:  (keys['g']?1:0) - (keys['t']?1:0)
  };
  const sticky = !!G.defects.ctrl;
  if(sticky && (kb.lift || kb.reach || kb.tilt)) defectHit('ctrl');
  for(const n in kb){
    const L = levers[n];
    if(L.drag) continue;
    if(sticky) L.val += (kb[n] - L.val) * (1 - Math.exp(-2.0*dt));
    else L.val = kb[n];
  }

  /* 핸들을 돌리는 동안 걸림쇠처럼 짧게 떤다. 8도마다 한 번. */
  const dw = Math.abs(G.wheel - G.wheelLast);
  G.wheelLast = G.wheel;
  if(dw > 0.0002){
    G.wheelAcc += dw;
    if(G.wheelAcc > 0.14){ G.wheelAcc = 0; buzz(6); }
    if(Math.abs(G.wheel) >= CFG.wheelMax - 1e-6 && !G.wheelLock){ G.wheelLock = true; buzz(28); }
  }else G.wheelAcc = Math.max(0, G.wheelAcc - 0.02);
  if(Math.abs(G.wheel) < CFG.wheelMax - 0.02) G.wheelLock = false;

  truck.steer = (G.wheel / CFG.wheelMax) * CFG.steerMax;
}

function releaseLevers(){
  G.throttle = 0;
  if(G.defects.ctrl){
    // 조종장치 결함 — 손을 떼도 곧바로 중립으로 돌아오지 않는다
    const thrEl0 = document.getElementById('thr');
    if(thrEl0){ THR.drag = false; thrEl0.classList.remove('act'); }
    for(const n in levers){
      const L = levers[n];
      if(L.drag){ L.drag = false; if(L.el) L.el.classList.remove('act'); }
      L.val *= 0.7;
    }
    setHorn(false);
    return;
  }
  const thrEl = document.getElementById('thr');
  if(thrEl){ THR.drag = false; thrEl.classList.remove('act'); }
  for(const n in levers){
    const L = levers[n];
    if(L.drag){ L.drag = false; if(L.el) L.el.classList.remove('act'); }
    L.val = 0;
  }
  setHorn(false);
}

function paintControls(){
  document.getElementById('wheelSvg').style.transform = 'rotate(' + (G.wheel*180/Math.PI) + 'deg)';
  const deg = Math.abs(G.wheel)*180/Math.PI;
  const off = deg > 6, left = G.wheel < 0;
  const wk = document.getElementById('wheelKnob');
  wk.setAttribute('fill', off ? (left ? '#D93025' : '#1A73E8') : '#F2B705');
  wk.setAttribute('stroke', off ? (left ? '#8E1D16' : '#0F4A9C') : '#8B6E06');

  for(const n in levers){
    const L = levers[n];
    if(!L.knob) continue;
    const c = L.h/2, tr = c - 15, top = c - L.val*tr;
    L.knob.style.top = top + 'px';
    L.stem.style.top = (L.val > 0 ? top : c) + 'px';
    L.stem.style.height = Math.abs(c - top) + 'px';
  }
  const tk = document.querySelector('#thr .knob'), ts = document.querySelector('#thr .stem');
  if(tk){
    const c = THR.h/2, tr = c - 16, top = c - G.throttle*tr;
    tk.style.top = top + 'px';
    ts.style.top = (G.throttle > 0 ? top : c) + 'px';
    ts.style.height = Math.abs(c - top) + 'px';
  }
  document.getElementById('horn').classList.toggle('on', G.horn);
}

