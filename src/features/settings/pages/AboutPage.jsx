import React from 'react';
import licenseBorderBackground from '../../../assets/images/image_border_license_about.png';
import iconApp from '../../../assets/images/icon_app.svg';

export default function AboutPage() {
    return (
        <div className="w-full h-[calc(100vh-104px)] overflow-hidden flex items-center justify-center p-[28px]">
            <div className="w-full max-w-[1200px] flex items-center justify-between gap-[100px]">

                {/* LEFT SIDE: Logo & Name */}
                <div className="flex flex-col items-center justify-center flex-1">
                    <img
                        src={iconApp}
                        alt="UAV Patrol Logo"
                        className="w-[min(88vw,420px)] aspect-[10/7] md:w-[420px] md:h-[204px] md:aspect-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] brightness-110"
                    />
                    <h1 className="font-orbitron text-[#FD5757] text-[48px] font-black tracking-[0.15em] mt-4 text-center select-none">
                        Aero Patrol
                    </h1>
                </div>

                {/* RIGHT SIDE: License Info Pane */}
                <div className="flex-1">
                    <div className="relative w-full max-w-[550px] aspect-[746/573] drop-shadow-[0_15px_50px_rgba(0,0,0,0.6)]">
                        <img
                            src={licenseBorderBackground}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
                        />

                        <div className="font-orbitron relative z-10 flex h-full flex-col justify-center px-10 py-10">
                            <h2 className="text-white text-[28px] font-extralight tracking-widest mb-10 select-none">
                                License
                            </h2>

                            <div className="font-tomorrow flex flex-col gap-5">
                                {/* Docking LicenseRow */}
                                <div className="bg-[#1f2937]/50 rounded-[8px] border border-[#374151] px-6 py-4 flex items-center justify-between hover:bg-[#252b36] transition-colors">
                                    <span className="text-gray-300 font-medium text-[15px]">Docking</span>
                                    <span className="text-white font-bold tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                </div>

                                {/* Drone AI LicenseRow */}
                                <div className="bg-[#1f2937]/50 rounded-[8px] border border-[#374151] px-6 py-4 flex items-center justify-between hover:bg-[#252b36] transition-colors">
                                    <span className="text-gray-300 font-medium text-[15px]">Drone AI</span>
                                    <span className="text-white font-bold tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                </div>

                                {/* Drone LicenseRow */}
                                <div className="bg-[#1f2937]/50 rounded-[8px] border border-[#374151] px-6 py-4 flex items-center justify-between hover:bg-[#252b36] transition-colors">
                                    <span className="text-gray-300 font-medium text-[15px]">Drone</span>
                                    <span className="text-white font-bold tracking-wider text-[15px]">2345-2345-2452-3452</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
