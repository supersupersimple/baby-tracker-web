"use client";
 
import * as React from "react";
import { Clock as ClockIcon } from "lucide-react"
import { format } from "date-fns";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
 
export function TimePickerOnly({ 
  value, 
  onChange, 
  placeholder = "Select time",
  disabled = false,
  className 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hourScrollRef = React.useRef(null);
  const minuteScrollRef = React.useRef(null);
  
  // Parse value prop to Date object
  const date = React.useMemo(() => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value instanceof Date ? value : undefined;
  }, [value]);
 
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0, 1, 2, 3, ..., 58, 59
 
  const handleTimeChange = (type, value) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(parseInt(value));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      }
      onChange?.(newDate);
    } else {
      // If no date exists, create new date with today's date
      const newDate = new Date();
      if (type === "hour") {
        newDate.setHours(parseInt(value));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      }
      onChange?.(newDate);
    }
  };

  // Scroll to selected values when popover opens
  React.useEffect(() => {
    if (isOpen && date) {
      setTimeout(() => {
        // Scroll to selected hour
        if (hourScrollRef.current) {
          const hourButton = hourScrollRef.current.querySelector(`[data-hour="${date.getHours()}"]`);
          if (hourButton) {
            hourButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        
        // Scroll to selected minute
        if (minuteScrollRef.current) {
          const minuteButton = minuteScrollRef.current.querySelector(`[data-minute="${date.getMinutes()}"]`);
          if (minuteButton) {
            minuteButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [isOpen, date]);
 
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Hours Column */}
          <div className="w-20 h-64 border-r">
            <div className="text-xs font-medium text-center py-2 border-b bg-gray-50">Hour</div>
            <div 
              ref={hourScrollRef}
              className="h-56 overflow-y-auto scrollbar-thin"
              style={{ 
                overflowY: 'scroll',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex flex-col">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    size="sm"
                    variant={date && date.getHours() === hour ? "default" : "ghost"}
                    className="w-full justify-center rounded-none border-0 h-8 text-sm font-mono"
                    data-hour={hour}
                    onClick={() => handleTimeChange("hour", hour.toString())}
                  >
                    {hour.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Minutes Column */}
          <div className="w-20 h-64">
            <div className="text-xs font-medium text-center py-2 border-b bg-gray-50">Min</div>
            <div 
              ref={minuteScrollRef}
              className="h-56 overflow-y-auto scrollbar-thin"
              style={{ 
                overflowY: 'scroll',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex flex-col">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    size="sm"
                    variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                    className="w-full justify-center rounded-none border-0 h-8 text-sm font-mono"
                    data-minute={minute}
                    onClick={() => handleTimeChange("minute", minute.toString())}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="border-t p-2 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              onChange?.(now);
            }}
          >
            Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange?.(undefined);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}