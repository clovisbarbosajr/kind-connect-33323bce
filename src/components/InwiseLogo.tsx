interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  // h values: sm=navbar, md=footer, lg=hero/large display
  const sizes = { sm: "h-[100px]", md: "h-[120px]", lg: "h-[160px]" };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="INWISE Movies"
        className={`${sizes[size]} w-auto object-contain block`}
        style={{ verticalAlign: 'middle' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
