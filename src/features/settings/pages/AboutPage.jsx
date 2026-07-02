import React from 'react';
import pageBackground from '../../../assets/images/image_background_login_white.png';
import licenseBorderBackground from '../../../assets/images/image_border_license_about.svg';
import iconApp from '../../../assets/images/icon_app_white.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const cardFill = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';

export default function AboutPage() {
    const { t } = useI18n();

    return (
        <div
            className="relative h-[calc(100vh-84px)] w-full overflow-hidden bg-[#F1F4F9] bg-cover bg-center bg-no-repeat font-inter"
            style={{ backgroundImage: `url(${pageBackground})` }}
        >
            <div className="relative z-10 flex h-full w-full items-center justify-center p-[28px]">
                <div className="w-full max-w-[1200px] flex items-center justify-between gap-[100px]">

                    {/* LEFT SIDE: Logo & Name */}
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                        <div className="relative mb-6 flex aspect-[10/7] w-[min(88vw,380px)] items-center justify-center md:h-[196px] md:w-[420px] md:aspect-auto">
                            <img
                                src={iconApp}
                                alt="UAV Patrol Logo"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <h1 className="mb-2 text-[40px] font-bold leading-none tracking-[0.16em] text-[#FD0202] md:text-[52px]">
                            {t('app.productName')}
                        </h1>
                        <h2 className="text-[24px] font-medium tracking-[0.12em] text-[#000000] md:text-[28px]">
                            {t('app.productSubtitle')}
                        </h2>
                    </div>

                    {/* RIGHT SIDE: License Info Pane */}
                    <div className="flex-1">
                        <div className="relative w-full max-w-[550px] aspect-[746/573]">
                            <img
                                src={licenseBorderBackground}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
                            />

                            <div className="relative z-10 flex h-full flex-col px-10 py-10 font-inter">
                                <h2 className="mb-10 select-none text-[28px] font-medium tracking-[0.12em] text-[#000000]">
                                    {t('about.license')}
                                </h2>

                                <div className="flex flex-col gap-5">
                                    <div
                                        className="flex items-center justify-between rounded-[8px] border px-6 py-4 transition-colors hover:brightness-[0.98]"
                                        style={{ background: cardFill, borderColor: '#B5B5B5' }}
                                    >
                                        <span className="text-[#000000] font-medium text-[15px]">{t('about.docking')}</span>
                                        <span className="text-[#000000] font-medium tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                    </div>

                                    {/* <div className="rounded-[8px] border border-[#9F9F9F] bg-[#D0D0D0] px-6 py-4 flex items-center justify-between transition-colors hover:bg-[#C6C6C6]">
                                        <span className="text-[#000000] font-medium text-[15px]">Drone AI</span>
                                        <span className="text-[#000000] font-medium tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                    </div> */}

                                    <div
                                        className="flex items-center justify-between rounded-[8px] border px-6 py-4 transition-colors hover:brightness-[0.98]"
                                        style={{ background: cardFill, borderColor: '#B5B5B5' }}
                                    >
                                        <span className="text-[#000000] font-medium text-[15px]">{t('about.drone')}</span>
                                        <span className="text-[#000000] font-medium tracking-wider text-[15px]">2345-2345-2452-3452</span>
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
