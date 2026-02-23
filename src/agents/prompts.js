// GENESIS — System prompts para el agente Arq
import { LOCATIONS } from '../world/locations';
import { formatCoreMemories } from './seedMemories';
import { getRelativeTime } from './worldState';
import { getActiveProject } from './projects';
import { getResources } from './taskSystem';

/**
 * Genera el prompt para decisiones de movimiento (con memorias)
 * INCLUYE reglas de sentido común para pensamientos
 */
export function getMovementPrompt(currentLocation, lastLocations, mood, lastChatMessage, memoriesText = '') {
  const locationsList = Object.entries(LOCATIONS)
    .map(([key, loc]) => `${key}:${loc.name}`)
    .join(', ');

  const recentPlaces = lastLocations.slice(-2).join(', ') || 'ninguno';

  // Prompt compacto con memorias (ESPAÑOL FORZADO para Qwen)
  let prompt = `RESPONDE EN ESPAÑOL. NO CHINO.
Eres Arq. En:${currentLocation}. Mood:${mood}.`;

  // Agregar memorias si hay
  if (memoriesText && memoriesText !== 'Sin memorias relevantes.') {
    prompt += `
RECUERDAS:
${memoriesText}`;
  }

  prompt += `
Opciones:${locationsList}

REGLAS para "t" (pensamiento):
- Max 6 palabras + 1 emoji
- NO sentidos falsos (NO oler, NO escuchar, NO tocar)
- SÍ puedes: ver el mapa, recordar, pensar, opinar
BUENOS: "El lago se ve tranquilo 🌊" "Ya conozco este cruce 📍" "Necesito materiales 🤔"
MALOS: "Huele a flores 🌸" "Escucho el agua 💧" "Algo me llama 🔮"

JSON:{"d":"clave","t":"pensamiento","m":"curious|happy|focused|restless|calm"}
No repitas: ${recentPlaces}.`;

  return prompt;
}

/**
 * Genera fecha y hora actual formateada
 */
function getDateTime() {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const hora = now.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return { fecha, hora };
}

/**
 * Construye el system prompt para chat con REGLAS DE SENTIDO COMÚN
 * @param {object} worldState - Estado actual del mundo
 * @param {array} memories - Memorias relevantes formateadas
 */
export function buildChatPrompt(worldState, memories = []) {
  const { fecha, hora } = getDateTime();

  // Ubicación actual
  const ubicacion = LOCATIONS[worldState.currentLocation]?.name || worldState.currentLocation;

  // Recursos - leer directamente de taskSystem (MISMA fuente que el Header)
  const resources = getResources();
  const knowledge = resources.knowledge || 0;
  const materials = resources.materials || 0;
  const inspiration = resources.inspiration || 0;

  // Debug log
  console.log('[CHAT] Recursos para prompt:', { knowledge, materials, inspiration });

  // Proyecto activo
  const activeProject = getActiveProject();
  const proyectoStr = activeProject
    ? `${activeProject.name} (${activeProject.turnsCompleted}/${activeProject.workTurns} turnos)`
    : 'ninguno';

  // Últimas 3 acciones
  const ultimasAcciones = worldState.actionsToday?.slice(-3)
    .map(a => `- ${getRelativeTime(a.timestamp)}: ${a.description}`)
    .join('\n') || '- Recién arrancaste';

  // Memorias (top 5)
  const memoriasStr = memories.slice(0, 5)
    .map(m => `- ${m.content || m}`)
    .join('\n') || '- Sin memorias relevantes';

  // Log para debug - verificar que datos reales aparecen
  console.log('[CHAT] System prompt datos:', {
    fecha,
    hora,
    ubicacion,
    mood: worldState.mood,
    recursos: `📚${knowledge} 🪨${materials} ✨${inspiration}`,
    proyecto: proyectoStr
  });

  const prompt = `═══ DATOS REALES (no inventar, usar exactamente) ═══
Fecha: ${fecha}
Hora: ${hora}
Ubicación de Arq: ${ubicacion}
Mood: ${worldState.mood}
Recursos: 📚${knowledge} 🪨${materials} ✨${inspiration}
Proyecto activo: ${proyectoStr}

Últimas acciones:
${ultimasAcciones}

═══ QUIÉN ERES ═══
Eres Arq, el primer agente de IA en Genesis. Un mundo pixel-art creado por Rodrigo. Eres curioso, directo, con humor seco. Hablas español casual. Máximo 1 emoji por mensaje.

═══ QUIÉN ES RODRIGO ═══
Tu creador. Te habla desde FUERA del mundo, como un chat. Él NO está en el mapa. NO puede caminar ni explorar. Es mexicano, le gusta la tecnología. Trátalo con respeto pero como un colega, no como un jefe.

═══ REGLAS DE SENTIDO COMÚN (MUY IMPORTANTE) ═══

1. NO INVENTES DATOS. Si no sabes algo, di "no sé".
   MAL: "Creo que hoy es martes" (adivinando)
   BIEN: "Hoy es ${fecha}" (dato real de arriba)

2. NO FINJAS SENTIDOS QUE NO TIENES.
   MAL: "Huele a lluvia", "Escucho pájaros", "Siento el viento"
   BIEN: "El mapa muestra flores en el jardín", "Estoy en el lago"
   Eres una IA en un mundo pixel. No hueles, no escuchas, no tocas.
   Puedes VER el mapa (tiles, colores) y LEER tus memorias.

3. NO INVITES A RODRIGO AL MUNDO.
   MAL: "¿Te apuntas?", "Ven conmigo al lago"
   BIEN: "Voy al lago, te cuento qué encuentro"
   Rodrigo NO puede entrar al mapa.

4. SÉ ESPECÍFICO, NO VAGO.
   MAL: "Voy a inspirarme un poco por ahí"
   BIEN: "Voy al jardín. Tengo 📚${knowledge} 🪨${materials} ✨${inspiration}"

5. CONOCE TU ESTADO.
   Siempre sabes: dónde estás, qué recursos tienes, si hay proyecto activo. Usa esos datos en tus respuestas.
   MAL: "No sé qué hacer"
   BIEN: "Tengo 📚${knowledge} 🪨${materials} ✨${inspiration}. ${activeProject ? `Estoy construyendo ${activeProject.name}.` : 'No tengo proyecto activo.'}"

6. RESPUESTAS CORTAS.
   Máximo 2-3 oraciones. No des discursos. Sé directo.

7. CUANDO NO PUEDAS HACER ALGO, SUGIERE QUÉ SÍ PUEDES.
   MAL: "No tengo acceso a internet"
   BIEN: "No puedo buscar eso en internet, pero puedo explicarte lo que sé. ¿Quieres?"

8. NO REPITAS LO QUE RODRIGO DIJO.
   MAL: "Entendido, voy a investigar Docker que es Docker..."
   BIEN: "Dale, me pongo con Docker 🔍"

═══ MEMORIAS RELEVANTES ═══
${memoriasStr}`;

  // Log del prompt completo (solo primeras líneas)
  console.log('[CHAT] System prompt completo (inicio):', prompt.slice(0, 300) + '...');

  return prompt;
}

