/* ============================================================
   시업점검
   처음 배울 때는 전 항목에 결함을 심는다. 정상인 걸 본 적이 없으면
   무엇이 결함인지 알 수 없기 때문이다. 두 번째부터는 일부만 심는다.
   ============================================================ */
/* 법정 근거 — 산업안전보건기준에 관한 규칙 제35조 [별표 3] 9호
   지게차를 사용하여 작업을 하는 때
     가. 제동장치 및 조종장치 기능의 이상 유무
     나. 하역장치 및 유압장치 기능의 이상 유무
     다. 바퀴의 이상 유무
     라. 전조등·후미등·방향지시기 및 경보장치 기능의 이상 유무
   법정 항목은 이 네 가지뿐이고, 아래 항목은 그것을 실제로 볼 수 있는
   부위로 쪼갠 것이다. 법정 근거가 없는 항목은 넣지 않는다. */
const DEFECTS = [
  { k:'brake', n:'제동 페달', law:'별표3 9-가 · 제동장치',
    q:'브레이크 페달을 확인하세요',
    hint:'입식 리치트럭의 페달은 데드맨입니다. 밟아야 제동이 풀리고, 떼면 바로 섭니다. 밟았다 뗐을 때 곧바로 제동이 걸리는지 봅니다. 이 장비에는 안전벨트가 없습니다. 안전벨트는 좌식 카운터밸런스 지게차 점검 항목이고, 입식 리치는 이 페달과 운전실 구조가 그 역할을 합니다.',
    bad:'페달을 떼도 제동이 늦게 걸립니다. 데드맨이 제 역할을 못 하면 세우려 할 때 안 섭니다.',
    good:'떼는 즉시 제동이 걸립니다.',
    eff:'제동 거리가 길어집니다' },
  { k:'ctrl', n:'조종 레버', law:'별표3 9-가 · 조종장치',
    q:'조종 레버를 확인하세요',
    hint:'각 레버를 끝까지 밀었다 놓고 중립으로 곧바로 돌아오는지 봅니다. 걸리거나 뻑뻑한 느낌이 있는지도 봅니다.',
    bad:'레버가 중립으로 곧바로 돌아오지 않습니다. 손을 뗀 뒤에도 마스트가 계속 움직입니다.',
    good:'놓으면 곧바로 중립으로 돌아옵니다.',
    eff:'레버를 놓아도 곧바로 멈추지 않습니다' },
  { k:'fork', n:'포크', law:'별표3 9-나 · 하역장치',
    q:'포크 상태를 확인하세요',
    hint:'뿌리 쪽 용접부와 발끝을 봅니다. 균열, 휨, 좌우 높이 차이를 확인합니다.',
    bad:'뿌리 쪽에 균열이 있고 오른쪽 발이 아래로 휘었습니다. 이 상태로 짐을 들면 발이 부러집니다.',
    good:'좌우 높이가 같고 균열이 없습니다.',
    eff:'사고까지 가는 시간이 짧아집니다' },
  { k:'chain', n:'리프트 체인', law:'별표3 9-나 · 하역장치',
    q:'리프트 체인 상태를 확인하세요',
    hint:'좌우 체인의 장력이 같은지, 늘어지거나 녹슨 곳이 없는지 봅니다.',
    bad:'한쪽 체인이 늘어져 있습니다. 좌우 장력이 다르면 포크가 기울어진 채 올라갑니다.',
    good:'좌우 장력이 같고 늘어짐이 없습니다.',
    eff:'리프트가 느려집니다' },
  { k:'hose', n:'유압 호스', law:'별표3 9-나 · 유압장치',
    q:'유압 호스와 실린더를 확인하세요',
    hint:'호스 연결부와 실린더 로드에 기름이 배어 나오는지 봅니다. 바닥에 떨어진 자국도 함께 봅니다.',
    bad:'연결부에서 기름이 새고 바닥에 떨어져 있습니다. 누유가 있으면 압이 빠집니다.',
    good:'누유 흔적이 없습니다.',
    eff:'포크가 저절로 내려갑니다' },
  { k:'wheel', n:'로드휠', law:'별표3 9-다 · 바퀴',
    q:'앞다리 로드휠을 확인하세요',
    hint:'바퀴에 박힌 이물과 편마모를 봅니다. 우레탄이 찢어진 곳이 있는지도 봅니다.',
    bad:'이물이 박혀 있고 한쪽이 편마모되었습니다. 주행 중 진동이 오고 정렬이 틀어집니다.',
    good:'박힌 것이 없고 마모가 고릅니다.',
    eff:'최고 속도가 떨어집니다' },
  { k:'beep', n:'후진 경보', law:'별표3 9-라 · 경보장치',
    q:'후진 경보음이 울리는지 확인하세요',
    hint:'후진을 넣고 경보음이 나는지 듣습니다. 주변 소음에 묻히지 않는지도 봅니다.',
    bad:'후진을 넣어도 소리가 나지 않습니다. 뒤에 있는 사람이 알 방법이 없습니다.',
    good:'후진을 넣으면 경보음이 울립니다.',
    eff:'후진 경보가 울리지 않습니다' },
  { k:'horn', n:'경음기', law:'별표3 9-라 · 경보장치',
    q:'경음기가 울리는지 확인하세요',
    hint:'눌러서 소리가 나는지, 통로 끝까지 들릴 만한 크기인지 봅니다.',
    bad:'눌러도 소리가 나지 않습니다. 교차로에서 존재를 알릴 수단이 없습니다.',
    good:'누르면 소리가 납니다.',
    eff:'경음기가 울리지 않고 보행자가 비키지 않습니다' },
  { k:'light', n:'전조등 · 후미등', law:'별표3 9-라 · 등화장치',
    q:'전조등과 후미등을 확인하세요',
    hint:'켜서 둘 다 들어오는지, 렌즈가 깨지거나 흐려지지 않았는지 봅니다.',
    bad:'전조등 한쪽이 들어오지 않습니다. 어두운 통로에서 보행자가 늦게 알아챕니다.',
    good:'전조등과 후미등이 모두 들어옵니다.',
    eff:'보행자가 늦게 알아챕니다' }
];

