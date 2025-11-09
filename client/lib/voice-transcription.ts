/**
 * Voice Transcription Service
 * Uses OpenAI Whisper API for accurate speech-to-text
 */

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param audioUri - Local file URI from expo-av recording
 * @returns Transcribed text
 */
export async function transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OpenAI API key not configured, using mock transcription');
    return {
      text: "I'm feeling a bit overwhelmed today with all my tasks.",
      duration: 3.5,
      language: 'en'
    };
  }

  try {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add audio file
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a', // iOS default format
      name: 'recording.m4a',
    } as any);
    
    // Add model parameter
    formData.append('model', 'whisper-1');
    
    // Optional: Add language hint for better accuracy
    formData.append('language', 'en');
    
    // Optional: Add response format
    formData.append('response_format', 'json');

    console.log('🎤 Sending audio to Whisper API...');
    
    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', error);
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Transcription successful:', data.text);

    return {
      text: data.text,
      duration: data.duration,
      language: data.language || 'en',
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

/**
 * Validate audio file before transcription
 * @param audioUri - Local file URI
 * @returns true if valid
 */
export function validateAudioFile(audioUri: string): boolean {
  if (!audioUri) {
    throw new Error('No audio file provided');
  }

  // Check file extension
  const validFormats = ['.m4a', '.mp3', '.wav', '.webm', '.mp4', '.mpeg', '.mpga'];
  const hasValidFormat = validFormats.some(format => audioUri.toLowerCase().endsWith(format));
  
  if (!hasValidFormat) {
    throw new Error('Invalid audio format. Supported: m4a, mp3, wav, webm, mp4, mpeg, mpga');
  }

  return true;
}

/**
 * Mock transcription for testing without API key
 * Returns realistic example transcriptions based on duration
 */
export function mockTranscription(durationSeconds: number): TranscriptionResult {
  const transcriptions = [
    "I'm feeling a bit overwhelmed today with all my tasks.",
    "I had a great morning but I'm starting to feel tired now.",
    "Work has been stressful lately and I need a break.",
    "I'm excited about the weekend but anxious about my upcoming presentation.",
    "Today was productive but I feel mentally exhausted.",
    "I'm feeling happy and energized after my morning workout.",
    "I'm struggling to focus and feeling scattered.",
    "Things are going well but I'm worried about meeting my deadlines."
  ];

  // Pick random transcription
  const randomIndex = Math.floor(Math.random() * transcriptions.length);
  
  return {
    text: transcriptions[randomIndex],
    duration: durationSeconds,
    language: 'en'
  };
}
