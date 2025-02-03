import React, { useState } from "react";

function DailyActivityGrid({ dailyData, formatTime }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(-1);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364); // Show past ~1 year of days

  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return date;
  });

  const startDay = startDate.getDay();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedDays = Array.from(
    { length: 7 },
    (_, i) => daysOfWeek[(startDay + i) % 7]
  );

  const dayLabels = orderedDays.map((day, index) =>
    index % 2 === 0 ? day : ""
  );

  const months = [];
  let currentMonth = -1;
  let currentYear = -1;

  days.forEach((date, index) => {
    const month = date.getMonth();
    const year = date.getFullYear();

    if (month !== currentMonth || year !== currentYear) {
      const firstDayOfMonth = new Date(year, month, 1);
      const weekOffset = Math.floor(
        (firstDayOfMonth.getDay() - startDay + 7) % 7
      );
      const col = Math.floor((index + weekOffset) / 7);

      months.push({
        name: date.toLocaleString("default", { month: "short" }),
        year: year,
        startCol: col,
        span: 1,
      });

      if (months.length > 1) {
        const prevMonth = months[months.length - 2];
        prevMonth.span = col - prevMonth.startCol;
      }

      currentMonth = month;
      currentYear = year;
    }
  });

  if (months.length > 0) {
    const lastMonth = months[months.length - 1];
    lastMonth.span = Math.ceil(days.length / 7) - lastMonth.startCol;
  }
  const getColorIntensity = (time) => {
    // time is in milliseconds
    if (time === 0) return "bg-gray-300";

    // Convert time to hours
    const hours = time / 3600000;

    if (hours < 1) {
      return "bg-[rgba(233,69,69,0.2)]";
    } else if (hours < 3) {
      return "bg-[rgba(233,69,69,0.4)]";
    } else if (hours < 5) {
      return "bg-[rgba(233,69,69,0.6)]";
    } else if (hours < 8) {
      return "bg-[rgba(233,69,69,0.8)]";
    } else {
      return "bg-[rgba(233,69,69,1)]";
    }
  };

  return (
    <div className="w-fit h-fit relative group">
      <div className="grid grid-flow-col auto-cols-[minmax(14px,1fr)] gap-[4px] mb-1 ml-[30px]">
        {months.map((month, i) => {
          const showYear =
            month.year !== months[i - 1]?.year || month.name === "Jan";
          return (
            <div
              key={`${month.name}-${month.year}`}
              className="text-xs text-gray-500 text-center"
              style={{
                gridColumn: `${month.startCol + 1} / span ${month.span}`,
              }}
            >
              {showYear
                ? `${month.name} '${month.year.toString().slice(-2)}`
                : month.name}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div className="grid grid-rows-7 gap-[4px] justify-items-end">
          {dayLabels.map((day, i) => (
            <div
              key={i}
              className="text-xs text-gray-500 h-3 row-start-[1]"
              style={{ gridRowStart: i + 1 }}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-rows-7 grid-flow-col auto-cols-[minmax(14px,1fr)] gap-[4px]">
          {days.map((date, i) => {
            const formattedDate = date.toISOString().split("T")[0];
            const activity = dailyData.find((entry) =>
              entry.date.startsWith(formattedDate)
            );
            const totalTime = activity ? activity.totalTime : 0;
            const colorClass = getColorIntensity(totalTime);

            return (
              <div
                key={i}
                className={`relative w-[1vw] aspect-square rounded-xs transition-colors ${colorClass}`}
                onMouseEnter={() => {
                  setHoveredDate(date);
                  setHoverIndex(i);
                }}
                onMouseLeave={() => {
                  setHoveredDate(null);
                  setHoverIndex(-1);
                }}
              >
                {hoverIndex === i && (
                  <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1">
                    <div className="bg-black text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                      {date.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      <br />
                      {totalTime
                        ? `${formatTime(Math.floor(totalTime / 60000))} coded`
                        : "No activity"}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <span className="mr-2">Learn how we count contributions</span>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-300"></div>
            <span>Less</span>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <div className="w-3 h-3 bg-[#e94545]"></div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyActivityGrid;
