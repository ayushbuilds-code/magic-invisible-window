export class VideoRecorder {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    start() {
        if (this.isRecording) return;
        
        // Capture stream from canvas at 30 fps
        const stream = this.canvas.captureStream(30);
        
        const options = { mimeType: 'video/webm; codecs=vp9' };
        try {
            this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.warn('VP9 not supported, falling back to default webm', e);
            this.mediaRecorder = new MediaRecorder(stream);
        }

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.downloadVideo();
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        console.log("Recording started");
    }

    stop() {
        if (!this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log("Recording stopped");
    }

    downloadVideo() {
        const blob = new Blob(this.recordedChunks, {
            type: 'video/webm'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        
        // Generate filename magic_window_YYYYMMDD_HHMMSS.webm
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        a.download = `magic_window_${yyyy}${mm}${dd}_${hh}${min}${ss}.webm`;
        
        a.click();
        window.URL.revokeObjectURL(url);
    }
}
