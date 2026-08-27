# Visuals — Shot-on-Stats

This folder contains design and monitoring visuals for the Shot-on-Stats project.

Files added:

- `architecture.svg` — high-level architecture diagram (already committed)
- `simulation-flow.svg` — simulation flowchart (SVG)
- `requests-daily.svg` — static daily requests area chart (SVG snapshot)
- `requests-monthly.svg` — static monthly requests area chart (SVG snapshot)
- `../demo/visual-preview.html` — a simple preview HTML page that embeds the SVGs

How to preview

1. Open `docs/demo/visual-preview.html` in your browser (via GitHub Pages or raw file server). In GitHub repo view use the raw file links.
2. For interactive charts, integrate Chart.js (or D3) into your frontend and bind real metrics. The preview includes examples and suggestions.

Recommendations

- Use SVG for structural diagrams (responsive, sharp at any scale).
- Use canvas-based charts (Chart.js) for high-frequency/large datasets for better performance.
- Add `<title>` and `<desc>` to SVGs for accessibility if required.

If you want interactive demos committed (Chart.js + sample data), say so and I'll add the JS and canvas examples under `docs/demo/`.