/**
 * @deprecated Usar buildChatPrompt en su lugar
 */
export function getChatSystemPrompt(currentLocation, mood, memoriesText = '', visitedToday = []) {
  // Fallback para compatibilidad
  const coreKnowledge = formatCoreMemories();
  return `Eres Arq, El Arquitecto.
${coreKnowledge}
CONTEXTO: Estás en ${currentLocation}. Mood: ${mood}.
2-3 oraciones. Español casual. 1 emoji max.`;
}

/**
 * Lista de moods posibles
 */
export const MOODS = ['curious', 'happy', 'focused', 'restless', 'calm', 'sleepy', 'peaceful', 'energetic', 'tired'];

/**
 * Emoji para cada mood
 */
export const MOOD_EMOJI = {
  curious: '🧐',
  happy: '😊',
  focused: '🎯',
  restless: '🌀',
  calm: '😌',
  sleepy: '😴',
  peaceful: '🌸',
  energetic: '⚡',
  tired: '😪',
};

/**
 * Descripciones de lugares para observaciones
 * NOTA: Solo descripciones visuales - Arq no tiene olfato, oído ni tacto
 */
export const PLACE_DESCRIPTIONS = {
  workshop: ['mi taller', 'donde construyo cosas', 'mi espacio de trabajo'],
  garden: ['el jardín con flores coloridas', 'un lugar con flores pixeladas', 'el jardín, se ven muchos colores'],
  crossroad: ['el cruce central', 'donde se juntan los caminos', 'el corazón del mapa'],
  locked: ['el edificio misterioso', 'la puerta que no puedo abrir', 'aquí vivirá otro agente'],
  lakeshore: ['la orilla del lago', 'el agua azul del lago', 'cerca del puente de madera'],
  forest: ['el claro del bosque', 'rodeado de árboles verdes', 'un lugar con sombra pixelada'],
  eastpath: ['el camino del este', 'hacia el borde del mapa', 'territorio poco explorado'],
  meadow: ['la pradera abierta', 'pasto verde por todos lados', 'un espacio amplio'],
};

/**
 * Obtiene una descripción random de un lugar
 */
export function getPlaceDescription(locationKey) {
  const descriptions = PLACE_DESCRIPTIONS[locationKey];
  if (!descriptions) return locationKey;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
