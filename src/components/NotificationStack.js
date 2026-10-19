/**
 * Animation 5: Spring Notification Stack ("stack of notification cards sliding in with spring physics")
 * Where: Service alerts and "Your train is arriving in 2 minutes" heads-up.
 * Motion: New card slides down from the top with spring (stiffness 400, damping 28).
 *         Older alerts compress behind it (scale 0.95, translateY 8px, opacity 0.85).
 *         Swipe or tap to dismiss. Short haptic (navigator.vibrate(20)).
 */
import { MOTION, isReducedMotion } from '../motion-tokens.js';

export class NotificationStack {
  constructor(containerElement) {
    this.container = containerElement;
    this.stack = [];
  }

  pushNotification({ id, title, body, icon = 'info', duration = 8000 }) {
    // Trigger subtle haptic where supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(MOTION.notificationStack.hapticDuration);
      } catch (e) {
        // Safe fallback if blocked by browser policy
      }
    }

    const card = document.createElement('div');
    card.className = 'notification-card absolute inset-x-0 top-0 mx-auto max-w-md p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-start gap-3 select-none cursor-pointer';
    card.style.zIndex = '50';
    card.dataset.id = id || String(Date.now());

    card.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <div class="flex-1 min-w-0 pr-2">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">${title}</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${body}</p>
      </div>
      <button type="button" aria-label="Dismiss alert" class="btn-dismiss p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Compress existing cards in stack
    this.stack.forEach((olderCard, index) => {
      const depth = index + 1;
      const scale = Math.pow(MOTION.notificationStack.backCardScale, depth);
      const translateY = depth * MOTION.notificationStack.backCardOffsetY;
      const opacity = Math.max(0.6, 1 - depth * 0.15);

      olderCard.style.zIndex = String(50 - depth);
      olderCard.style.pointerEvents = 'none';

      if (!isReducedMotion()) {
        olderCard.animate(
          [
            { transform: olderCard.style.transform || 'scale(1) translateY(0)', opacity: olderCard.style.opacity || '1' },
            { transform: `scale(${scale}) translateY(${translateY}px)`, opacity }
          ],
          {
            duration: 300,
            easing: MOTION.notificationStack.cssSpringBezier,
            fill: 'forwards'
          }
        );
      } else {
        olderCard.style.transform = `translateY(${translateY}px)`;
        olderCard.style.opacity = String(opacity);
      }
    });

    this.container.appendChild(card);
    this.stack.unshift(card);

    // Animate newly added top card sliding down with spring physics
    if (!isReducedMotion()) {
      card.animate(
        [
          { transform: 'translateY(-120%) scale(0.92)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 }
        ],
        {
          duration: MOTION.notificationStack.slideInDuration,
          easing: MOTION.notificationStack.cssSpringBezier,
          fill: 'forwards'
        }
      );
    } else {
      card.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: MOTION.reducedMotion.duration,
        easing: MOTION.reducedMotion.easing,
      });
    }

    // Touch swipe or click to dismiss
    const dismiss = () => this.dismissCard(card);
    card.querySelector('.btn-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    let touchStartY = 0;
    card.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchStartY - touchEndY > 30) {
        // Swiped up
        dismiss();
      }
    }, { passive: true });

    if (duration > 0) {
      setTimeout(() => dismiss(), duration);
    }
  }

  dismissCard(card) {
    const idx = this.stack.indexOf(card);
    if (idx === -1) return;

    this.stack.splice(idx, 1);

    const finishDismiss = () => {
      card.remove();
      // Uncompress remaining cards
      this.stack.forEach((remainingCard, i) => {
        const scale = Math.pow(MOTION.notificationStack.backCardScale, i);
        const translateY = i * MOTION.notificationStack.backCardOffsetY;
        const opacity = Math.max(0.6, 1 - i * 0.15);

        remainingCard.style.zIndex = String(50 - i);
        if (i === 0) remainingCard.style.pointerEvents = 'auto';

        if (!isReducedMotion()) {
          remainingCard.animate(
            [
              { transform: remainingCard.style.transform || 'scale(1) translateY(0)' },
              { transform: `scale(${scale}) translateY(${translateY}px)`, opacity }
            ],
            { duration: 250, easing: 'ease-out', fill: 'forwards' }
          );
        } else {
          remainingCard.style.transform = `translateY(${translateY}px)`;
          remainingCard.style.opacity = String(opacity);
        }
      });
    };

    if (!isReducedMotion()) {
      const anim = card.animate(
        [
          { transform: 'translateY(0) scale(1)', opacity: 1 },
          { transform: 'translateY(-120%) scale(0.9)', opacity: 0 }
        ],
        { duration: 260, easing: 'ease-in', fill: 'forwards' }
      );
      anim.onfinish = finishDismiss;
    } else {
      finishDismiss();
    }
  }
}
