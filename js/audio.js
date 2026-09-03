/* ============================================================
   소리
   ============================================================ */
const SND = {
  ctx:null, on:true,
  drive:null, driveGain:null,
  hydOsc:null, hydSub:null, hydGain:null,
  hornGain:null, scrapeGain:null, scrapeFilt:null, scrapeFilt2:null,
  scrapeOsc:null, scrapeOsc2:null,
  ambGain:null, ambFilt:null,
  beepT:0, relief:false, reliefT:0, lastLev:0, scrape:0, ambT:6
};

function initAudio(){
  if(SND.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return;
  SND.ctx = new AC();
  const dst = SND.ctx.destination;

  const o = SND.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;
  const f = SND.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
  const g = SND.ctx.createGain(); g.gain.value = 0;
  o.connect(f); f.connect(g); g.connect(dst); o.start();
  SND.drive = o; SND.driveGain = g;

  const hg = SND.ctx.createGain(); hg.gain.value = 0; hg.connect(dst);
  const o2 = SND.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 128;
  const f2 = SND.ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 640; f2.Q.value = 1.1;
  const g2 = SND.ctx.createGain(); g2.gain.value = 0.55;
  o2.connect(f2); f2.connect(g2); g2.connect(hg); o2.start();
  const o3 = SND.ctx.createOscillator(); o3.type = 'sawtooth'; o3.frequency.value = 64;
  const f3 = SND.ctx.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.value = 210;
  const g3 = SND.ctx.createGain(); g3.gain.value = 0.85;
  o3.connect(f3); f3.connect(g3); g3.connect(hg); o3.start();
  SND.hydOsc = o2; SND.hydSub = o3; SND.hydGain = hg;

  const hn = SND.ctx.createGain(); hn.gain.value = 0;
  const hf = SND.ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 2400;
  hn.connect(hf); hf.connect(dst);
  [[402,'sawtooth',1.0],[506,'sawtooth',0.7],[804,'square',0.22]].forEach(v=>{
    const ho = SND.ctx.createOscillator();
    ho.type = v[1]; ho.frequency.value = v[0];
    const hgn = SND.ctx.createGain(); hgn.gain.value = v[2];
    ho.connect(hgn); hgn.connect(hn); ho.start();
  });
  SND.hornGain = hn;

  const sr = SND.ctx.sampleRate;
  const nb = SND.ctx.createBuffer(1, Math.floor(sr*1.2), sr);
  const nd = nb.getChannelData(0);
  for(let i=0;i<nd.length;i++) nd[i] = Math.random()*2 - 1;

  /* 지겟발이 바닥을 긁는 소리 — 둔탁하면 뭐가 잘못됐는지 모른다.
     좁은 대역에 몰아넣고 배음을 얹어 카랑카랑한 쇳소리로 만든다. */
  const ng = SND.ctx.createGain(); ng.gain.value = 0;
  ng.connect(dst);
  const ns = SND.ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const nf = SND.ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3300; nf.Q.value = 7;
  const nfg = SND.ctx.createGain(); nfg.gain.value = 1.0;
  ns.connect(nf); nf.connect(nfg); nfg.connect(ng); ns.start();
  const nf2 = SND.ctx.createBiquadFilter(); nf2.type = 'bandpass'; nf2.frequency.value = 5400; nf2.Q.value = 9;
  const nfg2 = SND.ctx.createGain(); nfg2.gain.value = 0.55;
  ns.connect(nf2); nf2.connect(nfg2); nfg2.connect(ng);
  const so = SND.ctx.createOscillator(); so.type = 'sawtooth'; so.frequency.value = 2100;
  const sog = SND.ctx.createGain(); sog.gain.value = 0.16;
  so.connect(sog); sog.connect(ng); so.start();
  const so2 = SND.ctx.createOscillator(); so2.type = 'sawtooth'; so2.frequency.value = 3170;
  const sog2 = SND.ctx.createGain(); sog2.gain.value = 0.10;
  so2.connect(sog2); sog2.connect(ng); so2.start();
  SND.scrapeGain = ng; SND.scrapeFilt = nf; SND.scrapeFilt2 = nf2;
  SND.scrapeOsc = so; SND.scrapeOsc2 = so2;

  // 센터 환경음 — 컨베이어와 공조기
  const as = SND.ctx.createBufferSource(); as.buffer = nb; as.loop = true;
  const af = SND.ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 240;
  const ag = SND.ctx.createGain(); ag.gain.value = 0;
  as.connect(af); af.connect(ag); ag.connect(dst); as.start();
  const ah = SND.ctx.createOscillator(); ah.type = 'sine'; ah.frequency.value = 88;
  const ahg = SND.ctx.createGain(); ahg.gain.value = 0.35;
  ah.connect(ahg); ahg.connect(ag); ah.start();
  SND.ambGain = ag; SND.ambFilt = af;
}
function resumeAudio(){
  initAudio();
  if(SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume();
}
function blip(freq, dur, type, vol){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime;
  const o = SND.ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
  const g = SND.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SND.ctx.destination);
  o.start(t); o.stop(t + dur + 0.03);
}
/* 후진 경보 — 소음 속에서 뚫고 나와야 한다.
   낮으면 묻히므로 사람 귀가 가장 예민한 2~4kHz 대역을 쓴다. */
function backupBeep(){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime;
  const g = SND.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.055, t + 0.005);
  g.gain.setValueAtTime(0.055, t + 0.34);             // 끌어주는 구간
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  const hp = SND.ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 1400;
  g.connect(hp); hp.connect(SND.ctx.destination);
  [[2050,'square',1.0],[4100,'square',0.45],[6150,'square',0.18],[2050*1.5,'sawtooth',0.10]]
  .forEach(v=>{
    const o = SND.ctx.createOscillator();
    o.type = v[1]; o.frequency.value = v[0];
    const og = SND.ctx.createGain(); og.gain.value = v[2];
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + 0.40);
  });
}
function carHonk(){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime;
  const g = SND.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.02);
  g.gain.setValueAtTime(0.05, t + 0.30);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  const lp = SND.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
  g.connect(lp); lp.connect(SND.ctx.destination);
  [[440,'sawtooth',1.0],[554,'sawtooth',0.75]].forEach(v=>{
    const o = SND.ctx.createOscillator();
    o.type = v[1]; o.frequency.value = v[0];
    const og = SND.ctx.createGain(); og.gain.value = v[2];
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + 0.46);
  });
}
function distantBeep(){
  if(!SND.ctx || !SND.on) return;
  let n = 0;
  const tick = ()=>{
    if(n++ > 3) return;
    blip(950, 0.10, 'square', 0.012);
    setTimeout(tick, 420);
  };
  tick();
}
function hydClick(down){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime, sr = SND.ctx.sampleRate;
  const b = SND.ctx.createBuffer(1, Math.floor(sr*0.09), sr);
  const d = b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 4);
  const src = SND.ctx.createBufferSource(); src.buffer = b;
  const f = SND.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = down ? 520 : 900; f.Q.value = 1.2;
  const g = SND.ctx.createGain(); g.gain.value = down ? 0.16 : 0.10;
  src.connect(f); f.connect(g); g.connect(SND.ctx.destination); src.start(t);
}
function reliefHiss(){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime, sr = SND.ctx.sampleRate;
  const b = SND.ctx.createBuffer(1, Math.floor(sr*0.26), sr);
  const d = b.getChannelData(0);
  for(let i=0;i<d.length;i++){ const k = i/d.length; d[i] = (Math.random()*2-1)*Math.sin(Math.PI*k)*0.9; }
  const src = SND.ctx.createBufferSource(); src.buffer = b;
  const f = SND.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
  const g = SND.ctx.createGain(); g.gain.value = 0.075;
  src.connect(f); f.connect(g); g.connect(SND.ctx.destination); src.start(t);
}
/* 위험 경고음 — 계기판을 안 보고 있으면 게이지가 차오르는 걸 놓친다.
   후진 경보(2050Hz 단음)와 헷갈리지 않게 삐빅 2연타로 구분하고,
   게이지가 찰수록 간격이 좁아진다. */
