export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <img src="/images/logo.jpeg" alt="Spectrum 4 Logo" className="h-10 w-10 object-contain" />
      <span className="text-xl font-semibold text-neutral-800 dark:text-white">Spectrum 4 Violation System</span>
    </div>
  );
}
