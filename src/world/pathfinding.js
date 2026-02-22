// GENESIS — Algoritmo BFS para pathfinding
import { isWalkable, MAP_ROWS, MAP_COLS } from './mapData';

// Direcciones de movimiento (arriba, derecha, abajo, izquierda)
const DIRECTIONS = [
  [-1, 0],  // arriba
  [0, 1],   // derecha
  [1, 0],   // abajo
  [0, -1],  // izquierda
];

/**
 * Encuentra el camino más corto entre dos puntos usando BFS
 * @param {number} startRow - Fila de inicio
 * @param {number} startCol - Columna de inicio
 * @param {number} endRow - Fila de destino
 * @param {number} endCol - Columna de destino
 * @returns {Array<{row: number, col: number}>} - Array de posiciones del camino (sin incluir inicio)
 */
export function findPath(startRow, startCol, endRow, endCol) {
  // Verificar que el destino es alcanzable
  if (!isWalkable(endRow, endCol)) {
    return [];
  }

  // Si ya estamos en el destino
  if (startRow === endRow && startCol === endCol) {
    return [];
  }

  // BFS
  const queue = [[startRow, startCol]];
  const visited = new Set([`${startRow},${startCol}`]);
  const parent = new Map();

  while (queue.length > 0) {
    const [row, col] = queue.shift();

    // Explorar vecinos
    for (const [dr, dc] of DIRECTIONS) {
      const newRow = row + dr;
      const newCol = col + dc;
      const key = `${newRow},${newCol}`;

      // Verificar límites y si ya fue visitado
      if (newRow < 0 || newRow >= MAP_ROWS || newCol < 0 || newCol >= MAP_COLS) {
        continue;
      }
      if (visited.has(key)) {
        continue;
      }
      if (!isWalkable(newRow, newCol)) {
        continue;
      }

      visited.add(key);
      parent.set(key, `${row},${col}`);

      // Si llegamos al destino, reconstruir el camino
      if (newRow === endRow && newCol === endCol) {
        return reconstructPath(parent, startRow, startCol, endRow, endCol);
      }

      queue.push([newRow, newCol]);
    }
  }

  // No se encontró camino
  return [];
}

/**
 * Reconstruye el camino desde el mapa de padres
 */
function reconstructPath(parent, startRow, startCol, endRow, endCol) {
  const path = [];
  let current = `${endRow},${endCol}`;
  const startKey = `${startRow},${startCol}`;

  while (current !== startKey) {
    const [r, c] = current.split(',').map(Number);
    path.unshift({ row: r, col: c });
    current = parent.get(current);
  }

  return path;
}

/**
 * Obtiene la dirección de movimiento entre dos posiciones adyacentes
 * @returns {'left' | 'right' | 'up' | 'down'}
 */
export function getDirection(fromRow, fromCol, toRow, toCol) {
  if (toCol > fromCol) return 'right';
  if (toCol < fromCol) return 'left';
  if (toRow < fromRow) return 'up';
  return 'down';
}
