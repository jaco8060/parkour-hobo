# Parkour Hobo Assets

This directory contains all the static assets needed for the Parkour Hobo game.

## Required Assets

### Character Models
- `hobo.glb` - The main character model with animations for idle, running, and jumping
- `hobo_cape.glb` - Cape accessory for the main character
- `hobo_sunglasses.glb` - Sunglasses accessory for the main character
- `hobo_armor.glb` - Cardboard armor for the main character

### Textures
- `garbage_bag.png` - Texture for garbage bag platforms
- `rooftop.png` - Texture for rooftop platforms
- `building.png` - Texture for city buildings

### UI Elements
- `hobo_logo.png` - Game logo for the main menu (200x200 pixels)
- `rank_icons/` - Directory containing icons for each player rank:
  - `alley_rookie.png`
  - `garbage_goblin.png`
  - `dumpster_diver.png`
  - `hobo_hustler.png`
  - `hobo_legend.png`

### Product Icons
All product icons should be 256x256 PNG format with transparent backgrounds:
- `product_icons/hobo_cape_icon.png` - Icon for the hobo cape premium item
- `product_icons/cool_shades_icon.png` - Icon for the cool shades premium item
- `product_icons/cardboard_armor_icon.png` - Icon for the cardboard armor premium item
- `product_icons/extra_life_icon.png` - Icon for the extra life premium item

## Notes for Developers

- All 3D models should be in glTF/GLB format
- Character model should include the following animations:
  - "idle" - standing still animation
  - "running" - running animation 
  - "jumping" - jumping animation
- Textures should be in PNG or JPG format
- UI elements should be PNG with transparent backgrounds where appropriate
- For actual game deployment, placeholder icons should be replaced with real art assets 