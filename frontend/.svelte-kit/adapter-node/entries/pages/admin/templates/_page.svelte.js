import { s as store_get, f as head, u as unsubscribe_stores, c as bind_props } from "../../../../chunks/index2.js";
import { p as push_element, a as pop_element } from "../../../../chunks/dev.js";
import "../../../../chunks/client.js";
import { s as siteConfigData } from "../../../../chunks/siteConfig.js";
import { F as FILENAME } from "../../../../chunks/index-client.js";
_page[FILENAME] = "src/routes/admin/templates/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let data = $$props["data"];
      store_get($$store_subs ??= {}, "$siteConfigData", siteConfigData)?.template?.activeTemplate || "modern";
      head("15vd4s4", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>Template Management - Admin</title>`);
        });
      });
      $$renderer2.push(`<div class="min-h-screen bg-gray-50 py-8">`);
      push_element($$renderer2, "div", 121, 0);
      $$renderer2.push(`<div class="max-w-6xl mx-auto px-4">`);
      push_element($$renderer2, "div", 122, 1);
      $$renderer2.push(`<div class="bg-white rounded-lg shadow-md p-6">`);
      push_element($$renderer2, "div", 123, 2);
      $$renderer2.push(`<div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 124, 3);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 125, 4);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-gray-900">`);
      push_element($$renderer2, "h1", 126, 5);
      $$renderer2.push(`Template Management</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-gray-600 mt-2">`);
      push_element($$renderer2, "p", 127, 5);
      $$renderer2.push(`Choose and manage your gallery templates</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">`);
      push_element($$renderer2, "a", 129, 4);
      $$renderer2.push(`← Back to Admin</a>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-center py-8">`);
        push_element($$renderer2, "div", 146, 4);
        $$renderer2.push(`<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">`);
        push_element($$renderer2, "div", 147, 5);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p class="mt-2 text-gray-600">`);
        push_element($$renderer2, "p", 148, 5);
        $$renderer2.push(`Loading templates...</p>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
      bind_props($$props, { data });
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
