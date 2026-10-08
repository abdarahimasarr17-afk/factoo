const AUTH_PAGES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

const isAppPath = (path: string) => path === "/app" || path.startsWith("/app/") || path.startsWith("/app?");

export function routeDecision(pathname: string, search: string, isAuthed: boolean): string | null {
  if (isAppPath(pathname)) {
    return isAuthed ? null : `/connexion?next=${encodeURIComponent(pathname + search)}`;
  }
  const onAuthPage = AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
  return isAuthed && onAuthPage ? "/app" : null;
}

export function safeNext(next: string | null | undefined): string {
  return next && isAppPath(next) ? next : "/app";
}
