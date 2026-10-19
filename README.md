# 🚆 Kochi Metro — Premium Live Tracking & Trip Guide

A redesigned, Apple-grade transit web app for the **Kochi Metro Blue Line (Aluva ↔ Thrippunithura • 28.1 km)**. Engineered around one central question: **"Where are you going?"**, with purposeful motion patterns, accessible WCAG AA contrast, and 60fps performance on mid-range Android devices.

Live: [metro-live-tracking.vercel.app](https://metro-live-tracking.vercel.app/)

---

## 🎯 Design Architecture: "Where are you going?"

1. **Trip Home Screen**:
   - **From / To Station Pickers**: Geolocation automatically detects and pre-fills the closest station.
   - **Swap Morph Button**: Cross-slides station fields past each other with spring physics while rotating the swap icon 180°.
   - **Large Answer Card**: Immediately provides the essential commute answer:
     - Next train in **X min** with an animated draining circular progress ring.
     - Platform & direction in plain language (e.g. `Platform 2 · towards Thrippunithura`).
     - Fare in ₹ (with 10% Kochi1 Card discount), trip duration, and estimated arrival time.
   - **Stops On Your Trip**: SVG route line that draws itself from origin to destination with popping station dots. Long trips collapse intermediate stops into `+ N more stops` to eliminate scroll fatigue.
2. **Three-Tab Bottom Navigation**:
   - **Trip**: Instant route & countdown answer.
   - **Live Map**: Lazy-loaded Google Maps corridor view with live gliding train marker.
   - **Stations**: Complete 25-station searchable directory with cultural themes and chainages.
3. **Bilingual Support**: Instant toggle between English and Malayalam (മലയാളം).
4. **Honest Status**: Labeled **"Simulated"** to honestly reflect simulated real-time schedule kinematics.
5. **Secondary "Demo & Extras"**: Viaduct Cam (60 FPS Alstom Metropolis rake), time simulator, and corridor schematic tucked into a discrete drawer to keep the primary screen uncluttered.

---

## 🪄 The 6 Motion Patterns (Apple / Swishy-Inspired)

| # | Motion Pattern | Placement | Specification |
|---|---|---|---|
| **1** | **Page Reveal** | App load & tab switches | `translateY(24px)`, `opacity: 0`, `filter: blur(8px)` &rarr; `0 / 1 / blur(0)` over **500ms** with `cubic-bezier(0.22, 1, 0.36, 1)`. Child sections staggered by **60ms**. |
| **2** | **Rolling Numbers** | Next-train figure, fare, arrival | Vertical odometer roll over **400ms** with spring (`stiffness: 300, damping: 30`). Only changed digits animate. Tabular numbers prevent jitter. |
| **3** | **Circular Countdown** | Ring around next-train figure | Thin SVG ring draining with `stroke-dashoffset`. Under 1 minute: smoothly shifts color to warm amber and breathes gently once every **2s** (`scale: 1.035`). Calm, never alarming. |
| **4** | **Journey Progress Line** | Stop list & map corridor line | SVG path draws itself from origin to destination (**600ms**). Station dots pop in with **40ms stagger** (`scale 0.6 &rarr; 1`). In Live mode, train marker glides using rAF interpolation. |
| **5** | **Spring Notification Stack** | 2-min arrival heads-up & alerts | Slides down from top with spring (`stiffness: 400, damping: 28`). Older alerts compress behind (`scale: 0.95`, `translateY: 8px`). Swipe to dismiss. Triggers `navigator.vibrate(20)`. |
| **6** | **Swap Morph** | From/To swap button | Icon rotates **180°**, station fields cross-slide past each other (**300ms spring**), followed by Rolling Number re-calculation. |

---

## ♿ Accessibility & Performance

- **Reduced Motion**: Respects `prefers-reduced-motion: reduce`. Disables all spatial spring movements, pulses, and line drawing, falling back to gentle 150ms opacity fades.
- **Screen Reader Announcements**: `aria-live="polite"` on next-train countdown, throttled so announcements occur at most once per minute.
- **Touch Targets**: All interactive elements satisfy Apple/WCAG minimums of **44×44px**.
- **Performance Budget**: Animates strictly `transform`, `opacity`, and `filter`. Map is lazy-loaded only when requested.

---

## 🛠️ Project Structure

```
├── index.html                  # Core application entry
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite bundler configuration
└── src/
    ├── motion-tokens.js        # Shared motion tokens & analytical spring generator
    └── components/
        ├── PageReveal.js          # Animation 1: Ease & blur page reveal
        ├── RollingNumber.js       # Animation 2: Odometer rolling numbers
        ├── CircularCountdown.js   # Animation 3: SVG draining progress ring
        ├── JourneyProgressLine.js # Animation 4: Self-drawing route path & dots
        ├── NotificationStack.js   # Animation 5: Spring notification card stack
        └── SwapMorph.js           # Animation 6: Cross-sliding swap micro-interaction
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Visit `http://localhost:3000`.
