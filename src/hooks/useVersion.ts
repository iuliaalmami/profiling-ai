import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export const useVersion = () => {
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.public.get('/status');
        console.log('Status response:', response);
        const data = await response.json();
        console.log('Status data:', data);
        setVersion(data.version || 'no-version');
      } catch (err) {
        console.error('Failed to fetch version:', err);
        setError('Failed to fetch version');
        setVersion('unknown');
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, loading, error };
};
