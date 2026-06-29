import React from 'react';
import backgroundImage from '../../../assets/images/image_background_login_white.png';
import licenseBorderBackground from '../../../assets/images/image_border_license_about_white.png';
import iconApp from '../../../assets/images/icon_app_white.svg';

export default function AboutPage() {
    return (
        <div className="relative h-[calc(100vh-104px)] w-full overflow-hidden bg-[#111620]">
            <div className="absolute inset-0 pointer-events-none">
                <img
                    src={backgroundImage}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-center select-none"
                />
            </div>

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
                        <h1 className="font-orbitron mb-2 text-[40px] font-extrabold leading-none tracking-[0.16em] text-[#FD0202] md:text-[52px]">
                            ICCS
                        </h1>
                        <h2 className="font-tomorrow text-[24px] font-medium tracking-[0.12em] text-[#000000] md:text-[28px]">
                            Guard SF Perimeter
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

                            <div className="font-orbitron relative z-10 flex h-full flex-col justify-center px-10 py-10">
                                <h2 className="text-[#000000] text-[28px] font-extralight tracking-widest mb-10 select-none">
                                    License
                                </h2>

                                <div className="font-tomorrow flex flex-col gap-5">
                                    <div className="rounded-[8px] border border-[#9F9F9F] bg-[#D0D0D0] px-6 py-4 flex items-center justify-between transition-colors hover:bg-[#C6C6C6]">
                                        <span className="text-[#000000] font-medium text-[15px]">Docking</span>
                                        <span className="text-[#000000] font-medium tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                    </div>

                                    {/* <div className="rounded-[8px] border border-[#9F9F9F] bg-[#D0D0D0] px-6 py-4 flex items-center justify-between transition-colors hover:bg-[#C6C6C6]">
                                        <span className="text-[#000000] font-medium text-[15px]">Drone AI</span>
                                        <span className="text-[#000000] font-medium tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                    </div> */}

                                    <div className="rounded-[8px] border border-[#9F9F9F] bg-[#D0D0D0] px-6 py-4 flex items-center justify-between transition-colors hover:bg-[#C6C6C6]">
                                        <span className="text-[#000000] font-medium text-[15px]">Drone</span>
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
