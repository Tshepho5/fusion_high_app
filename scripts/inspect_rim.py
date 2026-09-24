import cv2
import numpy as np

img_path = r"C:\Users\Tshepo Makola\.gemini\antigravity-ide\brain\f85f001b-7329-4e15-bae9-4f62739409a7\.user_uploaded\media_1790235041037.png"
img = cv2.imread(img_path)
h, w, _ = img.shape

# Inspect the border:
# Blue/navy rim has b > 30 and b > r
b, g, r = cv2.split(img)
rim_mask = ((b.astype(int) > 30) & (b.astype(int) < 150) & (b.astype(int) > r.astype(int) + 15)).astype(np.uint8) * 255
rim_contours, _ = cv2.findContours(rim_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Rim contours: {len(rim_contours)}")
for c in rim_contours:
    if cv2.contourArea(c) > 5000:
        x, y, cw, ch = cv2.boundingRect(c)
        print(f"Rim bbox: ({x}, {y}, {cw}, {ch})")

# Image shape is 540 x 551
print("Image dimensions:", w, h)
