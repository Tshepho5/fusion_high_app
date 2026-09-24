import os
from PIL import Image

# Source authentic high-res G~SA app icon
src_img_path = r"C:\Users\Tshepo Makola\.gemini\antigravity-ide\brain\f85f001b-7329-4e15-bae9-4f62739409a7\.user_uploaded\media_1790235041037.png"
img = Image.open(src_img_path).convert("RGBA")

# Target sizes to export
sizes = {
    "icon-512.png": (512, 512),
    "icon-192.png": (192, 192),
    "apple-touch-icon.png": (180, 180),
    "fusion-app-icon.png": (512, 512),
    "geleza-logo.png": (512, 512),
    "gsa-logo.png": (512, 512),
    "icon-144.png": (144, 144),
    "icon-96.png": (96, 96),
    "icon-72.png": (72, 72),
    "icon-48.png": (48, 48)
}

# Directories to write to
output_dirs = [
    r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\public\assets",
    r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\client\public\assets",
    r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\public",
    r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\client\public"
]

for out_dir in output_dirs:
    os.makedirs(out_dir, exist_ok=True)
    for filename, (w, h) in sizes.items():
        if filename.startswith("icon-") or filename == "apple-touch-icon.png":
            # Can be in root public or in assets
            resized = img.resize((w, h), Image.Resampling.LANCZOS)
            target_path = os.path.join(out_dir, filename)
            resized.save(target_path, "PNG")

# Also update android mipmaps
android_res = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\client\android\app\src\main\res"
mipmap_sizes = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192)
}

for folder, (mw, mh) in mipmap_sizes.items():
    folder_path = os.path.join(android_res, folder)
    if os.path.exists(folder_path):
        resized = img.resize((mw, mh), Image.Resampling.LANCZOS)
        for icon_name in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            p = os.path.join(folder_path, icon_name)
            resized.save(p, "PNG")
            print(f"Updated Android {folder}/{icon_name}")

print("All PNG icons (192, 512, Apple touch, Android mipmaps, fusion-app-icon.png) generated successfully!")
