/**
 * Kochi Metro Motion Tokens
 * Apple-grade precision springs, durations, easings, and stagger values.
 * All animations in the app MUST source from this file.
 */

export const MOTION = {
  // Animation 1: Page reveal ("ease and blur in from bottom")
  pageReveal: {
    duration: 500, // ms
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    yOffset: 24, // px
    blur: 8, // px
    childStagger: 60, // ms between child sections
  },

  // Animation 2: Rolling number countdown ("years rolling text")
  rollingNumber: {
    duration: 400, // ms
    spring: {
      stiffness: 300,
      damping: 30,
      mass: 1,
    },
    cssBezier: 'cubic-bezier(0.34, 1.35, 0.64, 1)',
  },

  // Animation 3: Circular progress countdown ("dramatic countdown timer with circular progress")
  circularProgress: {
    pulseDuration: 2000, // ms
    underMinuteThreshold: 60, // seconds
    calmPulseKeyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.035)', opacity: 0.88 },
      { transform: 'scale(1)', opacity: 1 },
    ],
  },

  // Animation 4: Journey progress line ("flight progress" + "pencil drawing path")
  journeyLine: {
    drawDuration: 600, // ms
    drawEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    dotStagger: 40, // ms
    dotScaleStart: 0.6,
    dotSpringBezier: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  },

  // Animation 5: Spring notification stack ("stack of notification cards sliding in with spring physics")
  notificationStack: {
    spring: {
      stiffness: 400,
      damping: 28,
      mass: 1,
    },
    slideInDuration: 380, // ms
    cssSpringBezier: 'cubic-bezier(0.175, 0.885, 0.32, 1.15)',
    backCardScale: 0.95,
    backCardOffsetY: 8, // px
    hapticDuration: 20, // ms
  },

  // Animation 6: Swap morph ("shape morphing" + micro-interaction)
  swapMorph: {
    duration: 300, // ms
    rotation: 180, // deg
    springBezier: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
  },

  // Reduced motion fallback
  reducedMotion: {
    duration: 150, // ms
    easing: 'ease-out',
  },
};

/**
 * Helper to check user preference for reduced motion
 */
export function isReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Analytical Spring Keyframe Generator for Web Animations API
 * Produces physical damped harmonic oscillation keyframes without external libraries.
 */
export function generateSpringKeyframes({
  stiffness = 300,
  damping = 30,
  mass = 1,
  duration = 400,
  from = 0,
  to = 1,
  steps = 30,
}) {
  const delta = to - from;
  if (isReducedMotion() || delta === 0) {
    return [
      { transform: `translateY(${from}px)`, opacity: 0 },
      { transform: `translateY(${to}px)`, opacity: 1 },
    ];
  }

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const omegaD = omega0 * Math.sqrt(Math.max(0, 1 - zeta * zeta));

  const keyframes = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (duration / 1000);
    let val;

    if (zeta < 1) {
      // Underdamped spring
      const decay = Math.exp(-zeta * omega0 * t);
      const envelope =
        Math.cos(omegaD * t) +
        ((zeta * omega0) / (omegaD || 0.0001)) * Math.sin(omegaD * t);
      val = 1 - decay * envelope;
    } else {
      // Critically damped / overdamped
      val = 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
    }

    const currentPos = from + delta * val;
    keyframes.push({ transform: `translateY(${currentPos}px)` });
  }

  return keyframes;
}
