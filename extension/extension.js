// Import VS Code API, axios for HTTP requests, and crypto for a unique instance ID
const vscode = require("vscode");
const axios = require("axios");
const { randomBytes } = require("crypto");

// Generate a unique identifier for this VS Code instance
const instanceId = randomBytes(16).toString("hex");

// Constants
const TIMER_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const ENDPOINT = "https://codehours.onrender.com/api/logTime"; // Logging endpoint
const GET_ENDPOINT = "https://codehours.onrender.com/api/getDailyTime"; // Endpoint for fetching total time
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const MIN_INTERVAL_MS = 1000; // Minimal interval threshold (1 second) to log

// Variables for heartbeat, session key, and timer
let lastHeartbeatTime;
let sessionKey;
let totalCodingTime = 0; // Overall coding time in milliseconds
let timerIntervalId;
let loggingIntervalId;
let statusBarTimerItem;
let isStopwatchVisible = true; // Toggle for stopwatch visibility
let lastActivityTime = Date.now();
let isTimerActive = true;

// Variables for language-specific tracking
let languageStartTime = Date.now(); // When the current language session started
let currentLanguage =
  vscode.window.activeTextEditor && vscode.window.activeTextEditor.document
    ? vscode.window.activeTextEditor.document.languageId
    : null;

/**
 * Sends coding time data to the server with the given language and time interval.
 * This function now sends both a startTime and endTime so that the backend can
 * deduplicate overlapping intervals.
 *
 * @param {string} language The programming language.
 * @param {number} startTime The timestamp when this logging interval started.
 * @param {number} endTime The timestamp when this logging interval ended.
 */
const logCodingTime = async (language, startTime, endTime) => {
  if (!sessionKey) {
    console.error("Session key is not set. Unable to log coding time.");
    return;
  }

  // Skip logging if the user is inactive.
  if (Date.now() - lastActivityTime > INACTIVITY_TIMEOUT) {
    console.log("User is inactive. Skipping data logging.");
    return;
  }

  try {
    const response = await axios.post(ENDPOINT, {
      token: sessionKey,
      language: language,
      startTime: startTime, // The timestamp when logging started
      endTime: endTime, // The timestamp when logging ended
      instanceId: instanceId, // Unique identifier for this VS Code instance
    });

    if (response.status === 200) {
      console.log(
        `Coding time logged for ${language} from ${new Date(
          startTime
        ).toISOString()} to ${new Date(endTime).toISOString()}.`
      );
    } else {
      console.error("Failed to log coding time:", response.statusText);
    }
  } catch (error) {
    console.error(
      "Failed to log coding time:",
      error.response?.data?.error || error.message
    );
  }
};

/**
 * Sends a heartbeat (for additional tracking if needed).
 * @param {string} language The current language.
 */
const sendHeartbeat = (language) => {
  lastHeartbeatTime = Date.now();
  console.log(`Heartbeat sent for language: ${language}`);
};

/**
 * Logs the time accumulated for the current language session as an interval
 * from languageStartTime to the current time and then resets the timer.
 * Only logs if the interval exceeds MIN_INTERVAL_MS.
 */
const logCurrentLanguageTime = () => {
  const now = Date.now();
  const duration = now - languageStartTime;

  if (duration < MIN_INTERVAL_MS) {
    console.log("Interval too short, not logging.");
  } else if (currentLanguage) {
    logCodingTime(currentLanguage, languageStartTime, now);
  }
  languageStartTime = now; // Reset for the next session
};

/**
 * Handles file save events.
 * NOTE: We no longer log time on file save.
 * @param {vscode.TextDocument} document The saved text document.
 */
const onDidSaveTextDocument = (document) => {
  lastActivityTime = Date.now();
  const newLanguage = document.languageId;

  // If the language changed on save, just update the current language and reset the start time.
  if (newLanguage !== currentLanguage) {
    console.log("Language changed on save, resetting language session.");
    currentLanguage = newLanguage;
    languageStartTime = Date.now();
  }
  sendHeartbeat(newLanguage);
};

/**
 * Handles text document change events.
 * Logs the previous language session only when the language changes.
 * @param {vscode.TextDocumentChangeEvent} event The document change event.
 */
const onDidChangeTextDocument = (event) => {
  const now = Date.now();
  lastActivityTime = now;
  const newLanguage = event.document.languageId;

  // If the user has been inactive, reset the session instead of logging a long interval.
  if (now - languageStartTime > INACTIVITY_TIMEOUT) {
    console.log("Resetting language session due to inactivity on change.");
    languageStartTime = now;
  } else if (newLanguage !== currentLanguage) {
    // Log the time for the previous language session if the language has changed.
    logCurrentLanguageTime();
    currentLanguage = newLanguage;
  }
  sendHeartbeat(newLanguage);
};

/**
 * Prompts the user to input their session key and saves it globally.
 */
const inputSessionKey = async () => {
  const result = await vscode.window.showInputBox({
    prompt: "Enter session key:",
    placeHolder: "Session key from your portal",
    ignoreFocusOut: true,
    password: true, // Hide the session key input
  });

  if (result !== undefined) {
    sessionKey = result;
    try {
      await vscode.workspace
        .getConfiguration()
        .update(
          "codehours.sessionKey",
          sessionKey,
          vscode.ConfigurationTarget.Global
        );
      vscode.window.showInformationMessage("Session key set successfully.");
      console.log(`Session key updated: ${sessionKey}`);
    } catch (error) {
      vscode.window.showErrorMessage("Failed to save session key.");
      console.error("Failed to save session key:", error);
    }
  }
};

/**
 * Loads the session key from the global configuration.
 */
