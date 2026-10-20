/**
 * Kochi Metro Developer Debug Overlay
 * Toggled via keyboard shortcut 'D' or floating Dev badge.
 * Provides kinematics diagnostics: FPS counter, active trains, ms since last 2s data tick,
 * maximum blend error in meters across the fleet, and authoritative source mode.
 */

export class DebugOverlay {
  constructor(motionEngine, options = {}) {
    this.engine = motionEngine;
    this.isVisible = options.defaultVisible || false;
    this.mount = options.mount || document.body;
    this.container = null;
    this.updateIntervalId = null;

    this.createDom();
    this.bindKeyboardShortcut();
  }

  createDom() {
    this.container = document.createElement('div');
    this.container.id = 'devDebugOverlay';
    this.container.className = `fixed bottom-20 right-4 z-[9999] pointer-events-auto select-none transition-all duration-200 ${
      this.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
    }`;

    this.container.innerHTML = `
      <div class="bg-[#252422]/95 text-[#fffcf2] backdrop-blur-md border border-[var(--km-accent,#eb5e28)]/40 rounded-2xl p-4 shadow-2xl w-72 font-mono text-xs flex flex-col gap-3">
        <!-- Title & Close -->
        <div class="flex items-center justify-between border-b border-[#403d39] pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[var(--km-accent,#eb5e28)] animate-ping"></span>
            <span class="font-bold text-[11px] tracking-wider uppercase text-[var(--km-accent,#eb5e28)]">Kinematics Diagnostics</span>
          </div>
          <span class="text-[10px] bg-[#403d39] text-[#ccc5b9] px-1.5 py-0.5 rounded font-bold">Press 'D'</span>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-[#2e2b28] rounded-xl p-2 border border-[#403d39]">
            <span class="text-[10px] text-[#ccc5b9] uppercase tracking-wider block">Frame Rate</span>
            <span id="dbgFps" class="text-base font-black text-[#fffcf2] font-mono">60 FPS</span>
          </div>

          <div class="bg-[#2e2b28] rounded-xl p-2 border border-[#403d39]">
            <span class="text-[10px] text-[#ccc5b9] uppercase tracking-wider block">Active Fleet</span>
            <span id="dbgTrains" class="text-base font-black text-[var(--km-accent,#eb5e28)] font-mono">10 Trains</span>
          </div>

          <div class="bg-[#2e2b28] rounded-xl p-2 border border-[#403d39]">
            <span class="text-[10px] text-[#ccc5b9] uppercase tracking-wider block">Tick Age</span>
            <span id="dbgTickAge" class="text-base font-black text-[#fffcf2] font-mono">0 ms</span>
          </div>

          <div class="bg-[#2e2b28] rounded-xl p-2 border border-[#403d39]">
            <span class="text-[10px] text-[#ccc5b9] uppercase tracking-wider block">Max Error</span>
            <span id="dbgMaxError" class="text-base font-black text-[var(--km-accent,#eb5e28)] font-mono">0.0 m</span>
          </div>
        </div>

        <!-- Source Badge & Forward Motion Indicator -->
        <div class="bg-[#2e2b28] rounded-xl p-2 border border-[#403d39] flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-[#ccc5b9] uppercase">Data Source</span>
            <span id="dbgSource" class="text-[10px] font-bold text-[var(--km-accent,#eb5e28)] px-1.5 py-0.5 rounded bg-[rgba(235,94,40,0.12)]">ESTIMATED (IST Timetable)</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-[#ccc5b9] uppercase">Rail Direction</span>
            <span class="text-[10px] font-bold text-[#3fae5a]">Strictly Non-Reversing</span>
          </div>
        </div>

        <!-- Selected Train Metrics -->
        <div id="dbgSelectedBox" class="bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 text-[11px]">
          <span class="text-[10px] text-slate-400 uppercase block mb-1">Focus Metrics</span>
          <div id="dbgSelectedDetails" class="text-slate-300">Train KM-101 · Cruise 80 km/h · 0.0 m err</div>
        </div>
      </div>
    `;

    this.mount.appendChild(this.container);

    // Start periodic DOM update
    this.updateIntervalId = setInterval(() => this.update(), 100);
  }

  bindKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      // Toggle if key is 'd' or 'D', ignoring typing in inputs/selects
      if (
        (e.key === 'd' || e.key === 'D') &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.target.tagName !== 'SELECT'
      ) {
        this.toggle();
      }
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
      this.container.classList.add('opacity-100', 'scale-100');
      this.update();
    } else {
      this.container.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      this.container.classList.remove('opacity-100', 'scale-100');
    }
  }

  update() {
    if (!this.isVisible || !this.container) return;

    const metrics = this.engine.getDebugMetrics();

    // FPS with dynamic color
    const fpsEl = this.container.querySelector('#dbgFps');
    if (fpsEl) {
      fpsEl.textContent = `${metrics.fps} FPS`;
      if (metrics.fps >= 55) {
        fpsEl.className = 'text-base font-black text-emerald-400 font-mono';
      } else if (metrics.fps >= 40) {
        fpsEl.className = 'text-base font-black text-amber-400 font-mono';
      } else {
        fpsEl.className = 'text-base font-black text-rose-400 font-mono';
      }
    }

    const trainsEl = this.container.querySelector('#dbgTrains');
    if (trainsEl) trainsEl.textContent = `${metrics.activeTrainsCount} Trains`;

    const tickEl = this.container.querySelector('#dbgTickAge');
    if (tickEl) tickEl.textContent = `${metrics.msSinceLastTick} ms`;

    const errEl = this.container.querySelector('#dbgMaxError');
    if (errEl) errEl.textContent = `${metrics.maxErrorMeters} m`;

    const srcEl = this.container.querySelector('#dbgSource');
    if (srcEl) srcEl.textContent = metrics.source;

    const selDetailsEl = this.container.querySelector('#dbgSelectedDetails');
    if (selDetailsEl && metrics.selectedTrain) {
      const t = metrics.selectedTrain;
      selDetailsEl.textContent = `${t.id} (${t.direction.toUpperCase()}) · ${t.speedKmh} km/h · ${t.distanceMeters}m · ${t.errorMeters}m err`;
    }
  }

  destroy() {
    if (this.updateIntervalId) clearInterval(this.updateIntervalId);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
