import { $ as get } from './index-BI-RhdSw.js';
import { c as currentLanguage, S as SUPPORTED_LANGUAGES } from './language-DBYnqBMI.js';

function getTextValue(text, lang) {
  if (!text) return "";
  if (typeof text === "string") return text;
  const language = lang || get(currentLanguage);
  return text[language] || text["en"] || Object.values(text)[0] || "";
}
function getHTMLValue(html, lang) {
  if (!html) return "";
  if (typeof html === "string") return html;
  const language = lang || get(currentLanguage);
  return html[language] || html["en"] || Object.values(html)[0] || "";
}
function getValue(field, languageCode) {
  if (!field) return "";
  if (typeof field !== "object") {
    return "";
  }
  if (field[languageCode]) {
    const value = field[languageCode];
    return typeof value === "string" ? value : "";
  }
  const firstLanguage = Object.keys(field)[0];
  if (firstLanguage) {
    const value = field[firstLanguage];
    return typeof value === "string" ? value : "";
  }
  return "";
}
function setValue(field, languageCode, value) {
  const validLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code);
  const filteredField = Object.keys(field || {}).reduce((acc, key) => {
    if (validLanguages.includes(key)) {
      acc[key] = field[key];
    }
    return acc;
  }, {});
  return {
    ...filteredField,
    [languageCode]: value
  };
}
function hasContent(field, languageCode) {
  return !!(field && field[languageCode] && field[languageCode].trim());
}
function getLanguagesWithContent(field) {
  if (!field) return [];
  const validLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code);
  return Object.keys(field).filter(
    (lang) => validLanguages.includes(lang) && field[lang] && field[lang].trim()
  );
}
const MultiLangUtils = {
  getTextValue,
  getHTMLValue,
  getValue,
  setValue,
  hasContent,
  getLanguagesWithContent
};

export { MultiLangUtils as M };
//# sourceMappingURL=multiLang-CvArbvqX.js.map
