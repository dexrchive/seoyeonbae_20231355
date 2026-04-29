const CW = 760, CH = 414;
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const offCanvas = document.createElement('canvas');
offCanvas.width = CW; offCanvas.height = CH;
const offCtx = offCanvas.getContext('2d');

let imgData = null;
let mapImg  = null;

function isNavy(px, py) {
  px = Math.round(px); py = Math.round(py);
  if (py < 0 || py >= CH) return false;
  px = ((px % CW) + CW) % CW; // x는 좌우로 감싸기 (워프 허용)
  const i = (py * CW + px) * 4;
  const r = imgData.data[i];
  const g = imgData.data[i + 1];
  const b = imgData.data[i + 2];
  return b > 30 && b > r * 1.5 && b > g * 1.5;
}

function canMove(x, y, dx, dy, spd, r) {
    const nx = x + dx * spd, ny = y + dy * spd, m = r * 0.72;
  const pts = dx !== 0
    ? [[nx+dx*m, ny-m*0.6], [nx+dx*m, ny], [nx+dx*m, ny+m*0.6]]
    : [[nx-m*0.6, ny+dy*m], [nx, ny+dy*m], [nx+m*0.6, ny+dy*m]];
  return pts.every(([px, py]) => isNavy(px, py));
}

const DOT_STEP = 10;

function buildDots() {
  const dots = [];

  function nearCyan(x, y) {
    for (let dy = -DOT_STEP; dy <= DOT_STEP; dy += 2)  // 2px 간격으로 촘촘히 탐색
      for (let dx = -DOT_STEP; dx <= DOT_STEP; dx += 2) {
        if (dx === 0 && dy === 0) continue;
        const px = ((Math.round(x+dx) % CW) + CW) % CW;
        const py = Math.round(y+dy);
        if (py < 0 || py >= CH) continue;
        const i = (py * CW + px) * 4;
        const r = imgData.data[i];
        const g = imgData.data[i+1];
        const b = imgData.data[i+2];
        if (r > 20 && g > 60 && b > 100) return true;
      }
    return false;
  }

  for (let y = DOT_STEP; y < CH - DOT_STEP; y += DOT_STEP)
    for (let x = DOT_STEP; x < CW - DOT_STEP; x += DOT_STEP)
      if (isNavy(x, y) && !nearCyan(x, y)) dots.push({ x, y, eaten: false });
  return dots;
}

let dots = [], score = 0, energy = 3, level = 1;
let pac, ghosts, gameState = 'menu', tick = 0, raf = null;
let mouthA = 0.15, mouthDir = 1;
let bannerText = '', bannerTimer = 0, bannerColor = '#fff';

function findStart() {
  const cx = Math.round(CW/2), cy = Math.round(CH/2);
  for (let r = 0; r < 200; r += 5)
    for (let a = 0; a < Math.PI*2; a += 0.3) {
      const x = cx + Math.round(Math.cos(a)*r), y = cy + Math.round(Math.sin(a)*r);
      if (isNavy(x, y)) return { x, y };
    }
  return { x: cx, y: cy };
}

function makePac() {
  const s = findStart();
  return { x:s.x, y:s.y, dx:0, dy:0, ndx:0, ndy:0, spd:1.8, r:7, iframes:0 };
}

function movePac() {
  const p = pac;
  if (p.x < 0 && isNavy(CW-1, p.y)) { p.x = CW - 1; }
  if (p.x > CW && isNavy(0, p.y)) { p.x = 1; }

  if ((p.ndx||p.ndy) && canMove(p.x, p.y, p.ndx, p.ndy, p.spd, p.r)) {
    p.dx = p.ndx; p.dy = p.ndy;
  }
  if (p.dx||p.dy) {
    if (canMove(p.x, p.y, p.dx, p.dy, p.spd, p.r)) {
      p.x += p.dx*p.spd; p.y += p.dy*p.spd;
    } else {
      if (p.dx !== 0) p.y += (Math.round(p.y/DOT_STEP)*DOT_STEP - p.y) * 0.25;
      if (p.dy !== 0) p.x += (Math.round(p.x/DOT_STEP)*DOT_STEP - p.x) * 0.25;
    }
  }

  dots.forEach(d => {
    if (!d.eaten && Math.hypot(p.x-d.x, p.y-d.y) < p.r+4) {
      d.eaten = true;
      score += 10;
      updateHUD();
    }
  });
  if (p.iframes>0) p.iframes--;

}

