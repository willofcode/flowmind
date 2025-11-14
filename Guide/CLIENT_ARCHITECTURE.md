# Client Architecture Documentation

## 📁 Directory Structure

```
client/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Home/redirect
│   ├── landing.tsx              # Landing page (unauthenticated)
│   ├── welcome.tsx              # Onboarding
│   ├── sign-in.tsx              # Auth0 login
│   ├── mood-checkin.tsx         # STT mood check-in
│   ├── breathing-session.tsx    # Guided breathing
│   └── (tabs)/                  # Bottom tab navigation
│       ├── _layout.tsx
│       ├── index.tsx            # Today View (main screen)
│       └── explore.tsx
│
├── src/                          # Application code (NEW)
│   ├── components/              # React components
│   │   ├── core/               # Core UI components
│   │   │   ├── themed-text.tsx
│   │   │   ├── themed-view.tsx
│   │   │   └── haptic-tab.tsx
│   │   ├── features/           # Feature-specific components
│   │   │   ├── today-view.tsx
│   │   │   ├── mood-checkin-stt.tsx
│   │   │   ├── google-calendar-connect.tsx
│   │   │   ├── calm-ui-toggle.tsx
│   │   │   ├── profile-icon-button.tsx
│   │   │   ├── streak-card.tsx
│   │   │   └── task-bubble.tsx
│   │   └── ui/                 # Shared UI components (shadcn-style)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── ...
│   │
│   ├── services/               # API & external services
│   │   ├── api/               # Backend API client
│   │   │   ├── client.ts      # Base API client
│   │   │   ├── users.api.ts   # User endpoints
│   │   │   ├── mood.api.ts    # Mood endpoints
│   │   │   ├── schedules.api.ts
│   │   │   └── index.ts       # Export all
│   │   ├── auth/              # Authentication
│   │   │   ├── auth0.service.ts
│   │   │   ├── google-auth.service.ts
│   │   │   └── index.ts
│   │   ├── storage/           # Local storage
│   │   │   ├── profile.storage.ts
│   │   │   ├── secure.storage.ts
│   │   │   └── index.ts
│   │   └── notifications/     # Push notifications
│   │       ├── notification.service.ts
│   │       └── index.ts
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth0.ts
│   │   ├── use-profile.ts
│   │   ├── use-api.ts
│   │   └── use-haptics.ts
│   │
│   ├── types/                 # TypeScript types
│   │   ├── neuro-profile.ts
│   │   ├── api.types.ts
│   │   └── navigation.types.ts
│   │
│   ├── constants/             # Constants & config
│   │   ├── calm-theme.ts
│   │   ├── config.ts
│   │   └── api-endpoints.ts
│   │
│   └── utils/                 # Utility functions
│       ├── supabase.ts
│       ├── format.utils.ts
│       └── validation.utils.ts
│
├── assets/                    # Static assets
│   └── images/
│
├── ios/                       # iOS native code
├── android/                   # Android native code
└── package.json
```

## 🎯 Module Overview

### 1. Components (`src/components/`)

#### Core Components (`core/`)
Base UI building blocks used throughout the app.

- **`themed-text.tsx`**: Text component with theme support
- **`themed-view.tsx`**: View container with theme support
- **`haptic-tab.tsx`**: Tab button with haptic feedback

#### Feature Components (`features/`)
Complex, feature-specific components.

- **`today-view.tsx`**: Main daily task view (ADHD-focused single task)
- **`mood-checkin-stt.tsx`**: Voice-based mood tracking with STT
- **`google-calendar-connect.tsx`**: Google Calendar OAuth integration
- **`calm-ui-toggle.tsx`**: Accessibility settings toggle
- **`profile-icon-button.tsx`**: User profile button
- **`streak-card.tsx`**: Gamification (non-shaming)
- **`task-bubble.tsx`**: Individual task display

#### UI Components (`ui/`)
Reusable UI components (shadcn-inspired).

- Buttons, Cards, Inputs, etc.
- Each component is self-contained with JSDoc documentation

### 2. Services (`src/services/`)

#### API Service (`api/`)
Backend communication layer.

**`client.ts`** - Base API client
```typescript
/**
 * Base API client with error handling and authentication
 */
export class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async get<T>(endpoint: string): Promise<T> { }
  async post<T>(endpoint: string, data: any): Promise<T> { }
  async put<T>(endpoint: string, data: any): Promise<T> { }
  async delete<T>(endpoint: string): Promise<T> { }
}
```

**`users.api.ts`** - User endpoints
```typescript
export const usersApi = {
  createUser: (data: CreateUserRequest) => Promise<User>,
  getUserByEmail: (email: string) => Promise<User>,
  getProfile: (userId: string) => Promise<UserProfile>,
  updateProfile: (userId: string, data: Partial<UserProfile>) => Promise<UserProfile>
};
```

