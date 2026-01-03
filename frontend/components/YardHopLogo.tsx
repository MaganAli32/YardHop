import React, { useState } from 'react';

/**
 * YardHop Logo Component
 * Professional icon mark with expanding text on hover
 * 
 * Usage:
 *   <YardHopLogo />
 *   <YardHopLogo size="sm" />
 *   <YardHopLogo size="lg" showTextAlways />
 */

interface YardHopLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTextAlways?: boolean; // Set to true to always show "YardHop" text
  className?: string;
  onClick?: () => void;
}

const YardHopLogo: React.FC<YardHopLogoProps> = ({ 
  size = 'md', 
  showTextAlways = false,
  className = '',
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Size configurations
  const sizes = {
    sm: { 
      icon: 28, 
      fontSize: 13, 
      textFontSize: 15,
      gap: 6,
    },
    md: { 
      icon: 36, 
      fontSize: 15, 
      textFontSize: 18,
      gap: 8,
    },
    lg: { 
      icon: 44, 
      fontSize: 18, 
      textFontSize: 22,
      gap: 10,
    },
  };
  
  const s = sizes[size];
  const showText = showTextAlways || isHovered;

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: s.gap }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Icon Mark */}
      <div
        className="flex items-center justify-center transition-transform duration-200 flex-shrink-0"
        style={{
          width: s.icon,
          height: s.icon,
          background: 'rgb(18,28,50)',
          borderRadius: 8,
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <span
          className="text-[#ea580c]"
          style={{
            fontFamily: "'Breul Grotesk', 'Inter', system-ui, sans-serif",
            fontSize: s.fontSize,
            fontWeight: 700,
            letterSpacing: '-0.025em',
          }}
        >
          YH
        </span>
      </div>
      
      {/* Expanding Text - always visible when showTextAlways is true, otherwise shows on hover */}
      <span
        className="text-slate-900 whitespace-nowrap transition-all duration-300"
        style={{
          fontFamily: "'Breul Grotesk', 'Inter', system-ui, sans-serif",
          fontSize: s.textFontSize,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          overflow: 'hidden',
          maxWidth: showText ? 120 : 0,
          opacity: showText ? 1 : 0,
          transition: 'max-width 0.3s ease, opacity 0.3s ease',
        }}
      >
        YardHop
      </span>
    </div>
  );
};

export default YardHopLogo;

