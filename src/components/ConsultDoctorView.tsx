import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  Languages,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Video,
} from 'lucide-react';
import {
  DOCTOR_SPECIALTY_FILTERS,
  DURATION_OPTIONS,
  findBestMatchedDoctor,
  getDoctorById,
  ON_CALL_DOCTORS,
  TRIAGE_SYMPTOM_CHIPS,
} from '../data/doctorsData';
import type {
  CampusConsultation,
  ConsultationMessage,
  DigitalPrescription,
  DoctorProfile,
  DoctorSpecialtyFilter,
  ReliefKit,
  StudentProfile,
  UpiProvider,
} from '../types';
import {
  buildDeterministicDoctorTriage,
  type DoctorTriageRequest,
  type DoctorTriageResponse,
} from '../utils/doctorTriageEngine';
import { ProductPhoto } from './ProductPhoto';

interface ConsultDoctorViewProps {
  profile: StudentProfile;
  kits: ReliefKit[];
  consultations: CampusConsultation[];
  onCreateConsultation: (consultation: CampusConsultation) => Promise<boolean>;
  onUpdateConsultation: (
    consultationId: string,
    patch: Partial<CampusConsultation>
  ) => Promise<void>;
  onAddRecommendedToCart: (kitIds: string[]) => {
    addedCount: number;
    addedNames: string[];
  };
  onGoToStorefrontCheckout: () => void;
}

