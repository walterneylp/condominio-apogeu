import { useState, useEffect } from 'react';

export const NotificationToast = () => {
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    const handleNotification = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 8000);
    };

    window.addEventListener('pdm-notification', handleNotification);
    return () => window.removeEventListener('pdm-notification', handleNotification);
  }, []);

  if (!toast) return null;

  return (
    <div 
      className="animate-fade-in flex-center" 
      style={{
         position: 'fixed',
         bottom: '2rem',
         right: '2rem',
         background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
         color: 'white',
         padding: '1rem 1.5rem',
         borderRadius: 'var(--radius-md)',
         boxShadow: 'var(--shadow-lg)',
         zIndex: 9999,
         backdropFilter: 'blur(10px)',
         gap: '0.5rem',
         fontWeight: 500
      }}
    >
      <div style={{
         width: '8px',
         height: '8px',
         background: 'white',
         borderRadius: '50%',
         boxShadow: '0 0 10px rgba(255,255,255,0.8)',
         animation: 'pulse 1.5s infinite'
      }} />
      <span>{toast.message}</span>
    </div>
  );
};
