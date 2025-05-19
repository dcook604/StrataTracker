interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-20 w-20'  // Increased size for better visibility
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`relative ${sizeClasses[size]} flex-shrink-0 bg-white rounded-md overflow-hidden`}>
        <img 
          src="/images/spectrum4-logo.png"
          alt="Spectrum 4 Logo" 
          className="h-full w-full object-contain"
          onError={(e) => {
            // Fallback to JPEG if PNG fails
            const img = e.target as HTMLImageElement;
            if (!img.src.includes('logo.jpeg')) {
              img.src = '/images/logo.jpeg';
            }
          }}
        />
      </div>
      {showText && (
        <span className="text-xl font-semibold text-neutral-800 dark:text-white truncate">
          Spectrum 4 Violation System
        </span>
      )}
    </div>
  );
}