const UPI_PROVIDERS: UpiProvider[] = ['GPay', 'PhonePe', 'Paytm'];

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function ConsultDoctorView({
  profile,
  kits,
  consultations,
  onCreateConsultation,
  onUpdateConsultation,
  onAddRecommendedToCart,
  onGoToStorefrontCheckout,
}: ConsultDoctorViewProps) {
  const shouldReduceMotion = useReducedMotion();

  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(
    () => {
      const active = consultations.find((c) => c.status !== 'completed');
      return active?.id ?? consultations[0]?.id ?? null;
    }
  );
  const [composerMode, setComposerMode] = useState<boolean>(
    consultations.length === 0
  );

  // Triage & Booking State
  const [specialtyFilter, setSpecialtyFilter] =
    useState<DoctorSpecialtyFilter>('All Doctors');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    ON_CALL_DOCTORS[0].id
  );
  const [doctorPinnedByUser, setDoctorPinnedByUser] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['High Fever']);
  const [duration, setDuration] = useState<string>(DURATION_OPTIONS[0]);
  const [allergies, setAllergies] = useState<string>('None known');
  const [notes, setNotes] = useState<string>('');
  const [upiProvider, setUpiProvider] = useState<UpiProvider>('GPay');
  const [triageError, setTriageError] = useState<string | null>(null);
  const [creatingConsult, setCreatingConsult] = useState(false);

  // Live Chat & Video/Voice Call Overlay State
  const [chatInput, setChatInput] = useState('');
  const [aiReplying, setAiReplying] = useState(false);
  const [callMode, setCallMode] = useState<'none' | 'video' | 'audio'>('none');
  const [callSeconds, setCallSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [addedToCartNotice, setAddedToCartNotice] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const activeConsultation = useMemo(() => {
    if (composerMode) return null;
    if (selectedConsultationId) {
      const matched = consultations.find((c) => c.id === selectedConsultationId);
      if (matched) return matched;
    }
    return consultations[0] ?? null;
  }, [composerMode, consultations, selectedConsultationId]);

  useEffect(() => {
    if (consultations.length > 0 && !selectedConsultationId && !composerMode) {
      setSelectedConsultationId(consultations[0].id);
    }
  }, [consultations, selectedConsultationId, composerMode]);

  useEffect(() => {
    if (callMode === 'none') {
      setCallSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callMode]);

  useEffect(() => {
    if (!addedToCartNotice) return;
    const t = window.setTimeout(() => setAddedToCartNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [addedToCartNotice]);

  useEffect(() => {
    if (activeConsultation?.messages.length) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeConsultation?.messages.length]);

  const selectedDoctor: DoctorProfile = getDoctorById(selectedDoctorId);

  const effectiveFee = profile.wellnessPassActive
    ? selectedDoctor.passFee
    : selectedDoctor.baseFee;

  const bestMatch = useMemo(
    () => findBestMatchedDoctor(selectedSymptoms),
    [selectedSymptoms]
  );

  const visibleDoctors = useMemo(() => {
    const base =
      specialtyFilter === 'All Doctors'
        ? ON_CALL_DOCTORS
        : ON_CALL_DOCTORS.filter((doc) => doc.specialtyCategory === specialtyFilter);
    if (!bestMatch.matchedSymptom) return base;
    return [...base].sort((a, b) => {
      if (a.id === bestMatch.doctor.id) return -1;
      if (b.id === bestMatch.doctor.id) return 1;
      return 0;
    });
  }, [specialtyFilter, bestMatch]);

  const handleSelectSpecialtyFilter = (filter: DoctorSpecialtyFilter) => {
    setSpecialtyFilter(filter);
    if (filter === 'All Doctors') return;
    const matchingDocs = ON_CALL_DOCTORS.filter(
      (doc) => doc.specialtyCategory === filter
    );
    if (
      matchingDocs.length > 0 &&
      !matchingDocs.some((doc) => doc.id === selectedDoctorId)
    ) {
      setSelectedDoctorId(matchingDocs[0].id);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setTriageError(null);
    setSelectedSymptoms((prev) => {
      const exists = prev.includes(symptom);
      const next = exists
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom].slice(0, 10);

      if (!doctorPinnedByUser && next.length > 0) {
        const match = findBestMatchedDoctor(next);
        if (match.matchedSymptom) {
          setSelectedDoctorId(match.doctor.id);
          if (
            specialtyFilter !== 'All Doctors' &&
            match.doctor.specialtyCategory !== specialtyFilter
          ) {
            setSpecialtyFilter('All Doctors');
          }
        }
      }
      return next;
    });
  };

  const requestDoctorTriageReply = async (
    consultation: CampusConsultation,
    nextMessages: ConsultationMessage[]
  ): Promise<DoctorTriageResponse> => {
    const inStockIds = kits.filter((k) => k.inStock).map((k) => k.id);
    const payload: DoctorTriageRequest = {
      doctorName: consultation.doctorName,
      doctorSpecialty: consultation.doctorSpecialty,
      doctorNmcReg: consultation.doctorNmcReg,
      studentName: consultation.studentName,
      symptoms: consultation.symptoms,
      duration: consultation.duration,
      allergies: consultation.allergies,
      notes: consultation.notes,
      messages: nextMessages.map((m) => ({ sender: m.sender, text: m.text })),
      availableKitIds: inStockIds,
    };

    try {
      const response = await fetch('/api/doctor-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = (await response.json()) as DoctorTriageResponse;
        if (data && typeof data.replyText === 'string' && data.prescription) {
          return data;
        }
      }
    } catch {
      // Fallback gracefully when backend endpoint is unreachable
    }
    return buildDeterministicDoctorTriage(payload);
  };

  const handleStartConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      setTriageError('Please select at least one symptom chip so the doctor can triage safely.');
      return;
    }

    setTriageError(null);
    setCreatingConsult(true);

    const consultId = `CONS-${Date.now().toString().slice(-6)}-${Math.floor(
      10 + Math.random() * 89
    )}`;
    const nowIso = new Date().toISOString();
    const cleanAllergies = allergies.trim() || 'None known';
    const cleanNotes = notes.trim();

    const initialStudentMsg: ConsultationMessage = {
      id: `msg-${Date.now()}-stu`,
      sender: 'student',
      senderName: profile.displayName,
      text: `Symptoms: ${selectedSymptoms.join(', ')} (${duration}). Allergies: ${cleanAllergies}.${
        cleanNotes ? ` Notes: ${cleanNotes}` : ''
      }`,
      timestampIso: nowIso,
    };

    const draftConsultation: CampusConsultation = {
      id: consultId,
      studentUid: profile.uid,
      studentName: profile.displayName.slice(0, 100),
      studentPhone: profile.phone,
      hostelName: profile.hostelName.slice(0, 120),
      roomNumber: (profile.roomNumber || 'Gate').slice(0, 30),
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpecialty: `${selectedDoctor.qualification} · ${selectedDoctor.specialty}`.slice(
        0,
        100
      ),
      doctorNmcReg: selectedDoctor.nmcReg,
      symptoms: selectedSymptoms,
      duration,
      allergies: cleanAllergies.slice(0, 200),
      notes: cleanNotes.slice(0, 400),
      consultationFee: effectiveFee,
      wellnessPassApplied: profile.wellnessPassActive,
      upiProvider,
      status: 'active',
      messages: [initialStudentMsg],
      recommendedKitIds: [],
    };

    try {
      const ok = await onCreateConsultation(draftConsultation);
      if (!ok) {
        setTriageError('Unable to initiate teleconsultation right now. Please try again.');
        setCreatingConsult(false);
        return;
      }

      setSelectedConsultationId(consultId);
      setComposerMode(false);
      setCreatingConsult(false);
      setAiReplying(true);

      const aiResult = await requestDoctorTriageReply(draftConsultation, [
        initialStudentMsg,
      ]);

      const doctorMsg: ConsultationMessage = {
        id: `msg-${Date.now()}-doc`,
        sender: 'doctor',
        senderName: selectedDoctor.name,
        text: aiResult.replyText,
        timestampIso: new Date().toISOString(),
      };

      const nextMessages = [initialStudentMsg, doctorMsg];
      const nextPrescription: DigitalPrescription | undefined = aiResult.issuePrescription
        ? aiResult.prescription
        : undefined;

      await onUpdateConsultation(consultId, {
        messages: nextMessages,
        status: nextPrescription ? 'prescribed' : 'active',
        recommendedKitIds: nextPrescription?.recommendedKitIds ?? [],
        ...(nextPrescription ? { prescription: nextPrescription } : {}),
      });
    } finally {
      setCreatingConsult(false);
      setAiReplying(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultation) return;
    const trimmed = chatInput.trim();
    if (!trimmed || aiReplying || activeConsultation.status === 'completed') return;

    const studentMsg: ConsultationMessage = {
      id: `msg-${Date.now()}-stu`,
      sender: 'student',
      senderName: profile.displayName,
      text: trimmed.slice(0, 500),
      timestampIso: new Date().toISOString(),
    };

    const messagesWithStudent = [...activeConsultation.messages, studentMsg].slice(-50);
    setChatInput('');
    setAiReplying(true);

    try {
      await onUpdateConsultation(activeConsultation.id, {
        messages: messagesWithStudent,
      });

      const aiResult = await requestDoctorTriageReply(
        activeConsultation,
        messagesWithStudent
      );

      const doctorMsg: ConsultationMessage = {
        id: `msg-${Date.now()}-doc`,
        sender: 'doctor',
        senderName: activeConsultation.doctorName,
        text: aiResult.replyText,
        timestampIso: new Date().toISOString(),
      };

      const finalMessages = [...messagesWithStudent, doctorMsg].slice(-50);
      const mergedRecs = Array.from(
        new Set([
          ...(activeConsultation.recommendedKitIds || []),
          ...(aiResult.prescription?.recommendedKitIds || []),
        ])
      ).slice(0, 6);

      const updatedRx: DigitalPrescription = {
        ...aiResult.prescription,
        recommendedKitIds: mergedRecs.length > 0 ? mergedRecs : aiResult.prescription.recommendedKitIds,
      };

      await onUpdateConsultation(activeConsultation.id, {
        messages: finalMessages,
        status: 'prescribed',
        recommendedKitIds: updatedRx.recommendedKitIds,
        prescription: updatedRx,
      });
    } finally {
      setAiReplying(false);
    }
  };

  const kitsById = useMemo(() => {
    const map = new globalThis.Map<string, ReliefKit>();
    kits.forEach((kit) => map.set(kit.id, kit));
    return map;
  }, [kits]);

  const recommendedKitsList = useMemo(() => {
    if (!activeConsultation) return [];
    const ids =
      activeConsultation.recommendedKitIds.length > 0
        ? activeConsultation.recommendedKitIds
        : activeConsultation.prescription?.recommendedKitIds ?? [];
    return ids
      .map((id) => kitsById.get(id))
      .filter((kit): kit is ReliefKit => Boolean(kit));
  }, [activeConsultation, kitsById]);

  const activeDoctorMeta = activeConsultation
    ? getDoctorById(activeConsultation.doctorId)
    : selectedDoctor;

  return (
    <div className="space-y-6">
      {/* Teleconsultation Clinical Header & Session Switcher */}
      <section
        aria-label="24/7 On-Call MBBS Teleconsultation Header"
        className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488] dark:text-teal-300">
              <Stethoscope className="w-4 h-4 shrink-0" />
              <span>24/7 Curfew Telehealth · 10:00 PM – 6:00 AM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
              Consult an On-Call Specialist
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {ON_CALL_DOCTORS.length} NMC &amp; DDC-registered night doctors respond in ~2–3 mins with dosage safety checks, video/voice consults, and one-tap OTC kits to {profile.hostelName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {consultations.length > 0 && !composerMode && (
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => {
                  setCallMode('none');
                  setComposerMode(true);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Consult</span>
              </motion.button>
            )}
            {composerMode && consultations.length > 0 && (
              <button
                type="button"
                onClick={() => setComposerMode(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-sm font-semibold text-[#0F172A] dark:text-slate-100 hover:border-[#0D9488] whitespace-nowrap transition-colors"
              >
                Resume Active Session ({consultations.length})
              </button>
            )}
          </div>
        </div>

        {/* Saved Consultations Switcher */}
        {consultations.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {consultations.map((consult) => {
              const isSelected = !composerMode && activeConsultation?.id === consult.id;
              return (
                <button
                  key={consult.id}
                  type="button"
                  onClick={() => {
                    setCallMode('none');
                    setSelectedConsultationId(consult.id);
                    setComposerMode(false);
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      consult.status === 'completed'
                        ? 'bg-slate-400'
                        : consult.status === 'prescribed'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>{consult.doctorName}</span>
                  <span className="opacity-75 font-mono text-[11px]">
                    {consult.symptoms[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* VIEW A: ON-CALL DOCTORS ROSTER + QUICK SYMPTOM TRIAGE FORM */}
      {(composerMode || !activeConsultation) && (
        <div className="space-y-6">
          {/* 1. On-Call Night Physicians Roster */}
          <section aria-label="On-call curfew physicians" className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                1. Choose Your On-Call Night Specialist ({visibleDoctors.length})
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {profile.wellnessPassActive
                  ? 'Wellness Pass Discount Active (50% Off · ₹39–₹59)'
                  : 'Curfew Consults ₹79–₹119 · Pass Holders ₹39–₹59'}
              </span>
            </div>

            {/* Horizontal Scrollable Specialty Filter Chips */}
            <div
              role="tablist"
              aria-label="Filter night doctors by specialty"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            >
              {DOCTOR_SPECIALTY_FILTERS.map((filter) => {
                const isActive = specialtyFilter === filter;
                const label =
                  filter === 'All Doctors'
                    ? `All Doctors (${ON_CALL_DOCTORS.length})`
                    : filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectSpecialtyFilter(filter)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleDoctors.map((doctor) => {
                const isSelected = selectedDoctorId === doctor.id;
                const isBestMatch =
                  Boolean(bestMatch.matchedSymptom) &&
                  bestMatch.doctor.id === doctor.id;
                const displayFee = profile.wellnessPassActive
                  ? doctor.passFee
                  : doctor.baseFee;
                return (
                  <motion.button
                    key={doctor.id}
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      setSelectedDoctorId(doctor.id);
                      setDoctorPinnedByUser(true);
                    }}
                    className={`text-left rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
                      isSelected
                        ? 'border-[#0D9488] bg-teal-50/50 dark:bg-teal-950/35 ring-1 ring-[#0D9488]/30'
                        : isBestMatch
                        ? 'border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 hover:border-[#0D9488]'
                        : 'border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400'
                    }`}
                  >
                    <div className="space-y-3">
                      {isBestMatch && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-100/90 dark:bg-teal-900/60 border border-teal-300 dark:border-teal-700 px-2 py-0.5 text-[11px] font-bold text-teal-900 dark:text-teal-200">
                          <Sparkles className="w-3 h-3 text-teal-700 dark:text-teal-300" />
                          <span>Best Match for Your Symptom</span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                          <img
                            src={doctor.photoUrl}
                            alt={doctor.name}
                            className="w-full h-full object-cover object-top"
                          />
                          <span
                            title="Online on curfew duty"
                            className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {doctor.name}
                            </h3>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                            {doctor.qualification} · {doctor.experienceYears} yrs exp
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {doctor.nmcReg}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {doctor.specialty}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {doctor.focusSymptoms}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{doctor.languages.join('/')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {doctor.responseTimeLabel}
                        </span>
                      </div>

                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums shrink-0">
                        {profile.wellnessPassActive && (
                          <span className="text-[11px] line-through text-slate-400 mr-1">
                            ₹{doctor.baseFee}
                          </span>
                        )}
                        ₹{displayFee}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 2. Quick Symptom Triage Form + Instant Payment */}
          <form
            onSubmit={handleStartConsultation}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_12px_28px_-16px_rgba(15,23,42,0.12)] space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  2. Quick Symptom Triage Form
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shared privately with {selectedDoctor.name} before your chat or HD video call starts
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-300">
                Patient: {profile.displayName} · Rm {profile.roomNumber}
              </span>
            </div>

            {/* Symptom Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Main Symptoms (tap one or more)
              </label>
              <div className="flex flex-wrap gap-2">
                {TRIAGE_SYMPTOM_CHIPS.map((symptom) => {
                  const selected = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-semibold border border-b-[3px] transition-all whitespace-nowrap ${
                        selected
                          ? 'bg-teal-600 text-white border-teal-700 border-b-teal-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 hover:border-teal-500'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {symptom}
                    </button>
                  );
                })}
              </div>

              {bestMatch.matchedSymptom && bestMatch.doctor.id !== selectedDoctorId && (
                <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-teal-950 dark:text-teal-100">
                    Recommended specialist for{' '}
                    <strong>{bestMatch.matchedSymptom}</strong>:{' '}
                    <strong>{bestMatch.doctor.name}</strong> ({bestMatch.doctor.specialtyCategory})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctorId(bestMatch.doctor.id);
                      setDoctorPinnedByUser(false);
                      setSpecialtyFilter('All Doctors');
                    }}
                    className="min-h-[34px] px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold whitespace-nowrap"
                  >
                    Select {bestMatch.doctor.name}
                  </button>
                </div>
              )}
            </div>

            {/* Duration & Drug Allergies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  How long have you had these symptoms?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDuration(opt)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        duration === opt
                          ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="triage-allergies"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Known Drug / Medicine Allergies
                  </label>
                  <button
                    type="button"
                    onClick={() => setAllergies('None known')}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Set &ldquo;None known&rdquo;
                  </button>
                </div>
                <input
                  id="triage-allergies"
                  type="text"
                  maxLength={200}
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g., Sulfa drugs, Aspirin, Ibuprofen, or None known"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Physician checks this field before clearing any OTC medication.
                </p>
              </div>
            </div>

            {/* Extra Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="triage-notes"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Additional Notes for the Doctor (Optional)
              </label>
              <textarea
                id="triage-notes"
                rows={2}
                maxLength={400}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Fever measured 101.2°F, sore throat started after mess dinner, feeling weak..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none resize-none"
              />
            </div>

            {triageError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:text-rose-200">
                {triageError}
              </div>
            )}

            {/* Simulated UPI Checkout & Connect Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Simulated UPI Pay: ₹{effectiveFee}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {profile.wellnessPassActive
                      ? 'Semester Wellness Pass Rate (50% Off)'
                      : `Regular Night Consult (₹${selectedDoctor.passFee} w/ Wellness Pass)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {UPI_PROVIDERS.map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setUpiProvider(provider)}
                      className={`min-h-[38px] px-3 py-1 rounded-xl border text-xs font-semibold transition-colors ${
                        upiProvider === provider
                          ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                disabled={creatingConsult}
                className="min-h-[52px] px-6 py-3 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 transition-colors"
              >
                <Stethoscope className="w-4 h-4" />
                <span>
                  {creatingConsult
                    ? 'Connecting Doctor...'
                    : `Pay ₹${effectiveFee} & Connect ${selectedDoctor.name}`}
                </span>
              </motion.button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW B: INTERACTIVE LIVE CONSULTATION ROOM */}
      {!composerMode && activeConsultation && (
        <div className="space-y-5">
          {/* Consultation Bar & Call Mode Triggers */}
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={activeDoctorMeta.photoUrl}
                    alt={activeConsultation.doctorName}
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                      #{activeConsultation.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        activeConsultation.status === 'completed'
                          ? 'text-slate-500 dark:text-slate-400'
                          : activeConsultation.status === 'prescribed'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-teal-700 dark:text-teal-400'
                      }`}
                    >
                      {activeConsultation.status === 'completed'
                        ? 'Consultation Completed'
                        : activeConsultation.status === 'prescribed'
                        ? 'Rx Issued · Chat Open'
                        : 'Doctor Live Now'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {activeConsultation.doctorName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {activeConsultation.doctorSpecialty} · {activeConsultation.doctorNmcReg}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCameraOff(false);
                    setMicMuted(false);
                    setCallMode((prev) => (prev === 'video' ? 'none' : 'video'));
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    callMode === 'video'
                      ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                      : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>{callMode === 'video' ? 'Hide Video Call' : 'HD Video Call'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMicMuted(false);
                    setCallMode((prev) => (prev === 'audio' ? 'none' : 'audio'));
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    callMode === 'audio'
                      ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  <PhoneCall className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{callMode === 'audio' ? 'Hide Voice Call' : 'Voice Call'}</span>
                </button>
              </div>
            </div>

            {/* Reported Triage Summary Strip */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 px-4 py-3 text-xs flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">
                Triage: {activeConsultation.symptoms.join(', ')}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Duration: {activeConsultation.duration}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Allergies: <strong>{activeConsultation.allergies}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                Paid ₹{activeConsultation.consultationFee} via {activeConsultation.upiProvider}
              </span>
            </div>

            {/* SIMULATED HD VIDEO / VOICE CALL OVERLAY PANEL */}
            {callMode !== 'none' && (
              <div
                aria-label="Simulated telehealth call overlay"
                className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 text-white p-4 sm:p-5 space-y-4 shadow-2xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-300">
                      {callMode === 'video' ? 'HD Video Consult Active' : 'HD Voice Call Connected'}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {formatCallDuration(callSeconds)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    E2EE Campus Telehealth
                  </span>
                </div>

                {callMode === 'video' ? (
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img
                      src={activeDoctorMeta.photoUrl}
                      alt={activeConsultation.doctorName}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30" />

                    <div className="absolute bottom-3 left-3 right-28 space-y-0.5">
                      <div className="text-sm font-bold text-white">
                        {activeConsultation.doctorName}
                      </div>
                      <div className="text-[11px] text-teal-300 font-mono">
                        {activeDoctorMeta.qualification} · {activeConsultation.doctorNmcReg}
                      </div>
                    </div>

                    {/* Picture-in-Picture Student Self Tile */}
                    <div className="absolute bottom-3 right-3 w-24 h-28 rounded-xl bg-slate-900/95 border border-white/20 flex flex-col items-center justify-center p-2 text-center shadow-lg">
                      {cameraOff ? (
                        <>
                          <CameraOff className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-400">Cam Off</span>
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-full bg-teal-600/30 border border-teal-400/50 flex items-center justify-center text-xs font-bold text-teal-200 mb-1">
                            {profile.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-medium text-slate-200 truncate w-full">
                            {profile.displayName}
                          </span>
                          <span className="text-[9px] text-emerald-400">Live Cam</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-teal-400 shadow-lg">
                      <img
                        src={activeDoctorMeta.photoUrl}
                        alt={activeConsultation.doctorName}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {activeConsultation.doctorName}
                      </div>
                      <div className="text-xs text-teal-300">
                        Voice Consultation · {formatCallDuration(callSeconds)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Call Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMicMuted((prev) => !prev)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      micMuted
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{micMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                  </button>

                  {callMode === 'video' && (
                    <button
                      type="button"
                      onClick={() => setCameraOff((prev) => !prev)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        cameraOff
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {cameraOff ? (
                        <CameraOff className="w-4 h-4" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      <span>{cameraOff ? 'Turn Camera On' : 'Camera Off'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setCallMode((prev) => (prev === 'video' ? 'audio' : 'video'))
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {callMode === 'video' ? (
                      <>
                        <PhoneCall className="w-4 h-4 text-teal-400" />
                        <span>Switch to Audio</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 text-teal-400" />
                        <span>Switch to Video</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallMode('none')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Consultation Chat & Digital Prescription Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Real-Time Medical Chat Panel */}
            <section
              aria-label="Real-time medical consultation chat"
              className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col shadow-sm"
            >
              <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Live Clinical Chat &amp; Follow-Up</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {activeConsultation.messages.length} messages
                </span>
              </div>

              <div className="p-4 space-y-3 max-h-[430px] overflow-y-auto">
                {activeConsultation.messages.map((msg) => {
                  const isStudent = msg.sender === 'student';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 px-1">
                        {msg.senderName} · {formatMessageTime(msg.timestampIso)}
                      </div>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                          isStudent
                            ? 'bg-teal-600 text-white rounded-br-sm'
                            : msg.sender === 'admin'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-bl-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {aiReplying && (
                  <div className="flex items-start gap-2">
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-300 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      <span>{activeConsultation.doctorName} is reviewing your symptoms...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {activeConsultation.status === 'completed' ? (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Consultation marked completed. Digital Rx stays saved below.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCallMode('none');
                      setComposerMode(true);
                    }}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Start New Consult
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendChatMessage}
                  className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
                >
                  <input
                    type="text"
                    maxLength={500}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Reply to doctor (e.g., fever is 101°F, no vomiting)..."
                    aria-label="Message to on-call doctor"
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-white focus:border-teal-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || aiReplying}
                    aria-label="Send message to doctor"
                    className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              )}
            </section>

            {/* OFFICIAL DIGITAL PRESCRIPTION & ONE-TAP OTC CART ADD CARD */}
            <aside
              aria-label="Official digital prescription and recommended OTC kits"
              className="lg:col-span-5 rounded-3xl border border-teal-200 dark:border-teal-800/80 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-[0_14px_32px_-16px_rgba(13,148,136,0.22)]"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Official Digital Prescription &amp; OTC Plan
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {activeConsultation.doctorName} · {activeConsultation.doctorNmcReg}
                    </p>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>

              {activeConsultation.prescription ? (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Clinical Assessment
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeConsultation.prescription.diagnosisSummary}
                    </p>
                  </div>

                  <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/70 p-3 space-y-1">
                    <div className="font-bold text-teal-900 dark:text-teal-200">
                      Dosage &amp; Usage Guidance
                    </div>
                    <p className="text-teal-950 dark:text-teal-100 leading-relaxed">
                      {activeConsultation.prescription.dosageGuidance}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Hostel Self-Care &amp; First-Aid
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeConsultation.prescription.firstAidAdvice}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Allergy Check:</strong>{' '}
                    {activeConsultation.prescription.allergyCheckNote}
                  </div>

                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 p-3 flex items-start gap-2 text-[11px] text-amber-950 dark:text-amber-100">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{activeConsultation.prescription.redFlagWarning}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-600 dark:text-slate-300">
                  Doctor is reviewing your triage form. Your digital prescription and OTC kit recommendation will appear here momentarily.
                </div>
              )}

              {/* Matched OTC Catalog Kits + One-Tap Add to Cart */}
              {recommendedKitsList.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Doctor-Recommended OTC Kits ({recommendedKitsList.length})
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                      Total ₹
                      {recommendedKitsList
                        .filter((k) => k.inStock)
                        .reduce((sum, k) => sum + k.price, 0)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {recommendedKitsList.map((kit) => (
                      <div
                        key={kit.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-2.5 flex items-center gap-3"
                      >
                        <div className="w-16 aspect-[4/3] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shrink-0">
                          <ProductPhoto product={kit} compact={true} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono text-teal-700 dark:text-teal-400">
                            {kit.skuCode || kit.sealedCode} · {kit.inStock ? 'In Stock' : 'Out of Stock'}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {kit.name}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            ₹{kit.price} · {kit.etaMinutes} min ETA
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    onClick={() => {
                      const result = onAddRecommendedToCart(
                        recommendedKitsList.map((k) => k.id)
                      );
                      if (result.addedCount > 0) {
                        setAddedToCartNotice(
                          `Added ${result.addedCount} recommended item(s): ${result.addedNames.join(', ')}`
                        );
                      } else {
                        setAddedToCartNotice(
                          'Recommended kit(s) are currently out of stock.'
                        );
                      }
                    }}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold border-b-[4px] border-teal-800 active:border-b-0 active:translate-y-[3px] flex items-center justify-center gap-2 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ Add Recommended Items to Cart</span>
                  </motion.button>

                  {addedToCartNotice && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
                      <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        {addedToCartNotice}
                      </div>
                      <button
                        type="button"
                        onClick={onGoToStorefrontCheckout}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <span>Proceed to 60-Second Checkout</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
