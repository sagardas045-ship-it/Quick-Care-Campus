import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, Loader2, Mic, MicOff, Search, X } from 'lucide-react';
import { useSpeechDictation } from '../hooks/useSpeechDictation';
import { QUICK_SYMPTOM_CHIPS } from '../utils/symptomSearch';

interface SymptomSearchBarProps {
  value: string;
  onChange: (nextValue: string) => void;
  onVoiceActivate?: () => void;
  onQuickChipSelect?: (chipQuery: string) => void;
  showQuickChips?: boolean;
  placeholder?: string;
  inputAriaLabel?: string;
  resultCount?: number;
  totalCount?: number;
}

const SOUNDWAVE_BARS = [
  { delay: 0, peaks: [0.35, 0.95, 0.45] },
  { delay: 0.1, peaks: [0.55, 1.0, 0.35] },
  { delay: 0.2, peaks: [0.4, 0.85, 0.6] },
  { delay: 0.14, peaks: [0.65, 1.0, 0.4] },
  { delay: 0.26, peaks: [0.35, 0.9, 0.5] },
];

export function SymptomSearchBar({
  value,
  onChange,
  onVoiceActivate,
  onQuickChipSelect,
  showQuickChips = true,
  placeholder = "Search symptoms or kits (e.g., 'fever', 'headache', 'ORS', 'pads')...",
  inputAriaLabel = 'Search symptoms or OTC relief kits',
  resultCount,
  totalCount,
}: SymptomSearchBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);

  const handleFinalTranscript = useCallback(
    (spokenText: string) => {
      onVoiceActivate?.();
      onChange(spokenText);
    },
    [onChange, onVoiceActivate]
  );

  const handleInterimUpdate = useCallback(
    (spokenText: string) => {
      onVoiceActivate?.();
      onChange(spokenText);
    },
    [onChange, onVoiceActivate]
  );

  const {
    isSupported,
    isRequesting,
    isListening,
    interimTranscript,
    error: voiceError,
    toggleDictation,
    stopDictation,
    clearError,
  } = useSpeechDictation({
    onFinalTranscript: handleFinalTranscript,
    onInterimUpdate: handleInterimUpdate,
    lang: 'en-IN',
    continuous: false,
    permissionDeniedMessage:
      'Microphone access blocked — type your symptom or tap a quick tag below',
  });

  useEffect(() => {
    if (!voiceError) return;
    if (autoDismissTimerRef.current) {
      window.clearTimeout(autoDismissTimerRef.current);
    }
    autoDismissTimerRef.current = window.setTimeout(() => {
      clearError();
    }, 6500);
    return () => {
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [voiceError, clearError]);

  const handleClear = () => {
    if (isListening) {
      stopDictation();
    }
    clearError();
    onChange('');
    inputRef.current?.focus();
  };

  const handleMicClick = () => {
    clearError();
    toggleDictation();
  };

  return (
    <div className="space-y-2.5">
      {/* Sleek Rounded Glassmorphism Search Input with Tactile Voice Button */}
      <div
        className={`relative flex items-center rounded-2xl backdrop-blur-xl transition-all duration-200 ${
          isListening
            ? 'bg-white/95 dark:bg-slate-900/95 border-2 border-rose-500/80 dark:border-teal-400/80 shadow-[0_0_0_4px_rgba(244,63,94,0.14),0_16px_32px_-16px_rgba(13,148,136,0.35)] dark:shadow-[0_0_0_4px_rgba(45,212,191,0.16),0_16px_32px_-16px_rgba(0,0,0,0.65)]'
            : 'bg-white/85 dark:bg-slate-900/85 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_10px_28px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_12px_30px_-14px_rgba(0,0,0,0.55)] focus-within:border-teal-600 dark:focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/15'
        }`}
      >
        <Search
          aria-hidden="true"
          className={`w-4 h-4 sm:w-5 sm:h-5 ml-4 shrink-0 transition-colors ${
            isListening
              ? 'text-rose-500 dark:text-teal-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            if (voiceError) clearError();
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          className="flex-1 min-w-0 min-h-[50px] sm:min-h-[52px] bg-transparent px-3 text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
        />

        <div className="flex items-center gap-1.5 pr-2 shrink-0">
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search query"
              title="Clear search"
              className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Prominent Tactile Hands-Free Voice Search Button */}
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.94, y: 1 }}
            onClick={handleMicClick}
            disabled={isRequesting}
            aria-label={
              isListening
                ? 'Stop voice symptom search'
                : isSupported
                ? 'Start hands-free voice symptom search'
                : 'Voice search unavailable in this browser'
            }
            aria-pressed={isListening}
            title={
              isListening
                ? 'Listening — tap to stop'
                : 'Speak your symptom hands-free (en-IN)'
            }
            className={`min-h-[40px] px-3 sm:px-3.5 rounded-xl border-b-[3px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
              isListening
                ? 'bg-gradient-to-r from-rose-600 to-teal-600 text-white border-rose-800 shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                : isRequesting
                ? 'bg-amber-500 text-white border-amber-700 cursor-wait'
                : 'bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white border-slate-950 dark:border-teal-800 active:border-b-0 active:translate-y-[2px]'
            }`}
          >
            {isRequesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="hidden xs:inline sm:inline">Mic...</span>
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-4 h-4 shrink-0" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 shrink-0 text-teal-300 dark:text-white" />
                <span className="hidden sm:inline">Voice Search</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Glowing Pulsing Listening Indicator with Soundwave Bars */}
      <AnimatePresence>
        {(isListening || isRequesting) && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-rose-300/80 dark:border-teal-500/50 bg-gradient-to-r from-rose-50/95 via-white to-teal-50/95 dark:from-rose-950/50 dark:via-slate-900 dark:to-teal-950/60 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                {!shouldReduceMotion && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-rose-600 to-teal-500" />
              </span>

              {/* Animated Soundwave Bars */}
              <div
                className="flex items-center gap-1 h-5 shrink-0"
                aria-hidden="true"
              >
                {SOUNDWAVE_BARS.map((bar, i) => (
                  <motion.span
                    key={i}
                    animate={
                      shouldReduceMotion || !isListening
                        ? { scaleY: 0.55 }
                        : { scaleY: bar.peaks }
                    }
                    transition={
                      shouldReduceMotion || !isListening
                        ? { duration: 0.1 }
                        : {
                            duration: 0.65,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                            delay: bar.delay,
                          }
                    }
                    className="w-1 h-4 origin-center rounded-full bg-gradient-to-t from-rose-500 to-teal-500"
                  />
                ))}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {isRequesting
                    ? 'Requesting microphone access...'
                    : 'Listening... Speak your symptom'}
                </p>
                {interimTranscript && (
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 truncate">
                    Heard: &ldquo;{interimTranscript}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={stopDictation}
              className="min-h-[32px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graceful Microphone Fallback Inline Toast */}
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            role="alert"
            aria-live="polite"
            className="rounded-2xl border border-amber-300 dark:border-amber-700/70 bg-amber-50/95 dark:bg-amber-950/60 px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-100 shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="font-medium leading-snug">{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              aria-label="Dismiss microphone notice"
              className="min-h-[30px] min-w-[30px] rounded-lg flex items-center justify-center text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/40 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick-Symptom Suggestion Chips + Live Match Telemetry */}
      {(showQuickChips || (value.trim().length > 0 && typeof resultCount === 'number')) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showQuickChips && (
            <div
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:flex-wrap"
              role="group"
              aria-label="Quick symptom filters"
            >
              {QUICK_SYMPTOM_CHIPS.map((chip) => {
                const isActive =
                  value.trim().toLowerCase() === chip.query.toLowerCase();
                return (
                  <motion.button
                    key={chip.id}
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                    onClick={() => {
                      if (voiceError) clearError();
                      if (isActive) {
                        onChange('');
                      } else if (onQuickChipSelect) {
                        onQuickChipSelect(chip.query);
                      } else {
                        onChange(chip.query);
                      }
                    }}
                    aria-pressed={isActive}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 border transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-700 border-b-[3px] border-b-teal-800 shadow-xs'
                        : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 border-b-[2px] border-b-slate-300 dark:border-b-slate-800 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300'
                    }`}
                  >
                    <span aria-hidden="true">{chip.emoji}</span>
                    <span>{chip.label}</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {value.trim().length > 0 && typeof resultCount === 'number' && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums ml-auto">
              {resultCount}
              {typeof totalCount === 'number' ? ` / ${totalCount}` : ''} matching
            </span>
          )}
        </div>
      )}
    </div>
  );
}
