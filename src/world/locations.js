// GENESIS — Ubicaciones con nombre en el mapa
export const LOCATIONS = {
  workshop:  { r: 4,  c: 3,  name: 'Taller',           emoji: '🏗️' },
  garden:    { r: 9,  c: 4,  name: 'Jardín',           emoji: '🌺' },
  crossroad: { r: 6,  c: 10, name: 'Cruce central',    emoji: '🔀' },
  locked:    { r: 4,  c: 15, name: 'Edificio cerrado', emoji: '🔒' },
  lakeshore: { r: 12, c: 17, name: 'Orilla del lago',  emoji: '🌊' },
  forest:    { r: 1,  c: 4,  name: 'Claro del bosque', emoji: '🌲' },
  eastpath:  { r: 7,  c: 15, name: 'Camino este',      emoji: '🛤️' },
  meadow:    { r: 8,  c: 8,  name: 'Pradera',          emoji: '🌿' },
};

// Obtener ubicación más cercana a una posición
export function getNearestLocation(row, col) {
  let nearest = null;
  let minDist = Infinity;

  for (const [key, loc] of Object.entries(LOCATIONS)) {
    const dist = Math.abs(loc.r - row) + Math.abs(loc.c - col);
    if (dist < minDist) {
      minDist = dist;
      nearest = { key, ...loc };
    }
  }

  return nearest;
}

// Obtener ubicación exacta en una posición (si existe)
export function getLocationAt(row, col) {
  for (const [key, loc] of Object.entries(LOCATIONS)) {
    if (loc.r === row && loc.c === col) {
      return { key, ...loc };
    }
  }
  return null;
}

// Obtener lista de claves de ubicaciones
export function getLocationKeys() {
  return Object.keys(LOCATIONS);
}

// Obtener ubicación por clave
export function getLocation(key) {
  return LOCATIONS[key] ? { key, ...LOCATIONS[key] } : null;
}
