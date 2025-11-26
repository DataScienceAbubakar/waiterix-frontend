import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Volume2, Loader2, X, Ear, EarOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioAcknowledgment } from "@/lib/audioAcknowledgment";
import { AudioCacheUtil } from "@/lib/audioCacheUtil";
import { useContinuousSpeechRecognition } from "@/hooks/useContinuousSpeechRecognition";

interface AIWaiterProps {
  restaurantId: string;
  restaurantName?: string;
  menuItems: any[];
  onAddToCart?: (item: any) => void;
}

type Status = 'idle' | 'listening' | 'processing' | 'responding';

export function AIWaiter({ restaurantId, restaurantName, menuItems, onAddToCart }: AIWaiterProps) {
  const { t, language } = useLanguage();
  
  const [hasGreeted, setHasGreeted] = useState(false);
  const [welcomeFailed, setWelcomeFailed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [processingMessage, setProcessingMessage] = useState('Processing...');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [responseCount, setResponseCount] = useState(0);
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
  const customerSessionIdRef = useRef<string>(`customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Create personalized welcome message
  const welcomeTextRef = useRef(
    restaurantName 
      ? `Hey there! Welcome to ${restaurantName}. I'm your AI waiter. Press this button or say "Hey Waiterix" anytime to chat about the menu or place an order. If you need a live waiter at any point, please let me know!`
      : "Hey there! I'm your AI waiter. Press this button or say 'Hey Waiterix' anytime to chat about the menu or place an order. If you need a live waiter at any point, please let me know!"
  );

  // Continuous speech recognition for wake word detection (only enable if permission granted)
  const { isListening: isWakeWordListening, isSupported: isSpeechRecognitionSupported } = useContinuousSpeechRecognition({
    onWakeWordDetected: () => {
      console.log('[AIWaiter] Wake word detected, triggering conversation');
      // Only trigger if not already busy
      if (status === 'idle') {
        handleTalk();
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
        setStatus('responding');
        // Clear any processing message interval when starting to speak
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
          processingIntervalRef.current = null;
        }
      };
      audioRef.current.onended = () => {
        setStatus('idle');
      };
      audioRef.current.onpause = () => {
        setStatus('idle');
      };
      audioRef.current.onerror = () => {
        // Audio errors are often from autoplay restrictions, which we handle with fallback
        setStatus('idle');
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
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

  // Auto-play welcome on page load
  useEffect(() => {
    if (!hasGreeted && menuItems.length > 0) {
      setHasGreeted(true);
      
      // Try to auto-play immediately (works on desktop, may fail on mobile)
      setTimeout(async () => {
        const success = await speakMessage(welcomeTextRef.current);
        if (!success) {
          setWelcomeFailed(true);
        }
      }, 100);
    }
  }, [hasGreeted, menuItems]);

  // WebSocket connection to receive chef answers
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws?restaurantId=${restaurantId}&customerSessionId=${customerSessionIdRef.current}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected for customer (AIWaiter)');
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

  // On mobile where auto-play failed, play welcome on first user interaction
  useEffect(() => {
    if (welcomeFailed) {
      const playWelcomeOnInteraction = async () => {
        await speakMessage(welcomeTextRef.current);
        setWelcomeFailed(false);
      };

      document.addEventListener('click', playWelcomeOnInteraction, { once: true });
      document.addEventListener('touchstart', playWelcomeOnInteraction, { once: true });

      return () => {
        document.removeEventListener('click', playWelcomeOnInteraction);
        document.removeEventListener('touchstart', playWelcomeOnInteraction);
      };
    }
  }, [welcomeFailed]);

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
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  };


  // OpenAI text-to-speech using server endpoint
  const speakMessage = async (text: string): Promise<boolean> => {
    try {
      // Try to play cached phrase instantly for immediate feedback
      AudioCacheUtil.tryPlayCachedPhrase(text);
      
      // Stop any ongoing playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (response.status === 503) {
        console.warn('Voice features temporarily unavailable');
        setStatus('idle');
        stopProcessingMessages();
        return false;
      }

      if (!response.ok) {
        console.warn('Text-to-speech unavailable');
        setStatus('idle');
        stopProcessingMessages();
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        try {
          await audioRef.current.play();
          return true;
        } catch (err) {
          // Autoplay blocked - this is expected and handled by fallback
          setStatus('idle');
          stopProcessingMessages();
          return false;
        }
      }
      return false;
    } catch (error) {
      console.warn('Text-to-speech error:', error);
      setStatus('idle');
      stopProcessingMessages();
      return false;
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
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    cleanupRecordingResources();
    
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Stop any processing messages
    stopProcessingMessages();
    
    // Reset to idle
    setStatus('idle');
  };

  // Start listening immediately when button is clicked
  const handleTalk = async () => {
    if (status === 'listening' || status === 'processing') {
      return; // Prevent multiple clicks during these states
    }
    
    // If responding, allow stopping
    if (status === 'responding') {
      handleStop();
      return;
    }

    try {
      setStatus('listening');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupRecordingResources();
        setStatus('processing');
        startProcessingMessages(); // Start alternating messages
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          // Send binary audio directly using FormData (more efficient than base64)
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const sttResponse = await fetch('/api/ai/speech-to-text', {
            method: 'POST',
            body: formData, // No Content-Type header - browser sets it automatically with boundary
          });

          if (sttResponse.status === 503) {
            console.warn('Voice input temporarily unavailable');
            stopProcessingMessages();
            setStatus('idle');
            return;
          }

          if (!sttResponse.ok) {
            console.error('Speech-to-text failed');
            stopProcessingMessages();
            setStatus('idle');
            return;
          }

          const sttData = await sttResponse.json();
          const transcribedText = sttData.text?.trim() || '';
          
          if (transcribedText) {
            await processMessage(transcribedText);
          } else {
            // No speech detected, return to idle
            console.log('No speech detected in auto-listen, returning to idle');
            stopProcessingMessages();
            setStatus('idle');
          }
        } catch (error) {
          console.error('Speech-to-text error:', error);
          stopProcessingMessages();
          setStatus('idle');
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
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
      const SILENCE_THRESHOLD = 5; // Volume threshold for silence
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
      console.error('Microphone access error:', error);
      cleanupRecordingResources();
      setStatus('idle');
    }
  };

  const processMessage = async (userMessage: string) => {
    if (!userMessage.trim()) {
      stopProcessingMessages();
      setStatus('idle');
      return;
    }

    try {
      // Get AI response (processing messages continue alternating)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          messages: [...conversationHistory, { role: 'user', content: userMessage }],
          menuItems,
          language,
          customerSessionId: customerSessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.message) {
        throw new Error('No message in AI response');
      }
      
      // Update conversation history (keep in memory for context, but don't display)
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.message }
      ]);
      
      // Add reminder to first two responses
      let messageToSpeak = data.message;
      if (responseCount < 2) {
        messageToSpeak += " Don't forget you have to press this button to speak.";
        setResponseCount(prev => prev + 1);
      }
      
      // Speak the response (this will stop processing messages when audio starts playing)
      await speakMessage(messageToSpeak);

      // If AI recommends adding items to cart
      if (data.addToCart && onAddToCart) {
        console.log('[AI Waiter] Attempting to add items to cart:', data.addToCart);
        console.log('[AI Waiter] onAddToCart callback exists:', !!onAddToCart);
        data.addToCart.forEach((item: any) => {
          console.log('[AI Waiter] Adding item to cart:', item);
          onAddToCart(item);
        });
      } else {
        console.log('[AI Waiter] Not adding items. addToCart:', data.addToCart, 'onAddToCart:', !!onAddToCart);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      stopProcessingMessages();
      const errorMessage = "I apologize, but I'm having trouble responding right now. Please try again.";
      await speakMessage(errorMessage);
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return processingMessage;
      case 'responding':
        return 'Responding...';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* AI Waiter Button - Oblong shape with text */}
      <Button
        onClick={handleTalk}
        disabled={status === 'listening' || status === 'processing'}
        className={`h-10 px-4 rounded-full shadow-lg gap-2 ${status !== 'idle' ? 'ai-waiter-active' : ''}`}
        variant="default"
        data-testid="button-ai-waiter"
      >
        {status === 'processing' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : status === 'responding' ? (
          <X className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
        <span className="text-sm font-medium whitespace-nowrap">
          {status === 'idle' ? 'Press for AI Waiter' : status === 'responding' ? 'Stop' : getStatusText()}
        </span>
      </Button>

      {/* Wake word listening toggle - only show if supported, positioned below button */}
      {isSpeechRecognitionSupported && (
        <Button
          onClick={() => setContinuousListeningEnabled(!continuousListeningEnabled)}
          variant="outline"
          size="sm"
          className="gap-2 shadow-lg"
          data-testid="button-toggle-wake-word"
        >
          {continuousListeningEnabled && micPermissionGranted ? (
            <>
              <Ear className="h-4 w-4" />
              <span className="text-xs">Listening for "Hey Waiterix"</span>
            </>
          ) : continuousListeningEnabled && !micPermissionGranted ? (
            <>
              <Ear className="h-4 w-4" />
              <span className="text-xs">Grant Mic Permission</span>
            </>
          ) : (
            <>
              <EarOff className="h-4 w-4" />
              <span className="text-xs">Enable Voice Activation</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