function inspSvg(k, bad){
  const S = b => '<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">' + b + '</svg>';
  const D = '#5A6875', R = '#E03B36', OK = '#17A673';
  const tag = (t, c, x, y)=> '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + c + '">' + t + '</text>';

  if(k === 'brake'){
    return S(
      '<path d="M60 128 L240 128" stroke="#B9C2CC" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="96" y="' + (bad ? 74 : 60) + '" width="108" height="26" rx="8" fill="#8A96A2" stroke="' + D + '" stroke-width="2"' +
        (bad ? ' transform="rotate(6 150 87)"' : '') + '/>' +
      '<path d="M150 100 L150 128" stroke="' + D + '" stroke-width="6"/>' +
      (bad
        ? '<path d="M214 62 l22 0 M225 52 l0 22" stroke="' + R + '" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M62 62 q14 14 0 28" fill="none" stroke="' + R + '" stroke-width="3"/>' + tag('복귀 지연', R, 150, 30)
        : tag('즉시 복귀', OK, 150, 30)));
  }
  if(k === 'ctrl'){
    const lever = (x, off)=>
      '<rect x="' + (x-13) + '" y="34" width="26" height="84" rx="13" fill="#E1E8EF" stroke="' + D + '" stroke-width="2"/>' +
      '<rect x="' + (x-11) + '" y="' + (62 + off) + '" width="22" height="26" rx="10" fill="#3A4553"/>';
    return S(lever(78, 0) + lever(150, bad ? -26 : 0) + lever(222, 0) +
      (bad
        ? '<circle cx="150" cy="49" r="26" fill="none" stroke="' + R + '" stroke-width="2.5" stroke-dasharray="5 4"/>' + tag('중립 복귀 안 됨', R, 150, 142)
        : tag('모두 중립', OK, 150, 142)));
  }
  if(k === 'fork'){
    return S(
      '<rect x="34" y="26" width="18" height="104" rx="3" fill="#B9C2CC" stroke="' + D + '" stroke-width="2"/>' +
      '<rect x="52" y="44" width="150" height="12" rx="2" fill="#CBD5DE" stroke="' + D + '" stroke-width="2"/>' +
      '<rect x="52" y="' + (bad ? 104 : 98) + '" width="150" height="12" rx="2" fill="#CBD5DE" stroke="' + D + '" stroke-width="2"' +
        (bad ? ' transform="rotate(7 52 110)"' : '') + '/>' +
      (bad
        ? '<path d="M56 98 l7 6 l-6 5 l8 5" fill="none" stroke="' + R + '" stroke-width="3"/>' +
          '<circle cx="60" cy="106" r="17" fill="none" stroke="' + R + '" stroke-width="2.5" stroke-dasharray="5 4"/>' + tag('균열 · 휨', R, 246, 112)
        : tag('정상', OK, 246, 112)));
  }
  if(k === 'chain'){
    const links = (x, slack)=>{
      let o = '';
      for(let i=0;i<9;i++){
        const y = 20 + i*13, dx = slack ? Math.sin(i*0.8)*7 : 0;
        o += '<rect x="' + (x-6+dx) + '" y="' + y + '" width="12" height="10" rx="4" fill="none" stroke="' + D + '" stroke-width="2.4"/>';
      }
      return o;
    };
    return S('<rect x="20" y="10" width="10" height="130" fill="#CBD5DE"/>' +
      '<rect x="270" y="10" width="10" height="130" fill="#CBD5DE"/>' +
      links(105, false) + links(195, bad) +
      (bad
        ? '<circle cx="195" cy="76" r="30" fill="none" stroke="' + R + '" stroke-width="2.5" stroke-dasharray="5 4"/>' + tag('한쪽 늘어짐', R, 150, 146)
        : tag('장력 같음', OK, 150, 146)));
  }
  if(k === 'hose'){
    return S(
      '<rect x="150" y="14" width="34" height="96" rx="6" fill="#B9C2CC" stroke="' + D + '" stroke-width="2"/>' +
      '<path d="M150 60 C110 60 90 88 60 92" fill="none" stroke="' + D + '" stroke-width="7" stroke-linecap="round"/>' +
      '<rect x="140" y="52" width="16" height="16" rx="3" fill="#8A96A2"/>' +
      (bad
        ? '<path d="M148 68 q3 10 0 16 q-3 -6 0 -16" fill="' + R + '"/>' +
          '<ellipse cx="148" cy="126" rx="26" ry="6" fill="' + R + '" opacity="0.45"/>' + tag('연결부 누유', R, 150, 146)
        : tag('누유 없음', OK, 150, 146)));
  }
  if(k === 'wheel'){
    return S(
      '<circle cx="150" cy="72" r="50" fill="#3A4553"/>' +
      '<circle cx="150" cy="72" r="' + (bad ? 47 : 50) + '" fill="none" stroke="' + D + '" stroke-width="3"/>' +
      '<circle cx="150" cy="72" r="20" fill="#B9C2CC" stroke="' + D + '" stroke-width="2"/>' +
      (bad
        ? '<path d="M150 22 a50 50 0 0 1 34 13 l-34 37 z" fill="#4A5563"/>' +
          '<path d="M186 96 l12 9 l-9 5 z" fill="' + R + '"/>' +
          '<circle cx="188" cy="100" r="16" fill="none" stroke="' + R + '" stroke-width="2.5" stroke-dasharray="5 4"/>' + tag('이물 · 편마모', R, 150, 142)
        : tag('정상', OK, 150, 142)));
  }
  if(k === 'beep' || k === 'horn'){
    return S(
      '<rect x="66" y="46" width="34" height="52" rx="5" fill="#B9C2CC" stroke="' + D + '" stroke-width="2"/>' +
      '<path d="M100 52 l30 -22 v112 l-30 -22 z" fill="#8A96A2" stroke="' + D + '" stroke-width="2"/>' +
      (!bad
        ? '<path d="M148 52 a30 30 0 0 1 0 40" fill="none" stroke="' + OK + '" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M164 38 a52 52 0 0 1 0 68" fill="none" stroke="' + OK + '" stroke-width="4" stroke-linecap="round"/>' + tag('소리 남', OK, 224, 80)
        : '<path d="M152 46 l52 52 M204 46 l-52 52" stroke="' + R + '" stroke-width="5" stroke-linecap="round"/>' +
          tag(k === 'beep' ? '경보음 없음' : '경음기 안 울림', R, 178, 132)));
  }
  {
    const lamp = (x, on)=>
      '<circle cx="' + x + '" cy="72" r="24" fill="' + (on ? '#F7E7A8' : '#9AA5AE') + '" stroke="' + D + '" stroke-width="2"/>' +
      (on ? '<path d="M' + (x+28) + ' 60 l22 -8 M' + (x+28) + ' 72 l24 0 M' + (x+28) + ' 84 l22 8" stroke="#E8C64A" stroke-width="3" stroke-linecap="round"/>' : '');
    return S('<rect x="30" y="34" width="240" height="76" rx="10" fill="#E5CE86" stroke="#A98F3C" stroke-width="2"/>' +
      lamp(84, !bad) + lamp(196, true) +
      (bad
        ? '<circle cx="84" cy="72" r="32" fill="none" stroke="' + R + '" stroke-width="2.5" stroke-dasharray="5 4"/>' + tag('한쪽 불량', R, 150, 140)
        : tag('모두 점등', OK, 150, 140)));
  }
}

