import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export type DictationStatus = 'idle' | 'requesting' | 'listening';

interface UseSpeechDictationOptions {
  onFinalTranscript: (transcript: string) => void;
  lang?: string;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function mapMediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone permission denied. Allow mic access in your browser settings to dictate.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No microphone detected on this device.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Microphone is busy in another app or tab.';
      default:
        return 'Could not access microphone. Please type your instructions instead.';
    }
  }
  return 'Could not access microphone. Please type your instructions instead.';
}

function mapRecognitionErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Allow mic access in your browser settings to dictate.';
    case 'audio-capture':
      return 'No working microphone found on this device.';
    case 'no-speech':
      return 'No speech detected. Tap the mic and speak clearly.';
    case 'network':
      return 'Speech recognition network error. Check connection or type manually.';
    default:
      return 'Voice dictation interrupted. Tap the mic to retry.';
  }
}

export function useSpeechDictation({
  onFinalTranscript,
  lang = 'en-IN',
}: UseSpeechDictationOptions) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const intentionalStopRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const isSupported = getSpeechRecognitionConstructor() !== null;

  const stopDictation = useCallback(() => {
    intentionalStopRef.current = true;
    setInterimTranscript('');
    setStatus('idle');
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // Ignore stop errors if recognition has already ended.
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startDictation = useCallback(async () => {
    setError(null);
    setInterimTranscript('');

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setError('Voice dictation is unavailable in this browser. Type your instructions above.');
      return;
    }

    if (status === 'requesting' || status === 'listening') {
      stopDictation();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        setStatus('idle');
        setError(mapMediaErrorMessage(err));
        return;
      }
    }

    try {
      const recognition = new RecognitionCtor();
      intentionalStopRef.current = false;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setStatus('listening');
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const segment = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalText += segment;
          } else {
            interimText += segment;
          }
        }

        setInterimTranscript(interimText.trim());
        const cleanedFinal = finalText.trim();
        if (cleanedFinal) {
          onFinalTranscriptRef.current(cleanedFinal);
        }
      };

      recognition.onerror = (event) => {
        if (intentionalStopRef.current && event.error === 'aborted') {
          return;
        }
        setError(mapRecognitionErrorMessage(event.error));
        setInterimTranscript('');
        setStatus('idle');
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setInterimTranscript('');
        setStatus('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus('idle');
      setError('Could not start voice dictation. Please type your instructions.');
    }
  }, [lang, status, stopDictation]);

  const toggleDictation = useCallback(() => {
    if (status === 'listening' || status === 'requesting') {
      stopDictation();
    } else {
      void startDictation();
    }
  }, [startDictation, status, stopDictation]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup abort errors.
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    status,
    isRequesting: status === 'requesting',
    isListening: status === 'listening',
    interimTranscript,
    error,
    startDictation,
    stopDictation,
    toggleDictation,
    clearError,
  };
}
