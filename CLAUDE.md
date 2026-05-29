# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A static web app for tracking book inventory ("Currículo Base") deliveries across schools in the Comité de Cafeteros region. Field agents fill out [index.html](index.html); coordinators monitor data in [admin.html](admin.html).

There is no build system, no dependencies, no package manager. The app runs by opening HTML files directly in a browser or serving them with any static file server.

## Running locally

```powershell
# Simplest option — serve from project root:
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` (form) or `http://localhost:8080/admin.html` (dashboard).

There are no tests and no linter configured.

## Architecture

**Three JS files, two HTML pages, one external API.**

```
index.html      ← public inventory-entry form (all CSS inlined)
admin.html      ← admin dashboard with sidebar + table/summary views (all CSS inlined)
js/config.js    ← single CONFIG object with GAS_URL
js/form.js      ← form logic: chained dropdowns, libro table, modal, submit
js/admin.js     ← admin logic: filters, table render, summary render, KPIs
```

All CSS lives inside `<style>` blocks in each HTML file — there are no external `.css` files. Both pages use the same CSS custom-property palette (`--s950` through `--s50` for slate scale, `--ind*` for indigo, `--em*` for emerald, `--amb*` for amber, `--re*` for red).

**Backend: Google Apps Script (GAS)**

All data is stored and retrieved via a single GAS web app URL defined in `js/config.js`. The `gas()` helper in each JS file wraps `fetch()`:

- GET requests pass `accion` and query params as URL search params.
- POST requests (`saveRegistro`) send JSON with `Content-Type: text/plain` (required by GAS CORS policy).

GAS endpoints used by the form (`form.js`):
| accion | method | params | returns |
|---|---|---|---|
| `catalogos` | GET | — | `{ municipios[], padrinos[] }` |
| `ies` | GET | `municipio` | `string[]` |
| `sedes` | GET | `municipio, ie` | `string[]` |
| `libros` | GET | `tipo` | `string[]` |
| `saveRegistro` | POST | body: `{ fecha, municipio, ie, sede, padrino, tipo, cantidades[] }` | `{ ok }` |

GAS endpoint used by the admin (`admin.js`):
| accion | method | returns |
|---|---|---|
| `admin` | GET | `{ tecnico: Record[], tecnologo: Record[] }` |

Each record in the admin response is expected to have `Municipio`, `IE`, `Sede`, `Padrino`, `Fecha`, `_libros` (array of `{libro, cantidad}`), and `_kits` (minimum libro quantity).

## Key conventions

- Currículo type is either `'tecnico'` or `'tecnologo'` (lowercase string, never translated until display).
- `_kits` for a sede is `Math.min(...cantidades)` — the number of complete kits = the scarcest libro.
- Chip color thresholds: `>= 10` → green (`hi`), `>= 5` → amber (`md`), `< 5` → red (`lo`).
- To update the GAS endpoint, change only `CONFIG.GAS_URL` in [js/config.js](js/config.js).
