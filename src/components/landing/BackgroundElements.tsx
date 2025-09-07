import { useEffect, useState } from 'react';
import styles from '../../styles/landing/landing.module.css';

export function BackgroundElements() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`${styles.backgroundElements} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-2000`}>
      {/* Enhanced Original Dots */}
      <div className={`${styles.backgroundDot} ${styles.backgroundDot1}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot2}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot3}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot4}`}></div>
      
      
      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          >
            <div 
              className={`w-2 h-2 bg-honey/30 rounded-full animate-pulse transform ${
                i % 3 === 0 ? 'animate-bounce' : i % 3 === 1 ? 'animate-ping' : 'animate-pulse'
              }`}
              style={{
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Hexagonal Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="hexPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <polygon points="5,1 8.66,3 8.66,7 5,9 1.34,7 1.34,3" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexPattern)" className="text-honey" />
        </svg>
      </div>
      
      {/* Dynamic Light Rays */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-1/2 origin-bottom opacity-10"
            style={{
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
              width: '2px',
              height: '100vh',
              background: `linear-gradient(to bottom, transparent, rgba(255,193,7,0.1), transparent)`,
              animationDelay: `${i * 0.5}s`
            }}
          >
            <div 
              className="w-full h-full bg-gradient-to-b from-transparent via-honey/20 to-transparent animate-pulse"
              style={{ animationDuration: `${3 + i * 0.5}s` }}
            />
          </div>
        ))}
      </div>
      
      {/* Pulsing Rings */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute border border-honey/10 rounded-full animate-ping"
            style={{
              width: `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
              animationDuration: `${4 + i * 2}s`,
              animationDelay: `${i * 0.8}s`
            }}
          />
        ))}
      </div>
      
      {/* Constellation Effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => {
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          return (
            <div
              key={i}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div 
                className="w-1 h-1 bg-honey/40 rounded-full animate-pulse"
                style={{
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              />
              {/* Connection lines to nearby stars */}
              {i % 4 === 0 && (
                <div 
                  className="absolute top-0 left-0 h-px bg-gradient-to-r from-honey/20 to-transparent animate-pulse"
                  style={{
                    width: `${50 + Math.random() * 100}px`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Particle System */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`
            }}
          >
            <div className="relative">
              <div className="w-3 h-3 bg-honey/30 rounded-full blur-sm" />
              <div className="absolute inset-0 w-3 h-3 bg-honey/10 rounded-full animate-ping" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Rotating Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              animation: `spin ${20 + i * 5}s linear infinite`,
              animationDelay: `${i * 2}s`
            }}
          >
            <div 
              className="w-6 h-6 bg-honey/20 rounded-full blur-xl"
              style={{
                transform: `translateX(${150 + i * 50}px) translateY(${Math.sin(i) * 50}px)`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}