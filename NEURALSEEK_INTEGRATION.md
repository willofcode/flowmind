# NeuralSeek Integration Summary

## Overview
Successfully integrated NeuralSeek Seek and mAIstro endpoints directly into the FlowMind application using embed code authentication (370207002).

## Changes Made

### 1. Server Implementation (`server/server.js`)

#### Added NeuralSeek Configuration
```javascript
const NS_EMBED_CODE = process.env.NS_EMBED_CODE || "370207002";
const NS_SEEK_ENDPOINT = "https://stagingapi.neuralseek.com/v1/stony23/seek";
const NS_MAISTRO_ENDPOINT = "https://stagingapi.neuralseek.com/v1/stony23/maistro";
```

#### New Endpoints

**POST /seek**
- Purpose: Query NeuralSeek knowledge base
- Authentication: Uses `embedcode` header
- Use case: Quick knowledge lookups, FAQ answers, contextual help

**POST /maistro**
- Purpose: AI agent interactions for complex tasks
- Authentication: Uses `embedcode` header
- Use case: Weekly planning, adaptive scheduling, personalized recommendations

#### Updated Endpoints

**POST /plan-week**
- Now uses direct mAIstro endpoint with embed code
- Removed old Bearer token authentication
- More reliable and direct API communication

**GET /health**
- Enhanced to show NeuralSeek configuration status
- Displays endpoint URLs for debugging

### 2. Client Implementation (`client/lib/api-client.ts`)

#### New Methods

**seek(question, context)**
```typescript
await apiClient.seek(
  "What are good ADHD-friendly strategies?",
  { userContext: {...} }
);
```

**mAIstro(prompt, context, parameters)**
```typescript
await apiClient.mAIstro(
  "Create a weekly plan",
  { userProfile, constraints },
  { temperature: 0.7, response_format: "json" }
);
```

### 3. Documentation

Created:
- `server/.env.example` - Environment variable template
- `server/NEURALSEEK_API.md` - Complete API documentation
- `client/lib/neuralseek-examples.ts` - Usage examples and patterns

## Environment Variables

Required in `server/.env`:
```bash
NS_EMBED_CODE=370207002
NS_SEEK_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/seek
NS_MAISTRO_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/maistro
```

## Benefits

1. **Direct API Access**: No intermediate services required
2. **Embed Code Security**: Limited to Seek and mAIstro endpoints only
3. **Simplified Authentication**: Single header-based auth
4. **Better Error Handling**: Direct feedback from NeuralSeek API
5. **Flexible Integration**: Both Seek (quick queries) and mAIstro (complex AI tasks)

## Usage Examples

### Quick Knowledge Query
```typescript
const advice = await apiClient.seek(
  "Best workout strategies for ADHD",
  { energyLevel: "moderate" }
);
```

### AI-Generated Plan
```typescript
const plan = await apiClient.mAIstro(
  "Create a neurodivergent-friendly weekly schedule",
  { userProfile, weekRange, constraints },
  { temperature: 0.7, max_tokens: 4000 }
);
```

### Combined Approach
```typescript
// 1. Get knowledge
const knowledge = await apiClient.seek("workout challenges", context);

// 2. Use knowledge to generate plan
const plan = await apiClient.mAIstro(
  `Using this guidance: ${knowledge}, create a plan...`,
  { userProfile, knowledgeBase: knowledge }
);
```

## Testing

Test the integration:

```bash
# 1. Start server
cd server
npm start

# 2. Check health endpoint
curl http://localhost:3001/health

# 3. Test Seek endpoint
curl -X POST http://localhost:3001/seek \
  -H "Content-Type: application/json" \
  -d '{"question": "What are good ADHD strategies?", "context": {}}'

# 4. Test mAIstro endpoint
curl -X POST http://localhost:3001/maistro \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a simple plan", "context": {}, "parameters": {}}'
```

## Next Steps

1. ✅ Server endpoints implemented
2. ✅ Client methods added
3. ✅ Documentation created
4. 🔲 Test endpoints with real data
5. 🔲 Integrate into UI components
6. 🔲 Add error handling in components
7. 🔲 Monitor API usage and responses

## Files Modified

- `/server/server.js` - Core API implementation
- `/client/lib/api-client.ts` - Client methods

## Files Created

- `/server/.env.example` - Environment template
- `/server/NEURALSEEK_API.md` - API documentation
- `/client/lib/neuralseek-examples.ts` - Usage examples
- `/NEURALSEEK_INTEGRATION.md` - This summary (you are here)
