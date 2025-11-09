import { useEffect, useState } from "react";

interface AnalogClockProps {
  size?: number;
}

export const AnalogClock = ({ size = 48 }: AnalogClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  return (
    <div 
      className="relative rounded-full bg-primary/10 border-2 border-primary/20"
      style={{ width: size, height: size }}
    >
      {/* Clock face markers */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-1.5 bg-primary/40 origin-bottom"
            style={{
              left: '50%',
              top: '10%',
              transform: `translateX(-50%) rotate(${i * 30}deg)`,
              transformOrigin: `center ${size / 2 - size * 0.1}px`,
            }}
          />
        ))}
      </div>

      {/* Center dot */}
      <div 
        className="absolute bg-primary rounded-full"
        style={{
          width: size * 0.08,
          height: size * 0.08,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Hour hand */}
      <div
        className="absolute bg-primary rounded-full origin-bottom transition-transform duration-1000"
        style={{
          width: size * 0.04,
          height: size * 0.25,
          left: '50%',
          top: '25%',
          transform: `translateX(-50%) rotate(${hourAngle}deg)`,
          transformOrigin: `center ${size * 0.25}px`,
        }}
      />

      {/* Minute hand */}
      <div
        className="absolute bg-primary rounded-full origin-bottom transition-transform duration-1000"
        style={{
          width: size * 0.03,
          height: size * 0.35,
          left: '50%',
          top: '15%',
          transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
          transformOrigin: `center ${size * 0.35}px`,
        }}
      />

      {/* Second hand */}
      <div
        className="absolute bg-accent rounded-full origin-bottom transition-transform duration-1000"
        style={{
          width: size * 0.02,
          height: size * 0.4,
          left: '50%',
          top: '10%',
          transform: `translateX(-50%) rotate(${secondAngle}deg)`,
          transformOrigin: `center ${size * 0.4}px`,
        }}
      />
    </div>
  );
};
