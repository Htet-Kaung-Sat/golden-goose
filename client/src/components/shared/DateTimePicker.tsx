import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import dayjs from "dayjs";
import { enUS, zhCN } from "react-day-picker/locale";
import { ChevronDownIcon, Clock, XCircle } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../ui/input";

interface DateTimePickerProps {
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  className?: string;
  value?: Date;
  onChange?: (date: Date | null) => void;
  disableDate?: (date: Date) => boolean;
  includeTime?: boolean;
}

export function DateTimePicker({
  label,
  dateLabel = "",
  timeLabel = "",
  className = "",
  value,
  onChange,
  disableDate,
  includeTime = true,
}: DateTimePickerProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value
  );
  const currentYear = new Date().getFullYear();
  const START_YEAR = currentYear - 7;
  const END_YEAR = currentYear + 7;
  const [month, setMonth] = React.useState<Date | undefined>(
    value || new Date()
  );

  React.useEffect(() => {
    if (value && !isNaN(value.getTime())) {
      setSelectedDate(value);
      setMonth(value);
    } else {
      setSelectedDate(undefined);
    }
  }, [value]);

  const handleDateSelect = (newDate?: Date) => {
    if (!newDate) {
      setSelectedDate(undefined);
      onChange?.(null);
      return;
    }
    const dateWithPreservedTime =
      value && !isNaN(value.getTime()) ? new Date(value) : new Date();
    dateWithPreservedTime.setFullYear(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate()
    );
    if (!value) {
      dateWithPreservedTime.setHours(7, 0, 0, 0);
    }
    setSelectedDate(dateWithPreservedTime);
    onChange?.(dateWithPreservedTime);
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return;
    const [h = "0", m = "0", s = "0"] = e.target.value.split(":");
    const hours = Number(h);
    const minutes = Number(m);
    const seconds = Number(s);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
      return;
    }
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, seconds, 0);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleCurrent = () => {
    const now = new Date();
    setSelectedDate(now);
    if (onChange) onChange(now);
    setMonth(now);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    if (onChange) onChange(null);
    setOpen(false);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <Label className="px-1 text-sm font-semibold">{label}</Label>}

      <div className="flex gap-1">
        <div className="flex flex-col gap-3">
          {dateLabel && (
            <Label htmlFor="date-picker" className="px-1">
              {dateLabel}
            </Label>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker"
                className="justify-between font-normal flex items-center"
              >
                <span className="truncate">
                  {selectedDate && !isNaN(selectedDate.getTime())
                    ? dayjs(selectedDate).format(t("dt_format"))
                    : ""}
                </span>
                <ChevronDownIcon className="w-4 h-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                month={month}
                onMonthChange={setMonth}
                locale={isEn ? enUS : zhCN}
                captionLayout="dropdown"
                onSelect={(date) => {
                  handleDateSelect(date);
                  if (date) {
                    setMonth(date);
                  }
                }}
                disabled={disableDate}
                fromYear={START_YEAR}
                toYear={END_YEAR}
              />
              <div className="flex items-center justify-between p-2 border-t bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <XCircle className="mr-1 w-3 h-3" />
                  {t("dt_clear")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCurrent}
                  className="text-xs"
                >
                  <Clock className="mr-1 w-3 h-3" />
                  {t("dt_current")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {includeTime && (
          <div className="flex flex-col gap-1">
            {timeLabel && (
              <Label htmlFor="time-picker" className="px-1">
                {timeLabel}
              </Label>
            )}
            <Input
              type="time"
              id="time-picker"
              step="1"
              value={
                selectedDate && !isNaN(selectedDate.getTime())
                  ? dayjs(selectedDate).format("HH:mm:ss")
                  : ""
              }
              onChange={handleTimeChange}
              className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
