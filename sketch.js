const CW = 760, CH = 414; // 캔버스 가로 세로 크기

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

function movePac() {
  const p = pac;

  if (p.x < 0 && isNavy(CW-1, p.y)) { p.x = CW - 1; }
  if (p.x > CW && isNavy(0, p.y)) { p.x = 1; }

  if ((p.ndx||p.ndy) && canMove(p.x, p.y, p.ndx, p.ndy, p.spd, p.r)) {
    p.dx = p.ndx; p.dy = p.ndy;
  }

  if (p.dx||p.dy) {
    if (canMove(p.x, p.y, p.dx, p.dy, p.spd, p.r)) {
      p.x += p.dx * p.spd;
      p.y += p.dy * p.spd;
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
      if (score % 1000 === 0) addGhost();
    }
  });

  if (p.iframes > 0) p.iframes--;
}

function navySpots() {
  const spots = [], cx = CW/2, cy = CH/2;
  for (let y = 20; y < CH-20; y += 20) {
    for (let x = 20; x < CW-20; x += 20) {
      if (!isNavy(x, y)) continue;
      const movable = DIRS.some(d => canMove(x, y, d.dx, d.dy, 1, 7));
      if (movable && (Math.abs(x-cx) > 80 || Math.abs(y-cy) > 60))
        spots.push({ x, y });
    }
  }
  return spots;
}

