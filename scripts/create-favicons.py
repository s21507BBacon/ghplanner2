#!/usr/bin/env python3
"""
Script to crop the logo and create favicon files with transparent background
"""
from PIL import Image
import os

def create_favicons():
    # Load the original image
    img = Image.open('ghplanner.png').convert('RGBA')
    
    # Crop to center - remove excess padding
    # Based on visual inspection, the logo is roughly centered at 512,512
    # and spans about 600x600 pixels with the icon elements
    width, height = img.size
    
    # Crop box (left, top, right, bottom)
    # This will crop to approximately the central 700x700 area
    crop_margin = 162  # (1024 - 700) / 2
    crop_box = (crop_margin, crop_margin, width - crop_margin, height - crop_margin)
    
    cropped = img.crop(crop_box)
    
    # Make background transparent
    # The background is dark gray (#3d444d or similar), we'll replace it with transparency
    data = cropped.getdata()
    new_data = []
    
    for item in data:
        # Check if the pixel is close to the dark gray background color
        # Using a threshold to catch all background shades
        if item[0] < 80 and item[1] < 80 and item[2] < 80:  # Dark pixels
            # Make it fully transparent
            new_data.append((item[0], item[1], item[2], 0))
        else:
            # Keep the original pixel
            new_data.append(item)
    
    cropped.putdata(new_data)
    
    # Create public directory if it doesn't exist
    os.makedirs('public', exist_ok=True)
    
    # Save different sizes for various use cases
    sizes = {
        'favicon.ico': (32, 32),
        'favicon-16x16.png': (16, 16),
        'favicon-32x32.png': (32, 32),
        'apple-touch-icon.png': (180, 180),
        'android-chrome-192x192.png': (192, 192),
        'android-chrome-512x512.png': (512, 512),
    }
    
    for filename, size in sizes.items():
        resized = cropped.resize(size, Image.Resampling.LANCZOS)
        filepath = os.path.join('public', filename)
        
        if filename.endswith('.ico'):
            resized.save(filepath, format='ICO')
        else:
            resized.save(filepath, format='PNG')
        print(f'Created: {filepath}')
    
    # Also save the cropped version for reference
    cropped.save('public/logo.png')
    print('Created: public/logo.png')
    
    print('\nFavicons created successfully!')

if __name__ == '__main__':
    create_favicons()
