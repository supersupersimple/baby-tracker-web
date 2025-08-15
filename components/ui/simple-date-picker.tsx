"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimpleDatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (date: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SimpleDatePicker({
  value = "",
  onChange,
  disabled = false,
  className
}: SimpleDatePickerProps) {
  const [year, setYear] = React.useState(() => {
    if (value) {
      const [y] = value.split("-");
      return parseInt(y) || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  const [month, setMonth] = React.useState(() => {
    if (value) {
      const [, m] = value.split("-");
      return parseInt(m) || new Date().getMonth() + 1;
    }
    return new Date().getMonth() + 1;
  });

  const [day, setDay] = React.useState(() => {
    if (value) {
      const [, , d] = value.split("-");
      return parseInt(d) || new Date().getDate();
    }
    return new Date().getDate();
  });

  React.useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      setYear(parseInt(y) || new Date().getFullYear());
      setMonth(parseInt(m) || new Date().getMonth() + 1);
      setDay(parseInt(d) || new Date().getDate());
    }
  }, [value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const dateString = `${newYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange?.(dateString);
  };

  const handleMonthChange = (newMonth: number) => {
    const daysInMonth = getDaysInMonth(year, newMonth);
    const adjustedDay = day > daysInMonth ? daysInMonth : day;
    setMonth(newMonth);
    setDay(adjustedDay);
    const dateString = `${year}-${newMonth.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
    onChange?.(dateString);
  };

  const handleDayChange = (newDay: number) => {
    setDay(newDay);
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
    onChange?.(dateString);
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const maxDaysInMonth = getDaysInMonth(year, month);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Year picker */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleYearChange(year + 1)}
          className="h-6 w-12 p-0"
        >
          ▲
        </Button>
        <div className="px-2 py-1 text-center min-w-[3rem] font-mono text-sm">
          {year}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleYearChange(year - 1)}
          className="h-6 w-12 p-0"
        >
          ▼
        </Button>
      </div>

      {/* Month picker */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleMonthChange(month === 12 ? 1 : month + 1)}
          className="h-6 w-12 p-0"
        >
          ▲
        </Button>
        <div className="px-2 py-1 text-center min-w-[3rem] text-sm">
          {monthNames[month - 1]}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleMonthChange(month === 1 ? 12 : month - 1)}
          className="h-6 w-12 p-0"
        >
          ▼
        </Button>
      </div>

      {/* Day picker */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleDayChange(day === maxDaysInMonth ? 1 : day + 1)}
          className="h-6 w-10 p-0"
        >
          ▲
        </Button>
        <div className="px-2 py-1 text-center min-w-[2rem] font-mono text-sm">
          {day.toString().padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleDayChange(day === 1 ? maxDaysInMonth : day - 1)}
          className="h-6 w-10 p-0"
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
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();
            setYear(todayYear);
            setMonth(todayMonth);
            setDay(todayDay);
            onChange?.(`${todayYear}-${todayMonth.toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}`);
          }}
          className="h-6 text-xs"
        >
          Today
        </Button>
      </div>
    </div>
  );
}