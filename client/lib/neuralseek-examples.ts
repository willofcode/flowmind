/**
 * Example usage of NeuralSeek API endpoints
 * 
 * This file demonstrates how to use the Seek and mAIstro endpoints
 * from the FlowMind client application.
 */

import { apiClient } from './api-client';

// ============================================================================
// Example 1: Using Seek for Knowledge Base Queries
// ============================================================================

export async function getWorkoutAdvice() {
  try {
    const response = await apiClient.seek(
      "What are the best workout strategies for people with ADHD?",
      {
        userContext: {
          energyLevel: "moderate",
          timeOfDay: "morning",
          preferences: "short, high-intensity workouts"
        }
      }
    );
    
    console.log("Workout advice:", response);
    return response;
  } catch (error) {
    console.error("Error getting workout advice:", error);
    throw error;
  }
}

export async function getDietaryGuidance() {
  try {
    const response = await apiClient.seek(
      "What are good meal planning strategies for neurodivergent individuals?",
      {
        dietaryPreferences: "low-sensory-load",
        cookingTime: "under-45-minutes",
        avoidances: ["strong smells", "complex textures"]
      }
    );
    
    console.log("Dietary guidance:", response);
    return response;
  } catch (error) {
    console.error("Error getting dietary guidance:", error);
    throw error;
  }
}

// ============================================================================
// Example 2: Using mAIstro for AI Agent Interactions
// ============================================================================

export async function generatePersonalizedPlan(userProfile: any) {
  try {
    const prompt = `
      Create a personalized weekly schedule that includes:
      1. Daily workout times optimized for energy levels
      2. Meal preparation windows with simple recipes
      3. Buffer times between activities
      4. Consistent timing for habit formation
      
      The schedule should be neurodivergent-friendly with:
      - Clear, actionable micro-steps
      - No more than 2 decision points per activity
      - Same time slots daily for consistency
      - Backup options for packed days
    `;
    
    const response = await apiClient.mAIstro(
      prompt,
      {
        userProfile,
        constraints: {
          maxWorkoutDuration: 40,
          mealPrepTime: 45,
          bufferMinutes: 15,
          consistencyPriority: "high"
        }
      },
      {
        temperature: 0.7,
        max_tokens: 4000,
        response_format: "json"
      }
    );
    
    console.log("Personalized plan:", response);
    return response;
  } catch (error) {
    console.error("Error generating plan:", error);
    throw error;
  }
}

export async function getMotivationalInsights(currentState: any) {
  try {
    const prompt = `
      Based on the user's current progress and challenges, provide:
      1. Encouraging feedback on completed activities
      2. Adjusted strategies for missed workouts
      3. Micro-wins to celebrate
      4. Gentle suggestions for getting back on track
      
      Tone: Supportive, non-judgmental, neurodivergent-aware
    `;
    
    const response = await apiClient.mAIstro(
      prompt,
      {
        currentState,
        preferences: {
          tone: "supportive",
          focusOn: "progress-not-perfection"
        }
      },
      {
        temperature: 0.8,
        max_tokens: 1000
      }
    );
    
    console.log("Motivational insights:", response);
    return response;
  } catch (error) {
    console.error("Error getting insights:", error);
    throw error;
  }
}

// ============================================================================
// Example 3: Combining Seek and mAIstro
// ============================================================================

export async function createAdaptiveWorkoutPlan(userProfile: any, currentChallenges: string[]) {
  try {
    // Step 1: Use Seek to get relevant knowledge about the challenges
    const knowledgeResponse = await apiClient.seek(
      `How to handle these challenges when planning workouts: ${currentChallenges.join(", ")}`,
      { userProfile }
    );
    
    // Step 2: Use mAIstro to create a plan incorporating that knowledge
    const planPrompt = `
      Using the following guidance: ${JSON.stringify(knowledgeResponse)}
      
      Create a 7-day adaptive workout plan that addresses:
      ${currentChallenges.map((c, i) => `${i + 1}. ${c}`).join("\n")}
      
      Requirements:
      - Each workout should have 3-5 clear micro-steps
      - Include A/B options for flexibility
      - Respect energy windows: ${JSON.stringify(userProfile.energyWindows)}
      - Maximum workout duration: ${userProfile.maxWorkoutMin || 40} minutes
      - Include "movement snacks" for busy days
    `;
    
    const plan = await apiClient.mAIstro(
      planPrompt,
      {
        userProfile,
        knowledgeBase: knowledgeResponse
      },
      {
        temperature: 0.7,
        max_tokens: 3000,
        response_format: "json"
      }
    );
    
    console.log("Adaptive workout plan:", plan);
    return plan;
  } catch (error) {
    console.error("Error creating adaptive plan:", error);
    throw error;
  }
}

// ============================================================================
// Example 4: Real-time Query During App Usage
// ============================================================================

export async function handleQuickQuestion(question: string, userContext: any) {
  try {
    // Use Seek for quick knowledge base queries
    const answer = await apiClient.seek(question, userContext);
    return answer;
  } catch (error) {
    console.error("Error handling question:", error);
    throw error;
  }
}

// Example usage in a React component:
// 
// import { getWorkoutAdvice, generatePersonalizedPlan } from '@/lib/neuralseek-examples';
// 
// function MyComponent() {
//   const handleGetAdvice = async () => {
//     const advice = await getWorkoutAdvice();
//     setAdvice(advice);
//   };
//   
//   return <Button onPress={handleGetAdvice}>Get Workout Advice</Button>;
// }
