/**
 * Kochi Metro Track Geometry & Arc-Length Parameterization
 * Provides O(log N) binary search mapping of physical track distance (0 to 28,130m)
 * to geographic coordinates (lat, lng) and true geodetic headings.
 * Ensures visually constant train velocity across curves without distortion.
 */

// 25 Stations of Kochi Metro Blue Line (Aluva to Thrippunithura Terminal)
export const STATIONS = [
  { id: 1,  code: 'ALVA', name: 'Aluva',                ml: 'ആലുവ',              lat: 10.1099, lng: 76.3495, km: 0.00,  minFromAluva: 0,  theme: 'Periyar River Basin' },
  { id: 2,  code: 'PLCD', name: 'Pulinchodu',           ml: 'പുളിഞ്ചോട്',          lat: 10.0951, lng: 76.3466, km: 1.73,  minFromAluva: 3,  theme: 'Western Ghats Flora' },
  { id: 3,  code: 'CMPD', name: 'Companypady',          ml: 'കമ്പനിപ്പടി',         lat: 10.0873, lng: 76.3428, km: 2.70,  minFromAluva: 5,  theme: 'Medicinal Herbs' },
  { id: 4,  code: 'AMBV', name: 'Ambattukavu',          ml: 'അമ്പാട്ടുകാവ്',        lat: 10.0794, lng: 76.3389, km: 3.68,  minFromAluva: 7,  theme: 'Bamboo Crafts' },
  { id: 5,  code: 'MTTM', name: 'Muttom',               ml: 'മുട്ടം',              lat: 10.0727, lng: 76.3337, km: 4.62,  minFromAluva: 9,  theme: 'Metro Depot & Solar Sustainability' },
  { id: 6,  code: 'KLMS', name: 'Kalamassery',          ml: 'കളമശ്ശേരി',           lat: 10.0586, lng: 76.3220, km: 6.67,  minFromAluva: 12, theme: 'Industrial Cochin' },
  { id: 7,  code: 'CUSAT',name: 'Cochin University',    ml: 'കൊച്ചിൻ യൂണിവേഴ്സിറ്റി', lat: 10.0467, lng: 76.3182, km: 8.05,  minFromAluva: 14, theme: 'Maritime Science' },
  { id: 8,  code: 'PDPM', name: 'Pathadipalam',         ml: 'പത്തടിപ്പാലം',        lat: 10.0361, lng: 76.3144, km: 9.30,  minFromAluva: 16, theme: 'Aquatic Life' },
  { id: 9,  code: 'EDPL', name: 'Edapally',             ml: 'ഇടപ്പള്ളി',           lat: 10.0251, lng: 76.3083, km: 10.78, minFromAluva: 18, theme: 'Spices Heritage & Lulu' },
  { id: 10, code: 'CGPK', name: 'Changampuzha Park',    ml: 'ചങ്ങമ്പുഴ പാർക്ക്',    lat: 10.0152, lng: 76.3023, km: 12.08, minFromAluva: 20, theme: 'Kerala Literature' },
  { id: 11, code: 'PLVM', name: 'Palarivattom',         ml: 'പാലാരിവട്ടം',         lat: 10.0099, lng: 76.3048, km: 13.09, minFromAluva: 22, theme: 'Flowers of Onam' },
  { id: 12, code: 'JLNS', name: 'JLN Stadium',          ml: 'ജെ.എൽ.എൻ സ്റ്റേഡിയം',  lat: 10.0002, lng: 76.2992, km: 14.21, minFromAluva: 24, theme: 'Kerala Sports' },
  { id: 13, code: 'KLOR', name: 'Kaloor',               ml: 'കലൂർ',               lat: 9.9950,  lng: 76.2914, km: 15.24, minFromAluva: 26, theme: 'Monsoon Rains' },
  { id: 14, code: 'TNHL', name: 'Town Hall',            ml: 'ടൗൺ ഹാൾ',            lat: 9.9914,  lng: 76.2884, km: 15.72, minFromAluva: 27, theme: 'Butterflies' },
  { id: 15, code: 'MGRD', name: 'MG Road',              ml: 'എം.ജി റോഡ്',         lat: 9.9834,  lng: 76.2823, km: 16.92, minFromAluva: 29, theme: 'Trade History' },
  { id: 16, code: 'MHRJ', name: 'Maharajas College',    ml: 'മഹാരാജാസ് കോളേജ്',   lat: 9.9732,  lng: 76.2851, km: 18.10, minFromAluva: 31, theme: 'Endemic Reptiles' },
  { id: 17, code: 'ERSH', name: 'Ernakulam South',      ml: 'എറണാകുളം സൗത്ത്',    lat: 9.9685,  lng: 76.2893, km: 18.96, minFromAluva: 33, theme: 'Temple Murals' },
  { id: 18, code: 'KDVN', name: 'Kadavanthra',          ml: 'കടവന്ത്ര',            lat: 9.9666,  lng: 76.2983, km: 20.14, minFromAluva: 35, theme: 'Handloom & Coir' },
  { id: 19, code: 'ELMK', name: 'Elamkulam',            ml: 'എളംകുളം',            lat: 9.9671,  lng: 76.3087, km: 21.29, minFromAluva: 37, theme: 'Pokkali Farming' },
  { id: 20, code: 'VYTL', name: 'Vyttila',              ml: 'വൈറ്റില',             lat: 9.9675,  lng: 76.3204, km: 22.63, minFromAluva: 39, theme: 'Snake Boat Races' },
  { id: 21, code: 'THKD', name: 'Thykoodam',            ml: 'തൈക്കൂടം',            lat: 9.9601,  lng: 76.3235, km: 23.66, minFromAluva: 41, theme: 'Fishing Nets' },
  { id: 22, code: 'PETA', name: 'Pettah',               ml: 'പേട്ട',               lat: 9.9525,  lng: 76.3308, km: 24.84, minFromAluva: 43, theme: 'Mangroves' },
  { id: 23, code: 'VDKT', name: 'Vadakkekotta',         ml: 'വടക്കേക്കോട്ട',        lat: 9.9518,  lng: 76.3396, km: 25.88, minFromAluva: 45, theme: 'Kalaripayattu Fort' },
  { id: 24, code: 'SNJN', name: 'SN Junction',          ml: 'എസ്.എൻ ജംഗ്ഷൻ',      lat: 9.9522,  lng: 76.3463, km: 26.98, minFromAluva: 47, theme: 'Kerala Renaissance' },
  { id: 25, code: 'TPHT', name: 'Thrippunithura',       ml: 'തൃപ്പൂണിത്തുറ',        lat: 9.9504,  lng: 76.3518, km: 28.13, minFromAluva: 49, theme: 'Royal Cochin Capital' }
];

