interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  const sizes = { sm: "h-14", md: "h-16", lg: "h-24" };

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.png"
        alt="INWISE Movies"
        className={`${sizes[size]} w-auto object-contain`}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
