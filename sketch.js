const CW = 760, CH = 414;

let mapImg;
let imgData;

let dots = [];
let score = 0;
let energy = 3;
let pac;
let ghosts = [];
let gameState = 'menu';
let tick = 0;
let mouthA = 0.15;
let mouthDir = 1;
let bannerText = '', bannerTimer = 0, bannerColor = '#fff';

const DOT_STEP = 10;
const DIRS = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
const GCOLS = ['#ff2020','#ff9090','#20ccff','#ff80dd','#ffaa20',
               '#80ff40','#ff40aa','#40ffcc','#ffdd20','#cc80ff'];

function preload() {
  mapImg = loadImage('Map.png');
}

function setup() {
  let cnv = createCanvas(CW, CH);
  cnv.parent('gameCanvas');

  let offCanvas = document.createElement('canvas');
  offCanvas.width = CW;
  offCanvas.height = CH;
  let offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(mapImg.canvas, 0, 0, CW, CH);
  imgData = offCtx.getImageData(0, 0, CW, CH);

  dots = buildDots();
  pac = makePac();
  ghosts = [];
  updateHUD();

  document.getElementById('loading').style.display = 'none';
  document.getElementById('overlaySub').textContent = '남색 통로만 이동 가능 | 방향키로 조작';
  document.getElementById('overlayBtn').style.display = 'block';
}

function isNavy(px, py) {
  px = Math.round(px); py = Math.round(py);
  if (py < 0 || py >= CH) return false;
  px = ((px % CW) + CW) % CW;
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

function buildDots() {
  const dots = [];
  for (let y = DOT_STEP; y < CH - DOT_STEP; y += DOT_STEP) {
    for (let x = DOT_STEP; x < CW - DOT_STEP; x += DOT_STEP) {
      if (!isNavy(x, y)) continue;
      const moveCount = DIRS.filter(d => canMove(x, y, d.dx, d.dy, 1, 5)).length;
      if (moveCount >= 2) dots.push({ x, y, eaten: false });
    }
  }
  return dots;
}

function findStart() {
  const cx = Math.round(CW/2), cy = Math.round(CH/2);
  for (let r = 0; r < 200; r += 5) {
    for (let a = 0; a < Math.PI*2; a += 0.3) {
      const x = cx + Math.round(Math.cos(a)*r);
      const y = cy + Math.round(Math.sin(a)*r);
      if (isNavy(x, y)) return { x, y };
    }
  }
  return { x: cx, y: cy };
}

function makePac() {
  const s = findStart();
  return { x:s.x, y:s.y, dx:0, dy:0, ndx:0, ndy:0, spd:1.8, r:7, iframes:0 };
}