function riskBeep(soft){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime;
  const f0 = soft ? 880 : 1560;
  const n = soft ? 1 : 2;
  for(let i=0;i<n;i++){
    const t0 = t + i*0.115;
    const o = SND.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f0 * (i ? 1.24 : 1);
    const g = SND.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(soft ? 0.028 : 0.046, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);
    o.connect(g); g.connect(SND.ctx.destination);
    o.start(t0); o.stop(t0 + 0.12);
  }
}
function tickRiskBeep(dt){
  if(!G.risk || !G.running){ G.riskT = 0; return; }
  G.riskT -= dt;
  if(G.riskT > 0) return;
  const soft = G.risk.lv === 'warn';
  G.riskT = soft ? 0.95 : (1.05 - 0.75*clamp(G.risk.r, 0, 1));
  riskBeep(soft);
}
function buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }

/* 부딪힌 재질에 따라 소리를 달리한다 */
function impact(kind, vol){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime, sr = SND.ctx.sampleRate, v = vol || 1;
  const noise = (dur, type, freq, q, gain, curve)=>{
    const b = SND.ctx.createBuffer(1, Math.max(64, Math.floor(sr*dur)), sr);
    const d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, curve);
    const src = SND.ctx.createBufferSource(); src.buffer = b;
    const f = SND.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    if(q) f.Q.value = q;
    const g = SND.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(SND.ctx.destination); src.start(t);
  };
  const ring = (freq, dur, gain, type)=>{
    const o = SND.ctx.createOscillator(); o.type = type || 'triangle'; o.frequency.value = freq;
    const g = SND.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(SND.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  };
  if(kind === 'steel'){
    noise(0.10, 'highpass', 1600, 0, 0.16*v, 2);
    ring(1180, 0.55, 0.055*v); ring(1760, 0.42, 0.035*v); ring(2640, 0.30, 0.020*v, 'sine');
    buzz(35);
  }else if(kind === 'concrete'){
    noise(0.24, 'lowpass', 300, 0, 0.42*v, 3);
    ring(96, 0.22, 0.070*v, 'sine');
    buzz(45);
  }else if(kind === 'plastic'){
    noise(0.07, 'bandpass', 900, 1.2, 0.16*v, 2);
    ring(520, 0.14, 0.030*v);
    buzz(15);
  }else if(kind === 'person'){
    noise(0.20, 'lowpass', 420, 0, 0.34*v, 3);
    for(let i=0;i<3;i++){
      setTimeout(()=>{
        if(!SND.ctx || !SND.on) return;
        const tt = SND.ctx.currentTime;
        const o = SND.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1180;
        const g = SND.ctx.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(0.075, tt + 0.01);
        g.gain.setValueAtTime(0.075, tt + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.20);
        o.connect(g); g.connect(SND.ctx.destination);
        o.start(tt); o.stop(tt + 0.22);
      }, i*230);
    }
    buzz([90, 60, 90, 60, 160]);
  }else{
    noise(0.20, 'lowpass', 340, 0, 0.35*v, 3);
  }
}

