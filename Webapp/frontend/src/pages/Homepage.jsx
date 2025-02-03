//Leaderboard Page

import React, { useEffect, useState } from "react";
import LoadingPage from "./LoadingPage";
import Navbar from "../components/Navbar";
import Leaderboard from "../components/Leaderboard";
import TopCards from "../components/TopCards";
import axios from "../utils/axios";

function Homepage() {
  const [leaderboardData, setLeaderboardData] = useState(null);
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
  }, []);
  return (
    <>
      {leaderboardData && leaderboardData.length > 0 ? (
        <div>
          <div className="xl:scale-100 scale-80">
            <TopCards
              rank1={leaderboardData[0]}
              rank2={leaderboardData[0]}
              rank3={leaderboardData[0]}
            />
          </div>

          <Leaderboard dataArray={leaderboardData} />
        </div>
      ) : (
        "loading"
      )}
    </>
  );
}

export default Homepage;
