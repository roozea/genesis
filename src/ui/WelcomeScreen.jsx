// GENESIS — Pantalla inicial del chat
import { PALETTE } from '../config/palette';

export default function WelcomeScreen() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 24,
        textAlign: 'center',
        fontFamily: '"Press Start 2P", monospace',
      }}
    >
      {/* Avatar de Arq */}
      <div
        style={{
          width: 48,
          height: 48,
          backgroundColor: PALETTE.panel,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: 20,
          border: `2px solid ${PALETTE.accent}`,
          boxShadow: `0 0 20px rgba(240, 192, 64, 0.3)`,
        }}
      >
        🏗️
      </div>

      {/* Título */}
      <h2
        style={{
          color: PALETTE.accent,
          fontSize: 14,
          marginBottom: 12,
          fontWeight: 'normal',
        }}
      >
        Arq
      </h2>

      {/* Subtítulo */}
      <p
        style={{
          color: PALETTE.textDim,
          fontSize: 8,
          marginBottom: 20,
          lineHeight: 1.8,
        }}
      >
        El Arquitecto
      </p>

      {/* Descripción */}
      <p
        style={{
          color: PALETTE.text,
          fontSize: 8,
          lineHeight: 2,
          maxWidth: 280,
        }}
      >
        Soy el primer agente de Genesis.
        <br />
        Estoy aquí para ayudarte a
        <br />
        construir este mundo.
      </p>

      {/* Instrucciones */}
      <div
        style={{
          marginTop: 24,
          padding: '12px 16px',
          backgroundColor: PALETTE.panel,
          borderRadius: 8,
          border: `1px solid ${PALETTE.panelBorder}`,
        }}
      >
        <p
          style={{
            color: PALETTE.textDim,
            fontSize: 7,
            lineHeight: 1.8,
          }}
        >
          Escribe algo para empezar...
        </p>
      </div>

      {/* Indicador de online */}
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: PALETTE.accentGreen,
            animation: 'pulse 2s infinite',
          }}
        />
        <span style={{ color: PALETTE.accentGreen }}>en línea</span>
      </div>
    </div>
  );
}
