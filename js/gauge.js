/* ============================================================
   계기판 · 정렬 게이지
   ============================================================ */
function drawInstruments(){
  const dg = v => (Math.round(Math.abs(v)*180/Math.PI*10)/10).toFixed(1);
  const gl = document.getElementById('gLift');
  gl.textContent = truck.lift.toFixed(2);
  gl.className = 'v' + (truck.lift > CFG.liftSafe ? ' bad' : '');
  const gr = document.getElementById('gReach');
  gr.textContent = String(Math.round(truck.reach*100));
  gr.className = 'v' + (truck.reach > CFG.reachOut ? ' blue' : '');
  const fa = forkAngle();
  const gt = document.getElementById('gTilt');
  const shake = Math.abs(G.sway) > 0.012 ? ' ~' : '';
  if(fa < -0.005){ gt.textContent = '전경 ' + dg(fa) + '°' + shake; gt.className = 'v bad'; }
  else if(fa >= CFG.keepTilt){ gt.textContent = '후경 ' + dg(fa) + '°' + shake; gt.className = 'v ok'; }
  else { gt.textContent = '수평 ' + dg(fa) + '°' + shake; gt.className = 'v blue'; }

  const gld = document.getElementById('gLoad');
  if(truck.carry){
    const w = truck.carry.w || 0;
    const use = Math.round(w / Math.max(residualKg(truck.lift), 1) * 100);
    gld.textContent = w + '·' + use + '%';
    gld.className = 'v' + (use >= 100 ? ' bad' : (use >= 80 ? ' blue' : ' ok'));
  }else{
    gld.textContent = '없음';
    gld.className = 'v';
  }

  const kmh = Math.abs(truck.v) * 3.6;
  const gv = document.getElementById('gSpd');
  gv.textContent = kmh.toFixed(1);
  gv.className = 'v' + (truck.lift > CFG.liftSafe && kmh > 1.6 ? ' bad' : '');

  drawSteer(truck.steer * 180/Math.PI);
}

/* 조향 계기 — 실제 장비의 구동륜 방향 표시등과 같은 형태.
   반원보다 조금 넓은 호에 램프를 늘어놓고, 지금 향한 칸을 밝힌다. */
const steerCtx = document.getElementById('steerCv').getContext('2d');
const STEER_SEG = 13, STEER_ARC = 104;   // 편도 104° — 조향 최대 90° 보다 조금 넓게
function drawSteer(deg){
  /* 좌표계를 아크 크기에 맞춰 좁혔다. 예전에는 300 폭에 아크가 절반만 써서
     상자를 넓혀도 그림만 작게 그려졌다. */
  const W = 180, H = 112, cx = 90, cy = 104, r0 = 52, r1 = 76;
  const c = steerCtx;
  c.clearRect(0, 0, W, H);

  const active = Math.round(((deg + STEER_ARC) / (2*STEER_ARC)) * (STEER_SEG - 1));
  const mid = (STEER_SEG - 1) / 2;
  const neutral = Math.abs(deg) < 3;
  const hot = neutral ? '#17A673' : (deg < 0 ? '#D93025' : '#1A73E8');

  for(let i=0;i<STEER_SEG;i++){
    const t = i/(STEER_SEG-1);
    const a = (-STEER_ARC + t*2*STEER_ARC) * Math.PI/180;
    const sx = Math.sin(a), sy = -Math.cos(a);
    const between = (i >= Math.min(mid, active) && i <= Math.max(mid, active));
    let col = '#C7D0D9';
    if(i === active) col = hot;
    else if(between && !neutral) col = deg < 0 ? '#F0BDB9' : '#B9D2F5';
    else if(i === mid) col = '#9AA5AE';
    c.strokeStyle = col;
    c.lineWidth = (i === active) ? 13 : 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + sx*r0, cy + sy*r0);
    c.lineTo(cx + sx*r1, cy + sy*r1);
    c.stroke();
  }

  const a2 = deg * Math.PI/180;
  c.strokeStyle = hot; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx + Math.sin(a2)*(r0 - 12), cy - Math.cos(a2)*(r0 - 12));
  c.stroke();
  c.fillStyle = hot;
  c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.fill();

  c.strokeStyle = '#B9C2CC'; c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - 22, cy + 4); c.lineTo(cx - 22, cy - 22);
  c.moveTo(cx + 22, cy + 4); c.lineTo(cx + 22, cy - 22);
  c.stroke();

  const av = Math.abs(deg);
  c.fillStyle = hot;
  c.font = 'bold 22px ui-monospace, "Roboto Mono", monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(neutral ? '중립' : ((deg < 0 ? '좌 ' : '우 ') + Math.round(av) + '°'), cx, 52);
  c.font = 'bold 11px Pretendard, sans-serif';
  c.fillStyle = '#5A6875';
  c.fillText('구동륜 방향', cx, 72);
}

