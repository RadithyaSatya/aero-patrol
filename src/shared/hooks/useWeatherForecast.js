import { useEffect, useMemo, useState } from 'react';
import { weatherService } from '../../services/api';
import { resolveWeatherCoordinates } from '../utils/weather';

export default function useWeatherForecast({
    selectedDrone = null,
    forecastHours = 6,
} = {}) {
    const [weatherData, setWeatherData] = useState(null);
    const [weatherError, setWeatherError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const coordinates = useMemo(
        () => resolveWeatherCoordinates({ selectedDrone }),
        [selectedDrone]
    );

    useEffect(() => {
        let isCancelled = false;

        const fetchWeather = async () => {
            if (coordinates.latitude == null || coordinates.longitude == null) {
                setWeatherData(null);
                setWeatherError('');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setWeatherError('');

            try {
                const data = await weatherService.getForecast({
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    forecastHours,
                });

                if (isCancelled) {
                    return;
                }

                setWeatherData(data);
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                console.error('Error fetching weather forecast:', error);
                setWeatherData(null);
                setWeatherError(error.message || 'Failed to load weather forecast');
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchWeather();

        return () => {
            isCancelled = true;
        };
    }, [coordinates.latitude, coordinates.longitude, forecastHours]);

    return {
        weatherData,
        weatherError,
        isLoading,
        coordinates,
    };
}
