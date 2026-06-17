import os
import sys
import numpy as np
import cv2
from mss import mss

class WindowCapture:
    SUPPORTED_KEYWORDS = {
        "PokeMMO": ["pokemmo"],
        "Pokemon Revolution Online": ["pokemon revolution", "pokemonrevolution"],
        "Pokemon Showdown": ["showdown"]
    }

    def __init__(self):
        self.sct = mss()
        self.hwnd = None
        self.matched_title = None
        self.window_rect = None
        self.last_dimensions = None
        
        self.is_windows = sys.platform.startswith('win')
        if self.is_windows:
            try:
                import win32gui
                import win32process
                import win32con
                self.win32gui = win32gui
                self.win32process = win32process
                self.win32con = win32con
            except ImportError:
                print("[Capture] pywin32 not installed. Defaulting to full-screen capture.")
                self.is_windows = False

        self.attempt_auto_attach()

    def find_game_windows(self):
        """
        Enumerates all visible windows and checks against supported game keywords.
        Returns a list of tuples: (hwnd, matched_game_name, full_title)
        """
        found = []
        if not self.is_windows:
            return found

        def enum_cb(hwnd, extra):
            if self.win32gui.IsWindowVisible(hwnd):
                title = self.win32gui.GetWindowText(hwnd)
                if not title:
                    return True
                
                title_lower = title.lower()
                for game_name, keywords in self.SUPPORTED_KEYWORDS.items():
                    for keyword in keywords:
                        if keyword in title_lower:
                            found.append((hwnd, game_name, title))
                            break
            return True

        try:
            self.win32gui.EnumWindows(enum_cb, None)
        except Exception as e:
            print(f"[Capture] Error enumerating windows: {e}")
        
        return found

    def attempt_auto_attach(self) -> bool:
        """
        Scans visible windows, binds to the first match, and initializes bounds.
        """
        if not self.is_windows:
            self.window_rect = self.sct.monitors[1]
            return False

        matches = self.find_game_windows()
        if matches:
            # Bind to first matched window
            hwnd, game_name, title = matches[0]
            self.hwnd = hwnd
            self.matched_title = f"{game_name} ({title})"
            print(f"[Capture] Auto-attached to: {self.matched_title} (HWND: {hwnd})")
            self.update_bounds()
            return True
        else:
            self.hwnd = None
            self.matched_title = None
            # Default to full-screen primary monitor
            self.window_rect = self.sct.monitors[1]
            return False

    def update_bounds(self) -> bool:
        """
        Gets current window bounding rect, adapting to moves and resolution updates.
        Returns False if window is minimized or invalid.
        """
        if not self.hwnd or not self.win32gui.IsWindow(self.hwnd):
            return False

        # Check for minimized state (Iconic)
        if self.win32gui.IsIconic(self.hwnd):
            return False

        try:
            rect = self.win32gui.GetWindowRect(self.hwnd)
            left, top, right, bottom = rect
            width = right - left
            height = bottom - top

            # Filter out invalid dimensions (e.g. 0 width/height)
            if width <= 0 or height <= 0:
                return False

            self.window_rect = {
                "left": left,
                "top": top,
                "width": width,
                "height": height
            }

            dimensions = (width, height)
            if self.last_dimensions and self.last_dimensions != dimensions:
                print(f"[Capture] Resolution changed from {self.last_dimensions} to {dimensions}. Recovering layout...")
            
            self.last_dimensions = dimensions
            return True
        except Exception as e:
            print(f"[Capture] Error getting window bounds: {e}")
            return False

    def capture_frame(self) -> np.ndarray:
        """
        Captures the target game window.
        - Automatically detects minimized state and yields fallback.
        - Automatically attaches when game window starts.
        - Updates bounds on resolution changes.
        """
        try:
            # 1. Check if window handle is active
            if self.is_windows:
                if not self.hwnd or not self.win32gui.IsWindow(self.hwnd):
                    # Try to auto-attach
                    if not self.attempt_auto_attach():
                        # Game not running: capture monitor fallback
                        sct_img = self.sct.grab(self.sct.monitors[1])
                        frame = np.array(sct_img)
                        return cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

                # 2. Check for minimize state
                if self.win32gui.IsIconic(self.hwnd):
                    # Minimized: Return black frame to avoid system capture noise
                    canvas = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(canvas, "[Game Minimized]", (160, 240), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
                    return canvas

                # 3. Refresh coordinates / detect resolution changes
                if not self.update_bounds():
                    # Fallback on error
                    sct_img = self.sct.grab(self.sct.monitors[1])
                    frame = np.array(sct_img)
                    return cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

            # Grab image using mss
            sct_img = self.sct.grab(self.window_rect)
            frame = np.array(sct_img)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
            return frame
        except Exception as e:
            print(f"[Capture] Capture failed: {e}. Recovering with mock canvas...")
            # Return empty black canvas
            return np.zeros((720, 1280, 3), dtype=np.uint8)

if __name__ == "__main__":
    # Test script: Search for running games and capture a test frame if found
    cap = WindowCapture()
    print("Scanning for game windows...")
    games = cap.find_game_windows()
    for g in games:
        print(f" Found Game: {g[1]} - Title: '{g[2]}'")
    
    img = cap.capture_frame()
    print(f"Captured frame shape: {img.shape}")
    cv2.imwrite("test_capture.png", img)
    print("Test frame saved to test_capture.png")
