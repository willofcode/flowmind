# FlowMind - Neurodivergent-Friendly Planning App
### sbu-hack25' - optimizing daily life and supporting neurodivergent users through mindful structure and AI assistance

> **Built for ADHD, autistic, dyslexic, and neurodivergent users**  
> Lower cognitive load • Routine scaffolding • Voice-first • Compassionate nudges

FlowMind helps you find daily time for workouts and meals through **predictable routines**, **micro-steps**, and **sensory-aware design**. Powered by NeuralSeek's mAIstro for intelligent weekly planning that respects your energy windows and cognitive needs.

---

## 🧠 Key Features

### Neurodivergent-First Design
- **Calm UI Mode**: Reduced motion, high contrast, larger touch targets
- **Voice-First**: Speak commands instead of typing
- **10-3-1 Minute Nudges**: Gentle, predictable reminders (haptics-only option)
- **Micro-Steps**: Every task broken into 3-5 concrete actions
- **Choice Architecture**: Two options max to reduce decision fatigue
- **Consistent Timing**: Same time windows daily for habit formation

### Intelligent Planning
- **Personal Neuro Profile**: Energy windows, focus limits, sensory preferences
- **Energy-Matched Scheduling**: Activities only during your peak times
- **Automatic Buffers**: 10-min pre/post padding to reduce rushing
- **Fallback Plans**: 10-15 min "movement snacks" when days are packed
- **Alternative Options**: Quick A/B swaps without re-planning

### Privacy & Data
- **Local-First**: Profile stored securely on device (expo-secure-store)
- **Supabase Backend**: Optional cloud sync for multi-device
- **Google Calendar Integration**: Optional, respects existing commitments

---

## 🏗️ Architecture

```
┌─────────────────┐
│  iOS App (Expo) │
│  - Today View   │
│  - Plan Week    │
│  - Profile      │
│  - Voice Input  │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐       ┌──────────────────┐
│  Node Backend   │──────▶│  NeuralSeek      │
│  - API Proxy    │       │  mAIstro Agent   │
│  - Auth         │       │  + Virtual KB    │
│  - Supabase     │       └──────────────────┘
└────────┬────────┘
         │
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│  Supabase       │       │  Google Calendar │
│  - Profiles     │       │  - FreeBusy      │
│  - Weekly Plans │       │  - Events        │
└─────────────────┘       └──────────────────┘
```

---

## 📱 Tech Stack

### Client (iOS - Expo/React Native)
- **Expo SDK 54** - Cross-platform framework
- **TypeScript** - Type safety
- **expo-notifications** - 10-3-1 nudge system
- **expo-haptics** - Sensory-friendly feedback
- **expo-speech** - Text-to-speech (future)
- **expo-secure-store** - Local profile storage
- **@supabase/supabase-js** - Cloud sync

### Server (Node.js)
- **Express** - REST API
- **Supabase** - PostgreSQL database
- **NeuralSeek mAIstro** - AI weekly planner
- **Google Calendar API** - Schedule integration

### Database (Supabase/PostgreSQL)

**Tables:**
```sql
-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  profile_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly plans table
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Xcode** (for iOS development)
- **Expo CLI** (`npm install -g expo-cli`)
- **Supabase Account** ([supabase.com](https://supabase.com))
- **NeuralSeek API Key** ([neuralseek.com](https://neuralseek.com))

### 1. Clone & Install

```bash
git clone https://github.com/willofcode/flowmind.git
cd flowmind

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
PORT=3001
NS_API_KEY=your_neuralseek_api_key
NS_API_ENDPOINT=https://api.neuralseek.com/maistro_stream
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Client** (`client/.env`):
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 3. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL from "Database (Supabase/PostgreSQL)" section above
3. Copy your project URL and anon key to `server/.env`

### 4. Configure NeuralSeek mAIstro Agent

In NeuralSeek dashboard:
1. Create new agent: **"neuro-weekly-planner"**
2. Add these nodes:
   - **Seek** (Virtual KB input)
   - **REST** (Google Calendar FreeBusy - optional)
   - **LLM** (Slot selection + workout generation)
   - **LLM** (Dinner planning + grocery list)
   - **VirtualKB-Out** (Structured output)
3. Configure agent to follow prompt in `server/server.js:buildNeuroAgentPrompt()`

### 5. Run the App

**Terminal 1 - Server:**
```bash
cd server
npm start
```

