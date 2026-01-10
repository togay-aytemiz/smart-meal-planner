/**
 * Firebase Cloud Functions - Main Entry Point
 * Smart Meal Planner - LLM Integration
 */

import * as functions from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { secrets } from "./config/secrets";

// Set global options for all functions
setGlobalOptions({
  region: "us-central1", // Change to your preferred region
  secrets: [secrets.OPENAI_API_KEY, secrets.GEMINI_API_KEY],
  timeoutSeconds: 540, // 9 minutes max for LLM operations
  memory: "512MiB", // Adjust based on needs
});

// Health check endpoint
export const health = onRequest(async (request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "smart-meal-planner-functions",
  });
});

// Import Gemini provider
import { GeminiProvider } from "./llm/gemini-provider";
import { onCall } from "firebase-functions/v2/https";

// Test Gemini LLM endpoint
export const testGemini = onCall(async (request) => {
  try {
    const { prompt } = request.data;

    if (!prompt) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Prompt is required"
      );
    }

    const gemini = new GeminiProvider();
    const response = await gemini.generateTest(prompt);

    return {
      success: true,
      response: response,
      model: gemini.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("testGemini error:", error);
    throw new functions.HttpsError(
      "internal",
      error.message || "Failed to generate response"
    );
  }
});

// TODO: Full menu generation function
// export const generateMenu = onCall(async (request) => {
//   // Implementation coming soon
// });
