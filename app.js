// Magic Invisible Window – main application
import { HandTracker }   from './hand_tracker.js';
import { VideoRecorder } from './recorder.js';

// ─── DOM references ────────────────────────────────────────────────────────
const videoEl         = document.getElementById('webcam');
const canvas          = document.getElementById('output_canvas');
const ctx             = canvas.getContext('2d');

const startBtn        = document.getElementById('start-btn');
const captureBgBtn    = document.getElementById('capture-bg-btn');
const statusPanel     = document.getElementById('status-panel');
const effectDisplay   = document.getElementById('effect-mode-display');
const recIndicator    = document.getElementById('rec-indicator');
const toastEl         = document.getElementById('toast-message');
const bgStatusDisplay = document.getElementById('bg-status-display');
const debugPanel      = document.getElementById('debug-panel');

// ─── State ─────────────────────────────────────────────────────────────────
let handTracker  = null;
let recorder     = null;
let lastVideoTime = -1;
let showDebug    = true;   // debug panel is shown after camera starts

// Reference background frame (offscreen canvas, same size as main canvas)
const refCanvas = document.createElement('canvas');
const refCtx    = refCanvas.getContext('2d');
let bgCaptured  = false;

// ─── Helpers ───────────────────────────────────────────────────────────────
function showToast(msg, ms = 2500) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._tid);
    toastEl._tid = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

function updateDebug(lines) {
    if (!showDebug) { debugPanel.style.display = 'none'; return; }
    debugPanel.style.display = 'block';
    debugPanel.innerHTML = lines.join('<br>');
}

function captureBackground() {
    if (!videoEl.videoWidth) { showToast('⚠ Camera not ready yet.'); return; }

    refCtx.save();
    // Draw mirrored frame (same transform as the main canvas render)
    refCtx.translate(refCanvas.width, 0);
    refCtx.scale(-1, 1);
    refCtx.drawImage(videoEl, 0, 0, refCanvas.width, refCanvas.height);
    refCtx.restore();

    bgCaptured = true;
    bgStatusDisplay.textContent = 'Captured ✓';
    bgStatusDisplay.style.color = '#00e5ff';
    showToast('✓ Background captured');
    console.log('[BG] Reference frame captured.');
}

// ─── Camera startup ────────────────────────────────────────────────────────
async function startCamera() {
    startBtn.disabled    = true;
    startBtn.textContent = 'Starting…';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
        });

        videoEl.srcObject = stream;

        // Use 'loadeddata' (not 'loadedmetadata') to ensure frame data is available
        videoEl.addEventListener('loadeddata', onCameraReady, { once: true });
        await videoEl.play();

        console.log('[Camera] Stream started.');
    } catch (err) {
        startBtn.disabled    = false;
        startBtn.textContent = '▶ Start Camera';
        const msg = err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Camera error: ' + err.message;
        showToast('⚠ ' + msg, 5000);
        console.error('[Camera]', err);
    }
}

async function onCameraReady() {
    console.log('[Camera] Video ready:', videoEl.videoWidth, '×', videoEl.videoHeight);

    // Sync all canvas sizes to the actual video resolution
    const W = videoEl.videoWidth  || 1280;
    const H = videoEl.videoHeight || 720;
    canvas.width  = W;
    canvas.height = H;
    refCanvas.width  = W;
    refCanvas.height = H;

    // Update UI
    startBtn.style.display = 'none';
    captureBgBtn.classList.remove('hidden');
    statusPanel.classList.remove('hidden');
    debugPanel.style.display = 'block';
    updateDebug(['CAMERA: OK  ' + W + '×' + H, 'MEDIAPIPE: LOADING…', 'HANDS: —']);

    // Initialise MediaPipe HandLandmarker
    try {
        handTracker = new HandTracker();
        await handTracker.initialize();
        showToast('✓ Ready – show your hands!');
        console.log('[MediaPipe] HandLandmarker ready.');
    } catch (err) {
        updateDebug(['CAMERA: OK', 'MEDIAPIPE: ❌ ERROR', String(err)]);
        showToast('❌ MediaPipe failed: ' + err.message, 6000);
        console.error('[MediaPipe]', err);
        return;   // render loop not started – nothing to do without hand tracking
    }

    recorder = new VideoRecorder(canvas);

    // Auto-capture a reference background after 2 s (user can redo it manually)
    setTimeout(() => { if (!bgCaptured) captureBackground(); }, 2000);

    // Kick off the render loop
    requestAnimationFrame(renderLoop);
}

