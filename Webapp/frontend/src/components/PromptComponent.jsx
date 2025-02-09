import React, { useContext, useEffect } from "react";
import { UserContext } from "../context/Context";
import { RiCloseLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

function PromptComponent() {
  const { promptMessage, promptState, setPromptMessage } =
    useContext(UserContext);

  // Auto dismiss the prompt after 3 seconds
  useEffect(() => {
    if (promptMessage) {
      const timer = setTimeout(() => {
        setPromptMessage("");
      }, 3000);

      return () => clearTimeout(timer); // Cleanup the timeout if the component unmounts
    }
  }, [promptMessage, setPromptMessage]);

  return (
    <>
      <AnimatePresence>
        {promptMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className={`absolute bottom-10 left-1/2 gap-5 -translate-x-1/2 rounded-md ${
              promptState === "error" ? "bg-[#e94545]" : "bg-[#212529]"
            } px-3 py-2 text-[#f5f5f5] flex items-center justify-between ease-in-out`}
          >
            <div className="flex flex-col items-center">
              <p className="">{promptMessage}</p>
              {promptMessage === "Key copied to the clipboard!!" && (
                <Link
                  to="/tutorial"
                  className="underline text-xs opacity-70 hover:opacity-100"
                >
                  Learn How to setup the Tracker.
                </Link>
              )}
            </div>
            <span
              onClick={() => setPromptMessage("")}
              className="opacity-75 hover:opacity-100 cursor-pointer"
            >
              <RiCloseLine />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PromptComponent;
