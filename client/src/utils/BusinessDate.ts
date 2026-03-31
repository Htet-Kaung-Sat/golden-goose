export const getBusinessStartDate = (
  startDate = new Date(),
  event = "today"
) => {
  const start = new Date(startDate);
  if (start.getHours() < 7) {
    start.setDate(start.getDate() - 1);
  }
  switch (event) {
    case "yesterday":
      start.setDate(start.getDate() - 1);
      break;
    case "today":
      start.setDate(start.getDate());
      break;
    case "lastWeek": {
      const dayOfWeek = start.getDay();
      const diffToMonday =
        dayOfWeek === 1 ? 7 : dayOfWeek > 1 ? dayOfWeek - 1 : 6;
      start.setDate(start.getDate() - diffToMonday - 7);
      break;
    }
    case "thisWeek": {
      const dayOfWeek = start.getDay();
      const diffToMonday =
        dayOfWeek === 1 ? 7 : dayOfWeek > 1 ? dayOfWeek - 1 : 6;
      start.setDate(start.getDate() - diffToMonday);
      break;
    }
    case "lastMonth":
      start.setDate(1);
      start.setMonth(start.getMonth() - 1);
      break;
    case "thisMonth": {
      start.setDate(1);
      start.setMonth(start.getMonth());
      break;
    }
  }
  start.setHours(7, 0, 0, 0);
  return start;
};

export const getBusinessEndDate = (endDate = new Date(), event: string) => {
  const end = new Date(endDate);
  if (end.getHours() < 7) {
    end.setDate(end.getDate() - 1);
  } else {
    end.setDate(end.getDate());
  }
  switch (event) {
    case "yesterday":
      end.setDate(end.getDate());
      break;
    case "today":
      end.setDate(end.getDate() + 1);
      break;
    case "lastWeek": {
      const dayOfWeek = end.getDay();
      const diffToMonday =
        dayOfWeek === 1 ? 7 : dayOfWeek > 1 ? dayOfWeek - 1 : 6;
      end.setDate(end.getDate() - diffToMonday);
      break;
    }
    case "thisWeek": {
      const dayOfWeek = end.getDay();
      const diffToMonday =
        dayOfWeek === 1 ? 7 : dayOfWeek > 1 ? dayOfWeek - 1 : 6;
      end.setDate(end.getDate() + 7 - diffToMonday);
      break;
    }
    case "lastMonth":
      end.setDate(1);
      end.setMonth(end.getMonth());
      break;
    case "thisMonth": {
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      break;
    }
  }
  end.setHours(6, 59, 59, 999);
  return end;
};
