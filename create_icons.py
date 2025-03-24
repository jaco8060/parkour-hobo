from PIL import Image, ImageDraw
import os

# Create the directory if it doesn't exist
os.makedirs("assets/product_icons", exist_ok=True)

# List of icon names to create
icons = [
    "hobo_cape_icon",
    "cool_shades_icon",
    "cardboard_armor_icon",
    "extra_life_icon"
]

# Colors for each icon
colors = {
    "hobo_cape_icon": (120, 120, 120),       # Gray
    "cool_shades_icon": (50, 50, 50),        # Dark gray
    "cardboard_armor_icon": (160, 120, 80),  # Brown
    "extra_life_icon": (200, 50, 50)         # Red
}

# Create each icon
for icon_name in icons:
    # Create a new 256x256 transparent image
    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a rectangle with the icon's color
    color = colors.get(icon_name, (100, 100, 100))
    draw.rectangle([20, 20, 236, 236], fill=color, outline=(255, 255, 255), width=5)
    
    # Add text (product name) - using a simplified approach
    display_name = icon_name.replace("_icon", "").replace("_", " ").title()
    text_color = (255, 255, 255)  # White
    
    # Use basic text positioning without anchor
    # Estimate text position to center it
    text_width = len(display_name) * 10  # Rough estimate
    text_x = (256 - text_width) // 2
    text_y = 128 - 10  # Rough vertical center
    
    draw.text((text_x, text_y), display_name, fill=text_color)
    
    # Save the image
    path = os.path.join("assets/product_icons", f"{icon_name}.png")
    img.save(path)
    print(f"Created {path}")

print("All product icons created successfully!") 