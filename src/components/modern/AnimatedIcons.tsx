import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  animation?: 'bounce' | 'pulse' | 'spin' | 'float' | 'scale' | 'shake';
  size?: number;
  color?: string;
  className?: string;
  onClick?: () => void;
}

const animations = {
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  spin: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear'
    }
  },
  float: {
    y: [0, -8, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  scale: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  shake: {
    x: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 2
    }
  }
};

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon: Icon,
  animation = 'pulse',
  size = 24,
  color = 'currentColor',
  className = '',
  onClick
}) => {
  return (
    <motion.div
      animate={animations[animation]}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <Icon size={size} color={color} />
    </motion.div>
  );
};

// Componentes específicos para ícones comuns
export const AnimatedHeart: React.FC<Omit<AnimatedIconProps, 'icon'>> = (props) => {
  const HeartIcon = ({ size, color }: { size: number; color: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );

  return (
    <motion.div
      animate={animations[props.animation || 'pulse']}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center ${props.onClick ? 'cursor-pointer' : ''} ${props.className || ''}`}
      onClick={props.onClick}
    >
      <HeartIcon size={props.size || 24} color={props.color || '#ef4444'} />
    </motion.div>
  );
};

export const AnimatedCheckmark: React.FC<Omit<AnimatedIconProps, 'icon'>> = (props) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`inline-flex items-center justify-center ${props.className || ''}`}
    >
      <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none">
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          fill={props.color || '#10b981'}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        />
        <motion.path
          d="m9 12 2 2 4-4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
      </svg>
    </motion.div>
  );
};

export const AnimatedLoader: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 24,
  color = '#3b82f6',
  className = ''
}) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.2"
        />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="31.416"
          animate={{ strokeDashoffset: [31.416, 0, 31.416] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  );
};

export const AnimatedBell: React.FC<Omit<AnimatedIconProps, 'icon'>> = (props) => {
  return (
    <motion.div
      animate={{
        rotate: [0, 15, -15, 15, -15, 0],
      }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: 3,
        ease: 'easeInOut'
      }}
      whileHover={{ scale: 1.1 }}
      className={`inline-flex items-center justify-center ${props.onClick ? 'cursor-pointer' : ''} ${props.className || ''}`}
      onClick={props.onClick}
    >
      <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 8A6 6 0 0 1 18 8c0 7-3 9-3 9H9s-3-2-3-9"
          stroke={props.color || 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke={props.color || 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
};