import { useState } from "react";

interface TimePickerClockProps {
  value: string; // Format: "HH:MM"
  onChange: (time: string) => void;
  size?: number;
}

export const TimePickerClock = ({ value, onChange, size = 200 }: TimePickerClockProps) => {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [hour, setHour] = useState(value ? parseInt(value.split(':')[0]) : 12);
  const [minute, setMinute] = useState(value ? parseInt(value.split(':')[1]) : 0);

  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;

    if (mode === 'hour') {
      const selectedHour = Math.round(angle / 30) % 12 || 12;
      setHour(selectedHour);
      onChange(`${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      setMode('minute');
    } else {
      const selectedMinute = Math.round(angle / 6) % 60;
      setMinute(selectedMinute);
      onChange(`${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
    }
  };

  const hourAngle = (hour % 12) * 30 - 90;
  const minuteAngle = minute * 6 - 90;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setMode('hour')}
          className={`px-4 py-2 rounded-lg font-semibold text-lg transition-colors ${
            mode === 'hour' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {hour.toString().padStart(2, '0')}
        </button>
        <span className="text-2xl font-bold">:</span>
        <button
          type="button"
          onClick={() => setMode('minute')}
          className={`px-4 py-2 rounded-lg font-semibold text-lg transition-colors ${
            mode === 'minute' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {minute.toString().padStart(2, '0')}
        </button>
      </div>

      <div 
        className="relative rounded-full bg-primary/10 border-2 border-primary/20 cursor-pointer select-none"
        style={{ width: size, height: size }}
        onClick={handleClockClick}
      >
        {/* Numbers */}
        {mode === 'hour' ? (
          [...Array(12)].map((_, i) => {
            const num = i === 0 ? 12 : i;
            const angle = i * 30 - 90;
            const radius = size * 0.35;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center w-8 h-8 font-semibold text-sm"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                {num}
              </div>
            );
          })
        ) : (
          [...Array(12)].map((_, i) => {
            const num = i * 5;
            const angle = i * 30 - 90;
            const radius = size * 0.35;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center w-8 h-8 font-semibold text-sm"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                {num.toString().padStart(2, '0')}
              </div>
            );
          })
        )}

        {/* Center dot */}
        <div 
          className="absolute bg-primary rounded-full z-10"
          style={{
            width: size * 0.06,
            height: size * 0.06,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Hand */}
        <div
          className="absolute bg-primary rounded-full origin-bottom transition-transform duration-200 z-0"
          style={{
            width: size * 0.02,
            height: size * 0.3,
            left: '50%',
            top: '20%',
            transform: `translateX(-50%) rotate(${mode === 'hour' ? hourAngle + 90 : minuteAngle + 90}deg)`,
            transformOrigin: `center ${size * 0.3}px`,
          }}
        />

        {/* Selected indicator */}
        <div
          className="absolute bg-primary rounded-full z-10 transition-all duration-200"
          style={{
            width: size * 0.1,
            height: size * 0.1,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${
              Math.cos((mode === 'hour' ? hourAngle : minuteAngle) * Math.PI / 180) * size * 0.3
            }px, ${
              Math.sin((mode === 'hour' ? hourAngle : minuteAngle) * Math.PI / 180) * size * 0.3
            }px)`,
          }}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {mode === 'hour' ? 'Select hour' : 'Select minute'}
      </p>
    </div>
  );
};
