import React, { useContext, useEffect } from "react";
import { UserContext } from "../context/Context";
import { RiCloseLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

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
            className={`absolute bottom-10 left-1/2 gap-5 -translate-x-1/2  h-12 rounded-md ${
              promptState === "error" ? "bg-[#e94545]" : "bg-[#212529]"
            } px-3 py-1 text-[#f5f5f5] flex items-center justify-between ease-in-out`}
          >
            <p className="">{promptMessage}</p>
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
