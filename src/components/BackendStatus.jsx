import { useState, useEffect } from 'react';
import axios from 'axios';

const BackendStatus = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get('/api/');
        setStatus('connected');
        setMessage(`Backend connected: ${response.data}`);
      } catch (error) {
        setStatus('disconnected');
        setMessage('Backend not reachable. Make sure FastAPI is running on port 8000.');
        console.error('Backend connection error:', error);
      }
    };

    checkBackend();
    // Check every 5 seconds
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`px-4 py-2 rounded-lg shadow-lg ${
          status === 'connected'
            ? 'bg-green-500 text-white'
            : status === 'disconnected'
            ? 'bg-red-500 text-white'
            : 'bg-yellow-500 text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-white animate-pulse'
                : status === 'disconnected'
                ? 'bg-white'
                : 'bg-white animate-pulse'
            }`}
          />
          <span className="text-sm font-medium">
            {status === 'connected'
              ? 'Backend Connected'
              : status === 'disconnected'
              ? 'Backend Disconnected'
              : 'Checking...'}
          </span>
        </div>
        {message && status !== 'checking' && (
          <p className="text-xs mt-1 opacity-90">{message}</p>
        )}
      </div>
    </div>
  );
};

export default BackendStatus;