const INSP = { i:0, answered:false, correct:false, bad:[], miss:0, hit:0 };

function inspStart(firstTime){
  INSP.i = 0; INSP.answered = false; INSP.miss = 0; INSP.hit = 0;
  INSP.bad = DEFECTS.map(()=> true);
  if(!firstTime){
    // 두 번째부터는 일부만 심는다
    INSP.bad = DEFECTS.map(()=> false);
    const n = 1 + Math.floor(Math.random()*3);
    const idx = DEFECTS.map((_,i)=>i).sort(()=> Math.random()-0.5).slice(0, n);
    for(const i of idx) INSP.bad[i] = true;
  }
  G.defects = {}; G.defectSeen = {};
  showSheet(inspSheet());
}

function inspSheet(){
  const d = DEFECTS[INSP.i];
  const bad = INSP.bad[INSP.i];
  let fb = '', btns;
  if(INSP.answered){
    fb = '<div class="fb ' + (INSP.correct ? 'ok' : 'ng') + '">' +
      (INSP.correct ? '맞습니다. ' : '틀렸습니다. ') + (bad ? d.bad : d.good) +
      (!INSP.correct && bad ? ' 이대로 두면 ' + d.eff + '.' : '') + '</div>';
    btns = '<button class="btn primary" data-act="inspNext">' +
      (INSP.i + 1 >= DEFECTS.length ? '점검 마치기' : '다음 항목') + '</button>';
  }else{
    fb = '<div class="fb">&nbsp;</div>';
    btns = '<button class="btn" data-act="inspGood">정상</button>' +
           '<button class="btn" data-act="inspBad">결함</button>';
  }
  return '<div class="insp">' +
    '<div class="prog">시업점검 ' + (INSP.i+1) + ' / ' + DEFECTS.length + ' · ' + d.law + '</div>' +
    '<h1>' + d.n + '</h1>' +
    '<div class="fig">' + inspSvg(d.k, bad) + '</div>' +
    '<div class="q">' + d.q + '</div>' +
    '<div class="hint">' + d.hint + '</div>' + fb +
    '<div class="row">' + btns + '</div></div>';
}

