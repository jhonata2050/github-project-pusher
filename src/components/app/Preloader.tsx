import { useRouterState } from "@tanstack/react-router";

/**
 * Preloader component that shows a Lottie animation during route transitions.
 * It uses the router's loading state to automatically show/hide.
 */
export function Preloader() {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' });

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/40 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-300">
      <div className="relative size-48 flex items-center justify-center">
        <iframe 
          src="https://lottie.host/embed/d547b7c9-e884-4e94-8450-79ba42c27d71/L2Zj25Eagv.lottie"
          className="size-full border-none"
          style={{ pointerEvents: 'none' }}
          title="Loading Animation"
        />
      </div>
    </div>
  );
}
