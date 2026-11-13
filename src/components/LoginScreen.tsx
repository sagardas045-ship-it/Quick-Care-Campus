import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Clock, Cross, MapPin, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was closed. Please try again.');
      } else if (msg.includes('unauthorized-domain')) {
        setErrorMsg(
          'This preview domain needs to be authorized under Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Cross className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Quick Care Campus
              </h1>
              <p className="text-xs text-slate-500">
                Dehradun Hostel Emergency OTC Dispatch
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              Verified OTC relief at your hostel gate in under 20 mins.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sign in with your Google account to save your Dehradun hostel gate pin, verify your WhatsApp number, and track late-night runners live.
            </p>
          </div>

          {/* Trust & Curfew Highlights */}
          <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong className="text-slate-900">Curfew Express (10:00 PM – 6:00 AM):</strong> Active across Premnagar, Bidholi &amp; Selakui belts.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong className="text-slate-900">Exact Hostel Gate Pin:</strong> Saved once on Google Maps for 60-second emergency reorders.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong className="text-slate-900">Licensed 24/7 Pharmacies:</strong> Tamper-proof sealed OTC packs only. No prescription drugs.
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full min-h-[52px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
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
            <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          Student campus authentication powered by Firebase &amp; Google Maps.
        </p>
      </div>
    </div>
  );
}
