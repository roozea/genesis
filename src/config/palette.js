// GENESIS — Paleta de colores pixel-art oscura
export const PALETTE = {
  // Fondo general
  bg: '#08081a',

  // Pasto — múltiples tonos, varía por posición
  grass: ['#4a7c59', '#3d6b4e', '#527f5e', '#45734f', '#4e8060'],

  // Caminos — dos tonos alternando
  path: '#c4a35a',
  pathAlt: '#b89340',

  // Agua
  water: '#3575cc',
  waterDeep: '#2960aa',
  waterLight: '#5090e0',  // para reflejos

  // Árboles
  treeTrunk: '#5c3a1e',
  treeLeaves: ['#2d5a38', '#3a7045', '#246530'],

  // Edificios (Taller de Arq)
  wall: '#b09878',
  wallShadow: '#8b7355',
  roof: '#c04828',
  roofShadow: '#943d20',
  door: '#6b4020',

  // Edificios bloqueados (futuros agentes)
  locked: '#555568',
  lockedRoof: '#484860',
  lockedDoor: '#3c3c50',

  // UI
  panel: '#10102a',
  panelBorder: '#252555',
  text: '#d0c090',
  textDim: '#706850',
  accent: '#f0c040',       // dorado
  accentGreen: '#50c878',  // estado online
  accentRed: '#e05040',    // estado pensando
  chatBg: '#12122c',
};

// Función para obtener color de pasto por posición
export function getGrassColor(row, col) {
  const index = (row * 7 + col * 13) % PALETTE.grass.length;
  return PALETTE.grass[index];
}

// Función para obtener color de hojas de árbol por posición
export function getTreeLeavesColor(row, col) {
  const index = (row * 11 + col * 17) % PALETTE.treeLeaves.length;
  return PALETTE.treeLeaves[index];
}

// Función para determinar si un tile tiene brizna de pasto
export function hasGrassBlade(row, col) {
  return (row * 31 + col * 47) % 7 === 0;
}

// Función para posición pseudo-random de piedra en camino
export function getStonePosition(row, col) {
  const x = ((row * 23 + col * 41) % 15) + 3;
  const y = ((row * 19 + col * 37) % 12) + 6;
  return { x, y };
}
