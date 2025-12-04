import { d as derived, w as writable, g as get } from "./index.js";
const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    isRTL: false,
    flag: "🇺🇸"
  },
  {
    code: "he",
    name: "Hebrew",
    nativeName: "עברית",
    isRTL: true,
    flag: "🇮🇱"
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    isRTL: true,
    flag: "🇸🇦"
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    isRTL: false,
    flag: "🇪🇸"
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    isRTL: false,
    flag: "🇫🇷"
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    isRTL: false,
    flag: "🇩🇪"
  }
];
const DEFAULT_LANGUAGE = "en";
const currentLanguage = writable(DEFAULT_LANGUAGE);
const isRTL = derived(currentLanguage, ($lang) => {
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === $lang);
  return langConfig?.isRTL || false;
});
const textDirection = derived(isRTL, ($isRTL) => $isRTL ? "rtl" : "ltr");
function setLanguage(lang) {
  currentLanguage.set(lang);
  if (typeof document !== "undefined") {
    const direction = get(textDirection);
    document.documentElement.dir = direction;
    document.documentElement.lang = lang;
    if (get(isRTL)) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }
}
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("language");
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
    setLanguage(stored);
  } else {
    setLanguage(DEFAULT_LANGUAGE);
  }
  currentLanguage.subscribe((lang) => {
    localStorage.setItem("language", lang);
  });
}
export {
  SUPPORTED_LANGUAGES as S,
  currentLanguage as c
};