**`mood.api.ts`** - Mood endpoints
```typescript
export const moodApi = {
  submitCheckin: (data: MoodCheckinRequest) => Promise<MoodCheckin>,
  getHistory: (userId: string, limit?: number) => Promise<MoodCheckin[]>,
  getPatterns: (userId: string) => Promise<MoodPattern[]>
};
```

#### Auth Service (`auth/`)
Authentication providers.

- **`auth0.service.ts`**: Auth0 integration
- **`google-auth.service.ts`**: Google OAuth for Calendar

#### Storage Service (`storage/`)
Local data persistence.

- **`profile.storage.ts`**: User profile (expo-secure-store)
- **`secure.storage.ts`**: Sensitive data wrapper

#### Notifications Service (`notifications/`)
Push notifications with 10-3-1 system.

- **`notification.service.ts`**: Schedule & send notifications

### 3. Hooks (`src/hooks/`)

Custom React hooks for common patterns.

- **`use-auth0.ts`**: Auth0 authentication state
- **`use-profile.ts`**: User profile management
- **`use-api.ts`**: API call with loading/error states
- **`use-haptics.ts`**: Haptic feedback wrapper

### 4. Types (`src/types/`)

TypeScript type definitions.

- **`neuro-profile.ts`**: Core neurodivergent profile types
- **`api.types.ts`**: API request/response types
- **`navigation.types.ts`**: Expo Router navigation types

### 5. Constants (`src/constants/`)

Configuration and constants.

- **`calm-theme.ts`**: Design tokens (colors, spacing, typography)
- **`config.ts`**: App configuration
- **`api-endpoints.ts`**: API endpoint URLs

### 6. Utils (`src/utils/`)

Utility functions.

- **`supabase.ts`**: Supabase client initialization
- **`format.utils.ts`**: Date/time formatting
- **`validation.utils.ts`**: Input validation

## 🚀 Usage Examples

### Making an API Call
```typescript
import { moodApi } from '@/services/api';

// In component
const handleMoodCheckin = async () => {
  try {
    const result = await moodApi.submitCheckin({
      userId: user.id,
      transcription: "Feeling stressed today..."
    });
    console.log('Mood analysis:', result.moodScore);
  } catch (error) {
    console.error('Failed to submit mood:', error);
  }
};
```

### Using Custom Hook
```typescript
import { useProfile } from '@/hooks/use-profile';

function ProfileScreen() {
  const { profile, loading, updateProfile } = useProfile();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <View>
      <Text>{profile.displayName}</Text>
      <Button onPress={() => updateProfile({ displayName: 'New Name' })} />
    </View>
  );
}
```

### Accessing Storage
```typescript
import { profileStorage } from '@/services/storage';

// Save profile
await profileStorage.saveProfile(profile);

// Load profile
const profile = await profileStorage.loadProfile();
```

## 🔄 Migration from Old Structure

### Before (Old Structure)
```
client/
├── lib/
│   ├── api-client.ts          # All API calls in one file
│   ├── profile-store.ts       # Storage mixed with API
│   └── notification-manager.ts
├── components/
│   ├── today-view.tsx         # Feature components
│   ├── mood-checkin-stt.tsx
│   └── themed-text.tsx        # Core components
└── types/
    └── neuro-profile.ts
```

### After (New Structure)
```
client/
├── src/
│   ├── services/
│   │   ├── api/               # API calls separated by domain
│   │   │   ├── users.api.ts
│   │   │   ├── mood.api.ts
│   │   │   └── schedules.api.ts
│   │   ├── storage/           # Storage service
│   │   │   └── profile.storage.ts
│   │   └── notifications/     # Notifications service
│   │       └── notification.service.ts
│   ├── components/
│   │   ├── core/              # Core UI separated
│   │   │   └── themed-text.tsx
│   │   └── features/          # Feature components
│   │       ├── today-view.tsx
│   │       └── mood-checkin-stt.tsx
│   └── types/
│       └── neuro-profile.ts
```

## 📝 Coding Standards

### Component Documentation
```typescript
/**
 * TodayView - Displays single-focus daily task for ADHD users
 * 
 * @description
 * Shows ONLY the next immediate task with 3-5 micro-steps.
 * Implements cognitive load reduction by hiding future tasks.
 * 
 * @example
 * ```tsx
 * <TodayView userId="user-123" onComplete={handleComplete} />
 * ```
 * 
 * @accessibility
 * - High contrast (WCAG AAA)
 * - Large touch targets (56px)
 * - Respects reducedAnimation preference
 */
export function TodayView({ userId, onComplete }: TodayViewProps) {
  // Component code
}
```

