import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationZH from './locales/zh';
import translationEN from './locales/en';
import translationJA from './locales/ja';

const resources = {
  zh: translationZH,
  en: translationEN,
  ja: translationJA,
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'zh', // 后备语言
    interpolation: {
      escapeValue: false, // React 已经自带防 XSS
    },
  });

export default i18n;
