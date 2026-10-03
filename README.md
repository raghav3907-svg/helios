# Helios

Helios is a TypeScript + React + Vite application for exploring AstroSat FITS
observation products directly in the browser. Files are parsed locally and
never uploaded to a server.

The interface is intentionally inspired by mission-control workspaces such as
Aether: the observation fleet panel, nominal processing state, telemetry cards,
and signal status are all derived from the supplied AstroSat products. Helios
does not fabricate spacecraft telemetry; it presents scientific observation
health and computed count-rate metrics instead.

## Analysis features

- Multi-band light-curve visualization with detector and energy-band filters
- Energy-spectrum channel view
- Cross-observation count-rate comparison
- Derived mean, median, peak, zero-rate, and product-completeness metrics
- Event FITS row/column inventory and file coverage metadata
- Data-quality readiness checks with calibration caveats
- Local-only processing and a responsive mission-console interface

## Quick start

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, then drag one or more `.fits` files into
the workspace.

## Repository layout

- `src/main.tsx` - React application and FITS header parser
- `src/styles.css` - responsive visual system
- `vite.config.ts` - Vite configuration
- `data/` - local observation products (not committed by default)
- `package.json` - Node dependencies and scripts

## GitHub notes

Large FITS and ZIP files should be stored with Git LFS or in a release/object
store rather than committed directly to normal Git history. Keep credentials
and local `node_modules/` out of the repository.