function inspAnswer(sayBad){
  if(INSP.answered) return;
  const bad = INSP.bad[INSP.i];
  INSP.correct = (sayBad === bad);
  INSP.answered = true;
  if(INSP.correct){ INSP.hit++; blip(760, 0.12, 'triangle', 0.05); }
  else{
    if(bad){ INSP.miss++; G.defects[DEFECTS[INSP.i].k] = true; }
    thud(0.25);
  }
  showSheet(inspSheet());
}

function inspNext(){
  INSP.i++;
  INSP.answered = false;
  if(INSP.i >= DEFECTS.length){ inspDone(); return; }
  showSheet(inspSheet());
}

function inspDone(){
  const found = DEFECTS.filter((d, i)=> INSP.bad[i] && !G.defects[d.k]);
  const rows = DEFECTS.map((d, i)=>{
    const bad = INSP.bad[i];
    const missed = !!G.defects[d.k];
    return '<li class="' + (missed ? 'ng' : 'ok') + '"><span>' + d.n + '</span>' +
      '<span class="r">' + (missed ? '못 찾음' : (bad ? '찾음' : '정상')) + '</span></li>';
  }).join('');
  const head = INSP.miss === 0
    ? '<h1>점검 완료</h1><div class="sub">결함을 모두 찾았습니다</div>'
    : '<h1>점검 완료</h1><div class="sub">못 찾은 결함이 ' + INSP.miss + '건 있습니다. 그대로 운행합니다</div>';
  const fix = found.length
    ? '<div class="sub">찾아낸 결함 ' + found.length + '건은 정비 요청을 해야 운행할 수 있습니다. ' +
      '결함을 알고도 그대로 운행하는 것은 그 자체가 위반입니다.</div>' +
      '<div class="row"><button class="btn primary" data-act="inspFix">정비 요청 후 운행</button></div>'
    : '<div class="row"><button class="btn primary" data-act="eduDrive">운행 시작</button></div>';
  showSheet(head + '<ul class="chk">' + rows + '</ul>' +
    '<div class="sub">근거는 산업안전보건기준에 관한 규칙 별표 3 제9호입니다. ' +
    '제동·조종장치, 하역·유압장치, 바퀴, 전조등·후미등·방향지시기·경보장치 네 가지이고, ' +
    '위 항목은 그것을 실제로 볼 수 있는 부위로 쪼갠 것입니다.</div>' + fix);
}

/* 찾아낸 결함은 정비 요청을 거쳐야 없어진다 */
function inspFix(){
  const n = DEFECTS.filter((d, i)=> INSP.bad[i] && !G.defects[d.k]).length;
  showSheet('<h1>정비 요청</h1>' +
    '<div class="sub">결함 ' + n + '건을 정비 요청했습니다. 수리를 마친 장비로 운행합니다.</div>' +
    '<ul><li>결함을 발견하면 운행하지 않고 <b>정비를 요청</b>합니다</li>' +
    '<li>수리 전까지는 그 장비를 쓰지 않습니다</li>' +
    '<li>못 찾고 지나친 결함은 그대로 남아 운행 중에 드러납니다</li></ul>' +
    '<div class="row"><button class="btn primary" data-act="eduDrive">운행 시작</button></div>');
  blip(760, 0.13, 'triangle', 0.05);
}

