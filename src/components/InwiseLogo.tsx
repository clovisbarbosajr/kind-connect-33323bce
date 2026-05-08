interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  // h values: sm=navbar, md=footer, lg=hero/large display
  const sizes = { sm: "h-[42px]", md: "h-[48px]", lg: "h-[60px]" };
  const shifts = { sm: "0px", md: "0px", lg: "0px" };

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
