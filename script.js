const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayEyebrow = document.querySelector(".overlay-eyebrow");
const overlayHint = document.querySelector("#overlay-hint");
const playButton = document.querySelector("#play-button");
const playLabel = document.querySelector("#play-label");
const soundButton = document.querySelector("#sound-toggle");
const scoreLabel = document.querySelector("#current-score");
const bestLabel = document.querySelector("#best-score");
const stageBestLabel = document.querySelector("#stage-best");

const width = canvas.width;
const height = canvas.height;
const groundHeight = 65;
const groundY = height - groundHeight;
const birdX = 112;
const birdRadius = 14;
const pipeWidth = 67;
const pipeGap = 166;
const pipeSpacing = 208;
const gravity = 880;
const flapVelocity = -320;
const pipeSpeed = 154;
const pipeColors = ["#43b782", "#329b71", "#5ac68d"];
const clouds = [
  { x: 73, y: 113, scale: 0.75 },
  { x: 268, y: 202, scale: 0.58 },
  { x: 341, y: 79, scale: 0.42 },
];

let state = "ready";
let birdY = 260;
let birdVelocity = 0;
let birdTilt = 0;
let score = 0;
let best = readBestScore();
let pipes = [];
let groundOffset = 0;
let animationFrame = 0;
let lastTime = 0;
let audioContext = null;
let muted = true;

function readBestScore() {
  try {
    return Number(window.localStorage.getItem("little-flight-best")) || 0;
  } catch (error) {
    console.error("Unable to read the saved best score.", error);
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem("little-flight-best", String(value));
  } catch (error) {
    console.error("Unable to save the best score.", error);
  }
}

function randomGapTop() {
  const min = 95;
  const max = groundY - pipeGap - 85;
  return min + Math.random() * (max - min);
}

function createPipe(x) {
  return { x, gapTop: randomGapTop(), scored: false };
}

function drawCloud(x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = "rgba(255, 255, 255, 0.55)";
  context.beginPath();
  context.arc(0, 12, 19, 0, Math.PI * 2);
  context.arc(21, 1, 25, 0, Math.PI * 2);
  context.arc(48, 14, 18, 0, Math.PI * 2);
  context.rect(-2, 12, 52, 18);
  context.fill();
  context.restore();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#8dd2d0");
  sky.addColorStop(1, "#d7edca");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 231, 164, 0.75)";
  context.beginPath();
  context.arc(320, 112, 32, 0, Math.PI * 2);
  context.fill();

  clouds.forEach((cloud) => {
    const x = ((cloud.x - groundOffset * 0.12) % (width + 100) + width + 100) % (width + 100) - 50;
    drawCloud(x, cloud.y, cloud.scale);
  });

  context.fillStyle = "#badfbb";
  context.beginPath();
  context.moveTo(0, groundY);
  context.lineTo(0, 427);
  context.quadraticCurveTo(78, 375, 153, 429);
  context.quadraticCurveTo(226, 478, 297, 425);
  context.quadraticCurveTo(354, 386, width, 432);
  context.lineTo(width, groundY);
  context.closePath();
  context.fill();

  context.fillStyle = "#a5d4a9";
  context.beginPath();
  context.moveTo(0, groundY);
  context.lineTo(0, 460);
  context.quadraticCurveTo(78, 411, 160, 458);
  context.quadraticCurveTo(260, 516, 334, 459);
  context.quadraticCurveTo(369, 436, width, 456);
  context.lineTo(width, groundY);
  context.closePath();
  context.fill();
}

