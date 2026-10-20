/**
 * Kochi Metro Dual-Track Linear Schematic Renderer
 * Driven synchronously by the exact same single-source-of-truth kinematics engine as the Map.
 * Top Track: Southbound (towards Thrippunithura)
 * Bottom Track: Northbound (towards Aluva)
 */

export class SchematicRenderer {
  constructor(containerElement, stations, options = {}) {
    this.container = containerElement;
    this.stations = stations;
    this.options = options;
    this.onTrainSelected = options.onTrainSelected || null;
    this.onStationSelected = options.onStationSelected || null;

    this.renderBaseLayout();
  }

  renderBaseLayout() {
    this.container.innerHTML = `
      <div class="relative w-full h-full select-none flex flex-col justify-between py-1">
        <!-- Southbound Track (Top) -->
        <div class="relative h-9 flex items-center">
          <div class="absolute left-0 top-0 text-[10px] font-mono font-bold uppercase tracking-wider" style="color:var(--km-accent,#eb5e28)">
            Southbound &rarr; towards Thrippunithura
          </div>
          <div class="absolute inset-x-2 top-6 h-1 rounded-full" style="background:rgba(235,94,40,0.25)"></div>
          <div id="schematicTrainsSouth" class="absolute inset-x-2 top-4 h-6"></div>
        </div>

        <!-- Middle Station Stations Axis -->
        <div class="relative h-6 flex items-center">
          <div class="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5" style="background:var(--km-surface-2,#403d39)"></div>
          <div id="schematicStationsAxis" class="absolute inset-x-2 inset-y-0"></div>
        </div>

        <!-- Northbound Track (Bottom) -->
        <div class="relative h-9 flex items-center">
          <div class="absolute left-0 top-0 text-[10px] font-mono font-bold uppercase tracking-wider" style="color:var(--km-text-secondary,#ccc5b9)">
            Northbound &rarr; towards Aluva
          </div>
          <div class="absolute inset-x-2 top-6 h-1 rounded-full" style="background:rgba(204,197,185,0.25)"></div>
          <div id="schematicTrainsNorth" class="absolute inset-x-2 top-4 h-6"></div>
        </div>
      </div>
    `;

    this.renderStationNodes();
  }

  renderStationNodes() {
    const axis = this.container.querySelector('#schematicStationsAxis');
    if (!axis) return;

    const numStations = this.stations.length;
    axis.innerHTML = this.stations.map((st, i) => {
      const leftPct = (i / (numStations - 1)) * 100;
      return `
        <button type="button" data-station-id="${i}"
          style="left: ${leftPct}%"
          class="schematic-station-pin absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group focus:outline-none"
          title="${st.id}. ${st.name} (${st.km.toFixed(1)} km)">
          <span class="w-2.5 h-2.5 rounded-full border-2 transition-transform group-hover:scale-125" style="background:var(--km-base,#252422);border-color:var(--km-surface-2,#403d39)"></span>
        </button>
      `;
    }).join('');

    axis.querySelectorAll('.schematic-station-pin').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-station-id'), 10);
        if (this.onStationSelected) {
          this.onStationSelected(id);
        }
      });
    });
  }

  render(fleetSnapshot) {
    const southContainer = this.container.querySelector('#schematicTrainsSouth');
    const northContainer = this.container.querySelector('#schematicTrainsNorth');
    if (!southContainer || !northContainer) return;

    const southTrains = fleetSnapshot.filter((t) => t.direction === 'south');
    const northTrains = fleetSnapshot.filter((t) => t.direction === 'north');

    const renderPill = (t) => {
      const leftPct = Math.max(0, Math.min(100, t.fractionOfTrack * 100));
      const isSouth = t.direction === 'south';
      const isDwelling = t.state === 'DWELLING';
      const isSelected = t.isSelected;

      const styleBg = isSouth
        ? 'background:var(--km-accent,#eb5e28);color:#fffcf2;'
        : 'background:var(--km-text-secondary,#ccc5b9);color:#252422;';
      const dwellRing = isDwelling ? 'box-shadow:0 0 0 2px #fffcf2;' : '';
      const selectedRing = isSelected ? 'box-shadow:0 0 0 2px var(--km-accent,#eb5e28);transform:scale(1.1);' : '';

      return `
        <button type="button" data-train-id="${t.id}"
          style="left: ${leftPct}%;${styleBg}${dwellRing}${selectedRing}"
          class="schematic-train-marker absolute -translate-x-1/2 top-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-md hover:scale-110 transition-transform z-20"
          title="${t.id} - ${t.state} (${t.velocityKmh} km/h)">
          ${t.id} ${isSouth ? '&rarr;' : '&larr;'}
        </button>
      `;
    };

    southContainer.innerHTML = southTrains.map(renderPill).join('');
    northContainer.innerHTML = northTrains.map(renderPill).join('');

    // Bind train clicks
    this.container.querySelectorAll('.schematic-train-marker').forEach((btn) => {
      btn.addEventListener('click', () => {
        const trainId = btn.getAttribute('data-train-id');
        if (this.onTrainSelected) {
          this.onTrainSelected(trainId);
        }
      });
    });
  }
}
