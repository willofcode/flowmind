# Neurodivergent Design Patterns - Quick Reference

## 🎯 Core Principles

### 1. Reduce Cognitive Load
**Problem:** Decision fatigue, analysis paralysis  
**Solutions:**
- ✅ Show ONE task at a time (Today View)
- ✅ Max 2 choices (A/B alternatives)
- ✅ Hide complexity until needed
- ✅ Clear visual hierarchy (32px → 20px → 16px)
- ❌ Avoid: Multiple tabs, complex menus, many options

### 2. Support Executive Function
**Problem:** Difficulty starting tasks, breaking down goals  
**Solutions:**
- ✅ Micro-steps (3-5 concrete actions)
- ✅ Time estimates per step
- ✅ Progress checkboxes
- ✅ Big "Start" button (removes decision barrier)
- ❌ Avoid: Vague instructions ("get ready"), no guidance

### 3. Respect Sensory Needs
**Problem:** Overstimulation from UI/sounds  
**Solutions:**
- ✅ Reduced/zero animation mode
- ✅ Haptics over sound
- ✅ High contrast (7:1 ratio)
- ✅ Silent mode option
- ✅ Calm color palette (no bright reds/oranges)
- ❌ Avoid: Flashy animations, loud alerts, low contrast

### 4. Build Routine & Predictability
**Problem:** Habit formation difficulties  
**Solutions:**
- ✅ Same time windows daily
- ✅ Consistent structure (every task looks the same)
- ✅ Buffers before/after (10 min default)
- ✅ Predictable reminder timing (10-3-1)
- ❌ Avoid: Random scheduling, varied formats, surprises

### 5. Remove Shame & Guilt
**Problem:** Rejection sensitivity, perfectionism  
**Solutions:**
- ✅ "Skip" always visible (no hiding)
- ✅ Gentle language ("Put on shoes" not "HURRY!")
- ✅ No streak shame if skipped
- ✅ Celebrate completions (haptic feedback)
- ❌ Avoid: Guilt-tripping, aggressive language, punishment

---

## 📱 UI Components Checklist

### Today View Card
- [ ] Large title (32px, bold, high contrast)
- [ ] Time displayed clearly (18px)
- [ ] 3-5 micro-steps with checkboxes
- [ ] Big "Start" button (56px height, 100% width)
- [ ] Alternative option below (not hidden)
- [ ] Skip button always visible
- [ ] No animations (or optional)

### Buttons
- [ ] Minimum 48px height (preferably 56px)
- [ ] Clear label (not icons only)
- [ ] Haptic feedback on press
- [ ] High contrast (3:1 minimum for AA, 4.5:1 for AAA)
- [ ] Distinct visual states (default, pressed, disabled)

### Forms (Profile Setup)
- [ ] One question per screen
- [ ] Large form fields (48px+ height)
- [ ] Clear labels above fields
- [ ] Help text below (not tooltips)
- [ ] Progress indicator ("Step 2 of 5")
- [ ] No required validation until submit

### Notifications
- [ ] Short, concrete message ("Fill water bottle")
- [ ] Option to disable sound
- [ ] Haptic-only mode
- [ ] Predictable timing (10-3-1 pattern)
- [ ] Never aggressive ("WORKOUT NOW" ❌)

---

## 🎨 Color & Typography

### High Contrast Colors (Calm Theme)

**Light Mode:**
- Background: `#F8F9FA` (not stark white)
- Text: `#1A1A1A` (true black)
- Primary: `#2D7A8F` (calming teal)
- Success: `#3A8F3D` (gentle green)
- Warning: `#D97706` (warm orange, not red)

**Dark Mode:**
- Background: `#0F1419` (true dark)
- Text: `#E8E8E8` (reduced brightness)
- Primary: `#4A9BAF` (lighter teal)
- Success: `#5AAF5D`
- Warning: `#F59E0B`

**Avoid:**
- Bright reds (anxiety-inducing)
- Neon colors (sensory overload)
- Low contrast grays (hard to read)

### Typography
- Base size: **16px** (not 14px)
- Line height: **1.5** (relaxed, not tight)
- Font weight: **600** for headers (clear hierarchy)
- Font family: System fonts (predictable)

---

## ⏰ Timing Patterns

### 10-3-1 Nudge System
```
Event at 10:00 AM
├─ 9:50 AM: "Starting in 10 min. Put on shoes."
├─ 9:57 AM: "3 minutes. Fill water bottle."
└─ 9:59 AM: "1 minute. Start route."
```

