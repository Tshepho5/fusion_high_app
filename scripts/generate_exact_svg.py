import cv2
import numpy as np

img_path = r"C:\Users\Tshepo Makola\.gemini\antigravity-ide\brain\f85f001b-7329-4e15-bae9-4f62739409a7\.user_uploaded\media_1790235041037.png"
img = cv2.imread(img_path)
h, w, _ = img.shape

# Threshold blue letters
b, g, r = cv2.split(img)
blue_mask = ((b.astype(int) > 135) & (b.astype(int) - r.astype(int) > 55) & (g.astype(int) > 75)).astype(np.uint8) * 255

# Clean up noise slightly with a small 2x2 close
kernel = np.ones((2, 2), np.uint8)
blue_mask = cv2.morphologyEx(blue_mask, cv2.MORPH_CLOSE, kernel)

# Find all contours with two-level hierarchy (for holes like inside A)
contours, hierarchy = cv2.findContours(blue_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

def contour_to_svg_d(contour, epsilon=0.9):
    # Smooth contour using approxPolyDP
    approx = cv2.approxPolyDP(contour, epsilon, True)
    points = approx.reshape(-1, 2)
    if len(points) < 3:
        return ""
    d = f"M {points[0][0]},{points[0][1]} "
    for pt in points[1:]:
        d += f"L {pt[0]},{pt[1]} "
    d += "Z"
    return d

svg_paths = []
# Identify the contours
for i, c in enumerate(contours):
    area = cv2.contourArea(c)
    if area < 150:
        continue
    parent = hierarchy[0][i][3]
    # If it is a top-level contour (parent == -1)
    if parent == -1:
        d = contour_to_svg_d(c, epsilon=0.95)
        # Check if it has children (holes)
        child_idx = hierarchy[0][i][2]
        while child_idx != -1:
            child_c = contours[child_idx]
            child_d = contour_to_svg_d(child_c, epsilon=0.85)
            if child_d:
                d += " " + child_d
            child_idx = hierarchy[0][child_idx][0] # next sibling
        svg_paths.append((cv2.boundingRect(c)[0], d))

# Sort paths left to right
svg_paths.sort(key=lambda x: x[0])

# Construct SVG
svg_output = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%">
  <defs>
    <linearGradient id="gsa-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1b3558" />
      <stop offset="50%" stop-color="#12253e" />
      <stop offset="100%" stop-color="#1a3556" />
    </linearGradient>
    <linearGradient id="gsa-blue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3cb2ff" />
      <stop offset="50%" stop-color="#31a4f5" />
      <stop offset="100%" stop-color="#248ed8" />
    </linearGradient>
  </defs>

  <!-- Outer Squircle with Deep Navy Rim -->
  <rect x="14" y="14" width="{w - 28}" height="{h - 28}" rx="112" ry="112" fill="#000001" stroke="url(#gsa-rim)" stroke-width="18" />
  <rect x="22" y="22" width="{w - 44}" height="{h - 44}" rx="104" ry="104" fill="none" stroke="#081422" stroke-width="3" />

  <!-- G ~ S A Letterforms -->
  <g fill="url(#gsa-blue)" fill-rule="evenodd">
'''

for idx, (bx, d) in enumerate(svg_paths):
    svg_output += f'    <path d="{d}" />\n'

svg_output += '''  </g>
</svg>
'''

with open("scripts/exact_gsa.svg", "w", encoding="utf-8") as f:
    f.write(svg_output)

print(f"Generated scripts/exact_gsa.svg with {len(svg_paths)} paths!")
