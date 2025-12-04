import { j as json } from './index-wpIsICWW.js';

const GET = async ({ locals }) => {
  if (!locals.user) {
    return json({ authenticated: false });
  }
  return json({
    authenticated: true,
    user: locals.user
  });
};

export { GET };
//# sourceMappingURL=_server.ts-BTN_DQ5U.js.map
