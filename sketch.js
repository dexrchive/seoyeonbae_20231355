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
} // 이게 맞나?