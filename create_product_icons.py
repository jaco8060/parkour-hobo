from PIL import Image, ImageDraw
import os
import shutil

# Create directories
os.makedirs("assets/product_icons", exist_ok=True)

# Icon names
icons = [
    "hobo_cape_icon",
    "cool_shades_icon", 
    "cardboard_armor_icon",
    "extra_life_icon"
]

# Create 256x256 icons
for icon in icons:
    print(f"Creating {icon}")
    
    # Create a 256x256 image with blue background
    img = Image.new('RGB', (256, 256), color=(100, 150, 200))
    
    # Draw a rectangle
    draw = ImageDraw.Draw(img)
    draw.rectangle([(50, 50), (206, 206)], fill=(70, 90, 150), outline=(255, 255, 255), width=3)
    
    # Save to product_icons directory
    product_icon_path = f"assets/product_icons/{icon}.png"
    img.save(product_icon_path)
    print(f"Saved {product_icon_path}")

print("All product icons created successfully!") 