# Server Architecture Documentation

## 📁 Directory Structure

```
server/
├── index.js                      # Main entry point
├── src/
│   ├── config/                   # Configuration modules
│   │   ├── database.js          # Supabase client & connection
│   │   ├── neuralseek.js        # NeuralSeek API configuration
│   │   └── express.js           # Express app setup
│   │
│   ├── routes/                   # API route handlers
│   │   ├── users.routes.js      # User management (/users)
│   │   ├── mood.routes.js       # Mood check-ins (/mood)
│   │   ├── schedules.routes.js  # Schedule management (/schedules)
│   │   ├── conversations.routes.js  # Chat history (/conversations)
│   │   ├── orchestration.routes.js  # AI sessions (/orchestration)
│   │   ├── feedback.routes.js   # User feedback (/feedback)
│   │   └── health.routes.js     # Health check (/health)
│   │
│   ├── services/                 # Business logic
│   │   └── maistro.service.js   # mAIstro AI orchestration
│   │
│   ├── middleware/               # Custom middleware (future)
│   └── utils/                    # Utility functions (future)
│
├── user-schema.sql              # Database schema
├── test-new-api.js              # Comprehensive test suite
└── .env                         # Environment variables
```

## 🎯 Module Overview

### 1. Configuration (`src/config/`)

#### `database.js`
- **Purpose**: Initialize Supabase client
- **Exports**: `supabase`, `testConnection()`
- **Usage**:
  ```javascript
  import { supabase } from './config/database.js';
  const { data } = await supabase.from('users').select('*');
  ```

#### `neuralseek.js`
- **Purpose**: NeuralSeek API configuration
- **Exports**: `NS_CONFIG`, `getNeuralSeekHeaders()`, `validateConfig()`
- **Usage**:
  ```javascript
  import { NS_CONFIG, getNeuralSeekHeaders } from './config/neuralseek.js';
  const response = await fetch(NS_CONFIG.MAISTRO_ENDPOINT, {
    headers: getNeuralSeekHeaders()
  });
  ```

#### `express.js`
- **Purpose**: Express app configuration
- **Exports**: `createApp()`, `errorHandler`
- **Middleware**: CORS, JSON parser, logging, error handling

### 2. Routes (`src/routes/`)

#### `users.routes.js` - User Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create/update user |
| GET | `/users/:email` | Get user by email |
| GET | `/users/:userId/profile` | Get user profile |
| PUT | `/users/:userId/profile` | Update profile |

#### `mood.routes.js` - Mood Check-ins
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mood/checkin` | Submit mood check-in with STT |
| GET | `/mood/:userId/history` | Get mood history |
| GET | `/mood/:userId/patterns` | Get discovered patterns |

#### `schedules.routes.js` - Schedule Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/schedules` | Create/update weekly schedule |
| GET | `/schedules/:userId/:weekStart` | Get specific week |
| GET | `/schedules/:userId/intensity` | Get intensity over time |

#### `conversations.routes.js` - Conversation History
| Method | Path | Description |
|--------|------|-------------|
| POST | `/conversations` | Save conversation message |
| GET | `/conversations/:userId` | Get conversation history |

#### `orchestration.routes.js` - AI Orchestration
| Method | Path | Description |
|--------|------|-------------|
| POST | `/orchestration/sessions` | Create orchestration session |
| GET | `/orchestration/:userId/sessions` | Get session history |

#### `feedback.routes.js` - User Feedback
| Method | Path | Description |
|--------|------|-------------|
| POST | `/feedback` | Submit feedback |
| GET | `/feedback/:userId` | Get feedback history |

#### `health.routes.js` - Health Check
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Check system health |

### 3. Services (`src/services/`)

#### `maistro.service.js` - AI Orchestration
- **`analyzeMoodWithMaistro(params)`**: Analyze mood from STT transcription
  - Input: `{transcription, userId, scheduleDensity, scheduleContext}`
  - Output: `{moodScore, energyLevel, stressLevel, emotionalState, analysis}`
  - Uses: NeuralSeek mAIstro API with `ntl` parameter

- **`discoverMoodPatterns(userId)`**: Find mood-schedule correlations
  - Analyzes: Last 30 mood check-ins + 4 weeks of schedules
  - Discovers: Schedule density patterns, time-of-day patterns, triggers
  - Saves: Patterns to `mood_patterns` table

## 🚀 Running the Server

### Development
```bash
cd server
node index.js
```

### With Nodemon (auto-restart)
```bash
npm install -g nodemon
nodemon index.js
```

### Expected Output
```
🚀 Starting FlowMind API Server...

📊 Testing database connection...
✅ Database connected

🧠 Testing NeuralSeek connection...
✅ NeuralSeek connected

============================================================
🎉 FlowMind API Server running on http://localhost:3001
============================================================

📍 Available Routes:
   POST   http://localhost:3001/users
   GET    http://localhost:3001/users/:email
   POST   http://localhost:3001/mood/checkin
   ...

✨ Server ready to accept requests
```

