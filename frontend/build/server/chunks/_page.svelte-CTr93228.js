import { a as store_get, h as head, b as attr, u as unsubscribe_stores } from './index2-ConC1ezP.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import './client-Y_D_pt3w.js';
import { a0 as getContext } from './index-BI-RhdSw.js';
import 'clsx';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import './exports-Dc4PPDXS.js';

const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = get_store("page");
    return store.subscribe(fn);
  }
};
function get_store(name) {
  try {
    return getStores()[name];
  } catch {
    throw new Error(
      `Cannot subscribe to '${name}' store on the server outside of a Svelte component, as it is bound to the current request via component context. This prevents state from leaking between users.For more information, see https://svelte.dev/docs/kit/state-management#avoid-shared-state-on-the-server`
    );
  }
}
_page[FILENAME] = "src/routes/login/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let redirectTo;
      let email = "";
      let password = "";
      let loading = false;
      redirectTo = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("redirect") || "/admin";
      head("1x05zx6", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>Sign In - OpenShutter</title>`);
        });
      });
      $$renderer2.push(`<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">`);
      push_element($$renderer2, "div", 62, 0);
      $$renderer2.push(`<div class="max-w-md w-full space-y-8">`);
      push_element($$renderer2, "div", 63, 1);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 64, 2);
      $$renderer2.push(`<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">`);
      push_element($$renderer2, "h2", 65, 3);
      $$renderer2.push(`Sign in to your account</h2>`);
      pop_element();
      $$renderer2.push(` <p class="mt-2 text-center text-sm text-gray-600">`);
      push_element($$renderer2, "p", 66, 3);
      if (redirectTo.startsWith("/admin")) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`Admin access required`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Access your gallery`);
      }
      $$renderer2.push(`<!--]--></p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <form class="mt-8 space-y-6">`);
      push_element($$renderer2, "form", 75, 2);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="rounded-md shadow-sm -space-y-px">`);
      push_element($$renderer2, "div", 82, 3);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 83, 4);
      $$renderer2.push(`<label for="email" class="sr-only">`);
      push_element($$renderer2, "label", 84, 5);
      $$renderer2.push(`Email address</label>`);
      pop_element();
      $$renderer2.push(` <input id="email" name="email" type="email" autocomplete="email" required${attr("value", email)} class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" placeholder="Email address"/>`);
      push_element($$renderer2, "input", 85, 5);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 96, 4);
      $$renderer2.push(`<label for="password" class="sr-only">`);
      push_element($$renderer2, "label", 97, 5);
      $$renderer2.push(`Password</label>`);
      pop_element();
      $$renderer2.push(` <input id="password" name="password" type="password" autocomplete="current-password" required${attr("value", password)} class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" placeholder="Password"/>`);
      push_element($$renderer2, "input", 98, 5);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 111, 3);
      $$renderer2.push(`<button type="submit"${attr("disabled", loading, true)} class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">`);
      push_element($$renderer2, "button", 112, 4);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Sign in`);
      }
      $$renderer2.push(`<!--]--></button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</form>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-CTr93228.js.map
