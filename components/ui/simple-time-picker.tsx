"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SimpleTimePickerProps {
  value?: string; // Format: "HH:mm"
  onChange?: (time: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SimpleTimePicker({
  value = "",
  onChange,
  disabled = false,
  className
}: SimpleTimePickerProps) {
  const [hour, setHour] = React.useState(() => {
    if (value) {
      const [h] = value.split(":");
      return parseInt(h) || 0;
    }
    return new Date().getHours();
  });

  const [minute, setMinute] = React.useState(() => {
    if (value) {
      const [, m] = value.split(":");
      return parseInt(m) || 0;
    }
    return new Date().getMinutes();
  });

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHour(parseInt(h) || 0);
      setMinute(parseInt(m) || 0);
    }
  }, [value]);

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    const timeString = `${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    const timeString = `${hour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Hour picker */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleHourChange((hour + 1) % 24)}
          className="h-6 w-8 p-0"
        >
          ▲
        </Button>
        <div className="px-2 py-1 text-center min-w-[2rem] font-mono">
          {hour.toString().padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleHourChange(hour === 0 ? 23 : hour - 1)}
          className="h-6 w-8 p-0"
        >
          ▼
        </Button>
      </div>
      
      <div className="font-mono text-lg">:</div>
      
      {/* Minute picker */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleMinuteChange((minute + 1) % 60)}
          className="h-6 w-8 p-0"
        >
          ▲
        </Button>
        <div className="px-2 py-1 text-center min-w-[2rem] font-mono">
          {minute.toString().padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleMinuteChange(minute === 0 ? 59 : minute - 1)}
          className="h-6 w-8 p-0"
        >
          ▼
        </Button>
      </div>

      {/* Quick set buttons */}
      <div className="flex flex-col space-y-1 ml-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            setHour(currentHour);
            setMinute(currentMinute);
            onChange?.(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
          }}
          className="h-6 text-xs"
        >
          Now
        </Button>
      </div>
    </div>
  );
}