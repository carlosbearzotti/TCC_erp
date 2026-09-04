import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mapa de permissões por rota
const routeRoles: Record<string, string[]> = {
  "/admin": ["administrador"],
  "/cozinha": ["cozinheiro", "administrador"],
  "/entregador": ["entregador", "administrador"],
  "/gestao": ["administrador", "atendente"],
  "/orders": ["administrador", "atendente"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Deixar rotas públicas e recursos estáticos passarem livremente
  const publicRoutes = ["/login", "/unauthorized", "/cliente", "/recuperar-senha"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  // 2. Pegar os dados dos Cookies
  const token = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  // 3. Usuário já logado tentando acessar o /login -> manda para a Home
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Se a rota for pública, deixa prosseguir sem mais checagens
  if (isPublic) {
    return NextResponse.next();
  }

  // 4. Se não tem token e a rota não é pública, manda pro Login com parâmetro de retorno
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Verificação de RBAC (Rotas restritas no Edge)
  const protectedRoutePrefix = Object.keys(routeRoles).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (protectedRoutePrefix && userRole) {
    const allowedRoles = routeRoles[protectedRoutePrefix];

    // Se a role do usuário não está na lista permitida para essa rota
    if (!allowedRoles.includes(userRole)) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // Se tem token e tem permissão (ou a rota não tem restrição de role), deixa seguir
  return NextResponse.next();
}

// Configuração para dizer ao Next.js em quais rotas o middleware deve agir
export const config = {
  matcher: [
    /*
     * Ignora rotas de API, arquivos estáticos e imagens:
     * - api (rotas da API)
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de otimização de imagem)
     * - favicon.ico (ícone do navegador)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
