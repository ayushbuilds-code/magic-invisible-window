import math
from invisible_window import calculate_rectangle

def is_valid_gesture(left_pt, right_pt, min_w=80, min_h=80):
    """
    Checks if the fingertips form a valid rectangle (large enough).
    """
    if left_pt is None or right_pt is None:
        return False
    x1, y1, x2, y2 = calculate_rectangle(left_pt, right_pt)
    return (x2 - x1) >= min_w and (y2 - y1) >= min_h

def get_distance(lm1, lm2):
    return math.sqrt((lm1.x - lm2.x)**2 + (lm1.y - lm2.y)**2)

def is_strict_gesture(full_landmarks):
    """
    Checks if both hands are making the correct strict gesture.
    Index finger extended, middle, ring, pinky curled.
    Uses distance from wrist (0) to evaluate if fingers are extended or curled.
    """
    if full_landmarks['left'] is None or full_landmarks['right'] is None:
        return False
        
    for hand_idx in ['left', 'right']:
        landmarks = full_landmarks[hand_idx].landmark
        wrist = landmarks[0]
        
        # Index finger: extended (tip 8 further from wrist than PIP 6)
        if get_distance(landmarks[8], wrist) < get_distance(landmarks[6], wrist):
            return False
            
        # Middle finger: curled (tip 12 closer to wrist than PIP 10)
        # Adding a slight tolerance multiplier (e.g. 1.1) to allow relaxed curls
        if get_distance(landmarks[12], wrist) > get_distance(landmarks[10], wrist) * 1.1:
            return False
            
        # Ring finger: curled
        if get_distance(landmarks[16], wrist) > get_distance(landmarks[14], wrist) * 1.1:
            return False
            
        # Pinky finger: curled
        if get_distance(landmarks[20], wrist) > get_distance(landmarks[18], wrist) * 1.1:
            return False
            
    return True
