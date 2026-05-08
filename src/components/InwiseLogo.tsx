interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  // h values: sm=navbar, md=footer, lg=hero/large display
  const sizes = { sm: "h-[120px]", md: "h-[140px]", lg: "h-[180px]" };
  // PNG has cloud in upper portion with transparent space below — shift down to align cloud center with nav text
  const shifts = { sm: "12px", md: "14px", lg: "18px" };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="INWISE Movies"
        className={`${sizes[size]} w-auto object-contain block`}
        style={{ transform: `translateY(${shifts[size]})` }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
