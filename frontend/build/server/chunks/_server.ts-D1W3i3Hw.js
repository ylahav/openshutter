import { j as json } from './index-wpIsICWW.js';

const POST = async ({ cookies }) => {
  cookies.delete("auth_token", { path: "/" });
  return json({ success: true });
};

export { POST };
//# sourceMappingURL=_server.ts-D1W3i3Hw.js.map
