import { json } from "@sveltejs/kit";
import { SignJWT } from "jose";
import { b as private_env } from "../../../../chunks/shared-server.js";
const JWT_SECRET = new TextEncoder().encode(
  private_env.AUTH_JWT_SECRET || private_env.NEXTAUTH_SECRET || process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production"
);
const JWT_TTL = 60 * 60 * 24 * 7;
const BACKEND_URL = private_env.BACKEND_URL || process.env.BACKEND_URL || "http://localhost:5000";
const POST = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return json({ error: "Missing credentials" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Login failed" }));
      return json({ error: errorData.error || "Invalid credentials" }, { status: response.status });
    }
    const data = await response.json();
    const { user } = data;
    const jwt = await new SignJWT({
      email: user.email,
      name: user.name,
      role: user.role
    }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime(`${JWT_TTL}s`).sign(JWT_SECRET);
    cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: JWT_TTL,
      sameSite: "lax"
    });
    return json({ role: user.role, user });
  } catch (error) {
    console.error("Login error:", error);
    return json({ error: "Login failed" }, { status: 500 });
  }
};
export {
  POST
};
