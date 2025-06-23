/**
 * CodeHours Stopwatch Widget
 * Version: 1.0
 * Description: A realtime stopwatch that counts coding time. It updates locally every second
 *              and polls your backend every 2 minutes to sync the coding time data.
 */

class CodeHoursStopwatch extends HTMLElement {
  // Tell the component which attributes to observe for changes.
  static get observedAttributes() {
    return ["size", "color", "font", "fontUrl", "dataTimeSpan", "user"];
  }

  constructor() {
    super();
    // Attach a shadow DOM to encapsulate styles and markup.
    this.attachShadow({ mode: "open" });

    // Widget state
    this.totalTime = 0; // Total coding time in seconds
    this.isCoding = false; // Whether the user is actively coding
    this.lastUpdateTimestamp = null;
    this.localTimer = null;
    this.pollingTimer = null;
  }

  connectedCallback() {
    // Initial render with a loading state.
    this.render();

    // Fetch initial coding time data from the backend.
    this.initializeData();

    // Start the local timer to update the display every second.
    this.localTimer = setInterval(() => {
      if (this.isCoding) {
        this.totalTime += 1;
        this.updateDisplay();
      }
    }, 1000);

    // Poll the backend every 2 minutes to update/sync coding time.
    this.pollingTimer = setInterval(() => {
      this.fetchCodingTime();
    }, 2 * 60 * 1000);
  }

  disconnectedCallback() {
    // Clean up timers when the element is removed.
    if (this.localTimer) clearInterval(this.localTimer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // When customization attributes change, update the display.
    this.updateDisplay();
  }

  async initializeData() {
    await this.fetchCodingTime();
  }

  async fetchCodingTime() {
    const user = this.getAttribute("user");
    if (!user) {
      console.error("CodeHoursStopwatch: 'user' attribute is required.");
      return;
    }

    const timespan = this.getAttribute("dataTimeSpan") || "daily";

    try {
      // Use production endpoint instead of localhost
      const response = await fetch(
        `https://codehours.onrender.com/api/codingTime?user=${user}&timespan=${timespan}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Parse new values
      const newTotalTime = Math.floor(data.totalTime / 1000);
      const newIsCoding = data.isCoding;

      // Only update if the values have changed
      if (newTotalTime !== this.totalTime || newIsCoding !== this.isCoding) {
        this.totalTime = newTotalTime;
        this.isCoding = newIsCoding;
        this.lastUpdateTimestamp = new Date(data.lastUpdated);

        // Update the display immediately
        this.updateDisplay();
      }
    } catch (error) {
      console.error("CodeHoursStopwatch: Error fetching coding time", error);
      // Set a fallback state on error
      this.isCoding = false;
      this.updateDisplay();
    }
  }

  formatTime(seconds) {
    // Convert seconds to a HH:MM:SS format.
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }

  updateDisplay() {
    // Retrieve customization attributes.
    const size = this.getAttribute("size");
    const textColor = this.getAttribute("color") || "#000";
    const font = this.getAttribute("font");
    const fontUrl = this.getAttribute("fontUrl");
    const timespan = this.getAttribute("dataTimeSpan") || "daily"; // Options: daily, weekly

    // Format the current total coding time.
    const formattedTime = this.formatTime(this.totalTime);

    // Load custom font if URL is provided
    const fontFace = fontUrl
      ? `@font-face {
          font-family: 'userFontByUrl';
          src: url('${fontUrl}');
        }`
      : "";

    // Update the shadow DOM markup with styles and content.
    this.shadowRoot.innerHTML = `
        <style>
        ${fontFace}
          .stopwatch {
            font-size: ${size};
            color: ${textColor};
            font-family: ${
              font
                ? `'${font}', sans-serif`
                : fontUrl && "'userFontByUrl', sans-serif"
            }
            display: inline-block;
          }
        </style>
        <div class="stopwatch">
          ${formattedTime}
        </div>
      `;
  }

  render() {
    // Initial content (loading state)
    this.shadowRoot.innerHTML = `<div class="stopwatch">Loading...</div>`;
  }
}

// Register the custom element so it can be used as <codehours-stopwatch>.
customElements.define("codehours-stopwatch", CodeHoursStopwatch);
