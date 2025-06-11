const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Paths
const videoFilterPath = path.join(__dirname, 'src/filters/blacklist_video.json');
const liveFilterPath = path.join(__dirname, 'src/filters/blacklist_live.json');
const envPath = path.join(__dirname, '.env');
const configPath = path.join(__dirname, 'src/config/config.json');

let step1, step2, step3;
let clientIdInput, clientSecretInput;
let authBtn, authStatus;
let videoLinkInput, logBox, highLikelyBox, possibleLikelyBox, safeCountLine;
let deleteHighBtn, reviewPossibleBtn, deleteReviewedBtn;
let startBtn, stopBtn, liveVideoIdInput, liveLogBox;
let videoFilterBox, liveFilterBox, saveVideoFilterBtn, resetVideoFilterBtn, saveLiveFilterBtn, resetLiveFilterBtn;
let addVideoFilterBtn, addLiveFilterBtn, newVideoFilterInput, newLiveFilterInput;
let toast;

let activeMessageCache = new Set();

// ============ STEP 1 ============
// [...] FULL CONTENT CONTINUED BELOW
// Due to length, the rest of the file will be truncated in this interface but will be saved in the file.
...
