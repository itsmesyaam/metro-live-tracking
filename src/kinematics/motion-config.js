/**
 * Kochi Metro Kinematics & Motion Configuration
 * Single comprehensive configuration object containing all physical, timing,
 * error correction, and rendering constants for the Kochi Metro Blue Line (Aluva -> Thrippunithura).
 */

export const MOTION_CONFIG = {
  // Corridor & Network Specs
  totalLineLengthMeters: 28130, // 28.13 km Aluva to Thrippunithura Terminal
  totalStations: 25,
  timeZone: 'Asia/Kolkata',     // Strict IST (UTC+05:30) timezone for KMRL timetables

  // Authoritative Data Tick Architecture
  tickIntervalMs: 2000,         // Authoritative data snapshot published every 2000 ms
  sourceMode: 'LIVE',           // 'LIVE' (KMRL Timetable IST) | 'SIMULATED'

  // Physical Kinematics (Alstom Metropolis 3-coach EMU)
  acceleration: 1.0,            // m/s^2 (~3.6 km/h per second acceleration)
  deceleration: 1.0,            // m/s^2 (service braking deceleration)
  maxCruisingSpeedKmh: 80,      // km/h (KMRL maximum design operating speed)
  maxCruisingSpeedMs: 80 / 3.6, // ~22.22 m/s
  dwellDurationSeconds: 24,     // 24 seconds platform dwell for commuter boarding/alighting

  // Delta Time & Loop Guards
  maxDeltaTimeSeconds: 0.1,     // 100 ms clamp (prevents leap-forward after tab suspend)
  simulationSpeedMultiplier: 1.0, // 1x normal speed (adjustable in Extras)

  // Multi-Tiered Error Blending
  microErrorThresholdMeters: 50,  // < 50m: imperceptible speed trim over 2.0s update window
  macroErrorThresholdMeters: 500, // 50m - 500m: smooth cubic ease over 800 ms
  teleportThresholdMeters: 500,   // > 500m: 250 ms fade-out, snap to true position, 250 ms fade-in
  macroEaseDurationMs: 800,       // 800 ms cubic ease duration
  fadeSnapDurationMs: 250,        // 250 ms fade duration
  neverMoveBackward: true,        // Strict rail physics: trains never move in reverse when ahead

  // Heading & Angle Smoothing
  headingSmoothingAlpha: 0.12,   // Low-pass filter weight per frame (avoids curve jitter)

  // Motion Trails & Visuals
  trailLengthMeters: 200,        // 200m fading polyline trail trailing each active train
  trailMaxPoints: 45,            // Maximum polyline vertices stored per train trail
  trailInitialOpacity: 0.40,     // Initial alpha of trail at train rear

  // Train Marker Dimensions (Pixels on HTML5 Canvas)
  markerLength: 48,              // 3-coach articulated length
  markerWidth: 14,               // Coach body width
  markerSelectedScale: 1.25,     // Scale multiplier when train is selected

  // Color Palette
  colors: {
    southbound: '#eb5e28',        // Spicy Paprika (Towards Thrippunithura)
    southboundAccent: '#f48a5f',  // Lighter paprika aerodynamic nose visor
    northbound: '#ccc5b9',        // Dust grey (Towards Aluva)
    northboundAccent: '#fffcf2',  // Floral white aerodynamic nose visor
    dwellingGlow: '#fffcf2',      // Floral white halo when doors are open at platform
    selectedRing: '#eb5e28',      // Paprika focus ring
    headlightBeam: 'rgba(255, 252, 242, 0.65)', // Warm floral white headlight glow
  },

  // Performance Safeguards
  performance: {
    dropTrailFrameBudgetMs: 20,   // If frame exceeds 20ms, drop trails to protect 60fps
    frustumPaddingPixels: 80,     // Canvas margin for off-screen culling
  }
};
