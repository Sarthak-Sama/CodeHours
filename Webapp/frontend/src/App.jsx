import React, { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Homepage from "./pages/Homepage";
import ProfilePage from "./pages/ProfilePage";
import Navbar from "./components/Navbar";
import { SignIn } from "@clerk/clerk-react";
import PromptComponent from "./components/PromptComponent";
import ComponentPage from "./pages/ComponentPage";
import LoadingPage from "./pages/LoadingPage";
import TutorialPage from "./pages/TutorialPage";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginBoxVisible, setIsLoginBoxVisible] = useState(false);

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}hr ${mins}min`;
  };

  useEffect(() => {
    // Hide loading screen after 5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#f5f5f5] text-[#212529]">
      {isLoading && (
        <div
          className={`absolute top-0 left-0 w-screen h-screen transition-transform duration-1000 ${
            !isLoading ? "translate-y-[-100vh]" : "translate-y-0"
          }`}
        >
          <LoadingPage />
        </div>
      )}
      <div
        className={`transition-opacity duration-1000 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <Navbar setIsLoginBoxVisible={setIsLoginBoxVisible} />
        <div className="w-full h-[90vh] sm:h-[87vh] overflow-auto">
          <Routes>
            <Route path="/" element={<Homepage formatTime={formatTime} />} />
            <Route
              path="/profile"
              element={<ProfilePage formatTime={formatTime} />}
            />
            <Route
              path="/profile/:id"
              element={<ProfilePage formatTime={formatTime} />}
            />
            <Route path="/component" element={<ComponentPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
          </Routes>
        </div>
        {isLoginBoxVisible && (
          <div
            onClick={() => setIsLoginBoxVisible(false)}
            className="absolute top-0 left-0 w-screen h-screen bg-black/20 flex items-center justify-center"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <SignIn withSignUp={true} />
            </div>
          </div>
        )}
        <PromptComponent />
      </div>
    </div>
  );
}

export default App;
