import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en';
import id from './locales/id';

const STORAGE_KEY = 'appLanguage';
const DEFAULT_LANGUAGE = 'en';

const messages = { en, id };

const I18nContext = createContext({
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key, fallback) => fallback ?? key,
});

const getNestedValue = (source, path) => path
    .split('.')
    .reduce((current, segment) => (current != null ? current[segment] : undefined), source);

const getInitialLanguage = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    return storedLanguage && messages[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE;
};

export function I18nProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, language);
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        t: (key, fallback = key) => {
            const translated = getNestedValue(messages[language], key);
            return translated ?? fallback;
        },
    }), [language]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}
