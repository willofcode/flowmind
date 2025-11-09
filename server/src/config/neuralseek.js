/**
 * NeuralSeek API Configuration
 * 
 * Purpose: Configure and export NeuralSeek API endpoints and credentials
 * Dependencies: dotenv
 * 
 * Usage:
 *   import { NS_CONFIG, getNeuralSeekHeaders } from './config/neuralseek.js';
 *   const response = await fetch(NS_CONFIG.MAISTRO_ENDPOINT, {
 *     headers: getNeuralSeekHeaders()
 *   });
 * 
 * Environment Variables Required:
 *   - NS_EMBED_CODE: NeuralSeek embed code for authentication
 *   - NS_SEEK_ENDPOINT: (optional) NeuralSeek Seek API endpoint
 *   - NS_MAISTRO_ENDPOINT: (optional) NeuralSeek mAIstro API endpoint
 * 
 * @module config/neuralseek
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * NeuralSeek API Configuration Object
 * @constant
 */
export const NS_CONFIG = {
  /** NeuralSeek embed code for authentication */
  EMBED_CODE: process.env.NS_EMBED_CODE || "370207002",
  
  /** NeuralSeek Seek API endpoint for knowledge base queries */
  SEEK_ENDPOINT:
    process.env.NS_SEEK_ENDPOINT ||
    "https://stagingapi.neuralseek.com/v1/stony23/seek",
  
  /** NeuralSeek mAIstro API endpoint for AI orchestration */
  MAISTRO_ENDPOINT:
    process.env.NS_MAISTRO_ENDPOINT ||
    "https://stagingapi.neuralseek.com/v1/stony23/maistro",
};

/**
 * Get standard headers for NeuralSeek API requests
 * @returns {Object} Headers object with embedcode authentication
 */
export function getNeuralSeekHeaders() {
  return {
    embedcode: NS_CONFIG.EMBED_CODE,
    "Content-Type": "application/json",
  };
}

/**
 * Validate NeuralSeek configuration
 * @returns {boolean} True if configuration is valid
 */
export function validateConfig() {
  if (!NS_CONFIG.EMBED_CODE) {
    console.error("❌ Missing NS_EMBED_CODE in environment variables");
    return false;
  }
  return true;
}

/**
 * Test NeuralSeek API connectivity
 * @returns {Promise<boolean>} True if API is reachable
 */
export async function testNeuralSeekConnection() {
  try {
    const response = await fetch(NS_CONFIG.SEEK_ENDPOINT, {
      method: "POST",
      headers: getNeuralSeekHeaders(),
      body: JSON.stringify({ question: "test" }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("❌ NeuralSeek connection failed:", error.message);
    return false;
  }
}

export default NS_CONFIG;
