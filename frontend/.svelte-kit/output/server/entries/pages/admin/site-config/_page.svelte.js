import { f as head } from "../../../../chunks/index2.js";
import { p as push_element, a as pop_element } from "../../../../chunks/dev.js";
import "../../../../chunks/client.js";
import "../../../../chunks/siteConfig.js";
import "../../../../chunks/language.js";
import { F as FILENAME } from "../../../../chunks/index-client.js";
_page[FILENAME] = "src/routes/admin/site-config/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      head("1ytj7cv", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>Site Configuration - Admin</title>`);
        });
      });
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="min-h-screen bg-gray-50 flex items-center justify-center">`);
        push_element($$renderer2, "div", 205, 1);
        $$renderer2.push(`<div class="text-center">`);
        push_element($$renderer2, "div", 206, 2);
        $$renderer2.push(`<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto">`);
        push_element($$renderer2, "div", 207, 3);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p class="mt-4 text-gray-600">`);
        push_element($$renderer2, "p", 208, 3);
        $$renderer2.push(`Loading configuration...</p>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]-->`);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
