import { s as slot, a as store_get, b as attr, u as unsubscribe_stores, c as attr_class, d as bind_props } from './index2-ConC1ezP.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import './client-Y_D_pt3w.js';
import { s as siteConfigData } from './siteConfig-Cmkj7lH5.js';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import { Y as derived, Z as escape_html, _ as fallback, $ as get, X as writable } from './index-BI-RhdSw.js';
import { S as SUPPORTED_LANGUAGES, c as currentLanguage } from './language-DBYnqBMI.js';
import { M as MultiLangUtils } from './multiLang-CvArbvqX.js';
import 'clsx';
import './exports-Dc4PPDXS.js';

const auth = writable({ authenticated: false });
LanguageSelector[FILENAME] = "src/lib/components/LanguageSelector.svelte";
function LanguageSelector($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let config, activeLanguages, availableLanguages, lang, currentLangConfig;
      let className = fallback($$props["className"], "");
      let showFlags = fallback($$props["showFlags"], true);
      let showNativeNames = fallback($$props["showNativeNames"], true);
      let compact = fallback($$props["compact"], false);
      let isOpen = false;
      config = get(siteConfigData);
      activeLanguages = config?.languages?.activeLanguages ?? ["en"];
      availableLanguages = SUPPORTED_LANGUAGES.filter((lang2) => activeLanguages.includes(lang2.code));
      lang = get(currentLanguage);
      currentLangConfig = availableLanguages.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      $$renderer2.push(`<div${attr_class(`relative ${className}`)}>`);
      push_element($$renderer2, "div", 38, 0);
      $$renderer2.push(`<button type="button"${attr_class(`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm
          bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors text-gray-900
          ${compact ? "text-sm" : "text-base"}
        `)} aria-haspopup="listbox"${attr("aria-expanded", isOpen)}>`);
      push_element($$renderer2, "button", 40, 1);
      if (showFlags) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="text-lg">`);
        push_element($$renderer2, "span", 53, 3);
        $$renderer2.push(`${escape_html(currentLangConfig?.flag)}</span>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <span class="font-medium text-gray-900">`);
      push_element($$renderer2, "span", 56, 2);
      if (lang === "he") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`${escape_html(currentLangConfig?.name)}`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (showNativeNames) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`${escape_html(currentLangConfig?.nativeName)}`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`${escape_html(currentLangConfig?.name)}`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></span>`);
      pop_element();
      $$renderer2.push(` `);
      if (currentLangConfig?.isRTL && lang !== "he") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="text-xs text-gray-500 bg-gray-100 px-1 rounded">`);
        push_element($$renderer2, "span", 67, 3);
        $$renderer2.push(`RTL</span>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <svg${attr_class(`w-4 h-4 text-gray-400 transition-transform ${""}`)} fill="none" stroke="currentColor" viewBox="0 0 24 24">`);
      push_element($$renderer2, "svg", 70, 2);
      $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7">`);
      push_element($$renderer2, "path", 76, 3);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      bind_props($$props, { className, showFlags, showNativeNames, compact });
    },
    LanguageSelector
  );
}
LanguageSelector.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Header[FILENAME] = "src/lib/components/Header.svelte";
function Header($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      const title = derived([siteConfigData, currentLanguage], ([$config, $lang]) => $config?.title ? MultiLangUtils.getTextValue($config.title, $lang) : "OpenShutter");
      const logo = derived(siteConfigData, ($config) => $config?.logo ?? "");
      $$renderer2.push(`<header class="bg-white shadow-sm border-b border-gray-200">`);
      push_element($$renderer2, "header", 24, 0);
      $$renderer2.push(`<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">`);
      push_element($$renderer2, "div", 25, 1);
      $$renderer2.push(`<div class="flex justify-between items-center h-16">`);
      push_element($$renderer2, "div", 26, 2);
      $$renderer2.push(`<div class="flex items-center space-x-3">`);
      push_element($$renderer2, "div", 28, 3);
      if (store_get($$store_subs ??= {}, "$logo", logo)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", store_get($$store_subs ??= {}, "$logo", logo))}${attr("alt", store_get($$store_subs ??= {}, "$title", title))} class="w-10 h-10 object-contain shrink-0"/>`);
        push_element($$renderer2, "img", 30, 5);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">`);
        push_element($$renderer2, "div", 36, 5);
        $$renderer2.push(`<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">`);
        push_element($$renderer2, "svg", 37, 6);
        $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z">`);
        push_element($$renderer2, "path", 38, 7);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z">`);
        push_element($$renderer2, "path", 44, 7);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`</svg>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--> <div class="flex flex-col">`);
      push_element($$renderer2, "div", 54, 4);
      $$renderer2.push(`<a href="/" class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">`);
      push_element($$renderer2, "a", 55, 5);
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$title", title))}</a>`);
      pop_element();
      $$renderer2.push(` <span class="text-xs text-gray-500">`);
      push_element($$renderer2, "span", 58, 5);
      $$renderer2.push(`SvelteKit migration preview · ${escape_html(year)}</span>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <nav class="hidden md:flex items-center gap-4 text-sm text-gray-600">`);
      push_element($$renderer2, "nav", 63, 3);
      $$renderer2.push(`<a href="/" class="hover:text-gray-900">`);
      push_element($$renderer2, "a", 64, 4);
      $$renderer2.push(`Home</a>`);
      pop_element();
      $$renderer2.push(` <a href="/albums" class="hover:text-gray-900">`);
      push_element($$renderer2, "a", 65, 4);
      $$renderer2.push(`Albums</a>`);
      pop_element();
      $$renderer2.push(` <a href="/search" class="hover:text-gray-900">`);
      push_element($$renderer2, "a", 66, 4);
      $$renderer2.push(`Search</a>`);
      pop_element();
      $$renderer2.push(` `);
      if (store_get($$store_subs ??= {}, "$auth", auth).authenticated && store_get($$store_subs ??= {}, "$auth", auth).user) {
        $$renderer2.push("<!--[-->");
        if (store_get($$store_subs ??= {}, "$auth", auth).user.role === "admin") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<a href="/admin" class="hover:text-gray-900 font-medium text-primary-600">`);
          push_element($$renderer2, "a", 70, 6);
          $$renderer2.push(`Admin</a>`);
          pop_element();
        } else {
          $$renderer2.push("<!--[!-->");
          if (store_get($$store_subs ??= {}, "$auth", auth).user.role === "owner") {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<a href="/owner" class="hover:text-gray-900 font-medium text-primary-600">`);
            push_element($$renderer2, "a", 72, 6);
            $$renderer2.push(`My Gallery</a>`);
            pop_element();
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--> <span class="text-gray-400">`);
        push_element($$renderer2, "span", 74, 5);
        $$renderer2.push(`|</span>`);
        pop_element();
        $$renderer2.push(` <span class="text-gray-500">`);
        push_element($$renderer2, "span", 75, 5);
        $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$auth", auth).user.name || store_get($$store_subs ??= {}, "$auth", auth).user.email)}</span>`);
        pop_element();
        $$renderer2.push(` <button class="hover:text-gray-900 text-gray-600" type="button">`);
        push_element($$renderer2, "button", 76, 5);
        $$renderer2.push(`Logout</button>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<a href="/login" class="hover:text-gray-900">`);
        push_element($$renderer2, "a", 84, 5);
        $$renderer2.push(`Sign In</a>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--> <div class="ml-6">`);
      push_element($$renderer2, "div", 88, 4);
      LanguageSelector($$renderer2, { compact: true });
      $$renderer2.push(`<!----></div>`);
      pop_element();
      $$renderer2.push(`</nav>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    Header
  );
}
Header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Footer[FILENAME] = "src/lib/components/Footer.svelte";
function Footer($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      $$renderer2.push(`<footer class="bg-gray-800 text-white mt-8">`);
      push_element($$renderer2, "footer", 5, 0);
      $$renderer2.push(`<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
      push_element($$renderer2, "div", 6, 1);
      $$renderer2.push(`<div class="text-center space-y-2">`);
      push_element($$renderer2, "div", 7, 2);
      $$renderer2.push(`<p class="text-gray-300">`);
      push_element($$renderer2, "p", 8, 3);
      $$renderer2.push(`© ${escape_html(year)} OpenShutter. All rights reserved.</p>`);
      pop_element();
      $$renderer2.push(` <p class="text-gray-400 text-sm">`);
      push_element($$renderer2, "p", 11, 3);
      $$renderer2.push(`SvelteKit migration preview — frontend is being migrated from Next.js to SvelteKit.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</footer>`);
      pop_element();
    },
    Footer
  );
}
Footer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_layout[FILENAME] = "src/routes/+layout.svelte";
function _layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      Header($$renderer2);
      $$renderer2.push(`<!----> <main class="min-h-screen bg-background text-foreground">`);
      push_element($$renderer2, "main", 38, 0);
      $$renderer2.push(`<!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]--></main>`);
      pop_element();
      $$renderer2.push(` `);
      Footer($$renderer2);
      $$renderer2.push(`<!---->`);
    },
    _layout
  );
}
_layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _layout as default };
//# sourceMappingURL=_layout.svelte-D3XuEFg-.js.map
