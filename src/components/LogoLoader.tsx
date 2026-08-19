interface LogoLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoLoader({ message = 'Loading Liverton…', size = 'md' }: LogoLoaderProps) {
  const sizes = { sm: 'h-14 w-14', md: 'h-24 w-24', lg: 'h-36 w-36' };
  const markSize = sizes[size];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-7">
        <div className={`liverton-loader-mark ${markSize}`}>
          <span className="liverton-loader-orbit" />
          <img src="/icons/liverton-icon-master.png" alt="Liverton Learning" className="liverton-loader-image" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">{message}</p>
          <span className="liverton-loader-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
      <style>{`
        .liverton-loader-mark{position:relative;display:flex;align-items:center;justify-content:center;isolation:isolate}
        .liverton-loader-mark:before{content:'';position:absolute;inset:8%;border-radius:28%;background:radial-gradient(circle,#7c5cff55,transparent 68%);filter:blur(12px);animation:loader-glow 2.4s ease-in-out infinite}
        .liverton-loader-image{width:76%;height:76%;object-fit:contain;border-radius:24%;position:relative;z-index:2;animation:loader-logo 2.8s cubic-bezier(.23,1,.32,1) infinite;transform-origin:center}
        .liverton-loader-orbit{position:absolute;inset:0;border:1px solid rgba(255,255,255,.2);border-top-color:#9a82ff;border-radius:34%;transform:rotate(18deg);animation:loader-orbit 1.9s linear infinite}
        .liverton-loader-dots{display:flex;gap:5px}.liverton-loader-dots i{display:block;width:5px;height:5px;border-radius:50%;background:#9a82ff;animation:loader-dot 1.1s ease-in-out infinite}.liverton-loader-dots i:nth-child(2){animation-delay:.15s}.liverton-loader-dots i:nth-child(3){animation-delay:.3s}
        @keyframes loader-logo{0%,100%{transform:rotate(0deg) scale(1)}45%{transform:rotate(180deg) scale(1.08)}65%{transform:rotate(360deg) scale(.96)}80%{transform:rotate(360deg) scale(1)}}
        @keyframes loader-orbit{to{transform:rotate(378deg)}}@keyframes loader-glow{50%{opacity:.55;transform:scale(1.12)}}@keyframes loader-dot{0%,100%{opacity:.28;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
        @media(prefers-reduced-motion:reduce){.liverton-loader-image,.liverton-loader-orbit,.liverton-loader-mark:before,.liverton-loader-dots i{animation:none}.liverton-loader-image{transform:none}}
      `}</style>
    </div>
  );
}