**Why this works:**
- 10 min: Enough time to prepare without rushing
- 3 min: Final prep reminder
- 1 min: Transition cue (start now)
- Predictable pattern reduces anxiety

### Buffer Policy
```
Calendar event: 10:00 - 10:30
With buffers:   9:50 - 10:40

├─ 9:50-10:00: Buffer (arrive early, reduce rushing)
├─ 10:00-10:30: Actual activity
└─ 10:30-10:40: Buffer (cool down, transition)
```

**Benefits:**
- No back-to-back tasks (avoids overwhelm)
- Time to mentally prepare
- Flexibility for delays (low stress)

---

## 🧩 Micro-Step Formula

### Good Micro-Steps ✅
1. **Concrete:** "Put on running shoes"
2. **Time-bound:** "~2 min"
3. **Single action:** One verb per step
4. **Sequential:** Logical order
5. **Achievable:** No complexity

### Bad Steps ❌
- "Get ready" (too vague)
- "Prepare workout and meals for the day" (too big)
- "Feel motivated" (not actionable)
- Steps without time estimates
- Non-sequential jumps

### Example: "Morning Walk"
```
✅ Good:
1. Put on comfortable shoes (2 min)
2. Fill water bottle (1 min)
3. Start 10-minute walk route (10 min)

❌ Bad:
1. Get ready for walk
2. Do the walk
```

---

## 🔄 State Management

### Task States
- `upcoming`: Show "Start" button
- `in-progress`: Show "Complete" button
- `completed`: Celebrate (haptic), load next
- `skipped`: No guilt, load next

**Key:** Always clear what state user is in (visual + label).

---

## 🗣️ Language Guidelines

### Do Use:
- "Put on shoes" (concrete)
- "Starting soon" (gentle)
- "Not feeling it?" (compassionate)
- "Skip for today" (no guilt)
- "Great job!" (positive reinforcement)

### Don't Use:
- "HURRY UP!" (aggressive)
- "You must..." (demanding)
- "Don't forget..." (shame-inducing)
- "Why haven't you..." (guilt-tripping)
- Multiple exclamation marks!!!

---

## 📊 User Testing Checklist

### Accessibility
- [ ] VoiceOver reads all elements correctly
- [ ] Buttons have descriptive labels
- [ ] Touch targets ≥48px
- [ ] Color contrast ≥7:1 (AAA)
- [ ] Works with Reduce Motion enabled
- [ ] Works with larger text sizes (Dynamic Type)

### Neurodivergent UX
- [ ] Only one task visible at a time
- [ ] Skip option always present
- [ ] Micro-steps are concrete (not vague)
- [ ] Haptic feedback on all interactions
- [ ] No unexpected changes (predictable)
- [ ] Timers/countdowns optional (not forced)

### Real Device Testing
- [ ] Test on iPhone (not just simulator)
- [ ] Enable Reduce Motion in iOS Settings
- [ ] Enable VoiceOver
- [ ] Test in different lighting (contrast)
- [ ] Test haptics on actual device

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This
1. **Too many choices:** "Pick from 10 workout types"
2. **Vague steps:** "Prepare for workout"
3. **Aggressive nudges:** "WORKOUT NOW!!! ⚠️"
4. **Hidden skip:** User has to dig to find way out
5. **Complex nav:** Deep menu hierarchies
6. **Surprise changes:** "We moved your workout!"
7. **Shame language:** "You missed 3 days..."
8. **Low contrast:** Gray text on gray background
9. **Tiny buttons:** 32px touch targets
10. **Sound-only alerts:** No haptic alternative

### ✅ Do This Instead
1. **A/B choice:** "Walk or Stretching?"
2. **Concrete steps:** "Put on shoes"
3. **Gentle nudges:** "Starting soon. Put on shoes."
4. **Skip visible:** Always-present button
5. **Flat nav:** Max 2 levels deep
6. **Consistent:** Same structure every day
7. **Positive:** "3 completed this week! 🎉"
8. **High contrast:** 7:1 ratio minimum
9. **Large targets:** 48-56px minimum
10. **Haptics first:** Sound optional

---

## 🔗 Resources

### Tools
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Xcode Accessibility Inspector:** Built into Xcode
- **iOS Settings:** Settings → Accessibility → Motion → Reduce Motion

### Research
- ADHD-friendly design patterns
- Autism accessibility guidelines (Microsoft)
- WCAG 2.1 AAA standards

### Testing
- Recruit beta testers from neurodivergent community
- Test in real-world scenarios (not lab)
- Gather feedback on sensory preferences

---

**Remember:** Design WITH neurodivergent users, not FOR them. 🧠