function thud(vol){
  if(!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime, sr = SND.ctx.sampleRate;
  const b = SND.ctx.createBuffer(1, Math.floor(sr*0.20), sr);
  const d = b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 3);
  const src = SND.ctx.createBufferSource(); src.buffer = b;
  const f = SND.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340;
  const g = SND.ctx.createGain(); g.gain.value = vol || 0.35;
  src.connect(f); f.connect(g); g.connect(SND.ctx.destination); src.start(t);
}
function setHorn(on){
  if(G.horn === on) return;
  G.horn = on;
  if(on) resumeAudio();
  if(SND.ctx && SND.hornGain){
    const t = SND.ctx.currentTime;
    SND.hornGain.gain.cancelScheduledValues(t);
    SND.hornGain.gain.setTargetAtTime(on && SND.on && !G.defects.horn ? 0.085 : 0, t, on ? 0.006 : 0.02);
  }
  const el = document.getElementById('horn');
  if(el) el.classList.toggle('on', on);
}

function updateAudio(dt){
  if(!SND.ctx) return;
  const t = SND.ctx.currentTime;
  const sp = Math.abs(truck.v);
  SND.driveGain.gain.setTargetAtTime(SND.on ? Math.min(0.055, sp*0.032) : 0, t, 0.09);
  SND.drive.frequency.setTargetAtTime(54 + sp*72, t, 0.09);

  const lev = Math.max(Math.abs(levers.lift.val), Math.abs(levers.tilt.val), Math.abs(levers.reach.val));
  const rise = levers.lift.val < -0.05 ? 1 : 0;
  const load = truck.carry ? 1 : 0;
  SND.hydGain.gain.setTargetAtTime(SND.on ? lev*0.085 : 0, t, 0.04);
  SND.hydOsc.frequency.setTargetAtTime(128 - load*rise*22, t, 0.12);
  SND.hydSub.frequency.setTargetAtTime(64 - load*rise*11, t, 0.12);
  if(lev > 0.05 && SND.lastLev <= 0.05) hydClick(true);
  if(lev <= 0.05 && SND.lastLev > 0.05) hydClick(false);
  SND.lastLev = lev;

  SND.reliefT -= dt;
  if(SND.relief && SND.reliefT <= 0){ reliefHiss(); SND.reliefT = 0.30; }
  if(!SND.relief) SND.reliefT = 0;

  if(SND.scrapeGain){
    SND.scrapeGain.gain.setTargetAtTime(SND.on ? SND.scrape*0.085 : 0, t, 0.04);
    // 빠를수록 높고 날카롭게, 미세하게 흔들려 금속이 갈리는 느낌을 준다
    const jit = 1 + Math.sin(t*37) * 0.05;
    SND.scrapeFilt.frequency.setTargetAtTime((2600 + SND.scrape*1900)*jit, t, 0.05);
    SND.scrapeFilt2.frequency.setTargetAtTime((4600 + SND.scrape*2200)*jit, t, 0.05);
    SND.scrapeOsc.frequency.setTargetAtTime((1750 + SND.scrape*900)*jit, t, 0.06);
    SND.scrapeOsc2.frequency.setTargetAtTime((2640 + SND.scrape*1300)*jit, t, 0.06);
  }

  // 환경음 — 실내에서 크고, 밖으로 나가면 바람 소리로 바뀐다
  if(SND.ambGain){
    const inside = truck.z < WALL_Z;
    const lvl = G.running ? (inside ? 0.030 : 0.018) : 0.006;
    SND.ambGain.gain.setTargetAtTime(SND.on ? lvl : 0, t, 0.5);
    SND.ambFilt.frequency.setTargetAtTime(inside ? 240 : 620, t, 0.6);
    if(G.running && inside){
      SND.ambT -= dt;
      if(SND.ambT <= 0){ SND.ambT = 9 + Math.random()*14; distantBeep(); }
    }
  }

  if(G.defects.beep && G.throttle < -0.05 && G.pedal) defectHit('beep');
  if(SND.on && !G.defects.beep && G.throttle < -0.05 && (G.pedal || truck.v < -0.05)){
    SND.beepT -= dt;
    if(SND.beepT <= 0){ backupBeep(); SND.beepT = 0.60; }
  }else SND.beepT = 0;
}

