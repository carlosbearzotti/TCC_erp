"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useAuth, Role } from "@/hooks/useAuth";

const PUBLIC_ROUTES = ["/login", "/unauthorized", "/cliente"];

export const ROUTE_ROLES: Record<string, Role[]> = {
  "/admin": ["administrador"],
  "/cozinha": ["cozinheiro", "administrador"],
  "/entregador": ["entregador", "administrador"],
  "/gestao": ["administrador", "atendente"],
  "/orders": ["administrador", "atendente"],
};

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Se ainda está carregando a verificação de token/usuário, aguarda
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    // 1. Rota pública: sempre liberada
    if (isPublic) {
      // Se usuário já logado tentar acessar /login, manda pro dashboard
      if (isAuthenticated && pathname === "/login") {
        router.replace("/");
      }
      return;
    }

    // 2. Não autenticado em rota protegida -> Login
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // Administrador tem acesso universal a todas as telas do sistema
    if (user.role === "administrador") {
      return;
    }

    // 3. Verificação explícita por allowedRoles passados na prop do Layout/Componente
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        router.replace("/unauthorized");
        return;
      }
    }

    // 4. Verificação automática baseada no Mapa de Rotas (ROUTE_ROLES)
    const matchingPrefix = Object.keys(ROUTE_ROLES).find((prefix) =>
      pathname.startsWith(prefix)
    );

    if (matchingPrefix) {
      const allowed = ROUTE_ROLES[matchingPrefix];
      if (!allowed.includes(user.role)) {
        router.replace("/unauthorized");
        return;
      }
    }
  }, [pathname, router, user, isAuthenticated, isLoading, allowedRoles]);

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Tela de carregamento suave
  if (isLoading && !isPublic) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
          <span className="text-xs font-semibold">Carregando ambiente seguro...</span>
        </div>
      </div>
    );
  }

  // Enquanto aguarda redirect de usuário não autenticado em rota protegida
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
