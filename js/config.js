"use strict";

/* ============================================================
   설정값
   ============================================================ */
const CFG = {
  wheelBase: 1.72, mastBase: 0.55, reachMax: 1.40, forkTip: 1.20, forkGap: 0.28,
  liftMax: 3.60, liftSpeed: 0.95, reachSpeed: 0.70, tiltSpeed: 0.10,
  tiltBack: 0.175, tiltFwd: 0.087,
  tolTilt: 0.055, putTilt: 0.105, keepTilt: 0.087,
  accel: 2.30, brake: 3.60, coast: 2.40, maxFwd: 2.20, maxRev: 1.70,
  steerMax: Math.PI/2, wheelMax: Math.PI*7,
  wheelRate0: 5.0, wheelRate1: 16.0, wheelRamp: 0.7,
  thrRise: 0.55, thrFall: 0.25,
  reachOut: 0.30,
  legTip: 1.85,             // 차체 중심에서 앞다리 끝까지. 이 안으로는 팔레트가 못 들어온다
  overHead:  0.30,          // 구멍보다 이만큼 높으면 팔레트 위를 지나간다
  underFoot: 0.10,          // 구멍보다 이만큼 낮으면 팔레트 밑으로 지나간다
  pickBand:  0.75,          // 이보다 높이가 어긋난 팔레트는 아예 상대가 아니다
  rackFace:  0.555,         // 랙 기둥 앞면. 차체는 여기까지만 들어간다
  scrapeLift: 0.045, liftSafe: 0.60, liftTip: 2.00, pickClear: 0.12,
  palHalf: 0.55, palH: 0.15, holeY: 0.050,
  tolY: 0.055, tolLat: 0.120, tolAng: 8*Math.PI/180,
  nudgeAng: 25*Math.PI/180, nudgeLat: 0.30,
  putTolXZ: 0.45, putTolAng: 16*Math.PI/180
};

/* 랙에 닿는지 볼 때 쓰는 차체 모서리. [앞뒤, 좌우] 단위 m.
   마스트와 지겟발은 랙 안으로 들어가야 하므로 넣지 않는다. */
const BODY_PTS = [
  [ CFG.legTip,  0.48], [ CFG.legTip, -0.48],
  [ 0.95,  0.55], [ 0.95, -0.55],
  [-0.60,  0.55], [-0.60, -0.55]
];

const LEVER_ORDER = ['lift', 'tilt', 'reach'];
const LEVER_META = {
  lift:  { name:'리프트', up:'하강', down:'상승', keys:'R F' },
  tilt:  { name:'틸트',   up:'전경', down:'후경', keys:'T G' },
  reach: { name:'리치',   up:'아웃', down:'인',   keys:'E Q' }
};

/* ── 맵 ─────────────────────────────────────
   실내 x −40~40, z −6~86.  북쪽 벽에 도크 셔터 3개.
   셔터 밖으로 야드와 도로가 이어진다.                */
const LEVEL_Y = [0.00, 1.65, 3.10];   // 1단 여유 1.55, 2단 여유 1.35 — 잡화(1.85)는 3단만
const RACK_ROWS = [
  { id:'A1', z:-2.15, face:+1, x0:-13.5, n:11 },
  { id:'A2', z: 16.0, face:-1, x0:-32.4, n:25 },
  { id:'A3', z: 17.2, face:+1, x0:-32.4, n:25 },
  { id:'A4', z: 25.0, face:-1, x0:-32.4, n:25 },
  { id:'A5', z: 26.2, face:+1, x0:-32.4, n:25 },
  { id:'A6', z: 34.0, face:-1, x0:-32.4, n:25 },
  { id:'A7', z: 35.2, face:+1, x0:-32.4, n:25 }
];
const ZONE_GROUPS = [
  { id:'C1', rows:[ {z:4.60, xs:[-9,-5,-1,3,7]}, {z:9.20, xs:[-9,-5,-1,3,7]} ] },
  { id:'C2', rows:[ {z:46.0, xs:[-21,-15,-9,-3,3,9,15,21]},
                    {z:50.0, xs:[-21,-15,-9,-3,3,9,15,21]},
                    {z:54.0, xs:[-21,-15,-9,-3,3,9,15,21]} ] }
];
const GATES = [-18, 0, 18];          // 도크 셔터 x 위치
const WALL_Z = 87.0;                 // 북쪽 벽
const IN = { x:41.0, z0:-5.5, z1:85.5 };
const OUT = { x:110.0, z1:124.0 };
const LOOP = { x0:-125, x1:125, z0:90, z1:152 };   // 드라이브 모드 순환 도로 바깥 경계
const ROAD = { z0:108, z1:124, lane:[112.5, 119.5] };
const CHARGE = { x:30.0, z:8.0 };
/* 연습장 — 본 통로와 떨어진 빈 구역 */
const YARD = { x0:-38, x1:0, z0:58, z1:84 };
const PRAC_RACK = { z:79.0, face:-1, xs:[-25.0, -22.3, -19.6] };
/* 걸림·낙하 판정은 연습용 랙에도 똑같이 걸려야 한다 */
const ALL_ROWS = RACK_ROWS.concat([
  { id:'연습', z:PRAC_RACK.z, face:PRAC_RACK.face, x0:PRAC_RACK.xs[0], n:3 }
]);
/* 등을 맞댄 두 줄은 하나의 덩어리로 본다. 사이 1.2m 틈에는 차가 들어갈 수 없는데,
   따로 계산하면 양쪽에서 서로 밀어내 그 자리에 끼어버린다. */
