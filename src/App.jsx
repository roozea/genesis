// GENESIS — Componente principal de la aplicación
import { useState, useEffect, useCallback, useRef } from 'react';
import { PALETTE } from './config/palette';
import { think } from './config/llm';
import {
  decideNextMove,
  calculatePath,
  getCurrentLocationKey,
  getMovementDirection,
  recordArrival,
  recordConversation,
  recordThought,
  parseIntent,
  processIntent,
} from './agents/brain';
import { buildChatPrompt } from './agents/prompts';
import {
  getStats,
  incrementIaCalls,
  saveLog,
  getLogs,
  retrieveMemories,
  getMemoryCount,
  onMemoryAdded,
} from './agents/memory';
import {
  getWorldState,
  onWorldStateChange,
  setLocation,
  startWalking,
  stopWalking,
  setMood,
  recordAction,
  recordChatExchange,
} from './agents/worldState';
import { LOCATIONS } from './world/locations';
import GameMap from './world/GameMap';
import Header from './ui/Header';
import ActivityLog from './ui/ActivityLog';
import ChatPanel from './ui/ChatPanel';
import './styles/animations.css';

// Posición inicial de Arq (en su taller)
const INITIAL_POSITION = { row: 4, col: 3 };
const MOVE_INTERVAL = 35000; // 35-50 segundos para moverse
const STEP_DELAY = 450; // Delay entre pasos (ms)

