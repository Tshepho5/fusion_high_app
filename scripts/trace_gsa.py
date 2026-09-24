import cv2
import numpy as np
from PIL import Image

# Load original screenshot
img_path = r"C:\Users\Tshepo Makola\.gemini\antigravity-ide\brain\f85f001b-7329-4e15-bae9-4f62739409a7\.user_uploaded\media_1790235041037.png"
img = cv2.imread(img_path)
h, w, _ = img.shape
print(f"Loaded image {w}x{h}")

# Convert BGR to HSV
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Blue letters range in HSV:
# Blue hue is typically around 100-130 in OpenCV (scale 0-180)
# Let's inspect colors
blue_mask = cv2.inRange(hsv, np.array([90, 100, 100]), np.array([130, 255, 255]))

print(f"Blue pixels count: {np.count_nonzero(blue_mask)}")

# Also inspect border / background
# Save the binary mask to check
cv2.imwrite("scripts/mask_debug.png", blue_mask)
print("Saved mask_debug.png")
