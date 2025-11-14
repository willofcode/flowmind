/**
 * Quick TTS Test Script
 * Run: node test-tts.ts (after compiling to JS)
 * Or import in app and call testTTS()
 */

import { speakWelcome, speakBreathingPhase, speakAIResponse } from './lib/elevenlabs-tts';

export async function testTTS() {
  console.log('🎙️ Testing ElevenLabs TTS...\n');

  try {
    console.log('1️ Testing welcome message...');
    await speakWelcome('Sarah');
    console.log('✅ Welcome message complete\n');

    console.log('2️ Testing breathing phase...');
    await speakBreathingPhase('Inhale', 'Breathe in slowly through your nose');
    console.log('✅ Breathing phase complete\n');

    console.log('3️ Testing AI response...');
    await speakAIResponse('I understand you\'re feeling stressed. Let\'s try a breathing exercise together.');
    console.log('✅ AI response complete\n');

    console.log('All TTS tests passed!');
  } catch (error) {
    console.error('TTS test failed:', error);
  }
}

// Usage in React component:
// import { testTTS } from '@/test-tts';
// 
// <Pressable onPress={testTTS}>
//   <Text>Test TTS</Text>
// </Pressable>
