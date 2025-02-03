# CodeHours Stopwatch Widget

A realtime stopwatch widget for the CodeHours webapp. This widget displays your coding time in a stopwatch format, updating in real time on your portfolio or personal website. It updates locally every second while polling your backend every 2 minutes for synchronization.

## Features

- **Realtime Stopwatch:** Updates every second while the user is coding.
- **Backend Sync:** Polls your backend every 2 minutes to sync the coding time.
- **Customizable:** Easily change the size (`small`, `medium`, `large`), text color, and display timespan (`daily` or `weekly`).
- **Framework Agnostic:** Works with vanilla HTML/CSS/JS as well as frontend frameworks like React and Vue via a custom HTML element.

## Installation

### 1. Deploy the Widget Script

Host the minified JavaScript file (`widget.min.js`) on a CDN or your own server. For example, if you deploy via Netlify, your file might be accessible at:
