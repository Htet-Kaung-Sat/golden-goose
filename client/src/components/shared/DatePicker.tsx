import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import dayjs from "dayjs";
import { zhCN } from "react-day-picker/locale";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Input } from "../ui/input";

interface DateTimePickerProps {
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface DatePicker {
  label?: string;
  value?: string;
  labelClass?: string;
  onChange: (value: string) => void;
}
export function DatePicker({ label, value, onChange, labelClass }: DatePicker) {
  const [open, setOpen] = React.useState(false);
  const dateValue = value ? new Date(value) : undefined;

  return (
    <div className="flex gap-3 w-full">
      {label && <Label className={labelClass}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between font-normal">
            {dateValue ? dateValue.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            locale={zhCN}
            selected={dateValue}
            onSelect={(date) => {
              if (date) {
                const formatted = date.toISOString().split("T")[0];
                onChange(formatted);
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DateTimePicker({
  label,
  dateLabel = "",
  timeLabel = "",
  className = "",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

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
                className="w-40 justify-between font-normal"
              >
                {date
                  ? dayjs(date).format("YYYY年MM月DD日")
                  : "选择日期"}
                <ChevronDownIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                locale={zhCN}
                captionLayout="dropdown"
                onSelect={(d) => {
                  setDate(d);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
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
            defaultValue="00:00:00"
            className="bg-background appearance-none 
              [&::-webkit-calendar-picker-indicator]:hidden 
              [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
