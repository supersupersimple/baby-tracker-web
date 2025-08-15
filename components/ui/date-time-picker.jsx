"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function DateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date and time",
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

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0, 1, 2... 22, 23
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0, 1, 2... 58, 59

  const handleDateSelect = (selectedDate) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (date) {
        // Keep existing time when changing date
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
      }
      onChange?.(newDate);
    }
  };

  const handleTimeChange = (type, value) => {
    const currentDate = date || new Date();
    const newDate = new Date(currentDate);
    
    if (type === "hour") {
      newDate.setHours(value);
    } else if (type === "minute") {
      newDate.setMinutes(value);
    }
    
    onChange?.(newDate);
  };

  const handleNowClick = () => {
    const now = new Date();
    onChange?.(now);
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
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "MMM d, yyyy h:mm a")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="border-r"
          />
          <div className="flex h-[300px] divide-x">
            {/* Hours */}
            <ScrollArea className="w-20" ref={hourScrollRef}>
              <div className="flex flex-col p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    size="sm"
                    variant={date && date.getHours() === hour ? "default" : "ghost"}
                    className="w-full mb-1 text-sm h-8"
                    data-hour={hour}
                    onClick={() => handleTimeChange("hour", hour)}
                  >
                    {hour.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            
            {/* Minutes */}
            <ScrollArea className="w-20" ref={minuteScrollRef}>
              <div className="flex flex-col p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    size="sm"
                    variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                    className="w-full mb-1 text-sm h-8"
                    data-minute={minute}
                    onClick={() => handleTimeChange("minute", minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="border-t p-2 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNowClick}
          >
            Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange?.(undefined);
              setIsOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Separate component for just time selection
export function TimePicker({ 
  value, 
  onChange, 
  placeholder = "Select time",
  disabled = false,
  className 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Parse time string (HH:mm) to hours and minutes
  const { hours: currentHour, minutes: currentMinute } = React.useMemo(() => {
    if (!value || typeof value !== 'string') {
      return { hours: undefined, minutes: undefined };
    }
    const [h, m] = value.split(':').map(Number);
    return { hours: h, minutes: m };
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0, 1, 2... 22, 23
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0, 1, 2... 58, 59

  const handleTimeChange = (type, timeValue) => {
    const hour = type === "hour" ? timeValue : (currentHour ?? 0);
    const minute = type === "minute" ? timeValue : (currentMinute ?? 0);
    
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
  };

  const handleNowClick = () => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    onChange?.(timeString);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            <span className="font-mono">{value}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
          {/* Hours */}
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  size="icon"
                  variant={currentHour === hour ? "default" : "ghost"}
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange("hour", hour)}
                >
                  {hour.toString().padStart(2, '0')}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>
          
          {/* Minutes */}
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {minutes.map((minute) => (
                <Button
                  key={minute}
                  size="icon"
                  variant={currentMinute === minute ? "default" : "ghost"}
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange("minute", minute)}
                >
                  {minute.toString().padStart(2, '0')}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>
        </div>
        
        {/* Quick actions */}
        <div className="border-t p-2 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNowClick}
          >
            Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange?.(undefined);
              setIsOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}