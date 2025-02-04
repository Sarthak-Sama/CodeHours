import React, { useContext, useState, useRef } from "react";
import { UserContext } from "../context/Context";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { RiArrowRightSLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { useMatch } from "react-router-dom";

function Navbar({ setIsLoginBoxVisible }) {
  const { user, fetchedUser, setPromptState, setPromptMessage } =
    useContext(UserContext);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const trackingRef = useRef(null);
  const isProfilePage = useMatch("/profile");
  const navigate = useNavigate();

  const handleMouseMove = (e) => {
    if (trackingRef.current) {
      const rect = trackingRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left; // Correct X inside div
      const y = e.clientY - rect.top; // Correct Y inside div

      setCursorPos({ x, y });
    }
  };

  function copySessionKey(text) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(fetchedUser.token)
        .then(() => {
          setPromptState("");
          setPromptMessage("Key copied to the clipboard!!");
        })
        .catch((err) => {
          setPromptState("error");
          setPromptMessage("Failed to copy Session Key!");
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  }

  return (
    <div className="relative w-full h-[10vh] sm:h-[13vh] flex items-center justify-between px-10 py-5 border-b-2">
      <Link
        to="/"
        id="left-section"
        className="font-[ortland] text-xl sm:text-3xl lg:text-5xl font-[900]"
      >
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          C
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          o
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          d
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          e
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          H
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          o
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          u
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          r
        </span>
        <span className="hover:text-[#E94545] transition-all duration-200 ease-in-out">
          s
        </span>
      </Link>

      <div id="right-section">
        <SignedIn>
          <div className="flex items-center gap-2">
            <div
              ref={trackingRef}
              onMouseEnter={() => setCursorVisible(true)}
              onMouseLeave={() => setCursorVisible(false)}
              onMouseMove={handleMouseMove}
              onClick={() => {
                if (isProfilePage) {
                  navigate("/component");
                } else {
                  copySessionKey();
                }
              }}
              className="relative hidden md:block text-sm tracking-[2px] px-5 py-2 border-[1px] rounded-full overflow-hidden"
            >
              <h3
                className="relative z-5 transition-all duration-300 ease-out"
                style={{ color: cursorVisible ? "#f5f5f5" : "#212529" }}
              >
                {isProfilePage
                  ? "Integrate Hours on your page"
                  : "Copy Session Key"}
              </h3>
              <AnimatePresence>
                {cursorVisible && (
                  <motion.div
                    className="absolute z-1 w-6 h-6 bg-[#212529] rounded-full pointer-events-none"
                    initial={{ scale: 0 }}
                    animate={{
                      x: cursorPos.x - 33,
                      y: cursorPos.y - 40,
                      scale: isProfilePage ? 23 : 15,
                    }}
                    exit={{ scale: 0 }}
                    transition={{
                      x: { duration: 0 },
                      y: { duration: 0 },
                      scale: { duration: 0.3, ease: "easeInOut" },
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div
              id="profile"
              className="scale-[1.4] sm:scale-[1.5] mx-3 translate-y-1"
            >
              <UserButton />
            </div>
            <Link to="/profile" className="text-lg flex items-center group">
              {user?.username}
              <span className="ml-2 group-hover:translate-x-3 transition-all duration-300 ease-in-out">
                <RiArrowRightSLine size={16} />
              </span>
            </Link>
          </div>
        </SignedIn>

        <SignedOut>
          <div
            ref={trackingRef}
            onMouseEnter={() => setCursorVisible(true)}
            onMouseLeave={() => setCursorVisible(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsLoginBoxVisible(true)}
            className="relative text-sm tracking-[2px] px-5 py-2 border border-gray-500 rounded-full cursor-pointer transition-all duration-300 hover:bg-gray-100 active:scale-95 overflow-hidden"
          >
            <h3
              className="relative z-5 transition-all duration-300 ease-out"
              style={{ color: cursorVisible ? "#f5f5f5" : "#212529" }}
            >
              Start Tracking...
            </h3>
            <AnimatePresence>
              {cursorVisible && (
                <motion.div
                  className="absolute z-1 w-6 h-6 bg-[#212529] rounded-full pointer-events-none"
                  initial={{ scale: 0 }}
                  animate={{
                    x: cursorPos.x - 33,
                    y: cursorPos.y - 40,
                    scale: 15,
                  }}
                  exit={{ scale: 0 }}
                  transition={{
                    x: { duration: 0 },
                    y: { duration: 0 },
                    scale: { duration: 0.3, ease: "easeInOut" },
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </SignedOut>
      </div>
    </div>
  );
}

export default Navbar;
