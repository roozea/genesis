// GENESIS — Componente individual de tile con renderizado detallado
import { PALETTE, getGrassColor, getTreeLeavesColor, hasGrassBlade, getStonePosition } from '../config/palette';

const TILE_SIZE = 24;

export default function Tile({ type, row, col }) {
  const baseStyle = {
    width: TILE_SIZE,
    height: TILE_SIZE,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  switch (type) {
    case 'grass':
      return <GrassTile row={row} col={col} style={baseStyle} />;
    case 'tree':
      return <TreeTile row={row} col={col} style={baseStyle} />;
    case 'path':
      return <PathTile row={row} col={col} style={baseStyle} />;
    case 'water':
      return <WaterTile row={row} col={col} style={baseStyle} />;
    case 'wall':
      return <WallTile row={row} col={col} style={baseStyle} />;
    case 'roof':
      return <RoofTile row={row} col={col} style={baseStyle} />;
    case 'door':
      return <DoorTile row={row} col={col} style={baseStyle} locked={false} />;
    case 'lockedWall':
      return <WallTile row={row} col={col} style={baseStyle} locked />;
    case 'lockedRoof':
      return <RoofTile row={row} col={col} style={baseStyle} locked />;
    case 'lockedDoor':
      return <DoorTile row={row} col={col} style={baseStyle} locked />;
    case 'flowers':
      return <FlowersTile row={row} col={col} style={baseStyle} />;
    case 'bridge':
      return <BridgeTile row={row} col={col} style={baseStyle} />;
    // Tiles de proyectos construidos
    case 'workbench':
      return <WorkbenchTile row={row} col={col} style={baseStyle} />;
    case 'dock':
      return <DockTile row={row} col={col} style={baseStyle} />;
    case 'signpost':
      return <SignpostTile row={row} col={col} style={baseStyle} />;
    case 'door_cracked':
      return <DoorCrackedTile row={row} col={col} style={baseStyle} />;
    default:
      return <div style={{ ...baseStyle, backgroundColor: PALETTE.bg }} />;
  }
}

// Tile de pasto con variación de color y ocasional brizna
function GrassTile({ row, col, style }) {
  const bgColor = getGrassColor(row, col);
  const showBlade = hasGrassBlade(row, col);

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {showBlade && (
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 6,
            backgroundColor: '#3a5c40',
            left: 10 + ((row * 13 + col * 7) % 8),
            bottom: 2,
            transform: 'rotate(-8deg)',
            transformOrigin: 'bottom center',
            animation: 'grassSway 3s ease-in-out infinite',
            animationDelay: `${(row + col) * 0.1}s`,
          }}
        />
      )}
      {/* Textura sutil */}
      <div
        style={{
          position: 'absolute',
          width: 3,
          height: 2,
          backgroundColor: 'rgba(0,0,0,0.1)',
          left: (row * 17 + col * 23) % 18,
          top: (row * 11 + col * 19) % 16,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

// Tile de árbol con tronco y copa
function TreeTile({ row, col, style }) {
  const bgColor = getGrassColor(row, col);
  const leavesColor = getTreeLeavesColor(row, col);

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {/* Tronco */}
      <div
        style={{
          position: 'absolute',
          width: 4,
          height: 7,
          backgroundColor: PALETTE.treeTrunk,
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          borderRadius: '1px 1px 0 0',
        }}
      />
      {/* Copa del árbol */}
      <div
        style={{
          position: 'absolute',
          width: 16,
          height: 14,
          backgroundColor: leavesColor,
          left: '50%',
          transform: 'translateX(-50%)',
          top: 2,
          borderRadius: '50% 50% 35% 35%',
          boxShadow: `inset -3px -3px 6px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1)`,
        }}
      />
    </div>
  );
}

// Tile de camino con dos tonos alternados y piedras
function PathTile({ row, col, style }) {
  const isAlt = (row + col) % 2 === 0;
  const bgColor = isAlt ? PALETTE.path : PALETTE.pathAlt;
  const stonePos = getStonePosition(row, col);
  const showStone = (row * 29 + col * 31) % 5 === 0;

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {showStone && (
        <div
          style={{
            position: 'absolute',
            width: 3,
            height: 2,
            backgroundColor: 'rgba(0,0,0,0.15)',
            left: stonePos.x,
            top: stonePos.y,
            borderRadius: 1,
          }}
        />
      )}
      {/* Línea de borde sutil */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
}

// Tile de agua con animación shimmer y reflejos
function WaterTile({ row, col, style }) {
  const isDeep = (row + col) % 2 === 0;
  const bgColor = isDeep ? PALETTE.waterDeep : PALETTE.water;

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {/* Reflejo horizontal */}
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 2,
          backgroundColor: PALETTE.waterLight,
          opacity: 0.25,
          left: 4 + ((row * 7 + col * 11) % 10),
          top: 8 + ((row * 5 + col * 9) % 8),
          borderRadius: 1,
          animation: 'waterShimmer 2.5s ease-in-out infinite',
          animationDelay: `${(row + col) * 0.2}s`,
        }}
      />
      {/* Segundo reflejo más pequeño */}
      <div
        style={{
          position: 'absolute',
          width: 4,
          height: 1,
          backgroundColor: PALETTE.waterLight,
          opacity: 0.2,
          left: 12 + ((row * 13 + col * 17) % 6),
          top: 16 + ((row * 3 + col * 7) % 4),
          borderRadius: 1,
          animation: 'waterReflection 3s ease-in-out infinite',
          animationDelay: `${(row * col) * 0.15}s`,
        }}
      />
    </div>
  );
}

