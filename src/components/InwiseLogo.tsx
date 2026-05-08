interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  // h values: sm=navbar, md=footer, lg=hero/large display
  const sizes = { sm: "h-[240px]", md: "h-[280px]", lg: "h-[360px]" };
  const shifts = { sm: "24px", md: "28px", lg: "36px" };

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
