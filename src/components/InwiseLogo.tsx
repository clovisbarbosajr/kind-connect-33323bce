interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl";
  const subSize = size === "sm" ? "text-[7px]" : size === "lg" ? "text-[11px]" : "text-[9px]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="1" y="1" width="34" height="34" rx="7" fill="#00d4ff" fillOpacity="0.1" />
        <rect x="1" y="1" width="34" height="34" rx="7" stroke="#00d4ff" strokeWidth="1.5" />
        <rect x="3" y="5"  width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <rect x="3" y="16" width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <rect x="3" y="27" width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <rect x="29" y="5"  width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <rect x="29" y="16" width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <rect x="29" y="27" width="4" height="4" rx="1" fill="#00d4ff" fillOpacity="0.5" />
        <polygon points="13,10 27,18 13,26" fill="#00d4ff" />
      </svg>

      <div className="leading-none">
        <div className={`font-black tracking-tight text-white ${textSize} italic`}>
          IN<span className="text-[#00d4ff]">WISE</span>
        </div>
        <div className={`font-black uppercase tracking-[0.35em] text-zinc-500 -mt-0.5 ${subSize}`}>
          MOVIES
        </div>
      </div>
    </div>
  );
}