const gTop = document.getElementById('alignTop').getContext('2d');
const gSide = document.getElementById('alignSide').getContext('2d');
const PAL_FILL = '#D9B27A', PAL_EDGE = '#9E7C4A';
const OK_FILL = '#17A673', OK_EDGE = '#0E6B4B';
const NG_FILL = '#E03B36', NG_EDGE = '#A32723';

function drawGauge(){
  const lbl = document.getElementById('alignLbl');
  const lbl2 = document.getElementById('alignLbl2');
  const g = G.gauge;
  const shown = !!g || !!G.place;
  if(G.alignShown !== shown){
    G.alignShown = shown;
    document.getElementById('alignL').style.display = shown ? 'block' : 'none';
    document.getElementById('alignR').style.display = shown ? 'block' : 'none';
  }
  if(!shown) return;
  if(!g){ drawPlace(); return; }

  const okLat = Math.abs(g.lat) < CFG.tolLat;
  const okAng = Math.abs(g.ang) < CFG.tolAng;
  const okY = Math.abs(g.dy) < CFG.tolY;
  const okT = Math.abs(g.tilt) < CFG.tolTilt;
  const S = 84, FL = CFG.forkTip*S, half = CFG.palHalf*S;

  const cx = 109, cy = 60;
  gTop.clearRect(0,0,218,150);
  gTop.strokeStyle = '#DCE4EC'; gTop.lineWidth = 2;
  gTop.setLineDash([6,5]);
  gTop.beginPath(); gTop.moveTo(cx, 0); gTop.lineTo(cx, 150); gTop.stroke();
  gTop.setLineDash([]);
  gTop.fillStyle = PAL_FILL; gTop.strokeStyle = PAL_EDGE; gTop.lineWidth = 3;
  gTop.beginPath(); gTop.rect(cx-half, cy-half, half*2, half*2); gTop.fill(); gTop.stroke();
  gTop.fillStyle = '#FFFFFF';
  for(const hx of [-CFG.forkGap*S, CFG.forkGap*S]){
    gTop.beginPath(); gTop.rect(cx+hx-0.11*S, cy-half+2, 0.22*S, half*2-4);
    gTop.fill(); gTop.stroke();
  }

  /* 팔레트를 화면에 고정해두고 지겟발을 그린다.
     lat 과 ang 은 지게차 기준이라, 팔레트 중심을 축으로 돌려야 한다.
     화면은 운전자가 보는 대로 오른쪽이 차체 오른쪽이다. 팔레트가 왼쪽으로
     A 만큼 틀어져 있으면 팔레트를 세워 놓고 본 차체는 오른쪽으로 A 만큼
     틀어져 보인다. 예전에는 여기서 부호를 반대로 써서, 팔레트가 틀어질수록
     지겟발이 실제와 반대쪽으로 기운 채 그려졌다. */
  const A = g.ang;
  const lon = CFG.forkTip + CFG.palHalf - g.pen;
  const bx = cx + (g.lat*Math.cos(A) - lon*Math.sin(A))*S;
  const by = cy + (lon*Math.cos(A) + g.lat*Math.sin(A))*S;
  const posOk = okLat && okAng;
  gTop.save();
  gTop.translate(bx, by);
  gTop.rotate(A);
  gTop.fillStyle = posOk ? OK_FILL : NG_FILL;
  gTop.strokeStyle = posOk ? OK_EDGE : NG_EDGE;
  gTop.lineWidth = 2.5;
  for(const fx of [-CFG.forkGap*S, CFG.forkGap*S]){
    gTop.beginPath(); gTop.rect(fx-0.055*S, -FL, 0.11*S, FL);
    gTop.fill(); gTop.stroke();
  }
  gTop.restore();

  const SY = 300, ground = 78, nearX = 112;
  gSide.clearRect(0,0,218,92);
  gSide.strokeStyle = '#C7D0D9'; gSide.lineWidth = 2.5;
  gSide.beginPath(); gSide.moveTo(0, ground+0.75); gSide.lineTo(218, ground+0.75); gSide.stroke();
  const pTop = ground - CFG.palH*SY;
  gSide.fillStyle = PAL_FILL; gSide.strokeStyle = PAL_EDGE; gSide.lineWidth = 3;
  gSide.beginPath(); gSide.rect(nearX, pTop, CFG.palHalf*2*S, CFG.palH*SY); gSide.fill(); gSide.stroke();
  gSide.fillStyle = '#FFFFFF';
  gSide.beginPath(); gSide.rect(nearX+2, ground - 0.098*SY, CFG.palHalf*2*S-4, 0.076*SY);
  gSide.fill(); gSide.stroke();
  const fy = ground - (CFG.holeY + g.dy)*SY;
  const tipX = nearX + Math.min(g.pen, CFG.palHalf*2)*S;
  const hOk = okY && okT;
  gSide.save();
  gSide.translate(tipX - FL, fy);
  gSide.rotate(-g.tilt*1.8);
  gSide.fillStyle = hOk ? OK_FILL : NG_FILL;
  gSide.strokeStyle = hOk ? OK_EDGE : NG_EDGE;
  gSide.lineWidth = 2.5;
  gSide.beginPath(); gSide.rect(0, -5, FL, 10); gSide.fill(); gSide.stroke();
  gSide.restore();

  const cm = Math.round(g.dy*100);
  const allOk = okLat && okAng && okY && okT;
  const st = g.state;
  const showAdh = g.sticky && (G.adhShow !== false);
  const tw = Math.round((g.twist || 0)*180/Math.PI);
  lbl.textContent =
      st === 'over' ? '파렛트 위로 지나갑니다'
    : st === 'under' ? '파렛트 밑으로 지나갑니다 · 포크를 올리세요'
    : st === 'poke' ? '화물을 찌릅니다 · 포크를 내리세요'
    : st === 'side' ? '막힌 면 · 열린 면으로 돌아가세요'
    : st === 'lip' ? '하판 턱 · 포크를 올리세요 ' + (cm >= 0 ? '+' : '') + cm + 'cm'
    : st === 'deck' ? '상판 · 포크를 내리세요 ' + (cm >= 0 ? '+' : '') + cm + 'cm'
    : !okT ? '마스트 수평 아님 · ' + (Math.round(Math.abs(g.tilt)*180/Math.PI*10)/10).toFixed(1) + '°'
    : st === 'align' ? '밀어서 정렬됩니다'
    : st === 'block' ? (!okAng ? '각도 ' + Math.round(Math.abs(g.ang)*180/Math.PI) + '° · 블록을 밉니다' : '좌우 ' + Math.round(g.lat*100) + 'cm · 블록을 밉니다')
    : g.inserted && showAdh && !g.peeled ? '랩 붙음 · 핸들을 살짝 틀어 떼세요 ' + tw + '°'
    : g.inserted && g.pen >= 0.85 ? '들어올리세요'
    : g.inserted && g.pen >= 0.50 ? '반삽입 · 더 넣으세요'
    : g.room > 0.03 ? '리치를 더 내미세요 · ' + Math.round(g.reach*100) + 'cm'
    : '차체를 더 붙이세요';
  lbl.className = 'lbl ' + ((st === 'in' && okT && !(showAdh && !g.peeled && g.inserted)) ? 'ok' : 'bad');
  lbl2.textContent = (g.stack ? '겹침 ' + (g.band === 1 ? '위층' : '아래층') + ' · ' : '') + '높이 ' + (cm >= 0 ? '+' : '') + cm + 'cm' + (showAdh ? ' · 붙음' : '');
  lbl2.className = 'lbl2 ' + (st === 'in' && okT ? 'ok' : 'bad');
}

