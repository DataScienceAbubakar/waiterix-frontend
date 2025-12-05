import { useEffect, useRef, useState } from "react";

interface AnimatedGaugeProps {
  value: number;
  maxValue?: number;
  label: string;
  suffix?: string;
  color?: string;
}

export function AnimatedGauge({ 
  value, 
  maxValue = 100, 
  label, 
  suffix = "%",
  color = "hsl(var(--primary))"
}: AnimatedGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const gaugeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (gaugeRef.current) {
      observer.observe(gaugeRef.current);
    }

    return () => {
      if (gaugeRef.current) {
        observer.unobserve(gaugeRef.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setDisplayValue(Math.min(increment * currentStep, value));
      } else {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  const percentage = (displayValue / maxValue) * 100;
  const rotation = (percentage / 100) * 180; // Semi-circle is 180 degrees

  return (
    <div ref={gaugeRef} className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-24">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 200 100">
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Animated arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(rotation / 180) * 251.2} 251.2`}
            className="transition-all duration-300 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        
        {/* Center value display */}
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <div className="text-4xl font-bold gradient-text">
              {Math.round(displayValue)}{suffix}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
