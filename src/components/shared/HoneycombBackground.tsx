import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// 蜂巢六边形背景组件
export const HoneycombBackground: React.FC = () => {
  // 生成蜂巢六边形网格
  const generateHexagons = () => {
    const hexagons = [];
    const rows = 8;  // 减少行数
    const cols = 6;  // 减少列数
    const hexSize = 60;
    const hexHeight = hexSize * Math.sqrt(3);
    const hexWidth = hexSize * 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexWidth * 0.75;
        const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0);

        // 随机延迟和动画参数
        const delay = Math.random() * 5;
        const duration = 3 + Math.random() * 2;
        const opacity = 0.05 + Math.random() * 0.15;

        hexagons.push(
          <motion.g
            key={`hex-${row}-${col}`}
            initial={{ opacity: opacity }}
            animate={{
              opacity: [opacity, opacity * 1.8, opacity],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "easeInOut"
            }}
          >
            <path
              d={`M ${x + hexSize} ${y}
                  L ${x + hexSize * 1.5} ${y + hexHeight / 4}
                  L ${x + hexSize * 1.5} ${y + hexHeight * 0.75}
                  L ${x + hexSize} ${y + hexHeight}
                  L ${x + hexSize * 0.5} ${y + hexHeight * 0.75}
                  L ${x + hexSize * 0.5} ${y + hexHeight / 4}
                  Z`}
              fill="none"
              stroke="url(#honeyGradient)"
              strokeWidth="2"
            />
          </motion.g>
        );
      }
    }
    return hexagons;
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* 金色渐变 */}
          <linearGradient id="honeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFD700" stopOpacity="1" />
            <stop offset="100%" stopColor="#B8860B" stopOpacity="0.6" />
          </linearGradient>

          {/* 光晕滤镜 */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 渲染蜂巢网格 */}
        <g filter="url(#glow)">
          {generateHexagons()}
        </g>
      </svg>
    </div>
  );
};

// 蜜蜂动画组件
export const BeeAnimation: React.FC = () => {
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 生成多只蜜蜂 - 减少数量
  const bees = Array.from({ length: 4 }, (_, i) => {
    // 随机起始位置
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;

    // 随机飞行路径
    const path = {
      x: [
        startX,
        startX + (Math.random() - 0.5) * 40,
        startX + (Math.random() - 0.5) * 60,
        startX + (Math.random() - 0.5) * 40,
        startX
      ],
      y: [
        startY,
        startY + (Math.random() - 0.5) * 30,
        startY + (Math.random() - 0.5) * 50,
        startY + (Math.random() - 0.5) * 30,
        startY
      ]
    };

    const duration = 15 + Math.random() * 10;
    const delay = Math.random() * 5;

    return (
      <motion.div
        key={`bee-${i}`}
        className="absolute w-8 h-8"
        initial={{ x: `${startX}%`, y: `${startY}%` }}
        animate={{
          x: path.x.map(v => `${v}%`),
          y: path.y.map(v => `${v}%`),
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          delay: delay,
          ease: "linear"
        }}
      >
        {/* 蜜蜂SVG */}
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full drop-shadow-lg"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(212, 175, 55, 0.4))'
          }}
        >
          {/* 蜜蜂身体 */}
          <ellipse cx="32" cy="32" rx="12" ry="18" fill="#FFD700" />

          {/* 黑色条纹 */}
          <rect x="20" y="24" width="24" height="4" fill="#1a1a1a" rx="2" />
          <rect x="20" y="32" width="24" height="4" fill="#1a1a1a" rx="2" />
          <rect x="20" y="40" width="24" height="4" fill="#1a1a1a" rx="2" />

          {/* 翅膀 - 左 */}
          <motion.ellipse
            cx="20"
            cy="26"
            rx="10"
            ry="14"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="#D4AF37"
            strokeWidth="1"
            animate={{
              ry: [14, 16, 14],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* 翅膀 - 右 */}
          <motion.ellipse
            cx="44"
            cy="26"
            rx="10"
            ry="14"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="#D4AF37"
            strokeWidth="1"
            animate={{
              ry: [14, 16, 14],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.15
            }}
          />

          {/* 头部 */}
          <circle cx="32" cy="18" r="6" fill="#1a1a1a" />

          {/* 触角 */}
          <line x1="30" y1="14" x2="28" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
          <line x1="34" y1="14" x2="36" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="10" r="1.5" fill="#D4AF37" />
          <circle cx="36" cy="10" r="1.5" fill="#D4AF37" />
        </svg>
      </motion.div>
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-60">
      {bees}
    </div>
  );
};

// 金色粒子闪烁效果
export const GoldenParticles: React.FC = () => {
  const particles = Array.from({ length: 15 }, (_, i) => {  // 减少粒子数量
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = 2 + Math.random() * 4;
    const duration = 2 + Math.random() * 3;
    const delay = Math.random() * 2;

    return (
      <motion.div
        key={`particle-${i}`}
        className="absolute rounded-full"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 100%)',
          boxShadow: '0 0 8px rgba(255, 215, 0, 0.6)'
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut"
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles}
    </div>
  );
};

// 组合背景组件 - 优化性能和稳定性
export const DashboardBackground: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // 延迟加载动画，避免初始渲染冲突
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 深色渐变基础背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />

      {isReady && (
        <>
          {/* 蜂巢图案 */}
          <HoneycombBackground />

          {/* 金色粒子 */}
          <GoldenParticles />

          {/* 蜜蜂动画 */}
          <BeeAnimation />
        </>
      )}

      {/* 顶部金色光晕 */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-radial from-yellow-500/10 via-transparent to-transparent pointer-events-none" />

      {/* 底部暗色渐变 */}
      <div className="fixed bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </>
  );
};
