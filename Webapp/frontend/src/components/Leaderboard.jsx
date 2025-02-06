import React from "react";
import ProfilePage from "../pages/ProfilePage";
import LeaderboardElement from "./partials/LeaderboardElement";

function Leaderboard({ dataArray, formatTime }) {
  return (
    <div className="px-10 pb-10">
      <div className="w-full flex items-center  my-5">
        <span className="w-[9%] ml-[5%] sm:ml-[2.5%] md:ml-[0.5%] lg:ml-0 text-center">
          Rank.
        </span>
        <span className="w-[25%] md:w-[13%] ml-[13%] lg:ml-[10%]">Name</span>
        <span className="w-[50%] md:w-[33%] lg:w-[10%] text-right md:text-center lg:text-left">
          Today's Time
        </span>
        <span className="md:w-[33%] lg:w-[45%] text-center hidden md:block">
          Technology
        </span>
        <span className="w-[10%] text-center hidden lg:block">Level</span>
      </div>
      {dataArray.map((data, i) => (
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center justify-center border-2  h-[3.5rem] rounded-[1.75vw] sm:rounded-[1.25vw] md:rounded-[1vw] lg:rounded-[.75vw] aspect-square rounded-xl mx-[2%] text-xl">
            #{i + 1}
          </div>
          <LeaderboardElement key={i} data={data} formatTime={formatTime} />
        </div>
      ))}
    </div>
  );
}

export default Leaderboard;
