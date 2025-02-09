// Homepage.js
import React, { useContext, useEffect, useState } from "react";
import Leaderboard from "../components/Leaderboard";
import TopCards from "../components/TopCards";
import axios from "../utils/axios";
import { PropagateLoader } from "react-spinners";
import { UserContext } from "../context/Context";
import LeaderboardElement from "../components/partials/LeaderboardElement";

function Homepage({ formatTime }) {
  const { user, fetchedUser, fetchUserData } = useContext(UserContext);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [userRank, setUserRank] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get("/api/leaderboard");
      setLeaderboardData(response.data.data);
    } catch (error) {
      console.log("Error fetching the leaderboard: ", error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    if (user) fetchUserData(user.id);
  }, [user, fetchedUser]);

  useEffect(() => {
    if (leaderboardData && fetchedUser) {
      const merged = [...leaderboardData];
      const userExists = merged.some((u) => u._id === fetchedUser._id);
      if (!userExists) {
        merged.push(fetchedUser);
      }
      merged.sort((a, b) => b.todayTime - a.todayTime);
      const userIndex = merged.findIndex((u) => u._id === fetchedUser._id);
      setUserRank(userIndex + 1);
    }
  }, [leaderboardData, fetchedUser]);

  return (
    <>
      {leaderboardData && leaderboardData.length > 0 ? (
        <div>
          <div className="xl:scale-100 scale-80">
            <TopCards
              rank1={leaderboardData[0] || null}
              rank2={leaderboardData[1] || null}
              rank3={leaderboardData[2] || null}
              formatTime={formatTime}
            />
          </div>

          {fetchedUser && (
            <div className="w-full px-[2.5%]">
              <h3 className="ml-[2%]">Your Rank:</h3>
              <div className="w-full flex items-center">
                <div className="flex items-center justify-center border-2  h-[3.5rem] rounded-[1.75vw] sm:rounded-[1.25vw] md:rounded-[1vw] lg:rounded-[.75vw] aspect-square rounded-xl mx-[2%] text-xl">
                  #{userRank || "..."}
                </div>
                <LeaderboardElement
                  data={fetchedUser}
                  formatTime={formatTime}
                />
              </div>
            </div>
          )}
          <hr className="border-[0.5px] w-[60%] rounded-full mx-auto my-12" />
          <Leaderboard dataArray={leaderboardData} formatTime={formatTime} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <PropagateLoader color="#212529" className="scale-[0.75]" />
        </div>
      )}
    </>
  );
}

export default Homepage;
