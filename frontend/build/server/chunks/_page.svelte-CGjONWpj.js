import { h as head, d as bind_props } from './index2-ConC1ezP.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import './client-Y_D_pt3w.js';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import './index-BI-RhdSw.js';
import 'clsx';
import './exports-Dc4PPDXS.js';

_page[FILENAME] = "src/routes/admin/storage/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let data = $$props["data"];
      head("1p7bomi", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>Storage Management - Admin</title>`);
        });
      });
      $$renderer2.push(`<div class="min-h-screen bg-gray-50 py-8">`);
      push_element($$renderer2, "div", 222, 0);
      $$renderer2.push(`<div class="max-w-6xl mx-auto px-4">`);
      push_element($$renderer2, "div", 223, 1);
      $$renderer2.push(`<div class="bg-white rounded-lg shadow-md p-6">`);
      push_element($$renderer2, "div", 224, 2);
      $$renderer2.push(`<div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 225, 3);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 226, 4);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-gray-900">`);
      push_element($$renderer2, "h1", 227, 5);
      $$renderer2.push(`Storage Management</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-gray-600 mt-2">`);
      push_element($$renderer2, "p", 228, 5);
      $$renderer2.push(`Configure and manage storage providers for your gallery</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">`);
      push_element($$renderer2, "a", 230, 4);
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
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-center py-8">`);
        push_element($$renderer2, "div", 249, 4);
        $$renderer2.push(`<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">`);
        push_element($$renderer2, "div", 250, 5);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p class="mt-2 text-gray-600">`);
        push_element($$renderer2, "p", 251, 5);
        $$renderer2.push(`Loading storage configurations...</p>`);
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
      bind_props($$props, { data });
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-CGjONWpj.js.map
