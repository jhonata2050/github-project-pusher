import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function Preloader() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative size-48">
        <iframe 
          src="https://lottie.host/embed/d547b7c9-e884-4e94-8450-79ba42c27d71/L2Zj25Eagv.lottie"
          className="size-full border-none pointer-events-none"
          title="Loading Animation"
        />
      </div>
    </div>
  );
}
