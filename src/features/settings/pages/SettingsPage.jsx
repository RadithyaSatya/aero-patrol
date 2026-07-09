import React from 'react';
import pageBackground from '../../../assets/images/image_background_login_white.png';
import connectedIcon from '../../../assets/images/icon_connected.svg';
import disconnectedIcon from '../../../assets/images/icon_disconnected.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const connectionCards = [
    {
        title: 'Drone Features',
        status: 'Connected',
        description: 'Connection active. Real-time data and controls are now accessible',
        icon: connectedIcon,
        background: 'linear-gradient(180deg, #44A367 0%, #5C875A 100%)',
    },
    {
        title: 'Language',
        status: 'Disconnected',
        description: 'Connection active. Real-time data and controls are now accessible',
        icon: disconnectedIcon,
        background: 'linear-gradient(180deg, #A35044 0%, #875F5A 100%)',
    },
    {
        title: 'Language',
        status: 'Disconnected',
        description: 'Connection active. Real-time data and controls are now accessible',
        icon: disconnectedIcon,
        background: 'linear-gradient(180deg, #A35044 0%, #875F5A 100%)',
    },
];

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
        <div className="app-page flex overflow-hidden bg-[#F1F4F9] font-inter">
            <div className="app-page__inner h-full">
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
                            <div className="flex w-full max-w-[1400px] flex-col gap-6">
                                <div className="mx-auto w-full max-w-[570px] rounded-[26px] border border-[#FF9F9F] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,249,249,0.9)_100%)] p-[28px]">
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

                                <div className="mx-auto grid w-full max-w-[1320px] gap-5 xl:grid-cols-3">
                                    {connectionCards.map((card, index) => (
                                        <article
                                            key={`${card.title}-${index}`}
                                            className="rounded-[21px] p-[0.68px]"
                                            style={{ background: 'linear-gradient(135deg, #FD5757 0%, #FC4747 100%)' }}
                                            >
                                                <div
                                                className="flex min-h-[154px] flex-col rounded-[20.32px] px-6 py-5 text-white"
                                                style={{ background: card.background }}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <h3 className="flex-1 text-left text-[18px] font-semibold leading-tight tracking-[-0.01em]">
                                                        {card.title}
                                                    </h3>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className="text-[18px] font-semibold leading-none">
                                                            {card.status}
                                                        </span>
                                                        <img
                                                            src={card.icon}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-[17px] w-[17px] shrink-0 object-contain"
                                                        />
                                                    </div>
                                                </div>

                                                <p className="mt-5 max-w-[360px] text-[15px] leading-[1.55] text-white/95">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
