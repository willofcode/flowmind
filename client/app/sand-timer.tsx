/**
 * Sand Timer Interface
 * Calm, visual timer with physics-based sand animation trickling from above
 * Neurodivergent-friendly: Visual progress, no numbers counting up/down
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CalmColors } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Sand particle configuration
const NUM_PARTICLES = 150; // More particles for better effect
const PARTICLE_SIZE = 3;
const FALL_SPEED_MIN = 2;
const FALL_SPEED_MAX = 4;

interface Particle {
  id: number;
  x: number;
  y: number;
  speed: number;
  opacity: number;
}

export default function SandTimer() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const insets = useSafeAreaInsets();
  
  const params = useLocalSearchParams();
  const durationMinutes = parseInt(params.duration as string) || 10;
  const taskTitle = (params.title as string) || 'Timer';
  const taskId = params.taskId as string;
  
  const [isRunning, setIsRunning] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // seconds
  const [particles, setParticles] = useState<Particle[]>([]);
  const [fillLevel, setFillLevel] = useState(0); // 0 to 1 for particle collision
  
  const animationFrame = useRef<number | undefined>(undefined);
  const lastFrame = useRef<number>(Date.now());
  
  // Sand fill progress (0 to 1)
  const fillProgress = useSharedValue(0);
  
  // Single source position (absolute top of screen for true full-screen effect)
  const SOURCE_X = SCREEN_WIDTH / 2;
  const SOURCE_Y = 0; // Start from absolute top (0) for full-screen sand pour
  const SOURCE_SPREAD = 15; // Very tight spread for clean single-source look
  
  // Initialize particles from single source
  useEffect(() => {
    const initialParticles: Particle[] = [];
    
    // Gaussian distribution helper for natural clustering
    const gaussianRandom = () => {
      let u = 0, v = 0;
      while(u === 0) u = Math.random();
      while(v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    
    for (let i = 0; i < NUM_PARTICLES; i++) {
      // Very tight Gaussian spread - most particles at center
      const spread = gaussianRandom() * (SOURCE_SPREAD / 4);
      initialParticles.push({
        id: i,
        x: SOURCE_X + spread,
        y: SOURCE_Y + (i * 2), // Stagger slightly downward only (no negative y)
        speed: FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN),
        opacity: 0.7 + Math.random() * 0.3,
      });
    }
    setParticles(initialParticles);
  }, []);
  
  // Physics animation loop for falling sand
  useEffect(() => {
    if (!isRunning) return;
    
    const gaussianRandom = () => {
      let u = 0, v = 0;
      while(u === 0) u = Math.random();
      while(v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastFrame.current) / 16; // Normalize to 60fps
      lastFrame.current = now;
      
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          let newY = particle.y + particle.speed * deltaTime;
          
          // Reset particle if it reaches the fill level (use state, not shared value)
          const fillHeight = SCREEN_HEIGHT * (1 - fillLevel);
          if (newY > fillHeight) {
            // Reset to exact source position with very tight Gaussian spread
            const spread = gaussianRandom() * (SOURCE_SPREAD / 4);
            return {
              ...particle,
              x: SOURCE_X + spread,
              y: SOURCE_Y, // Reset to exact source, no offset
              speed: FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN),
            };
          }
          
          return { ...particle, y: newY };
        })
      );
      
      animationFrame.current = requestAnimationFrame(animate);
    };
    
    animationFrame.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isRunning, fillLevel]);
  
  // Timer logic
  useEffect(() => {
    if (isRunning) {
      // Animate fill progress
      fillProgress.value = withTiming(1, {
        duration: durationMinutes * 60 * 1000,
        easing: Easing.linear,
      }, (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      });
      
      // Countdown timer and update fillLevel for particles
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          const newTime = prev - 1;
          // Update fill level for particle collision detection
          const progress = 1 - (newTime / (durationMinutes * 60));
          setFillLevel(progress);
          return newTime;
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        cancelAnimation(fillProgress);
      };
    } else {
      // Pause animation
      cancelAnimation(fillProgress);
    }
  }, [isRunning, durationMinutes]);
  
  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };
  
  const handlePause = () => {
    setIsRunning(!isRunning);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };
  
  // Animated fill style
  const fillAnimatedStyle = useAnimatedStyle(() => ({
    height: `${fillProgress.value * 100}%`,
  }));
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Sand color
  const sandColor = colorScheme === 'dark' ? '#D4AF88' : '#E8C9A1';
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sand fill from bottom - extends to absolute top */}
      <Animated.View 
        style={[
          styles.sandFill,
          { backgroundColor: sandColor },
          fillAnimatedStyle
        ]}
      />
      
      {/* Falling sand particles */}
      {particles.map(particle => (
        <View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              backgroundColor: sandColor,
              opacity: particle.opacity,
            }
          ]}
        />
      ))}
      
      {/* Content overlay */}
      <View style={styles.overlay}>
        {/* Close button - Top Right with proper safe area */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }} />
          <Pressable 
            onPress={handleSkip} 
            style={[
              styles.closeButton,
              { backgroundColor: `${colors.surface}DD` } // 87% opacity background for better visibility
            ]}
          >
            <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
          </Pressable>
        </View>
        
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          <Text style={[styles.timeText, { color: colors.text }]}>
            {formatTime(timeRemaining)}
          </Text>
          
          <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
            {timeRemaining > durationMinutes * 30 
              ? "You're doing great 🌿" 
              : timeRemaining > durationMinutes * 10
              ? "Almost there ✨"
              : "Final moments 🎉"}
          </Text>
        </View>
        
        {/* Bottom controls with safe area */}
        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable 
            style={[styles.controlButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={handlePause}
          >
            <Text style={[styles.controlIcon, { color: colors.text }]}>
              {isRunning ? '⏸' : '▶'}
            </Text>
            <Text style={[styles.controlText, { color: colors.text }]}>
              {isRunning ? 'Pause' : 'Resume'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={[styles.controlButton, styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={handleComplete}
          >
            <Text style={[styles.controlIcon, { color: '#FFFFFF' }]}>✓</Text>
            <Text style={[styles.controlText, { color: '#FFFFFF' }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent', // Ensure no background blocks
  },
  sandFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    // paddingTop is set dynamically with safe area insets
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeText: {
    fontSize: 28,
    fontWeight: '300',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: -0.5,
  },
  timeText: {
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    marginTop: 20,
  },
  encouragement: {
    fontSize: 20,
    marginTop: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    // paddingBottom is set dynamically with safe area insets
  },
  controlButton: {
    flex: 1,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButton: {
    flex: 1.2,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
