import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// -----------------------------
// CodeSnippet Component
// -----------------------------
const CodeSnippet = ({ code, id }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  };

  return (
    <div className="relative group">
      <pre
        id={id}
        className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm"
      >
        {code}
      </pre>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleCopy}
        className="absolute top-2 right-2 bg-[#e94545] text-white px-2 py-1 text-xs rounded focus:outline-none"
      >
        {copied ? "Copied!" : "Copy"}
      </motion.button>
      <AnimatePresence>
        {copied && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 right-2 bg-black text-white text-xs px-2 py-1 rounded"
          >
            Code copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// -----------------------------
// BackToTopButton Component
// -----------------------------
const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);

  // Show button when page is scrolled down 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-[#e94545] text-white p-3 rounded-full shadow-lg focus:outline-none"
        >
          ↑ Top
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// -----------------------------
// SampleStopwatch Component
// -----------------------------
const SampleStopwatch = () => {
  // Initialize stopwatch with a random number of seconds up to 24 hours (86400 seconds)
  const [seconds, setSeconds] = useState(() =>
    Math.floor(Math.random() * 86400)
  );

  // Increase the counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const hrs = String(Math.floor(secs / 3600)).padStart(2, "0");
    const mins = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const secsDisplay = String(secs % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secsDisplay}`;
  };

  return (
    <div className="flex items-center justify-center py-4">
      <div className="text-3xl font-bold text-[#212529]">
        {formatTime(seconds)}
      </div>
    </div>
  );
};

// -----------------------------
// ComponentPage Component
// -----------------------------
const ComponentPage = () => {
  return (
    <div className="bg-[#f5f5f5] text-[#212529] min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Page Title */}
        <motion.h1 className="text-4xl font-bold mb-6 text-center">
          Integrate the CodeHours Stopwatch Widget
        </motion.h1>
        <motion.p className="mb-8 text-center text-lg max-w-3xl mx-auto">
          Follow these detailed, beginner-friendly steps to easily integrate the
          CodeHours Stopwatch Widget into your website. This guide works for
          vanilla HTML/CSS/JS as well as frameworks like React, Vue, etc.
        </motion.p>

        {/* Step 1: Include the Widget Script */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 1: Include the Widget Script
          </h2>
          <p className="mb-4 leading-relaxed">
            To start, add the following <code>&lt;script&gt;</code> tag in the{" "}
            <code>&lt;head&gt;</code> section of your HTML file. This script
            loads the widget from our CDN.
          </p>
          <CodeSnippet
            id="script-code-snippet"
            code={`<script src="https://code-tracker-git-main-sarthaks-projects-9a6173fa.vercel.app/widget.min.js"></script>`}
          />
          <p className="mt-4 text-sm text-gray-600">
            <em>Note:</em> This step works for vanilla HTML as well as any
            framework.
          </p>
        </motion.div>

        {/* Step 2: Add the Custom Element */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 2: Add the Custom Element
          </h2>
          <p className="mb-4 leading-relaxed">
            Next, place the custom element{" "}
            <code>&lt;codehours-stopwatch&gt;</code> wherever you want the
            widget to appear on your page. Replace <code>yourUsername</code>{" "}
            with your actual username.
          </p>
          <CodeSnippet
            id="element-code-snippet"
            code={`<codehours-stopwatch user="yourUsername" size="2rem" color="#212529" font="yourFont" dataTimeSpan="daily"></codehours-stopwatch>`}
          />
          <p className="mt-4 text-sm text-gray-600">
            <em>Tip:</em> You can copy and paste the above snippet into your
            HTML file or React component.
          </p>
        </motion.div>

        {/* Step 3: Customize Your Widget */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Step 3: Customize Your Widget
          </h2>
          <p className="mb-4 leading-relaxed">
            You can easily customize the widget by adjusting these attributes:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-4">
            <li>
              <strong>size</strong>: Define the widget's font size (e.g.,{" "}
              <code>2rem</code>).
            </li>
            <li>
              <strong>color</strong>: Set the text color (e.g.,{" "}
              <code>#212529</code>).
            </li>
            <li>
              <strong>font</strong>: Specify the font family (e.g.,{" "}
              <code>Arial</code>).
            </li>
            <li>
              <strong>fontUrl</strong>: Provide a URL to a custom font if
              desired.
            </li>
            <li>
              <strong>dataTimeSpan</strong>: Choose the timespan (e.g.,{" "}
              <code>daily</code> or <code>weekly</code>).
            </li>
          </ul>
          <p className="text-sm text-gray-600">
            These options let you tailor the widget's appearance to match your
            website's design. Simply modify the attributes in the custom
            element.
          </p>
        </motion.div>

        {/* Live Demo Preview */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Live Demo Preview
          </h2>
          <p className="mb-4 leading-relaxed">
            Check out the live demo below. For demonstration purposes, we have
            replaced the actual widget with a sample stopwatch. This preview
            simulates how a stopwatch might tick on your page.
          </p>
          <div className="border p-4 rounded">
            {/* Sample Stopwatch Preview */}
            <SampleStopwatch />
          </div>
        </motion.div>

        {/* Help & FAQ Section */}
        <motion.div className="mb-10 p-6 bg-white shadow-lg rounded">
          <h2 className="text-2xl font-semibold text-[#e94545] mb-4">
            Need More Help?
          </h2>
          <p className="mb-4 leading-relaxed">
            If you run into any issues or have questions about integrating the
            widget, or any suggestions about this app: DM me on{" "}
            <a
              href="https://x.com/Sarthak_Sama"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e94545] font-bold hover:underline"
            >
              @Twitter
            </a>
          </p>
          <p className="mb-2 text-sm text-gray-600">
            <em>Hint:</em> The steps above work just as well for a vanilla
            HTML/CSS/JS setup.
          </p>
          {/* Placeholder for a help icon/image */}
          {/* <img src="path/to/your/help-icon.png" alt="Help Icon" className="w-16 h-16" /> */}
          <a href="#" className="text-[#e94545] underline">
            Visit FAQ &amp; Support
          </a>
        </motion.div>
      </div>

      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  );
};

export default ComponentPage;
