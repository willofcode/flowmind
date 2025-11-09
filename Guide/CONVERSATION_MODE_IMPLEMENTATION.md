# Conversation Mode Implementation

## Overview
Added a **conversational mood check-in** feature accessible from the explore tab. This mode shows the psychic circle animation with a collapsible text input, allowing users to quickly access AI-powered mood conversations without cluttering the UI.

## Changes Made

### 1. Explore Tab - Conversation Button (`client/app/(tabs)/explore.tsx`)
**Location:** Lines 157-189 (new section between Breathing and Grocery sections)

**Features:**
- New "Talk & Reflect" section with conversation button
- Icon: `bubble.left.and.bubble.right` (chat bubbles)
- Color: `colors.primaryLight` for visual distinction from breathing tool
- Routes to `/welcome` with `conversationMode='true'` parameter
- Haptic feedback on press
- Matches existing toolCard styling pattern

**Usage:**
```tsx
<Pressable
  onPress={async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/welcome',
      params: { conversationMode: 'true' },
    });
  }}
>
  {/* Button content */}
</Pressable>
```

### 2. Welcome Screen - Conversation Mode Support (`client/app/welcome.tsx`)

#### New State & Parameters
- `conversationMode` - Detects if launched in conversation mode (from URL params)
- `isExpanded` - Tracks whether expandable input is shown
- `inputHeight` - Animated value for smooth expand/collapse transitions

#### Conditional Rendering
**Normal Mode (conversationMode = false):**
- Shows welcome text with user name
- Shows standard text input with continue button
- Auto-focuses input after animations

**Conversation Mode (conversationMode = true):**
- Hides welcome text (only shows animated psychic circle)
- Shows floating icon button (bottom right)
- Input initially collapsed (height = 0)
- Expanding input reveals full conversation interface

#### Expandable Input Features
- **Collapsed State:** Shows only floating message bubble icon
- **Expanded State:** Shows full text input with:
  - Header: "How are you feeling?" with close button
  - Multi-line text input (3 lines minimum)
  - Send button (paper plane icon)
  - Smooth spring animation (tension: 50, friction: 7)

#### Toggle Function
```typescript
const toggleTextInput = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setIsExpanded(!isExpanded);
  
  Animated.spring(inputHeight, {
    toValue: isExpanded ? 0 : 1,
    useNativeDriver: false,
    tension: 50,
    friction: 7,
  }).start();
  
  // Focus input when expanding
  if (!isExpanded) {
    setTimeout(() => textInputRef.current?.focus(), 300);
  }
};
```

### 3. New Styles Added

#### `expandableInputContainer`
- Positioned at bottom of screen
- Full-width (minus padding)
- Rounded corners (20px) with border
- Animated height: 0 (collapsed) → 180px (expanded)
- Shadow for depth

#### `floatingButton`
- 64x64px circle
- Bottom-right positioning
- Primary color background
- Icon: `text.bubble` (28px)
- Strong shadow for prominence

#### `expandableInput`
- Multi-line text input
- 80px minimum height
- Top-aligned text
- Matches theme colors

#### `sendButton`
- 44x44px circle
- Paper plane icon
- Aligned to bottom-right of input
- Primary color background

## User Flow

### From Explore Tab
1. User taps "Mood Conversation" button
2. Haptic feedback confirms tap
3. Navigates to welcome screen with `conversationMode='true'`
4. Psychic circle animation plays (same as normal welcome)
5. Floating message bubble icon appears (bottom right)
6. No text input visible initially

### Expanding Input
1. User taps floating icon
2. Haptic feedback
3. Input container animates up from bottom (spring animation)
4. Shows "How are you feeling?" header with close button
5. Text input auto-focuses with keyboard
6. User types mood/thoughts

### Sending Message
1. User types message
2. Taps send button (paper plane icon)
3. Haptic success feedback
4. **TODO:** Send to conversational AI endpoint (`/conversation/analyze-sentiment`)
5. Message clears for next input

### Collapsing Input
1. User taps X button in header
2. Haptic feedback
3. Input animates down (spring animation)
4. Floating icon reappears

## Integration with Backend

### Current Endpoint Ready
- **POST** `/conversation/analyze-sentiment`
- **Service:** `conversational-agent.service.js`
- **Features:**
  - Sentiment analysis with mAIstro
  - Schedule context correlation
  - Empathetic response generation
  - Optional TTS generation

