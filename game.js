// ---- The Doors ----------------------------------------------------------
// Identical rooms. A hidden door sequence opens the way forward.
//
// THE TRICK:
//   - Go back from a CORRECT room  -> you return through the door you entered.
//   - Go back from a WRONG room    -> you are spat out the *other* wrong door.
// Noticing that mismatch is the only way to map the correct sequence.
// -------------------------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const msgEl = document.getElementById("msg");

// Geometry -----------------------------------------------------------------
const W = 600, H = 600;
const roomLeft = 90, roomRight = 510, roomTop = 90, roomBottom = 510;
const R = 13;                 // player radius
const SPEED = 3.2;
const DOOR_HALF = 34;         // half-width of a door opening
const TRIGGER = 18;           // distance from wall that counts as "through"

const DOORS = ["L", "C", "R"];
const doorX = { L: 180, C: 300, R: 420 };
const doorName = { L: "Left", C: "Centre", R: "Right" };

// The puzzle ---------------------------------------------------------------
const PATH_LEN = 4;
let PATH = [];   // the winning sequence, derived from a seed
let SEED = 0;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPath(seed) {
  SEED = seed >>> 0;
  const rng = mulberry32(SEED);
  PATH = Array.from({ length: PATH_LEN }, () => DOORS[Math.floor(rng() * 3)]);
  const seedEl = document.getElementById("seed");
  if (seedEl) seedEl.textContent = "seed " + SEED.toString(36).toUpperCase();
}

function pathWords() {
  return PATH.map(d => doorName[d]).join(" · ");
}

// State --------------------------------------------------------------------
let loc;          // { type:'path', depth } | { type:'wrong', origin, taken }
let player;       // { x, y }
let won;
let cooldownUntil = 0;
const keys = {};

function reset(seed) {
  if (seed === undefined) seed = Math.floor(Math.random() * 0xFFFFFFFF);
  buildPath(seed);
  loc = { type: "path", depth: 0 };
  player = { x: 300, y: roomBottom - 50 };
  won = false;
  cooldownUntil = 0;
  flash("");
}

// Which wrong door you get ejected from (not the correct one, not the one taken)
function otherWrongDoor(origin, taken) {
  const correct = PATH[origin];
  return DOORS.find(d => d !== correct && d !== taken);
}

let flashTimer = null;
function flash(text) {
  msgEl.textContent = text;
  msgEl.style.opacity = text ? "1" : "0";
  if (flashTimer) clearTimeout(flashTimer);
  if (text) {
    flashTimer = setTimeout(() => {
      msgEl.textContent = "";
      msgEl.style.opacity = "0";
    }, 3000);
  }
}

// Door transitions ---------------------------------------------------------
function goForward(door) {
  if (loc.type === "path") {
    const d = loc.depth;
    if (door === PATH[d]) {
      if (d + 1 === PATH.length) { win(); return; }
      loc = { type: "path", depth: d + 1 };
      enterFromBack();
    } else {
      loc = { type: "wrong", origin: d, taken: door };
      enterFromBack();
    }
  } else {
    // Any forward door in a wrong room: you wander and wash up at the start.
    // No message — the room is identical; the player must not be told.
    loc = { type: "path", depth: 0 };
    enterFromBack();
  }
}

function goBack() {
  if (loc.type === "path") {
    if (loc.depth === 0) {
      flash("The door behind you is locked.");
      shake();
      return;
    }
    const d = loc.depth;
    loc = { type: "path", depth: d - 1 };
    enterFromTop(PATH[d - 1]);        // return through the door you came in by
  } else {
    const { origin, taken } = loc;
    const out = otherWrongDoor(origin, taken);
    loc = { type: "path", depth: origin };
    enterFromTop(out);               // ejected from a DIFFERENT door — the tell
  }
}

function enterFromBack() {
  player = { x: 300, y: roomBottom - 50 };
  cooldownUntil = performance.now() + 280;
}
function enterFromTop(door) {
  player = { x: doorX[door], y: roomTop + 50 };
  cooldownUntil = performance.now() + 280;
}

function win() {
  won = true;
}

// Tiny screen shake on locked door ----------------------------------------
let shakeT = 0;
function shake() { shakeT = 12; }

// Input --------------------------------------------------------------------
const MOVE_KEYS = ["arrowup","arrowdown","arrowleft","arrowright"];
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (MOVE_KEYS.includes(k)) e.preventDefault();
});
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
document.getElementById("reset").addEventListener("click", () => reset());

