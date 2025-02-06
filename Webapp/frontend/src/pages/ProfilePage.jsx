import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/Context";
import StatsComponent from "../components/StatsComponent";
import axios from "../utils/axios";
import { useNavigate, useParams } from "react-router-dom";
import LanguageTimeDisplay from "../components/LanguageTimeDisplay";
import { AnimatePresence, motion } from "framer-motion";
import DailyActivityGrid from "../components/partials/DailyActivityGrid";
import { PropagateLoader } from "react-spinners";

function ProfilePage({ formatTime }) {
  const {
    user,
    fetchedUser,
    fetchUserData,
    formatLanguage,
    setPromptState,
    setPromptMessage,
  } = useContext(UserContext);
  const [aboutSectionContent, setAboutSectionContent] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredOverLevel, setHoverOverLevel] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  if (!id && !user) navigate("/");

  useEffect(() => {
    if (fetchedUser?.about) setAboutSectionContent(fetchedUser.about);
  }, [fetchedUser]);

  useEffect(() => {
    if (id) {
      fetchUserData(id);
    }
  }, [id]);

  const calculateLongestStreak = (dailyData) => {
    if (dailyData === "NA") return;
    // Filter days where the user coded at least 60 minutes.
    const validDays = dailyData
      .filter((day) => day.totalTime >= 60 * 60 * 1000)
      .map((day) => {
        // Convert the date string into a Date object.
        // Adjust this if your date format is different.
        return new Date(day.date);
      });

    if (validDays.length === 0) {
      return 0;
    }

    // Sort the dates in ascending order.
    validDays.sort((a, b) => a - b);

    let longestStreak = 1;
    let currentStreak = 1;

    // Loop over the sorted dates and count consecutive days.
    for (let i = 1; i < validDays.length; i++) {
      const prevDate = validDays[i - 1];
      const currentDate = validDays[i];

      // Calculate the difference in days.
      const diffInTime = currentDate.getTime() - prevDate.getTime();
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      // If the current date is exactly one day after the previous date,
      // it's part of a consecutive streak.
      if (diffInDays === 1) {
        currentStreak++;
      } else {
        // Reset the streak if the days are not consecutive.
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    return longestStreak;
  };

  // Store fetched data in state
  const [dailyData, setDailyData] = useState([]);

  const fetchDailyData = async () => {
    try {
      const response = await axios.get(
        `/api/activityData?userId=${fetchedUser.userId}`
      ); // Send userId as query param
      setDailyData(response.data.data); // Update state
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setDailyData("NA");
      } else {
        console.log(error); // Handle other errors
      }
    }
  };

  const updateAboutSection = async () => {
    try {
      await axios.post("/api/updateAboutSection", {
        userId: fetchedUser.userId,
        content: aboutSectionContent,
      });
      setIsSubmitting(false);
      setIsWriting(false);
    } catch (error) {
      setPromptState("error");
      setPromptMessage("Oops... a problem occurred");
    }
  };

  useEffect(() => {
    if (fetchedUser?.userId) fetchDailyData(); // Ensure user is available before fetching
  }, [fetchedUser]);

  // Calculate the longest daily streak.
  // Ensure that the dailyData objects have properties: date and codingTime (in minutes).
  const longestDailyStreak = calculateLongestStreak(dailyData);

  return (
    <div className="w-full h-full">
      {fetchedUser ? (
        <div className="px-10">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <div className="w-[100%] md:w-[50%]">
              <div className="flex items-center gap-3 my-10">
                <div
                  id="pfp"
                  className="w-[15vw] sm:w-[8vw] md:w-[4.7vw] aspect-square rounded-full bg-red-200"
                >
                  <img
                    src={id ? fetchedUser?.pfpUrl : user.imageUrl}
                    className="w-full h-full rounded-full object-cover object-center"
                    alt="Profile"
                  />
                </div>
                <div>
                  <div className="text-[9vw] sm:text-[7vw] md:text-[3.5vw] font-[900] flex items-center gap-3">
                    <h3>{fetchedUser?.fullname}</h3>
                    <span
                      onMouseEnter={() => setHoverOverLevel(true)}
                      onMouseLeave={() => setHoverOverLevel(false)}
                      onTouchStart={() => setHoverOverLevel(true)}
                      onTouchEnd={() => setHoverOverLevel(false)}
                      className="opacity-70 text-[4.5vw] sm:text-[3vw] md:text-[2vw] cursor-pointer"
                    >
                      (Level {fetchedUser?.level.current})
                    </span>
                  </div>
                  <h4 className="text-black/60 text-[4vw] sm:text-[2.5vw] md:text-[1.25vw] -mt-1 sm:-mt-2 md:-mt-3 ml-1">
                    @{fetchedUser?.username}
                  </h4>
                </div>
              </div>

              <AnimatePresence>
                {hoveredOverLevel && (
                  <motion.div
                    initial={{ y: -20, opacity: 0, display: "none" }}
                    animate={{ y: 5, opacity: 100, display: "block" }}
                    exit={{ y: -20, opacity: 0, display: "none" }}
                    transition={{ duration: 0.3 }}
                    className="relative drop-shadow-xl ease-in-out"
                    onMouseEnter={() => setHoverOverLevel(true)}
                    onMouseLeave={() => setHoverOverLevel(false)}
                  >
                    <div className="absolute z-10 -top-15 left-1/2 -translate-x-1/2 mb-1">
                      <div className="absolute scale-[3] rotate-180 bottom-full left-[80%] sm:left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#212529]" />
                      <div className="bg-[#212529] text-white w-[20rem] h-[8rem] p-5 rounded-md whitespace-nowrap">
                        <div className="flex items-center text-lg justify-between">
                          <h4>Level {fetchedUser?.level.current}</h4>
                          <h4>Level {fetchedUser?.level.current + 1}</h4>
                        </div>

                        <div className="w-full mt-3 relative">
                          <hr className="absolute w-[100%] border-4 rounded-full" />
                          <hr
                            className={`absolute border-[#e94545] w-[${
                              (fetchedUser.level.xpAtCurrentLevel /
                                fetchedUser.level.xpForNextLevel) *
                              100
                            }%] border-4 rounded-full`} // Calculate the progress percentage
                          />
                          <h4 className="w-full text-center pt-5">{`${Math.floor(
                            fetchedUser.level.xpAtCurrentLevel
                          )} / ${Math.floor(
                            fetchedUser.level.xpForNextLevel
                          )} XP`}</h4>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex w-full md:pr-[15%]">
                <div className="w-1/3 text-center md:text-left">
                  <h3 className="font-[900] text-[4vw] sm:text-[2.5vw] md:text-[1.3vw] mb-2">
                    Daily Time
                  </h3>
                  <h4 className="text-[3.5vw] sm:text-[2.5vw] md:text-[1vw]">
                    {formatTime(Math.floor(fetchedUser.daily_time / 60000))}
                  </h4>
                </div>
                <div className="w-1/3 text-center md:text-left">
                  <h3 className="font-[900] text-[4vw] sm:text-[2.5vw] md:text-[1.3vw] mb-2">
                    Weekly Time
                  </h3>
                  <h4 className="text-[3.5vw] sm:text-[2.5vw] md:text-[1vw]">
                    {formatTime(Math.floor(fetchedUser.weekly_time / 60000))}
                  </h4>
                </div>
                <div className="w-1/3 text-center md:text-left">
                  <h3 className="font-[900] text-[4vw] sm:text-[2.5vw] md:text-[1.3vw] mb-2">
                    Total Time
                  </h3>
                  <h4 className="text-[3.5vw] sm:text-[2.5vw] md:text-[1vw]">
                    {formatTime(Math.floor(fetchedUser.total_time / 60000))}
                  </h4>
                </div>
              </div>
              <div className="flex w-full md:w-[70%]">
                <div className="flex w-full"></div>
              </div>
              <p className="w-full md:w-[70%] mt-2 text-justify">
                {isWriting ? (
                  <div class="space-y-2 mt-2">
                    <h3 class="text-xl font-semibold text-[#E94545]">
                      Editing...
                    </h3>
                    <textarea
                      name=""
                      id=""
                      rows="6"
                      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E94545] resize-none"
                      placeholder="Tell us about you.."
                      onChange={(e) => setAboutSectionContent(e.target.value)}
                      value={aboutSectionContent && aboutSectionContent}
                    ></textarea>
                    <button
                      onClick={() => {
                        setIsWriting(false);
                      }}
                      class="bg-[#252129] text-white font-semibold py-2 px-6 rounded-lg hover:bg-black transition duration-300 mr-5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateAboutSection()}
                      class="bg-[#E94545] text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-600 transition duration-300"
                    >
                      {isSubmitting ? "Updating..." : "Update"}
                    </button>
                  </div>
                ) : aboutSectionContent ? (
                  <>
                    {aboutSectionContent}
                    {!id && (
                      <span
                        onClick={() => setIsWriting(true)}
                        className="ml-5 cursor-pointer tracking-[2px] text-[2]vw sm:text-[1.6vw] md:text-[1.25vw] lg:text-[0.9vw] text-[#E94545] opacity-70 hover:opacity-100 transition-all duration-250 ease-in-out"
                      >
                        Edit your 'About' Section.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {!id && (
                      <span
                        onClick={() => setIsWriting(true)}
                        className="cursor-pointer tracking-[2px] text-[2]vw sm:text-[1.6vw] md:text-[1.25vw] lg:text-[0.9vw] text-[#E94545] opacity-75 hover:opacity-100 transition-all duration-250 ease-in-out"
                      >
                        Add your 'About' section.
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            {dailyData !== "NA" && (
              <div className="w-full md:w-[50%]">
                <StatsComponent
                  dailyData={dailyData}
                  langDataArray={fetchedUser.language_time}
                  formatTime={formatTime}
                  formatLanguage={formatLanguage}
                />
              </div>
            )}
          </div>
          {dailyData === "NA" ? (
            <p className="w-full text-center mt-18 font-[900] text-xl text-[#e94545]">
              Configure your vs code extension and START TRACKING
            </p>
          ) : (
            <>
              <h3 className="mt-15 font-bold text-[5vw] sm:text-[3.5vw] md:text-[2vw]">
                Daily Activity:
              </h3>
              <div className="w-full border-2 p-5 rounded-lg md:w-[82%] mx-auto flex justify-center mt-10 scale-100 md:scale-[1.1]">
                {dailyData.length > 0 ? (
                  // Wrap in an overflow container for horizontal scrolling on small screens
                  <div className="overflow-x-auto lg:overflow-x-visible">
                    <DailyActivityGrid
                      dailyData={dailyData}
                      formatTime={formatTime}
                    />
                  </div>
                ) : (
                  "loading"
                )}
              </div>
              <div className="md:flex mt-5">
                <div className="w-full md:w-1/2 mt-10">
                  <h2 className="text-[5vw] sm:text-[3.5vw] md:text-[2vw] font-[900]">
                    Streaks:
                  </h2>
                  <div className="flex my-1 gap-2 items-center justify-center w-full md:w-[70%] xl:w-[50%] h-[9vh] rounded-xl bg-[#212529] hover:bg-[#191c1e] text-[#f5f5f5] group transition-all duration-300 ease-in-out">
                    <h3 className="opacity-70 group-hover:opacity-80 transition-all duration-300 ease-in-out">
                      Longest Daily Streak:
                    </h3>
                    <h4 className="opacity-70 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                      {`${longestDailyStreak} ${
                        longestDailyStreak === 1 ? "day" : "days"
                      }`}
                    </h4>
                  </div>
                  <div className="flex my-1 gap-2 items-center justify-center w-full md:w-[70%] xl:w-[50%] h-[9vh] rounded-xl bg-[#212529] hover:bg-[#191c1e] text-[#f5f5f5] group transition-all duration-300 ease-in-out">
                    <h3 className="opacity-70 group-hover:opacity-80 transition-all duration-300 ease-in-out">
                      Longest Coding Session:
                    </h3>
                    <h4 className="opacity-70 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                      {/* The longest coding session is calculated in the backend */}
                      {formatTime(
                        Math.floor(
                          fetchedUser?.longest_coding_session / (60 * 1000)
                        )
                      ) || 0}
                    </h4>
                  </div>
                </div>
                <div className="w-full md:w-1/2 mt-10 mb-12">
                  <LanguageTimeDisplay
                    langDataArray={fetchedUser.language_time}
                    formatTime={formatTime}
                    formatLanguage={formatLanguage}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <PropagateLoader color="#212529" className="scale-[0.75]" />
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
