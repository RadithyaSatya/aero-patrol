import React from 'react';
import pageBackground from '../../../assets/images/image_background_login_white.png';
import { useI18n } from '../../../shared/i18n/I18nProvider';

export default function SettingsPage() {
    const { language, setLanguage, t } = useI18n();
    const languageOptions = [
        { value: 'id', label: t('common.indonesia') },
        { value: 'en', label: t('common.english') },
    ];

    const handleLanguageChange = (nextLanguage) => {
        setLanguage(nextLanguage);
    };

    return (
        <div className="flex h-[calc(100vh-84px)] w-full overflow-hidden bg-[#F1F4F9] font-inter">
            <div className="h-full w-full p-[28px]">
                <div
                    className="relative flex h-full w-full overflow-hidden rounded-[34px] border border-[#FFB3B3] bg-cover bg-center bg-no-repeat px-8 py-8"
                    style={{ backgroundImage: `url(${pageBackground})` }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.2)_46%,rgba(255,255,255,0.4)_100%)]" />

                    <div className="relative z-10 flex h-full w-full flex-col">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 h-[48px] w-[6px] bg-[#FC4747]" />
                            <div className="min-w-0">
                                <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#151515]">
                                    {t('settings.title')}
                                </h1>
                                <p className="mt-2 text-[15px] text-[#777777]">
                                    {t('settings.subtitle')}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center px-4">
                            <div className="w-full max-w-[570px] rounded-[26px] border border-[#FF9F9F] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,249,249,0.9)_100%)] p-[28px]">
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="max-w-[320px]">
                                            <h2 className="text-[20px] font-semibold leading-none text-[#222222]">{t('common.language')}</h2>
                                            <p className="mt-4 text-[14px] leading-[1.6] text-[#5F5F5F]">
                                                {t('settings.languageDescription')}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-5 pt-1">
                                            {languageOptions.map((option) => {
                                                const isSelected = language === option.value;

                                                return (
                                                    <label
                                                        key={option.value}
                                                        className="flex cursor-pointer items-center gap-2 text-[16px] font-semibold text-[#333333]"
                                                    >
                                                        <span
                                                            className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors ${
                                                                isSelected ? 'border-[#FF6262]' : 'border-[#D0D0D0]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="language"
                                                                value={option.value}
                                                                checked={isSelected}
                                                                onChange={() => handleLanguageChange(option.value)}
                                                                className="sr-only"
                                                            />
                                                            <span
                                                                className={`h-[8px] w-[8px] rounded-full ${
                                                                    isSelected ? 'bg-[#FF6262]' : 'bg-transparent'
                                                                }`}
                                                            />
                                                        </span>
                                                        <span>{option.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
