/**
 * Kochi Metro Track Geometry & Arc-Length Parameterization
 * Precomputes cumulative track distance table for O(log N) binary search lookup.
 * Ensures visually constant train velocity across viaduct curves.
 */

// 25 Stations of Kochi Metro Blue Line (Aluva to Thrippunithura Terminal)
export const STATIONS = [
  { id: 1,  code: 'ALVA', name: 'Aluva',                ml: 'ആലുവ',              lat: 10.1099, lng: 76.3495, km: 0.00,  theme: 'Periyar River Basin' },
  { id: 2,  code: 'PLCD', name: 'Pulinchodu',           ml: 'പുളിഞ്ചോട്',          lat: 10.0951, lng: 76.3466, km: 1.73,  theme: 'Western Ghats Flora' },
  { id: 3,  code: 'CMPD', name: 'Companypady',          ml: 'കമ്പനിപ്പടി',         lat: 10.0873, lng: 76.3428, km: 2.70,  theme: 'Medicinal Herbs' },
  { id: 4,  code: 'AMBV', name: 'Ambattukavu',          ml: 'അമ്പാട്ടുകാവ്',        lat: 10.0794, lng: 76.3389, km: 3.68,  theme: 'Bamboo Crafts' },
  { id: 5,  code: 'MTTM', name: 'Muttom',               ml: 'മുട്ടം',              lat: 10.0727, lng: 76.3337, km: 4.62,  theme: 'KMRL Depot & Solar' },
  { id: 6,  code: 'KLMS', name: 'Kalamassery',          ml: 'കളമശ്ശേരി',           lat: 10.0586, lng: 76.3220, km: 6.67,  theme: 'Industrial Cochin' },
  { id: 7,  code: 'CUSAT',name: 'Cochin University',    ml: 'കൊച്ചിൻ യൂണിവേഴ്സിറ്റി', lat: 10.0467, lng: 76.3182, km: 8.05,  theme: 'Maritime Science' },
  { id: 8,  code: 'PDPM', name: 'Pathadipalam',         ml: 'പത്തടിപ്പാലം',        lat: 10.0361, lng: 76.3144, km: 9.30,  theme: 'Aquatic Life' },
  { id: 9,  code: 'EDPL', name: 'Edapally',             ml: 'ഇടപ്പള്ളി',           lat: 10.0251, lng: 76.3083, km: 10.78, theme: 'Spices Heritage & Lulu' },
  { id: 10, code: 'CGPK', name: 'Changampuzha Park',    ml: 'ചങ്ങമ്പുഴ പാർക്ക്',    lat: 10.0152, lng: 76.3023, km: 12.08, theme: 'Kerala Literature' },
  { id: 11, code: 'PLVM', name: 'Palarivattom',         ml: 'പാലാരിവട്ടം',         lat: 10.0099, lng: 76.3048, km: 13.09, theme: 'Flowers of Onam' },
  { id: 12, code: 'JLNS', name: 'JLN Stadium',          ml: 'ജെ.എൽ.എൻ സ്റ്റേഡിയം',  lat: 10.0002, lng: 76.2992, km: 14.21, theme: 'Kerala Sports' },
  { id: 13, code: 'KLOR', name: 'Kaloor',               ml: 'കലൂർ',               lat: 9.9950,  lng: 76.2914, km: 15.24, theme: 'Monsoon Rains' },
  { id: 14, code: 'TNHL', name: 'Town Hall',            ml: 'ടൗൺ ഹാൾ',            lat: 9.9914,  lng: 76.2884, km: 15.72, theme: 'Butterflies' },
  { id: 15, code: 'MGRD', name: 'MG Road',              ml: 'എം.ജി റോഡ്',         lat: 9.9834,  lng: 76.2823, km: 16.92, theme: 'Trade History' },
  { id: 16, code: 'MHRJ', name: 'Maharajas College',    ml: 'മഹാരാജാസ് കോളേജ്',   lat: 9.9732,  lng: 76.2851, km: 18.10, theme: 'Endemic Reptiles' },
  { id: 17, code: 'ERSH', name: 'Ernakulam South',      ml: 'എറണാകുളം സൗത്ത്',    lat: 9.9685,  lng: 76.2893, km: 18.96, theme: 'Temple Murals' },
  { id: 18, code: 'KDVN', name: 'Kadavanthra',          ml: 'കടവന്ത്ര',            lat: 9.9666,  lng: 76.2983, km: 20.14, theme: 'Handloom & Coir' },
  { id: 19, code: 'ELMK', name: 'Elamkulam',            ml: 'എളംകുളം',            lat: 9.9671,  lng: 76.3087, km: 21.29, theme: 'Pokkali Farming' },
  { id: 20, code: 'VYTL', name: 'Vyttila',              ml: 'വൈറ്റില',             lat: 9.9675,  lng: 76.3204, km: 22.63, theme: 'Snake Boat Races' },
  { id: 21, code: 'THKD', name: 'Thykoodam',            ml: 'തൈക്കൂടം',            lat: 9.9601,  lng: 76.3235, km: 23.66, theme: 'Fishing Nets' },
  { id: 22, code: 'PETA', name: 'Pettah',               ml: 'പേട്ട',               lat: 9.9525,  lng: 76.3308, km: 24.84, theme: 'Mangroves' },
  { id: 23, code: 'VDKT', name: 'Vadakkekotta',         ml: 'വടക്കേക്കോട്ട',        lat: 9.9518,  lng: 76.3396, km: 25.88, theme: 'Kalaripayattu Fort' },
  { id: 24, code: 'SNJN', name: 'SN Junction',          ml: 'എസ്.എൻ ജംഗ്ഷൻ',      lat: 9.9522,  lng: 76.3463, km: 26.98, theme: 'Kerala Renaissance' },
  { id: 25, code: 'TPHT', name: 'Thrippunithura',       ml: 'തൃപ്പൂണിത്തുറ',        lat: 9.9504,  lng: 76.3518, km: 28.13, theme: 'Royal Cochin Capital' }
];

