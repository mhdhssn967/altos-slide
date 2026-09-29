import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './GameEngine';
import { soundEngine } from './audio';
import { Canvas } from '@react-three/fiber';
import { Character3D, CameraSetup, SkateboardsOnTrack, CarsOnTrack, Spaceship3D, RobotEnemiesOnTrack, FlyPolice } from './Character3D';
import { LoadingScreen } from './LoadingScreen';
import './index.css';

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  
  const [gameState, setGameState] = useState('IDLE');
  const [distance, setDistance] = useState(0);
  const [blueCrystals, setBlueCrystals] = useState(0);
  const [purpleCrystals, setPurpleCrystals] = useState(0);
  const [bestDistance, setBestDistance] = useState(0);
  const [gameOverStats, setGameOverStats] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    engineRef.current = new GameEngine(canvasRef.current, (updates) => {
      if (updates.state !== undefined) setGameState(updates.state);
      if (updates.distance !== undefined) setDistance(updates.distance);
      if (updates.blueCrystals !== undefined) setBlueCrystals(updates.blueCrystals);
      if (updates.purpleCrystals !== undefined) setPurpleCrystals(updates.purpleCrystals);
      if (updates.bestDistance !== undefined) setBestDistance(updates.bestDistance);
      
      if (updates.state === 'GAMEOVER') {
        setGameOverStats({
          blueCrystals: updates.blueCrystals || 0,
          purpleCrystals: updates.purpleCrystals || 0,
          distance: updates.distance,
          tricksLanded: updates.tricksLanded,
          bestDistance: updates.bestDistance,
          newRecord: updates.newRecord
        });
      }
    });
    
    return () => {
      engineRef.current.cleanup();
    };
  }, []);

  const handleStart = () => {
    soundEngine.ensureContext();
    engineRef.current.startGame();
  };

  return (
    <div className="game-wrapper">
      {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}
      <canvas ref={canvasRef} id="game-canvas" />
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
        <Canvas orthographic>
          <CameraSetup />
          <ambientLight intensity={2.2} />
          <directionalLight position={[10, 10, 10]} intensity={2.8} />
          <directionalLight position={[-10, 5, -10]} intensity={1.5} color="#38bdf8" />
          <Character3D engineRef={engineRef} />
          <Spaceship3D engineRef={engineRef} />
          <RobotEnemiesOnTrack engineRef={engineRef} />
          <SkateboardsOnTrack engineRef={engineRef} />
          <CarsOnTrack engineRef={engineRef} />
          <FlyPolice engineRef={engineRef} />
        </Canvas>
      </div>

      {/* Heads Up Display - Exactly 2 Crystal Score Boards */}
      {gameState === 'PLAYING' && (
        <div className="hud-container">
          <div className="top-hud">
            {/* Crystal Pill Scoreboards matching reference design */}
            <div className="crystal-pills-container">
              {/* 1. Blue Crystals Pill */}
              <div className="crystal-pill blue-pill">
                <div className="crystal-pill-icon">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="blueFacetTop" x1="24" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#e0f2fe" />
                        <stop offset="1" stopColor="#38bdf8" />
                      </linearGradient>
                      <linearGradient id="blueFacetLeft" x1="8" y1="24" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#0284c7" />
                        <stop offset="1" stopColor="#0369a1" />
                      </linearGradient>
                      <linearGradient id="blueFacetRight" x1="40" y1="24" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#38bdf8" />
                        <stop offset="1" stopColor="#0284c7" />
                      </linearGradient>
                      <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#00f0ff" floodOpacity="0.7"/>
                      </filter>
                    </defs>
                    <circle cx="24" cy="24" r="22" fill="#0b1329" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="24" cy="24" r="18" fill="rgba(56, 189, 248, 0.2)" />
                    <g filter="url(#cyanGlow)">
                      <polygon points="24,9 33,22 24,24 15,22" fill="url(#blueFacetTop)" />
                      <polygon points="24,9 15,22 10,24" fill="#7dd3fc" />
                      <polygon points="24,9 38,24 33,22" fill="#bae6fd" />
                      <polygon points="24,39 33,24 24,26 15,24" fill="#0284c7" />
                      <polygon points="24,39 15,24 10,24" fill="url(#blueFacetLeft)" />
                      <polygon points="24,39 38,24 33,24" fill="url(#blueFacetRight)" />
                      <polygon points="24,11 28,18 24,20 20,18" fill="#ffffff" opacity="0.9" />
                    </g>
                  </svg>
                </div>
                <span className="crystal-pill-value">{blueCrystals}</span>
              </div>

              {/* 2. Purple Crystals Pill */}
              <div className="crystal-pill purple-pill">
                <div className="crystal-pill-icon">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="purpleFacetTop" x1="24" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fdf4ff" />
                        <stop offset="1" stopColor="#e879f9" />
                      </linearGradient>
                      <linearGradient id="purpleFacetLeft" x1="8" y1="24" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#9333ea" />
                        <stop offset="1" stopColor="#6b21a8" />
                      </linearGradient>
                      <linearGradient id="purpleFacetRight" x1="40" y1="24" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#d946ef" />
                        <stop offset="1" stopColor="#a855f7" />
                      </linearGradient>
                      <filter id="magentaGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#d946ef" floodOpacity="0.7"/>
                      </filter>
                    </defs>
                    <circle cx="24" cy="24" r="22" fill="#1b0c2e" stroke="#d946ef" strokeWidth="2.5" />
                    <circle cx="24" cy="24" r="18" fill="rgba(217, 70, 239, 0.2)" />
                    <g filter="url(#magentaGlow)">
                      <polygon points="24,9 33,22 24,24 15,22" fill="url(#purpleFacetTop)" />
                      <polygon points="24,9 15,22 10,24" fill="#f0abfc" />
                      <polygon points="24,9 38,24 33,22" fill="#f5d0fe" />
                      <polygon points="24,39 33,24 24,26 15,24" fill="#a855f7" />
                      <polygon points="24,39 15,24 10,24" fill="url(#purpleFacetLeft)" />
                      <polygon points="24,39 38,24 33,24" fill="url(#purpleFacetRight)" />
                      <polygon points="24,11 28,18 24,20 20,18" fill="#ffffff" opacity="0.9" />
                    </g>
                  </svg>
                </div>
                <span className="crystal-pill-value">{purpleCrystals}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Modal */}
      {isLoaded && gameState === 'IDLE' && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="glow-accent"></div>
            <h1 className="modal-title hero-title">Alto Run</h1>
            <button className="primary-btn play-btn" onClick={handleStart}>
              <span className="play-icon">▶</span> PLAY
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="glow-accent error"></div>
            <h2 className="modal-title">YOU ARE CAUGHT</h2>
            <p className="modal-subtitle">You took a tumble!</p>

            <div className="results-grid">
              <div className="result-item">
                <span className="result-label">BLUE CRYSTALS</span>
                <span className="result-value">💠 {gameOverStats.blueCrystals}</span>
              </div>
              <div className="result-item">
                <span className="result-label">PURPLE CRYSTALS</span>
                <span className="result-value">🔮 {gameOverStats.purpleCrystals}</span>
              </div>
              <div className="result-item">
                <span className="result-label">TRICKS LANDED</span>
                <span className="result-value">{gameOverStats.tricksLanded}</span>
              </div>
              <div className="result-item">
                <span className="result-label">BEST DISTANCE</span>
                <span className="result-value">{gameOverStats.bestDistance}m</span>
              </div>
            </div>

            {gameOverStats.newRecord && (
              <div className="high-score-banner">🏆 NEW DISTANCE RECORD!</div>
            )}

            <button className="primary-btn" onClick={handleStart}>PLAY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
}
