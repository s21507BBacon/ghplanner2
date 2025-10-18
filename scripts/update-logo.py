#!/usr/bin/env python3
"""
Script to convert pigghplanner.png to transparent background and update logos
"""
from PIL import Image
import os

# Paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source_image = os.path.join(base_dir, 'pigghplanner.png')
output_logo = os.path.join(base_dir, 'public', 'logo.png')
favicon_16 = os.path.join(base_dir, 'public', 'favicon-16x16.png')
favicon_32 = os.path.join(base_dir, 'public', 'favicon-32x32.png')
favicon_ico = os.path.join(base_dir, 'public', 'favicon.ico')
apple_touch = os.path.join(base_dir, 'public', 'apple-touch-icon.png')
android_192 = os.path.join(base_dir, 'public', 'android-chrome-192x192.png')
android_512 = os.path.join(base_dir, 'public', 'android-chrome-512x512.png')

print(f"Loading image from: {source_image}")

# Load the image
img = Image.open(source_image)
img = img.convert("RGBA")

# Get pixel data
pixels = img.load()
width, height = img.size

# Define the background color to make transparent (dark gray/black)
# Sample from corners to get the background color
bg_color = pixels[0, 0][:3]  # Get RGB from top-left corner
print(f"Background color detected: {bg_color}")

# Threshold for color similarity
threshold = 50

# Make background transparent
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # Check if pixel is close to background color
        if (abs(r - bg_color[0]) < threshold and 
            abs(g - bg_color[1]) < threshold and 
            abs(b - bg_color[2]) < threshold):
            pixels[x, y] = (r, g, b, 0)  # Make transparent

print(f"Saving transparent logo to: {output_logo}")
img.save(output_logo, 'PNG')

# Generate favicons with white background for better visibility
print("Generating favicons...")

# Create a version with white background for favicons
favicon_img = Image.new('RGBA', img.size, (255, 255, 255, 255))
favicon_img.paste(img, (0, 0), img)

# 16x16 favicon
favicon_img_16 = favicon_img.resize((16, 16), Image.Resampling.LANCZOS)
favicon_img_16.save(favicon_16, 'PNG')
print(f"Created: {favicon_16}")

# 32x32 favicon
favicon_img_32 = favicon_img.resize((32, 32), Image.Resampling.LANCZOS)
favicon_img_32.save(favicon_32, 'PNG')
print(f"Created: {favicon_32}")

# favicon.ico (multi-size)
favicon_img_32.save(favicon_ico, format='ICO', sizes=[(16, 16), (32, 32)])
print(f"Created: {favicon_ico}")

# Apple touch icon (180x180)
favicon_img_180 = favicon_img.resize((180, 180), Image.Resampling.LANCZOS)
favicon_img_180.save(apple_touch, 'PNG')
print(f"Created: {apple_touch}")

# Android chrome icons
favicon_img_192 = favicon_img.resize((192, 192), Image.Resampling.LANCZOS)
favicon_img_192.save(android_192, 'PNG')
print(f"Created: {android_192}")

favicon_img_512 = favicon_img.resize((512, 512), Image.Resampling.LANCZOS)
favicon_img_512.save(android_512, 'PNG')
print(f"Created: {android_512}")

print("\n✅ Logo and favicons updated successfully!")
print(f"Main logo: {output_logo}")
