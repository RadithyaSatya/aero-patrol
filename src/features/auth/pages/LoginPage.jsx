import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/api';
import backgroundImage from '../../../assets/images/image_background_login.png';
import formBorderBackground from '../../../assets/images/image_border_form_login.png';
import loginButton from '../../../assets/images/btn_login.png';
import iconApp from '../../../assets/images/icon_app.svg';

export default function LoginPage() {
    const [username, setUsername] = useState('Admin');
    const [password, setPassword] = useState('password');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            const data = await authService.login(username, password);

            // Save the token on success
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                navigate('/dashboard');
            } else {
                throw new Error('Token not received from server');
            }

        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111620] flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background design elements to mimic the network/tech feel */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
                <img
                    src={backgroundImage}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-center select-none"
                />
            </div>

            <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-center gap-20 md:gap-40 lg:gap-48 z-10 px-8">

                {/* Left Side: Logo & Branding */}
                <div className="flex flex-col items-center text-center md:flex-[0_0_auto]">
                    <div className="w-[min(88vw,380px)] aspect-[10/7] md:w-[420px] md:h-[196px] md:aspect-auto mb-6 relative flex items-center justify-center">
                        {/* Custom Drone SVG Logo mimicking the image */}
                        <img src={iconApp} alt="Drone" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="font-orbitron text-[40px] md:text-[52px] font-extrabold tracking-[0.16em] text-[#FD5757] mb-2 leading-none">
                        Aero Patrol
                    </h1>
                    <h2 className="font-tomorrow text-[24px] md:text-[28px] text-gray-300 font-medium tracking-[0.12em]">
                        Drone Controller
                    </h2>
                </div>

                {/* Right Side: Login Form */}
                <div className="font-orbitron relative w-full max-w-[400px] aspect-[642/705] text-center drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]">
                    <img
                        src={formBorderBackground}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
                    />

                    <div className="relative z-10 flex h-full flex-col justify-center px-10 py-12">
                        <h2 className="text-xl font-bold text-white mb-1 tracking-wide">User Login</h2>
                        <p className="text-[#8894a4] text-xs mb-8">Please enter your credential</p>

                        <form onSubmit={handleLogin} className="font-tomorrow space-y-5 text-left">
                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs px-3 py-2 rounded-sm text-center mb-4">
                                    {errorMsg}
                                </div>
                            )}
                            <div>
                                <label className="block text-[#8894a4] text-xs mb-1.5 ml-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#1b212b] border border-slate-600/50 rounded-sm px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 transition-colors shadow-inner"
                                    placeholder="Admin"
                                />
                            </div>

                            <div>
                                <label className="block text-[#8894a4] text-xs mb-1.5 ml-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1b212b] border border-slate-600/50 rounded-sm px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 transition-colors shadow-inner tracking-widest"
                                    placeholder="•••••"
                                />
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`relative mx-auto flex w-full max-w-[290px] aspect-[534/76] items-center justify-center overflow-hidden rounded-[2px] shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? (
                                        <span className="relative z-10 font-orbitron text-sm tracking-wider text-white">Logging in...</span>
                                    ) : (
                                        <img src={loginButton} alt="Login" className="block h-full w-full object-contain" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}