const RACK_SLABS = (function(){
  const f = CFG.rackFace, out = [];
  const rows = ALL_ROWS.slice().sort((a,b)=> a.z - b.z);
  for(const r of rows){
    const x0 = r.x0 - 1.35, x1 = r.x0 + r.n*2.7 - 1.35;
    const z0 = r.z - f, z1 = r.z + f;
    const last = out[out.length-1];
    if(last && Math.abs(last.x0 - x0) < 0.01 && Math.abs(last.x1 - x1) < 0.01 && z0 - last.z1 < 2.2)
      last.z1 = Math.max(last.z1, z1);
    else out.push({ x0:x0, x1:x1, z0:z0, z1:z1 });
  }
  return out;
})();

/* 화물 — 무게(kg)와 깨짐 등급. 무게 자체보다 다루기 어려워지는 게 핵심이다. */
const RATED_KG = 1500;          // 지상 정격
const CARGO = [
  { n:'잡화',      w:260,  c:0 },
  { n:'채소',      w:430,  c:0 },
  { n:'냉동식품',   w:720,  c:0 },
  { n:'생수',      w:930,  c:1 },
  { n:'올리브오일', w:1080, c:2 },
  { n:'음료 병제품', w:1160, c:2 }
];
/* 높이가 올라갈수록 들 수 있는 무게가 떨어진다 */
function residualKg(lift){ return RATED_KG * (1 - 0.32 * clamp(lift/CFG.liftMax, 0, 1)); }
function maxLiftFor(w){
  const t = 1 - w/RATED_KG;
  return t <= 0 ? 0 : clamp(t/0.32 * CFG.liftMax, 0, CFG.liftMax);
}

const SCORE = { base:1000, perDamage:100, perFault:40, timeFree:420, perSec:2, pass:700 };

/* 발견물 — 이름은 여기서 바꾸시면 됩니다 */
const DISCOVERIES = [
  { id:'d1', x:-37.0, z: 82.0, name:'구석에 쌓인 파손 팔레트' },
  { id:'d2', x: 38.0, z:  2.0, name:'벽에 붙은 오래된 지번표' },
  { id:'d3', x:  0.0, z: 41.0, name:'통로 한가운데 버려진 대차' },
  { id:'d4', x:-30.0, z: 60.0, name:'비상구 옆 소화기 함' },
  { id:'d5', x: 26.0, z: 20.5, name:'랙 끝단 충격 방지대' },
  { id:'d6', x:  0.0, z:100.0, name:'야드 끝 컨테이너' }
];
const GRADES = [
  [0,'견습'], [1500,'초급'], [4000,'중급'], [9000,'상급'], [20000,'베테랑'], [45000,'터줏대감']
];
const CELL = 12;                     // 지도 한 칸
const UNLOCK_RATE = 0.85;            // 실내 이만큼 채우면 셔터가 열린다

const GOAL_COL = 0xFF2FA8;          // 목표 표시 색
const GOAL_CSS = '#FF2FA8';
const COLOR = {
  bg:0x7C8996, floor:0x767D84, wall:0x8B959E,
  upright:0xB44724, beam:0x2A5FA6,
  body:0xD9A30A, dark:0x272E38, steel:0x7C8792,
  wood:0xA97C43, woodDark:0x8B6233, broken:0x9C4438,
  vest:0xE8F24A, skin:0xD9B08C,
  asphalt:0x4E545A, yard:0x5F666D, line:0xC9990F,
  box:[0xC9AB74,0x8FBAA4,0x99AACC,0xC2938B,0xB3A7C9],
  car:[0xC0453C,0x2E5FA8,0xD8DDE2,0x394049,0x2E7D52,0xC4923A]
};


/* ── 추가 구역 ── */
/* 화물엘베 — 동쪽 벽에 문. 내부 x 40.3~43.5, z 38.4~41.6. 센서선 안쪽으로 앞다리가 들어가면 사고. */
const LIFT_ROOM = { x0:40.3, x1:43.5, z0:38.4, z1:41.6, doorZ0:38.6, doorZ1:41.4, sensorX:40.45, line1:41.45, line2:42.55, y:0.02, ceil:2.6 };
/* 윙바디 — 셔터 밖 야드 동측, 차체가 z 방향으로 선다. 바닥 0.95, 열린 윙 하단 3.0.
   지게차는 서쪽(x 작은 쪽)에서 붙는다. */
const WING = { x0:30.0, x1:32.3, z0:91.5, z1:98.1, y:0.95, wingH:3.0, cols:[30.6, 31.7], rows:6, row0:92.1, pitch:1.10 };
/* 도크 앞 대기 구역 — 출고 파렛트를 모아두는 평치 12칸 */
const STAGE = { id:'대기', rows:[ {z:96, xs:[5,7,9,11]}, {z:99, xs:[5,7,9,11]}, {z:102, xs:[5,7,9,11]} ] };
/* 외부 입고 하차 구역 — 입고 파렛트가 놓이는 자리 */
const INBOUND = { z:92.5, xs:[5,7,9,11] };
/* 야드 빈 파렛트 열 (열차 재료) */
const EMPTY_ROW = { x:-36, z:100, n:8 };
/* 교차로 — 통로 끝. 정지 후 경적. */
const INTERSECTIONS = [
  {x:-36.5, z:12.5}, {x:36.5, z:12.5}, {x:-36.5, z:21.0}, {x:36.5, z:21.0},
  {x:-36.5, z:30.0}, {x:36.5, z:30.0}, {x:-36.5, z:39.5}, {x:36.5, z:39.5}
];
const INTER_R = 3.6;
