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
  if (px < 0 || px >= CW || py < 0 || py >= CH) return false;
  const i = (py * CW + px) * 4;
  const r = imgData.data[i];
  const b = imgData.data[i + 2];
  return b > 30 && b > r * 1.5;
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
  for (let y = DOT_STEP; y < CH - DOT_STEP; y += DOT_STEP)
    for (let x = DOT_STEP; x < CW - DOT_STEP; x += DOT_STEP)
      if (isNavy(x, y)) dots.push({ x, y, eaten: false, power: false });

  [{x:20,y:20},{x:CW-20,y:20},{x:20,y:CH-20},{x:CW-20,y:CH-20}].forEach(c => {
    let best = null, bestD = Infinity;
    dots.forEach(d => { const dist = Math.hypot(d.x-c.x, d.y-c.y); if (dist < bestD) { bestD = dist; best = d; } });
    if (best) best.power = true;
  });
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
  return { x:s.x, y:s.y, dx:0, dy:0, ndx:0, ndy:0, spd:1.8, r:7, powered:0, iframes:0 };
}

function movePac() {
  const p = pac;
  if (p.x < -p.r) { p.x = CW+p.r; return; }
  if (p.x > CW+p.r) { p.x = -p.r; return; }

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
      if (d.power) { score+=50; p.powered=240; ghosts.forEach(g=>g.scared=240); }
      else score += 10;
      updateHUD();
    }
  });
  if (p.powered>0) p.powered--;
  if (p.iframes>0) p.iframes--;
  ghosts.forEach(g => { if (g.scared>0) g.scared--; });
}

const GCOLS = ['#ff2020','#ff9090','#20ccff','#ff80dd','#ffaa20','#80ff40','#ff40aa','#40ffcc','#ffdd20','#cc80ff'];
function ghostCount() { return Math.min(5 + Math.floor(score/300), 10); }

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
    ghosts.push({ x:s.x, y:s.y, dx:d.dx, dy:d.dy, spd:1.2+Math.random()*0.6, r:7, color:GCOLS[i%GCOLS.length], scared:0 });
  }
}

const DIRS = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];

function moveGhost(g) {
  const ok = d => canMove(g.x, g.y, d.dx, d.dy, g.spd, g.r);
  const notBack = d => !(d.dx===-g.dx && d.dy===-g.dy);
  const tgt = g.scared>0 ? {x:g.x*2-pac.x, y:g.y*2-pac.y} : {x:pac.x, y:pac.y};
  const dist = d => Math.hypot(g.x+d.dx*10-tgt.x, g.y+d.dy*10-tgt.y);

  if (!ok({dx:g.dx,dy:g.dy}) || tick%30===~~(g.spd*10)%30) {
    const valid = DIRS.filter(d=>ok(d)&&notBack(d));
    if (valid.length) {
      valid.sort((a,b)=>dist(a)-dist(b));
      const pick = Math.random()<0.72 ? valid[0] : valid[~~(Math.random()*valid.length)];
      g.dx=pick.dx; g.dy=pick.dy;
    } else { g.dx=-g.dx; g.dy=-g.dy; }
  }
  if (ok({dx:g.dx,dy:g.dy})) { g.x+=g.dx*g.spd; g.y+=g.dy*g.spd; }
  if (g.x<-g.r) g.x=CW+g.r; if (g.x>CW+g.r) g.x=-g.r;
}

function checkCollisions() {
  if (pac.iframes>0) return;
  ghosts.forEach(g => {
    if (Math.hypot(pac.x-g.x, pac.y-g.y) < pac.r+g.r*0.8) {
      if (g.scared>0) {
        score+=200; updateHUD();
        const sp=shuffle(navySpots())[0]; g.x=sp.x; g.y=sp.y; g.scared=0;
      } else {
        energy--; updateHUD();
        if (energy<=0) { gameState='over'; showOverlay('GAME OVER','#ff3333','최종 점수: '+score,'다시 시작'); return; }
        const s=findStart(); pac.x=s.x; pac.y=s.y; pac.dx=0; pac.dy=0; pac.iframes=100;
        spawnGhosts();
      }
    }
  });
}