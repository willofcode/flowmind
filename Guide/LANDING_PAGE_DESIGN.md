# FlowMind Landing Page Design

## Overview
The landing page serves as the entry point for FlowMind, presenting a sleek, neurodivergent-friendly sign-in/sign-up experience.

## Design Principles

### 1. **Calm Entrance Animation**
- Logo fades in with gentle scale animation (0.8 → 1.0)
- Content fades in sequentially to avoid overwhelming users
- Buttons slide up smoothly with spring physics
- Total animation duration: ~1.8 seconds

### 2. **Visual Hierarchy**
```
┌─────────────────────────────────┐
│     [Background Accent]          │ ← Subtle color wash
│                                   │
│         🧠 Brain Icon            │ ← Large, rounded container
│         FlowMind                 │ ← 48px bold app name
│    Your neurodivergent-friendly │ ← 18px tagline
│     planning companion           │
│                                   │
│   ✓ ADHD-Aware  🧠 AI-Powered   │ ← Feature pills
│       📅 Smart Scheduling         │
│                                   │
│   ┌─────────────────────────┐   │
│   │  Get Started         →   │   │ ← Primary CTA
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ I Already Have Account  │   │ ← Secondary CTA
│   └─────────────────────────┘   │
│   Learn more about FlowMind →   │ ← Tertiary link
│                                   │
│  Designed for ADHD, autistic,   │ ← Footer note
│       and dyslexic users         │
└─────────────────────────────────┘
```

### 3. **Neurodivergent-Friendly Features**

#### Large Touch Targets
- Primary button: 56px height (CalmSpacing.comfortableTouchTarget)
- Secondary button: 56px height
- Navigation buttons: 48px minimum
- All pressable areas exceed WCAG guidelines

#### Clear Visual Feedback
- Haptic feedback on all interactions (Medium/Light)
- Opacity change on press (1.0 → 0.85)
- Scale transform on button press (1.0 → 0.98)
- Smooth transitions (no jarring changes)

