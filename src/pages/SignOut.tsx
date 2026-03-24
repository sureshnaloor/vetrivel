import { useNavigate } from 'react-router-dom';
import SacredSpacesLogo from '../components/SacredSpacesLogo';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export default function SignOut() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  const handleSignOut = async () => {
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signout";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = "http://localhost:5173/";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

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

      {/* Sign-out card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className={`rounded-3xl border p-10 shadow-2xl backdrop-blur-xl ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-white/70'}`}>
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-5 transform transition-transform duration-500 hover:scale-110">
              <SacredSpacesLogo size={72} />
            </div>
            <h1 className={`text-3xl font-display font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-[#141414]'}`}>
              SacredSpaces
            </h1>
          </div>

          {/* User info */}
          {session?.user && (
            <div className={`flex items-center gap-4 rounded-2xl p-4 mb-8 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
              {session.user.image && (
                <img src={session.user.image} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#D13B3B]/30" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-[#141414]'}`}>{session.user.name}</p>
                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{session.user.email}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-3 backdrop-blur-sm ${isDark ? 'bg-[#0a0a0a]/80 text-gray-500' : 'bg-[#F4F1EA]/80 text-gray-400'}`}>
                Sign out
              </span>
            </div>
          </div>

          <p className={`text-center text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Are you sure you want to sign out of your account?
          </p>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="group relative w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#D13B3B] to-[#E8724A] px-6 py-4 text-[15px] font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-[#D13B3B]/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Yes, sign me out</span>
          </button>

          {/* Cancel button */}
          <button
            onClick={() => navigate(-1)}
            className={`mt-4 w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[15px] font-semibold transition-all duration-300 border hover:scale-[1.02] active:scale-[0.98] ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-[#141414] hover:bg-black/5'}`}
          >
            Cancel
          </button>
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
