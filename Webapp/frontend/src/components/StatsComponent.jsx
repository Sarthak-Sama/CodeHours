import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

export default function StatsComponent({
  dailyData,
  langDataArray,
  formatTime,
  formatLanguage,
}) {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedTimeSpan, setSelectedTimeSpan] = useState("week");

  const formatTimeForYAxis = (minutes) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hrs = Math.floor(minutes / 60);
    return `${hrs}hr`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { fullLabel, value } = payload[0].payload;
      const displayLabel =
        (selectedTimeSpan === "month" || selectedTimeSpan === "total") &&
        fullLabel
          ? fullLabel
          : label;
      return (
        <div
          className="custom-tooltip"
          style={{
            backgroundColor: "#212529",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <p className="label" style={{ color: "#fff" }}>
            {displayLabel}
          </p>
          <p className="intro" style={{ color: "#fff" }}>
            Time: {formatTime(Math.floor(value))}
          </p>
        </div>
      );
    }
    return null;
  };

  const filteredData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return { week: [], month: [], total: [] };
    }

    // Helper to shift a date by one day (for backend records only)
    const shiftDateByOne = (dateInput) => {
      const date = new Date(dateInput);
      date.setUTCDate(date.getUTCDate() + 1);
      return date;
    };

    // Sort the records using the shifted dates.
    const sortedData = [...dailyData].sort(
      (a, b) => shiftDateByOne(a.date) - shiftDateByOne(b.date)
    );

    const now = new Date();

    // Check if two dates are the same in UTC.
    const isSameDayUTC = (d1, d2) =>
      d1.getUTCFullYear() === d2.getUTCFullYear() &&
      d1.getUTCMonth() === d2.getUTCMonth() &&
      d1.getUTCDate() === d2.getUTCDate();

    // --- WEEK DATA: Last 7 days based on current "now" (unchanged) ---
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - (6 - i)
        )
      );
    });
    const weekData = weekDates.map((dateObj) => {
      // Shift record dates for comparison only.
      const found = sortedData.find((record) => {
        const recordDate = shiftDateByOne(record.date);
        return isSameDayUTC(recordDate, dateObj);
      });
      return {
        name: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        value: found ? found.totalTime / 60000 : 0,
      };
    });

    // --- MONTH DATA: Last 30 days based on current "now" (unchanged) ---
    const monthDates = Array.from({ length: 30 }, (_, i) => {
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - (29 - i)
        )
      );
    });
    const monthData = monthDates.map((dateObj) => {
      const found = sortedData.find((record) => {
        const recordDate = shiftDateByOne(record.date);
        return isSameDayUTC(recordDate, dateObj);
      });
      return {
        name: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullLabel: dateObj.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        value: found ? found.totalTime / 60000 : 0,
      };
    });

    // --- TOTAL DATA: Group records by month (using shifted record dates) ---
    const totalDataMap = {};
    sortedData.forEach((record) => {
      const dateObj = shiftDateByOne(record.date);
      const key = `${dateObj.getUTCFullYear()}-${dateObj.getUTCMonth()}`;
      if (!totalDataMap[key]) {
        totalDataMap[key] = { totalTime: 0, date: dateObj };
      }
      totalDataMap[key].totalTime += record.totalTime;
    });
    const totalData = Object.entries(totalDataMap).map(
      ([key, { totalTime, date }]) => ({
        name: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        fullLabel: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        value: totalTime / 60000,
      })
    );

    return { week: weekData, month: monthData, total: totalData };
  }, [dailyData]);

  const timeSpanData = filteredData[selectedTimeSpan] || [];

  // Compute max value for Y-axis.
  const maxTimeValue = useMemo(() => {
    if (timeSpanData.length === 0) return 0;
    return Math.max(...timeSpanData.map((d) => d.value));
  }, [timeSpanData]);

  // Dynamic Y-axis upper bound.
  const yAxisDomain = useMemo(() => {
    if (maxTimeValue < 60) {
      let upper = Math.ceil((maxTimeValue * 1.2) / 5) * 5;
      if (upper < 25) {
        upper = 25;
      }
      return [0, upper];
    } else {
      const upper = Math.ceil((maxTimeValue * 1.2) / 60) * 60;
      return [0, upper];
    }
  }, [maxTimeValue]);

  // Radar Chart Data: Only display top 6 languages (if there are more than 6)
  const normalizedRadarData = useMemo(() => {
    if (!langDataArray || langDataArray.length === 0) {
      return [];
    }
    // If more than 6 languages, sort and slice top 6.
    let topLangData = langDataArray;
    if (langDataArray.length > 6) {
      topLangData = [...langDataArray]
        .sort((a, b) => b.total_time - a.total_time)
        .slice(0, 6);
    }
    // Compute max total time among the top languages.
    const maxTotalTime = Math.max(
      ...topLangData.map((item) => item.total_time)
    );
    return topLangData.map((item) => ({
      language: formatLanguage(item.language),
      proficiency: Math.round((item.total_time / maxTotalTime) * 100),
    }));
  }, [langDataArray, formatLanguage]);

  return (
    <div className="w-full mx-auto p-4">
      {/* Navbar with Slider */}
      <div className="relative md:ml-[20%] flex items-center bg-[#212529] rounded-xl p-1 w-full md:w-[70%]">
        <motion.div
          className="absolute left-[26%] -translate-x-1/2 w-[40%] h-[65%] bg-[#E94545] rounded-md sm:rounded-lg md:rounded-xl shadow"
          initial={{ x: "0%" }}
          animate={{ x: activeTab === "daily" ? "0%" : "120%" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <button
          className={`z-10 flex-1 text-center p-2 font-medium transition-colors ${
            activeTab === "daily" ? "text-[#f5f5f5]" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("daily")}
        >
          Daily Stats
        </button>
        <button
          className={`z-10 flex-1 text-center p-2 font-medium transition-colors ${
            activeTab === "language" ? "text-[#f5f5f5]" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("language")}
        >
          Language Stats
        </button>
      </div>

      {/* Charts */}
      <div className="mt-6">
        {activeTab === "daily" ? (
          <>
            <div className="flex justify-end mb-4">
              <select
                value={selectedTimeSpan}
                onChange={(e) => setSelectedTimeSpan(e.target.value)}
                className="bg-[#212529] text-white p-2 rounded-lg text-sm focus:outline-none"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="total">Total</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSpanData}>
                <XAxis dataKey="name" />
                <YAxis
                  domain={yAxisDomain}
                  tickFormatter={(value) => formatTimeForYAxis(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#E94545"
                  strokeWidth={3}
                  dot={{ fill: "#E94545" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={normalizedRadarData} outerRadius="70%">
              <PolarGrid />
              <PolarAngleAxis dataKey="language" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Proficiency"
                dataKey="proficiency"
                stroke="#E94545"
                fill="#E94545"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
