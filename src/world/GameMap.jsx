// GENESIS — Renderiza el grid de tiles del mapa
import { useMemo } from 'react';
import { MAP } from './mapData';
import Tile from './Tile';
import AgentSprite from '../agents/AgentSprite';
import { PALETTE } from '../config/palette';
import { getWorldChanges } from '../agents/projects';

const TILE_SIZE = 24;

export default function GameMap({ agent, thought, thoughtType, timeFilter, workProgress, floatingRewards, worldChangesVersion = 0 }) {
  // Filtro de tiempo (día/noche)
  const filter = timeFilter || { filter: 'none', backgroundColor: 'transparent', overlay: 'none' };

  // Aplicar cambios del mundo (tiles de proyectos completados)
  // Se recalcula cuando worldChangesVersion cambia (al completar un proyecto)
  const mapWithChanges = useMemo(() => {
    const worldChanges = getWorldChanges();
    if (worldChanges.length === 0) return MAP;

    // Crear copia del mapa
    const newMap = MAP.map(row => [...row]);

    // Aplicar cambios
    worldChanges.forEach(change => {
      if (change.r >= 0 && change.r < newMap.length &&
          change.c >= 0 && change.c < newMap[0].length) {
        newMap[change.r][change.c] = change.type;
      }
    });

    return newMap;
  }, [worldChangesVersion]); // Se recalcula cuando se completa un proyecto

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
          gridTemplateColumns: `repeat(${mapWithChanges[0].length}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${mapWithChanges.length}, ${TILE_SIZE}px)`,
          backgroundColor: PALETTE.bg,
          boxShadow: `0 0 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)`,
          filter: filter.filter,
          transition: 'filter 2s ease-in-out',
        }}
      >
        {/* Render de tiles */}
        {mapWithChanges.map((row, rowIndex) =>
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
