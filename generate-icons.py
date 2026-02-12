#!/usr/bin/env python3
"""
Generate PWA icons in all required sizes from the original logo
"""

from PIL import Image
import os

# Icon sizes needed for PWA
ICON_SIZES = [
    48, 72, 96, 120, 128, 144, 152, 180, 192, 256, 384, 512, 1024
]

def create_square_icon(input_path, output_path, size):
    """Create a square icon with the logo centered on transparent background"""
    # Open the original image
    img = Image.open(input_path)
    
    # Create a new square transparent image
    square_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    
    # Calculate the size to fit the logo within the square (with padding)
    padding = int(size * 0.1)  # 10% padding
    max_logo_size = size - (2 * padding)
    
    # Resize the logo to fit
    img.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)
    
    # Calculate position to center the logo
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    
    # Paste the logo onto the square image
    square_img.paste(img, (x, y), img if img.mode == 'RGBA' else None)
    
    # Save the icon
    square_img.save(output_path, 'PNG', optimize=True)
    print(f"Created: {output_path} ({size}x{size})")

def main():
    input_logo = '/home/user/webapp/public/icons/original-logo.png'
    output_dir = '/home/user/webapp/public/icons'
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating PWA icons...")
    print("-" * 50)
    
    for size in ICON_SIZES:
        output_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
        create_square_icon(input_logo, output_path, size)
    
    # Also create apple-touch-icon
    apple_icon_path = os.path.join(output_dir, 'apple-touch-icon.png')
    create_square_icon(input_logo, apple_icon_path, 180)
    print(f"Created: {apple_icon_path} (Apple Touch Icon)")
    
    print("-" * 50)
    print(f"✅ Successfully generated {len(ICON_SIZES) + 1} icons!")

if __name__ == '__main__':
    main()
