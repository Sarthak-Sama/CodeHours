import React, { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Homepage from "./pages/Homepage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import Navbar from "./components/Navbar";
import { SignIn } from "@clerk/clerk-react";
import PromptComponent from "./components/PromptComponent";
import ComponentPage from "./pages/ComponentPage";

function App() {
  const [isLoginBoxVisible, setIsLoginBoxVisible] = useState(false);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#f5f5f5] text-[#212529]">
      <Navbar setIsLoginBoxVisible={setIsLoginBoxVisible} />
      <div className="w-full h-[87vh] overflow-auto">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/component" element={<ComponentPage />} />
          <Route path="/auth" element={<AuthPage />} />
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
  );
}

export default App;
