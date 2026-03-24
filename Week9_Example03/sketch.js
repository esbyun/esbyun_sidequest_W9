/*
  Week 9 — Example 3: Adding Sound & Music

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Mar. 19, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack

  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
      = empty (no sprite)

  Debug Controls (toggle panel with backtick `):
    G Toggle moon gravity on/off
    F Toggle fly / no-clip mode
*/

let player;
let playerImg, bgImg;
let jumpSfx, musicSfx;
let musicStarted = false;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false; // track if the player is attacking
let attackFrameCounter = 0; // tracking attack animation

// --- TILE MAP ---
// an array that uses the tile key to create the level
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "       ggg    ",
  "gggggggggggggg", // surface ground
  "dddddddddddddd", // deep ground
];

// --- LEVEL CONSTANTS ---
// camera view size
const VIEWW = 320,
  VIEWH = 180;

// tile width & height
const TILE_W = 24,
  TILE_H = 24;

// size of individual animation frames
const FRAME_W = 32,
  FRAME_H = 32;

// Y-coordinate of player start (4 tiles above the bottom)
const MAP_START_Y = VIEWH - TILE_H * 4;

// gravity
const GRAVITY = 10;

// moon gravity
const MOON_GRAVITY = 4;

// debug state
let debugOpen = false; // is the panel visible?
let moonGravity = false; // moon gravity toggle
let flyMode = false; // fly / no-clip toggle

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  // --- SOUND ---
  if (typeof loadSound === "function") {
    jumpSfx = loadSound("assets/sfx/jump.wav");
    musicSfx = loadSound("assets/sfx/music.wav");
  }
}

function setup() {
  // pixelated rendering with autoscaling
  new Canvas(VIEWW, VIEWH, "pixelated");

  // needed to correct an visual artifacts from attempted antialiasing
  allSprites.pixelPerfect = true;

  world.gravity.y = GRAVITY;

  // Try to start background music immediately.
  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

  // --- TILE GROUPS ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  // a Tiles object creates a level based on the level map array (defined at the beginning)
  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // --- PLAYER ---
  player = new Sprite(FRAME_W, MAP_START_Y, FRAME_W, FRAME_H); // create the player
  player.spriteSheet = playerImg; // use the sprite sheet
  player.rotationLock = true; // turn off rotations (player shouldn't rotate)

  // player animation parameters
  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4; // offset the collision box up
  player.addAnis(playerAnis); // add the player animations defined earlier
  player.ani = "idle"; // default to the idle animation
  player.w = 18; // set the width of the collsion box
  player.h = 20; // set the height of the collsion box
  player.friction = 0; // set the friciton to 0 so we don't stick to walls
  player.bounciness = 0; // set the bounciness to 0 so the player doesn't bounce

  // --- GROUND SENSOR --- for use when detecting if the player is standing on the ground
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;
  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;
}

function startMusicIfNeeded() {
  if (musicStarted || !musicSfx) return;

  const startLoop = () => {
    if (!musicSfx.isPlaying()) musicSfx.play();
    musicStarted = musicSfx.isPlaying();
  };

  // Some browsers require a user gesture before audio can start.
  const maybePromise = userStartAudio();
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.then(startLoop).catch(() => {});
  } else {
    startLoop();
  }
}

function keyPressed() {
  startMusicIfNeeded();

  // backtick toggles the debug panel open/closed
  if (key === "/") {
    debugOpen = !debugOpen;
  }

  // G and F only fire when the debug panel is open
  if (debugOpen) {
    // G = toggle moon gravity
    if (key === "g" || key === "G") {
      moonGravity = !moonGravity;
      world.gravity.y = moonGravity ? MOON_GRAVITY : GRAVITY;
    }

    // F = toggle fly / no-clip mode
    if (key === "f" || key === "F") {
      flyMode = !flyMode;
      player.gravityScale = flyMode ? 0 : 1; // disable/re-enable gravity on player
      if (flyMode) player.vel.y = 0; // stop falling the moment fly turns on
    }
  }
}

