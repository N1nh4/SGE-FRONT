export const ROLES = {
  MASTER: "master",
  ADM: "adm",
  DEFAULT: "default",
} as const;

export type Papel = (typeof ROLES)[keyof typeof ROLES];

const roleRoutes: Record<Papel, string[]> = {
  master: ["/indicadores", "/objetivos", "/planejamento", "/comprovacoes", "/unidades", "/validacao", "/pendencias"],
  adm: ["/indicadores", "/objetivos", "/planejamento", "/comprovacoes", "/validacao", "/pendencias"],
  default: ["/indicadores", "/planejamento", "/comprovacoes", "/pendencias"],
};

export function canAccessRoute(papel: string, pathname: string): boolean {
  const routes = roleRoutes[papel as Papel];
  if (!routes) return false;
  return routes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function getFirstAllowedRoute(papel: string): string {
  const routes = roleRoutes[papel as Papel];
  return routes?.[0] ?? "/indicadores";
}
