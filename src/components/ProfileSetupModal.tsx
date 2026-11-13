import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, PhoneCall, ShieldCheck, X } from 'lucide-react';
import { DEHRADUN_HOSTEL_PRESETS } from '../data/campusData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { LatLngLiteral, StudentProfile } from '../types';
import { HostelPinPickerMap } from './HostelPinPickerMap';

interface AuthLikeUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

interface ProfileSetupModalProps {
  user: AuthLikeUser;
  existingProfile: StudentProfile | null;
  prefilledPhone?: string | null;
  isDemoMode?: boolean;
  isDarkMode?: boolean;
  onClose?: () => void;
  onSaved: (profile: StudentProfile) => void;
}

export function ProfileSetupModal({
  user,
  existingProfile,
  prefilledPhone,
  isDemoMode = false,
  isDarkMode = false,
  onClose,
  onSaved,
}: ProfileSetupModalProps) {
  const reduceMotion = useReducedMotion();
  const rawInitialPhone =
    existingProfile?.phone || user.phoneNumber || prefilledPhone || '';
  const initialDigits = rawInitialPhone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
  const alreadyPhoneVerified = Boolean(
    existingProfile?.phoneVerified || user.phoneNumber || prefilledPhone
  );

  const [phoneDigits, setPhoneDigits] = useState(initialDigits);
  const [phoneVerified, setPhoneVerified] = useState(alreadyPhoneVerified);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [hostelName, setHostelName] = useState(
    existingProfile?.hostelName ?? DEHRADUN_HOSTEL_PRESETS[0].name
  );
  const [roomNumber, setRoomNumber] = useState(existingProfile?.roomNumber ?? '');
  const [emergencyContactName, setEmergencyContactName] = useState(
    existingProfile?.emergencyContactName ?? ''
  );
  const [pin, setPin] = useState<LatLngLiteral>({
    lat: existingProfile?.gateLat ?? DEHRADUN_HOSTEL_PRESETS[0].coords.lat,
    lng: existingProfile?.gateLng ?? DEHRADUN_HOSTEL_PRESETS[0].coords.lng,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanDigits = phoneDigits.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = /^[6-9][0-9]{9}$/.test(cleanDigits);

  const handleSendOtp = () => {
    if (!isPhoneValid) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    setErrorMsg(null);
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otpInput.trim() === '2407' || otpInput.trim() === '123456') {
      setPhoneVerified(true);
      setOtpSent(false);
      setErrorMsg(null);
    } else {
      setErrorMsg('Invalid OTP code. Enter demo code 123456 or 2407 to verify.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number (+91).');
      return;
    }
    if (!phoneVerified) {
      setErrorMsg('Please verify your +91 WhatsApp/mobile number via OTP first.');
      return;
    }
    if (hostelName.trim().length < 2) {
      setErrorMsg('Please select or enter your Hostel / PG name.');
      return;
    }
    if (!roomNumber.trim()) {
      setErrorMsg('Please enter your room or wing number.');
      return;
    }
    if (emergencyContactName.trim().length < 2) {
      setErrorMsg('Please enter an emergency contact name (warden, roommate, or parent).');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const formattedPhone = `+91${cleanDigits}`;
    const savedProfile: StudentProfile = {
      uid: user.uid,
      displayName: (user.displayName || `Student ${cleanDigits.slice(-4)}`).slice(0, 100),
      email: (user.email || '').slice(0, 150),
      phone: formattedPhone,
      phoneVerified: true,
      hostelName: hostelName.trim().slice(0, 120),
      roomNumber: roomNumber.trim().slice(0, 30),
      emergencyContactName: emergencyContactName.trim().slice(0, 100),
      gateLat: Number(pin.lat.toFixed(6)),
      gateLng: Number(pin.lng.toFixed(6)),
      wellnessPassActive: existingProfile?.wellnessPassActive ?? false,
    };

    if (isDemoMode) {
      onSaved(savedProfile);
      setSaving(false);
      return;
    }

    const profilePayload = {
      ...savedProfile,
      createdAt: existingProfile?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const userPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), profilePayload, {
        merge: Boolean(existingProfile),
      });
      onSaved(savedProfile);
    } catch (err) {
      setSaving(false);
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-6 px-4">
      <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-teal-300 font-semibold">
              {existingProfile ? 'Update Campus Profile' : 'First-Time Campus Setup'}
            </span>
            <h1 className="text-lg font-bold tracking-tight mt-0.5">
              Save Your Hostel Gate &amp; WhatsApp Details
            </h1>
          </div>
          {onClose && existingProfile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile setup"
              className="min-h-[44px] min-w-[44px] rounded-xl text-slate-300 hover:bg-slate-800 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Authenticated Student</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {user.displayName || 'Campus Student'}{' '}
                {user.email ? `· ${user.email}` : user.phoneNumber ? `· ${user.phoneNumber}` : ''}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          </div>

          <div className="space-y-2.5">
            <label htmlFor="indian-mobile" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              10-Digit Indian Mobile / WhatsApp Number (+91)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
                <span className="px-3.5 flex items-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-sm font-semibold border-r border-slate-200 dark:border-slate-600">
                  +91
                </span>
                <input
                  id="indian-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={cleanDigits}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneDigits(digits);
                    setPhoneVerified(false);
                    setOtpSent(false);
                  }}
                  placeholder="9837422190"
                  className="flex-1 min-h-[44px] bg-transparent px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {phoneVerified ? (
                <div className="min-h-[44px] px-4 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>WhatsApp Verified</span>
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={handleSendOtp}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Verify via OTP</span>
                </motion.button>
              )}
            </div>

            {otpSent && !phoneVerified && (
              <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 p-3.5 space-y-2.5">
                <div className="text-xs text-teal-950 dark:text-teal-200">
                  Enter verification code (Demo OTP:{' '}
                  <span className="font-mono font-bold">2407</span>)
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="2407"
                    className="w-32 min-h-[44px] rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 px-3 text-center font-mono text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                  >
                    Confirm OTP
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dehradun Hostel Block / PG Cluster
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEHRADUN_HOSTEL_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => {
                    setHostelName(preset.name);
                    setPin(preset.coords);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    hostelName === preset.name
                      ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-500'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-600'
                  }`}
                >
                  {preset.name}
                </motion.button>
              ))}
            </div>
            <input
              type="text"
              value={hostelName}
              onChange={(e) => setHostelName(e.target.value)}
              placeholder="Or type your Hostel / PG Name"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="setup-room" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Room / Wing Number
              </label>
              <input
                id="setup-room"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. A-314"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            <div>
              <label htmlFor="setup-emergency-contact" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Emergency Contact Name
              </label>
              <input
                id="setup-emergency-contact"
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Aarav Sharma (Roommate)"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pin Your Hostel Gate Handover Location
            </span>
            <HostelPinPickerMap pin={pin} onChangePin={setPin} isDarkMode={isDarkMode} />
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          <motion.button
            type="submit"
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            disabled={saving}
            className="w-full min-h-[52px] rounded-2xl bg-teal-600 hover:bg-teal-500 border-b-[4px] border-teal-800 disabled:bg-slate-400 text-white text-sm font-semibold px-4 py-3 transition-colors"
          >
            {saving
              ? 'Saving Campus Profile...'
              : existingProfile
              ? 'Save Profile Changes'
              : 'Save Campus Profile & Enter Store'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
