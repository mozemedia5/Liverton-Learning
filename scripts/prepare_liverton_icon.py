from pathlib import Path
from PIL import Image, ImageOps

source = Path('/home/ubuntu/upload/69cd8b1514022709bf85fbef8aa2c871.jpg')
out_dir = Path('/home/ubuntu/Liverton-Learning/public/icons')
out_dir.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert('RGB')
side = max(image.size)
canvas = Image.new('RGB', (side, side), '#000000')
canvas.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
canvas = ImageOps.fit(canvas, (1024, 1024), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
canvas.save(out_dir / 'liverton-icon-master.png', optimize=True)
for size in (48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024):
    fitted = ImageOps.fit(canvas, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    fitted.save(out_dir / f'liverton-icon-{size}.png', optimize=True)
