import { json } from "@sveltejs/kit";
const POST = async ({ cookies }) => {
  cookies.delete("auth_token", { path: "/" });
  return json({ success: true });
};
export {
  POST
};
