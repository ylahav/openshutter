import { redirect } from "@sveltejs/kit";
const load = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "admin") {
    throw redirect(303, "/login?redirect=" + encodeURIComponent("/admin"));
  }
  return {
    user: locals.user
  };
};
export {
  load
};
