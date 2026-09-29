import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export function LoadingScreen({ onLoaded }) {
  const { progress } = useProgress();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(onLoaded, 500); // Small delay to let React settle
      return () => clearTimeout(timer);
    }
  }, [progress, onLoaded]);

  return (
    <div className="modal-overlay active" style={{ zIndex: 100, backgroundColor: '#0f172a' }}>
      <div className="modal-card" style={{ width: '400px' }}>
        <h1 className="modal-title hero-title" style={{ fontSize: '2.5rem', marginBottom: '20px', textAlign: 'center' }}>
          LOADING{dots}
        </h1>
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', transition: 'width 0.3s ease-out' }}></div>
        </div>
        <p style={{ marginTop: '15px', color: '#94a3b8', fontSize: '1.2rem', fontFamily: 'monospace', textAlign: 'center' }}>
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