// Great-circle Haversine formula to compute distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Compute compass bearing from Point A to Point B in degrees (0 = North, 90 = East)
export function computeBearingDegrees(lat1, lng1, lat2, lng2) {
  const y = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
  const x = lat2 - lat1;
  const rad = Math.atan2(y, x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export class TrackGeometry {
  constructor(stations = STATIONS) {
    this.stations = stations;
    this.vertices = [];
    this.cumulativeDistances = [];
    this.totalLengthMeters = 0;
    this.stationDistanceMeters = [];

    this.buildGeometry();
  }

  buildGeometry() {
    this.vertices = [];
    this.cumulativeDistances = [0];

    // Assign stations and build smooth intermediate curve samples
    for (let i = 0; i < this.stations.length; i++) {
      const st = this.stations[i];
      if (i === 0) {
        this.vertices.push({ lat: st.lat, lng: st.lng, stationIndex: 0 });
        this.stationDistanceMeters.push(0);
      } else {
        const prev = this.stations[i - 1];
        const dist = haversineMeters(prev.lat, prev.lng, st.lat, st.lng);
        
        // Add intermediate waypoint for realistic curve smoothing on longer segments
        const numSamples = Math.max(2, Math.round(dist / 400));
        for (let s = 1; s <= numSamples; s++) {
          const t = s / numSamples;
          const lat = prev.lat + (st.lat - prev.lat) * t;
          const lng = prev.lng + (st.lng - prev.lng) * t;
          const isStation = s === numSamples;
          
          this.vertices.push({
            lat,
            lng,
            stationIndex: isStation ? i : null
          });

          const lastV = this.vertices[this.vertices.length - 2];
          const segDist = haversineMeters(lastV.lat, lastV.lng, lat, lng);
          const totalSoFar = this.cumulativeDistances[this.cumulativeDistances.length - 1] + segDist;
          this.cumulativeDistances.push(totalSoFar);

          if (isStation) {
            this.stationDistanceMeters.push(totalSoFar);
          }
        }
      }
    }

    this.totalLengthMeters = this.cumulativeDistances[this.cumulativeDistances.length - 1];
  }

  // O(log N) binary search lookup of distance along path
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
      fractionOfTrack: clampedDist / (this.totalLengthMeters || 1)
    };
  }

  // Get coordinates for the entire polyline for Leaflet / Map rendering
  getPolylineCoords() {
    return this.stations.map(s => [s.lat, s.lng]);
  }
}
