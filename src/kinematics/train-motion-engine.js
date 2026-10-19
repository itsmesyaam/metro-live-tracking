/**
 * Kochi Metro Train Motion Engine
 * Kinematic physics simulation with S-curve acceleration, cruising, braking,
 * platform dwell, dead reckoning, 2-second authoritative data tick, multi-tier
 * error blending, low-pass angle smoothing, and strict forward rail physics.
 * Acts as the authoritative single source of truth for the entire application.
 */

import { MOTION_CONFIG } from './motion-config.js';
import { TrackGeometry, STATIONS } from './track-geometry.js';

export class TrainMotionEngine {
  constructor(options = {}) {
    this.geometry = options.geometry || new TrackGeometry(STATIONS);
    this.config = { ...MOTION_CONFIG, ...options.config };
    this.trains = new Map();
    this.isRunning = false;
    this.lastFrameTime = performance.now();
    this.rafId = null;
    this.listeners = new Set();
    this.simSpeedMultiplier = this.config.simulationSpeedMultiplier;
    this.selectedTrainId = null;
    this.sourceMode = this.config.sourceMode; // 'LIVE' | 'SIMULATED'

    // Authoritative 2-second tick loop state
    this.tickIntervalId = null;
    this.lastTickTime = performance.now();
    this.msSinceLastTick = 0;
    this.maxFleetErrorMeters = 0;

    // Rolling FPS calculation
    this.frameCount = 0;
    this.lastFpsSampleTime = performance.now();
    this.currentFps = 60;

    this.bindVisibilityHandler();
  }

  bindVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Reset frame timer immediately upon returning to tab to prevent delta leap
          this.lastFrameTime = performance.now();
          this.lastTickTime = performance.now();
        }
      });
    }
  }

  /**
   * Helper: Get current time formatted in Indian Standard Time (IST, UTC+05:30)
   */
  getISTDate() {
    const now = new Date();
    // Use Intl API or explicit UTC+05:30 millisecond offset for guaranteed timezone precision
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5.5 * 3600000);
  }

  /**
   * Register a train on the network
   */
  registerTrain({
    id,
    name,
    direction = 'south', // 'south' (Aluva -> Thrippunithura) | 'north' (Thrippunithura -> Aluva)
    initialStationIndex = 0,
    departureOffsetSeconds = 0,
  }) {
    const isSouth = direction === 'south';
    const totalDist = this.geometry.totalLengthMeters;
    const stationDists = this.geometry.stationDistanceMeters;

    const initDist = isSouth
      ? stationDists[initialStationIndex] || 0
      : totalDist - (stationDists[initialStationIndex] || 0);

    const initialSample = this.geometry.sampleAtDistance(initDist);
    const initialAngle = isSouth ? initialSample.bearing : (initialSample.bearing + 180) % 360;

    const train = {
      id,
      name,
      direction,
      currentDistance: initDist,     // Displayed position along track (meters from Aluva)
      targetDistance: initDist,      // Authoritative position from 2000ms tick
      lastKnownTarget: initDist,
      displayOffset: 0,
      velocity: 0,                   // m/s
      currentAngle: initialAngle,
      targetAngle: initialAngle,
      state: 'DWELLING',             // 'ACCELERATING' | 'CRUISING' | 'BRAKING' | 'DWELLING'
      dwellRemaining: this.config.dwellDurationSeconds,
      currentSegmentIndex: isSouth ? initialStationIndex : Math.max(0, initialStationIndex - 1),
      opacity: 1.0,
      fadeState: 'NORMAL',           // 'FADING_OUT' | 'FADING_IN' | 'NORMAL'
      fadeStartTime: 0,
      fadeProgress: 1.0,
      macroEase: null,               // Active Tier-2 800ms cubic ease state
      microCorrectionSpeed: 0,       // Active Tier-1 2s micro-correction velocity adjustment
      errorMeters: 0,
      trail: [],                     // Ring buffer of recent trail vertices [{lat, lng, dist}]
      breathePhase: 0,
      isApproachingStation: false,
      approachingStationId: null,
      departureOffsetSeconds,
    };

    this.trains.set(id, train);
    return train;
  }

  /**
   * S-Curve Hermite Easing
   */
  smoothHermite(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  /**
   * 2000 ms Authoritative Data Tick
   * Calculates true ground-truth positions for all trains according to IST timetable
   * and updates authoritative targets for dead-reckoning blend.
   */
  performAuthoritativeTick() {
    const now = performance.now();
    this.lastTickTime = now;
    let maxError = 0;

    const ist = this.getISTDate();
    const hours = ist.getHours();
    const mins = ist.getMinutes();
    const secs = ist.getSeconds();
    // Current seconds since midnight in IST
    const istSecondsFromMidnight = hours * 3600 + mins * 60 + secs;

    for (const train of this.trains.values()) {
      const isSouth = train.direction === 'south';
      const totalDist = this.geometry.totalLengthMeters;

      // Calculate authoritative target distance based on schedule cycle
      // A full one-way trip takes ~46 minutes (2760 seconds)
      const cyclePeriodSeconds = 2800;
      const effectiveTrainTime = (istSecondsFromMidnight * this.simSpeedMultiplier + train.departureOffsetSeconds) % cyclePeriodSeconds;
      const progressFraction = (effectiveTrainTime % cyclePeriodSeconds) / cyclePeriodSeconds;

      let authoritativeDistance = progressFraction * totalDist;
      if (!isSouth) {
        authoritativeDistance = totalDist - authoritativeDistance;
      }
      authoritativeDistance = Math.max(0, Math.min(totalDist, authoritativeDistance));

      // Calculate position difference
      const displayedDist = train.currentDistance;
      const diff = authoritativeDistance - displayedDist;
      train.targetDistance = authoritativeDistance;
      train.errorMeters = Math.round(diff * 10) / 10;

      if (Math.abs(diff) > maxError) {
        maxError = Math.abs(diff);
      }

      // -------------------------------------------------------------
      // Multi-Tier Error Blending Protocol
      // -------------------------------------------------------------
      if (this.config.neverMoveBackward && diff < 0) {
        // STRICT RULE: NEVER MOVE BACKWARD
        // Train is ahead of schedule; zero out micro-boost and decelerate to wait for target
        train.microCorrectionSpeed = 0;
        train.macroEase = null;
      } else if (Math.abs(diff) > this.config.teleportThresholdMeters) {
        // TIER 3: Error > 500m -> 250ms fade-out, snap to true position, 250ms fade-in
        train.fadeState = 'FADING_OUT';
        train.fadeStartTime = now;
        train.fadeTargetDist = authoritativeDistance;
      } else if (Math.abs(diff) >= this.config.microErrorThresholdMeters) {
        // TIER 2: 50m <= Error <= 500m -> 800ms smooth cubic ease
        train.macroEase = {
          startTime: now,
          duration: this.config.macroEaseDurationMs,
          startDist: train.currentDistance,
          targetDist: authoritativeDistance,
        };
        train.microCorrectionSpeed = 0;
      } else {
        // TIER 1: Error < 50m -> blend smoothly over the 2-second update window (imperceptible)
        // Add diff / 2.0 to forward speed over 2.0 seconds
        train.microCorrectionSpeed = diff / 2.0;
        train.macroEase = null;
      }
    }

    this.maxFleetErrorMeters = Math.round(maxError * 10) / 10;
  }

  /**
   * Update train kinematics and physics for a single frame (dt in seconds)
   */
  updateTrainKinematics(train, dt, now) {
    const isSouth = train.direction === 'south';
    const totalLineDist = this.geometry.totalLengthMeters;
    const stationDists = this.geometry.stationDistanceMeters;

    // Handle Tier-3 Fade-Snap-Fade transition
    if (train.fadeState === 'FADING_OUT') {
      const elapsed = now - train.fadeStartTime;
      const p = Math.min(1.0, elapsed / this.config.fadeSnapDurationMs);
      train.opacity = 1.0 - p;
      if (p >= 1.0) {
        train.currentDistance = train.fadeTargetDist;
        train.trail = [];
        train.fadeState = 'FADING_IN';
        train.fadeStartTime = now;
      }
      return;
    } else if (train.fadeState === 'FADING_IN') {
      const elapsed = now - train.fadeStartTime;
      const p = Math.min(1.0, elapsed / this.config.fadeSnapDurationMs);
      train.opacity = p;
      if (p >= 1.0) {
        train.opacity = 1.0;
        train.fadeState = 'NORMAL';
      }
    }

    // Handle Tier-2 800ms Cubic Easing
    if (train.macroEase) {
      const elapsed = now - train.macroEase.startTime;
      const p = Math.min(1.0, elapsed / train.macroEase.duration);
      const easedT = this.smoothHermite(p);
      const newDist = train.macroEase.startDist + (train.macroEase.targetDist - train.macroEase.startDist) * easedT;

      // Ensure never moving backward
      if (!this.config.neverMoveBackward || newDist >= train.currentDistance) {
        train.currentDistance = newDist;
      }

      if (p >= 1.0) {
        train.macroEase = null;
      }
      return;
    }

    // Handle Station Platform Dwell
    if (train.state === 'DWELLING') {
      train.velocity = 0;
      train.dwellRemaining -= dt;
      train.breathePhase = (train.breathePhase + dt * 2.5) % (Math.PI * 2);

      // Fade out motion trail while dwelling
      if (train.trail.length > 0) {
        train.trail.shift();
      }

      if (train.dwellRemaining <= 0) {
        train.state = 'ACCELERATING';
        train.dwellRemaining = 0;
      }
      return;
    }

    // Determine current and target station distances
    let segStartDist, segEndDist;
    if (isSouth) {
      segStartDist = stationDists[train.currentSegmentIndex];
      segEndDist = stationDists[train.currentSegmentIndex + 1];
    } else {
      const idx = train.currentSegmentIndex;
      segStartDist = totalLineDist - stationDists[idx + 1];
      segEndDist = totalLineDist - stationDists[idx];
    }

    const segLength = Math.max(10, segEndDist - segStartDist);
    const progressInSeg = Math.max(0, Math.min(segLength, train.currentDistance - segStartDist));
    const distToStation = segLength - progressInSeg;

    const a = this.config.acceleration;
    const d = this.config.deceleration;
    const vCruise = this.config.maxCruisingSpeedMs;

    // Calculate critical distance for triangular vs trapezoidal velocity profile
    const sCrit = (vCruise * vCruise) / (2 * a) + (vCruise * vCruise) / (2 * d);
    let vMax = vCruise;
    if (segLength < sCrit) {
      vMax = Math.sqrt((2 * a * d * segLength) / (a + d));
    }

    const sAcc = (vMax * vMax) / (2 * a);
    const sBrake = (vMax * vMax) / (2 * d);

    // Kinematic phase selection with S-curve easing
    if (distToStation <= sBrake) {
      // Braking into platform
      train.state = 'BRAKING';
      const brakeFraction = distToStation / (sBrake || 1);
      const targetV = Math.max(0.6, vMax * this.smoothHermite(brakeFraction));
      train.velocity += (targetV - train.velocity) * Math.min(1.0, dt * 4.0);
      train.isApproachingStation = distToStation < 180;
    } else if (progressInSeg <= sAcc) {
      // Accelerating out of platform
      train.state = 'ACCELERATING';
      const accFraction = progressInSeg / (sAcc || 1);
      const targetV = Math.max(1.5, vMax * this.smoothHermite(accFraction));
      train.velocity += (targetV - train.velocity) * Math.min(1.0, dt * 3.5);
      train.isApproachingStation = false;
    } else {
      // Cruising at target speed
      train.state = 'CRUISING';
      train.velocity += (vMax - train.velocity) * Math.min(1.0, dt * 3.0);
      train.isApproachingStation = false;
    }

    // Apply Tier-1 micro-correction speed trim
    let effectiveVelocity = train.velocity + train.microCorrectionSpeed;

    // Check "Never Move Backward" rule
    if (this.config.neverMoveBackward && train.errorMeters < -5 && effectiveVelocity > 0) {
      // Train is ahead of authoritative position: decelerate smoothly to hold
      effectiveVelocity = Math.max(0, effectiveVelocity - this.config.deceleration * dt);
    }
    effectiveVelocity = Math.max(0, effectiveVelocity);

    // Dead reckoning forward displacement
    const moveStep = effectiveVelocity * dt;
    train.currentDistance += moveStep;

    // Platform arrival check
    if (train.currentDistance >= segEndDist) {
      train.currentDistance = segEndDist;
      train.velocity = 0;
      train.state = 'DWELLING';
      train.dwellRemaining = this.config.dwellDurationSeconds;
      train.isApproachingStation = false;
      train.microCorrectionSpeed = 0;

      // Advance to next segment
      if (isSouth) {
        train.currentSegmentIndex++;
        if (train.currentSegmentIndex >= this.geometry.stations.length - 1) {
          // Terminal reached: reverse to northbound
          train.direction = 'north';
          train.currentSegmentIndex = this.geometry.stations.length - 2;
          train.currentDistance = 0;
        }
      } else {
        train.currentSegmentIndex--;
        if (train.currentSegmentIndex < 0) {
          // Aluva terminal reached: reverse to southbound
          train.direction = 'south';
          train.currentSegmentIndex = 0;
          train.currentDistance = 0;
        }
      }
    }
  }

  /**
   * Sample track geometry and update heading angle with low-pass shortest-path filter
   */
  updateTrainSpatialCoords(train, dt) {
    const isSouth = train.direction === 'south';
    const sampled = this.geometry.sampleAtDistance(train.currentDistance);

    train.lat = sampled.lat;
    train.lng = sampled.lng;

    // Target heading along track tangent
    let targetHeading = sampled.bearing;
    if (!isSouth) {
      targetHeading = (targetHeading + 180) % 360;
    }
    train.targetAngle = targetHeading;

    // Shortest-path angle delta calculation
    let deltaAngle = ((targetHeading - train.currentAngle + 540) % 360) - 180;
    const smoothRate = Math.min(1.0, dt * (1 / this.config.headingSmoothingAlpha));
    train.currentAngle = (train.currentAngle + deltaAngle * smoothRate + 360) % 360;

    // Maintain motion trail
    if (train.state !== 'DWELLING') {
      train.trail.push({ lat: train.lat, lng: train.lng, dist: train.currentDistance });
      const maxAgeDist = this.config.trailLengthMeters;
      while (
        train.trail.length > 2 &&
        Math.abs(train.currentDistance - train.trail[0].dist) > maxAgeDist
      ) {
        train.trail.shift();
      }
    }
  }

  /**
   * Frame-Rate-Independent Delta Time Loop (60-120 FPS RAF)
   */
  step(now) {
    if (!this.isRunning) return;

    // Calculate delta time
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Clamp delta time to guard against background tab surge
    const dt = Math.min(rawDt, this.config.maxDeltaTimeSeconds) * this.simSpeedMultiplier;

    // Calculate rolling FPS
    this.frameCount++;
    if (now - this.lastFpsSampleTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsSampleTime));
      this.frameCount = 0;
      this.lastFpsSampleTime = now;
    }

    this.msSinceLastTick = Math.round(now - this.lastTickTime);

    // Update each train
    for (const train of this.trains.values()) {
      this.updateTrainKinematics(train, dt, now);
      this.updateTrainSpatialCoords(train, dt);
    }

    // Broadcast snapshot to all subscribed views (Map, Schematic, UI)
    this.notifyListeners(dt);

    this.rafId = requestAnimationFrame((t) => this.step(t));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastTickTime = performance.now();

    // Perform initial authoritative tick immediately
    this.performAuthoritativeTick();

    // Start 2000 ms Authoritative Data Tick Interval
    this.tickIntervalId = setInterval(() => {
      this.performAuthoritativeTick();
    }, this.config.tickIntervalMs);

    // Start 60 FPS RAF Loop
    this.rafId = requestAnimationFrame((t) => this.step(t));
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  setSimulationSpeed(multiplier) {
    this.simSpeedMultiplier = Math.max(0.1, Math.min(30, multiplier));
  }

  setSourceMode(mode) {
    this.sourceMode = mode === 'SIMULATED' ? 'SIMULATED' : 'LIVE';
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(dt) {
    const snapshot = this.getFleetSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, dt);
      } catch (e) {
        console.error('Motion Engine listener error:', e);
      }
    }
  }

  /**
   * Single Source of Truth Fleet Snapshot
   */
  getFleetSnapshot() {
    return Array.from(this.trains.values()).map((t) => {
      const segStA = this.geometry.stations[t.currentSegmentIndex];
      const segStB = this.geometry.stations[t.currentSegmentIndex + 1] || segStA;
      const isSouth = t.direction === 'south';

      return {
        id: t.id,
        name: t.name,
        direction: t.direction,
        lat: t.lat,
        lng: t.lng,
        headingAngle: t.currentAngle,
        velocityKmh: Math.round(t.velocity * 3.6),
        currentDistanceMeters: Math.round(t.currentDistance),
        fractionOfTrack: t.currentDistance / (this.geometry.totalLengthMeters || 1),
        state: t.state,
        dwellRemaining: Math.round(t.dwellRemaining),
        breathePhase: t.breathePhase,
        isApproachingStation: t.isApproachingStation,
        fromStation: isSouth ? segStA : segStB,
        toStation: isSouth ? segStB : segStA,
        trail: t.trail,
        isSelected: t.id === this.selectedTrainId,
        opacity: t.opacity,
        errorMeters: t.errorMeters,
      };
    });
  }

  /**
   * Dev Debug Metrics for Dev Overlay
   */
  getDebugMetrics() {
    const selected = this.trains.get(this.selectedTrainId) || this.trains.values().next().value;
    return {
      fps: this.currentFps,
      activeTrainsCount: this.trains.size,
      msSinceLastTick: this.msSinceLastTick,
      maxErrorMeters: this.maxFleetErrorMeters,
      source: this.sourceMode === 'LIVE' ? 'LIVE (KMRL IST)' : 'SIMULATED',
      selectedTrain: selected ? {
        id: selected.id,
        direction: selected.direction,
        speedKmh: Math.round(selected.velocity * 3.6),
        distanceMeters: Math.round(selected.currentDistance),
        state: selected.state,
        errorMeters: selected.errorMeters,
      } : null,
    };
  }
}
