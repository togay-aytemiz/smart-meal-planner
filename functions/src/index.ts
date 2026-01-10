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

// TODO: Recipe generation function will be added here
// export const generateRecipe = functions.https.onCall(async (request) => {
//   // Implementation coming soon
// });
