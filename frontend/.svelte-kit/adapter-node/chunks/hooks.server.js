import { jwtVerify } from "jose";
import { b as private_env } from "./shared-server.js";
const JWT_SECRET = new TextEncoder().encode(
  private_env.AUTH_JWT_SECRET || private_env.NEXTAUTH_SECRET || process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production"
);
const handle = async ({ event, resolve }) => {
  event.locals.user = null;
  const token = event.cookies.get("auth_token");
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      event.locals.user = {
        id: String(payload.sub),
        email: String(payload.email),
        name: String(payload.name),
        role: payload.role ?? "owner"
      };
    } catch {
      event.cookies.delete("auth_token", { path: "/" });
    }
  }
  const path = event.url.pathname;
  if (path.startsWith("/admin")) {
    if (!event.locals.user || event.locals.user.role !== "admin") {
      return Response.redirect(new URL("/login?redirect=" + encodeURIComponent(path), event.url), 303);
    }
  }
  if (path.startsWith("/owner")) {
    if (!event.locals.user || event.locals.user.role !== "owner" && event.locals.user.role !== "admin") {
      return Response.redirect(new URL("/login?redirect=" + encodeURIComponent(path), event.url), 303);
    }
  }
  return resolve(event);
};
export {
  handle
};
