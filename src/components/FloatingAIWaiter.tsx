import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mic, Loader2, Volume2, Ear, EarOff } from "lucide-react";
import robotWaiterImage from "@/assets/ChatGPT Image Oct 22, 2025, 07_35_55 PM_1761180288922.png";
import { AudioAcknowledgment } from "@/lib/audioAcknowledgment";
import { AudioCacheUtil } from "@/lib/audioCacheUtil";
import { useContinuousSpeechRecognition } from "@/hooks/useContinuousSpeechRecognition";
import { Button } from "@/components/ui/button";

interface FloatingAIWaiterProps {
  restaurantId: string;
  restaurantName?: string;
  menuItems: any[];
  onAddToCart?: (item: any) => void;
  initiallyHidden?: boolean;
}

export interface FloatingAIWaiterRef {
  triggerWelcome: () => Promise<void>;
}

type Status = 'idle' | 'listening' | 'processing' | 'responding';

export const FloatingAIWaiter = forwardRef<FloatingAIWaiterRef, FloatingAIWaiterProps>(
  ({ restaurantId, restaurantName, menuItems, onAddToCart, initiallyHidden = false }, ref) => {
    const { t, language } = useLanguage();

    const [isVisible, setIsVisible] = useState(!initiallyHidden);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [processingMessage, setProcessingMessage] = useState('Processing...');
    const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [responseCount, setResponseCount] = useState(0);
    const [isPressed, setIsPressed] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [continuousListeningEnabled, setContinuousListeningEnabled] = useState(() => {
      // Check localStorage for saved preference, default to true
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('waiterix-wake-word-enabled');
        return saved !== null ? saved === 'true' : true;
      }
      return true;
    });
    const [micPermissionGranted, setMicPermissionGranted] = useState(() => {
      // Check sessionStorage for permission status from welcome overlay
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('waiterix-mic-permission-granted') === 'true';
      }
      return false;
    });
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingNewAudioRef = useRef(false);
    const customerSessionIdRef = useRef<string>(`customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    // Create personalized welcome message
    const welcomeTextRef = useRef(
      restaurantName
        ? `Hey there! Welcome to ${restaurantName}. I'm your AI waiter. Press this button or say "Hey Waiterix" anytime to chat about the menu or place an order!`
        : "Hey there! I'm your AI waiter. Press this button or say 'Hey Waiterix' anytime to chat about the menu or place an order!"
    );

    // Continuous speech recognition for wake word detection (only enable if permission granted)
    const { isListening: isWakeWordListening, isSupported: isSpeechRecognitionSupported } = useContinuousSpeechRecognition({
      onWakeWordDetected: () => {
        console.log('[FloatingAIWaiter] Wake word detected, triggering conversation');
        // Only trigger if not already busy
        if (status === 'idle') {
          handleClick();
        }
      },
      enabled: continuousListeningEnabled && micPermissionGranted,
      language: language,
    });

    // Check for mic permission updates from sessionStorage
    useEffect(() => {
      const checkPermission = () => {
        const granted = sessionStorage.getItem('waiterix-mic-permission-granted') === 'true';
        if (granted !== micPermissionGranted) {
          setMicPermissionGranted(granted);
        }
      };

      // Check on mount and periodically
      checkPermission();
      const interval = setInterval(checkPermission, 1000);

      return () => clearInterval(interval);
    }, [micPermissionGranted]);

    // Save preference to localStorage when it changes
    useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('waiterix-wake-word-enabled', String(continuousListeningEnabled));
      }
    }, [continuousListeningEnabled]);

    // Initialize audio element for playback
    useEffect(() => {
      if (typeof window !== 'undefined') {
        audioRef.current = new Audio();
        audioRef.current.onplay = () => {
          console.log('Audio started playing');
          // Status is now set before play() is called, not here
        };
        audioRef.current.onended = () => {
          console.log('Audio finished playing');
          // Only go to idle if we're not loading new audio
          if (!isLoadingNewAudioRef.current) {
            setStatus('idle');
          }
        };
        audioRef.current.onpause = () => {
          console.log('Audio paused');
          // Don't change status if we're loading new audio (prevents flash of idle)
          if (!isLoadingNewAudioRef.current) {
            setStatus('idle');
          }
        };
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          // Only go to idle if we're not loading new audio
          if (!isLoadingNewAudioRef.current) {
            setStatus('idle');
          }
        };
      }
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        if (processingIntervalRef.current) {
          clearTimeout(processingIntervalRef.current);
        }
        // Clean up Web Audio API resources on unmount
        if (analyserRef.current) {
          analyserRef.current.disconnect();
          analyserRef.current = null;
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    }, []);

    // Expose triggerWelcome method via ref
    useImperativeHandle(ref, () => ({
      triggerWelcome: async () => {
        if (hasGreeted) return;

        setHasGreeted(true);
        console.log('Welcome triggered via overlay, showing AI Waiter and playing welcome');

        // Show character in responding state immediately
        setIsVisible(true);
        setStatus('responding');

        // Unlock audio first - this MUST happen in the context of user interaction
        await unlockAudio();

        // Play welcome message immediately
        const success = await speakMessage(welcomeTextRef.current);
        if (!success) {
          console.log('Welcome message failed to play');
          // If welcome fails, go to idle state
          setStatus('idle');
        }
      }
    }));

    // Update visibility when initiallyHidden changes (e.g., when overlay is dismissed)
    useEffect(() => {
      if (!initiallyHidden && !isVisible) {
        setIsVisible(true);
      }
    }, [initiallyHidden, isVisible]);

    // WebSocket connection to receive chef answers
    useEffect(() => {
      let wsBaseUrl = (import.meta as any).env.VITE_WEBSOCKET_URL;

      if (!wsBaseUrl) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          wsBaseUrl = 'ws://localhost:3006';
        } else {
          console.warn('[FloatingAIWaiter] VITE_WEBSOCKET_URL not configured. WebSocket disabled.');
          return;
        }
      }

      const ws = new WebSocket(
        `${wsBaseUrl}?restaurantId=${restaurantId}&customerSessionId=${customerSessionIdRef.current}`
      );

      ws.onopen = () => {
        console.log('WebSocket connected for customer');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'chef-answer') {
          console.log('Received chef answer:', message.data);
          const { answer } = message.data;

          // Add the chef's answer to conversation history as an assistant message
          setConversationHistory(prev => [...prev, { role: 'assistant', content: answer }]);

          // Speak the answer to the customer
          speakMessage(answer).catch(err => {
            console.error('Failed to speak chef answer:', err);
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return () => {
        ws.close();
      };
    }, [restaurantId]);

    // Start processing messages - show "Processing..." then switch after 3 seconds
    const startProcessingMessages = () => {
      setProcessingMessage('Processing...');

      // After 3 seconds, change to "Answer's almost ready" if still processing
      processingIntervalRef.current = setTimeout(() => {
        setProcessingMessage("Answer's almost ready");
      }, 3000);
    };

    // Stop processing messages
    const stopProcessingMessages = () => {
      if (processingIntervalRef.current) {
        clearTimeout(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    };

    // OpenAI text-to-speech using server endpoint
    const speakMessage = async (text: string): Promise<boolean> => {
      try {
        console.log('Speaking message:', text.substring(0, 50) + '...');

        // Set status to responding immediately and mark that we're loading new audio
        // This prevents any flash of idle icon during the transition
        setStatus('responding');
        stopProcessingMessages();
        isLoadingNewAudioRef.current = true;

        // Try to play cached phrase instantly for immediate feedback
        const cachedAudio = AudioCacheUtil.tryPlayCachedPhrase(text);

        // Clean up any existing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/ai/text-to-speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language, restaurantId }),
        });

        console.log('TTS response status:', response.status);

        if (response.status === 503) {
          console.warn('Voice features temporarily unavailable');
          isLoadingNewAudioRef.current = false;
          setStatus('idle');
          return false;
        }

        if (!response.ok) {
          console.warn('Text-to-speech unavailable:', response.statusText);
          isLoadingNewAudioRef.current = false;
          setStatus('idle');
          return false;
        }

        const audioBlob = await response.blob();
        console.log('Audio blob size:', audioBlob.size);
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          try {
            console.log('Attempting to play audio...');
            audioRef.current.load();

            await audioRef.current.play();
            console.log('Audio playing successfully');

            // Clear the flag once audio is playing
            isLoadingNewAudioRef.current = false;
            return true;
          } catch (err) {
            console.error('Audio play error:', err);
            console.error('Error details:', JSON.stringify(err));
            isLoadingNewAudioRef.current = false;
            setStatus('idle');
            return false;
          }
        }
        console.error('Audio ref not available');
        isLoadingNewAudioRef.current = false;
        setStatus('idle');
        return false;
      } catch (error) {
        console.error('Text-to-speech error:', error);
        isLoadingNewAudioRef.current = false;
        setStatus('idle');
        return false;
      }
    };

    // Unlock audio on first user interaction (mobile browsers require this)
    const unlockAudio = async () => {
      if (audioUnlocked || !audioRef.current) return;

      try {
        console.log('Unlocking audio for mobile browsers...');

        // Simple, direct approach for mobile: load and play then pause immediately
        // This is the most reliable way to unlock audio on iOS Safari and Android Chrome
        const silentDataUrl = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4Tb7VefAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDgP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

        audioRef.current.src = silentDataUrl;
        audioRef.current.load();

        // Try to play - mobile browsers need this to be synchronous with user gesture
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (playError) {
          console.log('Silent play failed (expected on some browsers):', playError);
        }

        // Clean up
        audioRef.current.src = '';

        setAudioUnlocked(true);
        console.log('Audio unlocked successfully');
      } catch (err) {
        console.warn('Audio unlock failed:', err);
        // Mark as unlocked anyway to avoid repeated attempts
        setAudioUnlocked(true);
      }
    };

    // Clean up recording resources
    const cleanupRecordingResources = () => {
      // Disconnect and clean up Web Audio API resources
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    // Stop current response
    const handleStop = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      cleanupRecordingResources();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      stopProcessingMessages();
      setStatus('idle');
    };

    // Start listening when character is clicked
    const handleClick = async () => {
      console.log('Character clicked, current status:', status);

      // Unlock audio on first click
      if (!audioUnlocked) {
        await unlockAudio();
      }

      if (status === 'listening' || status === 'processing') {
        return;
      }

      if (status === 'responding') {
        handleStop();
        return;
      }

      try {
        setStatus('listening');
        console.log('Requesting microphone access...');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');

        // Detect supported mime type
        const mimeType = [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/mp4',
          'audio/ogg',
          'audio/wav'
        ].find(type => MediaRecorder.isTypeSupported(type)) || '';

        if (!mimeType) {
          console.warn('No supported audio mime type found, letting browser decide defaults');
        }

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const actualMimeType = mediaRecorder.mimeType; // Get what browser actually used
        console.log('Using mimeType:', actualMimeType);

        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped');
          cleanupRecordingResources();
          setStatus('processing');
          startProcessingMessages();

          // Use the actual mime type used by the recorder
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          console.log('Audio blob size:', audioBlob.size, 'Type:', actualMimeType);

          // Determine extension based on mime type
          let extension = 'webm';
          if (actualMimeType.includes('mp4')) extension = 'mp4';
          if (actualMimeType.includes('ogg')) extension = 'ogg';
          if (actualMimeType.includes('wav')) extension = 'wav';

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `recording.${extension}`);
            formData.append('language', language);
            formData.append('restaurantId', restaurantId);

            console.log('Sending audio to speech-to-text...');
            const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
            const sttResponse = await fetch(`${apiBaseUrl}/api/ai/speech-to-text`, {
              method: 'POST',
              body: formData,
            });

            console.log('STT response status:', sttResponse.status);

            if (sttResponse.status === 503) {
              console.warn('Voice input temporarily unavailable');
              stopProcessingMessages();
              setStatus('idle');
              return;
            }

            if (!sttResponse.ok) {
              throw new Error('Speech-to-text failed');
            }

            const { text: userText } = await sttResponse.json();
            console.log('Transcribed text:', userText);

            const newHistory = [...conversationHistory, { role: 'user' as const, content: userText }];
            setConversationHistory(newHistory);

            console.log('Sending to AI chat...');
            const chatResponse = await fetch(`${apiBaseUrl}/api/ai/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                restaurantId,
                messages: newHistory,
                menuItems,
                language,
                customerSessionId: customerSessionIdRef.current,
              }),
            });

            console.log('Chat response status:', chatResponse.status);

            if (chatResponse.status === 503) {
              console.warn('AI chat temporarily unavailable');
              stopProcessingMessages();
              setStatus('idle');
              return;
            }

            if (!chatResponse.ok) {
              throw new Error('Chat failed');
            }

            const { message: assistantMessage, addToCart } = await chatResponse.json();
            console.log('AI response:', assistantMessage.substring(0, 50) + '...');
            console.log('[FloatingAIWaiter] addToCart:', addToCart);

            // Add items to cart if AI recommends it
            if (addToCart && addToCart.length > 0 && onAddToCart) {
              console.log('[FloatingAIWaiter] Adding items to cart:', addToCart);
              addToCart.forEach((item: any) => {
                console.log('[FloatingAIWaiter] Adding item:', item);
                onAddToCart(item);
              });
            }

            // Add reminder to first two responses
            let finalMessage = assistantMessage;
            if (responseCount < 2) {
              finalMessage = assistantMessage + " Don't forget you have to press this button to speak.";
              setResponseCount(prev => prev + 1);
            }

            const updatedHistory = [...newHistory, { role: 'assistant' as const, content: assistantMessage }];
            setConversationHistory(updatedHistory);

            // DON'T stop processing messages yet - keep processing state until audio starts
            // The audio.onplay event will handle the status change to 'responding'

            // Try to speak the message
            const speechSuccess = await speakMessage(finalMessage);
            if (!speechSuccess) {
              console.warn('Speech failed, but conversation was successful');
              // Only stop processing and reset if speech completely failed
              stopProcessingMessages();
              setTimeout(() => setStatus('idle'), 500);
            } else {
              // Speech started successfully - stop the processing interval
              stopProcessingMessages();
            }

          } catch (error) {
            console.error('Error in voice pipeline:', error);
            stopProcessingMessages();
            setStatus('idle');
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        console.log('Recording started (max 20 seconds, or until silence detected)...');

        // Set up silence detection using Web Audio API
        audioContextRef.current = new AudioContext();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        sourceRef.current.connect(analyserRef.current);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silenceStart: number | null = null;
        const SILENCE_THRESHOLD = 5; // Volume threshold for silence (lowered for better detection)
        const SILENCE_DURATION = 1500; // 1.5 seconds of silence triggers stop

        const recordingStartTime = Date.now();

        const checkAudioLevel = () => {
          if (mediaRecorder.state !== 'recording' || !analyserRef.current) return;

          analyserRef.current.getByteTimeDomainData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const value = Math.abs(dataArray[i] - 128);
            sum += value;
          }
          const average = sum / bufferLength;

          const elapsed = ((Date.now() - recordingStartTime) / 1000).toFixed(1);

          // Check if silent
          if (average < SILENCE_THRESHOLD) {
            if (silenceStart === null) {
              silenceStart = Date.now();
              console.log(`Silence started at ${elapsed}s (volume: ${average.toFixed(1)})`);
            } else if (Date.now() - silenceStart > SILENCE_DURATION) {
              const totalTime = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
              console.log(`Silence detected after ${totalTime}s, stopping recording early`);

              // Play instant acknowledgment sound
              AudioAcknowledgment.playAck();

              mediaRecorder.stop();
              stream.getTracks().forEach(track => track.stop());
              return;
            }
          } else {
            // Reset silence timer when sound is detected
            if (silenceStart !== null) {
              console.log(`Sound detected at ${elapsed}s (volume: ${average.toFixed(1)}), continuing recording`);
            }
            silenceStart = null;
          }

          // Continue checking
          requestAnimationFrame(checkAudioLevel);
        };

        // Start monitoring audio levels
        requestAnimationFrame(checkAudioLevel);

        // Maximum recording time: 20 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            console.log('Auto-stopping recording after 20 seconds');

            // Play instant acknowledgment sound
            AudioAcknowledgment.playAck();

            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }
        }, 20000);

      } catch (error) {
        console.error('Microphone error:', error);
        cleanupRecordingResources();
        setStatus('idle');
      }
    };

    // Get status text
    const getStatusText = () => {
      switch (status) {
        case 'listening':
          return t('listening');
        case 'processing':
          return t('aiProcessing');
        case 'responding':
          return t('speaking');
        default:
          return '';
      }
    };

    if (!isVisible) return null;

    return (
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
          }`}
        data-testid="floating-ai-waiter"
      >
        {/* Character circle with robot image or icons for active states - 25% smaller */}
        <div
          onClick={handleClick}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          className={`
          relative w-[60px] h-[60px] rounded-full overflow-hidden
          flex items-center justify-center cursor-pointer shadow-2xl
          transition-all duration-200 ease-out
          ${status === 'idle' ? 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800' : 'bg-gradient-to-br from-primary to-primary/80'}
          ${status === 'idle' ? 'hover:scale-105' : ''}
          ${status === 'listening' ? 'scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : ''}
          ${status === 'processing' ? 'scale-105' : ''}
          ${status === 'responding' ? 'scale-110 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : ''}
          ${isPressed ? 'scale-95' : ''}
        `}
          style={{
            animation: status === 'listening' || status === 'processing' ? 'slowPulse 3s ease-in-out infinite' : undefined
          }}
          data-testid="button-ai-waiter"
        >
          {/* Outer glow ring for active states - slowed down */}
          {status !== 'idle' && (
            <div
              className="absolute inset-0 rounded-full bg-primary/20"
              style={{
                animation: 'slowPing 3s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            />
          )}

          {/* Robot waiter image for idle state */}
          {status === 'idle' && (
            <img
              src={robotWaiterImage}
              alt="AI Waiter"
              className="w-full h-full object-cover"
            />
          )}

          {/* Icons for active states - 25% smaller */}
          <div className="relative z-10 text-primary-foreground">
            {status === 'listening' && (
              <Mic className="w-6 h-6" />
            )}
            {status === 'processing' && (
              <Loader2 className="w-6 h-6 animate-spin" />
            )}
            {status === 'responding' && (
              <Volume2 className="w-6 h-6" style={{ animation: 'slowPulse 2s ease-in-out infinite' }} />
            )}
          </div>
        </div>

        {/* Helper text - orange container for all states - 25% smaller text */}
        <div
          onClick={status === 'idle' ? handleClick : undefined}
          onTouchStart={status === 'idle' ? () => setIsPressed(true) : undefined}
          onTouchEnd={status === 'idle' ? () => setIsPressed(false) : undefined}
          onMouseDown={status === 'idle' ? () => setIsPressed(true) : undefined}
          onMouseUp={status === 'idle' ? () => setIsPressed(false) : undefined}
          onMouseLeave={status === 'idle' ? () => setIsPressed(false) : undefined}
          className={`
          bg-primary text-primary-foreground px-5 py-2 rounded-full 
          text-xs font-medium shadow-lg
          transition-all duration-200
          ${status === 'idle' ? 'cursor-pointer' : ''}
          ${status === 'idle' && isPressed ? 'scale-95 shadow-md' : 'scale-100'}
        `}
          style={{
            animation: status === 'idle' && !isPressed ? 'slowBounce 2s ease-in-out infinite' : undefined
          }}
          data-testid="text-status-label"
        >
          {status === 'idle' ? t('tapToTalk') : getStatusText()}
        </div>
      </div>
    );
  });

FloatingAIWaiter.displayName = 'FloatingAIWaiter';
