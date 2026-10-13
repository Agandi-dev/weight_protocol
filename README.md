# Weight Protocol

A small, dependency-free web app for tracking your body weight over time. Log a weight for any day, see it plotted on a monthly graph, and keep an eye on trends with a moving average and an optional goal line.

## Features

- **Log entries** — enter a date and weight; logging again for an existing date updates it instead of creating a duplicate.
- **Monthly graph** — an SVG chart of the currently selected month, with navigation to move between months.
- **Edit / delete entries** — click any point on the graph to open a popup for editing or deleting that entry.
- **Moving average line** — a smoothed trend line computed over a configurable number of recent entries.
- **Goal line** — set a target weight and see it drawn as a horizontal reference line on the graph.
- **Monthly change summary** — shows how much weight was gained or lost over the currently viewed month.
- **Settings panel** — switch between kg and lbs (converts all displayed values), choose a date format for tooltips, set the moving average window, and clear all data.
- **No backend** — all data is stored locally in the browser via `localStorage`; nothing is sent over the network.

## Usage

This is a static site with no build step or dependencies. Just open `index.html` in a browser, or serve the folder with any static file server, e.g.:

```bash
npx serve .
```

## Files

- `index.html` — page structure and markup for the form, graph, and settings/edit popups
- `style.css` — styling
- `script.js` — all application logic (data handling, graph rendering, settings)

## License

Licensed under the GNU Lesser General Public License v2.1 — see [LICENSE](LICENSE).
