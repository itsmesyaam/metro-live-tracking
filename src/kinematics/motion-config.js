/**
 * Kochi Metro Kinematics & Motion Configuration
 * All physical, rendering, and timing constants grouped in a single tunable store.
 */

export const MOTION_CONFIG = {
  // Physical acceleration & deceleration in m/s^2 (aligned with Alstom Metropolis EMU specs)
  acceleration: 1.0,           // m/s^2 (~3.6 km/h per second)
  deceleration: 1.0,           // m/s^2 (service braking)
  maxCruisingSpeedKmh: 80,     // km/h (KMRL maximum design operational speed)
  maxCruisingSpeedMs: 80 / 3.6, // ~22.22 m/s

  // Station Platform Dwell
  dwellDurationSeconds: 24,    // 24 seconds dwell for passenger boarding/alighting

  // Delta Time & Loop Guards
  maxDeltaTimeSeconds: 0.1,    // 100ms clamp (prevents leap-forward after tab suspend)
  simulationSpeedMultiplier: 1.0, // 1x normal speed (up to 10x for fast-forward demo)

  // Position Blending & Dead Reckoning
  blendDurationSeconds: 1.2,   // 1.2s smooth decay of schedule telemetric corrections
  teleportThresholdMeters: 500,// If error > 500m, fade & snap instead of sliding

  // Heading & Angle Smoothing
  headingSmoothingAlpha: 0.15, // Low-pass filter weight per step (0.0 to 1.0)

  // Visuals & Trails
  trailLengthMeters: 200,      // Length of fading polyline trail trailing the train
  trailMaxPoints: 40,          // Maximum polyline vertices stored per train trail
  trailInitialOpacity: 0.35,   // Initial alpha of trail at train rear

  // Train Marker Dimensions (Pixels on Canvas)
  markerLength: 48,            // 3-coach articulated length
  markerWidth: 14,             // Coach body width
  markerSelectedScale: 1.25,   // Scale multiplier when train is selected

  // Colors
  colors: {
    southbound: '#00897b',      // KMRL signature teal (Towards Thrippunithura)
    southboundAccent: '#06b6d4',// Lighter nose/visor
    northbound: '#10b981',      // Emerald (Towards Aluva)
    northboundAccent: '#34d399',// Lighter nose/visor
    dwellingGlow: '#f59e0b',    // Soft amber halo when doors are open at platform
    selectedRing: '#f43f5e',    // Rose focus ring
  },

  // Performance Safeguards
  performance: {
    dropTrailFrameBudgetMs: 22, // If frame takes > 22ms, drop trails to protect 60fps
    frustumPaddingPixels: 80,   // Canvas margin for off-screen culling
  }
};