## 🧪 Testing

### Run Test Suite
```bash
node test-new-api.js
```

### Manual Testing
```bash
# Health check
curl http://localhost:3001/health

# Create user
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "name":"Test User"}'

# Mood check-in
curl -X POST http://localhost:3001/mood/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-uuid",
    "transcription":"I am feeling great today!"
  }'
```

## 📦 Dependencies

### Required
- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `node-fetch` - HTTP client
- `@supabase/supabase-js` - Supabase client

### Installation
```bash
cd server
npm install
```

## 🔐 Environment Variables

Create `.env` file:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# NeuralSeek
NS_EMBED_CODE=370207002
NS_SEEK_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/seek
NS_MAISTRO_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/maistro

# Server
PORT=3001
NODE_ENV=development
```

## 🔄 Request/Response Flow

### Example: Mood Check-in

```
1. Client sends POST /mood/checkin
   {
     "userId": "uuid",
     "transcription": "I'm feeling stressed..."
   }

2. mood.routes.js receives request

3. Fetches schedule context from database
   → weekly_schedules table

4. Calls maistro.service.js
   → analyzeMoodWithMaistro()

5. mAIstro analyzes transcription
   → NeuralSeek API call with 'ntl' parameter

6. Saves mood check-in to database
   → mood_check_ins table

7. Triggers async pattern discovery
   → discoverMoodPatterns() (background)

8. Returns response to client
   {
     "success": true,
     "checkIn": {...},
     "recommendations": [...]
   }
```

## 🛠️ Adding New Features

### 1. Add New Route
Create `/src/routes/feature.routes.js`:
```javascript
import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  // Your logic here
  res.json({ success: true });
});

export default router;
```

### 2. Register Route in `index.js`
```javascript
import featureRoutes from "./src/routes/feature.routes.js";
app.use("/feature", featureRoutes);
```

### 3. Add Service (if needed)
Create `/src/services/feature.service.js`:
```javascript
export async function doSomething(params) {
  // Business logic here
}
```

### 4. Document Route
Update this file with new route details.

## 🐛 Debugging

### Enable Verbose Logging
```javascript
// In index.js, add:
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log("Body:", req.body);
  next();
});
```

### Common Issues

**Database connection failed**
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Verify RLS is disabled for development
- Check network connectivity

**NeuralSeek connection failed**
- Verify `NS_EMBED_CODE` is correct
- Check endpoint URLs
- Test with curl manually

**Routes not found**
- Verify route is registered in `index.js`
- Check route path matches request
- Ensure router is exported correctly

## 📊 Database Schema

See `user-schema.sql` for complete schema.

**Key Tables:**
- `users` - Core user info
- `user_profiles` - Neuro preferences
- `mood_check_ins` - STT transcriptions + AI analysis
- `weekly_schedules` - Schedule density metrics
- `mood_patterns` - AI-discovered correlations
- `conversations` - Chat history
- `ai_orchestration_sessions` - mAIstro decisions
- `user_feedback` - Ratings & comments

## 🔒 Security Considerations

### Current State (Development)
- ✅ CORS enabled for all origins
- ✅ Environment variables for secrets
- ❌ RLS disabled (for dev only)
- ❌ No authentication middleware
- ❌ No rate limiting

### Production Checklist
- [ ] Enable RLS with JWT policies
- [ ] Add authentication middleware
- [ ] Implement rate limiting
- [ ] Restrict CORS to allowed origins
- [ ] Add input validation
- [ ] Enable HTTPS only
- [ ] Add request logging
- [ ] Implement API key rotation

## 📈 Performance Optimization

### Current Optimizations
- ✅ Async pattern discovery (non-blocking)
- ✅ Database indexes on user_id, dates
- ✅ Limit query results (max 50 records)

### Future Optimizations
- [ ] Add Redis caching for frequent queries
- [ ] Implement connection pooling
- [ ] Add request throttling
- [ ] Optimize mAIstro prompts
- [ ] Batch database operations
- [ ] Add CDN for static assets

## 📝 API Versioning

Current: **v1** (implicit)

Future versioning strategy:
```
/v1/users
/v1/mood/checkin
/v2/users  (breaking changes)
```

## 🎓 Best Practices

1. **Always use try/catch** in route handlers
2. **Validate input** before database operations
3. **Return consistent error format**
4. **Log errors** with context
5. **Use transactions** for multi-table operations
6. **Document all routes** with JSDoc comments
7. **Test endpoints** with test suite
8. **Follow RESTful conventions**

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [NeuralSeek API Docs](../NEURALSEEK_API.md)
- [Database Schema](user-schema.sql)
- [API Test Guide](API_TEST_GUIDE.md)
