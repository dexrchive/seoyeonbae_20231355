window.onload = function () {

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tile = 20;

// 0 길 / 1 벽 / 2 콩
const map = [
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,2,1],
[1,2,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,2,1,2,1],
[1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
[1,2,1,1,2,1,1,1,1,0,1,1,1,1,2,1,1,2,1,2,1],
[1,2,2,2,2,2,2,2,1,0,1,2,2,2,2,2,2,2,2,2,1],
[1,1,1,1,2,1,1,2,1,0,1,2,1,1,2,1,1,1,1,1,1],
[0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0,0],
[1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1,1,1],
[1,2,2,2,2,2,0,1,0,0,0,1,0,2,2,2,2,2,2,2,1],
[1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1,1,1],
[0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0,0],
[1,1,1,1,2,1,1,1,1,0,1,1,1,1,2,1,1,1,1,1,1],
[1,2,2,2,2,2,2,2,1,0,1,2,2,2,2,2,2,2,2,2,1],
[1,2,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,2,1],
[1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,2,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

let pacman = { x: 1, y: 1, dir: "right" };
let score = 0;
let energy = 3;
let enemies = [];
let enemyCount = 5;

document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") pacman.dir = "up";
  if (e.key === "ArrowDown") pacman.dir = "down";
  if (e.key === "ArrowLeft") pacman.dir = "left";
  if (e.key === "ArrowRight") pacman.dir = "right";
});

function canMove(x, y) {
  if (y < 0 || y >= map.length) return false;
  if (x < 0) x = map[0].length - 1;
  if (x >= map[0].length) x = 0;
  return map[y][x] !== 1;
}

function movePacman() {
  let nx = pacman.x;
  let ny = pacman.y;

  if (pacman.dir === "up") ny--;
  if (pacman.dir === "down") ny++;
  if (pacman.dir === "left") nx--;
  if (pacman.dir === "right") nx++;

  // 워프
  if (nx < 0) nx = map[0].length - 1;
  if (nx >= map[0].length) nx = 0;

  if (canMove(nx, ny)) {
    pacman.x = nx;
    pacman.y = ny;
  }
}

function eat() {
  if (map[pacman.y][pacman.x] === 2) {
    map[pacman.y][pacman.x] = 0;
    score += 10;
  }
}

function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * map[0].length);
      y = Math.floor(Math.random() * map.length);
    } while (map[y][x] === 1);
    enemies.push({ x, y });
  }
}

function checkEnemy() {
  enemies.forEach(e => {
    if (e.x === pacman.x && e.y === pacman.y) {
      energy--;
      spawnEnemies();
    }
  });
}

function checkWin() {
  let left = 0;
  map.forEach(r => r.forEach(c => { if (c === 2) left++; }));
  if (left === 0) {
    alert("승리!");
    reset();
  }
}

function checkLose() {
  if (energy <= 0) {
    alert("게임오버");
    reset();
  }
}

function reset() {
  location.reload();
}

let mouth = true;
setInterval(() => mouth = !mouth, 200);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 네온 벽
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {

      if (map[y][x] === 1) {
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
        ctx.strokeRect(x*tile, y*tile, tile, tile);
      }

      if (map[y][x] === 2) {
        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(x*tile+tile/2, y*tile+tile/2, 2, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  ctx.shadowBlur = 0;

  // 팩맨
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.moveTo(pacman.x*tile+tile/2, pacman.y*tile+tile/2);

  let angle = mouth ? 0.2 : 0.05;

  ctx.arc(
    pacman.x*tile+tile/2,
    pacman.y*tile+tile/2,
    tile/2,
    angle*Math.PI,
    (2-angle)*Math.PI
  );
  ctx.fill();

  // 적
  enemies.forEach(e => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(e.x*tile+tile/2, e.y*tile+tile/2, tile/2, Math.PI, 0);
    ctx.lineTo(e.x*tile+tile, e.y*tile+tile);
    ctx.lineTo(e.x*tile, e.y*tile+tile);
    ctx.fill();
  });

  // UI
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 10, 440);
  ctx.fillText("Energy: " + energy, 300, 440);
}

function loop() {
  movePacman();
  eat();
  checkEnemy();
  checkWin();
  checkLose();

  if (score > 100) enemyCount = 7;
  if (score > 200) enemyCount = 10;

  draw();
}

setInterval(loop, 150);
spawnEnemies();

};