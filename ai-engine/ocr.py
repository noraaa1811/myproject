import os
import re
import cv2
import numpy as np

# Try importing pytesseract
PYTESSERACT_AVAILABLE = False
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    pass

class BattleOCR:
    def __init__(self, tesseract_path=None):
        self.tesseract_available = PYTESSERACT_AVAILABLE
        
        # Configure tesseract executable location if provided or on default path
        if self.tesseract_available and tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        elif self.tesseract_available:
            # Common Windows paths check
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                r"C:\Users\LEGION\AppData\Local\Tesseract-OCR\tesseract.exe"
            ]
            for path in common_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    print(f"[OCR] Found Tesseract executable at: {path}")
                    break
        
        # Verify if executable works
        if self.tesseract_available:
            try:
                pytesseract.get_tesseract_version()
                print("[OCR] Tesseract initialized successfully.")
            except Exception as e:
                print(f"[OCR] Tesseract execution failed: {e}. Running in Heuristics/Mock OCR mode.")
                self.tesseract_available = False

    def preprocess_for_ocr(self, crop: np.ndarray) -> np.ndarray:
        """
        Applies image filters to optimize text extraction.
        Grayscale -> Upscale -> Thresholding.
        """
        if crop.size == 0:
            return crop
            
        # Convert to grayscale
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        
        # Resize/scale up (Tesseract prefers larger text sizes)
        resized = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        
        # Thresholding (Otsu's binarization to get pure black and white)
        thresh = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        return thresh

    def extract_text(self, crop: np.ndarray, config="--psm 7") -> str:
        """
        Extracts clean text string from a cropped image segment.
        """
        if crop.size == 0:
            return ""

        if not self.tesseract_available:
            # Mock OCR return if not available (parsed in caller based on positions)
            return ""

        try:
            processed = self.preprocess_for_ocr(crop)
            text = pytesseract.image_to_string(processed, config=config)
            # Remove line breaks and clean whitespace
            clean_text = re.sub(r'[\r\n]+', ' ', text).strip()
            # Remove special character noise
            clean_text = re.sub(r'[^a-zA-Z0-9\s\-\.\%\/]', '', clean_text)
            return clean_text
        except Exception as e:
            print(f"[OCR] Text extraction failed: {e}")
            return ""

    def clean_pokemon_name(self, raw_name: str) -> str:
        """
        Sanitizes OCR extracted names to match standard species names.
        """
        if not raw_name:
            return ""
        # Remove levels, gender flags e.g. "Charizard L100 M" -> "Charizard"
        name = re.split(r'\s+L\d+|\s+[MF]$|\s+Lv', raw_name, flags=re.IGNORECASE)[0]
        # Remove leading/trailing spaces
        name = name.strip()
        # Capitalize first letter of words
        name = ' '.join(word.capitalize() for word in name.split())
        return name

    def clean_move_name(self, raw_move: str) -> str:
        """
        Cleans move button names.
        """
        if not raw_move:
            return ""
        # Remove numbers representing PP count e.g. "Earthquake 10/10" -> "Earthquake"
        move = re.split(r'\s+\d+\/\d+|\s+PP', raw_move, flags=re.IGNORECASE)[0]
        move = move.strip()
        return move

if __name__ == "__main__":
    import os
    # Quick test
    ocr = BattleOCR()
    print("Tesseract Available:", ocr.tesseract_available)
