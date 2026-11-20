# Wi‑Fi Tester

A privacy-first **Linux desktop application** that reads live Wi‑Fi telemetry from **NetworkManager** (read-only via `nmcli` or D‑Bus), persists sampled readings to a **local SQLite** database, and visualizes one hour of stability history per labelled location.

> **Strict local-only guarantees:** Never modifies Wi‑Fi settings, never triggers a hardware rescan (`--rescan no`), never stores passwords, BSSIDs, or traffic, and sends **zero bytes** off the machine.

---

## Key Features

- **Connection Status & Graceful Degradation:** Displays `Connected`, `No active Wi‑Fi`, or `NetworkManager Error` paired with SSID and interface name (`wlan0` / `wlp2s0`). When `nmcli` is unavailable or returns an error, renders an actionable error banner and logs the check as `unknown` (gap in chart, excluded from valid checks).
- **Signal Estimate & Tier Gauge:** Maps NetworkManager's `0–100` signal estimate to five fixed tiers (`Very weak <20`, `Weak 20–39`, `Fair 40–59`, `Good 60–79`, `Excellent 80–100`) and explicitly labels every reading as an estimate, not a calibrated dBm/RSSI measurement.
- **10-Second Automatic Polling + Check Now:** Polls every 10 seconds while the window is visible (automatically pausing when hidden to conserve laptop battery), plus a 300 ms debounced **Check now** button.
- **Location Labels (`≤ 80` chars):** Trims and collapses whitespace (`blank = "Unlabelled"`), commits on **Apply** or **Enter**, persists in `localStorage`, and scopes both the timeline chart and stability metrics strictly to the active location.
- **1-Hour Stability Metrics:**
  - **Online when checked:** `%` of valid checks (`Connected` / `Disconnected`) that were `Connected`.
  - **Observed dropouts:** Count of `Connected → Disconnected` transitions between consecutive valid checks `≤ 35 s` apart. Failed/`unknown` checks break adjacency.
- **Signal Timeline:** Plots observed samples only (`Connected = signal%`, `Disconnected = 0`, `Unknown/Error = gap` via Recharts `connectNulls={false}`).
- **Local SQLite Retention:** Stores `{ id, ts, state, iface, ssid, signal, location }` in `history.db` and prunes rows older than 7 days in a single atomic transaction on every save.
- **Responsive Edge-to-Edge Grid:** `2` columns on mobile (`<768px`), `4` columns on tablet (`768px–1023px`), `5` columns on desktop (`≥1024px`) with `1px` / `4px` outer side padding and `2px` inner focus rings for WCAG 2.4.7 keyboard visibility.

---

## Prerequisites (Linux)

- **Linux** with **NetworkManager** (`nmcli` CLI or `org.freedesktop.NetworkManager` D‑Bus service) running:
  - Debian / Ubuntu: `sudo apt install network-manager`
  - Fedora / RHEL: `sudo dnf install NetworkManager`
  - Arch Linux: `sudo pacman -S networkmanager`
- **Node.js ≥ 22.x** (for source runs and `node server.ts`).

---

## Development & Scripts

```bash
# Install dependencies
npm install

# Populate sample 1-hour multi-location seed data (Home Office, Living Room, Bedroom)
npm run seed

# Run full-stack development server (Express + Vite on port 3000)
npm run dev

# Build production client bundle and launch local server
npm run build
npm start

# Run the Vitest suite (signal tiers, 20-sequence dropout fixture, SQLite pruning, nmcli parser, zero-egress audit)
npm test

# Type-check
npm run lint
```

### Swapping NetworkManager Adapters

By default, `NmcliAdapter` executes passive `nmcli -t` commands with `--rescan no`. To switch to the D‑Bus adapter:

```bash
WIFI_ADAPTER=dbus npm start
```

---

## Cross-Distro Linux Packaging (AppImage & `.deb`)

Desktop packaging is configured in `electron-builder.yml` with `electron/main.cjs` (binding strictly to loopback `127.0.0.1` and storing SQLite in XDG user data) and `desktop/wifi-tester.desktop`:

```bash
# Build production frontend first
npm run build

# Install electron & electron-builder in your local Linux build environment
npm install -D electron electron-builder

# Package .AppImage and .deb artifacts into ./release/
npx electron-builder --linux AppImage deb --config electron-builder.yml
```

> **Debian / Ubuntu note:** When installing the `.deb` package, `network-manager` and desktop webview runtime dependencies (`libgtk-3-0`, `libnss3`, `libasound2` / `libwebkit2gtk-4.1-0` for Tauri builds) are declared in the package metadata.

---

## SQLite Schema & Privacy Audit

```sql
CREATE TABLE readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('connected', 'disconnected', 'error', 'unknown')),
  iface TEXT,
  ssid TEXT,
  signal INTEGER,
  location TEXT NOT NULL
);
```

- **Never stored:** Passwords/PSK, BSSIDs/MAC addresses, IP addresses, DNS logs, or network traffic.
- **7-day retention:** Every `saveAndPrune()` wraps `INSERT` and `DELETE FROM readings WHERE ts < (now - 7 days)` in one SQLite transaction and logs `[sqlite] pruned N rows older than 7 days`.
- **Edge padding & WCAG 2.4.7:** Because the outer container uses `1px` (mobile/tablet) and `4px` (desktop) side padding, all cards and interactive controls render a `2px` **inner** focus ring (`focus-visible:ring-inset`) so keyboard focus outlines are never clipped by viewport edges.
