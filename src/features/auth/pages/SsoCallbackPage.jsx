import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    authService,
    clearAuthStorage,
    persistAuthProfile,
    persistAuthSession,
} from '../../../services/api';
import loginBackground from '../../../assets/images/image_background_login_white.png';
import iconApp from '../../../assets/images/icon_app_white.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

async function finalizeLogin(authPayload) {
    if (!authPayload?.token) {
        throw new Error('Token not received from server');
    }

    localStorage.setItem('authToken', authPayload.token);
    persistAuthSession(authPayload);
    const currentUser = await authService.getMe();
    persistAuthProfile(currentUser);
}

export default function SsoCallbackPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const handledSsoCodeRef = useRef(null);
    const [errorMsg, setErrorMsg] = useState('');
    const { t } = useI18n();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const ssoCode = params.get('code');

        if (!ssoCode) {
            navigate('/login', { replace: true });
            return;
        }

        if (handledSsoCodeRef.current === ssoCode) {
            return;
        }

        handledSsoCodeRef.current = ssoCode;

        const handleSsoLogin = async () => {
            setErrorMsg('');

            try {
                const data = await authService.ssoLogin(ssoCode);
                await finalizeLogin(data);
                navigate('/dashboard', { replace: true });
            } catch (error) {
                clearAuthStorage();
                setErrorMsg(error.message);
                navigate('/login', {
                    replace: true,
                    state: { authError: error.message },
                });
            }
        };

        handleSsoLogin();
    }, [location.search, navigate]);

    return (
        <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F1F4F9] bg-cover bg-center bg-no-repeat font-sans"
            style={{ backgroundImage: `url(${loginBackground})` }}
        >
            <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-8 text-center">
                <img src={iconApp} alt="Drone" className="mb-8 h-auto w-[min(70vw,320px)] object-contain" />
                <h1 className="mb-3 font-inter text-[36px] font-bold tracking-[0.16em] text-[#FD0202] md:text-[48px]">
                    {t('app.productName')}
                </h1>
                <p className="font-inter text-sm tracking-[0.12em] text-[#222222] md:text-base">
                    {errorMsg || t('auth.ssoSigningIn')}
                </p>
            </div>
        </div>
    );
}