/**
 * Spherical forward azimuth geodetic bearing calculation
 * Returns angle in degrees [0, 360) where 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function computeBearingDegrees(lat1, lng1, lat2, lng2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const rad = Math.atan2(y, x);
  let deg = (rad * 180) / Math.PI;
  return (deg + 360) % 360;
}

export class TrackGeometry {
  constructor(stations = STATIONS) {
    this.stations = stations;
    this.vertices = [];
    this.cumulativeDistances = [];
    this.stationDistanceMeters = [];
    this.totalLengthMeters = stations[stations.length - 1].km * 1000; // Exact 28,130m

    this.buildGeometry();
  }

  buildGeometry() {
    this.vertices = [];
    this.cumulativeDistances = [];
    this.stationDistanceMeters = [];

    for (let i = 0; i < this.stations.length; i++) {
      const st = this.stations[i];
      const stDist = Math.round(st.km * 1000);
      this.stationDistanceMeters.push(stDist);

      if (i === 0) {
        this.vertices.push({
          lat: st.lat,
          lng: st.lng,
          stationIndex: 0,
        });
        this.cumulativeDistances.push(0);
      } else {
        const prev = this.stations[i - 1];
        const prevDist = this.stationDistanceMeters[i - 1];
        const segLen = stDist - prevDist;

        // Subdivide segment into intermediate vertices (~150m spacing) for smooth curve following
        const numSubdivisions = Math.max(2, Math.round(segLen / 150));

        for (let s = 1; s <= numSubdivisions; s++) {
          const t = s / numSubdivisions;
          const lat = prev.lat + (st.lat - prev.lat) * t;
          const lng = prev.lng + (st.lng - prev.lng) * t;
          const d = prevDist + segLen * t;
          const isStation = s === numSubdivisions;

          this.vertices.push({
            lat,
            lng,
            stationIndex: isStation ? i : null,
          });
          this.cumulativeDistances.push(d);
        }
      }
    }

    this.totalLengthMeters = this.cumulativeDistances[this.cumulativeDistances.length - 1];
  }

  /**
   * O(log N) binary search lookup of distance along path
   * Returns interpolated coordinates and tangent bearing.
   */
  sampleAtDistance(distanceMeters) {
    const clampedDist = Math.max(0, Math.min(this.totalLengthMeters, distanceMeters));

    let low = 0;
    let high = this.cumulativeDistances.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.cumulativeDistances[mid] < clampedDist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx = Math.max(0, Math.min(this.cumulativeDistances.length - 2, low - 1));
    const dStart = this.cumulativeDistances[idx];
    const dEnd = this.cumulativeDistances[idx + 1];
    const segLen = dEnd - dStart;
    const fraction = segLen > 0 ? (clampedDist - dStart) / segLen : 0;

    const pA = this.vertices[idx];
    const pB = this.vertices[idx + 1];

    const lat = pA.lat + (pB.lat - pA.lat) * fraction;
    const lng = pA.lng + (pB.lng - pA.lng) * fraction;
    const bearing = computeBearingDegrees(pA.lat, pA.lng, pB.lat, pB.lng);

    return {
      lat,
      lng,
      bearing,
      distanceMeters: clampedDist,
      fractionOfTrack: clampedDist / (this.totalLengthMeters || 1),
    };
  }

  /**
   * Returns station lat/lng polyline array for map rendering
   */
  getPolylineCoords() {
    return this.stations.map((s) => [s.lat, s.lng]);
  }
}