#### High Contrast Colors
- Icon container: Primary blue (#4A9BAF)
- Text: Respects calm theme (text/textSecondary/textTertiary)
- Background: Clean, minimal
- Feature pills: Surface color with subtle borders

#### Reduced Cognitive Load
- One primary action: "Get Started"
- One secondary action: "I Already Have an Account"
- Optional tertiary action: "Learn more"
- No competing CTAs or distractions

### 4. **Component Breakdown**

#### Logo Section
```tsx
<Animated.View>
  <View style={iconContainer}>
    <IconSymbol name="brain.head.profile" size={72} />
  </View>
  <Text style={appName}>FlowMind</Text>
  <Text style={tagline}>Your neurodivergent-friendly</Text>
  <Text style={tagline}>planning companion</Text>
</Animated.View>
```
- 140x140px rounded container (35px radius)
- Brain icon (SF Symbol) at 72px
- Soft shadow with primary color (#4A9BAF)
- App name: 48px, -1 letter spacing for tightness
- Tagline: 18px, 26px line height for readability

#### Feature Pills
```tsx
<View style={featuresContainer}>
  <View style={featurePill}>
    <IconSymbol /> + <Text>ADHD-Aware Design</Text>
  </View>
  <!-- More pills -->
</View>
```
- Horizontal scrolling row with gap
- Each pill: 20px icon + 14px bold text
- Surface background with 1px border
- 20px border radius (full pill shape)
- Icons color-coded: ✓ (success), 🧠 (primary), 📅 (warning)

#### Primary Button ("Get Started")
```tsx
<Pressable style={primaryButton}>
  <Text>Get Started</Text>
  <IconSymbol name="arrow.right.circle.fill" />
</Pressable>
```
- Primary color background (#4A9BAF)
- 20px bold text + 24px icon
- 16px border radius (rounded rectangle)
- Shadow: 4px offset, 0.3 opacity, 12px radius
- White text for maximum contrast

#### Secondary Button ("I Already Have an Account")
```tsx
<Pressable style={secondaryButton}>
  <Text>I Already Have an Account</Text>
</Pressable>
```
- Surface background with 2px border
- 18px semibold text (respects theme colors)
- 16px border radius
- No shadow (flatter appearance)

#### Learn More Link
```tsx
<Pressable style={learnMoreButton}>
  <Text>Learn more about FlowMind</Text>
  <IconSymbol name="chevron.right" size={16} />
</Pressable>
```
- Text secondary color (lower hierarchy)
- 16px text + small chevron icon
- Minimal padding (not as prominent as buttons)

### 5. **Animation Details**

#### Entrance Sequence
1. **Logo animation** (0-800ms)
   - Opacity: 0 → 1
   - Scale: 0.8 → 1.0
   - Spring physics (tension: 50, friction: 7)

2. **Content fade** (800-1400ms)
   - Opacity: 0 → 1
   - 200ms delay after logo
   - Duration: 600ms

3. **Button slide** (1400-1800ms)
   - TranslateY: 50px → 0
   - Spring physics (tension: 40, friction: 8)
   - Smooth upward motion

#### Press Animations
- Opacity: 1.0 → 0.85 (instant)
- Scale: 1.0 → 0.98 (instant)
- Haptic feedback fires immediately
- Creates "button press" tactile feel

### 6. **Color Palette**

#### Light Mode
- Background: `colors.background` (white)
- Text: `colors.text` (near-black)
- Icon container: `colors.primary` (#4A9BAF blue)
- Accent: `rgba(74, 155, 175, 0.05)` (subtle blue wash)
- Surface: `colors.surface` (off-white)

#### Dark Mode
- Background: `colors.background` (dark gray)
- Text: `colors.text` (near-white)
- Icon container: `colors.primary` (#4A9BAF blue)
- Accent: `rgba(74, 155, 175, 0.08)` (slightly brighter wash)
- Surface: `colors.surface` (lighter gray)

### 7. **Responsive Considerations**

#### Screen Size Adaptation
- Uses `Dimensions.get('window')` for responsive layout
- Logo section: `flex: 1` (takes available space)
- Actions container: Fixed at bottom with padding
- Footer: Anchored to bottom with safe area

#### Accessibility
- StatusBar: Adapts to light/dark mode
- All text: Respects theme colors
- Touch targets: Exceed 48x48px minimum
- Haptics: Provide non-visual feedback
- High contrast: WCAG AAA compliance

### 8. **Navigation Flow**

#### Current Implementation
```
Landing Page
├── "Get Started" → /(tabs) [TODO: Sign-up flow]
├── "I Already Have an Account" → /(tabs) [TODO: Sign-in flow]
└── "Learn More" → [TODO: Info modal/external link]
```

#### Future Implementation
```
Landing Page
├── "Get Started" → /sign-up → Google OAuth → /(tabs)
├── "I Already Have an Account" → /sign-in → Google OAuth → /(tabs)
└── "Learn More" → /about (modal)
```

### 9. **File Structure**
```
app/
├── landing.tsx          # Landing page (this file)
├── index.tsx            # Redirect to /landing
├── _layout.tsx          # Root layout (initialRouteName: 'landing')
└── (tabs)/              # Main app tabs (after authentication)
```

### 10. **Next Steps**

#### Priority 1: Authentication Screens
- [ ] Create `app/sign-in.tsx` for existing users
- [ ] Create `app/sign-up.tsx` for new users
- [ ] Implement Google OAuth flow (not stub)
- [ ] Store auth tokens in SecureStore
- [ ] Redirect authenticated users to /(tabs)

#### Priority 2: Auth State Management
- [ ] Check auth state on landing page mount
- [ ] Auto-redirect if already authenticated
- [ ] Add loading state during auth check
- [ ] Handle auth errors gracefully

#### Priority 3: Info/About Screen
- [ ] Create `app/about.tsx` modal
- [ ] Explain neurodivergent-friendly features
- [ ] Link to privacy policy, terms
- [ ] Add contact/support information

### 11. **Testing Checklist**

#### Visual Testing
- [ ] Logo animation smooth on iOS/Android
- [ ] Buttons respond to press with feedback
- [ ] Light/dark mode colors correct
- [ ] Feature pills wrap properly on small screens
- [ ] Footer text visible and centered

#### Interaction Testing
- [ ] Haptics fire on button press
- [ ] Navigation to tabs works
- [ ] Learn More link responds
- [ ] All touch targets ≥48px
- [ ] Press animations smooth

#### Accessibility Testing
- [ ] VoiceOver reads all elements
- [ ] Dynamic type respected
- [ ] High contrast mode supported
- [ ] Reduced motion respected (if implemented)

---

## Design Rationale

### Why This Approach?

1. **Minimal Cognitive Load**: Only 2 main actions reduces decision paralysis
2. **Clear Hierarchy**: Primary button visually dominant, secondary clearly different
3. **Warm Welcome**: Gentle animations and warm colors create calm entry
4. **Trust Building**: Feature pills communicate value immediately
5. **Neurodivergent Focus**: Footer reinforces target audience and inclusivity

### Rejected Alternatives

- ❌ **Multi-step onboarding**: Too many screens before value
- ❌ **Video background**: Too distracting, high sensory load
- ❌ **Carousel/slides**: Adds navigation burden, slows entry
- ❌ **Social proof**: Clutters minimal design, adds text
- ❌ **Aggressive CTAs**: "Sign up NOW!" creates pressure

### Success Metrics

- Time to sign-in/sign-up: <30 seconds
- Animation smoothness: 60fps
- Button tap success rate: >95%
- User feedback: "Calm", "Clear", "Welcoming"

---

**Last Updated:** January 6, 2025  
**Designer:** Copilot + User  
**Status:** ✅ Initial implementation complete
