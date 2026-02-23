// GENESIS — Renderiza el grid de tiles del mapa
import { MAP } from './mapData';
import Tile from './Tile';
import AgentSprite from '../agents/AgentSprite';
import { PALETTE } from '../config/palette';

const TILE_SIZE = 24;

export default function GameMap({ agent, thought, thoughtType, timeFilter, workProgress, floatingRewards }) {
  // Filtro de tiempo (día/noche)
  const filter = timeFilter || { filter: 'none', backgroundColor: 'transparent', overlay: 'none' };

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Contenedor del mapa con filtro de tiempo */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${MAP[0].length}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${MAP.length}, ${TILE_SIZE}px)`,
          backgroundColor: PALETTE.bg,
          boxShadow: `0 0 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)`,
          filter: filter.filter,
          transition: 'filter 2s ease-in-out',
        }}
      >
        {/* Render de tiles */}
        {MAP.map((row, rowIndex) =>
          row.map((tileType, colIndex) => (
            <Tile
              key={`${rowIndex}-${colIndex}`}
              type={tileType}
              row={rowIndex}
              col={colIndex}
            />
          ))
        )}

        {/* Agente superpuesto */}
        {agent && (
          <AgentSprite
            row={agent.row}
            col={agent.col}
            direction={agent.direction}
            state={agent.state}
            thought={thought}
            thoughtType={thoughtType}
            tileSize={TILE_SIZE}
            workProgress={workProgress}
            floatingRewards={floatingRewards}
          />
        )}
      </div>

      {/* Overlay de color según hora del día */}
      {filter.overlay !== 'none' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: filter.overlay,
            pointerEvents: 'none',
            transition: 'background 2s ease-in-out',
          }}
        />
      )}

      {/* Capa de color ambiente */}
      {filter.backgroundColor !== 'transparent' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: filter.backgroundColor,
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
            transition: 'background-color 2s ease-in-out',
          }}
        />
      )}
    </div>
  );
}
