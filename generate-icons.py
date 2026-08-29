#!/usr/bin/env python3
"""
Generate PWA icons in all required sizes from the original logo,
including maskable versions for Android.
"""

from PIL import Image, ImageOps
import os

# Icon sizes needed for PWA
ICON_SIZES = [
    48, 72, 96, 120, 128, 144, 152, 180, 192, 256, 384, 512, 1024
]

def create_icon(input_path, output_path, size, maskable=False):
    """Create a square icon with the logo centered on a white background.

    The brand logo is a standalone green/blue mark with navy text on white,
    so ALL icons (standard, maskable, apple-touch) use a solid white
    background to guarantee the logo is never cropped or letterboxed by
    Android adaptive icons or iOS squircle masks (Facebook/Pinterest style).
    """
    # Open the original image
    img = Image.open(input_path)

    if maskable:
        # Maskable icons need a safe zone. The logo should be within the center 80%
        # to avoid being cropped by the various mask shapes (circle, squircle, etc.)
        padding = int(size * 0.22) # 22% padding for maskable safe zone
    else:
        padding = int(size * 0.08) # 8% padding

    bg_color = (255, 255, 255, 255) # White background everywhere
    square_img = Image.new('RGBA', (size, size), bg_color)
        
    max_logo_size = size - (2 * padding)
    
    # Resize the logo to fit
    img.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)
    
    # Calculate position to center the logo
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    
    # Paste the logo onto the square image
    # Use the image itself as a mask if it has an alpha channel
    mask = img if img.mode == 'RGBA' else None
    square_img.paste(img, (x, y), mask)
    
    # Save the icon
    square_img.save(output_path, 'PNG', optimize=True)
    print(f"Created: {output_path} ({size}x{size}){' [Maskable]' if maskable else ''}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_logo = os.path.join(base_dir, 'public/icons/original-logo.png')
    output_dir = os.path.join(base_dir, 'public/icons')
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating PWA icons...")
    print("-" * 50)
    
    for size in ICON_SIZES:
        # Standard icon
        output_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
        create_icon(input_logo, output_path, size, maskable=False)
        
        # Maskable icon (specifically for larger sizes used by Android)
        if size in [192, 512]:
            maskable_path = os.path.join(output_dir, f'icon-{size}x{size}-maskable.png')
            create_icon(input_logo, maskable_path, size, maskable=True)
    
    # Also create apple-touch-icon
    apple_icon_path = os.path.join(output_dir, 'apple-touch-icon.png')
    create_icon(input_logo, apple_icon_path, 180, maskable=False)
    
    print("-" * 50)
    print(f"✅ Successfully generated icons!")

if __name__ == '__main__':
    main()
