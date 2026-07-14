function AppBrandName({ className = "" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1 overflow-visible leading-none normal-case font-sans ${className}`}
    >
      <span className="whitespace-nowrap text-[calc(1.25rem+12pt)] font-bold leading-[1.15] tracking-tight text-slate-50 normal-case font-sans">
        yora
      </span>
      <span className="whitespace-nowrap text-[calc(1.25rem+12pt)] font-normal leading-[1.15] tracking-tight text-slate-400 normal-case font-sans">
        pet
      </span>
    </div>
  );
}

export default AppBrandName;
