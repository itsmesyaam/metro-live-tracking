# 🚆 Kochi Metro Live Tracking & Viaduct Radar (CARE-ONE Design Edition)

A high-performance, real-time web application for tracking the **Kochi Metro Blue Line (Aluva ↔ Thrippunithura Terminal • 28.125 km)**, featuring 60 FPS kinematic train tracking, real Google Maps integration, interactive viaduct camera, fare calculator, and a complete redesign inspired by the bespoke aesthetic of [**CARE-ONE**](https://github.com/itsmesyaam/CARE-ONE-).

---

## ✨ Design Identity: Inspired by CARE-ONE

This redesign borrows key design elements from [CARE-ONE](https://github.com/itsmesyaam/CARE-ONE-), elevating the transit experience:

1. **Three Cohesive Design Themes**:
   - 🏥 **DoctorCare Modern (Executive Light)**: Crisp porcelain surfaces (`#f4f6fb`), deep ink (`#0b1533`), electric royal blue (`#1f5eff`), and luxury soft elevation shadows (`0 16px 34px -20px rgba(11, 21, 51, 0.14)`).
   - 🌿 **Kerala Kasavu Heritage**: Traditional Kerala paper (`#f3f5ee`), Periyar forest leaf green (`#1f6b4f`), Kasavu gold zari accents (`#c9a43b`), and laterite terracotta highlights (`#b23f2c`).
   - 🌙 **Midnight Metro Radar**: Dark nocturnal cockpit mode (`#070d19` & `#0f172a`) with vibrant cyan and emerald telemetry glow.

2. **Editorial & Authentic Typography**:
   - **Primary Sans**: `Plus Jakarta Sans` for crisp UI readability.
   - **Editorial Display**: `Instrument Serif` (italic) for titles (*"Live Fleet Tracker"*, station themes).
   - **Malayalam Calligraphy**: `Anek Malayalam` & `Noto Sans Malayalam` for authentic bilingual station signboards.
   - **Technical Monospace**: `JetBrains Mono` for train rake codes, speeds, chainages, and tabular countdowns.

3. **Signature CARE-ONE UI Components**:
   - 🎫 **The Perforated Ticket Stub**: Styled like a physical train boarding pass with perforated tear-line stub, circular ticket cutouts, big tabular countdowns, and platform indicator.
   - 🎴 **Elevated `.card-dc`**: 26px rounded corners, subtle borders (`rgba(11, 21, 51, 0.08)`), and smooth hover lift physics (`translateY(-3px)`).
   - 🔘 **Pill Buttons (`.btn-pill`)**: Tactile 9999px rounded pills with bold labels and active depression states.
   - 🟢 **Live Pulse Indicator (`.live-pulse`)**: Expanding dual-ring radar ping wave synced with Indian Standard Time (IST).

---

## ⚡ Key Features

- **60 FPS Live Viaduct Cam**:
  - Parallax HTML5 Canvas visualizer rendering the Kochi skyline, coconut palms, Vembanad backwater reflections, elevated KMRL concrete viaduct with vertical green gardens, and the authentic 3-coach **Alstom Metropolis** train (Teal & Lime livery, bogies, animated headlights, passenger cabin glow, and door indicators).
- **Interactive Google Maps View of Kochi**:
  - Official Google Maps Road network (`lyrs=m`), Google Satellite Hybrid (`lyrs=y`), Terrain (`lyrs=p`), and Midnight Radar basemaps.
  - Realistic rotated 3-coach train markers computed from exact track bearings with live speed callouts.
  - Interactive Google Maps Place Inspector drawer (slide-over picture-in-picture embed for any station or train coordinate).
- **All 25 Blue Line Stations (Phase 1 + 1B)**:
  - Aluva, Pulinchodu, Companypady, Ambattukavu, Muttom, Kalamassery, Cochin University (CUSAT), Pathadipalam, Edapally, Changampuzha Park, Palarivattom, JLN Stadium, Kaloor, Town Hall, MG Road, Maharajas College, Ernakulam South, Kadavanthra, Elamkulam, Vyttila Mobility Hub, Thykoodam, Pettah, Vadakkekotta, SN Junction, and Thrippunithura Terminal.
- **Smart Fare & Journey Calculator**:
  - Origin & Destination selectors with 1-click direction swap.
  - Accurate KMRL fare calculation (₹10 – ₹60) with Kochi1 Smart Card discounts (-10%).
  - Real-time departure board with live countdown timers.
- **Multilingual Station Directory**:
  - Station details in English, Malayalam (മലയാളം), and Hindi (हिन्दी).
  - Cultural station themes (e.g., Aluva Periyar river basin, Edapally spices heritage, Changampuzha poetry, Vyttila Water Metro & Vallamkali).
  - Multimodal interchange badges (Wheelchair, Feeder Bus, Indian Railways, Water Metro, Lulu Skywalk).
- **Corridor Dual-Track Schematic**:
  - Interactive linear schematic tracking all down-line (Southbound) and up-line (Northbound) rakes in real time.
- **Kinematic Simulation Controls**:
  - Live IST Clock Sync, 1x, 10x (fast-forward), 30x speeds, pause/play, and quick time presets (Morning Peak, Midday, Evening Rush, Late Night, First Wave).

---

## 🚀 Quick Start

### Option 1: Direct Browser Opening (No Build Required)
Simply double-click or open `index.html` in any modern web browser. The app is completely self-contained with CDN dependencies.

### Option 2: Running with Vite Dev Server
```bash
# Clone the repository
git clone https://github.com/itsmesyaam/metro-live-tracking.git
cd metro-live-tracking

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Option 3: Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Technology Stack

- **HTML5 Canvas**: 60 FPS viaduct scenery, parallax scrolling, train suspension kinematics.
- **Tailwind CSS**: Utility-first styling with custom theme token mappings.
- **Leaflet.js + Google Maps Tiles**: Geographic viaduct rendering, marker transforms, and bounding boxes.
- **Lucide Icons**: Feather-light icons.
- **Google Fonts**: Plus Jakarta Sans, Instrument Serif, Anek Malayalam, Noto Sans Malayalam, and JetBrains Mono.
- **Vite**: Ultra-fast build tool and developer environment.

---

## 📄 License & Attribution

- Built with inspiration from [CARE-ONE](https://github.com/itsmesyaam/CARE-ONE-).
- Timetable and fare matrices based on official [Kochi Metro Rail Limited (KMRL)](https://kochimetro.org/) GTFS data.
- Open source under the MIT License.
