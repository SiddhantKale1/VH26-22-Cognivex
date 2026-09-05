"""
Advanced Image Preprocessing Pipeline for Industrial OCR.
Performs auto-deskewing, adaptive binarization, noise reduction,
and contrast enhancement (CLAHE) on scanned technical pages.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def pil_to_cv2(pil_image):
    """Convert PIL image to OpenCV BGR numpy array."""
    if not PIL_AVAILABLE:
        return np.array(pil_image)
    open_cv_image = np.array(pil_image)
    if len(open_cv_image.shape) == 2:  # Grayscale
        return open_cv_image
    # Convert RGB to BGR
    return open_cv_image[:, :, ::-1].copy()


def cv2_to_pil(cv_image: np.ndarray):
    """Convert OpenCV BGR or Grayscale numpy array to PIL image."""
    if not PIL_AVAILABLE:
        return cv_image
    if len(cv_image.shape) == 2:  # Grayscale
        return Image.fromarray(cv_image)
    # Convert BGR to RGB
    return Image.fromarray(cv_image[:, :, ::-1])


def deskew_image(cv_image: np.ndarray) -> np.ndarray:
    """
    Detect the skew angle of scanned text using minimum area bounding box
    and rotate the image to straighten the text lines.
    """
    if not CV2_AVAILABLE:
        return cv_image

    try:
        if len(cv_image.shape) == 3:
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = cv_image

        # Invert and threshold to find text coordinates
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 50:
            return cv_image

        # Find rotated bounding box
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        # If angle is negligible (< 0.5 degrees), skip rotation
        if abs(angle) < 0.5 or abs(angle) > 45:
            return cv_image

        # Rotate image around center
        (h, w) = cv_image.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            cv_image, matrix, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated
    except Exception as e:
        logger.debug(f"Deskewing skipped due to: {e}")
        return cv_image


def enhance_contrast(cv_image: np.ndarray) -> np.ndarray:
    """
    Apply Contrast Limited Adaptive Histogram Equalization (CLAHE)
    to reveal faded ink and low-contrast wiring text.
    """
    if not CV2_AVAILABLE:
        return cv_image

    try:
        if len(cv_image.shape) == 3:
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = cv_image

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        return enhanced
    except Exception as e:
        logger.debug(f"Contrast enhancement skipped: {e}")
        return cv_image


def preprocess_for_ocr(image):
    """
    Full preprocessing pipeline:
    1. Deskew image orientation
    2. Enhance contrast (CLAHE)
    3. Noise reduction (Gaussian Blur / Bilateral Filter)
    """
    if not CV2_AVAILABLE:
        if PIL_AVAILABLE and hasattr(image, "convert"):
            return image.convert("L")
        return image

    try:
        cv_img = pil_to_cv2(image)
        # 1. Deskew
        straightened = deskew_image(cv_img)
        # 2. Contrast Enhancement
        enhanced = enhance_contrast(straightened)
        # 3. Denoising
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10, templateWindowSize=7, searchWindowSize=21)
        return cv2_to_pil(denoised)
    except Exception as e:
        logger.warning(f"Preprocessing error, using original image: {e}")
        return image
