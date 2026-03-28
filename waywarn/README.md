# 🛡️ WayWarn

> AI-powered road safety & navigation PWA for Indian roads

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
# Fill in your Firebase and OpenWeather keys
```
> **No keys?** No problem — the app auto-switches to **Demo Mode**, simulating driving around Rajpath, New Delhi.

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on mobile browser or Chrome DevTools (430px width).

---

## 🧭 Features
| Feature | Description |
|---|---|
| Smart Route Planning | 3 routes from OSRM, scored by AI + real hazards |
| AI Pothole Prediction | TensorFlow.js dense net, runs in browser |
| Live Navigation | GPS simulation + proximity alerts |
| Hazard Reporting | Camera upload + MobileNet image classifier |
| Offline PWA | IndexedDB cache + service worker |

## 🛠️ Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Maps**: Leaflet.js + OpenStreetMap (Nominatim + OSRM)
- **Backend**: Firebase Auth + Firestore
- **AI/ML**: TensorFlow.js + MobileNet v2
- **Offline**: IndexedDB (idb) + next-pwa
- **Animations**: Framer Motion
- **Styling**: CSS Modules (dark glassmorphism)

## 📁 Build Steps (Git History)
Each step is a separate commit:
1. `feat: scaffold Next.js project with dependencies`
2. `feat: design system and global styles`
3. `feat: Firebase auth and login page`
4. `feat: Leaflet map with dark tiles and bottom nav`
5. `feat: smart route planning with OSRM`
6. `feat: TensorFlow.js pothole prediction`
7. `feat: live navigation and proximity alerts`
8. `feat: hazard report page`
9. `feat: routes comparison page`
10. `feat: PWA offline support and final polish`

## 📱 Mobile First
Optimized for 430px width. Install as PWA on Android Chrome for the best experience.

## 🏆 Hackathon Demo
If Firebase isn't configured, Demo Mode automatically simulates:
- Route planning in New Delhi (Rajpath → India Gate)
- AI pothole prediction along route
- Live navigation with proximity alerts
