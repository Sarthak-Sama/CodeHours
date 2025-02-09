import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Inline CodeSnippet Component
const CodeSnippet = ({ code }) => {
  return (
    <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto text-sm my-4">
      <code>{code}</code>
    </pre>
  );
};

const TutorialPage = () => {
  return (
    <div className="bg-[#f5f5f5] text-[#212529] min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Page Title */}
        <motion.h1 className="text-4xl font-bold mb-6 text-center">
          How to Install and Setup the CodeHours Extension
        </motion.h1>
        <motion.p className="mb-8 text-center text-lg max-w-3xl mx-auto">
          Follow these step-by-step instructions to install and configure the
          CodeHours extension for tracking your coding time.
        </motion.p>

        {/* Step 1: Install the Extension */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 1: Install the VS Code Extension
          </h2>
          <p className="mb-4 leading-relaxed">
            Open Visual Studio Code, then navigate to the Extensions
            Marketplace. Search for "CodeHours" and click on the{" "}
            <strong>Install</strong> button.
          </p>
          <p className="mb-4 leading-relaxed">
            Alternatively, you can install the extension via the command line:
          </p>
          <CodeSnippet
            code={`code --install-extension tensaiKun.codehours
`}
          />
          <p className="mt-4 text-sm text-gray-600">
            Note: Ensure that you have the latest version of VS Code installed.
          </p>
        </motion.div>

        {/* Step 2: Configure the Extension */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 2: Configure the Extension
          </h2>
          <p className="mb-4 leading-relaxed">
            Open the Command Palette in VS Code (<code>Ctrl+Shift+P</code> or{" "}
            <code>Cmd+Shift+P</code>) and search for{" "}
            <code>CodeHours: Configure</code>.
          </p>
          <p className="mb-4 leading-relaxed">
            Follow the on-screen instructions to enter your API token and set
            your preferred tracking settings.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            If you have not generated an API token yet, visit your dashboard on
            our website to create one.
          </p>
        </motion.div>

        {/* Step 3: Start Tracking */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 3: Start Tracking Your Coding Time
          </h2>
          <p className="mb-4 leading-relaxed">
            Once the extension is configured, it will automatically begin
            tracking your coding time in VS Code. You'll see a live counter in
            the status bar that updates in real-time.
          </p>
          <p className="mb-4 leading-relaxed">
            To view detailed reports and analytics, visit your online dashboard.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Pro Tip: Keep a stable internet connection so the extension can
            continuously sync your data.
          </p>
        </motion.div>

        {/* Additional Resources */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Additional Resources
          </h2>
          <p className="mb-4 leading-relaxed">
            For more information, check out the Extension's desciption section.
          </p>
        </motion.div>
      </div>

      {/* Back-to-Top Button */}
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="fixed bottom-6 right-6 bg-[#e94545] text-white p-3 rounded-full shadow-lg focus:outline-none"
        >
          ↑ Top
        </motion.button>
      </AnimatePresence>
    </div>
  );
};

export default TutorialPage;
