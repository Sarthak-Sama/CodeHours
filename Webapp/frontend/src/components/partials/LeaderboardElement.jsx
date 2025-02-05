import React, { useContext } from "react";
import { UserContext } from "../../context/Context";
import { Link } from "react-router-dom";

function LeaderboardElement({ data, formatTime }) {
  const { formatLanguage } = useContext(UserContext);

  // Sort languages by time and take top 4
  const topLanguages = data.language_time
    .sort((a, b) => b.total_time - a.total_time)
    .slice(0, 6);

  return (
    <Link
      to={`/profile/${data.userId}`}
      className="w-[95%] sm:w-[90%] h-[3.5rem] rounded-[1.75vw] sm:rounded-[1.25vw] md:rounded-[1vw] lg:rounded-[0.75vw] border-2 my-2 py-3 px-5 lg:px-10 flex items-center bg-[#f5f5f5] hover:bg-[#E3E3E3] transition-all duration-300 ease-in-out"
    >
      <div className="flex items-center gap-5 w-[50%] md:w-[33%] lg:w-[25%]">
        <div className="w-[2.4rem] aspect-square rounded">
          <img
            src={data.pfpUrl}
            className="w-full h-full rounded-full"
            alt="profile"
          />
        </div>
        <div className="">{data.username}</div>
      </div>

      <div className="w-[50%] md:w-[20%] lg:w-[10%] text-right md:text-center lg:text-left">
        {formatTime(Math.floor(data.daily_time / (60 * 1000)))}
      </div>

      <div
        id="languages"
        className="md:flex hidden gap-1 items-center shrink-0 w-[52%] overflow-hidden"
      >
        {topLanguages.map((elem) => (
          <span
            key={elem.language}
            className="rounded-full px-2 py-1 bg-[#E94545] border border-black text-white text-xs whitespace-nowrap truncate max-w-[120px]"
          >
            {`${formatLanguage(elem.language)}: ${Math.floor(
              elem.total_time / (60 * 1000)
            )}m`}
          </span>
        ))}
      </div>

      <div className="hidden lg:block text-center w-[20%] translate-x-8">
        Level {data.level.current}
      </div>
    </Link>
  );
}

export default LeaderboardElement;
