import React from "react";

function TopCards({ rank1, rank2, rank3, formatTime }) {
  return (
    <div className=" flex flex-col items-center xl:flex-row justify-center pt-[5vh] mb:pt-[10vh] mb-[10vh] gap-5">
      <div
        className="w-[80%] xl:w-[20%] h-[22vh] xl:h-[25vh] translate-y-[39.5vh] xl:translate-y-[0] xl:mt-[20vh]"
        style={{
          maskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
        }}
      >
        <h2 className="w-full text-center font-900 text-xl">
          {rank3
            ? formatTime(Math.floor(rank3.daily_time / (60 * 1000)))
            : "N.A."}
        </h2>
        <div
          id="pos-3-card"
          className="border-2 h-full border-b-0 rounded-t-xl flex flex-col items-center"
        >
          <h2 className="font-[900] text-[7vw] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[1.5vw] mt-3">
            #3 Sweatlord
          </h2>
          <div className="flex items-center gap-3 mt-5">
            <div className="w-[15vw] sm:w-[10vw] md:w-[7vw] lg:w-[5vw] xl:w-[3vw] aspect-square rounded-full">
              <img
                src={
                  rank3
                    ? rank3.pfpUrl || "/images/user"
                    : "/images/userIcon.png"
                }
                className="w-full h-full rounded-full position-center object-cover"
              />
            </div>
            <h3 className="text-[6vw] sm:text-[5vw] md:text-[3vw] lg:text-[2.25vw] xl:text-[1.5vw]">
              {rank3 ? rank3.username : "None"}
            </h3>
          </div>
        </div>
      </div>
      <div
        style={{
          maskImage:
            "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
        }}
        className="w-[80%] xl:w-[20%] h-[45vh] mt-[-29vh] xl:mt-[0] "
      >
        <h2 className="w-full text-center font-900 text-xl">
          {rank1
            ? formatTime(Math.floor(rank1.daily_time / (60 * 1000)))
            : "N.A."}
        </h2>
        <div
          id="pos-1-card"
          className="bg-[#f5f5f5] border-2 border-b-0 h-full rounded-t-xl flex flex-col items-center"
        >
          <h2 className="font-[900] text-[7vw] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[2.25vw] mt-3">
            #1 Cracked
          </h2>
          <div className="flex flex-row xl:flex-col items-center gap-5 mt-5">
            <div className="w-[15vw]  mt-5 sm:w-[10vw] md:w-[7vw] lg:w-[5vw] xl:w-[5vw] h-[15vw]  sm:h-[10vw] md:h-[7vw] lg:h-[5vw] xl:h-[5vw] rounded-full">
              <img
                src={
                  rank1
                    ? rank1.pfpUrl || "/images/user"
                    : "/images/userIcon.png"
                }
                className="w-full h-full rounded-full object-center object-cover"
              />
            </div>
            <h3 className="text-[6vw] sm:text-[5vw] md:text-[3vw] lg:text-[2.25vw] xl:text-[2vw]">
              {rank1 ? rank1.username : "None"}
            </h3>
          </div>
        </div>
      </div>
      <div
        style={{
          maskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
        }}
        className="w-[80%] xl:w-[20%] h-[35vh] mt-[-23.5vh] xl:mt-[10vh]"
      >
        <h2 className="w-full text-center font-900 text-xl">
          {rank2
            ? formatTime(Math.floor(rank2.daily_time / (60 * 1000)))
            : "N.A."}
        </h2>
        <div
          id="pos-2-card"
          className="border-2 border-b-0 h-full rounded-t-xl flex flex-col items-center"
        >
          <h2 className="font-[900] text-[7vw] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[1.75vw] mt-3">
            #2 Overclocked
          </h2>
          <div className="flex items-center gap-3 mt-5">
            <div className="w-[15vw] sm:w-[10vw] md:w-[7vw] lg:w-[5vw] xl:w-[4vw] aspect-square rounded-full">
              <img
                src={
                  rank2
                    ? rank2.pfpUrl || "/images/userIcon.png"
                    : "/images/userIcon.png"
                }
                className="w-full h-full rounded-full position-center object-cover"
              />
            </div>
            <h3 className="text-[6vw] sm:text-[5vw] md:text-[3vw] lg:text-[2.25vw] xl:text-[1.75vw]">
              {rank2 ? rank2.username : "None"}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopCards;
