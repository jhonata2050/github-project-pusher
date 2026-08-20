import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function Preloader() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (isLoading) {
      // Delay de 300ms para evitar flash em cargas rápidas
      timeout = setTimeout(() => setShow(true), 300);
    } else {
      setShow(false);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-300 pointer-events-none">
      <div className="relative size-48 flex flex-col items-center justify-center">
        <iframe 
          src="https://lottie.host/embed/d547b7c9-e884-4e94-8450-79ba42c27d71/L2Zj25Eagv.lottie"
          className="size-full border-none pointer-events-none"
          title="Loading Animation"
        />
      </div>
    </div>
  );
}