const GCOLS = ['#ff2020','#ff9090','#20ccff','#ff80dd','#ffaa20','#80ff40','#ff40aa','#40ffcc','#ffdd20','#cc80ff'];
function ghostCount() { return 5; }

function navySpots() {
  const spots = [], cx = CW/2, cy = CH/2;
  for (let y = 20; y < CH-20; y += 20)
    for (let x = 20; x < CW-20; x += 20)
      if (isNavy(x,y) && (Math.abs(x-cx)>80 || Math.abs(y-cy)>60)) spots.push({x,y});
  return spots;
}

function shuffle(a) {
  for (let i=a.length-1; i>0; i--) { const j=~~(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function spawnGhosts() {
  const spots = shuffle(navySpots()), n = ghostCount();
  ghosts = [];
  const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
  for (let i=0; i<n; i++) {
    const s = spots[i%spots.length], d = dirs[i%4];
    ghosts.push({ x:s.x, y:s.y, dx:d.dx, dy:d.dy, spd:1.2+Math.random()*0.4, r:7, color:GCOLS[i%GCOLS.length] });
  }
}

const DIRS = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];

function moveGhost(g) {
  const ok = d => canMove(g.x, g.y, d.dx, d.dy, g.spd, g.r);
  const notBack = d => !(d.dx===-g.dx && d.dy===-g.dy);
  if (!ok({dx:g.dx,dy:g.dy}) || tick%30===~~(g.spd*10)%30) {
  const valid = DIRS.filter(d=>ok(d)&&notBack(d));
  if (valid.length) {
    g.dx=valid[~~(Math.random()*valid.length)].dx;
    g.dy=valid[~~(Math.random()*valid.length)].dy;
  } else { g.dx=-g.dx; g.dy=-g.dy; }
}
  if (ok({dx:g.dx,dy:g.dy})) { g.x+=g.dx*g.spd; g.y+=g.dy*g.spd; }
  if (g.x < 0 && isNavy(CW-1, g.y)) { g.x = CW - 1; }
  if (g.x > CW && isNavy(0, g.y)) { g.x = 1; }
}

function checkCollisions() {
  if (pac.iframes>0) return;
  ghosts.forEach(g => {
    if (Math.hypot(pac.x-g.x, pac.y-g.y) < pac.r+g.r*0.8) {
      energy--; updateHUD();
      if (energy<=0) { gameState='over'; showOverlay('GAME OVER','#ff3333','최종 점수: '+score,'다시 시작'); return; }
      const s=findStart(); pac.x=s.x; pac.y=s.y; pac.dx=0; pac.dy=0; pac.iframes=100;
      spawnGhosts();
    }
  });
}

function checkWin() {
  if (dots.some(d=>!d.eaten)) return;
  level++; score+=500; dots=buildDots();
  const s=findStart(); pac.x=s.x; pac.y=s.y; pac.dx=0; pac.dy=0; pac.iframes=90;
  spawnGhosts(); updateHUD(); showBanner('LEVEL '+level+'!','#ffff00',100);
}

function draw() {
  ctx.drawImage(mapImg, 0, 0, CW, CH);

  dots.forEach(d => {
    if (d.eaten) return;
    ctx.save();
    ctx.fillStyle='#fff'; ctx.shadowColor='#aaccff'; ctx.shadowBlur=3;
    ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  ghosts.forEach(drawGhost);
  drawPac();

  if (bannerTimer>0) {
    ctx.save(); ctx.globalAlpha=Math.min(1,bannerTimer/20);
    ctx.font='bold 36px "Courier New"'; ctx.fillStyle=bannerColor;
    ctx.shadowColor=bannerColor; ctx.shadowBlur=20;
    ctx.textAlign='center'; ctx.fillText(bannerText, CW/2, CH/2);
    ctx.restore(); bannerTimer--;
  }
}

function drawPac() {
  const p = pac;
  if (p.iframes>0 && Math.floor(tick/5)%2===0) return;
  const mv = p.dx!==0||p.dy!==0;
  if (mv) { mouthA+=0.16*mouthDir; if(mouthA>0.38)mouthDir=-1; if(mouthA<0.02){mouthDir=1;mouthA=0.02;} }
  const mo = mv ? mouthA : 0.12;
  let fa = 0;
  if (p.dx===1) fa=0; else if (p.dx===-1) fa=Math.PI;
  else if (p.dy===-1) fa=-Math.PI/2; else if (p.dy===1) fa=Math.PI/2;

  ctx.save();
  ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14;
  ctx.fillStyle='#ffee00';
  ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.arc(p.x,p.y,p.r,fa+mo,fa+Math.PI*2-mo); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(p.x+Math.cos(fa-0.55)*p.r*0.5, p.y+Math.sin(fa-0.55)*p.r*0.5, 2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGhost(g) {
  const col = g.color, r = g.r;
  ctx.save();
  ctx.shadowColor=col; ctx.shadowBlur=10; ctx.fillStyle=col;
  ctx.beginPath(); ctx.arc(g.x, g.y-r*0.15, r*0.88, Math.PI, 0);
  const sw=r*0.5, bot=g.y+r*0.72; ctx.lineTo(g.x+r, bot);
  for (let i=4; i>=0; i--) ctx.lineTo(g.x-r+i*sw, bot+(i%2===0?-r*0.26:r*0.08));
  ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
  [[-0.3],[0.3]].forEach(([ox]) => {
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(g.x+ox*r,g.y-r*0.22,r*0.2,r*0.26,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#001aaa'; ctx.beginPath(); ctx.ellipse(g.x+ox*r+0.05*r,g.y-r*0.2,r*0.1,r*0.13,0,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function updateHUD() {
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('levelVal').textContent = level;
  const bar = document.getElementById('energyBar'); bar.innerHTML='';
  for (let i=0; i<3; i++) {
    const s = document.createElement('span');
    s.textContent='♥';
    s.style.cssText=`color:${i<energy?'#ff4466':'#333'};text-shadow:${i<energy?'0 0 8px #ff4466':'none'};font-size:18px;margin-left:3px`;
    bar.appendChild(s);
  }
}

function showOverlay(title, color, sub, btn) {
  document.getElementById('overlay').style.display='flex';
  const t=document.getElementById('overlayTitle');
  t.textContent=title; t.style.color=color; t.style.textShadow='0 0 24px '+color;
  document.getElementById('overlaySub').textContent=sub;
  document.getElementById('overlayBtn').style.display='block';
  document.getElementById('overlayBtn').textContent='▶ '+btn;
  document.getElementById('loading').style.display='none';
}
function showBanner(t,c,d) { bannerText=t; bannerColor=c; bannerTimer=d; }

const KEYS = {
  ArrowUp:{dx:0,dy:-1}, ArrowDown:{dx:0,dy:1},
  ArrowLeft:{dx:-1,dy:0}, ArrowRight:{dx:1,dy:0},
  w:{dx:0,dy:-1}, s:{dx:0,dy:1}, a:{dx:-1,dy:0}, d:{dx:1,dy:0},
};
document.addEventListener('keydown', e => {
  if (KEYS[e.key]) { e.preventDefault(); if (gameState==='playing') { pac.ndx=KEYS[e.key].dx; pac.ndy=KEYS[e.key].dy; } }
  if ((e.key==='Enter'||e.key===' ') && gameState!=='playing') startGame();
});

function startGame() {
  document.getElementById('overlay').style.display='none';
  score=0; energy=3; level=1; tick=0; mouthA=0.15; mouthDir=1;
  dots=buildDots(); pac=makePac(); spawnGhosts(); gameState='playing'; updateHUD();
  if (raf) cancelAnimationFrame(raf);
  loop();
}

function loop() {
  tick++;
  if (gameState==='playing') { movePac(); ghosts.forEach(moveGhost); checkCollisions(); checkWin(); }
  draw();
  raf = requestAnimationFrame(loop);
}

mapImg = new Image();
mapImg.onload = function() {
  offCtx.drawImage(mapImg, 0, 0, CW, CH);
  imgData = offCtx.getImageData(0, 0, CW, CH);
  document.getElementById('loading').style.display='none';
  document.getElementById('overlaySub').textContent='남색 통로만 이동 가능 | 방향키로 조작';
  document.getElementById('overlayBtn').style.display='block';
  dots=buildDots(); pac=makePac(); ghosts=[];
  loop();
};

mapImg.onerror = function() {
  document.getElementById('overlaySub').textContent='Map.png 파일이 같은 폴더에 없어요!';
  document.getElementById('loading').textContent='⚠ 파일 없음';
};
mapImg.src = 'Map.png';