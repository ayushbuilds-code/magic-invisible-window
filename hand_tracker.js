import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

export class HandTracker {
    constructor() {
        this.handLandmarker = null;
        this.prevLeft  = null;
        this.prevRight = null;
        this.smoothing = 0.4; // 0 = no smoothing, 1 = full smoothing
        this.ready = false;
        this.error = null;
    }

    async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
            );
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            this.ready = true;
            console.log("[HandTracker] Initialized successfully.");
        } catch (err) {
            this.error = err;
            console.error("[HandTracker] Initialization failed:", err);
            throw err;
        }
    }

    /**
     * Detect hands in the current video frame.
     * Returns:
     *   fingertips   – { left: {x,y}|null, right: {x,y}|null }  (normalized 0-1)
     *   fullLandmarks – { left: Array[21]|null, right: Array[21]|null }
     *   handCount    – number of hands detected (0, 1, or 2)
     */
    detect(videoElement, timestamp) {
        if (!this.handLandmarker) {
            return { fingertips: { left: null, right: null }, fullLandmarks: { left: null, right: null }, handCount: 0 };
        }

        const results = this.handLandmarker.detectForVideo(videoElement, timestamp);

        const fingertips    = { left: null, right: null };
        const fullLandmarks = { left: null, right: null };
        const handCount     = results.landmarks ? results.landmarks.length : 0;

        if (handCount > 0) {
            // Build array of { landmarks, tipX, tipY } for each detected hand
            const hands = results.landmarks.map(lm => ({
                landmarks: lm,
                tipX: lm[8].x,  // index fingertip (landmark 8), normalized 0-1
                tipY: lm[8].y
            }));

            // Sort by tipX ascending → smaller X = more to the left in camera space
            hands.sort((a, b) => a.tipX - b.tipX);

            // Assign first (leftmost) to "left", second to "right"
            // Apply exponential smoothing to reduce jitter
            const applySmooth = (prev, rawX, rawY) => {
                if (!prev) return { x: rawX, y: rawY };
                return {
                    x: prev.x * this.smoothing + rawX * (1 - this.smoothing),
                    y: prev.y * this.smoothing + rawY * (1 - this.smoothing)
                };
            };

            this.prevLeft  = applySmooth(this.prevLeft,  hands[0].tipX, hands[0].tipY);
            fingertips.left      = this.prevLeft;
            fullLandmarks.left   = hands[0].landmarks;

            if (hands[1]) {
                this.prevRight = applySmooth(this.prevRight, hands[1].tipX, hands[1].tipY);
                fingertips.right     = this.prevRight;
                fullLandmarks.right  = hands[1].landmarks;
            } else {
                this.prevRight = null;
            }
        } else {
            // No hands detected – reset smooth history
            this.prevLeft  = null;
            this.prevRight = null;
        }

        return { fingertips, fullLandmarks, handCount };
    }
}
