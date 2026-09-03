/* ============================================================
   충전
   ============================================================ */
const CH = { open:false, battPlug:'truck', chargerPlug:'none', pct:0, charged:false, mistake:false, msg:'', tone:'' };

function chargeChecks(){
  return [
    { t:'충전 구역 안 정차', ok: Math.hypot(truck.x-CHARGE.x, truck.z-CHARGE.z) < 2.2 && Math.abs(truck.v) < 0.06 },
    { t:'브레이크 페달 뗌',  ok: !G.pedal },
    { t:'포크 완전 하강',    ok: truck.lift < 0.05 },
    { t:'리치 완전 인',      ok: truck.reach < 0.05 }
  ];
}
function updateChargePanel(){
  const el = document.getElementById('chargeBox');
  const nearby = Math.hypot(truck.x-CHARGE.x, truck.z-CHARGE.z) < 4.5;
  const show = nearby && !CH.open && G.running && G.mode !== 'drill';
  // 충전 점검 중에는 다른 지시가 필요 없다
  document.getElementById('taskTitle').style.display = show ? 'none' : '';
  document.getElementById('taskDesc').style.display = show ? 'none' : '';
  document.getElementById('roam').style.display =
    (G.mode === 'roam' && !show) ? 'block' : 'none';
  if(!show){ el.style.display = 'none'; return; }
  document.getElementById('taskEyebrow').textContent = '충전';
  el.style.display = 'block';
  const cs = chargeChecks();
  document.getElementById('chargeChk').innerHTML =
    cs.map(c=> '<li class="' + (c.ok?'':'no') + '">' + c.t + '</li>').join('');
  document.getElementById('chargeStart').disabled = !cs.every(c=>c.ok);
}

