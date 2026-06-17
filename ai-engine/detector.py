import os
import cv2
import numpy as np

class BattleDetector:
    def __init__(self, model_path="models/best.pt"):
        self.model_path = model_path
        self.yolo_enabled = False
        
        # Try importing and initializing ultralytics YOLOv8
        try:
            from ultralytics import YOLO
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                self.yolo_enabled = True
                print(f"[Detector] YOLOv8 loaded successfully from {self.model_path}")
            else:
                print(f"[Detector] Weights file '{self.model_path}' not found. Defaulting to OpenCV color-heuristics mode.")
        except ImportError:
            print("[Detector] 'ultralytics' library not installed. Defaulting to OpenCV color-heuristics mode.")

    def detect_entities(self, frame: np.ndarray) -> dict:
        """
        Main detection router. Uses YOLOv8 if enabled, otherwise defaults to CV Heuristics.
        """
        if self.yolo_enabled:
            return self._detect_yolo(frame)
        else:
            return self._detect_heuristics(frame)

    def _detect_yolo(self, frame: np.ndarray) -> dict:
        """
        Runs YOLOv8 model inference and parses standard bounding box labels.
        Labels expected: 'player_poke', 'enemy_poke', 'player_hp', 'enemy_hp', 'move_btn', 'switch_menu'.
        """
        results = self.model(frame, verbose=False)[0]
        boxes = results.boxes
        
        detected = {
            "player_poke_box": None,
            "enemy_poke_box": None,
            "player_hp_bar": None, # (x, y, w, h)
            "enemy_hp_bar": None,
            "player_hp_pct": 100,
            "enemy_hp_pct": 100,
            "move_buttons": [], # list of (x, y, w, h)
            "status_effects": [],
            "screen_type": "battle"
        }

        h, w, _ = frame.shape
        names = self.model.names

        for box in boxes:
            cls_id = int(box.cls[0])
            label = names[cls_id]
            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            x1, y1, x2, y2 = xyxy

            if label == "player_poke":
                detected["player_poke_box"] = (x1, y1, x2 - x1, y2 - y1)
            elif label == "enemy_poke":
                detected["enemy_poke_box"] = (x1, y1, x2 - x1, y2 - y1)
            elif label == "player_hp":
                detected["player_hp_bar"] = (x1, y1, x2 - x1, y2 - y1)
                detected["player_hp_pct"] = self._calculate_hp_percentage_from_crop(frame[y1:y2, x1:x2])
            elif label == "enemy_hp":
                detected["enemy_hp_bar"] = (x1, y1, x2 - x1, y2 - y1)
                detected["enemy_hp_pct"] = self._calculate_hp_percentage_from_crop(frame[y1:y2, x1:x2])
            elif label == "move_btn":
                detected["move_buttons"].append((x1, y1, x2 - x1, y2 - y1))
            elif label == "team_preview":
                detected["screen_type"] = "preview"

        return detected

    def _detect_heuristics(self, frame: np.ndarray) -> dict:
        """
        Heuristic fallback. Detects HP bars by scanning HSV values
        and returns approximate regions for OCR.
        Layout assumptions: Standard Pokemon Showdown layout (720p scaled).
        """
        h, w, _ = frame.shape
        
        # Standard relative bounding boxes for a 1280x720 Pokemon Showdown layout
        # (normalized to the current resolution)
        scale_x = w / 1280.0
        scale_y = h / 720.0

        detected = {
            "player_poke_box": (int(250 * scale_x), int(330 * scale_y), int(200 * scale_x), int(200 * scale_y)),
            "enemy_poke_box": (int(800 * scale_x), int(100 * scale_y), int(200 * scale_x), int(200 * scale_y)),
            "player_hp_bar": None,
            "enemy_hp_bar": None,
            "player_hp_pct": 100,
            "enemy_hp_pct": 100,
            "move_buttons": [],
            "status_effects": [],
            "screen_type": "battle"
        }

        # Find HP bar coordinates using HSV color contours
        player_hp_box, player_pct = self._find_hp_bar_by_color(frame, scan_region="player", scale_x=scale_x, scale_y=scale_y)
        enemy_hp_box, enemy_pct = self._find_hp_bar_by_color(frame, scan_region="enemy", scale_x=scale_x, scale_y=scale_y)

        detected["player_hp_bar"] = player_hp_box
        detected["player_hp_pct"] = player_pct
        detected["enemy_hp_bar"] = enemy_hp_box
        detected["enemy_hp_pct"] = enemy_pct

        # Generate default approximate move button regions on the bottom left (Showdown controls)
        for i in range(4):
            col = i % 2
            row = i // 2
            bx = int((350 + col * 160) * scale_x)
            by = int((530 + row * 50) * scale_y)
            bw = int(150 * scale_x)
            bh = int(40 * scale_y)
            detected["move_buttons"].append((bx, by, bw, bh))

        return detected

    def _find_hp_bar_by_color(self, frame: np.ndarray, scan_region="player", scale_x=1.0, scale_y=1.0) -> tuple:
        """
        Scans regions of the screen for HP color bars (Green, Yellow, Red)
        Returns: (x, y, w, h), percentage_int
        """
        h, w, _ = frame.shape
        
        # Focus crop region to avoid background matches
        if scan_region == "player":
            # Player HP is usually in bottom-left/middle
            y_min, y_max = int(h * 0.4), int(h * 0.7)
            x_min, x_max = int(w * 0.1), int(w * 0.6)
        else:
            # Enemy HP is usually in top-right/middle
            y_min, y_max = int(h * 0.05), int(h * 0.35)
            x_min, x_max = int(w * 0.45), int(w * 0.95)

        crop = frame[y_min:y_max, x_min:x_max]
        if crop.size == 0:
            return None, 100

        # Convert crop to HSV
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

        # Standard HP Green, Yellow, and Red HSV color bounds
        lower_green = np.array([35, 50, 50])
        upper_green = np.array([85, 255, 255])
        
        lower_yellow = np.array([15, 100, 100])
        upper_yellow = np.array([35, 255, 255])
        
        lower_red1 = np.array([0, 100, 100])
        upper_red1 = np.array([15, 255, 255])
        lower_red2 = np.array([170, 100, 100])
        upper_red2 = np.array([180, 255, 255])

        mask_g = cv2.inRange(hsv, lower_green, upper_green)
        mask_y = cv2.inRange(hsv, lower_yellow, upper_yellow)
        mask_r = cv2.bitwise_or(cv2.inRange(hsv, lower_red1, upper_red1), cv2.inRange(hsv, lower_red2, upper_red2))
        
        # Combine masks
        mask = cv2.bitwise_or(mask_g, cv2.bitwise_or(mask_y, mask_r))

        # Find contours of colored bar segments
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_box = None
        best_w = 0
        
        for c in contours:
            area = cv2.contourArea(c)
            if area > 100: # filter noise
                x, y, w_box, h_box = cv2.boundingRect(c)
                # HP bar matches aspect ratio (thin and long)
                aspect = w_box / float(h_box)
                if aspect > 4.0 and w_box > best_w:
                    best_w = w_box
                    # Map coordinates back to full frame
                    best_box = (x + x_min, y + y_min, w_box, h_box)

        if best_box:
            # Run percentage calculation on crop
            pct = self._calculate_hp_percentage_from_crop(crop[best_box[1]-y_min : best_box[1]-y_min+best_box[3], best_box[0]-x_min : best_box[0]-x_min+best_box[2]])
            return best_box, pct
        
        # Default placeholder coordinates if none detected
        if scan_region == "player":
            return (int(400 * scale_x), int(420 * scale_y), int(150 * scale_x), int(12 * scale_y)), 100
        else:
            return (int(750 * scale_x), int(180 * scale_y), int(150 * scale_x), int(12 * scale_y)), 100

    def _calculate_hp_percentage_from_crop(self, hp_crop: np.ndarray) -> int:
        """
        Determines the fill percentage of a cropped HP bar.
        Looks at the ratio of active colored pixels to total width.
        """
        if hp_crop.size == 0:
            return 100
            
        hsv = cv2.cvtColor(hp_crop, cv2.COLOR_BGR2HSV)
        
        # Combine bounds of Green, Yellow, and Red
        lower_active = np.array([0, 50, 50])
        upper_active = np.array([85, 255, 255])
        lower_red2 = np.array([170, 50, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask = cv2.bitwise_or(
            cv2.inRange(hsv, lower_active, upper_active),
            cv2.inRange(hsv, lower_red2, upper_red2)
        )
        
        # Take the average row projection of active pixels
        col_sum = np.sum(mask > 0, axis=0)
        active_cols = np.sum(col_sum > (hp_crop.shape[0] * 0.3)) # Column is active if >30% pixels are colored
        
        total_cols = hp_crop.shape[1]
        if total_cols == 0:
            return 100
            
        pct = int((active_cols / float(total_cols)) * 100)
        return min(100, max(0, pct))

if __name__ == "__main__":
    # Self-test detector
    det = BattleDetector()
    dummy_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    
    # Paint a dummy green player HP bar on frame
    cv2.rectangle(dummy_frame, (400, 420), (520, 432), (0, 255, 0), -1) # BGR Green (120px wide, ~80% fill)
    cv2.rectangle(dummy_frame, (520, 420), (550, 432), (100, 100, 100), -1) # Gray empty part (30px wide)
    
    res = det.detect_entities(dummy_frame)
    print("Detected Player HP Pct:", res["player_hp_pct"])
    print("Detected Player HP Bar Box:", res["player_hp_bar"])
