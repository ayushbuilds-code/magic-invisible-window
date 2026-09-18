import cv2
import mediapipe as mp
import numpy as np

class HandTracker:
    def __init__(self, max_hands=2, detection_con=0.7, tracking_con=0.7):
        """
        Initializes the MediaPipe Hands module.
        """
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_con,
            min_tracking_confidence=tracking_con
        )
        self.mp_draw = mp.solutions.drawing_utils
        
        # For smoothing the fingertip coordinates
        self.prev_left_idx = None
        self.prev_right_idx = None
        self.smoothing_factor = 0.5  # 0.0 means no smoothing, closer to 1.0 means more smoothing

    def process_frame(self, frame):
        """
        Processes the frame to detect hands and extract index fingertip coordinates.
        Returns a tuple (fingertips, full_landmarks):
        - fingertips: dictionary with 'left' and 'right' index fingertips (x, y).
        - full_landmarks: dictionary with 'left' and 'right' raw MediaPipe hand landmarks.
        """
        # Convert the BGR image to RGB
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the RGB image
        results = self.hands.process(img_rgb)
        
        fingertips = {'left': None, 'right': None}
        full_landmarks = {'left': None, 'right': None}
        
        if results.multi_hand_landmarks and results.multi_handedness:
            h, w, c = frame.shape
            for idx, hand_handedness in enumerate(results.multi_handedness):
                hand_label = hand_handedness.classification[0].label.lower() # 'left' or 'right'
                
                # MediaPipe assumes selfie view (mirrored), so we swap left/right to match physical hands
                # if the user hasn't mirrored the webcam. Assuming webcam is mirrored, we leave it as is or handle it in main.
                # Usually it's better to just use the label if the webcam is mirrored.
                
                hand_landmarks = results.multi_hand_landmarks[idx]
                
                # Landmark 8 is the index fingertip
                index_finger_lm = hand_landmarks.landmark[self.mp_hands.HandLandmark.INDEX_FINGER_TIP]
                cx, cy = int(index_finger_lm.x * w), int(index_finger_lm.y * h)
                
                # Apply temporal smoothing
                if hand_label == 'left':
                    if self.prev_left_idx is None:
                        self.prev_left_idx = (cx, cy)
                    else:
                        cx = int(self.prev_left_idx[0] * self.smoothing_factor + cx * (1 - self.smoothing_factor))
                        cy = int(self.prev_left_idx[1] * self.smoothing_factor + cy * (1 - self.smoothing_factor))
                        self.prev_left_idx = (cx, cy)
                    fingertips['left'] = (cx, cy)
                    full_landmarks['left'] = hand_landmarks
                else:
                    if self.prev_right_idx is None:
                        self.prev_right_idx = (cx, cy)
                    else:
                        cx = int(self.prev_right_idx[0] * self.smoothing_factor + cx * (1 - self.smoothing_factor))
                        cy = int(self.prev_right_idx[1] * self.smoothing_factor + cy * (1 - self.smoothing_factor))
                        self.prev_right_idx = (cx, cy)
                    fingertips['right'] = (cx, cy)
                    full_landmarks['right'] = hand_landmarks

        # Reset prev points if hand is lost
        if fingertips['left'] is None:
            self.prev_left_idx = None
        if fingertips['right'] is None:
            self.prev_right_idx = None
            
        return fingertips, full_landmarks
