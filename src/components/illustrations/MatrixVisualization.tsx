import React, {useEffect, useState} from 'react';
import {animated, useSpring} from 'react-spring';
import {useInView} from 'react-intersection-observer';
import {useI18n} from '../../contexts/I18nContext';

interface MatrixNode {
  id: string;
  level: number;
  position: number; // 0=Left, 1=Middle, 2=Right
  x: number;
  y: number;
  hasReward: boolean;
  isActive: boolean;
  userName?: string;
}

interface MatrixVisualizationProps {
  maxLevels?: number;
  showAnimation?: boolean;
  className?: string;
  compact?: boolean;
}

export const MatrixVisualization: React.FC<MatrixVisualizationProps> = ({
  maxLevels = 4,
  showAnimation = true,
  className = '',
  compact = false
}) => {
  const { t } = useI18n();
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: false
  });

  const [animationStep, setAnimationStep] = useState(0);
  const [nodes, setNodes] = useState<MatrixNode[]>([]);

  // Generate matrix structure
  useEffect(() => {
    const generateNodes = () => {
      const newNodes: MatrixNode[] = [];
      const centerX = compact ? 200 : 300;
      const baseY = compact ? 50 : 80;
      const levelHeight = compact ? 80 : 120;
      const nodeSpacing = compact ? 60 : 100;
      
      for (let level = 0; level < maxLevels; level++) {
        const nodesInLevel = Math.pow(3, level);
        const startX = centerX - ((nodesInLevel - 1) * nodeSpacing) / 2;
        
        for (let pos = 0; pos < nodesInLevel; pos++) {
          const nodeId = `L${level}-${pos}`;
          newNodes.push({
            id: nodeId,
            level,
            position: pos % 3,
            x: startX + (pos * nodeSpacing),
            y: baseY + (level * levelHeight),
            hasReward: Math.random() > 0.7,
            isActive: level === 0 || Math.random() > 0.5,
            userName: level === 0 ? t('rewards.information.matrixVisualization.legend.you') : Math.random() > 0.6 ? `User${pos + 1}` : undefined
          });
        }
      }
      
      setNodes(newNodes);
    };

    generateNodes();
  }, [maxLevels, compact, t]);

  // Animation sequence
  useEffect(() => {
    if (!inView || !showAnimation) {
      setAnimationStep(0);
      return;
    }

    // Reset animation when component comes into view
    setAnimationStep(0);
    
    const timer = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % maxLevels);
    }, 2000);

    return () => clearInterval(timer);
  }, [inView, showAnimation, maxLevels]);

  const containerAnimation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? 'scale(1)' : 'scale(0.9)',
    config: { mass: 1, tension: 280, friction: 60 }
  });

  const svgWidth = compact ? 400 : 600;
  const svgHeight = compact ? (maxLevels * 80 + 100) : (maxLevels * 120 + 160);

  return (
    <animated.div 
      ref={ref}
      style={containerAnimation}
      className={`relative ${className} transition-all duration-1000`}
    >
      <svg 
        width={svgWidth} 
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto transition-all duration-500 hover:drop-shadow-2xl"
      >
        {/* Connection lines */}
        {nodes.map((node) => {
          if (node.level === 0) return null;
          
          const parentIndex = Math.floor(node.position / 3);
          const parentLevel = node.level - 1;
          const parent = nodes.find(n => n.level === parentLevel && Math.floor(n.position / 3) === parentIndex);
          
          if (!parent) return null;

          return (
            <ConnectionLine
              key={`line-${node.id}`}
              from={{ x: parent.x, y: parent.y }}
              to={{ x: node.x, y: node.y }}
              isActive={node.level <= animationStep}
              delay={node.level * 200}
            />
          );
        })}

        {/* Matrix nodes */}
        {nodes.map((node, index) => (
          <MatrixNodeComponent
            key={node.id}
            node={node}
            isHighlighted={node.level === animationStep}
            delay={index * 50}
            compact={compact}
          />
        ))}

        {/* Level indicators */}
        {Array.from({ length: maxLevels }, (_, level) => (
          <text
            key={`level-${level}`}
            x="20"
            y={compact ? 55 + level * 80 : 85 + level * 120}
            className="text-sm fill-honey font-semibold transition-all duration-300 hover:fill-yellow-300"
          >
            {t('rewards.information.matrixVisualization.level')} {level + 1}
          </text>
        ))}

        {/* Matrix size indicators */}
        {Array.from({ length: maxLevels }, (_, level) => (
          <text
            key={`size-${level}`}
            x={svgWidth - 80}
            y={compact ? 55 + level * 80 : 85 + level * 120}
            className="text-xs fill-gray-400 transition-all duration-300 hover:fill-gray-200"
          >
            {Math.pow(3, level)} {Math.pow(3, level) === 1 ? t('rewards.information.matrixVisualization.legend.member') : t('rewards.information.matrixVisualization.legend.members')}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm animate-in slide-in-from-bottom-2 fade-in-0 duration-1000 delay-500">
        <div className="flex items-center gap-2 transition-all duration-300 hover:scale-105">
          <div className="w-4 h-4 rounded-full bg-honey transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-honey/50"></div>
          <span className="text-gray-300 transition-colors duration-300 hover:text-honey">{t('rewards.information.matrixVisualization.legend.activeMember')}</span>
        </div>
        <div className="flex items-center gap-2 transition-all duration-300 hover:scale-105">
          <div className="w-4 h-4 rounded-full bg-gray-600 transition-all duration-300 hover:scale-125 hover:bg-gray-500"></div>
          <span className="text-gray-300 transition-colors duration-300 hover:text-gray-100">{t('rewards.information.matrixVisualization.legend.pendingMember')}</span>
        </div>
        <div className="flex items-center gap-2 transition-all duration-300 hover:scale-105">
          <div className="w-4 h-4 rounded-full bg-honey ring-2 ring-yellow-400 transition-all duration-300 hover:scale-125 animate-pulse hover:shadow-lg hover:shadow-yellow-400/50"></div>
          <span className="text-gray-300 transition-colors duration-300 hover:text-yellow-300">{t('rewards.information.matrixVisualization.legend.hasRewards')}</span>
        </div>
      </div>
    </animated.div>
  );
};

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isActive: boolean;
  delay: number;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, isActive, delay }) => {
  const lineAnimation = useSpring({
    strokeDashoffset: isActive ? 0 : 100,
    opacity: isActive ? 0.8 : 0.1,
    strokeWidth: isActive ? 3 : 1,
    filter: isActive ? 'drop-shadow(0 0 4px #FFD700)' : 'drop-shadow(0 0 0px transparent)',
    config: { mass: 1, tension: 200, friction: 40 },
    delay
  });

  return (
    <animated.line
      x1={from.x}
      y1={from.y + 15}
      x2={to.x}
      y2={to.y - 15}
      stroke="#FFD700"
      strokeDasharray="6 4"
      style={lineAnimation}
      className="transition-all duration-700 hover:stroke-yellow-300"
    />
  );
};

