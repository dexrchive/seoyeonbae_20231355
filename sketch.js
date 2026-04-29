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