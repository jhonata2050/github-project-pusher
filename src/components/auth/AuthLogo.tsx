import { cn } from "@/lib/utils";

interface AuthLogoProps {
  logoUrl?: string | null | undefined;
  appName?: string | null | undefined;
}

export function AuthLogo({ logoUrl, appName = "Eqsam" }: AuthLogoProps) {
  const finalAppName = appName || "Eqsam";
  const isInverted = !logoUrl || logoUrl.includes("logo-branco") || logoUrl === "/images/logo.webp";
  return (
    <div className="flex justify-center items-center mb-6">
      <img
        src={logoUrl || "/images/logo-branco.webp"}
        alt={finalAppName}
        className={cn(
          "h-10 w-auto max-w-[200px] object-contain",
          isInverted && "invert dark:invert-0"
        )}
      />
    </div>
  );
}
