"use client";

import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

type AutomationDateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
};

export function AutomationDateTimePicker({
  id,
  value,
  onChange,
}: AutomationDateTimePickerProps) {
  const { locale, t } = useI18n();
  const copy = t.settings.automationWorkspace.forms;
  const minDate = new Date();
  const selectedDate = value ? new Date(value) : new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate));
  const [hour, setHour] = useState(() =>
    String(Number.isNaN(selectedDate.getTime()) ? 9 : selectedDate.getHours()).padStart(2, "0"),
  );
  const [minute, setMinute] = useState(() =>
    String(Number.isNaN(selectedDate.getTime()) ? 0 : selectedDate.getMinutes()).padStart(2, "0"),
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const displayValue = value
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : copy.dateTimePlaceholder;

  const pendingDateTime = setDateTime(selectedDate, hour, minute);
  const canConfirmSelection = !isPastDateTime(pendingDateTime, minDate);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 text-left shadow-[0_1px_2px_rgba(89,66,36,0.04)] transition hover:border-stone-300 hover:bg-stone-50",
          isOpen ? "ring-2 ring-amber-200/70" : "",
        )}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={cn("text-sm", value ? "text-foreground" : "text-muted-foreground")}>
          {displayValue}
        </span>
        <span className="flex size-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 shadow-xs">
          <CalendarDaysIcon className="size-4" />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-3 grid min-w-[560px] grid-cols-[1.35fr_0.85fr] gap-4 rounded-[24px] border border-stone-200/90 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(250,246,237,0.98))] p-4 shadow-[0_24px_80px_rgba(72,49,22,0.18)] backdrop-blur-md">
          <div className="rounded-[20px] border border-stone-200/80 bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <div className="text-sm font-semibold tracking-[0.02em] text-stone-800">
                {formatMonthLabel(visibleMonth, locale)}
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 px-1 text-center text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
              {copy.weekdayOptions.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const selected =
                  value &&
                  sameCalendarDay(new Date(value), day.date) &&
                  day.inCurrentMonth;
                const previewSelection = setDateTime(day.date, hour, minute);
                const isPast = isPastDateTime(previewSelection, minDate);
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={isPast}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-2xl text-sm transition",
                      day.inCurrentMonth
                        ? "text-stone-800 hover:bg-amber-50"
                        : "text-stone-300 hover:bg-stone-100/70",
                      isPast ? "cursor-not-allowed opacity-35 hover:bg-transparent" : "",
                      selected
                        ? "bg-[linear-gradient(180deg,#8b5e3c,#6f4727)] text-white shadow-[0_10px_24px_rgba(111,71,39,0.3)] hover:bg-[linear-gradient(180deg,#8b5e3c,#6f4727)]"
                        : "",
                    )}
                    onClick={() => {
                      if (isPast) {
                        return;
                      }
                      onChange(previewSelection);
                      setVisibleMonth(startOfMonth(day.date));
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col rounded-[20px] border border-stone-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
              {copy.timeLabel}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Input
                value={hour}
                onChange={(event) => setHour(clampTimePart(event.target.value, 23))}
                className="h-14 rounded-2xl border-stone-200 bg-stone-50/80 text-center text-2xl font-semibold shadow-none"
              />
              <div className="text-xl font-semibold text-stone-400">:</div>
              <Input
                value={minute}
                onChange={(event) => setMinute(clampTimePart(event.target.value, 59))}
                className="h-14 rounded-2xl border-stone-200 bg-stone-50/80 text-center text-2xl font-semibold shadow-none"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {TIME_QUICK_PRESETS.map((preset) => {
                const next = setDateTime(selectedDate, preset.hour, preset.minute);
                const isPast = isPastDateTime(next, minDate);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isPast}
                    className={cn(
                      "rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-stone-700 transition hover:border-amber-300 hover:bg-amber-50",
                      isPast ? "cursor-not-allowed opacity-40 hover:border-stone-200 hover:bg-stone-50/80" : "",
                    )}
                    onClick={() => {
                      if (isPast) {
                        return;
                      }
                      setHour(preset.hour);
                      setMinute(preset.minute);
                      onChange(next);
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-3 py-3 text-sm text-stone-600">
              {value
                ? new Intl.DateTimeFormat(locale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }).format(new Date(value))
                : copy.dateTimeHelper}
            </div>

            <div className="mt-auto flex items-center justify-between pt-4">
              <button
                type="button"
                className="text-sm text-stone-500 transition hover:text-stone-800"
                onClick={() => {
                  const now = roundUpToNextMinute(minDate);
                  setVisibleMonth(startOfMonth(now));
                  setHour(String(now.getHours()).padStart(2, "0"));
                  setMinute(String(now.getMinutes()).padStart(2, "0"));
                  onChange(now.toISOString().replace(/\.\d{3}Z$/, "Z"));
                }}
              >
                {copy.dateTimeToday}
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-2xl px-4 text-stone-600 hover:bg-stone-100"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                >
                  {copy.dateTimeClear}
                </Button>
                <Button
                  type="button"
                  className="rounded-2xl bg-[linear-gradient(180deg,#8b5e3c,#6f4727)] px-5 text-white shadow-[0_12px_24px_rgba(111,71,39,0.25)] hover:opacity-95"
                  disabled={!canConfirmSelection}
                  onClick={() => {
                    if (!canConfirmSelection) {
                      return;
                    }
                    onChange(pendingDateTime);
                    setIsOpen(false);
                  }}
                >
                  {copy.dateTimeConfirm}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildCalendarDays(visibleMonth: Date) {
  const monthStart = startOfMonth(visibleMonth);
  const firstGridDay = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstGridDay, index);
    return {
      key: date.toISOString(),
      date,
      inCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function clampTimePart(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) {
    return "";
  }
  return String(Math.min(Number.parseInt(digits, 10), max)).padStart(2, "0");
}

function setDateTime(baseDate: Date, hour: string, minute: string) {
  const next = new Date(baseDate);
  next.setHours(Number.parseInt(hour || "0", 10), Number.parseInt(minute || "0", 10), 0, 0);
  return next.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function isPastDateTime(candidateIso: string, minDate: Date) {
  const candidate = new Date(candidateIso);
  if (Number.isNaN(candidate.getTime())) {
    return true;
  }
  return candidate.getTime() < minDate.getTime();
}

function roundUpToNextMinute(value: Date) {
  const next = new Date(value);
  next.setSeconds(0, 0);
  if (next.getTime() < value.getTime()) {
    next.setMinutes(next.getMinutes() + 1);
  }
  return next;
}

function formatMonthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(date);
}

const TIME_QUICK_PRESETS = [
  { label: "09:00", hour: "09", minute: "00" },
  { label: "12:00", hour: "12", minute: "00" },
  { label: "18:00", hour: "18", minute: "00" },
  { label: "21:00", hour: "21", minute: "00" },
];
