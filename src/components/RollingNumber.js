/**
 * Animation 2: Rolling Number Countdown ("years rolling text")
 * Where: Next train figure, distance, travel time, arrival time.
 * Motion: Each digit rolls vertically like an odometer when its value changes.
 *         Only changed digits animate.
 * Timing: 400ms spring (stiffness 300, damping 30). Tabular nums guarantee zero width shifts.
 */
import { MOTION, isReducedMotion, generateSpringKeyframes } from '../motion-tokens.js';

export class RollingNumber {
  constructor(containerElement, initialValue = '0') {
    this.container = containerElement;
    this.currentValue = String(initialValue);
    this.container.classList.add('rolling-number-container');
    this.container.style.display = 'inline-flex';
    this.container.style.alignItems = 'baseline';
    this.container.style.fontVariantNumeric = 'tabular-nums';
    this.container.style.lineHeight = '1';
    this.container.setAttribute('aria-live', 'polite');
    this.renderInitial();
  }

  renderInitial() {
    this.container.innerHTML = '';
    const chars = this.currentValue.split('');
    chars.forEach((char) => {
      this.container.appendChild(this.createCharSlot(char));
    });
  }

  createCharSlot(char) {
    const isDigit = /\d/.test(char);
    const slot = document.createElement('span');
    slot.className = 'rolling-slot';
    slot.style.display = 'inline-block';
    slot.style.overflow = 'hidden';
    slot.style.height = '1em';
    slot.style.lineHeight = '1';
    slot.style.verticalAlign = 'baseline';
    slot.dataset.char = char;

    if (!isDigit) {
      slot.textContent = char;
      return slot;
    }

    // Create column 0-9
    const column = document.createElement('span');
    column.className = 'rolling-column';
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.willChange = 'transform';
    column.style.transform = `translateY(-${parseInt(char, 10) * 10}%)`;

    for (let i = 0; i <= 9; i++) {
      const digit = document.createElement('span');
      digit.textContent = String(i);
      digit.style.height = '1em';
      digit.style.display = 'flex';
      digit.style.alignItems = 'center';
      digit.style.justifyContent = 'center';
      column.appendChild(digit);
    }

    slot.appendChild(column);
    return slot;
  }

  update(newValue) {
    const strVal = String(newValue);
    if (strVal === this.currentValue) return;

    const oldChars = this.currentValue.split('');
    const newChars = strVal.split('');

    // If string length or format changed significantly, re-render slots
    if (oldChars.length !== newChars.length) {
      this.currentValue = strVal;
      this.renderInitial();
      return;
    }

    const slots = this.container.children;
    newChars.forEach((newChar, i) => {
      const oldChar = oldChars[i];
      const slot = slots[i];
      if (!slot) return;

      // Only animate if the character has changed
      if (newChar !== oldChar) {
        slot.dataset.char = newChar;
        const column = slot.querySelector('.rolling-column');

        if (column && /\d/.test(newChar) && /\d/.test(oldChar)) {
          const fromY = -parseInt(oldChar, 10) * 10;
          const toY = -parseInt(newChar, 10) * 10;

          if (isReducedMotion()) {
            column.style.transform = `translateY(${toY}%)`;
            slot.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: MOTION.reducedMotion.duration,
              easing: MOTION.reducedMotion.easing,
            });
          } else {
            const keyframes = generateSpringKeyframes({
              stiffness: MOTION.rollingNumber.spring.stiffness,
              damping: MOTION.rollingNumber.spring.damping,
              mass: MOTION.rollingNumber.spring.mass,
              duration: MOTION.rollingNumber.duration,
              from: fromY,
              to: toY,
              steps: 25,
            }).map((kf) => ({
              transform: kf.transform.replace('px', '%'),
            }));

            const anim = column.animate(keyframes, {
              duration: MOTION.rollingNumber.duration,
              fill: 'forwards',
            });

            anim.onfinish = () => {
              column.style.transform = `translateY(${toY}%)`;
              anim.cancel();
            };
          }
        } else {
          slot.textContent = newChar;
        }
      }
    });

    this.currentValue = strVal;
  }
}