// Tile de pared de edificio
function WallTile({ row, col, style, locked = false }) {
  const wallColor = locked ? PALETTE.locked : PALETTE.wall;
  const shadowColor = locked ? '#444455' : PALETTE.wallShadow;

  return (
    <div
      style={{
        ...style,
        backgroundColor: wallColor,
        borderRight: `2px solid ${shadowColor}`,
        borderBottom: `2px solid ${shadowColor}`,
        opacity: locked ? 0.8 : 1,
      }}
    >
      {/* Ladrillos simulados */}
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 4,
          backgroundColor: 'rgba(0,0,0,0.08)',
          left: 2,
          top: 4,
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 4,
          backgroundColor: 'rgba(0,0,0,0.08)',
          right: 4,
          top: 14,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

// Tile de techo
function RoofTile({ row, col, style, locked = false }) {
  const roofColor = locked ? PALETTE.lockedRoof : PALETTE.roof;
  const shadowColor = locked ? '#3a3a4a' : PALETTE.roofShadow;

  return (
    <div
      style={{
        ...style,
        backgroundColor: roofColor,
        borderBottom: `2px solid ${shadowColor}`,
        opacity: locked ? 0.8 : 1,
      }}
    >
      {/* Línea de reflejo sutil */}
      <div
        style={{
          position: 'absolute',
          width: 16,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.15)',
          left: 4,
          top: 6,
        }}
      />
    </div>
  );
}

// Tile de puerta
function DoorTile({ row, col, style, locked = false }) {
  const wallColor = locked ? PALETTE.locked : PALETTE.wall;
  const doorColor = locked ? PALETTE.lockedDoor : PALETTE.door;

  return (
    <div
      style={{
        ...style,
        backgroundColor: wallColor,
        opacity: locked ? 0.8 : 1,
      }}
    >
      {/* Marco de la puerta */}
      <div
        style={{
          position: 'absolute',
          width: 12,
          height: 16,
          backgroundColor: doorColor,
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          borderRadius: '3px 3px 0 0',
        }}
      >
        {locked ? (
          // Emoji de candado (único emoji permitido en el mapa)
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            🔒
          </div>
        ) : (
          // Perilla dorada
          <div
            style={{
              position: 'absolute',
              width: 3,
              height: 3,
              backgroundColor: PALETTE.accent,
              borderRadius: '50%',
              right: 2,
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: `0 0 2px 1px rgba(240, 192, 64, 0.4)`,
              animation: 'doorKnobGlow 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

// Tile de flores
function FlowersTile({ row, col, style }) {
  const bgColor = getGrassColor(row, col);

  // Colores de flores variados por posición
  const flowerColors = ['#e05080', '#f0c040', '#8050c0', '#50a0e0', '#e07030'];
  const color1 = flowerColors[(row * 7 + col * 3) % flowerColors.length];
  const color2 = flowerColors[(row * 11 + col * 5) % flowerColors.length];

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {/* Flor 1 */}
      <div
        style={{
          position: 'absolute',
          width: 5,
          height: 5,
          backgroundColor: color1,
          borderRadius: '50%',
          left: 4 + ((row * 13) % 6),
          top: 6 + ((col * 17) % 8),
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.3)',
        }}
      />
      {/* Flor 2 */}
      <div
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          backgroundColor: color2,
          borderRadius: '50%',
          left: 12 + ((row * 19) % 5),
          top: 12 + ((col * 23) % 6),
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
}

// Tile de puente sobre agua
function BridgeTile({ row, col, style }) {
  return (
    <div style={{ ...style, backgroundColor: PALETTE.waterDeep }}>
      {/* Tablones del puente */}
      <div
        style={{
          position: 'absolute',
          width: 20,
          height: 18,
          backgroundColor: '#7a5030',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: 2,
          boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* Líneas de tablones */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            top: 5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            top: 11,
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// TILES DE PROYECTOS CONSTRUIDOS
// ============================================

// Mesa de trabajo (sobre pared del taller)
function WorkbenchTile({ row, col, style }) {
  return (
    <div style={{ ...style, backgroundColor: PALETTE.wall }}>
      {/* Mesa marrón */}
      <div
        style={{
          position: 'absolute',
          width: 20,
          height: 8,
          backgroundColor: '#8B4513',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 4,
          borderRadius: 2,
          boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.3)',
        }}
      />
      {/* Herramientas sobre la mesa */}
      <div
        style={{
          position: 'absolute',
          width: 4,
          height: 6,
          backgroundColor: '#CD853F',
          left: 6,
          bottom: 12,
          borderRadius: '1px 1px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 3,
          height: 5,
          backgroundColor: '#A0522D',
          left: 14,
          bottom: 12,
          borderRadius: 1,
        }}
      />
      {/* Brillito dorado */}
      <div
        style={{
          position: 'absolute',
          width: 3,
          height: 3,
          backgroundColor: PALETTE.accent,
          borderRadius: '50%',
          right: 5,
          bottom: 14,
          opacity: 0.8,
          animation: 'doorKnobGlow 2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Muelle sobre agua
function DockTile({ row, col, style }) {
  return (
    <div style={{ ...style, backgroundColor: PALETTE.waterDeep }}>
      {/* Tablones horizontales del muelle */}
      <div
        style={{
          position: 'absolute',
          width: 22,
          height: 6,
          backgroundColor: '#8B5A2B',
          left: 1,
          top: 3,
          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 22,
          height: 6,
          backgroundColor: '#A0522D',
          left: 1,
          top: 10,
          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 22,
          height: 5,
          backgroundColor: '#8B5A2B',
          left: 1,
          top: 17,
          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)',
        }}
      />
      {/* Líneas entre tablones */}
      <div style={{ position: 'absolute', width: 22, height: 1, backgroundColor: 'rgba(0,0,0,0.3)', left: 1, top: 9 }} />
      <div style={{ position: 'absolute', width: 22, height: 1, backgroundColor: 'rgba(0,0,0,0.3)', left: 1, top: 16 }} />
    </div>
  );
}

// Señales de camino
function SignpostTile({ row, col, style }) {
  const isAlt = (row + col) % 2 === 0;
  const bgColor = isAlt ? PALETTE.path : PALETTE.pathAlt;

  return (
    <div style={{ ...style, backgroundColor: bgColor }}>
      {/* Poste */}
      <div
        style={{
          position: 'absolute',
          width: 3,
          height: 18,
          backgroundColor: '#5C4033',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          borderRadius: '1px 1px 0 0',
        }}
      />
      {/* Flecha derecha */}
      <div
        style={{
          position: 'absolute',
          width: 10,
          height: 4,
          backgroundColor: '#8B4513',
          left: 12,
          top: 5,
          clipPath: 'polygon(0% 0%, 70% 0%, 100% 50%, 70% 100%, 0% 100%)',
        }}
      />
      {/* Flecha izquierda */}
      <div
        style={{
          position: 'absolute',
          width: 10,
          height: 4,
          backgroundColor: '#A0522D',
          right: 12,
          top: 11,
          clipPath: 'polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%, 0% 50%)',
        }}
      />
    </div>
  );
}

// Puerta entreabierta con luz
function DoorCrackedTile({ row, col, style }) {
  return (
    <div style={{ ...style, backgroundColor: PALETTE.locked }}>
      {/* Marco de la puerta */}
      <div
        style={{
          position: 'absolute',
          width: 12,
          height: 16,
          backgroundColor: PALETTE.lockedDoor,
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          borderRadius: '3px 3px 0 0',
        }}
      >
        {/* Grieta con luz */}
        <div
          style={{
            position: 'absolute',
            width: 3,
            height: '100%',
            background: 'linear-gradient(to right, #FFD700, #FFA500, transparent)',
            right: 0,
            top: 0,
            animation: 'doorKnobGlow 1.5s ease-in-out infinite',
            boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.5)',
          }}
        />
        {/* Resplandor exterior */}
        <div
          style={{
            position: 'absolute',
            width: 6,
            height: '100%',
            background: 'radial-gradient(ellipse at right, rgba(255,215,0,0.4) 0%, transparent 70%)',
            right: -4,
            top: 0,
          }}
        />
      </div>
    </div>
  );
}
