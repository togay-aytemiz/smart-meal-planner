/**
 * Firebase Functions Secrets Management
 * 
 * Production: Use Firebase Functions Secrets Manager
 * Development: Use .secret.local file
 */

import * as functions from "firebase-functions/v2";

export interface LLMConfig {
  openai: {
    apiKey: string;
  };
  gemini: {
    apiKey: string;
    model: string; // Model name for Gemini
  };
}

// Define secrets - will be populated at runtime
export const secrets = {
  OPENAI_API_KEY: functions.defineSecret("OPENAI_API_KEY"),
  GEMINI_API_KEY: functions.defineSecret("GEMINI_API_KEY"),
};

/**
 * Get LLM configuration with secrets
 * In development, reads from .secret.local if available
 */
export function getLLMConfig(): LLMConfig {
  // In development, try to read from .secret.local
  if (process.env.NODE_ENV !== "production") {
    try {
      // For local development, secrets might be in process.env or .secret.local
      // Firebase emulator will handle this automatically
      return {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || secrets.OPENAI_API_KEY.value(),
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY || secrets.GEMINI_API_KEY.value(),
          model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
        },
      };
    } catch (error) {
      console.warn("Could not read secrets from environment, using Functions secrets");
    }
  }

  // Production: Use Functions secrets
  return {
    openai: {
      apiKey: secrets.OPENAI_API_KEY.value(),
    },
    gemini: {
      apiKey: secrets.GEMINI_API_KEY.value(),
      model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    },
  };
}

/**
 * Validate that all required secrets are available
 */
export function validateSecrets(): void {
  const config = getLLMConfig();
  
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  
  if (!config.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
}
