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
  onInterimUpdate?: (transcript: string) => void;
  lang?: string;
  continuous?: boolean;
  permissionDeniedMessage?: string;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function isMediaPermissionDenied(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
  );
}

function mapMediaErrorMessage(err: unknown, customDeniedMsg?: string): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return (
          customDeniedMsg ??
          'Microphone permission denied. Allow mic access in your browser settings to dictate.'
        );
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

function mapRecognitionErrorMessage(code: string, customDeniedMsg?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return (
        customDeniedMsg ??
        'Microphone permission denied. Allow mic access in your browser settings to dictate.'
      );
    case 'audio-capture':
      return 'No working microphone found on this device.';
    case 'no-speech':
      return 'No speech detected. Tap the mic and speak clearly.';
    case 'network':
      return 'Speech recognition network error. Check connection or type manually.';
    default:
      return 'Voice recognition interrupted. Tap the mic to retry.';
  }
}

export function useSpeechDictation({
  onFinalTranscript,
  onInterimUpdate,
  lang = 'en-IN',
  continuous = true,
  permissionDeniedMessage,
}: UseSpeechDictationOptions) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const intentionalStopRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onInterimUpdateRef = useRef(onInterimUpdate);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onInterimUpdateRef.current = onInterimUpdate;
  }, [onInterimUpdate]);

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
    setIsPermissionDenied(false);
  }, []);

  const startDictation = useCallback(async () => {
    setError(null);
    setIsPermissionDenied(false);
    setInterimTranscript('');

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setError('Voice search is unavailable in this browser — type your symptom or tap a quick tag below.');
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
        setIsPermissionDenied(isMediaPermissionDenied(err));
        setError(mapMediaErrorMessage(err, permissionDeniedMessage));
        return;
      }
    }

    try {
      const recognition = new RecognitionCtor();
      intentionalStopRef.current = false;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setStatus('listening');
        setError(null);
        setIsPermissionDenied(false);
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

        const cleanedInterim = interimText.trim();
        setInterimTranscript(cleanedInterim);
        if (cleanedInterim) {
          onInterimUpdateRef.current?.(cleanedInterim);
        }

        const cleanedFinal = finalText.trim();
        if (cleanedFinal) {
          onFinalTranscriptRef.current(cleanedFinal);
        }
      };

      recognition.onerror = (event) => {
        if (intentionalStopRef.current && event.error === 'aborted') {
          return;
        }
        const denied =
          event.error === 'not-allowed' || event.error === 'service-not-allowed';
        setIsPermissionDenied(denied);
        setError(mapRecognitionErrorMessage(event.error, permissionDeniedMessage));
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
      setError('Could not start voice search. Please type your symptom or tap a quick tag below.');
    }
  }, [continuous, lang, permissionDeniedMessage, status, stopDictation]);

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
    isPermissionDenied,
    startDictation,
    stopDictation,
    toggleDictation,
    clearError,
  };
}
