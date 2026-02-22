// GENESIS — API wrapper (ahora usa llm.js para todo)
// Este archivo mantiene compatibilidad con código existente

import { think, thinkSimple } from '../config/llm';

/**
 * Llama a Haiku para decisiones rápidas
 * @deprecated Usar think() de llm.js directamente
 */
export async function callHaiku(systemPrompt, userMessage) {
  const result = await think(systemPrompt, userMessage, 'fast');
  if (result.response === null) {
    throw new Error('No hay modelo disponible');
  }
  return result.response;
}

/**
 * Llama a Sonnet para chat
 * @deprecated Usar think() de llm.js directamente
 */
export async function callSonnet(systemPrompt, userMessage) {
  const result = await think(systemPrompt, userMessage, 'chat');
  if (result.response === null) {
    throw new Error('No hay modelo disponible');
  }
  return result.response;
}

/**
 * Wrapper genérico
 * @deprecated Usar think() de llm.js directamente
 */
export async function callClaude(systemPrompt, userMessage, model = 'haiku') {
  const tier = model === 'haiku' ? 'fast' : 'chat';
  return thinkSimple(systemPrompt, userMessage, tier);
}
