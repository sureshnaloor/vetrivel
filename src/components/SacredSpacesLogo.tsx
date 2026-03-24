export default function SacredSpacesLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D13B3B" />
          <stop offset="50%" stopColor="#E8724A" />
          <stop offset="100%" stopColor="#F4A261" />
        </linearGradient>
        <linearGradient id="templeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FDE8D0" />
        </linearGradient>
        <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F4A261" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D13B3B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle outer glow */}
      <circle cx="60" cy="60" r="58" fill="url(#glowGradient)" />

      {/* Main circle */}
      <circle cx="60" cy="60" r="52" fill="url(#logoGradient)" />

      {/* Inner circle ring */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.3" />

      {/* Temple / Gopuram silhouette */}
      <g fill="url(#templeGradient)">
        {/* Base platform */}
        <rect x="30" y="88" width="60" height="6" rx="2" />
        
        {/* Main temple body */}
        <rect x="36" y="68" width="48" height="20" rx="1" />
        
        {/* Temple pillars */}
        <rect x="40" y="72" width="4" height="16" rx="1" />
        <rect x="50" y="72" width="4" height="16" rx="1" />
        <rect x="66" y="72" width="4" height="16" rx="1" />
        <rect x="76" y="72" width="4" height="16" rx="1" />
        
        {/* Temple door */}
        <rect x="55" y="76" width="10" height="12" rx="5" fill="#D13B3B" fillOpacity="0.6" />
        
        {/* Middle tier */}
        <path d="M38 68 L60 52 L82 68 Z" />
        
        {/* Second tier */}
        <path d="M44 55 L60 42 L76 55 Z" fill="#FFFFFF" fillOpacity="0.9" />
        
        {/* Top tier / Spire */}
        <path d="M50 45 L60 28 L70 45 Z" fill="#FFFFFF" fillOpacity="0.85" />
        
        {/* Kalasam (finial) on top */}
        <circle cx="60" cy="26" r="3" fill="#FFFFFF" />
        <line x1="60" y1="23" x2="60" y2="20" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
