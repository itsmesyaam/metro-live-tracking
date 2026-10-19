/**
 * Kochi Metro Train Motion Engine
 * Kinematic physics simulation with S-curve acceleration, cruising, braking,
 * platform dwell, dead reckoning, error correction blending, and low-pass angle smoothing.
 * Acts as the single source of truth for both Map and Schematic views.
 */

import { MOTION_CONFIG } from './motion-config.js';
import { TrackGeometry, STATIONS } from './track-geometry.js';

export class TrainMotionEngine {
  constructor(options = {}) {
    this.geometry = options.geometry || new TrackGeometry();
    this.config = { ...MOTION_CONFIG, ...options.config };
    this.trains = new Map();
    this.isRunning = false;
    this.lastFrameTime = performance.now();
    this.rafId = null;
    this.listeners = new Set();
    this.simSpeedMultiplier = this.config.simulationSpeedMultiplier;
    this.selectedTrainId = null;
    this.cameraFollowTrainId = null;

    this.bindVisibilityHandler();
  }

  bindVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Reset lastFrameTime to prevent delta surge after tab backgrounding
          this.lastFrameTime = performance.now();
        }
      });
    }
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
    const initDist = isSouth
      ? this.geometry.stationDistanceMeters[initialStationIndex] || 0
      : this.geometry.totalLengthMeters - (this.geometry.stationDistanceMeters[initialStationIndex] || 0);

    const initialSample = this.geometry.sampleAtDistance(initDist);
    const initialAngle = isSouth ? initialSample.bearing : (initialSample.bearing + 180) % 360;

    const train = {
      id,
      name,
      direction,
      currentDistance: initDist,
      targetDistance: initDist,
      displayOffset: 0,
      velocity: 0, // m/s
      currentAngle: initialAngle,
      targetAngle: initialAngle,
      state: 'DWELLING', // 'ACCELERATING' | 'CRUISING' | 'BRAKING' | 'DWELLING'
      dwellRemaining: this.config.dwellDurationSeconds,
      currentSegmentIndex: isSouth ? 0 : this.geometry.stations.length - 2,
      opacity: 1.0,
      fadeState: 'NORMAL', // 'FADING_OUT' | 'FADING_IN' | 'NORMAL'
      fadeProgress: 1.0,
      trail: [], // Ring buffer of recent trail coordinates [{lat, lng, dist}]
      breathePhase: 0,
      isApproachingStation: false,
      approachingStationId: null,
      departureOffsetSeconds,
    };

    this.trains.set(id, train);
    return train;
  }

  /**
   * S-Curve Hermite Easing Function
   * Returns smooth 0 to 1 velocity ramp with zero jerk at endpoints.
   */
  smoothHermite(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  /**
   * Update kinematics of a single segment between Station A and Station B
   */
  updateTrainKinematics(train, dt) {
    const isSouth = train.direction === 'south';
    const totalLineDist = this.geometry.totalLengthMeters;

    // Handle station platform dwell state
    if (train.state === 'DWELLING') {
      train.velocity = 0;
      train.dwellRemaining -= dt;
      train.breathePhase = (train.breathePhase + dt * 2.5) % (Math.PI * 2);

      // Fade out trail during platform dwell
      if (train.trail.length > 0) {
        train.trail.shift();
      }

      if (train.dwellRemaining <= 0) {
        // Depart station
        train.state = 'ACCELERATING';
        train.dwellRemaining = 0;
      }
      return;
    }

    // Determine current and target station distances
    const stationDists = this.geometry.stationDistanceMeters;
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

    // Physical acceleration & braking distances
    const a = this.config.acceleration;
    const d = this.config.deceleration;
    const vCruise = this.config.maxCruisingSpeedMs;

    // Calculate critical distance for triangular vs trapezoidal velocity profile
    const sCrit = (vCruise * vCruise) / (2 * a) + (vCruise * vCruise) / (2 * d);
    let vMax = vCruise;
    if (segLength < sCrit) {
      // Short segment: peak at reachable triangular velocity
      vMax = Math.sqrt((2 * a * d * segLength) / (a + d));
    }

    const sAcc = (vMax * vMax) / (2 * a);
    const sBrake = (vMax * vMax) / (2 * d);

    // Kinematic phase selection with S-curve easing
    if (distToStation <= sBrake) {
      // Braking into platform
      train.state = 'BRAKING';
      const brakeFraction = distToStation / (sBrake || 1);
      const targetV = Math.max(0.8, vMax * this.smoothHermite(brakeFraction));
      train.velocity += (targetV - train.velocity) * Math.min(1.0, dt * 4);

      // Trigger station approach soft pulse
      train.isApproachingStation = distToStation < 160;
    } else if (progressInSeg <= sAcc) {
      // Accelerating out of platform
      train.state = 'ACCELERATING';
      const accFraction = progressInSeg / (sAcc || 1);
      const targetV = Math.max(1.5, vMax * this.smoothHermite(accFraction));
      train.velocity += (targetV - train.velocity) * Math.min(1.0, dt * 3.5);
      train.isApproachingStation = false;
    } else {
      // Cruising at speed
      train.state = 'CRUISING';
      train.velocity += (vMax - train.velocity) * Math.min(1.0, dt * 3.0);
      train.isApproachingStation = false;
    }

    // Dead reckoning position integration
    const moveStep = train.velocity * dt;
    train.currentDistance += moveStep;

    // Smooth error blending towards target telemetric position
    if (train.targetDistance !== undefined) {
      const error = train.targetDistance - (train.currentDistance + train.displayOffset);
      if (Math.abs(error) > this.config.teleportThresholdMeters) {
        // Safe 300ms fade & reposition on large error
        this.triggerFadeReposition(train, train.targetDistance);
      } else {
        // Continuous smooth exponential blend
        const blendFactor = Math.min(1.0, dt / this.config.blendDurationSeconds);
        train.displayOffset += error * blendFactor;
      }
    }

    // Platform arrival check
    if (train.currentDistance >= segEndDist) {
      train.currentDistance = segEndDist;
      train.velocity = 0;
      train.state = 'DWELLING';
      train.dwellRemaining = this.config.dwellDurationSeconds;
      train.isApproachingStation = false;

      // Advance to next segment
      if (isSouth) {
        train.currentSegmentIndex++;
        if (train.currentSegmentIndex >= this.geometry.stations.length - 1) {
          // Terminal reached: reverse direction
          train.direction = 'north';
          train.currentSegmentIndex = this.geometry.stations.length - 2;
          train.currentDistance = 0;
        }
      } else {
        train.currentSegmentIndex--;
        if (train.currentSegmentIndex < 0) {
          // Aluva terminal reached: reverse direction
          train.direction = 'south';
          train.currentSegmentIndex = 0;
          train.currentDistance = 0;
        }
      }
    }
  }

  /**
   * Fade & reposition safeguard when telemetric error > 500m
   */
  triggerFadeReposition(train, trueDistance) {
    train.opacity = 0.2;
    train.currentDistance = trueDistance;
    train.displayOffset = 0;
    train.trail = [];
  }

  /**
   * Sample track geometry and update heading angle with low-pass shortest-path filter
   */
  updateTrainSpatialCoords(train, dt) {
    const isSouth = train.direction === 'south';
    const effectiveDist = train.currentDistance + train.displayOffset;
    const sampled = this.geometry.sampleAtDistance(effectiveDist);

    train.lat = sampled.lat;
    train.lng = sampled.lng;

    // Track tangent target heading
    let targetHeading = sampled.bearing;
    if (!isSouth) {
      targetHeading = (targetHeading + 180) % 360;
    }
    train.targetAngle = targetHeading;

    // Shortest-path angle delta calculation
    let deltaAngle = ((targetHeading - train.currentAngle + 540) % 360) - 180;
    const smoothRate = Math.min(1.0, dt * (1 / this.config.headingSmoothingAlpha));
    train.currentAngle += deltaAngle * smoothRate;

    // Maintain motion trail
    if (train.state !== 'DWELLING') {
      train.trail.push({ lat: train.lat, lng: train.lng, dist: effectiveDist });
      // Prune trail exceeding configured trail length
      const maxAgeDist = this.config.trailLengthMeters;
      while (
        train.trail.length > 2 &&
        Math.abs(effectiveDist - train.trail[0].dist) > maxAgeDist
      ) {
        train.trail.shift();
      }
    }
  }

  /**
   * Frame-Rate-Independent Delta Time Loop
   */
  step(now) {
    if (!this.isRunning) return;

    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Clamp delta time to guard against tab suspend leap
    const dt = Math.min(rawDt, this.config.maxDeltaTimeSeconds) * this.simSpeedMultiplier;

    for (const train of this.trains.values()) {
      this.updateTrainKinematics(train, dt);
      this.updateTrainSpatialCoords(train, dt);
    }

    // Notify registered renderers (Canvas map overlay & schematic)
    this.notifyListeners(dt);

    this.rafId = requestAnimationFrame((t) => this.step(t));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.step(t));
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setSimulationSpeed(multiplier) {
    this.simSpeedMultiplier = Math.max(0.1, Math.min(30, multiplier));
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
        currentDistanceMeters: t.currentDistance,
        fractionOfTrack: t.currentDistance / (this.geometry.totalLengthMeters || 1),
        state: t.state,
        dwellRemaining: t.dwellRemaining,
        breathePhase: t.breathePhase,
        isApproachingStation: t.isApproachingStation,
        fromStation: isSouth ? segStA : segStB,
        toStation: isSouth ? segStB : segStA,
        trail: t.trail,
        isSelected: t.id === this.selectedTrainId,
        opacity: t.opacity,
      };
    });
  }
}
