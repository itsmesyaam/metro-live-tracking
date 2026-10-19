/**
 * Animation 1: Page Reveal ("ease and blur in from bottom")
 * Triggers on initial app load and every bottom tab switch.
 * Motion: translateY(24px) -> 0, opacity 0 -> 1, filter blur(8px) -> blur(0).
 * Timing: 500ms with cubic-bezier(0.22, 1, 0.36, 1), staggered child sections by 60ms.
 */
import { MOTION, isReducedMotion } from '../motion-tokens.js';

export function revealElement(element, options = {}) {
  if (!element) return;

  const {
    delay = 0,
    staggerChildren = true,
    selector = ':scope > *',
  } = options;

  if (isReducedMotion()) {
    element.style.opacity = '1';
    element.style.transform = 'none';
    element.style.filter = 'none';
    return;
  }

  const { duration, easing, yOffset, blur, childStagger } = MOTION.pageReveal;

  // Animate the container
  element.animate(
    [
      { transform: `translateY(${yOffset}px)`, opacity: 0, filter: `blur(${blur}px)` },
      { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' }
    ],
    {
      duration,
      easing,
      delay,
      fill: 'forwards'
    }
  );

  // Stagger direct children if requested
  if (staggerChildren) {
    const children = element.querySelectorAll(selector);
    children.forEach((child, index) => {
      const childDelay = delay + (index * childStagger);
      child.animate(
        [
          { transform: `translateY(${yOffset * 0.75}px)`, opacity: 0, filter: `blur(${blur * 0.5}px)` },
          { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' }
        ],
        {
          duration,
          easing,
          delay: childDelay,
          fill: 'forwards'
        }
      );
    });
  }
}
