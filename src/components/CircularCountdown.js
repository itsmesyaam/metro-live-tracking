/**
 * Animation 3: Circular Progress Countdown ("dramatic countdown timer with circular progress")
 * Where: Thin SVG ring enclosing the next-train countdown figure.
 * Motion: stroke-dashoffset drains smoothly.
 * Under 1 min: Color transitions to calm amber & gently breathes once every 2 seconds (never alarming).
 */
import { MOTION, isReducedMotion } from '../motion-tokens.js';

export class CircularCountdown {
  constructor(svgElement, options = {}) {
    this.svg = svgElement;
    this.radius = options.radius || 42;
    this.strokeWidth = options.strokeWidth || 3.5;
    this.circumference = 2 * Math.PI * this.radius;
    this.isPulsing = false;
    this.pulseAnimation = null;
    this.normalColor = options.normalColor || 'var(--km-accent, #00897b)';
    this.warningColor = options.warningColor || '#f59e0b';

    this.render();
  }

  render() {
    this.svg.innerHTML = `
      <circle
        class="countdown-track"
        cx="50%"
        cy="50%"
        r="${this.radius}"
        fill="none"
        stroke="currentColor"
        stroke-opacity="0.12"
        stroke-width="${this.strokeWidth}"
      />
      <circle
        class="countdown-progress"
        cx="50%"
        cy="50%"
        r="${this.radius}"
        fill="none"
        stroke="${this.normalColor}"
        stroke-width="${this.strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${this.circumference}"
        stroke-dashoffset="0"
        transform="rotate(-90 ${this.radius + this.strokeWidth} ${this.radius + this.strokeWidth})"
        style="transition: stroke-dashoffset 0.6s linear, stroke 0.4s ease;"
      />
    `;

    this.progressCircle = this.svg.querySelector('.countdown-progress');
  }

  update(remainingSeconds, totalWindowSeconds = 480) {
    if (!this.progressCircle) return;

    const clampedRemaining = Math.max(0, remainingSeconds);
    const fraction = Math.min(1, clampedRemaining / totalWindowSeconds);
    const offset = this.circumference * (1 - fraction);

    this.progressCircle.style.strokeDashoffset = offset;

    // Under 1 minute condition
    const isUnderMinute = clampedRemaining < MOTION.circularProgress.underMinuteThreshold && clampedRemaining > 0;

    if (isUnderMinute) {
      this.progressCircle.setAttribute('stroke', this.warningColor);
      this.startCalmPulse();
    } else {
      this.progressCircle.setAttribute('stroke', this.normalColor);
      this.stopCalmPulse();
    }
  }

  startCalmPulse() {
    if (this.isPulsing || isReducedMotion()) return;
    this.isPulsing = true;

    this.pulseAnimation = this.svg.animate(
      MOTION.circularProgress.calmPulseKeyframes,
      {
        duration: MOTION.circularProgress.pulseDuration,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    );
  }

  stopCalmPulse() {
    if (!this.isPulsing) return;
    this.isPulsing = false;
    if (this.pulseAnimation) {
      this.pulseAnimation.cancel();
      this.pulseAnimation = null;
    }
  }
}