interface MatrixNodeComponentProps {
  node: MatrixNode;
  isHighlighted: boolean;
  delay: number;
  compact: boolean;
}

const MatrixNodeComponent: React.FC<MatrixNodeComponentProps> = ({ 
  node, 
  isHighlighted, 
  delay,
  compact 
}) => {
  const { t } = useI18n();
  const nodeAnimation = useSpring({
    transform: isHighlighted ? 'scale(1.3) rotate(360deg)' : 'scale(1) rotate(0deg)',
    opacity: 1,
    filter: isHighlighted ? 'drop-shadow(0 0 8px #FFD700)' : 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
    config: { mass: 1, tension: 250, friction: 25 },
    delay
  });

  const radius = compact ? 12 : 16;
  const fontSize = compact ? '10px' : '12px';

  return (
    <animated.g style={nodeAnimation}>
      {/* Node background */}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={node.isActive ? '#FFD700' : '#6B7280'}
        className={`transition-all duration-500 hover:r-[${radius + 2}] ${isHighlighted ? 'animate-bounce' : ''}`}
      />
      
      {/* Reward indicator */}
      {node.hasReward && (
        <circle
          cx={node.x}
          cy={node.y}
          r={radius + 3}
          fill="none"
          stroke="#FBBF24"
          strokeWidth="2"
          className="animate-pulse hover:animate-spin hover:stroke-yellow-300"
        />
      )}
      
      {/* Position indicator (L/M/R) */}
      <text
        x={node.x}
        y={node.y + 3}
        textAnchor="middle"
        className="font-bold"
        fill="#000"
        fontSize={fontSize}
      >
        {node.level === 0 ? t('rewards.information.matrixVisualization.legend.you') : ['L', 'M', 'R'][node.position % 3]}
      </text>
      
      {/* User name if available */}
      {node.userName && (
        <text
          x={node.x}
          y={node.y + radius + 15}
          textAnchor="middle"
          className="text-xs fill-gray-300 transition-all duration-300 hover:fill-white"
        >
          {node.userName}
        </text>
      )}
    </animated.g>
  );
};

export default MatrixVisualization;