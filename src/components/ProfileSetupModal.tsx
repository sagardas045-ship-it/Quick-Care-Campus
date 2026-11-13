import { useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, PhoneCall, ShieldCheck, X } from 'lucide-react';
import { DEHRADUN_HOSTEL_PRESETS } from '../data/campusData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { LatLngLiteral, StudentProfile } from '../types';
import { HostelPinPickerMap } from './HostelPinPickerMap';

interface ProfileSetupModalProps {
  user: User;
  existingProfile: StudentProfile | null;
  onClose?: () => void;
  onSaved: (profile: StudentProfile) => void;
}

export function ProfileSetupModal({
  user,
  existingProfile,
  onClose,
  onSaved,
}: ProfileSetupModalProps) {
  const initialDigits = existingProfile?.phone
    ? existingProfile.phone.replace(/^\+91/, '')
    : '';

  const [phoneDigits, setPhoneDigits] = useState(initialDigits);
  const [phoneVerified, setPhoneVerified] = useState(existingProfile?.phoneVerified ?? false);
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
    if (otpInput.trim() === '2407') {
      setPhoneVerified(true);
      setOtpSent(false);
      setErrorMsg(null);
    } else {
      setErrorMsg('Invalid OTP code. Enter the 4-digit demo verification code 2407.');
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
    const profilePayload = {
      uid: user.uid,
      displayName: (user.displayName || 'Campus Student').slice(0, 100),
      email: (user.email || 'student@campus.edu').slice(0, 150),
      phone: formattedPhone,
      phoneVerified: true,
      hostelName: hostelName.trim().slice(0, 120),
      roomNumber: roomNumber.trim().slice(0, 30),
      emergencyContactName: emergencyContactName.trim().slice(0, 100),
      gateLat: Number(pin.lat.toFixed(6)),
      gateLng: Number(pin.lng.toFixed(6)),
      wellnessPassActive: existingProfile?.wellnessPassActive ?? false,
      createdAt: existingProfile?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const userPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), profilePayload, {
        merge: Boolean(existingProfile),
      });
      onSaved({
        uid: profilePayload.uid,
        displayName: profilePayload.displayName,
        email: profilePayload.email,
        phone: profilePayload.phone,
        phoneVerified: true,
        hostelName: profilePayload.hostelName,
        roomNumber: profilePayload.roomNumber,
        emergencyContactName: profilePayload.emergencyContactName,
        gateLat: profilePayload.gateLat,
        gateLng: profilePayload.gateLng,
        wellnessPassActive: profilePayload.wellnessPassActive,
      });
    } catch (err) {
      setSaving(false);
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
          {/* Authenticated Google Summary */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Signed in with Google</div>
              <div className="text-sm font-bold text-slate-900">
                {user.displayName || 'Student'} · {user.email}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
          </div>

          {/* 10-Digit +91 Mobile Number + OTP Verification */}
          <div className="space-y-2.5">
            <label htmlFor="indian-mobile" className="block text-xs font-semibold text-slate-700">
              10-Digit Indian Mobile / WhatsApp Number (+91)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
                <span className="px-3.5 flex items-center bg-slate-100 text-slate-700 font-mono text-sm font-semibold border-r border-slate-200">
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
                  className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                />
              </div>

              {phoneVerified ? (
                <div className="min-h-[44px] px-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>WhatsApp Verified</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Verify via OTP</span>
                </button>
              )}
            </div>

            {otpSent && !phoneVerified && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-2.5">
                <div className="text-xs text-teal-950">
                  Enter the 4-digit WhatsApp verification code (Demo OTP:{' '}
                  <span className="font-mono font-bold">2407</span>)
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="2407"
                    className="w-32 min-h-[44px] rounded-xl border border-teal-300 bg-white px-3 text-center font-mono text-sm font-bold tracking-widest text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                  >
                    Confirm OTP
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hostel / PG Selector & Custom Input */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              Dehradun Hostel / PG Cluster
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEHRADUN_HOSTEL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setHostelName(preset.name);
                    setPin(preset.coords);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    hostelName === preset.name
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-600'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={hostelName}
              onChange={(e) => setHostelName(e.target.value)}
              placeholder="Or type your Hostel / PG Name"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          {/* Room Number & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="setup-room" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Room / Wing Number
              </label>
              <input
                id="setup-room"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. A-314"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            <div>
              <label htmlFor="setup-emergency-contact" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Contact Name
              </label>
              <input
                id="setup-emergency-contact"
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Aarav Sharma (Roommate)"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
          </div>

          {/* Drop Hostel Gate Pin on Google Map */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              Pin Your Hostel Gate Handover Location
            </span>
            <HostelPinPickerMap pin={pin} onChangePin={setPin} />
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[52px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-sm font-semibold px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            {saving
              ? 'Saving Campus Profile...'
              : existingProfile
              ? 'Save Profile Changes'
              : 'Save Campus Profile & Enter Store'}
          </button>
        </form>
      </div>
    </div>
  );
}
