import { a as store_get, h as head, b as attr, u as unsubscribe_stores, d as bind_props } from './index2-ConC1ezP.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import './client-Y_D_pt3w.js';
import { c as currentLanguage } from './language-DBYnqBMI.js';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import './siteConfig-Cmkj7lH5.js';
import './index-BI-RhdSw.js';
import 'clsx';
import './exports-Dc4PPDXS.js';

_page[FILENAME] = "src/routes/admin/people/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let data = $$props["data"];
      let searchTerm = "";
      store_get($$store_subs ??= {}, "$currentLanguage", currentLanguage);
      head("v3e17s", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>People Management - Admin</title>`);
        });
      });
      $$renderer2.push(`<div class="min-h-screen bg-gray-50 py-8">`);
      push_element($$renderer2, "div", 283, 0);
      $$renderer2.push(`<div class="max-w-6xl mx-auto px-4">`);
      push_element($$renderer2, "div", 284, 1);
      $$renderer2.push(`<div class="bg-white rounded-lg shadow-md p-6">`);
      push_element($$renderer2, "div", 285, 2);
      $$renderer2.push(`<div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 286, 3);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 287, 4);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-gray-900">`);
      push_element($$renderer2, "h1", 288, 5);
      $$renderer2.push(`People Management</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-gray-600 mt-2">`);
      push_element($$renderer2, "p", 289, 5);
      $$renderer2.push(`Manage people who appear in your photos</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">`);
      push_element($$renderer2, "a", 291, 4);
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
      $$renderer2.push(`<!--]--> <div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 308, 3);
      $$renderer2.push(`<div class="flex items-center space-x-4">`);
      push_element($$renderer2, "div", 309, 4);
      $$renderer2.push(`<div class="relative">`);
      push_element($$renderer2, "div", 310, 5);
      $$renderer2.push(`<input type="text" placeholder="Search people..."${attr("value", searchTerm)} class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"/>`);
      push_element($$renderer2, "input", 311, 6);
      pop_element();
      $$renderer2.push(` <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`);
      push_element($$renderer2, "svg", 318, 6);
      $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z">`);
      push_element($$renderer2, "path", 324, 7);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2">`);
      push_element($$renderer2, "button", 334, 4);
      $$renderer2.push(`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`);
      push_element($$renderer2, "svg", 339, 5);
      $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4">`);
      push_element($$renderer2, "path", 340, 6);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
      $$renderer2.push(` Add Person</button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-center py-8">`);
        push_element($$renderer2, "div", 353, 4);
        $$renderer2.push(`<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">`);
        push_element($$renderer2, "div", 354, 5);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p class="mt-2 text-gray-600">`);
        push_element($$renderer2, "p", 355, 5);
        $$renderer2.push(`Loading people...</p>`);
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
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
      if ($$store_subs) unsubscribe_stores($$store_subs);
      bind_props($$props, { data });
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-BhmGgIOr.js.map
