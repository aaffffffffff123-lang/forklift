/* ============================================================
   상태
   ============================================================ */
let renderer, scene, camera, clock;
let truckGroup, mastGroup, innerMast, carriage;
let targetRing, targetPost, slotGhost, ghostBeam, ghostRing, sunLight, hemiLight;
const shutters = [];

const truck = { x:7.0, z:3.40, h:-Math.PI/2, steer:0, v:0, lift:0, reach:0, tilt:0, carry:null };

const G = {
  mode:'menu', running:false,
  time:0, damage:0,
  step:0, flags:{},
  missionIdx:0, missionTotal:4, mission:null, chargeStep:false,
  gauge:null, place:null, toastT:0, risk:null,
  sway:0, swayV:0, lastV:0, capCool:0, padNow:0, padY:0, padYNow:0,
  highTravel:0, tiltTravel:0, bumpCool:0, scrapeT:0, carryCatch:false,
  fault:0, riskT:0, legCool:0, ghostId:null,
  wheel:0, wheelHold:0, wheelLast:0, wheelAcc:0, wheelLock:false,
  throttle:0, pedal:false, horn:false,
  zoom:1.35, pan:{x:0, z:0},
  batt:100, lowWarned:false, battDead:false,
  playerName:'', uiStep:0, alignShown:null,
  // 배회
  cells:{}, dist:0, found:0, disc:{}, goal:null, outUnlocked:false,
  shutterT:0, miniT:0, npcHitCool:0, showMap:false, viewShift:0, uipNow:1,
  view:'cab', headTurn:0, backT:0, rearLook:true, fovNow:38, viewShift:0,
  drill:null, drillLv:0, drillN:0, drillI:0, drillMiss:0, drillPallet:null,
  defects:{}, defectSeen:{}, inspMiss:0, inspHit:0, eduFirst:true, uiNow:1, barOpen:false,
  rushIdx:0, rushDone:false, jolt:0
};

const slots = [], zones = [], pallets = [], peds = [], signals = [], cars = [], discMeshes = [];
const keys = {};
const levers = {
  lift:  { val:0, drag:false, el:null, knob:null, stem:null, h:104 },
  tilt:  { val:0, drag:false, el:null, knob:null, stem:null, h:104 },
  reach: { val:0, drag:false, el:null, knob:null, stem:null, h:104 }
};
const THR = { drag:false, h:104 };
const PILLARS = [];

const UI_STEPS = [0, 0.85, 1.00, 1.15, 1.35, 1.55];
const UI_KEY = 'forklift_ui_v1';
const ROAM_KEY = 'forklift_roam_v1';
const MAP_KEY = 'forklift_map_v1';
const BAR_KEY = 'forklift_bar_v1';
const BARLEARN_KEY = 'forklift_barlearn_v1';
const VIEW_KEY = 'forklift_view_v1';
const REAR_KEY = 'forklift_rear_v1';
const VIEWS = ['quarter', 'cab', 'fork', 'auto'];
const VIEW_NAME = { quarter:'쿼터뷰', cab:'운전석', fork:'지겟발', auto:'자동' };
/* 주행 연습 코스 — 랙과 기둥을 피해 통로를 도는 순서 */
const DRIVE_COURSE = [
  {x:-6, z:13}, {x:-22, z:8}, {x:-30, z:17}, {x:-10, z:21}, {x:6, z:14}, {x:20, z:9}
];
const EDU_KEY = 'forklift_edu_v1';
const RUSH_KEY = 'forklift_rush_v1';

/* 속도전 — 매번 같은 코스라야 기록을 견줄 수 있다 */
const RUSH_COURSE = [
  { from:'2F-C1-1-1', to:'2F-A1-4-2' },
  { from:'2F-A1-2-2', to:'2F-C1-3-1' },
  { from:'2F-C1-4-1', to:'2F-A1-8-1' },
  { from:'2F-A1-5-2', to:'2F-C1-6-1' },
  { from:'2F-C1-7-1', to:'2F-A1-9-2' }
];
const RUSH_PENALTY = 10;   // 파손 1건당 더해지는 초
const RUSH_FAULT = 4;      // 지적 1건당 더해지는 초

/* ============================================================
   유틸
   ============================================================ */
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const dirX = h => Math.sin(h);
const dirZ = h => Math.cos(h);
const nrmX = h => Math.cos(h);
const nrmZ = h => -Math.sin(h);
function wrapQuarter(a){
  a = a % (Math.PI/2);
  if(a >  Math.PI/4) a -= Math.PI/2;
  if(a < -Math.PI/4) a += Math.PI/2;
  return a;
}
function wrapPi(a){ while(a> Math.PI) a-=2*Math.PI; while(a< -Math.PI) a+=2*Math.PI; return a; }
function fmtTime(t){ const m=Math.floor(t/60), s=Math.floor(t%60); return m+':'+String(s).padStart(2,'0'); }
function fmtDist(m){ return m >= 1000 ? (m/1000).toFixed(2) + ' km' : Math.round(m) + ' m'; }
function toast(msg, good){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (good ? ' good' : '');
  G.toastT = good ? 2.2 : 1.6;
}
function esc(s){
  return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function mat(color, rough, metal){
  return new THREE.MeshStandardMaterial({color:color, roughness:rough===undefined?0.65:rough, metalness:metal||0});
}
function gradeOf(d){
  let g = GRADES[0][1];
  for(const v of GRADES) if(d >= v[0]) g = v[1];
  return g;
}

