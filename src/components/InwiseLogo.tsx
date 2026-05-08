interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  const sizes = { sm: "h-9", md: "h-11", lg: "h-16" };
  const textSizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img
        src="/logo.png"
        alt="INWISE"
        className={`${sizes[size]} w-auto object-contain flex-shrink-0`}
        style={{ imageRendering: 'crisp-edges' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <span className={`${textSizes[size]} font-black tracking-tight leading-none`}>
        <span className="text-white">IN</span><span className="text-[#00d4ff]">WISE</span>
        <span className="text-[#00d4ff]/50 font-bold tracking-widest uppercase"
          style={{ fontSize: '0.35em', display: 'block', letterSpacing: '0.3em', marginTop: '-2px' }}>
          MOVIES
        </span>
      </span>
    </div>
  );
}
