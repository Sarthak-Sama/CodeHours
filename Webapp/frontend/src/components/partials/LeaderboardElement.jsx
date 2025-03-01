import React, { useContext } from "react";
import { UserContext } from "../../context/Context";
import { Link } from "react-router-dom";

function LeaderboardElement({ data, formatTime }) {
  const { formatLanguage } = useContext(UserContext);
  const getCurrentISTDateString = () => {
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 3600 * 1000);
    const year = nowIST.getFullYear();
    const month = String(nowIST.getMonth() + 1).padStart(2, "0");
    const day = String(nowIST.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Sort languages by time and take top 6
  const languagesArray = Object.entries(data.language_time).map(
    ([language, langData]) => ({ language, ...langData })
  );

  const filteredLanguages = languagesArray.filter(
    (language) =>
      language.daily_time > 5 * 60 * 1000 &&
      language.daily_ist_date === getCurrentISTDateString()
  );

  const topLanguages = filteredLanguages
    .sort((a, b) => b.total_time - a.total_time)
    .slice(0, 6);

  return (
    <Link
      to={`/profile/${data.userId}`}
      className="w-[95%] sm:w-[90%] h-[3.5rem] rounded-[1.75vw] sm:rounded-[1.25vw] md:rounded-[1vw] lg:rounded-[0.75vw] border-2 my-2 py-3 px-5 lg:px-10 flex items-center justify-between bg-[#f5f5f5] hover:bg-[#E3E3E3] transition-all duration-300 ease-in-out"
    >
      <div className="flex items-center gap-5 w-fit md:w-[33%] lg:w-[25%]">
        <div className="w-[2.4rem] aspect-square rounded">
          <img
            src={data.pfpUrl}
            className="w-full h-full rounded-full"
            alt="profile"
          />
        </div>
        <div className="">{data.username}</div>
      </div>

      <div className="w-fit md:w-[20%] lg:w-[10%] text-right md:text-center lg:text-left">
        {formatTime(Math.floor(data.daily_time / (60 * 1000)))}
      </div>

      <div
        id="languages"
        className="md:flex hidden gap-1 items-center justify-center shrink-0 w-[55%] overflow-hidden"
      >
        {topLanguages.map((elem) => (
          <span
            key={elem.language}
            className="rounded-full px-2 py-1 bg-[#E94545] border border-black text-white text-xs whitespace-nowrap truncate max-w-[120px]"
          >
            {`${formatLanguage(elem.language)}: ${Math.floor(
              elem.daily_time / (60 * 1000)
            )}m`}
          </span>
        ))}
      </div>

      <div className="hidden lg:block text-center w-[10%] translate-x-8">
        Level {data.level.current}
      </div>
    </Link>
  );
}

export default LeaderboardElement;
