import { useEffect, useState } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

const CircularProgress = ({ percentage, size = 160, strokeWidth = 6, animate = true }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedPct, setAnimatedPct] = useState(animate ? 0 : percentage);

  useEffect(() => {
    if (!animate) {
      setAnimatedPct(percentage);
      return;
    }
    setAnimatedPct(0);
    const timeout = setTimeout(() => setAnimatedPct(percentage), 80);
    return () => clearTimeout(timeout);
  }, [percentage, animate]);

  const offset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="relative">
      {/* Soft glow behind the ring */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, hsl(38 55% 55% / 0.4) 0%, transparent 70%)`,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 relative z-10"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(350 40% 88%)"
          strokeWidth={strokeWidth}
        />
        {/* Soft Gold gradient */}
        <defs>
          <linearGradient id="gold-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(36 50% 42%)" />
            <stop offset="35%" stopColor="hsl(38 55% 62%)" />
            <stop offset="65%" stopColor="hsl(40 50% 75%)" />
            <stop offset="100%" stopColor="hsl(36 50% 42%)" />
          </linearGradient>
          <filter id="gold-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gold-ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#gold-glow)"
          style={{
            transition: animate
              ? 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'stroke-dashoffset 0.4s ease-out',
          }}
        />
        {/* Current position dot */}
        {animatedPct > 0 && (
          <circle
            cx={size / 2 + radius * Math.cos((2 * Math.PI * animatedPct) / 100 - Math.PI / 2)}
            cy={size / 2 + radius * Math.sin((2 * Math.PI * animatedPct) / 100 - Math.PI / 2)}
            r={strokeWidth * 1.1}
            fill="hsl(38 55% 55%)"
            className="animate-pulse"
            style={{
              transition: animate
                ? 'cx 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), cy 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'cx 0.4s ease-out, cy 0.4s ease-out',
              filter: 'drop-shadow(0 0 4px hsl(38 55% 50% / 0.6))',
            }}
          />
        )}
      </svg>
    </div>
  );
};

export default CircularProgress;