function drawPipe(x, gapTop) {
  const bottomY = gapTop + pipeGap;
  const lowerHeight = groundY - bottomY;

  context.fillStyle = "rgba(39, 90, 67, 0.13)";
  context.fillRect(x + 5, 0, pipeWidth, gapTop);
  context.fillRect(x + 5, bottomY, pipeWidth, lowerHeight);
  context.fillStyle = pipeColors[1];
  context.fillRect(x, 0, pipeWidth, gapTop);
  context.fillRect(x, bottomY, pipeWidth, lowerHeight);

  const topGradient = context.createLinearGradient(x, 0, x + pipeWidth, 0);
  topGradient.addColorStop(0, "#35a974");
  topGradient.addColorStop(0.22, "#5bc68b");
  topGradient.addColorStop(0.76, "#4db87d");
  topGradient.addColorStop(1, "#328e68");
  context.fillStyle = topGradient;
  context.fillRect(x + 3, 0, pipeWidth - 6, gapTop);
  context.fillRect(x + 3, bottomY, pipeWidth - 6, lowerHeight);

  context.fillStyle = "#4dbb7c";
  context.fillRect(x - 5, gapTop - 23, pipeWidth + 10, 23);
  context.fillRect(x - 5, bottomY, pipeWidth + 10, 23);
  context.fillStyle = "rgba(255, 255, 255, 0.23)";
  context.fillRect(x + 3, 0, 5, gapTop - 23);
  context.fillRect(x + 3, bottomY + 23, 5, Math.max(0, lowerHeight - 23));
  context.fillRect(x, gapTop - 3, pipeWidth, 3);
  context.fillRect(x, bottomY + 20, pipeWidth, 3);
}

function drawGround() {
  context.fillStyle = "#ded49a";
  context.fillRect(0, groundY, width, groundHeight);
  context.fillStyle = "#82c76d";
  context.fillRect(0, groundY, width, 12);
  context.fillStyle = "#a7d979";
  context.fillRect(0, groundY, width, 5);

  const stripeWidth = 28;
  const offset = groundOffset % stripeWidth;
  context.fillStyle = "rgba(173, 139, 84, 0.19)";
  for (let x = -stripeWidth - offset; x < width + stripeWidth; x += stripeWidth) {
    context.beginPath();
    context.moveTo(x, groundY + 16);
    context.lineTo(x + 13, groundY + 16);
    context.lineTo(x + 24, height);
    context.lineTo(x + 11, height);
    context.closePath();
    context.fill();
  }
}

