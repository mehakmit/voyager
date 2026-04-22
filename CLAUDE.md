# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Type-check + production build
npm run preview    # Preview production build locally
```

## Environment Setup

Copy `.env.example` to `.env` and fill in Firebase project credentials before running. Without these the app will fail to initialize Firebase.

## Architecture

**Voyager** is an offline-first trip planning PWA. The key architectural decisions:

- **Local-first via Firebase offline persistence** — Firestore's `enableIndexedDbPersistence` is enabled in `src/lib/firebase.ts`. Data is cached in IndexedDB; reads/writes work offline and sync when connectivity returns.
- **PWA via `vite-plugin-pwa`** — service worker precaches all assets. Install with `--legacy-peer-deps` because vite-plugin-pwa hasn't yet declared support for Vite 8.
- **Path alias** — `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Data model (Firestore collections)

| Collection | Document key | Notes |
|---|---|---|
| `trips` | auto ID | `members: string[]` (UIDs) — Firestore rules restrict reads to members only |
| `tickets` | auto ID | `tripId` foreign key; `parsed` holds OCR/extracted fields; `manualOverrides` holds user corrections |
| `expenses` | auto ID | `tripId` foreign key |
| `cars` | `tripId` (same as trip ID) | One car per trip |

### Access control

`firestore.rules` enforces that only trip members can read or write any document in a trip. **Deploy these rules to Firebase before going live** — without them all data is publicly accessible.

### Ticket parsing pipeline (`src/lib/`)

1. `extractText.ts` — uses `pdfjs-dist` for PDFs (extracts selectable text) and `tesseract.js` for images (OCR). Both run entirely in the browser.
2. `parseTicket.ts` — applies regex patterns to the extracted text to detect ticket type and pull out fields (flight number, IATA codes, times, booking ref, hotel name, etc).

Parsed results live in `ticket.parsed`; user edits are stored in `ticket.manualOverrides`. Always merge them as `{ ...ticket.parsed, ...ticket.manualOverrides }` when displaying.

### Trip invite flow

Each trip has an `inviteToken` (random 16-char string). Sharing `/join/:token` lets a new user join — `JoinPage.tsx` queries Firestore for a trip with that token and adds the user's UID to `members`.

### Optional tabs

`Expenses` and `Car` tabs are hidden by default and toggled in trip settings (`trip.settings.showExpenses`, `trip.settings.showCar`). The owner controls this from the settings modal (gear icon).
