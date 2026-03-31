import "@/assets/css/report_management/commonsearchpanel.css";
import { DateTimePicker } from "@/components/shared/DateTimePicker";
import { Label } from "@radix-ui/react-dropdown-menu";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBusinessStartDate, getBusinessEndDate } from "@/utils/BusinessDate";
import { Button } from "../ui/button";

type QuickDateRange =
  | "yesterday"
  | "today"
  | "lastWeek"
  | "thisWeek"
  | "lastMonth"
  | "thisMonth"
  | null;

interface CommonSearchPanelProps {
  children?: React.ReactNode;
  onSearch: (
    startDate: string,
    endDate: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => void;
  onExport?: (startDate: string, endDate: string) => void;
  initialRange?: Exclude<QuickDateRange, null>;
  includeTime?: boolean;
  initFlg: boolean;
  commonPage?: number | undefined;
  commonPageSize?: number | undefined;
  changeAccount?: string;
  showButton?: boolean;
}

const formatForOutput = (date: Date | null, includeTime: boolean): string => {
  if (!date || isNaN(date.getTime())) return "";
  if (includeTime) {
    return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
  }
  return dayjs(date).format("YYYY-MM-DD");
};

const CommonSearchPanel: React.FC<CommonSearchPanelProps> = ({
  children,
  onSearch,
  onExport,
  initialRange = "today",
  includeTime = true,
  initFlg = false,
  commonPage = 0,
  commonPageSize = 0,
  changeAccount = "",
  showButton = true,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [activeRangeButton, setActiveRangeButton] =
    useState<QuickDateRange>(initialRange);

  const setStartOfCustomDay = useCallback((d: Date, event: string) => {
    return getBusinessStartDate(d, event);
  }, []);

  const setEndOfCustomDay = useCallback((d: Date, event: string) => {
    return getBusinessEndDate(d, event);
  }, []);

  const getInitialDates = useCallback(() => {
    const now = new Date();
    let initialStart = new Date(now);
    let initialEnd = new Date(now);
    initialStart = setStartOfCustomDay(initialStart, "today");
    initialEnd = setEndOfCustomDay(initialEnd, "today");
    return { initialStart, initialEnd };
  }, [setStartOfCustomDay, setEndOfCustomDay]);

  const [startDateObj, setStartDateObj] = useState<Date | null>(
    () => getInitialDates().initialStart,
  );
  const [endDateObj, setEndDateObj] = useState<Date | null>(
    () => getInitialDates().initialEnd,
  );

  const calculateDateRange = useCallback(
    (rangeType: Exclude<QuickDateRange, null>) => {
      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);

      switch (rangeType) {
        case "yesterday": {
          start = setStartOfCustomDay(start, "yesterday");
          end = setEndOfCustomDay(end, "yesterday");
          break;
        }
        case "today": {
          start = setStartOfCustomDay(start, "today");
          end = setEndOfCustomDay(start, "today");
          break;
        }
        case "thisWeek": {
          start = setStartOfCustomDay(start, "thisWeek");
          end = setEndOfCustomDay(end, "thisWeek");
          break;
        }
        case "lastWeek": {
          start = setStartOfCustomDay(start, "lastWeek");
          end = setEndOfCustomDay(end, "lastWeek");
          break;
        }
        case "thisMonth": {
          start = setStartOfCustomDay(start, "thisMonth");
          end = setEndOfCustomDay(end, "thisMonth");
          break;
        }
        case "lastMonth": {
          start = setStartOfCustomDay(start, "lastMonth");
          end = setEndOfCustomDay(end, "lastMonth");
          break;
        }
        default: {
          start = setStartOfCustomDay(start, "today");
          end = setEndOfCustomDay(start, "today");
          break;
        }
      }

      setStartDateObj(start);
      setEndDateObj(end);
      setActiveRangeButton(rangeType);
    },
    [setStartOfCustomDay, setEndOfCustomDay],
  );

  const handleAction = useCallback(
    (actionFn: (s: string, e: string, p: number, l: number) => void) => {
      const finalStartStr = formatForOutput(startDateObj, includeTime);
      const finalEndStr = formatForOutput(endDateObj, includeTime);
      actionFn(finalStartStr, finalEndStr, commonPage, commonPageSize);
    },
    [startDateObj, endDateObj, includeTime, commonPage, commonPageSize],
  );

  useEffect(() => {
    if (initialRange) {
      calculateDateRange(initialRange);
    }
  }, [initialRange, includeTime, calculateDateRange]);

  const didFetch = useRef(false);
  useEffect(() => {
    if (!didFetch.current) {
      if (startDateObj && endDateObj && initFlg) {
        handleAction(onSearch);
      }
      didFetch.current = true;
    }
  }, [startDateObj, endDateObj, initFlg, onSearch, handleAction]);
  useEffect(() => {
    if (startDateObj && endDateObj && changeAccount != "") {
      handleAction(onSearch);
    }
  }, [changeAccount, startDateObj, endDateObj, handleAction, onSearch]);

  const handleQuickClick = (rangeType: Exclude<QuickDateRange, null>) => {
    calculateDateRange(rangeType);
  };

  const renderQuickButton = (
    label: string,
    rangeType: Exclude<QuickDateRange, null>,
  ) => (
    <Button
      type="button"
      size="sm"
      className={`quick-btn ${activeRangeButton === rangeType ? "active" : ""}`}
      onClick={() => handleQuickClick(rangeType)}
    >
      {label}
    </Button>
  );

  return (
    <div className="common-search-panel">
      {showButton && (
        <div className="date-quick-select-row">
          {renderQuickButton(t("common_search_yesterday"), "yesterday")}
          {renderQuickButton(t("common_search_today"), "today")}
          {renderQuickButton(t("common_search_last_week"), "lastWeek")}
          {renderQuickButton(t("common_search_this_week"), "thisWeek")}
          {renderQuickButton(t("common_search_last_month"), "lastMonth")}
          {renderQuickButton(t("common_search_this_month"), "thisMonth")}
        </div>
      )}

      <div className="date-input-row flex flex-wrap items-center">
        {!showButton && (
          <Label
            className={
              isEn
                ? "mr-2 w-26 whitespace-nowrap"
                : "mr-2 w-18 whitespace-nowrap"
            }
          >
            {t("common_search_created_at")}
          </Label>
        )}
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-1 md:gap-4">
          <DateTimePicker
            value={startDateObj || undefined}
            onChange={(date) => {
              setStartDateObj(date);
              setActiveRangeButton(null);
            }}
            includeTime={includeTime}
            dateLabel={""}
            timeLabel={""}
            className=""
          />
          <span className="date-separator text-sm">~</span>
          <DateTimePicker
            value={endDateObj || undefined}
            onChange={(date) => {
              setEndDateObj(date);
              setActiveRangeButton(null);
            }}
            includeTime={includeTime}
            dateLabel={""}
            timeLabel={""}
            className=""
          />
        </div>
      </div>

      <div className="action-buttons-row">
        {children}
        <div className="flex flex-row items-center gap-2">
          <Button
            variant="info"
            className=""
            onClick={() => {
              commonPage = 1;
              handleAction(onSearch);
            }}
          >
            {t("common_search")}
          </Button>
          {onExport && (
            <Button
              variant="info"
              className=""
              onClick={() => handleAction(onExport)}
            >
              {t("common_export")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommonSearchPanel;