function vel() {
  let vx = 0, vy = 0;
  if (keys["a"] || keys["arrowleft"])  vx -= 1;
  if (keys["d"] || keys["arrowright"]) vx += 1;
  if (keys["w"] || keys["arrowup"])    vy -= 1;
  if (keys["s"] || keys["arrowdown"])  vy += 1;
  if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
  return { vx: vx * SPEED, vy: vy * SPEED };
}

// Update -------------------------------------------------------------------
function update() {
  if (won) return;
  const { vx, vy } = vel();
  let nx = player.x + vx;
  let ny = player.y + vy;

  const now = performance.now();
  if (now >= cooldownUntil) {
    // top doors (forward)
    if (ny - R <= roomTop + TRIGGER) {
      for (const d of DOORS) {
        if (Math.abs(nx - doorX[d]) <= DOOR_HALF) { goForward(d); return; }
      }
    }
    // bottom door (back)
    if (ny + R >= roomBottom - TRIGGER && Math.abs(nx - doorX.C) <= DOOR_HALF) {
      goBack(); return;
    }
  }

  // confine to the room
  player.x = Math.max(roomLeft + R, Math.min(roomRight - R, nx));
  player.y = Math.max(roomTop + R, Math.min(roomBottom - R, ny));
}

// Render -------------------------------------------------------------------
function drawDoor(cx, cy, horizontal, locked) {
  ctx.save();
  ctx.fillStyle = locked ? "#5a2a2a" : "#3a2a1c";
  ctx.strokeStyle = locked ? "#9c4a4a" : "#6b4e2e";
  ctx.lineWidth = 2;
  const long = DOOR_HALF * 2, thick = 16;
  let x, y, w, h;
  if (horizontal) { x = cx - long/2; y = cy - thick/2; w = long; h = thick; }
  else            { x = cx - thick/2; y = cy - long/2; w = thick; h = long; }
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  if (locked) {
    ctx.fillStyle = "#d98a8a";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#caa15e"; // handle
    ctx.beginPath();
    ctx.arc(horizontal ? cx + long/2 - 8 : cx, horizontal ? cy : cy + long/2 - 8, 2.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  let ox = 0, oy = 0;
  if (shakeT > 0) {
    ox = (Math.random() - 0.5) * shakeT;
    oy = (Math.random() - 0.5) * shakeT;
    shakeT *= 0.8;
    if (shakeT < 0.5) shakeT = 0;
  }
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(ox, oy);

  // floor
  ctx.fillStyle = "#171b24";
  ctx.fillRect(roomLeft, roomTop, roomRight - roomLeft, roomBottom - roomTop);

  // faint floor grid so movement reads
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let gx = roomLeft; gx <= roomRight; gx += 42) {
    ctx.beginPath(); ctx.moveTo(gx, roomTop); ctx.lineTo(gx, roomBottom); ctx.stroke();
  }
  for (let gy = roomTop; gy <= roomBottom; gy += 42) {
    ctx.beginPath(); ctx.moveTo(roomLeft, gy); ctx.lineTo(roomRight, gy); ctx.stroke();
  }

  // walls
  ctx.strokeStyle = "#2c3340";
  ctx.lineWidth = 6;
  ctx.strokeRect(roomLeft, roomTop, roomRight - roomLeft, roomBottom - roomTop);

  // doors
  drawDoor(doorX.L, roomTop, true, false);
  drawDoor(doorX.C, roomTop, true, false);
  drawDoor(doorX.R, roomTop, true, false);
  // back door is drawn identical to the others — "locked" only reveals on attempt
  drawDoor(doorX.C, roomBottom, true, false);

  // player
  ctx.save();
  ctx.shadowColor = "rgba(120,180,255,0.7)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#8fc0ff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  if (won) {
    ctx.fillStyle = "rgba(8,10,14,0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8e6df";
    ctx.textAlign = "center";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText("You found the way out.", W/2, H/2 - 8);
    ctx.fillStyle = "#c9b27a";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(pathWords(), W/2, H/2 + 26);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// initial seed: ?seed=ABC (base36) reproduces a combination; otherwise random
const urlSeed = new URLSearchParams(location.search).get("seed");
reset(urlSeed != null ? parseInt(urlSeed, 36) : undefined);
loop();
