/**
 * Animation 4: Journey Progress Line ("flight progress" + "pencil drawing path")
 * Where: The stop list on the Trip card, and route line on the Live Map.
 * Motion: Route line draws itself from origin to destination via SVG stroke-dashoffset (600ms).
 *         Station dots pop in with a 40ms stagger and a small spring scale from 0.6 to 1.
 * Live Mode: Train marker glides smoothly along the line using rAF interpolation.
 */
import { MOTION, isReducedMotion } from '../motion-tokens.js';

export class JourneyProgressLine {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = options;
    this.trainMarker = null;
    this.currentTrainProgress = 0;
    this.targetTrainProgress = 0;
    this.rafId = null;
  }

  renderJourney({
    stations = [],
    collapsed = true,
    activeStationIndex = 0,
    language = 'en',
    onToggleCollapse = null,
  }) {
    if (!this.container || stations.length === 0) return;

    this.container.innerHTML = '';
    const isLongTrip = stations.length > 5;
    const isCollapsed = isLongTrip && collapsed;

    let displayStations = stations;
    let hiddenCount = 0;

    if (isCollapsed) {
      // Show first 2 and last 2 stations, collapse the middle
      const head = stations.slice(0, 2);
      const tail = stations.slice(-2);
      hiddenCount = stations.length - 4;
      displayStations = [...head, { isCollapseBadge: true, count: hiddenCount }, ...tail];
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'journey-progress-wrapper relative py-2';

    // SVG Line Drawer Container
    const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lineSvg.setAttribute('class', 'absolute left-5 top-5 bottom-5 w-1 overflow-visible');
    lineSvg.style.height = 'calc(100% - 40px)';

    const trackLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    trackLine.setAttribute('x1', '2');
    trackLine.setAttribute('y1', '0');
    trackLine.setAttribute('x2', '2');
    trackLine.setAttribute('y2', '100%');
    trackLine.setAttribute('stroke', 'currentColor');
    trackLine.setAttribute('stroke-opacity', '0.15');
    trackLine.setAttribute('stroke-width', '3');
    trackLine.setAttribute('stroke-linecap', 'round');

    const drawLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    drawLine.setAttribute('x1', '2');
    drawLine.setAttribute('y1', '0');
    drawLine.setAttribute('x2', '2');
    drawLine.setAttribute('y2', '100%');
    drawLine.setAttribute('stroke', 'var(--km-accent, #eb5e28)');
    drawLine.setAttribute('stroke-width', '3');
    drawLine.setAttribute('stroke-linecap', 'round');
    drawLine.setAttribute('class', 'journey-draw-path');

    lineSvg.appendChild(trackLine);
    lineSvg.appendChild(drawLine);
    wrapper.appendChild(lineSvg);

    // Stops List
    const stopsList = document.createElement('div');
    stopsList.className = 'journey-stops-list space-y-3 relative z-10 pl-11';

    displayStations.forEach((st, idx) => {
      if (st.isCollapseBadge) {
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'w-full text-left py-2 px-3.5 my-1 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[var(--km-accent, #eb5e28)] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-between';
        collapseBtn.innerHTML = `
          <span>+ ${st.count} more stops</span>
          <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Tap to view</span>
        `;
        if (onToggleCollapse) {
          collapseBtn.addEventListener('click', onToggleCollapse);
        }
        stopsList.appendChild(collapseBtn);
        return;
      }

      const isOrigin = idx === 0;
      const isDestination = idx === displayStations.length - 1;

      const stopRow = document.createElement('div');
      stopRow.className = 'journey-stop-row flex items-center justify-between text-base';

      // Station dot
      const dot = document.createElement('span');
      dot.className = `journey-station-dot absolute left-3.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-transform ${
        isOrigin || isDestination
          ? 'bg-[var(--km-accent,#eb5e28)] border-[#252422] ring-4 ring-[var(--km-accent,#eb5e28)]/20'
          : 'bg-[#252422] border-[#403d39]'
      }`;
      dot.style.marginTop = '2px';
      stopRow.appendChild(dot);

      // Station Name
      const nameCol = document.createElement('div');
      nameCol.className = 'flex items-baseline gap-2';
      const name = language === 'ml' && st.ml ? st.ml : st.name;
      nameCol.innerHTML = `
        <span class="font-bold text-slate-900 dark:text-slate-100">${name}</span>
        ${language !== 'ml' && st.ml ? `<span class="text-xs text-slate-400 font-normal font-malayalam">${st.ml}</span>` : ''}
      `;
      stopRow.appendChild(nameCol);

      // Station Chainage / Distance
      if (st.km !== undefined) {
        const kmLabel = document.createElement('span');
        kmLabel.className = 'text-xs font-mono text-slate-400 tabular-nums';
        kmLabel.textContent = `${st.km.toFixed(1)} km`;
        stopRow.appendChild(kmLabel);
      }

      stopsList.appendChild(stopRow);
    });

    wrapper.appendChild(stopsList);
    this.container.appendChild(wrapper);

    // Trigger SVG path draw & station dots spring pop-in
    this.animateJourneyDrawing(drawLine, wrapper.querySelectorAll('.journey-station-dot'));
  }

  animateJourneyDrawing(drawLineElement, dotElements) {
    if (isReducedMotion()) return;

    // 1. Draw SVG path from 0 to full length over 600ms
    const totalLength = drawLineElement.parentElement.clientHeight || 160;
    drawLineElement.style.strokeDasharray = `${totalLength}`;
    drawLineElement.style.strokeDashoffset = `${totalLength}`;

    drawLineElement.animate(
      [
        { strokeDashoffset: totalLength },
        { strokeDashoffset: 0 }
      ],
      {
        duration: MOTION.journeyLine.drawDuration,
        easing: MOTION.journeyLine.drawEasing,
        fill: 'forwards'
      }
    );

    // 2. Pop in station dots with 40ms stagger & spring scale from 0.6 to 1
    dotElements.forEach((dot, index) => {
      dot.animate(
        [
          { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0.3 },
          { transform: 'translate(-50%, 0) scale(1)', opacity: 1 }
        ],
        {
          duration: 350,
          delay: index * MOTION.journeyLine.dotStagger,
          easing: MOTION.journeyLine.dotSpringBezier,
          fill: 'forwards'
        }
      );
    });
  }

  // Smooth gliding interpolation for real-time train positioning on the route
  glideTrainMarkerTo(targetFraction) {
    this.targetTrainProgress = Math.max(0, Math.min(1, targetFraction));
    if (isReducedMotion()) {
      this.currentTrainProgress = this.targetTrainProgress;
      this.updateTrainPositionDOM();
      return;
    }

    if (!this.rafId) {
      const step = () => {
        const diff = this.targetTrainProgress - this.currentTrainProgress;
        if (Math.abs(diff) < 0.001) {
          this.currentTrainProgress = this.targetTrainProgress;
          this.updateTrainPositionDOM();
          this.rafId = null;
          return;
        }

        // Smooth critically damped lerp
        this.currentTrainProgress += diff * 0.08;
        this.updateTrainPositionDOM();
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    }
  }

  updateTrainPositionDOM() {
    if (!this.trainMarker) return;
    this.trainMarker.style.top = `${this.currentTrainProgress * 100}%`;
  }
}
