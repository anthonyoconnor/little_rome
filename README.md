# Little Rome

A browser diorama about building a small Roman town and watching one year unfold.

## Run and validate

```powershell
npm.cmd install --cache .cache/npm
npm.cmd run dev
npm.cmd test
npm.cmd run test:browser
npm.cmd run capture
npm.cmd run build
```

Open the local Vite address. Browser checks use installed Google Chrome, a 1440×900 viewport, and readiness signals. Temporary captures go in ignored `artifacts/`; selected milestone images go in `progress/`. No human testing is needed.

The four tools cost 1 / 10 / 14 / 8 coins. Click to place, press R to rotate an entrance, Escape to inspect, and Ctrl Z to undo. Drag to orbit; scroll to zoom; Q / E rotate. Clear layout restores the full budget; example town provides a connected starting arrangement. The village gate's four tiles are free.

## Assets

Editable models and packed surface textures are in `assets/little-rome.blend`. Rebuild their browser export with:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/create_assets.py
```

All asset geometry is created in Blender, including residents and their articulated parts. The browser instances the exported GLB meshes. See `development-plan.md` for verified milestones and current work.
