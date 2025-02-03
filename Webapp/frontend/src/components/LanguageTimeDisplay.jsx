import React, { useState, useEffect } from "react";

const LanguageTimeDisplay = ({ langDataArray, formatTime, formatLanguage }) => {
  // Set the initial selected language to the first element if available.
  const [selectedLang, setSelectedLang] = useState(null);

  useEffect(() => {
    if (langDataArray && langDataArray.length > 0) {
      setSelectedLang(langDataArray[0]);
    }
  }, [langDataArray]);

  return (
    <div>
      <h2 className="font-[900] text-[5vw] sm:text-[3vw] md:text-[1.5vw] mb-5">
        Language Stats:
      </h2>
      {/* Language selector */}
      <div className="flex flex-wrap mb-5 gap-4">
        {langDataArray.map((langData) => {
          const isSelected = selectedLang && selectedLang._id === langData._id;
          return (
            <div
              key={langData._id}
              onClick={() => setSelectedLang(langData)}
              className={`px-5 py-1 border-2 border-[#212529] rounded-full text-[3.5vw] sm:text-[2vw] md:text-[1vw] ${
                isSelected ? "bg-[#E94545] text-[#f5f5f5]" : " text-[#212529]"
              } transition-all duration-100 ease-in-out`}
            >
              {formatLanguage(langData.language)}
            </div>
          );
        })}
      </div>

      {/* Display data for the selected language */}
      {selectedLang && (
        <div>
          <div>
            <strong>Daily Time:</strong>
            {formatTime(Math.floor(selectedLang.daily_time / 60000))}
          </div>
          <div>
            <strong>Weekly Time:</strong>
            {formatTime(Math.floor(selectedLang.weekly_time / 60000))}
          </div>
          <div>
            <strong>Total Time:</strong>
            {formatTime(Math.floor(selectedLang.total_time / 60000))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageTimeDisplay;
