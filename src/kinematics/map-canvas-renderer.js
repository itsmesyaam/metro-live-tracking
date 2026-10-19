/**
 * Kochi Metro Map Canvas Overlay Renderer
 * Ultra-high-performance 60fps single-canvas overlay for Leaflet / Google Maps.
 * Eliminates DOM marker layout thrashing and supports smooth 60fps rendering on mid-range devices.
 * Renders articulated 3-coach capsule trains, aerodynamic nose visors, headlights,
 * fading motion trails, and platform dwell halos.
 */

import { MOTION_CONFIG } from './motion-config.js';

export class MapCanvasRenderer {
  constructor(map, containerElement, options = {}) {
    this.map = map;
    this.container = containerElement;
    this.config = { ...MOTION_CONFIG, ...options };
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.trains = [];
    this.followedTrainId = null;
    this.lastPanTime = 0;
    this.cameraPanCooldownMs = 120; // Batched camera panning interval to prevent tile stutter

    this.initCanvas();
    this.bindMapEvents();
  }

  initCanvas() {
    this.canvas.className = 'absolute inset-0 pointer-events-none z-[450]';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';

    this.container.appendChild(this.canvas);
    this.resizeCanvas();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  bindMapEvents() {
    // Only resize canvas buffers on viewport resize or zoom end (avoids clearing buffer during panning)
    this.map.on('resize zoomend', () => {
      this.resizeCanvas();
    });

    // Cancel camera follow on manual user drag
    this.map.on('dragstart', () => {
      this.followedTrainId = null;
      if (this.onFollowCancelled) {
        this.onFollowCancelled();
      }
    });
  }

  setFollowedTrain(trainId) {
    this.followedTrainId = trainId;
  }

  /**
   * Main 60 FPS Render Call
   */
  render(fleetSnapshot, dt) {
    this.trains = fleetSnapshot;
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    if (!W || !H) return;

    ctx.clearRect(0, 0, W, H);

    // 1. Render motion trails (drawn beneath train bodies)
    this.renderTrails(ctx);

    // 2. Render station approach ripple pulses
    this.renderStationPulses(ctx);

    // 3. Render 3-coach capsule train markers
    for (const train of this.trains) {
      this.renderTrainCapsule(ctx, train);
    }

    // 4. Process batched camera follow if enabled
    this.processCameraFollow();
  }

  /**
   * Render dynamic 150-250m fading motion trail
   */
  renderTrails(ctx) {
    for (const train of this.trains) {
      if (train.state === 'DWELLING' || !train.trail || train.trail.length < 2) continue;

      const pts = train.trail.map((pt) => this.map.latLngToContainerPoint([pt.lat, pt.lng]));
      const isSouth = train.direction === 'south';
      const baseColor = isSouth ? this.config.colors.southbound : this.config.colors.northbound;

      ctx.save();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const alpha = (i / pts.length) * this.config.trailInitialOpacity * train.opacity;

        ctx.strokeStyle = baseColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Render soft station approach ripple pulse
   */
  renderStationPulses(ctx) {
    for (const train of this.trains) {
      if (train.isApproachingStation && train.toStation) {
        const pt = this.map.latLngToContainerPoint([train.toStation.lat, train.toStation.lng]);
        const pulseProgress = (Date.now() % 1400) / 1400;
        const radius = 8 + pulseProgress * 24;
        const alpha = (1 - pulseProgress) * 0.6;

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00897b';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * Render sleek 3-coach capsule train marker with light aerodynamic nose
   */
  renderTrainCapsule(ctx, train) {
    const pt = this.map.latLngToContainerPoint([train.lat, train.lng]);
    const pad = this.config.performance.frustumPaddingPixels;

    // Viewport frustum culling
    if (pt.x < -pad || pt.x > this.width + pad || pt.y < -pad || pt.y > this.height + pad) {
      return;
    }

    const isSouth = train.direction === 'south';
    const isDwelling = train.state === 'DWELLING';
    const isSelected = train.isSelected;

    const baseColor = isSouth ? this.config.colors.southbound : this.config.colors.northbound;
    const noseAccent = isSouth ? this.config.colors.southboundAccent : this.config.colors.northboundAccent;

    ctx.save();
    ctx.translate(pt.x, pt.y);

    // Apply low-pass smoothed heading angle (compass bearing)
    // Leaflet 0 deg = North (up), Canvas 0 deg = East (right) -> subtract 90 deg
    ctx.rotate(((train.headingAngle - 90) * Math.PI) / 180);

    // Breathing opacity during platform dwell
    if (isDwelling) {
      const breathe = 0.88 + 0.12 * Math.sin(train.breathePhase);
      ctx.globalAlpha = breathe * train.opacity;
    } else {
      ctx.globalAlpha = train.opacity;
    }

    const scale = isSelected ? this.config.markerSelectedScale : 1.0;
    ctx.scale(scale, scale);

    const coachW = 14;
    const coachH = 12;
    const gap = 3;
    const totalW = coachW * 3 + gap * 2;
    const startX = -totalW / 2;
    const startY = -coachH / 2;

    // Selected outer soft ring
    if (isSelected) {
      ctx.strokeStyle = this.config.colors.selectedRing;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(startX - 5, startY - 5, totalW + 10, coachH + 10, 8);
      ctx.stroke();
    }

    // Platform dwell soft amber halo
    if (isDwelling) {
      ctx.strokeStyle = this.config.colors.dwellingGlow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(startX - 3, startY - 3, totalW + 6, coachH + 6, 7);
      ctx.stroke();
    }

    // Coach 1: Rear Car
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(startX, startY, coachW, coachH, [4, 1, 1, 4]);
    ctx.fill();
    ctx.fillStyle = baseColor;
    ctx.fillRect(startX + 2, startY + 2, coachW - 4, coachH - 4);

    // Inter-coach articulated bellows
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(startX + coachW, startY + 2, gap, coachH - 4);

    // Coach 2: Center Car
    const cx = startX + coachW + gap;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cx, startY, coachW, coachH, 1);
    ctx.fill();
    ctx.fillStyle = baseColor;
    ctx.fillRect(cx + 2, startY + 2, coachW - 4, coachH - 4);

    // Inter-coach articulated bellows
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx + coachW, startY + 2, gap, coachH - 4);

    // Coach 3: Front Cab with Aerodynamic Light Visor
    const fx = cx + coachW + gap;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(fx, startY, coachW, coachH, [1, 5, 5, 1]);
    ctx.fill();
    ctx.fillStyle = baseColor;
    ctx.fillRect(fx + 2, startY + 2, coachW - 4, coachH - 4);

    // Lighter aerodynamic nose visor showing travel direction
    ctx.fillStyle = noseAccent;
    ctx.beginPath();
    ctx.roundRect(fx + coachW - 5, startY + 2, 4, coachH - 4, [0, 4, 4, 0]);
    ctx.fill();

    // Subtle front headlight beam
    if (!isDwelling) {
      const beamGrad = ctx.createLinearGradient(fx + coachW, 0, fx + coachW + 18, 0);
      beamGrad.addColorStop(0, this.config.colors.headlightBeam);
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(fx + coachW, startY + 2);
      ctx.lineTo(fx + coachW + 18, startY - 4);
      ctx.lineTo(fx + coachW + 18, startY + coachH + 4);
      ctx.lineTo(fx + coachW, startY + coachH - 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Draw non-rotating plain text tag above train marker
    if (isDwelling || isSelected) {
      ctx.save();
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      const label = isDwelling ? 'At platform' : `${train.velocityKmh} km/h`;
      const textMetrics = ctx.measureText(label);
      const bgW = textMetrics.width + 10;
      const bgH = 16;
      const tagX = pt.x - bgW / 2;
      const tagY = pt.y - 24;

      ctx.fillStyle = isDwelling ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, bgW, bgH, 5);
      ctx.fill();

      ctx.fillStyle = isDwelling ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pt.x, tagY + bgH / 2);
      ctx.restore();
    }
  }

  /**
   * Eased camera follow with batched pacing (prevents map tile stutter)
   */
  processCameraFollow() {
    if (!this.followedTrainId) return;
    const now = performance.now();
    if (now - this.lastPanTime < this.cameraPanCooldownMs) return;

    const targetTrain = this.trains.find((t) => t.id === this.followedTrainId);
    if (!targetTrain) return;

    this.lastPanTime = now;
    const currentCenter = this.map.getCenter();
    const dLat = targetTrain.lat - currentCenter.lat;
    const dLng = targetTrain.lng - currentCenter.lng;

    // Smoothly pan if drift exceeds minor deadzone
    if (Math.hypot(dLat, dLng) > 0.0004) {
      this.map.panTo([targetTrain.lat, targetTrain.lng], {
        animate: true,
        duration: 0.35,
        easeLinearity: 0.25,
      });
    }
  }
}