function shuffle(a) {
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function spawnGhosts() {
  const spots = shuffle(navySpots()), n = 5;
  ghosts = [];
  for (let i = 0; i < n; i++) {
    const s = spots[i % spots.length], d = DIRS[i % 4];
    ghosts.push({
      x: s.x, y: s.y,
      dx: d.dx, dy: d.dy,
      spd: 1.2 + Math.random() * 0.4,
      r: 7,
      color: GCOLS[i % GCOLS.length]
    });
  }
}

function addGhost() {
  if (ghosts.length >= 10) return;
  const spots = shuffle(navySpots());
  const s = spots[0];
  const d = DIRS[ghosts.length % 4];
  ghosts.push({
    x: s.x, y: s.y,
    dx: d.dx, dy: d.dy,
    spd: 1.2 + Math.random() * 0.4,
    r: 7,
    color: GCOLS[ghosts.length % GCOLS.length]
  });
}

function moveGhost(g) {
  const ok = d => canMove(g.x, g.y, d.dx, d.dy, g.spd, g.r);
  const notBack = d => !(d.dx === -g.dx && d.dy === -g.dy);

  if (!ok({dx:g.dx, dy:g.dy}) || tick%30 === ~~(g.spd*10)%30) {
    const valid = DIRS.filter(d => ok(d) && notBack(d));
    if (valid.length) {
      g.dx = valid[~~(Math.random()*valid.length)].dx;
      g.dy = valid[~~(Math.random()*valid.length)].dy;
    } else { g.dx = -g.dx; g.dy = -g.dy; }
  }
  if (ok({dx:g.dx, dy:g.dy})) { g.x += g.dx*g.spd; g.y += g.dy*g.spd; }

  if (g.x < 0 && isNavy(CW-1, g.y)) { g.x = CW - 1; }
  if (g.x > CW && isNavy(0, g.y)) { g.x = 1; }
}

function checkCollisions() {
  if (pac.iframes > 0) return;
  ghosts.forEach(g => {
    if (Math.hypot(pac.x-g.x, pac.y-g.y) < pac.r+g.r*0.8) {
      energy--; updateHUD();
      if (energy <= 0) {
        gameState = 'over';
        showOverlay('GAME OVER', '#ff3333', '최종 점수: '+score, '다시 시작');
        return;
      }
      const s = findStart();
      pac.x = s.x; pac.y = s.y; pac.dx = 0; pac.dy = 0; pac.iframes = 100;
      spawnGhosts();
    }
  });
}

function checkWin() {
  if (dots.some(d => !d.eaten)) return;
  gameState = 'over';
  showOverlay('승리했어요!', '#ffff00', '최종 점수: '+score, '다시 시작');
}

function draw() {
  tick++;

  if (gameState === 'playing') {
    movePac();
    ghosts.forEach(g => moveGhost(g));
    checkCollisions();
    checkWin();
  }

  image(mapImg, 0, 0, CW, CH);

  dots.forEach(d => {
    if (d.eaten) return;
    noStroke();
    fill(255);
    circle(d.x, d.y, 4);
  });

  ghosts.forEach(g => drawGhost(g));
  drawPac();

  if (bannerTimer > 0) {
    push();
    fill(bannerColor);
    textAlign(CENTER, CENTER);
    textSize(36);
    noStroke();
    text(bannerText, CW/2, CH/2);
    pop();
    bannerTimer--;
  }
}

function drawPac() {
  const p = pac;
  if (p.iframes > 0 && Math.floor(tick/5) % 2 === 0) return;

  const mv = p.dx !== 0 || p.dy !== 0;
  if (mv) {
    mouthA += 0.16 * mouthDir;
    if (mouthA > 0.38) mouthDir = -1;
    if (mouthA < 0.02) { mouthDir = 1; mouthA = 0.02; }
  }
  const mo = mv ? mouthA : 0.12;

  let fa = 0;
  if (p.dx === 1) fa = 0;
  else if (p.dx === -1) fa = PI;
  else if (p.dy === -1) fa = -PI/2;
  else if (p.dy === 1) fa = PI/2;

  push();
  fill('#ffee00');
  noStroke();
  arc(p.x, p.y, p.r*2, p.r*2, fa+mo, fa+TWO_PI-mo, PIE);
  pop();
}

function drawGhost(g) {
  const r = g.r;
  push();
  fill(g.color);
  noStroke();

  arc(g.x, g.y - r*0.15, r*1.76, r*1.76, PI, TWO_PI);

  beginShape();
  vertex(g.x - r, g.y - r*0.15);
  vertex(g.x - r, g.y + r*0.72);
  for (let i = 0; i <= 4; i++) {
    let wx = g.x - r + i * (r*0.5);
    let wy = g.y + r*0.72 + (i % 2 === 0 ? -r*0.26 : r*0.08);
    vertex(wx, wy);
  }
  vertex(g.x + r, g.y + r*0.72);
  vertex(g.x + r, g.y - r*0.15);
  endShape(CLOSE);

  fill(255);
  ellipse(g.x - r*0.3, g.y - r*0.22, r*0.4, r*0.52);
  ellipse(g.x + r*0.3, g.y - r*0.22, r*0.4, r*0.52);
  fill('#001aaa');
  ellipse(g.x - r*0.25, g.y - r*0.2, r*0.2, r*0.26);
  ellipse(g.x + r*0.35, g.y - r*0.2, r*0.2, r*0.26);
  pop();
}

function keyPressed() {
  if (gameState === 'playing') {
    if (keyCode === LEFT_ARROW)  { pac.ndx = -1; pac.ndy = 0; }
    if (keyCode === RIGHT_ARROW) { pac.ndx =  1; pac.ndy = 0; }
    if (keyCode === UP_ARROW)    { pac.ndx =  0; pac.ndy = -1; }
    if (keyCode === DOWN_ARROW)  { pac.ndx =  0; pac.ndy =  1; }
    if (key === 'a' || key === 'A') { pac.ndx = -1; pac.ndy = 0; }
    if (key === 'd' || key === 'D') { pac.ndx =  1; pac.ndy = 0; }
    if (key === 'w' || key === 'W') { pac.ndx =  0; pac.ndy = -1; }
    if (key === 's' || key === 'S') { pac.ndx =  0; pac.ndy =  1; }
  }
  if ((keyCode === ENTER || key === ' ') && gameState !== 'playing') {
    startGame();
  }
}

function startGame() {
  score = 0; energy = 3; tick = 0; mouthA = 0.15; mouthDir = 1;
  dots = buildDots();
  pac = makePac();
  spawnGhosts();
  gameState = 'playing';
  updateHUD();
  document.getElementById('overlay').style.display = 'none';
}

function updateHUD() {
  document.getElementById('scoreVal').textContent = score;
  const bar = document.getElementById('energyBar');
  bar.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = '♥';
    s.style.cssText = `color:${i<energy?'#ff4466':'#333'};text-shadow:${i<energy?'0 0 8px #ff4466':'none'};font-size:18px;margin-left:3px`;
    bar.appendChild(s);
  }
}

function showOverlay(title, color, sub, btn) {
  document.getElementById('overlay').style.display = 'flex';
  const t = document.getElementById('overlayTitle');
  t.textContent = title; t.style.color = color;
  t.style.textShadow = '0 0 24px ' + color;
  document.getElementById('overlaySub').textContent = sub;
  document.getElementById('overlayBtn').style.display = 'block';
  document.getElementById('overlayBtn').textContent = '▶ ' + btn;
  document.getElementById('loading').style.display = 'none';
}

function showBanner(t, c, d) { bannerText = t; bannerColor = c; bannerTimer = d; }