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
  shouldCancelPath,
  clearCancelFlag,
  forceDestination,
} from './agents/worldState';
import {
  tick as reflectionTick,
  onNewMemory,
  onChatMessage,
  setThoughtBubbleCallback,
} from './agents/reflectionManager';
import {
  onTimeChange,
  getTimeState,
  getTimeBehavior,
  isNight,
} from './world/timeSystem';
import {
  parseTaskIntent,
  createTask,
  getActiveTask,
  processTask,
  approveTask,
  rejectTask,
  reworkTask,
  formatDeliverable,
  getConfirmationMessage,
  getRewardMessage,
  getResources,
  onTaskStateChange,
  TASK_TYPES,
} from './agents/taskSystem';
import { LOCATIONS } from './world/locations';
import GameMap from './world/GameMap';
import Header from './ui/Header';
import ActivityLog from './ui/ActivityLog';
import ChatPanel from './ui/ChatPanel';
import BrainPanel from './ui/BrainPanel';
import './styles/animations.css';

// Posición inicial de Arq (en su taller)
const INITIAL_POSITION = { row: 4, col: 3 };
const MOVE_INTERVAL = 35000; // 35-50 segundos para moverse
const BASE_STEP_DELAY = 450; // Delay base entre pasos (ms)

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
  const [workStep, setWorkStep] = useState(null); // { text, current, total }

  // Contador de memorias
  const [memoryCount, setMemoryCount] = useState(getMemoryCount());

  // Panel de cerebro
  const [isBrainPanelOpen, setIsBrainPanelOpen] = useState(false);

  // Tipo de thought (micro, medium, deep)
  const [thoughtType, setThoughtType] = useState(null);

  // Sistema de tiempo Genesis (día/noche)
  const [genesisTime, setGenesisTime] = useState(getTimeState());

  // Recursos de trabajo
  const [resources, setResources] = useState(getResources());

  // Estado visual de trabajo
  const [workProgress, setWorkProgress] = useState(null); // null = no working, 0-100 = progress
  const [floatingRewards, setFloatingRewards] = useState(null); // { knowledge, materials, inspiration }

  // Cola de destino forzado (para cuando está trabajando)
  const queuedDestinationRef = useRef(null);

  // Refs para intervalos
  const moveIntervalRef = useRef(null);
  const isWalkingRef = useRef(false);
  const isGoingHomeRef = useRef(false); // Para evitar múltiples "ir a casa"
  const lastNightThoughtRef = useRef(0); // Para no spamear thoughts nocturnos

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

      // Notificar al reflectionManager para acumular importancia
      onNewMemory(memory);

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

  // Sistema de reflexiones - tick cada segundo
  useEffect(() => {
    // Callback para thought bubbles de reflexiones
    setThoughtBubbleCallback((text, type) => {
      setThought(text);
      setThoughtType(type);

      // Log según tipo
      const emoji = type === 'deep' ? '🌟' : type === 'medium' ? '💡' : '💭';
      const label = type === 'deep' ? 'deep' : type === 'medium' ? 'medium' : 'micro';
      addLog(label, text.slice(0, 35) + '...', emoji);

      // Duración según tipo (más tiempo para reflexiones profundas)
      const duration = type === 'deep' ? 6000 : type === 'medium' ? 5000 : 4000;
      setTimeout(() => {
        setThought(null);
        setThoughtType(null);
      }, duration);
    });

    // Tick del sistema de reflexiones cada segundo
    const reflectionInterval = setInterval(() => {
      reflectionTick();
    }, 1000);

    return () => {
      clearInterval(reflectionInterval);
      setThoughtBubbleCallback(null);
    };
  }, [addLog]);

  // Sistema de tiempo Genesis - día/noche
  useEffect(() => {
    const unsubscribe = onTimeChange((timeState) => {
      setGenesisTime(timeState);
    });
    return unsubscribe;
  }, []);

  // Sistema de tareas - suscribirse a cambios de recursos
  useEffect(() => {
    const unsubscribe = onTaskStateChange((taskState) => {
      setResources(taskState.resources);
    });
    return unsubscribe;
  }, []);

  // Caminar paso a paso por el path
  // Retorna true si completó, false si fue cancelado
  const walkPath = useCallback(async (path, finalThought, startPos, destinationKey) => {
    if (path.length === 0) return true;

    isWalkingRef.current = true;
    setAgent(prev => ({ ...prev, state: 'walking' }));

    // Actualizar worldState: empezó a caminar
    startWalking(destinationKey);

    let prevPos = startPos;
    let wasCancelled = false;

    for (let i = 0; i < path.length; i++) {
      // CRÍTICO: Revisar si hay que cancelar la caminata
      if (shouldCancelPath()) {
        console.log('[WALK] Caminata cancelada en paso', i, 'de', path.length);
        wasCancelled = true;
        clearCancelFlag();
        break;
      }

      const step = path[i];
      const direction = getMovementDirection(prevPos.row, prevPos.col, step.row, step.col);

      setAgent({
        row: step.row,
        col: step.col,
        direction,
        state: 'walking',
      });

      prevPos = step;

      // Velocidad ajustada según hora del día
      const behavior = getTimeBehavior();
      const stepDelay = Math.round(BASE_STEP_DELAY / behavior.speedMultiplier);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    // Terminar caminata (ya sea por llegar o por cancelación)
    setAgent(prev => ({ ...prev, state: 'idle' }));
    isWalkingRef.current = false;
    stopWalking();

    // Si fue cancelado, no registrar llegada
    if (wasCancelled) {
      // Actualizar ubicación a donde quedó (prevPos)
      const currentLoc = getCurrentLocationKey(prevPos.row, prevPos.col);
      setLocation(currentLoc);
      addLog('system', 'Caminata interrumpida', '⚡');
      return false;
    }

    // Llegó al destino normalmente
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
      recordThought(finalThought, destinationKey);
      setTimeout(() => setThought(null), 4000);
    }

    return true;
  }, [addLog]);

  // Decidir próximo movimiento con IA
  const makeDecision = useCallback(async () => {
    const worldState = getWorldState();
    const timeBehavior = getTimeBehavior();

    // Si hay forcedDestination, esperar a que termine la caminata actual
    // (el flag cancelCurrentPath ya habrá sido seteado)
    if (isWalkingRef.current) {
      // Si hay destino forzado, esperar un poco y reintentar
      if (worldState.forcedDestination) {
        console.log('[APP] Esperando que termine caminata para forzar destino...');
        setTimeout(() => makeDecision(), 200);
        return;
      }
      // Si no hay destino forzado, simplemente salir
      return;
    }

    // COMPORTAMIENTO NOCTURNO: Arq debe volver al taller y quedarse idle
    if (timeBehavior.shouldGoHome) {
      // Si ya está en el taller, quedarse idle
      if (currentLocation === 'workshop') {
        // Mostrar thought de descanso (máximo cada 60 segundos)
        const now = Date.now();
        if (now - lastNightThoughtRef.current > 60000) {
          lastNightThoughtRef.current = now;
          const nightThoughts = [
            'Hora de descansar... 🌙',
            'El taller es acogedor de noche... 💤',
            'Mañana seguiré explorando... 🌟',
            'Genesis duerme, yo también... 🌙',
          ];
          const randomThought = nightThoughts[Math.floor(Math.random() * nightThoughts.length)];
          setThought(randomThought);
          setThoughtType('night');
          setTimeout(() => {
            setThought(null);
            setThoughtType(null);
          }, 5000);
          addLog('night', randomThought, '🌙');
        }
        isGoingHomeRef.current = false;
        return; // No hacer nada más de noche
      }

      // Si no está en el taller, ir hacia allá
      if (!isGoingHomeRef.current) {
        isGoingHomeRef.current = true;
        addLog('night', 'Es de noche, volviendo al taller...', '🌙');

        const path = calculatePath(agent.row, agent.col, 'workshop');
        if (path.length > 0) {
          setMoodState('sleepy');
          setMood('sleepy');
          await walkPath(path, 'Hora de descansar... 🌙', { row: agent.row, col: agent.col }, 'workshop');
        }
        isGoingHomeRef.current = false;
        return;
      }
      return;
    }

    // Reset del flag de ir a casa cuando no es de noche
    isGoingHomeRef.current = false;

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

  // Handler para aprobar tarea desde botón del chat
  const handleApproveTask = useCallback(() => {
    const approvedTask = approveTask();
    if (approvedTask) {
      // Actualizar el status del deliverable en los mensajes
      setMessages(prev => prev.map(msg =>
        msg.type === 'deliverable' && msg.deliverable?.status === 'review'
          ? { ...msg, deliverable: { ...msg.deliverable, status: 'approved' } }
          : msg
      ));

      // Mostrar recursos flotantes
      setFloatingRewards(approvedTask.reward);

      // Animación de celebración
      setAgent(prev => ({ ...prev, state: 'celebrating' }));

      const rewardMsg = getRewardMessage(approvedTask);
      setMessages(prev => [...prev, { role: 'assistant', content: rewardMsg, timestamp: Date.now() }]);
      addLog('task', `Aprobado: 📚+${approvedTask.reward.knowledge} 🪨+${approvedTask.reward.materials} ✨+${approvedTask.reward.inspiration}`, '👍');

      // Limpiar después de la animación
      setTimeout(() => {
        setFloatingRewards(null);
        setAgent(prev => ({ ...prev, state: 'idle' }));

        // Procesar destino en cola si hay uno
        if (queuedDestinationRef.current) {
          const queued = queuedDestinationRef.current;
          queuedDestinationRef.current = null;
          forceDestination(queued.destination, queued.reason);
          addLog('system', `Ahora voy a ${queued.destination}`, '📍');
          setTimeout(() => makeDecision(), 100);
        }
      }, 2000);
    }
  }, [addLog, makeDecision]);

  // Handler para rechazar tarea desde botón del chat
  const handleRejectTask = useCallback(async () => {
    // Actualizar el status del deliverable anterior
    setMessages(prev => prev.map(msg =>
      msg.type === 'deliverable' && msg.deliverable?.status === 'review'
        ? { ...msg, deliverable: { ...msg.deliverable, status: 'reworking' } }
        : msg
    ));

    // Animación de rascarse la cabeza
    setAgent(prev => ({ ...prev, state: 'scratching' }));

    rejectTask('Mejorar el resultado');
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Entendido, lo mejoro. Dame un momento... 🔧',
      timestamp: Date.now(),
    }]);
    addLog('task', 'Retrabajando...', '🔄');

    // Delay para mostrar animación de scratching
    await new Promise(resolve => setTimeout(resolve, 800));

    setAgent(prev => ({ ...prev, state: 'building' }));
    setAgentStatus('working');
    setWorkProgress(0);
    setWorkStep({ text: 'Mejorando...', current: 1, total: 1 });

    await reworkTask((step, current, total) => {
      const progress = total ? Math.round(((current + 1) / total) * 100) : 50;
      setWorkProgress(progress);
      setWorkStep({ text: step, current: current + 1, total: total || 1 });
      setThought(step);
      setThoughtType('work');
      addLog('work', step, '⚙️');
    });

    setThought(null);
    setThoughtType(null);
    setWorkProgress(null);
    setWorkStep(null);

    // Mostrar nuevo resultado
    setAgent(prev => ({ ...prev, state: 'delivering' }));

    const activeTask = getActiveTask();
    if (activeTask && activeTask.deliverable) {
      const deliverableMsg = {
        type: 'deliverable',
        timestamp: Date.now(),
        deliverable: {
          type: activeTask.type,
          title: activeTask.title + ' (mejorado)',
          content: activeTask.deliverable.content,
          stats: { time: Math.round((activeTask.completedAt - activeTask.createdAt) / 1000) },
          reward: activeTask.reward,
          status: 'review',
        },
      };
      setMessages(prev => [...prev, deliverableMsg]);
    }

    setTimeout(() => {
      setAgent(prev => ({ ...prev, state: 'idle' }));
    }, 500);

    setAgentStatus('online');
  }, [addLog]);

  // Enviar mensaje al chat
  const handleSendMessage = useCallback(async (text) => {
    // Agregar mensaje del usuario con timestamp
    const userMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setAgentStatus('thinking');
    addLog('chat', `Rodrigo: ${text.slice(0, 30)}...`, '💬');

    try {
      // ═══ DETECTAR INTENCIÓN DE TAREA ═══
      const taskIntent = parseTaskIntent(text);
      console.log('[APP] Task intent:', taskIntent);

      // ═══ NUEVA TAREA ═══
      if (taskIntent.type === 'new_task') {
        const confirmMsg = getConfirmationMessage(taskIntent);
        setMessages(prev => [...prev, { role: 'assistant', content: confirmMsg, timestamp: Date.now() }]);
        addLog('task', `Nueva tarea: ${taskIntent.title}`, TASK_TYPES[taskIntent.taskType].icon);

        // Crear tarea
        const task = createTask(taskIntent);

        // Ir al taller si no está ahí
        if (currentLocation !== 'workshop') {
          forceDestination('workshop', 'Ir al taller a trabajar');
          addLog('system', 'Arq va al taller a trabajar', '🏗️');
          setTimeout(() => makeDecision(), 100);
        }

        // Cambiar estado visual
        setAgent(prev => ({ ...prev, state: 'working' }));
        setAgentStatus('working');
        setMoodState('focused');
        setMood('focused');
        setWorkProgress(0); // Iniciar barra de progreso

        // Procesar tarea (con callbacks para pasos)
        setIsLoading(false); // Permitir que el usuario siga viendo el chat

        await processTask((step, current, total) => {
          const progress = Math.round(((current + 1) / total) * 100);
          setWorkProgress(progress);
          setWorkStep({ text: step, current: current + 1, total }); // Para el indicador del chat
          setThought(`${step} (${current + 1}/${total})`);
          setThoughtType('work'); // Tipo de thought para estilos
          addLog('work', `Paso ${current + 1}/${total}: ${step}`, '⚙️');
        });

        setThought(null);
        setThoughtType(null);
        setWorkProgress(null); // Ocultar barra de progreso
        setWorkStep(null); // Ocultar indicador del chat

        // Mostrar resultado - cambiar a estado delivering (ping)
        setAgent(prev => ({ ...prev, state: 'delivering' }));

        const activeTask = getActiveTask();
        if (activeTask && activeTask.deliverable) {
          // Crear mensaje de deliverable con formato especial
          const deliverableMsg = {
            type: 'deliverable',
            timestamp: Date.now(),
            deliverable: {
              type: activeTask.type,
              title: activeTask.title,
              content: activeTask.deliverable.content,
              stats: { time: Math.round((activeTask.completedAt - activeTask.createdAt) / 1000) },
              reward: activeTask.reward,
              status: 'review',
            },
          };
          setMessages(prev => [...prev, deliverableMsg]);
          addLog('task', 'Tarea completada, esperando review', '✅');
        }

        // Volver a idle después del ping
        setTimeout(() => {
          setAgent(prev => ({ ...prev, state: 'idle' }));
        }, 500);

        setAgentStatus('online');
        return;
      }

      // ═══ APROBAR TAREA ═══
      if (taskIntent.type === 'approve_task') {
        const approvedTask = approveTask();
        if (approvedTask) {
          // Actualizar el status del deliverable en los mensajes
          setMessages(prev => prev.map(msg =>
            msg.type === 'deliverable' && msg.deliverable?.status === 'review'
              ? { ...msg, deliverable: { ...msg.deliverable, status: 'approved' } }
              : msg
          ));

          // Mostrar recursos flotantes
          setFloatingRewards(approvedTask.reward);

          // Animación de celebración (jump)
          setAgent(prev => ({ ...prev, state: 'celebrating' }));

          const rewardMsg = getRewardMessage(approvedTask);
          setMessages(prev => [...prev, { role: 'assistant', content: rewardMsg, timestamp: Date.now() }]);
          addLog('task', `Aprobado: 📚+${approvedTask.reward.knowledge} 🪨+${approvedTask.reward.materials} ✨+${approvedTask.reward.inspiration}`, '👍');

          // Limpiar después de la animación
          setTimeout(() => {
            setFloatingRewards(null);
            setAgent(prev => ({ ...prev, state: 'idle' }));

            // Procesar destino en cola si hay uno
            if (queuedDestinationRef.current) {
              const queued = queuedDestinationRef.current;
              queuedDestinationRef.current = null;
              forceDestination(queued.destination, queued.reason);
              addLog('system', `Ahora voy a ${queued.destination}`, '📍');
              setTimeout(() => makeDecision(), 100);
            }
          }, 2000);

          setIsLoading(false);
          setAgentStatus('online');
          return;
        }
      }

      // ═══ RECHAZAR TAREA ═══
      if (taskIntent.type === 'reject_task') {
        // Actualizar el status del deliverable anterior
        setMessages(prev => prev.map(msg =>
          msg.type === 'deliverable' && msg.deliverable?.status === 'review'
            ? { ...msg, deliverable: { ...msg.deliverable, status: 'reworking' } }
            : msg
        ));

        // Animación de rascarse la cabeza
        setAgent(prev => ({ ...prev, state: 'scratching' }));

        rejectTask(taskIntent.feedback);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Entendido, lo mejoro. ${taskIntent.feedback ? 'Tomo nota de tu feedback.' : ''} Dame un momento... 🔧`,
          timestamp: Date.now(),
        }]);
        addLog('task', 'Retrabajando con feedback...', '🔄');

        // Delay para mostrar animación de scratching
        await new Promise(resolve => setTimeout(resolve, 800));

        setAgent(prev => ({ ...prev, state: 'building' })); // Estado building para retrabajo
        setAgentStatus('working');
        setWorkProgress(0);
        setWorkStep({ text: 'Mejorando...', current: 1, total: 1 });

        await reworkTask((step, current, total) => {
          const progress = total ? Math.round(((current + 1) / total) * 100) : 50;
          setWorkProgress(progress);
          setWorkStep({ text: step, current: current + 1, total: total || 1 });
          setThought(step);
          setThoughtType('work');
          addLog('work', step, '⚙️');
        });

        setThought(null);
        setThoughtType(null);
        setWorkProgress(null);
        setWorkStep(null);

        // Mostrar nuevo resultado con delivering ping
        setAgent(prev => ({ ...prev, state: 'delivering' }));

        const activeTask = getActiveTask();
        if (activeTask && activeTask.deliverable) {
          // Crear nuevo deliverable message
          const deliverableMsg = {
            type: 'deliverable',
            timestamp: Date.now(),
            deliverable: {
              type: activeTask.type,
              title: activeTask.title + ' (mejorado)',
              content: activeTask.deliverable.content,
              stats: { time: Math.round((activeTask.completedAt - activeTask.createdAt) / 1000) },
              reward: activeTask.reward,
              status: 'review',
            },
          };
          setMessages(prev => [...prev, deliverableMsg]);
        }

        setTimeout(() => {
          setAgent(prev => ({ ...prev, state: 'idle' }));
        }, 500);

        setAgentStatus('online');
        setIsLoading(false);
        return;
      }

      // ═══ CHAT NORMAL ═══
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
        const errorMessage = { role: 'assistant', content: randomMsg, timestamp: Date.now() };
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
      const assistantMessage = { role: 'assistant', content: result.response, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);

      // Log con la fuente correcta (local, haiku, sonnet)
      addLog(result.source, `Arq: ${result.response.slice(0, 30)}...`, '🏗️');

      // Guardar memoria de conversación
      recordConversation(text, result.response, currentLocation);

      // Registrar en worldState
      recordChatExchange(text, result.response, 'conversación');

      // Notificar al reflectionManager (para trigger de reflexión profunda)
      onChatMessage();

      // DETECTAR INTENCIÓN DE MOVIMIENTO y afectar al mundo
      const intent = parseIntent(text);
      console.log('[APP] Movement intent:', intent);

      if (intent.type !== 'chat') {
        // Si está trabajando, encolar el destino para después
        const activeTask = getActiveTask();
        if (activeTask && (activeTask.status === 'in_progress' || activeTask.status === 'review')) {
          if (intent.type === 'go_to' && intent.destination) {
            const destName = LOCATIONS[intent.destination]?.name || intent.destination;
            queuedDestinationRef.current = {
              destination: intent.destination,
              reason: `Ir a ${destName} (solicitado durante trabajo)`,
            };
            // No agregar mensaje extra - la respuesta del chat ya fue dada
            addLog('system', `Destino en cola: ${destName} (trabajando)`, '📋');
          }
          // No procesar el intent ahora
        } else {
          const processed = processIntent(intent, currentLocation);
          console.log('[APP] Intent procesado:', processed);

          if (processed) {
            if (processed === 'go_to') {
              const destName = LOCATIONS[intent.destination]?.name || intent.destination;
              addLog('system', `Destino forzado: ${destName} (por chat)`, '📍');

              // CRÍTICO: Triggear decisión INMEDIATA después de un pequeño delay
              // para dar tiempo a que walkPath detecte el cancelCurrentPath
              setTimeout(() => {
                console.log('[APP] Triggeando makeDecision inmediato');
                makeDecision();
              }, 100);

            } else if (processed === 'explore') {
              addLog('system', 'Modo exploración activado (por chat)', '🔍');

              // También triggear decisión inmediata para explorar
              setTimeout(() => {
                console.log('[APP] Triggeando makeDecision para explorar');
                makeDecision();
              }, 100);

            } else if (processed === 'stop') {
              addLog('system', 'Arq se detuvo (por chat)', '⏸️');
            }
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
      const errorMessage = { role: 'assistant', content: '*se frota las sienes* Perdí el hilo... ¿qué decías? 🤔', timestamp: Date.now() };
      setMessages(prev => [...prev, errorMessage]);
      addLog('fallback', 'Arq perdió concentración', '🔧');
    }

    setIsLoading(false);
    setAgentStatus('online');
  }, [currentLocation, addLog, makeDecision]);

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
        onBrainClick={() => setIsBrainPanelOpen(true)}
        genesisTime={genesisTime}
        resources={resources}
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
            <GameMap
                agent={agent}
                thought={thought}
                thoughtType={thoughtType}
                timeFilter={genesisTime.filter}
                workProgress={workProgress}
                floatingRewards={floatingRewards}
              />
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
          workStep={workStep}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
        />
      </main>

      {/* Panel de Cerebro (overlay) */}
      <BrainPanel
        isOpen={isBrainPanelOpen}
        onClose={() => setIsBrainPanelOpen(false)}
      />
    </div>
  );
}
