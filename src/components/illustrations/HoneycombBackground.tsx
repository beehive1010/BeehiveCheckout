import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useInView } from 'react-intersection-observer';

interface HoneycombBackgroundProps {
  className?: string;
  variant?: 'subtle' | 'prominent';
}

export const HoneycombBackground: React.FC<HoneycombBackgroundProps> = ({ 
  className = '', 
  variant = 'subtle' 
}) => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const animation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
    config: { mass: 1, tension: 280, friction: 60 }
  });

  const hexagons = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: Math.random() * 40 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: i * 100,
    rotation: Math.random() * 360
  }));

  return (
    <animated.div 
      ref={ref}
      style={animation}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <svg 
        className="w-full h-full"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="honeycomb" patternUnits="userSpaceOnUse" width="100" height="87">
            <polygon
              points="50,0 93,25 93,62 50,87 7,62 7,25"
              fill="none"
              stroke={variant === 'prominent' ? '#FFD700' : '#FFB347'}
              strokeWidth={variant === 'prominent' ? '1.5' : '0.8'}
              opacity={variant === 'prominent' ? '0.15' : '0.08'}
            />
          </pattern>
          
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#FFB347" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Background honeycomb pattern */}
        <rect width="100%" height="100%" fill="url(#honeycomb)" />

        {/* Floating hexagons with animations */}
        {hexagons.map((hex) => (
          <HexagonElement 
            key={hex.id}
            {...hex}
            variant={variant}
            inView={inView}
          />
        ))}

        {/* Central glow effect */}
        <circle 
          cx="600" 
          cy="400" 
          r="200" 
          fill="url(#glowGradient)"
          className={variant === 'prominent' ? 'animate-pulse' : ''}
        />
      </svg>
    </animated.div>
  );
};

interface HexagonElementProps {
  id: number;
  size: number;
  x: number;
  y: number;
  delay: number;
  rotation: number;
  variant: 'subtle' | 'prominent';
  inView: boolean;
}

const HexagonElement: React.FC<HexagonElementProps> = ({
  id, size, x, y, delay, rotation, variant, inView
}) => {
  const hexAnimation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView 
      ? `translate(${x * 10}px, ${y * 6}px) rotate(${rotation}deg) scale(1)`
      : `translate(${x * 10}px, ${y * 6}px) rotate(${rotation - 45}deg) scale(0)`,
    config: { mass: 1, tension: 200, friction: 50 },
    delay: delay
  });

  const strokeColor = variant === 'prominent' ? '#FFD700' : '#FFB347';
  const strokeOpacity = variant === 'prominent' ? 0.4 : 0.2;

  return (
    <animated.g style={hexAnimation}>
      <polygon
        points={`${size/2},0 ${size*0.93},${size*0.25} ${size*0.93},${size*0.75} ${size/2},${size} ${size*0.07},${size*0.75} ${size*0.07},${size*0.25}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeOpacity={strokeOpacity}
        className="animate-pulse"
        style={{
          animationDelay: `${delay}ms`,
          animationDuration: '3s'
        }}
      />
    </animated.g>
  );
};

export default HoneycombBackground;