export default function App() {
  // Estado del agente
  const [agent, setAgent] = useState({
    row: INITIAL_POSITION.row,
    col: INITIAL_POSITION.col,
    direction: 'right',
    state: 'idle',
  });

  // Estado general
  const [mood, setMoodState] = useState('curious');
  const [thought, setThought] = useState(null);
  const [stats, setStats] = useState(getStats());
  const [logs, setLogs] = useState(getLogs());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastLocations, setLastLocations] = useState([]);

  // Estado del chat
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState('online');

  // Contador de memorias
  const [memoryCount, setMemoryCount] = useState(getMemoryCount());

  // Refs para intervalos
  const moveIntervalRef = useRef(null);
  const isWalkingRef = useRef(false);

  // Ubicación actual
  const currentLocation = getCurrentLocationKey(agent.row, agent.col);

  // Añadir log
  const addLog = useCallback((type, text, emoji = '') => {
    const entry = { type, text, emoji, timestamp: Date.now() };
    saveLog(entry);
    setLogs(prev => [...prev.slice(-49), entry]);
  }, []);

  // Timer de tiempo transcurrido
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Suscribirse a nuevas memorias para actualizar contador y log
  useEffect(() => {
    const unsubscribe = onMemoryAdded((memory) => {
      // Actualizar contador
      setMemoryCount(getMemoryCount());

      // Agregar al Activity Log (solo si no es core memory)
      if (memory.type !== 'core') {
        const truncatedContent = memory.content.length > 35
          ? memory.content.slice(0, 35) + '...'
          : memory.content;
        addLog('memory', `${truncatedContent} (imp: ${memory.importance})`, '🧠');
      }
    });
    return unsubscribe;
  }, [addLog]);

  // Caminar paso a paso por el path
  const walkPath = useCallback(async (path, finalThought, startPos, destinationKey) => {
    if (path.length === 0) return;

    isWalkingRef.current = true;
    setAgent(prev => ({ ...prev, state: 'walking' }));

    // Actualizar worldState: empezó a caminar
    startWalking(destinationKey);

    let prevPos = startPos;

    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      const direction = getMovementDirection(prevPos.row, prevPos.col, step.row, step.col);

      setAgent({
        row: step.row,
        col: step.col,
        direction,
        state: 'walking',
      });

      prevPos = step;
      await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    }

    // Llegó al destino
    setAgent(prev => ({ ...prev, state: 'idle' }));
    isWalkingRef.current = false;

    // Actualizar worldState: llegó al destino
    stopWalking();
    setLocation(destinationKey);

    // Registrar llegada en memoria
    if (destinationKey) {
      recordArrival(destinationKey);
      const destName = LOCATIONS[destinationKey]?.name || destinationKey;
      recordAction('arrival', `Llegué a ${destName}`);
    }

    // Mostrar thought bubble y guardarlo como memoria
    if (finalThought) {
      setThought(finalThought);
      // Guardar el pensamiento como memoria
      recordThought(finalThought, destinationKey);
      setTimeout(() => setThought(null), 4000);
    }
  }, []);

  // Decidir próximo movimiento con IA
  const makeDecision = useCallback(async () => {
    if (isWalkingRef.current) return;

    const lastChatMessage = messages.length > 0 ? messages[messages.length - 1]?.content : '';

    try {
      addLog('system', 'Arq está pensando...', '🧠');
      const decision = await decideNextMove(currentLocation, lastLocations, mood, lastChatMessage);

      if (!decision) {
        addLog('fallback', 'Sin destino válido', '❌');
        return;
      }

      // Incrementar contador IA (solo si es decisión de IA, no de chat o explore)
      if (decision.source !== 'fallback' && decision.source !== 'chat-request' && decision.source !== 'explore-mode') {
        const newIaCalls = incrementIaCalls();
        setStats(prev => ({ ...prev, iaCalls: newIaCalls }));
      }

      // Calcular camino
      const targetLocation = LOCATIONS[decision.destination];
      if (!targetLocation) return;

      const path = calculatePath(agent.row, agent.col, decision.destination);

      if (path.length === 0) {
        addLog('bfs', `Ya en ${targetLocation.name}`, '📍');
        return;
      }

      // Log con la fuente correcta
      const sourceLabel = decision.source === 'chat-request' ? 'chat'
        : decision.source === 'explore-mode' ? 'explore'
        : decision.source;
      addLog(sourceLabel, `Yendo a ${targetLocation.name}`, targetLocation.emoji);
      addLog('bfs', `Camino: ${path.length} pasos`, '🗺️');

      // Actualizar mood (tanto local como worldState)
      setMoodState(decision.mood);
      setMood(decision.mood);

      // Actualizar últimas ubicaciones
      setLastLocations(prev => [...prev.slice(-3), currentLocation]);

      // Registrar acción en worldState
      recordAction('movement', `Voy a ${targetLocation.name}`);

      // Caminar (pasando el destinationKey para registrar llegada)
      await walkPath(path, decision.thought, { row: agent.row, col: agent.col }, decision.destination);

    } catch (error) {
      console.error('[App] Error en decisión:', error);
      addLog('fallback', 'Error de conexión', '⚠️');
    }
  }, [agent.row, agent.col, currentLocation, lastLocations, mood, messages, addLog, walkPath]);

  // Intervalo de movimiento autónomo
  useEffect(() => {
    // Primera decisión después de 5 segundos
    const initialTimeout = setTimeout(() => {
      makeDecision();
    }, 5000);

    // Luego cada 35-50 segundos
    moveIntervalRef.current = setInterval(() => {
      const randomDelay = Math.random() * 15000; // 0-15s extra
      setTimeout(makeDecision, randomDelay);
    }, MOVE_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(moveIntervalRef.current);
    };
  }, [makeDecision]);

  // Enviar mensaje al chat
  const handleSendMessage = useCallback(async (text) => {
    // Agregar mensaje del usuario
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setAgentStatus('thinking');
    addLog('chat', `Rodrigo: ${text.slice(0, 30)}...`, '💬');

    try {
      // Obtener estado del mundo actual (CONTEXTO VIVO)
      const worldState = getWorldState();

      // Recuperar memorias relevantes basadas en lo que preguntó el usuario
      const relevantMemories = retrieveMemories(text, 5);

      // Construir prompt con CONTEXTO VIVO del worldState
      const systemPrompt = buildChatPrompt(worldState, relevantMemories);

      const result = await think(systemPrompt, text, 'chat');

      // Manejar fallback (mensaje en personaje - Arq no sabe qué es "conexión")
      if (result.source === 'fallback' || !result.response) {
        const fallbackMessages = [
          '*revisa sus circuitos* Algo no funciona... mis pensamientos están lentos hoy 🔧',
          '*parpadea confundido* Hmm, mi mente está nublada. Dame un momento...',
          '*se rasca el casco* No logro concentrarme. Debe ser el clima de Genesis 🌀',
        ];
        const randomMsg = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        const errorMessage = { role: 'assistant', content: randomMsg };
        setMessages(prev => [...prev, errorMessage]);
        addLog('fallback', 'Arq está confundido', '🔧');
        setIsLoading(false);
        setAgentStatus('online');
        return;
      }

      // Incrementar contador IA
      const newIaCalls = incrementIaCalls();
      setStats(prev => ({ ...prev, iaCalls: newIaCalls }));

      // Agregar respuesta
      const assistantMessage = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);

      // Log con la fuente correcta (local, haiku, sonnet)
      addLog(result.source, `Arq: ${result.response.slice(0, 30)}...`, '🏗️');

      // Guardar memoria de conversación
      recordConversation(text, result.response, currentLocation);

      // Registrar en worldState
      recordChatExchange(text, result.response, 'conversación');

      // DETECTAR INTENCIÓN y afectar al mundo
      const intent = parseIntent(text);
      if (intent.type !== 'chat') {
        const processed = processIntent(intent, currentLocation);
        if (processed) {
          if (intent.type === 'go_to') {
            const destName = LOCATIONS[intent.destination]?.name || intent.destination;
            addLog('system', `Destino forzado: ${destName} (por chat)`, '📍');
          } else if (intent.type === 'explore') {
            addLog('system', 'Modo exploración activado (por chat)', '🔍');
          }
        }
      }

      // Cambiar estado del agente brevemente
      setAgent(prev => ({ ...prev, state: 'talking' }));
      setTimeout(() => {
        setAgent(prev => ({ ...prev, state: 'idle' }));
      }, 2000);

    } catch (error) {
      console.error('[App] Error en chat:', error);
      const errorMessage = { role: 'assistant', content: '*se frota las sienes* Perdí el hilo... ¿qué decías? 🤔' };
      setMessages(prev => [...prev, errorMessage]);
      addLog('fallback', 'Arq perdió concentración', '🔧');
    }

    setIsLoading(false);
    setAgentStatus('online');
  }, [currentLocation, addLog]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: PALETTE.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header con stats */}
      <Header
        level={stats.level}
        xp={stats.xp}
        mood={mood}
        location={currentLocation}
        iaCalls={stats.iaCalls}
        elapsedTime={elapsedTime}
        memoryCount={memoryCount}
      />

      {/* Contenido principal */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 16,
          padding: 16,
        }}
      >
        {/* Columna izquierda: Mapa + Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mapa */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 16,
              backgroundColor: PALETTE.panel,
              borderRadius: 8,
              border: `1px solid ${PALETTE.panelBorder}`,
            }}
          >
            <GameMap agent={agent} thought={thought} />
          </div>

          {/* Log de actividad */}
          <ActivityLog logs={logs} />
        </div>

        {/* Columna derecha: Chat */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          agentStatus={agentStatus}
        />
      </main>
    </div>
  );
}
