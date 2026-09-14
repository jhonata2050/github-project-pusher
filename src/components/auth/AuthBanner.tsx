export function AuthDesktopBanner() {
  return (
    <div className="relative hidden lg:flex lg:col-span-6 flex-col justify-between p-8 bg-zinc-950 text-white overflow-hidden min-h-[640px]">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95 transition-transform duration-700 hover:scale-105"
        style={{ backgroundImage: "url('/images/login-banner.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      
      <div className="relative z-10 flex justify-between items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400 border border-rose-500/30">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Acesso Ilimitado
        </span>
      </div>

      <div className="relative z-10 space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
          Potência e Performance para seus Projetos
        </h2>
        <p className="text-xs text-zinc-300 max-w-sm leading-relaxed drop-shadow-sm">
          Hospedagem de alta performance, Cloud VPS, bots 24/7 e infraestrutura completa em um só lugar.
        </p>
      </div>
    </div>
  );
}

export function AuthMobileBanner() {
  return (
    <div className="lg:hidden mb-6 rounded-2xl overflow-hidden border border-border shadow-sm">
      <img 
        src="/images/login-banner.png" 
        alt="Banner" 
        className="w-full h-36 sm:h-44 object-cover"
      />
    </div>
  );
}