const loadSessionKey = () => {
  const config = vscode.workspace.getConfiguration();
  sessionKey = config.get("codehours.sessionKey");
  if (!sessionKey) {
    vscode.window.showWarningMessage(
      "Session key is not set. Please set it using the command."
    );
  }
  console.log(`Loaded session key: ${sessionKey}`);
};

/**
 * Fetches the initial coding time from the backend so the stopwatch starts from the current total.
 */
const fetchInitialCodingTime = async () => {
  if (!sessionKey) {
    console.warn("Session key not set, cannot fetch initial coding time.");
    return;
  }
  try {
    const response = await axios.get(GET_ENDPOINT, {
      params: { token: sessionKey },
    });
    if (response.status === 200) {
      // Assuming the backend returns an object with a "daily_time" property (in milliseconds)
      totalCodingTime = response.data.daily_time || 0;
      console.log(`Fetched initial coding time: ${totalCodingTime}ms.`);
    } else {
      console.error(
        "Failed to fetch initial coding time:",
        response.statusText
      );
    }
  } catch (error) {
    console.error(
      "Error fetching initial coding time:",
      error.response?.data?.error || error.message
    );
  }
};

/**
 * Updates the real-time coding timer in the status bar.
 */
const updateTimer = () => {
  // Pause updating if the user is inactive.
  if (Date.now() - lastActivityTime > INACTIVITY_TIMEOUT) {
    console.log("User is inactive. Pausing stopwatch.");
    return;
  }

  totalCodingTime += 1000; // Increase overall coding time by 1 second
  const hours = Math.floor(totalCodingTime / (1000 * 60 * 60));
  const minutes = Math.floor(
    (totalCodingTime % (1000 * 60 * 60)) / (1000 * 60)
  );
  const seconds = Math.floor((totalCodingTime % (1000 * 60)) / 1000);

  statusBarTimerItem.text = `$(clock) Coding Time: ${hours}h ${minutes}m ${seconds}s (Last 24h)`;
  if (isStopwatchVisible) {
    statusBarTimerItem.show();
  }
};

/**
 * Toggles the visibility of the status bar stopwatch.
 */
const toggleStopwatchVisibility = () => {
  isStopwatchVisible = !isStopwatchVisible;
  if (isStopwatchVisible) {
    vscode.window.showInformationMessage("Stopwatch is now visible.");
    statusBarTimerItem.show();
  } else {
    vscode.window.showInformationMessage("Stopwatch is now hidden.");
    statusBarTimerItem.hide();
  }
  vscode.workspace
    .getConfiguration()
    .update(
      "codehours.showStopwatch",
      isStopwatchVisible,
      vscode.ConfigurationTarget.Global
    );
};

/**
 * Loads the stopwatch visibility state from the configuration.
 */
const loadStopwatchVisibility = () => {
  const config = vscode.workspace.getConfiguration();
  isStopwatchVisible = config.get("codehours.showStopwatch", true);
  if (!isStopwatchVisible) {
    statusBarTimerItem.hide();
  }
};

/**
 * Starts the real-time coding timer and the periodic language logging.
 */
const startTimer = () => {
  // Do not reset totalCodingTime here since it may have been fetched from the backend.
  // Update the status bar timer every second.
  timerIntervalId = setInterval(updateTimer, 1000);

  // Every TIMER_UPDATE_INTERVAL, log the current language's time (if the user is active).
  loggingIntervalId = setInterval(() => {
    const now = Date.now();
    if (now - lastActivityTime > INACTIVITY_TIMEOUT) {
      console.log("User inactive during logging interval. Resetting session.");
      languageStartTime = now; // Reset session so idle time is not logged
    } else {
      logCurrentLanguageTime();
    }
  }, TIMER_UPDATE_INTERVAL);
};

/**
 * Stops the real-time coding timer and the periodic logging.
 */
const stopTimer = () => {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  if (loggingIntervalId) {
    clearInterval(loggingIntervalId);
    loggingIntervalId = null;
  }
};

/**
 * Called when the extension is activated.
 * @param {vscode.ExtensionContext} context The extension context.
 */
const activate = (context) => {
  // Load stored session key and stopwatch visibility state.
  loadSessionKey();
  loadStopwatchVisibility();

  // Register command for setting the session key.
  const disposableSessionKeyCommand = vscode.commands.registerCommand(
    "codehours.setToken",
    async () => {
      await inputSessionKey();
    }
  );

  // Register command for toggling the stopwatch visibility.
  const disposableToggleStopwatchCommand = vscode.commands.registerCommand(
    "codehours.toggleStopwatch",
    toggleStopwatchVisibility
  );

  // Subscribe to document save and change events.
  const disposableSave = vscode.workspace.onDidSaveTextDocument(
    onDidSaveTextDocument
  );
  const disposableChange = vscode.workspace.onDidChangeTextDocument(
    onDidChangeTextDocument
  );

  // Initialize the status bar item for the timer.
  statusBarTimerItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(statusBarTimerItem);

  // Set the initial active language and start time.
  if (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document
  ) {
    currentLanguage = vscode.window.activeTextEditor.document.languageId;
    languageStartTime = Date.now();
  }

  // Fetch initial coding time (if a session key exists) before starting the timer.
  if (sessionKey) {
    fetchInitialCodingTime().then(() => {
      startTimer();
    });
  } else {
    // If no session key is set, simply start the timer (totalCodingTime will be 0).
    startTimer();
  }

  // Register disposables.
  context.subscriptions.push(
    disposableSessionKeyCommand,
    disposableToggleStopwatchCommand,
    disposableSave,
    disposableChange
  );
};

/**
 * Called when the extension is deactivated.
 */
const deactivate = () => {
  stopTimer();
  if (statusBarTimerItem) {
    statusBarTimerItem.dispose();
  }
};

module.exports = {
  activate,
  deactivate,
};
