import React from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useInView } from 'react-intersection-observer';

interface AnimatedIconProps {
  children: React.ReactNode;
  delay?: number;
  animation?: 'bounce' | 'fade' | 'scale' | 'slide' | 'rotate';
  className?: string;
  trigger?: 'inView' | 'hover' | 'always';
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  children,
  delay = 0,
  animation = 'scale',
  className = '',
  trigger = 'inView'
}) => {
  const [ref, inView] = useInView({
    threshold: 0.3,
    triggerOnce: trigger === 'inView'
  });
  
  const [hovered, setHovered] = React.useState(false);
  
  const shouldAnimate = trigger === 'always' || 
                       (trigger === 'inView' && inView) || 
                       (trigger === 'hover' && hovered);

  const getAnimationStyles = () => {
    switch (animation) {
      case 'bounce':
        return {
          transform: shouldAnimate 
            ? 'scale(1) translateY(0px)' 
            : 'scale(0.8) translateY(20px)',
          config: config.wobbly
        };
      case 'fade':
        return {
          opacity: shouldAnimate ? 1 : 0,
          config: config.molasses
        };
      case 'scale':
        return {
          transform: shouldAnimate ? 'scale(1)' : 'scale(0)',
          config: config.gentle
        };
      case 'slide':
        return {
          transform: shouldAnimate 
            ? 'translateX(0px)' 
            : 'translateX(-100px)',
          opacity: shouldAnimate ? 1 : 0,
          config: config.default
        };
      case 'rotate':
        return {
          transform: shouldAnimate 
            ? 'rotate(0deg) scale(1)' 
            : 'rotate(180deg) scale(0.5)',
          config: config.slow
        };
      default:
        return {
          transform: shouldAnimate ? 'scale(1)' : 'scale(0.8)',
          opacity: shouldAnimate ? 1 : 0.5
        };
    }
  };

  const styles = useSpring({
    ...getAnimationStyles(),
    delay
  });

  return (
    <animated.div
      ref={ref}
      style={styles}
      className={`inline-block ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </animated.div>
  );
};

export default AnimatedIcon;