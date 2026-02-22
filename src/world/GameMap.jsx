// GENESIS — Renderiza el grid de tiles del mapa
import { MAP } from './mapData';
import Tile from './Tile';
import AgentSprite from '../agents/AgentSprite';
import { PALETTE } from '../config/palette';

const TILE_SIZE = 24;

export default function GameMap({ agent, thought }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${MAP[0].length}, ${TILE_SIZE}px)`,
        gridTemplateRows: `repeat(${MAP.length}, ${TILE_SIZE}px)`,
        backgroundColor: PALETTE.bg,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: `0 0 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)`,
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
          tileSize={TILE_SIZE}
        />
      )}
    </div>
  );
}
