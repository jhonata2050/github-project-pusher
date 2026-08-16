import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { logSessionEvent } from "@/lib/audit.functions";

export type AppRole = "admin" | "staff" | "client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  tax_id: string | null;
  phone: string | null;
  address_line: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  impersonatedClientId: string | null;
  setImpersonatedClientId: (id: string | null) => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  impersonatedClientId: null,
  setImpersonatedClientId: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Restore impersonation from session storage if any
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('impersonated_id') : null;
    if (stored) setImpersonatedClientId(stored);

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event === "SIGNED_OUT") {
          queryClient.clear();
          window.sessionStorage.removeItem('impersonated_id');
          setImpersonatedClientId(null);
        } else {
          if (event === "SIGNED_IN") {
            window.setTimeout(() => {
              void logSessionEvent({ data: {
                action: "login.succeeded",
                description: "Acesso autenticado com sucesso",
              }});
            }, 0);
          }
          // Revalida apenas o que está montado na tela
          void queryClient.invalidateQueries({ refetchType: "active" });
        }
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const handleSetImpersonated = (id: string | null) => {
    setImpersonatedClientId(id);
    if (typeof window !== 'undefined') {
      if (id) window.sessionStorage.setItem('impersonated_id', id);
      else window.sessionStorage.removeItem('impersonated_id');
    }
    void queryClient.invalidateQueries({ refetchType: "active" });
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user: session?.user ?? null, 
      loading,
      impersonatedClientId,
      setImpersonatedClientId: handleSetImpersonated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useProfile() {
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;

  return useQuery({
    queryKey: ["profile", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    },
  });
}

export function useRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      
      if (error) {
        console.error("Erro ao buscar papéis:", error);
        throw error;
      }
      return (data ?? []).map((row) => row.role as AppRole);
    },
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

export function useIsStaff() {
  const { loading: authLoading, user } = useAuth();
  const { data: roles, isPending, isFetching, error } = useRoles();
  const list = roles ?? [];
  
  // Se houver erro ao carregar os papéis, não é um carregamento infinito.
  const isLoading = authLoading || (Boolean(user) && isPending && !error);
  
  return {
    isAdmin: list.includes("admin"),
    isStaff: list.includes("admin") || list.includes("staff"),
    roles: list,
    error,
    isLoading,
  };
}

