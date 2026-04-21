const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tileSize = 20;
const rows = 20;
const cols = 20;

// 0: 길, 1: 벽, 2: 콩
let map = [];

function createMap() {
  map = [];
  for (let y = 0; y < rows; y++) {
    let row = [];
    for (let x = 0; x < cols; x++) {
      if (y === 0 || y === rows-1 || x === 0 || x === cols-1) {
        row.push(1);
      } else {
        row.push(2);
      }
    }
    map.push(row);
  }

  // 가운데 벽 추가
  for (let i = 5; i < 15; i++) {
    map[10][i] = 1;
  }
}

let pacman = {
  x: 1,
  y: 1,
  dir: "right"
};

let score = 0;
let energy = 3;
let enemies = [];
let enemyCount = 5;

// 🎮 키보드 입력
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") pacman.dir = "up";
  if (e.key === "ArrowDown") pacman.dir = "down";
  if (e.key === "ArrowLeft") pacman.dir = "left";
  if (e.key === "ArrowRight") pacman.dir = "right";
});

// 이동 가능 체크
function canMove(x, y) {
  if (y < 0 || y >= rows) return false;
  return map[y][x] !== 1;
}

// 팩맨 이동
function movePacman() {
  let nx = pacman.x;
  let ny = pacman.y;

  if (pacman.dir === "up") ny--;
  if (pacman.dir === "down") ny++;
  if (pacman.dir === "left") nx--;
  if (pacman.dir === "right") nx++;

  // 워프
  if (nx < 0) nx = cols - 1;
  if (nx >= cols) nx = 0;

  if (canMove(nx, ny)) {
    pacman.x = nx;
    pacman.y = ny;
  }
}

// 🍬 콩 먹기
function eatBean() {
  if (map[pacman.y][pacman.x] === 2) {
    map[pacman.y][pacman.x] = 0;
    score += 10;
  }
}

// 👾 적 생성
function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * cols);
      y = Math.floor(Math.random() * rows);
    } while (map[y][x] === 1);

    enemies.push({ x, y });
  }
}

// 충돌 체크
function checkEnemyCollision() {
  enemies.forEach(e => {
    if (e.x === pacman.x && e.y === pacman.y) {
      energy--;
      spawnEnemies(); // 다시 랜덤 위치
    }
  });
}

// 🎯 승리 체크
function checkWin() {
  let remain = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (map[y][x] === 2) remain++;
    }
  }

  if (remain === 0) {
    alert("🎉 승리!");
    resetGame();
  }
}

// 💀 패배 체크
function checkLose() {
  if (energy <= 0) {
    alert("💀 게임 오버");
    resetGame();
  }
}

// 🔄 리셋
function resetGame() {
  score = 0;
  energy = 3;
  enemyCount = 5;
  pacman.x = 1;
  pacman.y = 1;
  createMap();
  spawnEnemies();
}

// 🎨 그리기
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 맵
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (map[y][x] === 1) {
        ctx.fillStyle = "blue";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }

      if (map[y][x] === 2) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize/2,
          y * tileSize + tileSize/2,
          3, 0, Math.PI*2
        );
        ctx.fill();
      }
    }
  }

  // 팩맨 (애니메이션)
  let angle = mouthOpen ? 0.2 : 0.05;
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.moveTo(
    pacman.x * tileSize + tileSize/2,
    pacman.y * tileSize + tileSize/2
  );
  ctx.arc(
    pacman.x * tileSize + tileSize/2,
    pacman.y * tileSize + tileSize/2,
    tileSize/2,
    angle * Math.PI,
    (2 - angle) * Math.PI
  );
  ctx.fill();

  // 적
  ctx.fillStyle = "red";
  enemies.forEach(e => {
    ctx.fillRect(
      e.x * tileSize,
      e.y * tileSize,
      tileSize,
      tileSize
    );
  });

  // UI
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 10, 390);
  ctx.fillText("Energy: " + energy, 300, 390);
}

// 애니메이션
let mouthOpen = true;
setInterval(() => {
  mouthOpen = !mouthOpen;
}, 200);

// 🎮 게임 루프
function gameLoop() {
  movePacman();
  eatBean();
  checkEnemyCollision();
  checkWin();
  checkLose();

  // 난이도 증가
  if (score > 100) enemyCount = 7;
  if (score > 200) enemyCount = 10;

  draw();
}

setInterval(gameLoop, 150);

// 시작
createMap();
spawnEnemies();