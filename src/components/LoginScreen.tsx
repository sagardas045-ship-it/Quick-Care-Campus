import { useEffect, useRef, useState } from 'react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth';
import {
  Clock,
  Cross,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { UserRoleMode } from '../types';

interface LoginScreenProps {
  onSelectRoleIntent: (role: UserRoleMode) => void;
  onPrefillVerifiedPhone: (phone: string) => void;
}

type StudentAuthMethod = 'google' | 'mobile';
type AdminAuthMethod = 'passcode' | 'email';

export function LoginScreen({
  onSelectRoleIntent,
  onPrefillVerifiedPhone,
}: LoginScreenProps) {
  const [loginTab, setLoginTab] = useState<UserRoleMode>('student');

  // Student auth states
  const [studentMethod, setStudentMethod] = useState<StudentAuthMethod>('google');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [demoOtpMode, setDemoOtpMode] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Admin auth states
  const [adminMethod, setAdminMethod] = useState<AdminAuthMethod>('passcode');
  const [passcode, setPasscode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // ignore cleanup errors
        }
        recaptchaRef.current = null;
      }
    };
  }, []);

  const cleanDigits = phoneDigits.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = /^[6-9][0-9]{9}$/.test(cleanDigits);

  const handleGoogleSignIn = async (intendedRole: UserRoleMode) => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    onSelectRoleIntent(intendedRole);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google Sign-In failed.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Google Sign-In popup was closed. Please try again.');
      } else if (msg.includes('unauthorized-domain')) {
        setErrorMsg(
          'Add this preview domain in Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMobileOtp = async () => {
    if (!isPhoneValid) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setErrorMsg(null);
    setInfoMsg(null);

    if (demoOtpMode) {
      setOtpSent(true);
      setInfoMsg('Demo OTP ready for class testing. Enter 123456 below to verify.');
      return;
    }

    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const result = await signInWithPhoneNumber(
        auth,
        `+91${cleanDigits}`,
        recaptchaRef.current
      );
      setConfirmationResult(result);
      setOtpSent(true);
      setInfoMsg(`6-digit SMS OTP sent to +91 ${cleanDigits}.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('operation-not-allowed') || msg.includes('invalid-app-credential')) {
        setErrorMsg(
          'Live Firebase Phone Auth is not enabled in Firebase Console yet. Switch to Demo OTP Mode (code 123456) or enable Phone provider in Firebase Authentication.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const cleanedOtp = otpCode.replace(/\D/g, '');
    if (cleanedOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      if (demoOtpMode) {
        if (cleanedOtp !== '123456') {
          setErrorMsg('Invalid demo OTP. Enter 123456 for instant verification.');
          setLoading(false);
          return;
        }
        onPrefillVerifiedPhone(`+91${cleanDigits}`);
        onSelectRoleIntent('student');
        await signInWithPopup(auth, googleProvider);
      } else if (confirmationResult) {
        onPrefillVerifiedPhone(`+91${cleanDigits}`);
        onSelectRoleIntent('student');
        await confirmationResult.confirm(cleanedOtp);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'OTP verification failed.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() !== '2026') {
      setErrorMsg('Invalid 4-digit Admin Security Passcode. Use 2026 for demo access.');
      return;
    }
    await handleGoogleSignIn('admin');
  };

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setErrorMsg('Enter both admin email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    onSelectRoleIntent('admin');
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password sign-in is not enabled in Firebase Console yet. Use the 4-Digit Admin Passcode (2026) tab for instant Google-backed admin access.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Top Dual-Role Toggle */}
          <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setLoginTab('student');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-h-[44px] rounded-2xl px-3 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                loginTab === 'student'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Student / Customer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginTab('admin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-h-[44px] rounded-2xl px-3 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                loginTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Admin / Runner</span>
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Brand Lockup */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Cross className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Quick Care Campus
                </h1>
                <p className="text-xs text-slate-500">
                  Dehradun Curfew Express (10:00 PM – 6:00 AM)
                </p>
              </div>
            </div>

            {loginTab === 'student' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Emergency OTC relief in under 20 mins
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sign in with Google or your +91 mobile number to save your hostel gate pin and track live runners.
                  </p>
                </div>

                {/* Student Method Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMethod('google');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                      studentMethod === 'google'
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMethod('mobile');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                      studentMethod === 'mobile'
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Mobile (+91) OTP
                  </button>
                </div>

                {studentMethod === 'google' ? (
                  <div className="space-y-4">
                    <div className="space-y-2.5 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>24/7 licensed pharmacy dispatch to hostel gates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>Exact Google Map gate pin &amp; live runner GPS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>Verified OTC essentials only — no prescription drugs</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleGoogleSignIn('student')}
                      className="w-full min-h-[52px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                        />
                      </svg>
                      <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <span className="text-xs font-medium text-slate-700">
                        Demo Test OTP Mode (Code: <span className="font-mono font-bold">123456</span>)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDemoOtpMode((prev) => !prev);
                          setOtpSent(false);
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          demoOtpMode
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {demoOtpMode ? 'Demo On' : 'Live SMS'}
                      </button>
                    </div>

                    <div>
                      <label htmlFor="login-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Indian Mobile Number (+91)
                      </label>
                      <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
                        <span className="px-3.5 flex items-center bg-slate-100 text-slate-700 font-mono text-sm font-semibold border-r border-slate-200">
                          +91
                        </span>
                        <input
                          id="login-phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={cleanDigits}
                          onChange={(e) => {
                            setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10));
                            setOtpSent(false);
                          }}
                          placeholder="9837422190"
                          className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    {!otpSent ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleSendMobileOtp()}
                        className="w-full min-h-[48px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{loading ? 'Sending OTP...' : 'Send 6-Digit OTP'}</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="login-otp" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Enter 6-Digit OTP
                          </label>
                          <input
                            id="login-otp"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder={demoOtpMode ? '123456' : '6-digit SMS code'}
                            className="w-full min-h-[48px] rounded-xl border border-slate-200 px-3.5 text-center font-mono text-lg font-bold tracking-widest text-slate-900 focus:border-teal-600 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void handleVerifyMobileOtp()}
                          className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                        >
                          {loading
                            ? 'Verifying...'
                            : demoOtpMode
                            ? 'Verify OTP & Link Google Session'
                            : 'Verify OTP & Sign In'}
                        </button>
                      </div>
                    )}
                    <div id="recaptcha-container" />
                  </div>
                )}
              </div>
            ) : (
              /* Admin / Runner Login View */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Operations &amp; Dispatch Control Center
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Separate secure access for campus runners and pharmacy ops leads. Routes straight to live dispatch &amp; inventory management.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMethod('passcode');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                      adminMethod === 'passcode'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Passcode (Demo: 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMethod('email');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                      adminMethod === 'email'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Admin Email &amp; Password
                  </button>
                </div>

                {adminMethod === 'passcode' ? (
                  <form onSubmit={handleAdminPasscodeLogin} className="space-y-3.5">
                    <div>
                      <label htmlFor="admin-passcode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        4-Digit Admin Security Passcode
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="admin-passcode"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Enter 2026"
                          className="w-full min-h-[48px] rounded-xl border border-slate-200 pl-10 pr-4 font-mono text-base font-bold tracking-widest text-slate-900 focus:border-teal-600 focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Demo Passcode: <span className="font-mono font-semibold">2026</span> (authenticates your Google session directly into Operations Control Center).
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[50px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{loading ? 'Authenticating...' : 'Unlock Operations Console'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAdminEmailLogin} className="space-y-3">
                    <div>
                      <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="admin-email"
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="ops@quickcarecampus.in"
                          className="w-full min-h-[44px] rounded-xl border border-slate-200 pl-10 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1">
                        Password
                      </label>
                      <input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                    >
                      {loading ? 'Signing in...' : 'Sign In as Admin'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {infoMsg && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs font-medium text-teal-900">
                {infoMsg}
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
