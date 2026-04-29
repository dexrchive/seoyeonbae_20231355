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