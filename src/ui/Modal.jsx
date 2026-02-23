// GENESIS — Componente Modal reutilizable
import { useEffect } from 'react';
import { PALETTE } from '../config/palette';

export default function Modal({ isOpen, onClose, title, icon, children }) {
  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#10102a',
          border: '1px solid #252555',
          borderRadius: 8,
          maxWidth: 420,
          width: '90%',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Press Start 2P", monospace',
          animation: 'scaleIn 0.2s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #252555',
            backgroundColor: '#151535',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
            <span style={{ fontSize: 9, color: PALETTE.accent }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: PALETTE.textDim,
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#ff4040';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = PALETTE.textDim;
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 16,
            overflowY: 'auto',
            fontSize: 8,
            color: PALETTE.text,
            lineHeight: 1.6,
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Sección dentro del modal
export function ModalSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 7,
          color: PALETTE.textDim,
          marginBottom: 8,
          borderBottom: '1px solid #252555',
          paddingBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// Item de lista en el modal
export function ModalItem({ emoji, label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
      }}
    >
      {emoji && <span style={{ fontSize: 10 }}>{emoji}</span>}
      <span style={{ color: PALETTE.textDim }}>{label}:</span>
      <span style={{ color: color || PALETTE.text }}>{value}</span>
    </div>
  );
}
