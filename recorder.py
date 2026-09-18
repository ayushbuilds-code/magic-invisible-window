import cv2
import time
import os

class VideoRecorder:
    def __init__(self, fps=30.0):
        self.is_recording = False
        self.writer = None
        self.fps = fps
        self.filename = None

    def toggle_recording(self, frame_shape):
        """
        Toggles recording state. Returns the new state (True if recording, False if not).
        """
        if self.is_recording:
            self.stop()
        else:
            self.start(frame_shape)
            
        return self.is_recording

    def start(self, frame_shape):
        if self.is_recording:
            return

        h, w = frame_shape[:2]
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        self.filename = f"magic_window_{timestamp}.mp4"
        
        # 'mp4v' is a common codec for .mp4 in OpenCV
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.writer = cv2.VideoWriter(self.filename, fourcc, self.fps, (w, h))
        
        self.is_recording = True
        print(f"Started recording: {self.filename}")

    def stop(self):
        if not self.is_recording:
            return
            
        self.is_recording = False
        if self.writer:
            self.writer.release()
            self.writer = None
            print(f"Stopped recording. Saved to {self.filename}")

    def write_frame(self, frame):
        if self.is_recording and self.writer:
            self.writer.write(frame)