const CHP = { truckSock:{x:150,y:124}, battFree:{x:218,y:150}, chgFree:{x:250,y:58} };
function chargeSvg(){
  const bp = CH.battPlug === 'truck' ? CHP.truckSock : CHP.battFree;
  let cp = CHP.chgFree;
  if(CH.chargerPlug === 'battery') cp = { x:CHP.battFree.x - 30, y:CHP.battFree.y };
  if(CH.chargerPlug === 'truck')   cp = { x:CHP.truckSock.x, y:CHP.truckSock.y };
  const choosing = CH.battPlug === 'free' && CH.chargerPlug === 'none';
  return '<svg viewBox="0 0 420 240" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="18" y="70" width="122" height="112" rx="10" fill="#E5CE86" stroke="#A98F3C" stroke-width="2"/>' +
    '<text x="79" y="132" text-anchor="middle" font-size="15" font-weight="700" fill="#4A4322">지게차</text>' +
    '<rect x="138" y="110" width="16" height="28" rx="3" fill="#2E3742"/>' +
    '<text x="146" y="102" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5A6875">몸통 커넥터</text>' +
    '<rect x="284" y="140" width="118" height="76" rx="8" fill="#B9C2CC" stroke="#7C8792" stroke-width="2"/>' +
    '<text x="343" y="184" text-anchor="middle" font-size="15" font-weight="700" fill="#2E3742">배터리</text>' +
    '<rect x="284" y="18" width="118" height="66" rx="8" fill="#D8DFE6" stroke="#8A96A2" stroke-width="2"/>' +
    '<text x="343" y="57" text-anchor="middle" font-size="15" font-weight="700" fill="#2E3742">충전기</text>' +
    '<path d="M284 166 Q' + ((284+bp.x)/2) + ' ' + (bp.y+34) + ' ' + (bp.x+16) + ' ' + bp.y + '" ' +
      'fill="none" stroke="#5A6875" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="' + (bp.x-2) + '" y="' + (bp.y-13) + '" width="18" height="26" rx="4" fill="#D93025"/>' +
    (CH.battPlug==='free'
      ? '<text x="' + (bp.x+7) + '" y="' + (bp.y+30) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5A6875">배터리 꼬다리</text>' : '') +
    '<path d="M284 50 Q' + ((284+cp.x)/2) + ' ' + (cp.y-32) + ' ' + (cp.x+16) + ' ' + cp.y + '" ' +
      'fill="none" stroke="#2A5FA6" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="' + (cp.x-2) + '" y="' + (cp.y-13) + '" width="18" height="26" rx="4" fill="#1A73E8"/>' +
    (choosing
      ? '<circle cx="146" cy="124" r="26" fill="none" stroke="#17A673" stroke-width="2.5" stroke-dasharray="5 4"/>' +
        '<circle cx="' + (CHP.battFree.x+7) + '" cy="' + CHP.battFree.y + '" r="26" fill="none" stroke="#17A673" stroke-width="2.5" stroke-dasharray="5 4"/>' +
        '<rect class="hs" data-act="plugTruck" x="118" y="96" width="58" height="58" fill="transparent"/>' +
        '<rect class="hs" data-act="plugBatt" x="' + (CHP.battFree.x-22) + '" y="' + (CHP.battFree.y-29) + '" width="58" height="58" fill="transparent"/>'
      : '') + '</svg>';
}
function chargeSheet(){
  const cs = CH;
  let actions = '';
  if(cs.battPlug === 'truck' && cs.chargerPlug === 'none' && !cs.charged)
    actions = '<button class="btn primary" data-act="unplugBatt">배터리 커넥터 분리</button>';
  else if(cs.chargerPlug === 'truck')
    actions = '<button class="btn primary" data-act="unplugCharger">충전기 플러그 분리</button>';
  else if(cs.chargerPlug === 'battery')
    actions = '<button class="btn" data-act="unplugCharger">' + (cs.pct >= 100 ? '충전기 플러그 분리' : '충전 중단하고 분리') + '</button>';
  else if(cs.battPlug === 'free')
    actions = cs.charged ? '<button class="btn primary" data-act="plugBattBack">배터리 커넥터를 몸통에 연결</button>' : '';
  else if(cs.charged)
    actions = '<button class="btn primary" data-act="done">완료</button>';
  return '<div class="chg"><h1>충전 절차</h1>' +
    '<div class="sub">배터리 커넥터를 몸통에서 뽑고, 충전기 플러그를 배터리 꼬다리에 연결합니다.</div>' +
    chargeSvg() +
    '<div class="bar"><i id="chgBar" style="width:' + cs.pct.toFixed(0) + '%"></i></div>' +
    '<div class="pct" id="chgPct">잔량 ' + cs.pct.toFixed(0) + '%</div>' +
    '<div class="msg ' + cs.tone + '" id="chgMsg">' + (cs.msg || '&nbsp;') + '</div>' +
    '<div class="row">' + actions + '<button class="btn" data-act="exit">나가기</button></div></div>';
}
function chargeAct(act){
  if(act === 'unplugBatt'){ CH.battPlug = 'free'; CH.msg = '충전기 플러그를 꽂을 곳을 고르세요.'; CH.tone = ''; }
  else if(act === 'plugBatt'){ CH.chargerPlug = 'battery'; CH.msg = '충전이 시작되었습니다.'; CH.tone = 'ok'; }
  else if(act === 'plugTruck'){
    CH.chargerPlug = 'truck';
    CH.msg = '몸통 커넥터에 꽂으면 충전되지 않습니다. 배터리에서 나온 꼬다리에 꽂아야 합니다.';
    CH.tone = 'ng';
    if(!CH.mistake){ CH.mistake = true; G.fault += 1; }
  }
  else if(act === 'unplugCharger'){
    CH.chargerPlug = 'none';
    CH.msg = CH.charged ? '배터리 커넥터를 몸통에 다시 연결하세요.' : ''; CH.tone = '';
  }
  else if(act === 'plugBattBack'){ CH.battPlug = 'truck'; CH.msg = '연결 완료.'; CH.tone = 'ok'; }
  else if(act === 'done' || act === 'exit'){ closeCharge(act === 'done'); return; }
  showSheet(chargeSheet(), true);
}
function openCharge(){
  CH.open = true; CH.battPlug = 'truck'; CH.chargerPlug = 'none';
  CH.pct = G.batt; CH.charged = false; CH.mistake = false;
  CH.msg = '배터리 커넥터부터 분리하세요.'; CH.tone = '';
  G.running = false;
  document.getElementById('chargeBox').style.display = 'none';
  showSheet(chargeSheet(), true);
}
function closeCharge(done){
  CH.open = false;
  G.batt = CH.pct;
  if(G.batt > 5) G.battDead = false;
  hideSheet();
  if(G.mode === 'work' && G.chargeStep && done){
    targetRing.visible = false; targetPost.visible = false;
    finish();
  }else{
    if(done && G.mode === 'edu') G.flags.charged = true;
    G.running = true;
  }
}
function tickCharge(dt){
  if(!CH.open || CH.chargerPlug !== 'battery') return;
  if(CH.pct >= 100) return;
  CH.pct = Math.min(100, CH.pct + 9*dt);
  const bar = document.getElementById('chgBar'), pct = document.getElementById('chgPct');
  if(bar) bar.style.width = CH.pct.toFixed(0) + '%';
  if(pct) pct.textContent = '잔량 ' + CH.pct.toFixed(0) + '%';
  if(CH.pct >= 100 && !CH.charged){
    CH.charged = true;
    blip(880, 0.16, 'sine', 0.06);
    setTimeout(()=> blip(1320, 0.22, 'sine', 0.05), 150);
    CH.msg = '충전 완료. 충전기 플러그를 분리하세요.'; CH.tone = 'ok';
    showSheet(chargeSheet(), true);
  }
}

