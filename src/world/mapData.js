// GENESIS — Mapa del mundo 22x14 tiles
// Leyenda de tiles
export const TILES = {
  O: 'grass',      // Pasto
  P: 'path',       // Camino
  W: 'water',      // Agua
  T: 'tree',       // Árbol
  F: 'flowers',    // Flores
  BW: 'wall',      // Pared edificio
  RF: 'roof',      // Techo
  DR: 'door',      // Puerta
  LW: 'lockedWall',    // Pared bloqueada
  LR: 'lockedRoof',    // Techo bloqueado
  LD: 'lockedDoor',    // Puerta bloqueada
  BG: 'bridge',    // Puente
};

const { O, P, W, T, F, BW, RF, DR, LW, LR, LD, BG } = TILES;

// Mapa 22x14 tiles
export const MAP = [
  [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T ],
  [T,  T,  O,  O,  F,  O,  O,  O,  T,  T,  O,  O,  O,  O,  O,  O,  O,  O,  T,  T,  T,  T ],
  [T,  O,  RF, RF, RF, RF, O,  O,  O,  O,  O,  O,  O,  O,  LR, LR, LR, O,  O,  T,  T,  T ],
  [T,  O,  BW, BW, BW, BW, O,  O,  O,  O,  P,  P,  P,  O,  LW, LW, LW, O,  O,  O,  T,  T ],
  [T,  O,  BW, DR, BW, BW, O,  O,  O,  O,  P,  O,  O,  O,  LW, LD, LW, O,  O,  O,  T,  T ],
  [T,  O,  O,  O,  O,  O,  O,  O,  O,  O,  P,  O,  O,  O,  O,  O,  O,  O,  F,  O,  O,  T ],
  [T,  O,  O,  F,  O,  O,  P,  P,  P,  P,  P,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  T ],
  [T,  O,  O,  O,  O,  O,  P,  O,  O,  O,  P,  P,  P,  P,  P,  P,  O,  O,  O,  O,  O,  T ],
  [T,  O,  O,  O,  O,  O,  P,  O,  O,  O,  O,  O,  O,  O,  O,  P,  O,  O,  O,  O,  T,  T ],
  [T,  O,  O,  O,  F,  O,  P,  O,  F,  O,  O,  O,  O,  O,  O,  P,  O,  O,  O,  T,  T,  T ],
  [T,  T,  O,  O,  O,  O,  P,  O,  O,  O,  O,  O,  F,  O,  O,  P,  P,  P,  O,  O,  T,  T ],
  [T,  T,  T,  O,  O,  O,  P,  P,  P,  P,  P,  P,  P,  O,  O,  O,  O,  P,  O,  O,  T,  T ],
  [T,  T,  T,  T,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  W,  W,  BG, O,  T,  T,  T ],
  [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  W,  W,  W,  T,  T,  T,  T ],
];

// Tiles transitables
export const WALKABLE = new Set([
  TILES.O,      // Pasto
  TILES.P,      // Camino
  TILES.F,      // Flores
  TILES.DR,     // Puerta abierta
  TILES.LD,     // Puerta bloqueada (se puede pasar enfrente)
  TILES.BG,     // Puente
]);

// Verificar si un tile es transitable
export function isWalkable(row, col) {
  if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[0].length) {
    return false;
  }
  return WALKABLE.has(MAP[row][col]);
}

// Obtener el tipo de tile en una posición
export function getTile(row, col) {
  if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[0].length) {
    return null;
  }
  return MAP[row][col];
}

// Dimensiones del mapa
export const MAP_ROWS = MAP.length;
export const MAP_COLS = MAP[0].length;
