import { useNavigate } from 'react-router-dom';
import SacredSpacesLogo from '../components/SacredSpacesLogo';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useEffect } from 'react';

export default function SignIn() {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = "http://localhost:5173/dashboard";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Failed to initiate sign in:", error);
    }
  };

  if (loading) {
    return (
      <div className={`flex h-screen w-full items-center justify-center ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F1EA]'}`}>
        <div className="animate-pulse">
          <SacredSpacesLogo size={60} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F1EA]'}`}>
      {/* Animated gradient background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite] ${isDark ? 'bg-gradient-to-br from-[#D13B3B]/20 to-[#E8724A]/10' : 'bg-gradient-to-br from-[#D13B3B]/10 to-[#E8724A]/5'}`} />
        <div className={`absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-[pulse_6s_ease-in-out_infinite_1s] ${isDark ? 'bg-gradient-to-br from-[#F4A261]/15 to-[#D13B3B]/10' : 'bg-gradient-to-br from-[#F4A261]/10 to-[#D13B3B]/5'}`} />
        <div className={`absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite_2s] ${isDark ? 'bg-gradient-to-br from-[#E8724A]/10 to-[#F4A261]/5' : 'bg-gradient-to-br from-[#E8724A]/5 to-[#F4A261]/3'}`} />
      </div>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Sign-in card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className={`rounded-3xl border p-10 shadow-2xl backdrop-blur-xl ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-white/70'}`}>
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-10">
            <div className="mb-5 transform transition-transform duration-500 hover:scale-110">
              <SacredSpacesLogo size={72} />
            </div>
            <h1 className={`text-3xl font-display font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-[#141414]'}`}>
              SacredSpaces
            </h1>
            <p className={`text-sm text-center leading-relaxed mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Discover, share & celebrate sacred places around the world.
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-3 backdrop-blur-sm ${isDark ? 'bg-[#0a0a0a]/80 text-gray-500' : 'bg-[#F4F1EA]/80 text-gray-400'}`}>
                Sign in to continue
              </span>
            </div>
          </div>

          {/* Google sign-in button */}
          <button
            onClick={handleGoogleSignIn}
            className={`group relative w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${isDark ? 'bg-white text-gray-800 hover:shadow-[#D13B3B]/10' : 'bg-white text-gray-800 border border-black/5 hover:shadow-[#D13B3B]/10'}`}
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#D13B3B]/0 via-[#E8724A]/0 to-[#F4A261]/0 group-hover:from-[#D13B3B]/5 group-hover:via-[#E8724A]/5 group-hover:to-[#F4A261]/5 transition-all duration-300" />
          </button>

          {/* Terms */}
          <p className={`mt-8 text-center text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            By signing in, you agree to our{' '}
            <a href="#" className="text-[#E8724A] hover:text-[#F4A261] transition-colors underline underline-offset-2">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#E8724A] hover:text-[#F4A261] transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Back to home link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className={`text-sm transition-colors inline-flex items-center gap-1 ${isDark ? 'text-gray-500 hover:text-[#E8724A]' : 'text-gray-400 hover:text-[#D13B3B]'}`}
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
