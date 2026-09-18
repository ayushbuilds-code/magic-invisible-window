import cv2
import numpy as np
from effects import apply_effect_to_roi
from gesture_parser import is_valid_gesture

def calculate_rectangle(left_pt, right_pt, padding=0):
    """
    Normalizes the coordinates so that x1 < x2 and y1 < y2.
    """
    x1, y1 = left_pt
    x2, y2 = right_pt
    
    # Ensure x1 < x2 and y1 < y2
    rx1, rx2 = min(x1, x2), max(x1, x2)
    ry1, ry2 = min(y1, y2), max(y1, y2)
    
    # Apply optional padding
    rx1 -= padding
    ry1 -= padding
    rx2 += padding
    ry2 += padding
    
    return rx1, ry1, rx2, ry2

def create_feathered_mask(shape, rect_coords, feather_amount=21):
    """
    Creates a feathered (blurred) mask for the rectangular region.
    """
    x1, y1, x2, y2 = rect_coords
    
    # Ensure coordinates are within bounds
    h, w = shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    mask = np.zeros((h, w), dtype=np.float32)
    
    if x2 > x1 and y2 > y1:
        mask[y1:y2, x1:x2] = 1.0
        
    # Apply Gaussian blur for feathering
    if feather_amount > 0:
        # Kernel size must be odd
        ksize = feather_amount if feather_amount % 2 != 0 else feather_amount + 1
        mask = cv2.GaussianBlur(mask, (ksize, ksize), 0)
        
    # Expand dims to easily broadcast with 3-channel image
    mask = np.expand_dims(mask, axis=-1)
    return mask

# Removed duplicate is_valid_gesture since it's now imported from gesture_parser

def apply_invisible_effect(frame, background, left_pt, right_pt, feather_amount=21, effect_mode=1, anim_progress=1.0):
    """
    Replaces the rectangle area in the frame using the selected effect mode.
    Includes portal animation (scales the rectangle based on anim_progress 0.0 -> 1.0).
    """
    # Calculate rectangle coordinates
    x1, y1, x2, y2 = calculate_rectangle(left_pt, right_pt)
    
    # Apply portal animation scaling
    if anim_progress < 1.0:
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        w, h = (x2 - x1), (y2 - y1)
        # Ease out cubic or similar effect (anim_progress^0.5 for quick snap open)
        scale = anim_progress ** 0.5
        x1 = int(cx - (w / 2) * scale)
        x2 = int(cx + (w / 2) * scale)
        y1 = int(cy - (h / 2) * scale)
        y2 = int(cy + (h / 2) * scale)
    
    # Create feathered mask
    mask = create_feathered_mask(frame.shape, (x1, y1, x2, y2), feather_amount=feather_amount)
    
    # Apply selected dynamic effect
    blended = apply_effect_to_roi(frame, background, mask, effect_mode)
    
    # Draw animated glowing outline
    if anim_progress < 1.0:
        # Glow pulse based on animation progress
        glow_intensity = int(255 * (1 - anim_progress))
        cv2.rectangle(blended, (x1, y1), (x2, y2), (255, 255, 255), 2)
        cv2.rectangle(blended, (x1-2, y1-2), (x2+2, y2+2), (255, 255, 255, glow_intensity), 4)
    else:
        # Subtle outline for active window
        cv2.rectangle(blended, (x1, y1), (x2, y2), (255, 255, 255), 1)
    
    return blended, True, (x1, y1, x2, y2)
