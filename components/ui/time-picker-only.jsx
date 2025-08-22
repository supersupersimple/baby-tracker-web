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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
 
export function TimePickerOnly({ 
  value, 
  onChange, 
  placeholder = "Select time",
  disabled = false,
  className 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
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
        <div className="flex divide-x">
          <ScrollArea className="w-24">
            <div className="flex flex-col p-2">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  size="sm"
                  variant={date && date.getHours() === hour ? "default" : "ghost"}
                  className="w-full justify-center shrink-0"
                  onClick={() => handleTimeChange("hour", hour.toString())}
                >
                  {hour.toString().padStart(2, '0')}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="w-24">
            <div className="flex flex-col p-2">
              {minutes.map((minute) => (
                <Button
                  key={minute}
                  size="sm"
                  variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                  className="w-full justify-center shrink-0"
                  onClick={() => handleTimeChange("minute", minute.toString())}
                >
                  {minute.toString().padStart(2, '0')}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}