/* 랙·평치에 내려놓을 때의 게이지.
   화면 가운데가 내가 든 팔레트이고, 점선이 놓일 자리다. */
function drawPlace(){
  const q = G.place;
  const lbl = document.getElementById('alignLbl');
  const lbl2 = document.getElementById('alignLbl2');
  const S = 84, half = CFG.palHalf*S, slotHalf = 0.60*S;
  const cx = 109, cy = 66;

  const off = Math.hypot(q.lat, q.lon);
  const okXZ = off <= CFG.putTolXZ;
  const okAng = Math.abs(q.ang) <= CFG.putTolAng;
  const okTilt = !q.rack || Math.abs(q.tilt) <= CFG.putTilt;
  const okDown = q.dy >= -0.02;

  /* ── 위에서 본 모습 ── */
  gTop.clearRect(0,0,218,150);
  gTop.strokeStyle = '#DCE4EC'; gTop.lineWidth = 2;
  gTop.setLineDash([6,5]);
  gTop.beginPath(); gTop.moveTo(cx, 0); gTop.lineTo(cx, 150); gTop.stroke();
  gTop.setLineDash([]);

  // 놓일 자리
  const tx = cx + q.lat*S, ty = cy + q.lon*S;
  const okPos = okXZ && okAng;
  gTop.save();
  gTop.translate(tx, ty);
  gTop.rotate(-q.ang);
  gTop.strokeStyle = okPos ? OK_EDGE : NG_EDGE;
  gTop.fillStyle = okPos ? 'rgba(23,166,115,.16)' : 'rgba(224,59,54,.14)';
  gTop.lineWidth = 3.5;
  gTop.setLineDash([9,6]);
  gTop.beginPath(); gTop.rect(-slotHalf, -slotHalf, slotHalf*2, slotHalf*2);
  gTop.fill(); gTop.stroke();
  gTop.setLineDash([]);
  gTop.restore();

  // 내가 든 팔레트
  gTop.fillStyle = PAL_FILL; gTop.strokeStyle = PAL_EDGE; gTop.lineWidth = 3;
  gTop.beginPath(); gTop.rect(cx-half, cy-half, half*2, half*2); gTop.fill(); gTop.stroke();
  gTop.fillStyle = '#FFFFFF';
  for(const hx of [-CFG.forkGap*S, CFG.forkGap*S]){
    gTop.beginPath(); gTop.rect(cx+hx-0.11*S, cy-half+2, 0.22*S, half*2-4);
    gTop.fill(); gTop.stroke();
  }

  // 편차 화살표
  if(off > 0.03){
    gTop.strokeStyle = okXZ ? OK_FILL : NG_FILL; gTop.lineWidth = 2;
    gTop.beginPath(); gTop.moveTo(cx, cy); gTop.lineTo(tx, ty); gTop.stroke();
  }
  gTop.fillStyle = '#5A6875';
  gTop.font = 'bold 11px ui-monospace, monospace';
  gTop.textAlign = 'left';
  gTop.fillText('편차 ' + Math.round(off*100) + 'cm', 5, 13);
  gTop.fillText('각도 ' + Math.round(Math.abs(q.ang)*180/Math.PI) + '°', 5, 27);

  /* ── 옆에서 본 모습 ── */
  const SY = 150, base = 74, x0 = 34;
  gSide.clearRect(0,0,218,92);

  // 놓일 면 (랙 단 또는 바닥)
  gSide.fillStyle = q.rack ? '#2A5FA6' : '#C7D0D9';
  gSide.fillRect(x0 - 12, base, 172, q.rack ? 10 : 6);
  gSide.fillStyle = '#5A6875';
  gSide.font = 'bold 11px ui-monospace, monospace';
  gSide.textAlign = 'left';
  gSide.fillText(q.rack ? '랙 단' : '바닥', 5, 88);

  // 내 팔레트 — 마스트 기울기만큼 기운다
  const py = base - Math.max(q.dy, -0.05)*SY;
  gSide.save();
  gSide.translate(x0 + 74, py);
  gSide.rotate(-q.tilt*1.8);
  gSide.fillStyle = PAL_FILL;
  gSide.strokeStyle = okTilt ? PAL_EDGE : NG_EDGE;
  gSide.lineWidth = okTilt ? 2 : 3;
  gSide.beginPath(); gSide.rect(-74, -CFG.palH*SY, 148, CFG.palH*SY);
  gSide.fill(); gSide.stroke();
  gSide.restore();

  // 여유 높이
  const hOk = okDown && q.dy < 0.35;
  gSide.strokeStyle = hOk ? OK_FILL : (okDown ? '#1A73E8' : NG_FILL);
  gSide.lineWidth = 2;
  gSide.beginPath();
  gSide.moveTo(x0 + 168, base); gSide.lineTo(x0 + 168, py);
  gSide.stroke();
  gSide.fillStyle = hOk ? OK_EDGE : (okDown ? '#0F4A9C' : NG_EDGE);
  gSide.textAlign = 'right';
  gSide.fillText((q.dy >= 0 ? '+' : '') + Math.round(q.dy*100) + 'cm', 214, base - 6);

  if(q.surf){
    const gap = q.gap, wall = q.wall;
    const tight = gap != null && gap <= 0.05 && gap >= -0.01;
    lbl.textContent =
      !okTilt ? '마스트를 수평으로'
      : !okDown ? '바닥보다 낮습니다 · 더 올리세요'
      : gap != null && gap < -0.01 ? '앞 파렛트와 겹칩니다 · ' + Math.round(-gap*100) + 'cm'
      : gap != null ? '앞 파렛트 간격 ' + Math.round(gap*1000) + 'mm' + (tight ? ' · 밀착' : '')
      : (wall != null ? '벽까지 ' + Math.round(wall*100) + 'cm' : '내려놓기 가능');
    lbl.className = 'lbl ' + ((okTilt && okDown && (gap == null || tight)) ? 'ok' : 'bad');
    lbl2.textContent = (q.id === 'bed' ? '적재함' : '엘베') + ' · 여유 ' + (q.dy >= 0 ? '+' : '') + Math.round(q.dy*100) + 'cm' + (wall != null ? ' · 벽 ' + Math.round(wall*100) + 'cm' : '');
    lbl2.className = 'lbl2 ' + (okDown && okTilt ? 'ok' : 'bad');
    return;
  }
  lbl.textContent =
    !okTilt ? '마스트를 수평으로'
    : q.fit === false ? '화물 높이 초과 · 이 단에는 안 들어갑니다'
    : !okDown ? '단보다 낮습니다 · 더 올리세요'
    : !okXZ ? '위치 이탈 · ' + Math.round(off*100) + 'cm'
    : !okAng ? '각도 틀어짐'
    : (q.dy > 0.35 ? '자리 맞음 · ' + Math.round(q.dy*100) + 'cm 더 내리세요' : (off <= 0.03 ? '정중앙 · 내려놓기' : '내려놓기 가능 · 편차 ' + Math.round(off*100) + 'cm'));
  lbl.className = 'lbl ' + ((okTilt && okDown && okXZ && okAng && q.fit !== false) ? 'ok' : 'bad');
  lbl2.textContent = (q.base ? '얹기 · ' : '') + '여유 ' + (q.dy >= 0 ? '+' : '') + Math.round(q.dy*100) + 'cm' + (q.clear && isFinite(q.clear) ? ' · 단 높이 ' + Math.round(q.clear*100) + 'cm' : '');
  lbl2.className = 'lbl2 ' + (okDown && okTilt && q.fit !== false ? 'ok' : 'bad');
}

