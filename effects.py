import cv2
import numpy as np

def apply_effect_to_roi(frame, background, mask, mode):
    """
    Applies the selected visual effect inside the masked region.
    
    Modes:
    1: Invisible Window (Background replacement)
    2: Grayscale
    3: Pixelation
    4: Gaussian Blur
    5: RGB Glitch
    6: Negative
    """
    if mode == 1:
        # 1: Background Replacement
        return (background * mask + frame * (1 - mask)).astype(np.uint8)
        
    elif mode == 2:
        # 2: Grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        return (gray_bgr * mask + frame * (1 - mask)).astype(np.uint8)
        
    elif mode == 3:
        # 3: Pixelation
        h, w = frame.shape[:2]
        small = cv2.resize(frame, (w // 15, h // 15), interpolation=cv2.INTER_LINEAR)
        pixelated = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
        return (pixelated * mask + frame * (1 - mask)).astype(np.uint8)
        
    elif mode == 4:
        # 4: Gaussian Blur
        blurred = cv2.GaussianBlur(frame, (51, 51), 0)
        return (blurred * mask + frame * (1 - mask)).astype(np.uint8)
        
    elif mode == 5:
        # 5: RGB Glitch (Channel shift)
        glitch = frame.copy()
        shift = 15
        # Shift Red channel right
        glitch[:, shift:, 2] = frame[:, :-shift, 2]
        # Shift Blue channel left
        glitch[:, :-shift, 0] = frame[:, shift:, 0]
        return (glitch * mask + frame * (1 - mask)).astype(np.uint8)
        
    elif mode == 6:
        # 6: Negative
        negative = cv2.bitwise_not(frame)
        return (negative * mask + frame * (1 - mask)).astype(np.uint8)
        
    else:
        # Fallback to normal invisible window
        return (background * mask + frame * (1 - mask)).astype(np.uint8)
