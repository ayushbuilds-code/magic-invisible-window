import cv2
import time
from hand_tracker import HandTracker
from invisible_window import apply_invisible_effect
from recorder import VideoRecorder
from gesture_parser import is_valid_gesture, is_strict_gesture

def main():
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    # Try to set high resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    tracker = HandTracker(max_hands=2, detection_con=0.7, tracking_con=0.7)
    
    background = None
    bg_captured = False
    
    prev_time = 0
    
    candidate_background = None
    gesture_start_time = None
    gesture_active = False
    
    # New state variables
    strict_mode = False
    current_effect = 1
    animation_start = None
    
    recorder = VideoRecorder(fps=30.0)

    print("Starting Magic Invisible Window...")
    print("Press 'SPACE' or 'B' to capture/reset the background manually.")
    print("Press 'R' to start/stop recording.")
    print("Press 'G' to toggle Strict Gesture Mode.")
    print("Press '1-6' to switch effects.")
    print("Press 'Q' or 'ESC' to quit.")

    # Allow camera to warm up
    time.sleep(1)

    while True:
        success, frame = cap.read()
        if not success:
            print("Failed to read from webcam.")
            break
            
        # Flip the frame horizontally for a more intuitive selfie-view
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        
        # Automatically capture background if we don't have one
        if not bg_captured:
            background = frame.copy()
            bg_captured = True
            print("Background captured automatically.")
            
        # We will keep a running candidate background to use right before the gesture activates
        # We update it when the gesture is NOT forming.
            
        # Process frame for hands
        fingertips, full_landmarks = tracker.process_frame(frame)
        
        output_frame = frame.copy()
        
        # Check if gesture is valid
        is_gesture_forming = False
        if fingertips['left'] is not None and fingertips['right'] is not None:
            if is_valid_gesture(fingertips['left'], fingertips['right']):
                if not strict_mode or is_strict_gesture(full_landmarks):
                    is_gesture_forming = True
        
        # Check if both hands are detected and form a valid gesture
        if is_gesture_forming:
            if gesture_start_time is None:
                gesture_start_time = time.time()
                
            # If held for 300ms, activate
            if not gesture_active and (time.time() - gesture_start_time) >= 0.3:
                gesture_active = True
                # Capture the background just before the gesture activates
                if candidate_background is not None:
                    background = candidate_background.copy()
                    
        else:
            # Gesture not forming/valid, reset timer and state
            gesture_start_time = None
            if gesture_active:
                # We just lost the gesture, trigger close animation (optional) or just deactivate
                pass
            gesture_active = False
            animation_start = None
            # Update the candidate background while hands aren't holding the gesture
            candidate_background = frame.copy()
            
        # Apply the invisible effect if active
        if gesture_active and background is not None:
            # Calculate animation progress
            if animation_start is None:
                animation_start = time.time()
                
            elapsed = time.time() - animation_start
            anim_progress = min(1.0, elapsed / 0.4) # 400ms animation
            
            # Using 45 for stronger cinematic feathering
            output_frame, _, rect = apply_invisible_effect(
                frame, background, fingertips['left'], fingertips['right'], 
                feather_amount=45, effect_mode=current_effect, anim_progress=anim_progress
            )

        # Calculate and display FPS
        curr_time = time.time()
        fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
        prev_time = curr_time
        
        cv2.putText(output_frame, f'FPS: {int(fps)}', (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
        # Display instructions and UI
        if recorder.is_recording:
            cv2.putText(output_frame, "REC", (w - 100, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            cv2.circle(output_frame, (w - 120, 40), 10, (0, 0, 255), -1)
            
        strict_text = "ON" if strict_mode else "OFF"
        cv2.putText(output_frame, f"Strict Mode: {strict_text}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 150, 0), 2)
        cv2.putText(output_frame, f"Effect Mode: {current_effect}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        if not gesture_active:
            cv2.putText(output_frame, "Move index fingers apart to open window", 
                        (20, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Write frame to recorder
        recorder.write_frame(output_frame)
            
        # Show the result
        cv2.imshow("Magic Invisible Window", output_frame)
        
        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:  # Q or ESC
            break
        elif key == ord(' '):  # SPACE
            background = frame.copy()
            print("Background updated manually.")
        elif key == ord('b'):  # B
            background = frame.copy()
            print("Background reset.")
        elif key == ord('r'):  # R for recording
            recorder.toggle_recording(frame.shape)
        elif key == ord('g'):  # G for strict mode
            strict_mode = not strict_mode
            print(f"Strict Mode: {strict_mode}")
        elif ord('1') <= key <= ord('6'):
            current_effect = key - ord('0')
            print(f"Effect Mode: {current_effect}")

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
