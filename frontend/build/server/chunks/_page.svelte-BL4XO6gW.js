import { h as head, d as bind_props, a as store_get, u as unsubscribe_stores, e as ensure_array_like, b as attr, f as hash } from './index2-ConC1ezP.js';
import { Z as escape_html, Y as derived } from './index-BI-RhdSw.js';
import { s as siteConfigData } from './siteConfig-Cmkj7lH5.js';
import { p as push_element, a as pop_element } from './dev-Bc5s9He8.js';
import { M as MultiLangUtils } from './multiLang-CvArbvqX.js';
import { c as currentLanguage } from './language-DBYnqBMI.js';
import { F as FILENAME } from './index-client-CjQNkNPT.js';
import 'clsx';

function html(value) {
  var html2 = String(value ?? "");
  var open = `<!--${hash(html2)}-->`;
  return open + html2 + "<!---->";
}
const activeTemplate = derived(siteConfigData, ($config) => {
  return $config?.template?.activeTemplate || "modern";
});
HomeHero[FILENAME] = "src/lib/components/HomeHero.svelte";
function HomeHero($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let config, lang, currentPhoto, backgroundImageUrl, title, description;
      let photos = [];
      let currentPhotoIndex = 0;
      const ROTATION_INTERVAL = 8e3;
      config = store_get($$store_subs ??= {}, "$siteConfigData", siteConfigData);
      lang = store_get($$store_subs ??= {}, "$currentLanguage", currentLanguage);
      if (photos.length > 1) {
        setInterval(
          () => {
            currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
          },
          ROTATION_INTERVAL
        );
      }
      currentPhoto = photos[currentPhotoIndex];
      backgroundImageUrl = currentPhoto?.storage?.url || currentPhoto?.storage?.thumbnailPath || currentPhoto?.url || null;
      title = config?.title ? MultiLangUtils.getTextValue(config.title, lang) : "OpenShutter Gallery";
      description = config?.description ? MultiLangUtils.getHTMLValue(config.description, lang) : "A modern photo gallery platform for showcasing your memories with style.";
      if (photos.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<section class="relative overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-600 text-white">`);
        push_element($$renderer2, "section", 63, 2);
        $$renderer2.push(`<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">`);
        push_element($$renderer2, "div", 64, 4);
        $$renderer2.push(`<h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">`);
        push_element($$renderer2, "h1", 65, 6);
        $$renderer2.push(`${escape_html(title)}</h1>`);
        pop_element();
        $$renderer2.push(` <p class="mt-3 text-lg sm:text-xl text-blue-100 max-w-xl">`);
        push_element($$renderer2, "p", 68, 6);
        $$renderer2.push(`${html(description)}</p>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</section>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<section class="relative min-h-[60vh] flex items-center overflow-hidden bg-gray-900 text-white">`);
        push_element($$renderer2, "section", 74, 2);
        if (backgroundImageUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="absolute inset-0">`);
          push_element($$renderer2, "div", 76, 6);
          $$renderer2.push(`<img${attr("src", backgroundImageUrl)} alt="Hero background" class="w-full h-full object-cover transition-all duration-1000 ease-in-out"/>`);
          push_element($$renderer2, "img", 78, 8);
          pop_element();
          $$renderer2.push(` <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/40">`);
          push_element($$renderer2, "div", 83, 8);
          $$renderer2.push(`</div>`);
          pop_element();
          $$renderer2.push(`</div>`);
          pop_element();
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="relative z-10 max-w-4xl mx-auto px-6 py-16">`);
        push_element($$renderer2, "div", 87, 4);
        $$renderer2.push(`<h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-lg">`);
        push_element($$renderer2, "h1", 88, 6);
        $$renderer2.push(`${escape_html(title)}</h1>`);
        pop_element();
        $$renderer2.push(` <p class="mt-3 text-lg sm:text-xl text-blue-100 max-w-xl drop-shadow">`);
        push_element($$renderer2, "p", 92, 6);
        $$renderer2.push(`${html(description)}</p>`);
        pop_element();
        $$renderer2.push(` <div class="mt-8 flex flex-wrap gap-4">`);
        push_element($$renderer2, "div", 96, 6);
        $$renderer2.push(`<a href="/albums" class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-white text-primary-600 hover:bg-blue-50">`);
        push_element($$renderer2, "a", 97, 8);
        $$renderer2.push(`Browse Albums</a>`);
        pop_element();
        $$renderer2.push(` <a href="/search" class="inline-flex items-center justify-center px-6 py-3 border border-white/40 text-base font-medium rounded-md text-white hover:bg-white/10">`);
        push_element($$renderer2, "a", 103, 8);
        $$renderer2.push(`Search Photos</a>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
        $$renderer2.push(`</section>`);
        pop_element();
      }
      $$renderer2.push(`<!--]-->`);
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    HomeHero
  );
}
HomeHero.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Home[FILENAME] = "src/lib/templates/modern/Home.svelte";
function Home($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let data = $$props["data"];
      HomeHero($$renderer2);
      $$renderer2.push(`<!----> <section class="bg-white">`);
      push_element($$renderer2, "section", 13, 0);
      $$renderer2.push(`<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">`);
      push_element($$renderer2, "div", 14, 1);
      $$renderer2.push(`<div class="flex items-center justify-between mb-6">`);
      push_element($$renderer2, "div", 15, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 16, 3);
      $$renderer2.push(`<h2 class="text-2xl font-semibold text-gray-900">`);
      push_element($$renderer2, "h2", 17, 4);
      $$renderer2.push(`Featured Albums</h2>`);
      pop_element();
      $$renderer2.push(` <p class="mt-1 text-sm text-gray-500">`);
      push_element($$renderer2, "p", 18, 4);
      $$renderer2.push(`Root-level public albums from your gallery.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <a href="/albums" class="text-sm font-medium text-primary-600 hover:text-primary-700">`);
      push_element($$renderer2, "a", 20, 3);
      $$renderer2.push(`View all</a>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      if (data.albumsError) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">`);
        push_element($$renderer2, "div", 26, 3);
        $$renderer2.push(`Failed to load albums: ${escape_html(data.albumsError)}</div>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[!-->");
        if (!data.rootAlbums || data.rootAlbums.length === 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="bg-gray-50 text-gray-600 px-4 py-3 rounded-md text-sm">`);
          push_element($$renderer2, "div", 30, 3);
          $$renderer2.push(`No albums available yet.</div>`);
          pop_element();
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">`);
          push_element($$renderer2, "div", 34, 3);
          $$renderer2.push(`<!--[-->`);
          const each_array = ensure_array_like(data.rootAlbums);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let album = each_array[$$index];
            $$renderer2.push(`<a${attr("href", `/albums/${album.alias ?? album._id}`)} class="group rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col">`);
            push_element($$renderer2, "a", 36, 5);
            $$renderer2.push(`<div class="aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400 text-xs">`);
            push_element($$renderer2, "div", 40, 6);
            $$renderer2.push(`Album cover</div>`);
            pop_element();
            $$renderer2.push(` <div class="p-4 flex-1 flex flex-col">`);
            push_element($$renderer2, "div", 43, 6);
            $$renderer2.push(`<h3 class="text-base font-semibold text-gray-900 group-hover:text-primary-600 truncate">`);
            push_element($$renderer2, "h3", 44, 7);
            if (album.name) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`${escape_html(MultiLangUtils.getTextValue(album.name, store_get($$store_subs ??= {}, "$currentLanguage", currentLanguage)))}`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`Untitled album`);
            }
            $$renderer2.push(`<!--]--></h3>`);
            pop_element();
            $$renderer2.push(` `);
            if (album.description) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<p class="mt-1 text-xs text-gray-500 line-clamp-2">`);
              push_element($$renderer2, "p", 52, 8);
              $$renderer2.push(`${escape_html(MultiLangUtils.getTextValue(album.description, store_get($$store_subs ??= {}, "$currentLanguage", currentLanguage)))}</p>`);
              pop_element();
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></div>`);
            pop_element();
            $$renderer2.push(`</a>`);
            pop_element();
          }
          $$renderer2.push(`<!--]--></div>`);
          pop_element();
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(`</section>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
      bind_props($$props, { data });
    },
    Home
  );
}
Home.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
HomeTemplateSwitcher[FILENAME] = "src/lib/components/HomeTemplateSwitcher.svelte";
function HomeTemplateSwitcher($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let data = $$props["data"];
      if (store_get($$store_subs ??= {}, "$activeTemplate", activeTemplate) === "modern") {
        $$renderer2.push("<!--[-->");
        Home($$renderer2, { data });
      } else {
        $$renderer2.push("<!--[!-->");
        Home($$renderer2, { data });
      }
      $$renderer2.push(`<!--]-->`);
      if ($$store_subs) unsubscribe_stores($$store_subs);
      bind_props($$props, { data });
    },
    HomeTemplateSwitcher
  );
}
HomeTemplateSwitcher.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_page[FILENAME] = "src/routes/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let data = $$props["data"];
      head("1uha8ag", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>OpenShutter</title>`);
        });
      });
      HomeTemplateSwitcher($$renderer2, { data });
      bind_props($$props, { data });
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-BL4XO6gW.js.map
