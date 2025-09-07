import React, { useState, useEffect } from 'react';
import { useSpring, animated, useSpringValue } from '@react-spring/web';
import { useInView } from 'react-intersection-observer';

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
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true
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
            userName: level === 0 ? 'You' : Math.random() > 0.6 ? `User${pos + 1}` : undefined
          });
        }
      }
      
      setNodes(newNodes);
    };

    generateNodes();
  }, [maxLevels, compact]);

  // Animation sequence
  useEffect(() => {
    if (!inView || !showAnimation) return;

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
      className={`relative ${className}`}
    >
      <svg 
        width={svgWidth} 
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
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
            className="text-sm fill-honey font-semibold"
          >
            Level {level + 1}
          </text>
        ))}

        {/* Matrix size indicators */}
        {Array.from({ length: maxLevels }, (_, level) => (
          <text
            key={`size-${level}`}
            x={svgWidth - 80}
            y={compact ? 55 + level * 80 : 85 + level * 120}
            className="text-xs fill-gray-400"
          >
            {Math.pow(3, level)} {Math.pow(3, level) === 1 ? 'member' : 'members'}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-honey"></div>
          <span className="text-gray-300">Active Member</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-600"></div>
          <span className="text-gray-300">Pending Member</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-honey ring-2 ring-yellow-400"></div>
          <span className="text-gray-300">Has Rewards</span>
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
    opacity: isActive ? 0.6 : 0.2,
    config: { mass: 1, tension: 280, friction: 60 },
    delay
  });

  return (
    <animated.line
      x1={from.x}
      y1={from.y + 15}
      x2={to.x}
      y2={to.y - 15}
      stroke="#FFD700"
      strokeWidth="2"
      strokeDasharray="4 4"
      style={lineAnimation}
      className="transition-all duration-500"
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
  const nodeAnimation = useSpring({
    transform: isHighlighted ? 'scale(1.2)' : 'scale(1)',
    opacity: 1,
    config: { mass: 1, tension: 300, friction: 40 },
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
        className={`transition-colors duration-300 ${isHighlighted ? 'animate-pulse' : ''}`}
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
          className="animate-pulse"
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
        {node.level === 0 ? 'YOU' : ['L', 'M', 'R'][node.position % 3]}
      </text>
      
      {/* User name if available */}
      {node.userName && (
        <text
          x={node.x}
          y={node.y + radius + 15}
          textAnchor="middle"
          className="text-xs fill-gray-300"
        >
          {node.userName}
        </text>
      )}
    </animated.g>
  );
};

export default MatrixVisualization;