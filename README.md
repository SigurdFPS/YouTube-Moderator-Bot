# YouTube Comment Cleaner

> ⚙️ Open-source YouTube comment moderation tool — built with Electron. Analyze and remove spammy bot-like comments from your videos with ease.

![AppScreenshot](https://github.com/user-attachments/assets/71b62ecd-6925-4a34-8e63-63857b7ea6b4)


---

## 📌 Overview

**YouTube Comment Cleaner** is a desktop application designed to help content creators protect their comment sections from spam, bot posts, and repetitive low-quality replies.

Built with [Electron](https://www.electronjs.org/), this tool uses the [YouTube Data API v3](https://developers.google.com/youtube/v3) to fetch and analyze comments, categorize them by spam-likelihood, and offer easy moderation controls — for both **Video** and **Live Chat**.

---

## 🧠 Features

- ✅ Authenticate securely with your YouTube account
- ✅ Fetch comments from any owned video
- ✅ Analyze live chat in real time and auto-delete spam
- ✅ Flag “Highly Likely” spam comments based on:
  - Repetitive phrases
  - Emoji overload
  - Generic bot-like praise
- ⚠️ Identify “Possible Spam” for manual review
- 📄 Export reports in `.txt` format with reason tagging
- 🧹 Delete flagged or reviewed comments
- 🧠 Customizable **blacklist filters** for both video and live chat
- 🔄 Auto-load `blacklist_live.json` and `blacklist_video.json`
- 💡 Live monitor logs displayed in real time
- 🎨 Theme + font settings saved between sessions

---

## 📸 Screenshot

> *(Replace this with an actual screenshot)*

![Screenshot](./assets/screenshot-full.png)

---

## 🚀 Getting Started

### 1. Clone this repository

```bash
git clone https://github.com/SigurdFPS/youtube-comment-cleaner.git
cd youtube-comment-cleaner

2. Install dependencies

npm install

3. Add your YouTube API credentials

Create a .env file in the root directory and copy the following:

YOUTUBE_CLIENT_ID=your-client-id-here
YOUTUBE_CLIENT_SECRET=your-client-secret-here

To obtain these:
	•	Visit Google Cloud Console
	•	Create a project and enable YouTube Data API v3
	•	Create OAuth 2.0 Client ID credentials (type: Desktop App)
	•	Download the credentials and paste client_id and client_secret into your .env file

⚠️ Ensure http://localhost is an authorized redirect URI.

⸻

4. Run the app

npm run dev

or build the installer:

npm run build


⸻

🧪 Usage Guide

📽️ Video Analysis
	1.	Click “Authorize YouTube”
	2.	Paste a YouTube video link you own
	3.	The bot will:
	•	Fetch all top-level comments
	•	Analyze them using your blacklist_video.json
	•	Categorize and display results
	•	Save a .txt report to /logs
	4.	Click:
	•	✅ Delete Highly Likely
	•	🧹 Delete Reviewed (manual approval)

🔴 Live Mode (Live Chat)
	1.	Start a YouTube livestream (must be live)
	2.	Click Start Live Monitor
	3.	The bot will:
	•	Fetch chat in real time
	•	Delete spam live based on blacklist_live.json
	•	Surface deleted/suspect logs in the UI
	4.	Click Stop Monitor to end

⸻

🧰 Custom Filters

You can edit or expand your spam filters directly in:

src/filters/blacklist_video.json
src/filters/blacklist_live.json

These files include:
	•	highSpamIndicators: phrases that mark a comment as spam
	•	weakReplies: short/generic replies to soft-flag

The UI now allows adding filters in-app and saving them.

⸻

📂 Folder Structure

/youtube-comment-cleaner/
├── src/
│   ├── main.js             # Electron main process
│   ├── preload.js          # Secure IPC bridge
│   ├── renderer.js         # UI logic & event handling
│   ├── bot.js              # Comment fetch + risk analysis
│   ├── auth.js             # YouTube OAuth flow
│   ├── reportGenerator.js  # Generates text reports
│   ├── logger.js           # Structured logging to file + UI
│   ├── liveChat.js         # Live chat polling & analysis
│   ├── filters/
│   │   ├── blacklist_video.json
│   │   └── blacklist_live.json
│
├── index.html              # Main UI layout
├── .env                    # Your YouTube OAuth credentials
├── tokens/user.json        # OAuth token storage (auto-generated)
├── logs/                   # Exported reports + logs


⸻

🛡 License

MIT License © 2025 SigurdFPS

Free to use, modify, and distribute.

⸻

🤝 Contributing

Pull requests and community forks are welcome!

To contribute:
	1.	Fork the repo
	2.	Create a new branch: feature/your-feature-name
	3.	Make your changes
	4.	Submit a PR

Want to suggest something big? Open an Issue and let’s talk.

⸻

🙋 FAQ

Q: Can I use this on other channels?
No. YouTube API only allows managing videos from the authorized account.

Q: Where are the logs and reports saved?
Inside the /logs/ directory next to the app or packaged EXE.

Q: Does this delete comments live?
Yes — both video and live chat deletions are fully implemented.

Q: Are filters customizable?
Yes! You can add/edit filters from the UI or directly in src/filters/*.json.

⸻

👤 Creator

Built by SigurdFPS — building tools for streamers, creators, and automation enthusiasts.

Follow me for more projects & guides:
https://github.com/SigurdFPS

⸻

⭐️ Star this repo if you found it helpful!