function mousePressed() {
  startMusicIfNeeded();
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, bgImg.width, bgImg.height);
  camera.on();

  // --- PLAYER CONTROLS ---
  // first check to see if the player is on the ground
  let grounded = sensor.overlapping(ground);

  // fly mode block (runs instead of normal movement when active)
  if (flyMode) {
    player.vel.x = 0;
    player.vel.y = 0;
    const FLY_SPEED = 2;
    if (kb.pressing("up")) player.vel.y = -FLY_SPEED;
    if (kb.pressing("down")) player.vel.y = FLY_SPEED;
    if (kb.pressing("left")) {
      player.vel.x = -FLY_SPEED;
      player.mirror.x = true;
    }
    if (kb.pressing("right")) {
      player.vel.x = FLY_SPEED;
      player.mirror.x = false;
    }
    player.ani = "jump";
    player.ani.frame = 0;
  } else {
    // original movement block wrapped in this else{} so it only runs when fly mode is off

    // attack input
    if (grounded && !attacking && kb.presses("space")) {
      attacking = true;
      attackFrameCounter = 0;
      player.vel.x = 0;
      player.ani.frame = 0;
      player.ani = "attack";
      player.ani.play();
    }

    // jump
    if (grounded && kb.presses("up")) {
      player.vel.y = -4;
      if (jumpSfx) jumpSfx.play();
    }

    // state machine
    if (attacking) {
      attackFrameCounter++;
      if (attackFrameCounter > 12) {
        attacking = false;
        attackFrameCounter = 0;
      }
    } else if (!grounded) {
      player.ani = "jump";
      player.ani.frame = player.vel.y < 0 ? 0 : 1;
    } else {
      player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
    }

    // movement
    if (!attacking) {
      player.vel.x = 0;
      if (kb.pressing("left")) {
        player.vel.x = -1.5;
        player.mirror.x = true;
      } else if (kb.pressing("right")) {
        player.vel.x = 1.5;
        player.mirror.x = false;
      }
    }
  } // end of else (fly mode off)

  // keep in view
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // draw debug panel or hint depending on whether panel is open
  if (debugOpen) {
    drawDebugPanel();
  } else {
    drawDebugHint();
  }
}

// entire function (draws debug overlay panel)
function drawDebugPanel() {
  camera.off();

  const PX = 4,
    PY = 4;
  const PW = 150,
    PH = 105;
  const LINE_H = 13;

  noStroke();
  fill(0, 0, 0, 160);
  rect(PX, PY, PW, PH, 3);

  fill(40, 40, 80, 220);
  rect(PX, PY, PW, 19, 3, 3, 0, 0);

  textSize(8);
  fill(200, 200, 255);
  noStroke();
  text("[ DEBUG ]  / to close", PX + 5, PY + 12);

  let row = 0;
  const rowY = () => PY + 29 + row * LINE_H;

  drawToggleRow(PX + 5, rowY(), "G  Moon Gravity", moonGravity);
  row++;
  drawToggleRow(PX + 5, rowY(), "F  Fly / No-Clip", flyMode);
  row++;
  row++;

  textSize(8);
  fill(180, 220, 180);
  text(
    `pos  x:${nf(player.pos.x, 3, 1)}  y:${nf(player.pos.y, 3, 1)}`,
    PX + 5,
    rowY(),
  );
  row++;
  text(
    `vel  x:${nf(player.vel.x, 2, 2)}  y:${nf(player.vel.y, 2, 2)}`,
    PX + 5,
    rowY(),
  );
  row++;
  text(`grav  ${nf(world.gravity.y, 1, 2)}`, PX + 5, rowY());

  camera.on();
}

// entire function (draws one toggle row inside debug panel)
function drawToggleRow(x, y, label, isOn) {
  fill(isOn ? color(80, 220, 100) : color(180, 60, 60));
  noStroke();
  ellipse(x + 4, y - 3, 6, 6);

  textSize(8);
  fill(isOn ? color(180, 255, 180) : color(200, 180, 180));
  text(label, x + 12, y);

  fill(isOn ? color(40, 120, 50) : color(100, 40, 40));
  rect(x + 110, y - 8, 26, 10, 2);
  fill(255);
  textSize(8);
  text(isOn ? "ON" : "OFF", x + 113, y);
}

// entire function (draws small hint in the corner when panel is closed)
function drawDebugHint() {
  camera.off();
  noStroke();
  fill(0, 0, 0, 100);
  rect(VIEWW - 65, 2, 58, 12, 2);
  textSize(8);
  fill(200, 200, 200);
  text("/ = debug", VIEWW - 59, 11);
  camera.on();
}