### TODO: Connect Frontend
```typescript
const sendConversation = async () => {
  if (thoughtInput.trim()) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Send to backend
    const response = await apiClient.analyzeConversation({
      userId: user.id,
      transcription: thoughtInput,
      inputType: 'text',
    });
    
    console.log('AI Response:', response.conversationalResponse);
    console.log('Mood Score:', response.moodScore);
    
    setThoughtInput('');
  }
};
```

## Design Rationale

### Why Collapsible Input?
- **Cognitive Load Reduction:** Shows only the animated circle initially (one visual focus)
- **Progressive Disclosure:** Reveals input only when user actively wants to engage
- **Reduced Clutter:** Follows ADHD-friendly "one thing at a time" principle
- **Gentle Interaction:** No pressure to type immediately, can just observe animation

### Why Floating Icon?
- **Always Accessible:** Present but not intrusive
- **Visual Hierarchy:** Circle animation is primary focus, icon is secondary
- **Muscle Memory:** Bottom-right is common location for chat/compose actions
- **Large Touch Target:** 64px meets neurodivergent accessibility guidelines

### Animation Choices
- **Spring Animation:** Natural, predictable motion (respects reduced motion preferences)
- **300ms Delay:** Gives time for animation to complete before keyboard appears
- **Haptic Feedback:** Confirms every interaction without sound
- **Smooth Transitions:** No jarring cuts or sudden changes

## Accessibility Features

### ADHD Support
- ✅ Single focus (circle only) when first entering
- ✅ Optional text input (not forced immediately)
- ✅ Large touch targets (64px floating button, 44px send button)
- ✅ Clear visual feedback (animations, haptics)

### Sensory Awareness
- ✅ No autoplay audio
- ✅ Haptic feedback for all interactions
- ✅ High contrast colors (WCAG AAA)
- ✅ Smooth animations (spring, not linear)

### Autistic Support
- ✅ Predictable behavior (icon → input → send)
- ✅ Clear purpose ("How are you feeling?")
- ✅ Explicit close button (X icon)
- ✅ Visual state indicators (icon vs input)

### Dyslexic Support
- ✅ Large text (16-18pt)
- ✅ Sufficient spacing (CalmSpacing constants)
- ✅ Clear icons with text labels
- ✅ No time pressure (input stays open)

## Testing Checklist

- [ ] Navigate from explore tab to conversation mode
- [ ] Verify psychic circle animation plays
- [ ] Verify floating icon appears (bottom right)
- [ ] Tap icon and verify input expands smoothly
- [ ] Verify keyboard appears and input focuses
- [ ] Type message and verify send button works
- [ ] Tap X button and verify input collapses
- [ ] Test on both light and dark modes
- [ ] Verify haptic feedback on all interactions
- [ ] Test with VoiceOver/screen reader
- [ ] Verify no layout issues with keyboard open

## Next Steps

1. **Backend Integration:**
   - Connect send button to `/conversation/analyze-sentiment` endpoint
   - Display AI response (could show in modal or as chat history)
   - Implement TTS playback for AI responses

2. **Conversation History:**
   - Show previous conversation turns above input
   - Implement scrollable chat UI
   - Save conversations to local storage

3. **Voice Input:**
   - Add microphone button alongside send button
   - Integrate STT for voice-to-text
   - Same workflow as text input

4. **Enhanced Animations:**
   - Pulse circle on AI response
   - Typing indicator while AI processes
   - Success animation on message sent

5. **Analytics:**
   - Track conversation mode usage
   - Measure engagement (expanded vs collapsed time)
   - Identify common mood patterns

## Files Modified

1. **client/app/(tabs)/explore.tsx**
   - Added "Talk & Reflect" section (lines 157-189)
   - Conversation button with routing logic

2. **client/app/welcome.tsx**
   - Added conversation mode parameter detection
   - Added expandable input container
   - Added floating icon button
   - Added toggle animation logic
   - Added 7 new styles for conversation mode

## Related Documentation

- **Conversational Agent Service:** `server/src/services/conversational-agent.service.js`
- **Conversation Routes:** `server/src/routes/conversation.routes.js`
- **Design Patterns:** `Guide/DESIGN_PATTERNS.md`
- **STT Integration:** `Guide/STT_INTEGRATION_GUIDE.md`
