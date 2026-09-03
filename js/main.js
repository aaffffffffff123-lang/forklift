/* ============================================================
   루프
   ============================================================ */
let labelT = 0, saveT = 0;
function loop(){
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  readControls(dt);
  tickCharge(dt);
  updateAudio(dt);

  if(G.running){
    G.time += dt;
    if(G.mode === 'work'){
      let dr = 0.05;
      if(Math.abs(truck.v) > 0.10) dr += 0.16;
      if(Math.abs(levers.lift.val) > 0.05) dr += 0.30;
      G.batt = Math.max(0, G.batt - dr*dt);
      if(G.batt >= 25) G.lowWarned = false;
      if(G.batt < 20 && !G.lowWarned){ G.lowWarned = true; toast('배터리 부족 · 속도 제한'); }
      if(G.batt <= 0 && !G.battDead){ G.battDead = true; G.fault += 1; toast('배터리 방전 · 비상 주행'); }
    }
    if(!G.busy && !(G.driveTip > 0)) drive(dt);
    forkLogic(dt);
    physStep(dt);
    hazards(dt);
    updatePeds(dt);
    updateCars(dt);
    tickDock(dt);
    tickDriver(dt);
    tickDrive(dt);
    ghostTick(dt);
    if(G.mode === 'drill') drillCheck();
    else if(G.mode === 'course' || G.mode === 'exam' || G.mode === 'train') courseTick(dt);
    else checkObjective();
    if(G.mode === 'work' || G.mode === 'rush' || G.mode === 'daily' || G.mode === 'edu') markLoose();
    updateWrapButton();
    if(G.mode === 'roam'){
      markCell();
      updateGoal();
      updateDiscoveries();
      saveT -= dt;
      if(saveT <= 0){ saveT = 6; saveRoam(); }
    }
  }else{
    SND.relief = false;
    SND.scrape = 0;
  }

  labelT -= dt;
  if(labelT <= 0){ labelT = 0.35; updateLabels(); }

  sync(dt);
  updateCamera(dt);
  updateHUD(dt);
  if(G.busy || G.driveTip > 0){ if(DRV.state === 'ride' && !(G.driveTip > 0)) G.busy = false; }
  const puls = 0.5 + 0.5*Math.sin(performance.now()*0.004);
  if(targetRing.visible) targetRing.material.opacity = 0.62 + 0.30*puls;
  ghostBeam.visible = ghostRing.visible = slotGhost.visible;
  if(slotGhost.visible){
    slotGhost.material.opacity = 0.26 + 0.20*puls;
    ghostBeam.material.opacity = 0.18 + 0.16*puls;
    ghostRing.material.opacity = 0.55 + 0.35*puls;
  }
  for(const d of discMeshes) if(d.halo.visible) d.halo.material.opacity = 0.35 + 0.22*Math.sin(performance.now()*0.003);
  renderer.render(scene, camera);
}

function init(){
  renderer = new THREE.WebGLRenderer({canvas:document.getElementById('scene'), antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.90;

  camera = new THREE.PerspectiveCamera(38, 1, 0.22, 260);
  camera.userData.tx = truck.x;
  camera.userData.tz = truck.z;
  camera.userData.z = G.zoom;

  clock = new THREE.Clock();
  buildWorld();
  initDriver();
  setupPallets();
  buildLevers();
  practiceLoad();
  bindControls();
  bindSheet();
  setPedal(false);
  G.shutterT = 3.0;
  try{
    const v = parseInt(window.localStorage.getItem(UI_KEY) || '0', 10);
    if(v >= 0 && v < UI_STEPS.length) G.uiStep = v;
  }catch(e){}
  loadRoam();
  try{ G.showMap = window.localStorage.getItem(MAP_KEY) === '1'; }catch(e){}
  document.getElementById('roamMore').classList.toggle('on', G.showMap);
  document.getElementById('btnMap').classList.toggle('on', G.showMap);
  try{
    const v = window.localStorage.getItem(VIEW_KEY);
    if(VIEWS.indexOf(v) >= 0) G.view = v;   // 없으면 기본값 운전석
  }catch(e){}
  try{
    const r = window.localStorage.getItem(REAR_KEY);
    if(r !== null) G.rearLook = (r === '1');
  }catch(e){}
  document.getElementById('btnRear').classList.toggle('on', G.rearLook);
  try{ G.barOpen = window.localStorage.getItem(BAR_KEY) === '1'; }catch(e){}
  paintBar();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', ()=> setTimeout(resize, 220));
  window.addEventListener('pointerdown', resumeAudio, true);
  window.addEventListener('keydown', resumeAudio, true);
  window.addEventListener('beforeunload', ()=>{ if(G.mode === 'roam') saveRoam(); });
  try{ history.replaceState({ sim:0 }, ''); }catch(e){}
  window.addEventListener('popstate', ()=>{ if(G.mode !== 'menu') backToMenu(); });
  refreshCerts();
  showTask('준비', '지게차 연수원', '');
  showSheet(menuSheet());

  updateLabels();
  sync(0.016);
  updateCamera(0.016);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  document.getElementById('boot').classList.add('gone');
  loop();
}

init();