**Terminal 2 - Client:**
```bash
cd client
npm run ios  # Opens iOS simulator
```

---

## 📖 Usage Guide

### First Launch: Create Your Neuro Profile

1. Open app → **Profile** tab
2. Answer questions about:
   - Preferred activities (walks, tennis, weights...)
   - Energy windows (when you have focus/energy)
   - Focus block length (e.g., 25 min)
   - Sensory preferences (reduced motion, haptics-only)
   - Diet style & restrictions
   - Sleep schedule

### Plan Your Week

1. Go to **Plan Week** tab
2. Tap "Plan My Week"
3. Review:
   - 7 workout blocks (consistent times)
   - 5 dinner recipes
   - Consolidated grocery list
4. Tap "Add to Calendar" (optional)

### Use Today View

1. **Today** tab shows your next upcoming block
2. See **3 micro-steps** for what to do
3. Tap **"Start"** when ready
4. Get **10-3-1 min nudges** (gentle haptics)
5. Tap **"Complete"** when done
6. **Swap to Alternative** if not feeling it
7. **Skip** if needed (no guilt!)

### Voice Commands (Future)

- "Re-plan today"
- "Swap workout"
- "Show grocery list"
- "Skip dinner and reschedule tomorrow"

---

## 🧩 Project Structure

```
flowmind/
├── client/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── today.tsx          # Home view - next activity
│   │   │   ├── plan-week.tsx      # Weekly planner
│   │   │   └── index.tsx          # Original welcome
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── today-view.tsx         # Main focus card
│   │   ├── calm-ui-toggle.tsx     # Accessibility switch
│   │   └── ui/                    # Reusable components
│   ├── lib/
│   │   ├── profile-store.ts       # Local storage
│   │   ├── api-client.ts          # Backend API
│   │   └── notification-manager.ts # 10-3-1 nudges
│   ├── types/
│   │   └── neuro-profile.ts       # TypeScript types
│   └── constants/
│       ├── calm-theme.ts          # Neurodivergent design tokens
│       └── theme.ts               # Original theme
├── server/
│   ├── server.js                  # Express + NeuralSeek + Supabase
│   └── package.json
└── README.md                      # This file
```

---

## 🎨 Design Principles

### Cognitive Load Reduction
- **One thing at a time** - Today view shows ONLY next block
- **Minimal choices** - Max 2 options (A/B)
- **Clear hierarchy** - Large titles, obvious CTAs

### Sensory Considerations
- **High contrast** - AAA WCAG compliance
- **Reduced motion** - Optional animations
- **Haptics over sound** - Non-intrusive feedback
- **Larger touch targets** - 48-56px minimum

### Predictability & Routine
- **Consistent timing** - Same windows daily
- **Buffers** - Always 10 min before/after
- **Fallbacks** - Never "no plan" - always micro-option

### Compassionate Design
- **No guilt** - Skip button always visible
- **Gentle nudges** - "Put on shoes" not "WORKOUT NOW!"
- **Energy-aware** - Never push when you're depleted

---

## 🔮 Roadmap

### v1.1 - Voice & Speech
- [ ] Expo Speech (TTS) for micro-step narration
- [ ] Voice commands via Whisper API
- [ ] Hands-free mode toggle

### v1.2 - Enhanced Notifications
- [ ] Adaptive nudge timing based on response patterns
- [ ] Custom nudge messages per user
- [ ] Silent mode schedule (e.g., silent after 9pm)

### v1.3 - Social & Accountability
- [ ] Optional accountability partner
- [ ] Streak tracking (gentle, not shame-based)
- [ ] Celebration animations (opt-in)

### v2.0 - Advanced AI
- [ ] Learning from skip patterns
- [ ] Dynamic energy window adjustment
- [ ] Meal preference learning
- [ ] Integration with fitness trackers (passive data)

---

## 🤝 Contributing

We welcome contributions, especially from neurodivergent developers! Please:
1. Read `CONTRIBUTING.md` (TBD)
2. Open an issue first to discuss
3. Follow existing code style
4. Test on real devices

---

## 📄 License

MIT License - See `LICENSE` file

---

## 💙 Acknowledgments

Built with love for the neurodivergent community. Special thanks to:
- ADHD & autistic beta testers
- Accessibility advocates
- NeuralSeek team for mAIstro support

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/willofcode/flowmind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/willofcode/flowmind/discussions)
- **Email**: support@flowmind.app (TBD)

---

**Made with 🧠 for minds that flow differently**
