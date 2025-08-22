"use client";
 
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
 
export function DatePickerOnly({ 
  value, 
  onChange, 
  placeholder = "Select date",
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
 
  const handleDateSelect = (selectedDate) => {
    if (selectedDate) {
      // If there's an existing date with time, preserve the time
      const newDate = new Date(selectedDate);
      if (date) {
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
        newDate.setSeconds(date.getSeconds());
      }
      onChange?.(newDate);
      setIsOpen(false);
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
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "MM/dd/yyyy")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}