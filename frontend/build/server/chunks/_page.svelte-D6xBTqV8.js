import { a as store_get, h as head, b as attr, u as unsubscribe_stores, d as bind_props } from './index2-ConC1ezP.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import './client-Y_D_pt3w.js';
import { s as siteConfigData } from './siteConfig-Cmkj7lH5.js';
import { Z as escape_html } from './index-BI-RhdSw.js';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import 'clsx';
import './exports-Dc4PPDXS.js';

_page[FILENAME] = "src/routes/admin/templates/overrides/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let currentTemplateName;
      let data = $$props["data"];
      let resetting = false;
      let localOverrides = {};
      function hasOverrides() {
        return !!(localOverrides.customColors && Object.keys(localOverrides.customColors).length > 0 || localOverrides.customFonts && Object.keys(localOverrides.customFonts).length > 0 || localOverrides.customLayout && Object.keys(localOverrides.customLayout).length > 0 || localOverrides.componentVisibility && Object.keys(localOverrides.componentVisibility).length > 0 || localOverrides.headerConfig && Object.keys(localOverrides.headerConfig).length > 0);
      }
      currentTemplateName = store_get($$store_subs ??= {}, "$siteConfigData", siteConfigData)?.template?.activeTemplate || "modern";
      store_get($$store_subs ??= {}, "$siteConfigData", siteConfigData)?.template || {};
      head("ulbb0a", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>Template Overrides - Admin</title>`);
        });
      });
      $$renderer2.push(`<div class="min-h-screen bg-gray-50 py-8">`);
      push_element($$renderer2, "div", 283, 0);
      $$renderer2.push(`<div class="max-w-6xl mx-auto px-4">`);
      push_element($$renderer2, "div", 284, 1);
      $$renderer2.push(`<div class="bg-white rounded-lg shadow-md p-6">`);
      push_element($$renderer2, "div", 285, 2);
      $$renderer2.push(`<div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 287, 3);
      $$renderer2.push(`<div class="flex items-center gap-4">`);
      push_element($$renderer2, "div", 288, 4);
      $$renderer2.push(`<a href="/admin/templates" class="text-blue-600 hover:text-blue-800 text-sm font-medium">`);
      push_element($$renderer2, "a", 289, 5);
      $$renderer2.push(`← Back to Templates</a>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 295, 5);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-gray-900">`);
      push_element($$renderer2, "h1", 296, 6);
      $$renderer2.push(`Template Overrides</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-gray-600 mt-1">`);
      push_element($$renderer2, "p", 297, 6);
      $$renderer2.push(`Customize your active template: <span class="font-semibold">`);
      push_element($$renderer2, "span", 299, 7);
      $$renderer2.push(`${escape_html(currentTemplateName)}</span>`);
      pop_element();
      $$renderer2.push(`</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="flex gap-2">`);
      push_element($$renderer2, "div", 303, 4);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (hasOverrides()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button type="button"${attr("disabled", resetting, true)} class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium">`);
        push_element($$renderer2, "button", 314, 6);
        {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`Reset to Default`);
        }
        $$renderer2.push(`<!--]--></button>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <button type="button"${attr("disabled", true, true)} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">`);
      push_element($$renderer2, "button", 327, 5);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Save Changes`);
      }
      $$renderer2.push(`<!--]--></button>`);
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
      if (hasOverrides()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="mb-4 p-4 rounded-md bg-blue-50 text-blue-700 text-sm">`);
        push_element($$renderer2, "div", 351, 4);
        $$renderer2.push(`This template has custom overrides applied. Changes will be merged with the base template
					configuration.</div>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-center py-8">`);
        push_element($$renderer2, "div", 358, 4);
        $$renderer2.push(`<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">`);
        push_element($$renderer2, "div", 359, 5);
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(` <p class="mt-2 text-gray-600">`);
        push_element($$renderer2, "p", 360, 5);
        $$renderer2.push(`Loading template overrides...</p>`);
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

export { _page as default };
//# sourceMappingURL=_page.svelte-D6xBTqV8.js.map
