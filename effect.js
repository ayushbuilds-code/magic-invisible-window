export class EffectsManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Offscreen canvas for the effect content
        this.effectCanvas = document.createElement('canvas');
        this.effectCanvas.width = width;
        this.effectCanvas.height = height;
        this.effectCtx = this.effectCanvas.getContext('2d');

        // Offscreen canvas for the feathered mask
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
        this.maskCtx = this.maskCanvas.getContext('2d');
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.effectCanvas.width = width;
        this.effectCanvas.height = height;
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
    }

    drawFeatheredMask(x1, y1, x2, y2, feather = 45, animProgress = 1.0) {
        this.maskCtx.clearRect(0, 0, this.width, this.height);
        
        let cx = (x1 + x2) / 2;
        let cy = (y1 + y2) / 2;
        let w = Math.abs(x2 - x1);
        let h = Math.abs(y2 - y1);

        // Apply animation scale
        if (animProgress < 1.0) {
            const scale = Math.pow(animProgress, 0.5);
            w *= scale;
            h *= scale;
        }

        // Draw feathered rectangle using shadow blur
        this.maskCtx.save();
        this.maskCtx.shadowBlur = feather;
        this.maskCtx.shadowColor = 'white';
        this.maskCtx.fillStyle = 'white';
        
        // Draw slightly smaller to account for the blur extending outwards
        const p = feather / 2;
        if (w - 2*p > 0 && h - 2*p > 0) {
            this.maskCtx.fillRect(cx - w/2 + p, cy - h/2 + p, w - 2*p, h - 2*p);
        } else {
            this.maskCtx.fillRect(cx - w/2, cy - h/2, w, h);
        }
        
        this.maskCtx.restore();

        return { cx, cy, w, h }; // Return animated coords for drawing borders later
    }

    applyEffect(mainCtx, frameSource, backgroundSource, rectCoords, mode, feather, animProgress) {
        const { x1, y1, x2, y2 } = rectCoords;
        const rectInfo = this.drawFeatheredMask(x1, y1, x2, y2, feather, animProgress);

        // Clear effect canvas
        this.effectCtx.clearRect(0, 0, this.width, this.height);
        this.effectCtx.save();
        
        // Flip context horizontally because webcam is mirrored
        this.effectCtx.translate(this.width, 0);
        this.effectCtx.scale(-1, 1);

        // Draw effect content
        if (mode === 1) { // 1: Invisible Window (Background)
            if (backgroundSource) {
                this.effectCtx.drawImage(backgroundSource, 0, 0, this.width, this.height);
            }
        } else {
            // Filter effects on current frame
            if (mode === 2) this.effectCtx.filter = 'grayscale(100%)';
            if (mode === 3) { /* Pixelation handled differently, but CSS filter blur/contrast hack can work, we'll use a scaled draw */ }
            if (mode === 4) this.effectCtx.filter = 'blur(20px)';
            if (mode === 5) this.effectCtx.filter = 'hue-rotate(90deg) contrast(150%)'; // Simplified glitch
            if (mode === 6) this.effectCtx.filter = 'invert(100%)';
            
            if (mode === 3) {
                // Pixelation: draw small, then draw big
                this.effectCtx.imageSmoothingEnabled = false;
                const pSize = 0.05; // 5% size
                this.effectCtx.drawImage(frameSource, 0, 0, this.width * pSize, this.height * pSize);
                this.effectCtx.drawImage(this.effectCanvas, 0, 0, this.width * pSize, this.height * pSize, 0, 0, this.width, this.height);
            } else {
                this.effectCtx.drawImage(frameSource, 0, 0, this.width, this.height);
            }
        }
        
        this.effectCtx.restore();

        // Now composite mask
        // We flip the effectCtx back to normal, but it's already rendered mirrored content.
        // The mask is drawn in standard coordinates (matching the mirrored video coordinates tracked by MediaPipe)
        this.effectCtx.globalCompositeOperation = 'destination-in';
        // Note: Mask is NOT flipped, it was drawn with normalized coordinates which already account for mirroring
        this.effectCtx.drawImage(this.maskCanvas, 0, 0);
        this.effectCtx.globalCompositeOperation = 'source-over'; // Reset

        // Finally, draw the composite onto the main canvas
        mainCtx.drawImage(this.effectCanvas, 0, 0);

        // Draw glowing border
        mainCtx.save();
        mainCtx.strokeStyle = 'white';
        
        if (animProgress < 1.0) {
            const glow = 1 - animProgress;
            mainCtx.lineWidth = 4;
            mainCtx.shadowBlur = 20;
            mainCtx.shadowColor = `rgba(255, 255, 255, ${glow})`;
            mainCtx.strokeStyle = `rgba(255, 255, 255, ${glow})`;
        } else {
            mainCtx.lineWidth = 1;
            mainCtx.shadowBlur = 0;
            mainCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        }
        
        mainCtx.strokeRect(rectInfo.cx - rectInfo.w/2, rectInfo.cy - rectInfo.h/2, rectInfo.w, rectInfo.h);
        mainCtx.restore();
    }
}