### Service Documentation
```typescript
/**
 * Mood API Service
 * 
 * @module services/api/mood
 * @description Handles mood check-in submissions and pattern retrieval
 */

/**
 * Submit a mood check-in with STT transcription
 * 
 * @param {MoodCheckinRequest} data - Transcription and metadata
 * @returns {Promise<MoodCheckin>} Analyzed mood with recommendations
 * 
 * @example
 * const result = await moodApi.submitCheckin({
 *   userId: 'user-123',
 *   transcription: 'Feeling great today!'
 * });
 */
export async function submitCheckin(data: MoodCheckinRequest): Promise<MoodCheckin> {
  // Implementation
}
```

## 🎨 Design Principles

### 1. Neurodivergent-First Design
Every component MUST consider:
- ✅ Cognitive load (max 2 choices per screen)
- ✅ Sensory preferences (reduced animation, high contrast)
- ✅ Executive function (micro-steps, timers, reminders)

### 2. Type Safety
- All components have explicit prop types
- No `any` types (use `unknown` if needed)
- API responses are fully typed

### 3. Error Handling
```typescript
// Always handle errors gracefully
try {
  await api.submitCheckin(data);
} catch (error) {
  // Log for debugging
  console.error('Mood check-in failed:', error);
  
  // Show user-friendly message
  Alert.alert(
    'Unable to save mood',
    'Try again when connected to internet.',
    [{ text: 'OK', style: 'default' }]
  );
}
```

### 4. Loading States
```typescript
function MoodHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  
  if (loading) return <LoadingSpinner />;
  if (!history.length) return <EmptyState />;
  
  return <MoodList data={history} />;
}
```

## 🧪 Testing

### Component Testing
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { TodayView } from '@/components/features/today-view';

describe('TodayView', () => {
  it('shows only next task', () => {
    const { getByText, queryByText } = render(
      <TodayView userId="test-user" />
    );
    
    expect(getByText('Put on shoes')).toBeTruthy();
    expect(queryByText('Future task')).toBeNull();
  });
});
```

### API Testing
```typescript
import { moodApi } from '@/services/api/mood';

describe('moodApi', () => {
  it('submits mood check-in', async () => {
    const result = await moodApi.submitCheckin({
      userId: 'test-user',
      transcription: 'Test mood'
    });
    
    expect(result.moodScore).toBeGreaterThan(0);
  });
});
```

## 🔧 Development Workflow

### Adding a New Feature

1. **Define types** in `src/types/`
2. **Create API service** in `src/services/api/`
3. **Create custom hook** in `src/hooks/` (if needed)
4. **Build component** in `src/components/features/`
5. **Add route** in `app/` (if new screen)
6. **Document** with JSDoc comments

### Example: Adding "Journaling" Feature

1. Types:
```typescript
// src/types/journal.types.ts
export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  moodScore: number;
  createdAt: Date;
}
```

2. API:
```typescript
// src/services/api/journal.api.ts
export const journalApi = {
  createEntry: (data: CreateEntryRequest) => Promise<JournalEntry>,
  getEntries: (userId: string) => Promise<JournalEntry[]>
};
```

3. Hook:
```typescript
// src/hooks/use-journal.ts
export function useJournal(userId: string) {
  const [entries, setEntries] = useState([]);
  // Hook logic
  return { entries, addEntry, loading };
}
```

4. Component:
```typescript
// src/components/features/journal-view.tsx
export function JournalView({ userId }: Props) {
  const { entries, addEntry } = useJournal(userId);
  // Component logic
}
```

5. Route:
```typescript
// app/journal.tsx
import { JournalView } from '@/components/features/journal-view';

export default function JournalScreen() {
  return <JournalView userId={user.id} />;
}
```

## 📦 Import Aliases

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"],
      "@constants/*": ["src/constants/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

Usage:
```typescript
import { TodayView } from '@/components/features/today-view';
import { moodApi } from '@/services/api/mood';
import { useProfile } from '@/hooks/use-profile';
```

## 🚦 Performance Optimization

### Code Splitting
```typescript
// Lazy load heavy screens
const MoodHistory = lazy(() => import('./screens/mood-history'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MoodHistory />
    </Suspense>
  );
}
```

### Memoization
```typescript
// Prevent unnecessary re-renders
const MoodCard = memo(({ entry }: Props) => {
  return <Card>{entry.content}</Card>;
});

// Memoize expensive calculations
const sortedEntries = useMemo(
  () => entries.sort((a, b) => b.createdAt - a.createdAt),
  [entries]
);
```

## 🔐 Security Considerations

### Secure Storage
- Use `expo-secure-store` for sensitive data (auth tokens)
- Never store plaintext passwords
- Clear sensitive data on logout

### API Security
- Always use HTTPS in production
- Include auth tokens in headers
- Validate all user input
- Handle errors without exposing internal details

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [DESIGN_PATTERNS.md](../DESIGN_PATTERNS.md) - UX guidelines
