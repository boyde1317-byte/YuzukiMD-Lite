# Yuzuki MD v2 🐋

> **WhatsApp Multi-Device Bot** — built on [Baileys](https://github.com/WhiskeySockets/Baileys), upgraded with AI, media tools, group protection, and a full user economy system.

---

## ✨ What's New in V2 / V3

> **Latest updates (June 2025):**
> - 🎨 All media assets (`.jpg`, `.png`, `.mp4`, `.mp3`, `.webp`) migrated to **GitHub Releases CDN** — repo is now ~3 MB lighter and fully URL-based
> - ⚡ Migrated from custom `socketon` fork to **official `@whiskeysockets/baileys` v6** — pairing code, buttons, and all features remain fully working
> - 📄 New `src/assets.js` — single-file URL map for all 27 media constants, easy to update

| Feature | V1 | V2 | V3 (Yuzuki Merge) |
|---|---|---|---|
| AI Assistants | ❌ | ✅ GPT · Claude · Gemini | ✅ |
| Media Downloaders | ❌ | ✅ TikTok · IG · YouTube · Spotify | ✅ |
| Group Protection | ❌ | ✅ Anti-link · Toxic filter · Warn/Kick | ✅ |
| User Database | ❌ | ✅ Levels · XP · Money · Premium | ✅ |
| Sticker / Image Tools | ❌ | ✅ Sticker · BRAT · QR Code · Pinterest | ✅ |
| Rate Limiting & Security | ❌ | ✅ Per-user & per-command limiters | ✅ |
| Reseller System | ❌ | ✅ Keys · Resellers · Limits | ✅ |
| Interactive Messages | ❌ | ❌ | ✅ NativeFlowCard · ButtonV2 · ListMessage |
| Fake Contact Cards | ❌ | ❌ | ✅ vCard bubbles with any name/number |
| Fake Reply Trick | ❌ | ❌ | ✅ Reply to custom quoted text |
| Poll Creator | ❌ | ❌ | ✅ Up to 12 options |
| Image Carousel | ❌ | ❌ | ✅ Swipeable up to 6 images |
| Fake Location | ❌ | ❌ | ✅ 8 preset cities + custom GPS |
| Disappearing Messages | ❌ | ❌ | ✅ 24h / 7d / 90d auto-delete |
| Voice Note Trick | ❌ | ❌ | ✅ Send any audio as PTT bubble |
| GIF Video | ❌ | ❌ | ✅ Auto-playing GIF from video URL |
| Typing Indicator | ❌ | ❌ | ✅ Composing / Recording presence |
| Carbon Code Screenshot | ❌ | ❌ | ✅ Syntax-highlighted PNG |
| OTP Card | ❌ | ❌ | ✅ Canvas digit-box OTP |
| Round Profile Pic | ❌ | ❌ | ✅ 512px circular avatar |
| Mass Broadcast | ❌ | ❌ | ✅ JPM NativeFlow broadcast |
| RPG System | ❌ | ❌ | ✅ Adventure · Fishing · Mining · Shop |
| Deploy Platforms | Pterodactyl only | ✅ Railway · Render · Fly.io · Docker | ✅ |

---

## 📁 Project Structure

```
Yuzuki-Md-V2/
├── src/
│   ├── index.js          # Entry point & process guards
│   ├── bot.js            # Baileys connection + pairing code + sticker trigger hook
│   ├── commands.js       # All command handlers (native + plugin fallback)
│   ├── assets.js         # URL map for all media assets (GitHub Releases CDN)
│   ├── menu.js           # Menu builder (categories + list view)
│   ├── menuImage.js      # Image-based menu renderer
│   ├── settings.js       # JSON settings store (prefix, owners, keys…)
│   ├── server.js         # HTTP keep-alive server
│   ├── lib/
│   │   ├── database.js       # User DB (levels, XP, money, limits)
│   │   ├── maker.js          # Sticker / BRAT / QR code maker
│   │   ├── protect.js        # Anti-link & toxic word detector
│   │   ├── plugin-loader.js  # Auto-discovers & loads src/plugins/**/*.js
│   │   ├── yuzuki-compat.js   # Wraps Yuzuki APIs for Yuzuki plugin format
│   │   ├── yuzuki-builder.js # NativeFlowCard · ButtonV2 · ListMessage builders
│   │   ├── msg-tricks.js     # Forwarding score · ad-reply · newsletter context
│   │   ├── msg-types.js      # vCard · poll · location · reaction · ephemeral · carousel · PTT · GIF · typing
│   │   ├── carbon.js         # Carbon-style code screenshot generator
│   │   ├── profile-picture.js# Cached PP fetch · buffer retrieval · round avatar
│   │   ├── level-card.js     # Canvas EXP bar level-up card
│   │   ├── jpm.js            # Mass broadcast (JPM) with NativeFlow card
│   │   ├── otp-card.js       # Canvas OTP digit-box card
│   │   ├── sticker-trigger.js# EXIF-based sticker command router
│   │   └── scrape/
│   │       ├── tiktok.js
│   │       ├── instagram.js
│   │       ├── youtube.js
│   │       ├── spotify.js
│   │       ├── pinterest.js
│   │       ├── dafont.js
│   │       ├── mathgpt.js
│   │       ├── feloai.js
│   │       └── chatexai.js
│   ├── plugins/              # Auto-loaded Yuzuki-format plugins (58 total)
│   │   ├── canvas/           # carbon · otp · qrcustom · ssweb
│   │   ├── dl/               # capcut · facebook · githubdl
│   │   ├── fun/              # bucin · cek* · confess · jodoh · mimpi · rate
│   │   ├── games/            # dicegame · tictactoe · werewolf
│   │   ├── rpg/              # adventure · fishing · hunting · mining · heal · shop · pet · inventory
│   │   ├── search/           # google · lyrics2
│   │   ├── store/            # addlist · buy · storelist (NativeFlow carousel)
│   │   └── tools/            # fakecontact · fakereply · fakeloc · poll · typing · disappear
│   │                         # carousel · ptt · stickerinfo · otp · ppround · tempmail · ocr
│   └── utils/
│       ├── backup.js     # Data backup utility
│       └── security.js   # Rate limiter & concurrency limiter
├── data/                 # Auto-created — settings, DB, groups
├── bot_session/          # Auto-created — WhatsApp session files
├── Dockerfile
├── fly.toml
├── railway.toml
├── render.yaml
├── egg-whatsapp-bot.json
└── package.json
```

---

## 🚀 Deployment

### 🐳 Docker
```bash
docker build -t yuzuki-md-v2 .
docker run -e PHONE_NUMBER=628123456789 yuzuki-md-v2
```

### 🚂 Railway
1. Fork this repo
2. Create a new Railway project → **Deploy from GitHub**
3. Add environment variables (see below)
4. Railway auto-deploys on push

### 🎨 Render
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect this repo — Render will detect `render.yaml` automatically
3. Add environment variables
4. Deploy

### ✈️ Fly.io
```bash
fly launch   # detects fly.toml automatically
fly secrets set PHONE_NUMBER=628123456789
fly deploy
```

### 🦖 Pterodactyl
1. Admin panel → **Nests → Import Egg** → upload `egg-whatsapp-bot.json`
2. Create a new server using the *WhatsApp Baileys Bot* egg
3. Set `PHONE_NUMBER` in server variables
4. Upload all files (excluding `node_modules/`)
5. Run install script → start server
6. A **pairing code** will appear in the console
7. WhatsApp → **Settings → Linked Devices → Link with phone number** → enter code

### 💻 Local
```bash
npm install
PHONE_NUMBER=628123456789 node src/index.js
```
> Requires **Node.js 20+**

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PHONE_NUMBER` | ✅ | Your WhatsApp number, digits only (e.g. `628123456789`) |
| `OPENAI_API_KEY` | Optional | Enables GPT commands |
| `ANTHROPIC_API_KEY` | Optional | Enables Claude commands |
| `GEMINI_API_KEY` | Optional | Enables Gemini commands |
| `LOG_LEVEL` | Optional | `info` (default) · `debug` · `warn` |

---

## 🤖 AI Commands

> Requires the corresponding API key set in environment variables.

| Command | Description |
|---|---|
| `.gpt <text>` | Chat with OpenAI GPT |
| `.claude <text>` | Chat with Anthropic Claude |
| `.gemini <text>` | Chat with Google Gemini |
| `.mathgpt <equation>` | Solve math problems with AI |
| `.feloai <text>` | Felo AI assistant |
| `.chatex <text>` | ChatEx AI assistant |

---

## 📥 Media Downloader Commands

| Command | Description |
|---|---|
| `.tiktok <url>` | Download TikTok video |
| `.ig <url>` | Download Instagram media |
| `.ytmp3 <url>` | Download YouTube audio (MP3) |
| `.ytmp4 <url>` | Download YouTube video (MP4) |
| `.spotify <url>` | Download Spotify track |
| `.spsearch <query>` | Search Spotify |

---

## 🎨 Image & Sticker Tools

| Command | Description |
|---|---|
| `.sticker` | Convert image/video to sticker (reply to media) |
| `.brat <text>` | Make a BRAT-style image |
| `.bratvid <text>` | Make an animated BRAT GIF |
| `.qc <text>` | Generate a quote card |
| `.qr <text>` | Generate a QR code |
| `.pinterest <query>` | Search Pinterest images |
| `.dafont <query>` | Search Dafont fonts |

---

## 🛡️ Group Protection

| Command | Description |
|---|---|
| `.antilink on/off` | Block all links in the group |
| `.antilink gc` | Block WhatsApp group invite links |
| `.antilink tt/ig/yt/fb/tw` | Block platform-specific links |
| `.antilink toxic` | Block custom toxic/bad words |
| `.antilinkaction warn/kick/silent` | Set action on detection |
| `.antilinkwarn <n>` | Set warn limit before kick |
| `.warn @user` | Manually warn a user |
| `.resetwarn @user` | Reset a user's warn count |
| `.welcome on/off` | Toggle welcome messages |

---

## 👥 User Economy & Limits

Every user has a profile with: **Level · XP · Money · Bank · Health · Daily Limits**

| Command | Description |
|---|---|
| `.register` | Register your account |
| `.profile` | View your profile |
| `.balance` | Check money & bank |
| `.daily` | Claim daily reward |
| `.limit` | Check remaining command limit |
| `.buylimit <n>` | Buy extra limits |
| `.mining` | Mine for coins |
| `.transfer @user <amount>` | Send money to a user |

---

## 🔑 Owner Commands

| Command | Description |
|---|---|
| `.setprefix <p>` | Change command prefix |
| `.setowner <number>` | Set primary owner number |
| `.addowner <number> [name]` | Add an owner |
| `.delowner <number>` | Remove an owner |
| `.listowners` | List all owners |
| `.addreseller <number>` | Add a reseller |
| `.delreseller <number>` | Remove a reseller |
| `.addkey <key>` | Add an access key |
| `.delkey <key>` | Remove a key |
| `.setlimit <cmd> <cost>` | Set a command's limit cost |
| `.addcase <trigger> <response>` | Add a custom auto-reply |
| `.delcase <trigger>` | Delete a custom auto-reply |
| `.listcases` | List all custom cases |
| `.setmode private/public` | Set bot to private or public |
| `.antidelete on/off` | Toggle anti-delete |
| `.autoblock on/off` | Auto-block unknown numbers |
| `.gconly on/off` | Groups-only mode |
| `.restart` | Restart the bot |
| `.clearsession` | Clear WhatsApp session |

---

## 🛠️ General Commands

| Command | Description |
|---|---|
| `.menu` | Show command list |
| `.ping` | Check if bot is alive |
| `.alive` | Bot status |
| `.uptime` | How long the bot has been running |
| `.owner` | Show owner info |
| `.speed` | Latency test |
| `.vpsinfo` | Server specs |
| `.totalcmds` | Count of custom cases |

---

## 🎨 Yuzuki UI/UX Merge — WhatsApp Message Tricks (v3)

> All ported from Yuzuki MD. Existing Yuzuki features enhanced where applicable.
> No original Yuzuki code was overwritten — all new features are additive.

### 📇 Contact Cards
| Command | Description |
|---|---|
| `.fakecontact <name> \| <number> [\ | <org>]` | Send a fake vCard contact bubble with any name/number |

### 💬 Message Style Tricks
| Command | Description |
|---|---|
| `.fakereply <quoted> \| <reply> [\ | <sender>]` | Reply to a custom fake quoted message |
| `.type <message>` | Show typing indicator then send message |
| `.record <message>` | Show voice-recording indicator then send message |
| `.disappear <message> [\| 24h\|7d\|90d]` | Send an auto-deleting (ephemeral) message |

### 📊 Interactive Messages
| Command | Description |
|---|---|
| `.poll <question> \| opt1 \| opt2 [...]` | Create a WhatsApp poll (up to 12 options) |
| `.carousel <url1> \| <url2> [:: header]` | Send a swipeable image carousel (up to 6 images) |

### 📍 Location
| Command | Description |
|---|---|
| `.fakeloc <city>` | Send a preset fake location pin (tokyo, paris, dubai, bali…) |
| `.fakeloc <lat>,<lng> [\| name]` | Send a custom GPS coordinate location |

### 🎙️ Audio & Video Tricks
| Command | Description |
|---|---|
| `.ptt <audio URL>` | Send audio URL as a voice note (PTT) bubble |
| `.gif <video URL>` | Send video as an auto-playing GIF |

### 🖼️ Canvas & Visual Tools (v2)
| Command | Description |
|---|---|
| `.carbon [code]` | Generate a Carbon-style syntax-highlighted code screenshot |
| `.otp [length]` | Generate an OTP verification card (4–8 digits) |
| `.ppround [@user]` | Get circular profile picture (512px) |

### 🏪 Store (Enhanced)
| Command | Description |
|---|---|
| `.storelist` | Browse store with NativeFlow dropdown (4+ items) or CTA copy buttons (1–3 items) |

### 📢 Owner Broadcast (Enhanced)
| Command | Description |
|---|---|
| `.jpm <message>` | Broadcast styled NativeFlow card to all registered users |
| `.announce <text>` | Send announcement card with newsletter/channel styling |
| `.forward <text>` | Send as "forwarded many times" (viral style) |

### 🏷️ Sticker System (Enhanced)
| Command | Description |
|---|---|
| `.stickerinfo` | Read EXIF metadata from a replied sticker |

> **Sticker Trigger Router**: Any sticker with a `command` field in its EXIF data will auto-fire the matching bot command when sent.

---

## 🖼️ Media Assets — URL-Based CDN

All images, audio, and video used by the bot are hosted on **GitHub Releases** (not bundled in the repo).
This keeps the repository lightweight and clones fast.

| File | Purpose |
|---|---|
| `src/assets.js` | Central URL map — import `ASSETS.XXX` anywhere |
| `v1.0-assets` release | All 27 media files hosted as public release assets |

**Base URL:** `https://github.com/boyde1317-byte/YuzukiMD-Lite/releases/download/v1.0-assets/`

To update or replace a media file:
1. Upload the new file as a release asset (or create a new `v1.x-assets` release)
2. Update the URL in `src/assets.js`

> **Note:** 5 files (`yuzuki.png`, `yuzuki-mp4.mp4`, `yuzuki-mp3.mp3`, `yuzuki-daftar.png`, `yuzuki-store.png`) were empty placeholders in the original repo — replace their URLs in `src/assets.js` when you have the real files.

---

## 🏗️ Architecture — UI Trick Libraries

| File | What It Does |
|---|---|
| `src/lib/yuzuki-builder.js` | `NativeFlowCard`, `ButtonV2`, `ListMessage` fluent builders |
| `src/lib/msg-tricks.js` | Forwarding score, ad-reply preview, newsletter context injection |
| `src/lib/msg-types.js` | All message types: vCard, location, poll, reaction, ephemeral, carousel, PTT, GIF, typing |
| `src/lib/carbon.js` | Carbon-style code screenshot (canvas) |
| `src/lib/profile-picture.js` | Cached PP fetch, buffer retrieval, round avatar crop |
| `src/lib/level-card.js` | Canvas EXP bar level-up notification card |
| `src/lib/jpm.js` | Mass broadcast with progress reporting |
| `src/lib/otp-card.js` | Canvas OTP digit-box card |
| `src/lib/sticker-trigger.js` | EXIF-based sticker command router |

---

## 🗃️ Tech Stack

- **Runtime**: Node.js 20+, ESM (`"type": "module"`)
- **WhatsApp**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v6 (official — migrated from custom fork)
- **AI**: OpenAI SDK · Anthropic SDK · Google Generative AI
- **Media**: `@distube/ytdl-core` · `sharp` · `@napi-rs/canvas` · `fluent-ffmpeg`
- **Auth**: Pairing code (no QR scan required)
- **Storage**: JSON flat-file (`data/settings.json`, `data/database.json`, `data/groups.json`)
- **Logging**: `pino` + `chalk` pretty logger

---

## 📝 License

MIT — use freely, credit appreciated.
