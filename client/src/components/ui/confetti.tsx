import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
  duration?: number;
  colors?: string[];
  className?: string;
}

export function Confetti({ 
  active, 
  particleCount = 50, 
  duration = 3000,
  colors = [
    "hsl(250 95% 63%)",
    "hsl(280 85% 65%)",
    "hsl(300 85% 70%)",
    "hsl(40 96% 64%)",
    "hsl(190 90% 50%)",
    "hsl(340 82% 62%)"
  ],
  className 
}: ConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (active && !isAnimating) {
      const newParticles: ConfettiParticle[] = [];
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: -10,
          rotation: Math.random() * 360,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          delay: Math.random() * 500
        });
      }
      
      setParticles(newParticles);
      setIsAnimating(true);
      
      setTimeout(() => {
        setIsAnimating(false);
        setParticles([]);
      }, duration);
    }
  }, [active, particleCount, duration, colors, isAnimating]);

  if (!isAnimating) return null;

  return (
    <div className={cn(
      "fixed inset-0 pointer-events-none z-50 overflow-hidden",
      className
    )}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${duration}ms`
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              boxShadow: `0 0 ${particle.size}px ${particle.color}40`
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Particle Background Component
interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

export function ParticleBackground({ 
  particleCount = 30,
  className 
}: ParticleBackgroundProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const newParticles: ConfettiParticle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: 0,
        color: "hsl(250 95% 63%)",
        size: Math.random() * 3 + 1,
        delay: Math.random() * 20000
      });
    }
    
    setParticles(newParticles);
  }, [particleCount]);

  return (
    <div className={cn(
      "fixed inset-0 pointer-events-none overflow-hidden opacity-20",
      className
    )}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-particle-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: "20s"
          }}
        >
          <div
            className="rounded-full animate-glow-pulse"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}80`
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Success Animation Component
interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

export function SuccessAnimation({ show, onComplete }: SuccessAnimationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-bounceIn">
        <svg
          className="w-32 h-32"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="hsl(142 71% 45%)"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-checkmark"
            strokeDasharray="283"
            strokeDashoffset="283"
            style={{
              animation: "checkmark 0.6s ease-out forwards"
            }}
          />
          <path
            d="M30 50L45 65L70 35"
            stroke="hsl(142 71% 45%)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-checkmark"
            strokeDasharray="100"
            strokeDashoffset="100"
            style={{
              animation: "checkmark 0.8s ease-out 0.3s forwards"
            }}
          />
        </svg>
      </div>
    </div>
  );
}