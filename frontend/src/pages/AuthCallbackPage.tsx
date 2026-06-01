import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TetrisLoading from '@/components/TetrisLoading';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <TetrisLoading size="md" speed="fast" loadingText="Authenticating with GitHub..." />
    </div>
  );
}
