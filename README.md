# PushUp — Small reps. Big progress.

An installable, 100% client-side Progressive Web App (PWA) with real-time MoveNet computer vision pose detection, tactile manual rep counter, interactive Three.js 3D Push-Up Biomechanics Lab, and local workout analytics.

---

## Key Features

1. **Camera-Based Pose Counter**:
   - Uses TensorFlow.js and MoveNet SinglePose Lightning running 100% locally in your browser.
   - Real-time elbow angle calculation (shoulder-elbow-wrist coordinates).
   - Form feedback & depth detection with configurable angles and rep cooldowns.
   - Privacy-first: Webcam frames are processed in-memory and never recorded or uploaded.

2. **Manual Tactile Rep Counter**:
   - Large touch button (+1), quick additions (+5, +10), undo (-1), and reset.
   - Keyboard shortcuts: `Space` or `↑` for reps, `U` to undo, `P` to pause/resume.
   - Live workout session timer and configurable rest interval timer with synthetic audio chimes.

3. **3D Biomechanics & Posture Lab (Three.js)**:
   - Composite procedural 3D anatomical mannequin with realistic plank kinematics.
   - Scrub through push-up depth phases from top plank (165°) to chest-to-mat (88°).
   - Compare safe 45° arrow elbow flare vs. hazardous 90° shoulder impingement.
   - Damped camera controls, studio PBR lighting (`ACESFilmicToneMapping`, `RoomEnvironment`), and collapsible bottom dock.

4. **Progress, History & Streaks**:
   - Real-time streaks calculated using local calendar dates.
   - Responsive SVG bar chart for 7-day daily reps with goal threshold indicator.
   - Weekly & monthly consistency metrics.
   - Genuine milestone achievements earned only from verified workouts.
   - Full CSV export and JSON backup import/export with duplicate avoidance.

5. **PWA & Offline Capability**:
   - Installable on desktop, Android, and iOS Safari (`beforeinstallprompt` + iOS Share flow).
   - Service worker caching for fast offline usage.
   - Persistent Light & Dark modes adhering to the Warm Ivory, Pure White, Charcoal, and Terracotta design system.

---

## Color Palette

- **Warm Ivory**: `#F5F4EF` (Light background)
- **Pure White**: `#FFFFFF` (Cards and surfaces)
- **Charcoal**: `#262624` (Primary typography)
- **Terracotta**: `#C5684D` (Brand accents and primary buttons)
- **Soft Stone**: `#E8E6DF` (Borders and progress tracks)
- **Dark Charcoal**: `#20201E` (Dark background)

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run dev server on port 3000
npm run dev

# 3. Run automated unit tests
npm test
# or: node --test

# 4. Build production static bundle
npm run build
```

---

## Deployment (Vercel / GitHub Pages)

PushUp is completely static and client-side (no server, database, or API keys required).

### Vercel
1. Connect your repository to Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Deploy over HTTPS (required for camera permission).

### GitHub Pages
1. Set `base: './'` in `vite.config.ts` if deploying to a repository subpath.
2. Run `npm run build`.
3. Deploy the contents of the `dist/` directory to the `gh-pages` branch.

---

## Camera Permission Requirements

Webcam access requires a secure origin:
- `http://localhost` during local development.
- `https://` on production domains (e.g. Vercel, Netlify, Cloud Run).
- On mobile browsers, grant camera access when prompted upon clicking **Start AI Camera**.

---

## Third-Party Dependencies & Licenses

- **React & React-DOM** (MIT)
- **Three.js** (MIT)
- **TensorFlow.js & MoveNet** (Apache-2.0)
- **Lucide React** (ISC)
- **Canvas-Confetti** (ISC)
- **Tailwind CSS** (MIT)
- **Vite** (MIT)

---

## Testing Scenarios

1. **First-Time Visit**: Dashboard displays clean empty states and 0 reps without hardcoded dummy data.
2. **Manual Counter**: Add reps (+1, +5, +10), undo, test keyboard shortcuts (Space / U).
3. **Finish & Save**: Log workout, verify confetti burst and sound chime, check history.
4. **Data Persistence**: Refresh browser; verify stats and streak persist in `localStorage`.
5. **3D Biomechanics**: Scrub phase slider, switch elbow flare from 45° to 90° (verifying shoulder risk indicator), test camera angles.
6. **Data Portability**: Export JSON backup, export CSV history, test JSON re-import.
7. **PWA Install**: Click install button in navigation; test offline banner in airplane mode.

---

## Developer

Developed with precision by **Ameen**.
- Portfolio: [https://iamameen.vercel.app/](https://iamameen.vercel.app/)