// ─── Render loop ───────────────────────────────────────────────────────────
function renderLoop() {
    requestAnimationFrame(renderLoop);   // always re-schedule first

    // Throttle: skip if no new video frame has arrived
    if (videoEl.readyState < 2) return;
    if (videoEl.currentTime === lastVideoTime) return;
    lastVideoTime = videoEl.currentTime;

    const W = canvas.width;
    const H = canvas.height;

    // ── 1. Clear & draw mirrored camera feed ──────────────────────────────
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, W, H);
    ctx.restore();

    // ── 2. Hand detection ─────────────────────────────────────────────────
    const { fingertips, fullLandmarks, handCount } = handTracker.detect(videoEl, performance.now());

    // ── 3. Draw all 21 landmarks ──────────────────────────────────────────
    const drawLandmarks = (lmArray, dotColor) => {
        if (!lmArray) return;
        ctx.fillStyle = dotColor;
        lmArray.forEach(pt => {
            ctx.beginPath();
            // Mirror: MediaPipe x is in camera space; screen x = (1-x)*W
            ctx.arc((1 - pt.x) * W, pt.y * H, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });
    };
    drawLandmarks(fullLandmarks.left,  'rgba(0,220,110,0.85)');
    drawLandmarks(fullLandmarks.right, 'rgba(0,180,255,0.85)');

    // ── 4. Highlight index fingertips (landmark 8) ────────────────────────
    const drawTip = (tip, fill) => {
        if (!tip) return;
        const sx = (1 - tip.x) * W;
        const sy = tip.y * H;
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, Math.PI * 2);
        ctx.fillStyle   = fill;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2.5;
        ctx.fill();
        ctx.stroke();
    };
    drawTip(fingertips.left,  '#00ff77');
    drawTip(fingertips.right, '#00ccff');

    // ── 5. Compute bounding rectangle between the two index fingertips ─────
    let rect = null;
    if (fingertips.left && fingertips.right) {
        const ax = (1 - fingertips.left.x)  * W,  ay = fingertips.left.y  * H;
        const bx = (1 - fingertips.right.x) * W,  by = fingertips.right.y * H;

        rect = {
            left:   Math.min(ax, bx),
            top:    Math.min(ay, by),
            right:  Math.max(ax, bx),
            bottom: Math.max(ay, by)
        };
        rect.width  = rect.right  - rect.left;
        rect.height = rect.bottom - rect.top;

        // Draw a visible dashed border
        ctx.save();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth   = 3;
        ctx.setLineDash([14, 7]);
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── 6. Invisible effect: paste reference background inside rectangle ──
    if (bgCaptured && rect && rect.width > 15 && rect.height > 15) {
        applyInvisibleEffect(rect, W, H);
    }

    // ── 7. Debug panel ────────────────────────────────────────────────────
    const coord = tip => tip
        ? `(${((1 - tip.x) * W).toFixed(0)}, ${(tip.y * H).toFixed(0)})`
        : '—';

    updateDebug([
        `CAMERA:      OK  ${W}×${H}`,
        `MEDIAPIPE:   ${handTracker.ready ? 'READY ✓' : 'LOADING…'}`,
        `HANDS:       ${handCount}`,
        `INDEX A:     ${coord(fingertips.left)}`,
        `INDEX B:     ${coord(fingertips.right)}`,
        `RECT:        ${rect ? `${rect.width.toFixed(0)}×${rect.height.toFixed(0)} ✓` : 'INACTIVE'}`,
        `BACKGROUND:  ${bgCaptured ? 'CAPTURED ✓' : 'NOT CAPTURED'}`,
    ]);
}

// ─── Invisible compositing ─────────────────────────────────────────────────
function applyInvisibleEffect(rect, W, H) {
    // Build a soft-edged mask on an offscreen canvas
    const maskC = new OffscreenCanvas(W, H);
    const maskX = maskC.getContext('2d');
    const feather = 20;

    // Draw a white rectangle with shadow-blur to create feathered edges
    maskX.shadowBlur  = feather;
    maskX.shadowColor = 'white';
    maskX.fillStyle   = 'white';
    const p = feather / 2;
    maskX.fillRect(
        rect.left + p,
        rect.top  + p,
        rect.width  - 2 * p,
        rect.height - 2 * p
    );

    // 'destination-out' punches a hole in what's already on the canvas
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(maskC, 0, 0);

    // 'destination-over' paints the reference frame UNDER the remaining pixels
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(refCanvas, 0, 0);

    ctx.restore();  // restores globalCompositeOperation to 'source-over'
}

// ─── Keyboard shortcuts ────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();

    if (k === ' ' || k === 'b') {
        e.preventDefault();
        captureBackground();
    } else if (k === 'd') {
        showDebug = !showDebug;
    } else if (k === 'r') {
        if (!recorder) return;
        if (recorder.isRecording) {
            recorder.stop();
            recIndicator.classList.add('hidden');
            showToast('Recording saved ✓');
        } else {
            recorder.start();
            recIndicator.classList.remove('hidden');
            showToast('● Recording…');
        }
    }
});

// ─── Button click listeners ────────────────────────────────────────────────
startBtn.addEventListener('click', startCamera);
captureBgBtn.addEventListener('click', captureBackground);
