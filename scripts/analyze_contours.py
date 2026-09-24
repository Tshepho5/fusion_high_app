import cv2
import numpy as np

img_path = r"C:\Users\Tshepo Makola\.gemini\antigravity-ide\brain\f85f001b-7329-4e15-bae9-4f62739409a7\.user_uploaded\media_1790235041037.png"
img = cv2.imread(img_path)
h, w, _ = img.shape

# Threshold specifically on the vibrant blue color
# RGB in blue letter is around (50, 160, 255)
b, g, r = cv2.split(img)
# Blue letter condition: blue channel is high, red channel is low/medium
# b > 150, b > r + 60, b > g
blue_letter_mask = ((b.astype(int) > 140) & (b.astype(int) - r.astype(int) > 60) & (g.astype(int) > 80)).astype(np.uint8) * 255

# Apply slight morphological clean up if needed (or keep exact)
contours, hierarchy = cv2.findContours(blue_letter_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_L1)

print(f"Total contours: {len(contours)}")
for i, c in enumerate(contours):
    area = cv2.contourArea(c)
    if area > 100:
        x, y, cw, ch = cv2.boundingRect(c)
        parent = hierarchy[0][i][3]
        print(f"Contour {i}: Area={area:.1f}, bbox=({x}, {y}, {cw}, {ch}), is_hole={parent != -1}")
