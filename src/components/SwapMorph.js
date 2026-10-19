/**
 * Animation 6: Swap Morph ("shape morphing" + micro-interaction)
 * Where: The From/To station swap button.
 * Motion: Icon rotates 180°, and the two station fields physically cross-slide
 *         past each other (300ms spring) before results card re-rolls numbers.
 */
import { MOTION, isReducedMotion } from '../motion-tokens.js';

export class SwapMorph {
  constructor({ buttonElement, fromFieldElement, toFieldElement, onComplete }) {
    this.button = buttonElement;
    this.fromField = fromFieldElement;
    this.toField = toFieldElement;
    this.onComplete = onComplete;
    this.isAnimating = false;
    this.rotationDegree = 0;

    this.bind();
  }

  bind() {
    if (!this.button) return;
    this.button.addEventListener('click', () => this.triggerSwap());
  }

  triggerSwap() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    if (isReducedMotion()) {
      // Accessible instant swap with 150ms opacity cross-fade
      const fadeOut = [
        this.fromField.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 75 }),
        this.toField.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 75 })
      ];

      Promise.all(fadeOut.map(a => a.finished)).then(() => {
        if (this.onComplete) this.onComplete();
        this.fromField.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 75 });
        this.toField.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 75 });
        this.isAnimating = false;
      });
      return;
    }

    // 1. Rotate the Swap Button Icon 180 degrees
    this.rotationDegree += MOTION.swapMorph.rotation;
    const icon = this.button.querySelector('svg') || this.button;
    icon.animate(
      [
        { transform: `rotate(${this.rotationDegree - 180}deg)` },
        { transform: `rotate(${this.rotationDegree}deg)` }
      ],
      {
        duration: MOTION.swapMorph.duration,
        easing: MOTION.swapMorph.springBezier,
        fill: 'forwards'
      }
    );

    // 2. Calculate physical distance between the two station inputs
    const fromRect = this.fromField.getBoundingClientRect();
    const toRect = this.toField.getBoundingClientRect();
    const deltaY = toRect.top - fromRect.top;

    // 3. Physically cross-slide fields past each other
    const animFrom = this.fromField.animate(
      [
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: `translateY(${deltaY}px)`, opacity: 0.9 }
      ],
      {
        duration: MOTION.swapMorph.duration,
        easing: MOTION.swapMorph.springBezier,
        fill: 'forwards'
      }
    );

    const animTo = this.toField.animate(
      [
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: `translateY(${-deltaY}px)`, opacity: 0.9 }
      ],
      {
        duration: MOTION.swapMorph.duration,
        easing: MOTION.swapMorph.springBezier,
        fill: 'forwards'
      }
    );

    Promise.all([animFrom.finished, animTo.finished]).then(() => {
      // Reset transforms to zero
      this.fromField.style.transform = 'translateY(0)';
      this.toField.style.transform = 'translateY(0)';
      animFrom.cancel();
      animTo.cancel();

      // Fire completion callback to swap state and roll numbers
      if (this.onComplete) {
        this.onComplete();
      }
      this.isAnimating = false;
    });
  }
}