function drawBird(time) {
  const bob = state === "ready" ? Math.sin(time / 190) * 7 : 0;
  const y = birdY + bob;

  context.save();
  context.translate(birdX, y);
  context.rotate(birdTilt);

  context.fillStyle = "rgba(48, 91, 72, 0.13)";
  context.beginPath();
  context.ellipse(0, birdRadius + 4, birdRadius + 3, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#efaa3d";
  context.beginPath();
  context.moveTo(10, 0);
  context.lineTo(25, -4);
  context.lineTo(23, 5);
  context.closePath();
  context.fill();

  context.fillStyle = "#f3c54f";
  context.beginPath();
  context.ellipse(0, 0, birdRadius + 1, birdRadius - 1, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fff0c6";
  context.beginPath();
  context.ellipse(-5, 4, 8, 5, -0.25 + Math.sin(time / 48) * 0.06, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(6, -5, 4.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#344b45";
  context.beginPath();
  context.arc(7.5, -5, 2, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawFrame(time) {
  context.clearRect(0, 0, width, height);
  drawBackground();
  pipes.forEach((pipe) => drawPipe(pipe.x, pipe.gapTop));
  drawGround();
  drawBird(time);
}

function updateBestLabels() {
  bestLabel.textContent = best;
  stageBestLabel.textContent = best;
}

function updateScoreLabels() {
  scoreLabel.textContent = score;
}

function showOverlay({ title, eyebrow, copy, button, hint }) {
  overlayTitle.innerHTML = title;
  overlayEyebrow.textContent = eyebrow;
  overlayCopy.textContent = copy;
  playLabel.textContent = button;
  overlayHint.textContent = hint;
  overlay.classList.remove("is-hidden");
  playButton.focus({ preventScroll: true });
}

function hideOverlay() {
  overlay.classList.add("is-hidden");
}

function startGame() {
  score = 0;
  birdY = 260;
  birdVelocity = 0;
  birdTilt = 0;
  groundOffset = 0;
  pipes = [createPipe(width + 60), createPipe(width + 60 + pipeSpacing)];
  updateScoreLabels();
  state = "playing";
  flap();
  hideOverlay();
  canvas.focus({ preventScroll: true });
}

function endGame() {
  if (state !== "playing") return;
  state = "over";
  playSound("hit");

  if (score > best) {
    best = score;
    saveBestScore(best);
    updateBestLabels();
    showOverlay({
      eyebrow: "NEW PERSONAL BEST!",
      title: "A lovely<br>little flight.",
      copy: `You flew past ${score} ${score === 1 ? "pipe" : "pipes"}. That's your best yet!`,
      button: "Fly again",
      hint: "CLICK / TAP / SPACE TO PLAY AGAIN",
    });
    return;
  }

  showOverlay({
    eyebrow: "FLIGHT COMPLETE",
    title: "That was<br>a good run.",
    copy: `You flew past ${score} ${score === 1 ? "pipe" : "pipes"}. Fancy another go?`,
    button: "Try again",
    hint: "CLICK / TAP / SPACE TO PLAY AGAIN",
  });
}

function flap() {
  if (state !== "playing") return;
  birdVelocity = flapVelocity;
  playSound("flap");
}

function scorePipe(pipe) {
  if (pipe.scored || pipe.x + pipeWidth >= birdX) return;
  pipe.scored = true;
  score += 1;
  updateScoreLabels();
  playSound("score");
}

function birdHitsPipe(pipe) {
  const birdLeft = birdX - birdRadius + 3;
  const birdRight = birdX + birdRadius - 3;
  const birdTop = birdY - birdRadius + 3;
  const birdBottom = birdY + birdRadius - 3;
  const horizontalHit = birdRight > pipe.x && birdLeft < pipe.x + pipeWidth;
  const verticalHit = birdTop < pipe.gapTop || birdBottom > pipe.gapTop + pipeGap;
  return horizontalHit && verticalHit;
}

function update(delta) {
  if (state !== "playing") return;
  birdVelocity += gravity * delta;
  birdY += birdVelocity * delta;
  birdTilt = Math.min(1.15, Math.max(-0.55, birdVelocity / 480));
  groundOffset += pipeSpeed * delta;

  pipes.forEach((pipe) => {
    pipe.x -= pipeSpeed * delta;
    scorePipe(pipe);
    if (birdHitsPipe(pipe)) endGame();
  });
  pipes = pipes.filter((pipe) => pipe.x + pipeWidth > -10);

  if (pipes.length < 2) {
    const lastPipe = pipes[pipes.length - 1];
    pipes.push(createPipe(lastPipe ? lastPipe.x + pipeSpacing : width + 70));
  }

  if (birdY - birdRadius < 0 || birdY + birdRadius > groundY) endGame();
}

function frame(time) {
  const delta = Math.min((time - lastTime) / 1000 || 0, 1 / 30);
  lastTime = time;
  update(delta);
  drawFrame(time);
  animationFrame = window.requestAnimationFrame(frame);
}

function playSound(kind) {
  if (muted) return;

  try {
    audioContext ??= new window.AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const tones = {
      flap: { start: 490, end: 630, duration: 0.09, volume: 0.045, wave: "sine" },
      score: { start: 760, end: 1030, duration: 0.14, volume: 0.055, wave: "sine" },
      hit: { start: 220, end: 95, duration: 0.19, volume: 0.06, wave: "triangle" },
    };
    const tone = tones[kind];
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(tone.end, now + tone.duration);
    gain.gain.setValueAtTime(tone.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.duration);
  } catch (error) {
    console.error("Unable to play game sound.", error);
    muted = true;
    soundButton.classList.add("is-muted");
    soundButton.setAttribute("aria-pressed", "false");
    soundButton.setAttribute("aria-label", "Turn sound on");
    soundButton.title = "Turn sound on";
  }
}

function handleInput(event) {
  if (event.type === "keydown") {
    if (!["Space", "ArrowUp"].includes(event.code)) return;
    event.preventDefault();
  }

  if (state === "ready" || state === "over") {
    startGame();
  } else {
    flap();
  }
}

playButton.addEventListener("click", startGame);
overlay.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  event.preventDefault();
  startGame();
});
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  handleInput(event);
});
document.addEventListener("keydown", handleInput);

soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.classList.toggle("is-muted", muted);
  soundButton.setAttribute("aria-pressed", String(!muted));
  soundButton.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
  soundButton.title = muted ? "Turn sound on" : "Turn sound off";
  if (!muted) playSound("score");
});

window.addEventListener("blur", () => {
  lastTime = 0;
});

window.addEventListener("pagehide", () => {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
});

updateBestLabels();
showOverlay({
  eyebrow: "READY WHEN YOU ARE",
  title: "Take a<br>little flight.",
  copy: "A tap is all it takes.",
  button: "Let's fly",
  hint: "CLICK / TAP / SPACE",
});
drawFrame(0);
animationFrame = window.requestAnimationFrame(frame);
