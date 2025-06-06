# YouTube Comment Cleaner

> ⚙️ Open-source YouTube comment moderation tool — built with Electron. Analyze and remove spammy bot-like comments from your videos with ease.

![App Screenshot](./assets/screenshot.png) <!-- Replace with real screenshot path -->

---

## 📌 Overview

**YouTube Comment Cleaner** is a desktop application designed to help content creators protect their comment sections from spam, bot posts, and repetitive low-quality replies.

Built with [Electron](https://www.electronjs.org/), this tool uses the [YouTube Data API v3](https://developers.google.com/youtube/v3) to fetch and analyze comments, categorize them by spam-likelihood, and offer easy moderation controls.

---

## 🧠 Features

- ✅ Authenticate with your YouTube account securely
- ✅ Fetch comments from any video you own
- ✅ Flag “Highly Likely” spam comments based on:
  - Repetitive phrases
  - Emoji spam
  - Generic bot-like praise
- ⚠️ Identify “Possible Spam” for manual review
- 🔐 Count and preserve “Safe” comments
- 📄 Export reports in `.txt` format with reason tagging
- 🧹 Delete flagged comments with one click *(stubbed in open-source version)*
- 🔍 Transparent logs for every action

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

Create a file called credentials.json in the root directory.

You can get this by:
	•	Visiting: Google Cloud Console
	•	Creating a project and enabling YouTube Data API v3
	•	Creating OAuth 2.0 Client ID credentials (desktop)
	•	Download the JSON file and rename it to credentials.json

⚠️ Your app must use http://localhost as an authorized redirect URI.

4. Run the app

npm run dev


⸻

🧪 Usage Guide
	1.	Click “Authorize YouTube” and complete OAuth in your browser
	2.	Paste a YouTube video link you own
	3.	The bot will:
	•	Fetch all top-level comments
	•	Analyze them by risk level
	•	Display categorized results
	•	Save a .txt report in /logs
	4.	(Optional) Click moderation actions:
	•	Delete Highly Likely
	•	Delete Reviewed Comments

⸻

📂 Folder Structure

/youtube-comment-cleaner/
├── main.js                # Electron main process
├── preload.js             # Secure IPC bridge
├── renderer.js            # UI event logic
├── bot.js                 # Comment fetch + analysis
├── auth.js                # YouTube OAuth token logic
├── reportGenerator.js     # .txt report creation
├── logger.js              # Daily logs
├── index.html             # Main UI
├── /logs/                 # Saved analysis reports
├── credentials.json       # Your YouTube API secrets (DO NOT COMMIT)
├── tokens.json            # Auto-generated OAuth tokens


⸻

🛡 License

This project is MIT Licensed — free to use, modify, and distribute.

MIT License

Copyright (c) 2025 Sigurd

Permission is hereby granted...

See LICENSE file for full text.

⸻

🤝 Contributing

Pull requests and community forks are welcome!

How to contribute:
	1.	Fork the repository
	2.	Create a new branch (feature/something)
	3.	Make your changes
	4.	Submit a PR with a clear description

For larger features or discussions, feel free to open an Issue.

⸻

🙋 FAQ

Q: Does this app delete comments from other channels?
No. Due to YouTube API permissions, it only works with videos from the authorized user’s account.

Q: Where are the logs and reports saved?
In the logs/ directory next to the executable or source.

Q: Is deletion live in this version?
Currently, deletion buttons are stubbed. You can expand the logic with authenticated commentThreads.delete calls.

⸻

👤 Creator
Built by SigurdFPS — streaming tech, creator tooling, and open-source automation advocate.
Follow me for more tools & guides!

⸻

⭐️ Star this repo

If you find this project helpful, please consider giving it a ⭐️ — it helps visibility and supports further development!

---

### ✅ Next Steps (Optional)

- Generate `.gitignore` (ignore `tokens.json`, `logs/`, `node_modules/`)
- Add `assets/screenshot.png` for GitHub display
- (Optional) Enable `.env` support if you later externalize config

Let me know if you'd like help preparing the GitHub release zip or automated `.exe` export for sharing.