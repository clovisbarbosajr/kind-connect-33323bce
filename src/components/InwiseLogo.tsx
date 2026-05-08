interface InwiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InwiseLogo({ className = "", size = "md" }: InwiseLogoProps) {
  const sizeClasses: Record<string, string> = { sm: 'h-6', md: 'h-8', lg: 'h-12' };

  return (
    <img src="/logo.png" alt="INWISE" className={sizeClasses[size] + ' object-contain ' + (className || '')} />
  );
}
