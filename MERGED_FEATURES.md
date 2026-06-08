# 🚀 Yuzuki MD V2 + Yuzuki MD Features Merge

This is an enhanced version of **Yuzuki MD V2** with **48+ plugins** ported from **Yuzuki MD 3**, plus **9 WhatsApp UI tricks** ported from Yuzuki's advanced message system — all without touching any existing Yuzuki code.

---

## 🎨 WhatsApp UI Tricks (v2 — NEW)

### 1. NIXCODE Interactive Message Builder (`src/lib/yuzuki-builder.js`)
Fluent builder classes for WhatsApp's richest message types:
| Class / Helper | Description |
|---|---|
| `NativeFlowCard` | Interactive cards with CTA URL, quick-reply, copy, dropdown buttons |
| `ButtonV2` | Legacy buttonsMessage (up to 3 buttons) with thumbnail support |
| `ListMessage` | WhatsApp list message with multi-section rows |
| `sendInteractive()` | Quick helper — NativeFlow card in one call |
| `sendButtons()` | Quick helper — ButtonV2 in one call |
| `sendList()` | Quick helper — List message in one call |

### 2. Message Serialization Tricks (`src/lib/msg-tricks.js`)
| Function | Description |
|---|---|
| `sendForwarded()` | Make messages appear "forwarded many times" (viral look) |
| `sendAdReply()` | Fake link-preview cards with custom thumbnail + source URL |
| `sendNewsletterStyle()` | Messages that look like they came from a WA Channel |
| `sendAnnouncementCard()` | Full announcement: thumbnail + interactive CTA + newsletter context |
| `sendPremiumStyle()` | Messages with undocumented `premium:1` flag |

**New owner commands:** `.jpm`, `.announce`, `.forward`

### 3. Carbon Code Screenshots (`.carbon`)
- Syntax-highlighted code → dark-themed PNG image
- Supports JS/TS/Python/Java/C++/HTML/CSS
- Auto-detects language from `// filename.ext` comment
- Reply to a code message with `.carbon`

### 4. Enhanced Profile Picture System (`src/lib/profile-picture.js`)
- **15-minute cache** — no repeated API calls
- **Buffer retrieval** with auto-fallback to default avatar
- **`makeRoundAvatar()`** — circular crop PNG output
- **`drawCircleAvatar()`** — draw onto canvas with border + shadow
- Enhanced `.pp` command with round output
- New `.ppround` command — 512px circular avatar

### 5. Level-Up Notification Cards (`.adventure`, `.fishing`, etc.)
Canvas card sent on every level-up:
- Gradient dark background + gold accent
- Circular avatar with orange border
- EXP bar with gradient fill
- Newsletter/forwarded context for viral appearance

### 6. JPM Mass Broadcast (`.jpm`)
- Owner command: `.jpm <message>`
- Sends styled NativeFlow card to **every registered user**
- Includes newsletter context + configurable CTA button
- Progress report on completion: ✅ sent / ❌ failed / 👥 total
- Existing `.broadcast` upgraded to use NativeFlowCard builder

### 7. Enhanced Store Product Cards (`.storelist`)
- **Dropdown select list** for 4+ products (single_select button)
- **CTA copy buttons** for 1–3 products (copy product ID instantly)
- Footer reminder: `Use .buy <id> to purchase`

### 8. Sticker Command System (`.stickerinfo`)
- `.stickerinfo` — reads all EXIF metadata from any sticker
- **Sticker trigger router** (`src/lib/sticker-trigger.js`) — if a sticker has a command embedded in its EXIF `command` field, it auto-fires the matching plugin
- Hooks into `bot.js` message handler

### 9. OTP Verification Cards (`.otp`)
- `.otp [length]` — generates a 4–8 digit OTP
- Canvas card with individual digit boxes, gradient background, expiry note
- OTP code also shown in caption for easy copying

---

## ✨ Original Yuzuki Plugins (48)

### 🎭 Fun & Personality (16 plugins)
| Command | Description |
|---------|-------------|
| `.cekkhodam` | Check your inner guardian spirit |
| `.cekberat` | Check your virtual weight |
| `.cekganteng` | Check handsomeness level |
| `.cekcantik` | Check beauty level |
| `.cekbucin` | Check simp level |
| `.cekgamer` | Check gamer level |
| `.cekkaya` | Check wealth (based on RPG coins) |
| `.cekwibu` | Check weeb/otaku level |
| `.ceksabar` | Check patience level |
| `.cekhoki` | Check today's luck |
| `.confess` | Send anonymous confession |
| `.jodoh` | Check compatibility between two people |
| `.bucin` | Get romantic/simp quotes |
| `.rate` | Rate something out of 10 |
| `.mimpi` | Dream interpretation |

### ⚔️ RPG System (12 plugins)
| Command | Description |
|---------|-------------|
| `.adventure` | Go on an adventure for EXP and coins |
| `.fishing` | Fish for sea creatures |
| `.hunt` | Hunt wild animals |
| `.mine` | Mine for ores and gems |
| `.heal` | Restore HP using coins |
| `.inventory` | View your RPG inventory |
| `.shop` | Browse and buy RPG items |
| `.sellall` | Sell all inventory items |
| `.pet` | Adopt and manage a pet |
| `.daily2` | Claim daily rewards |
| `.beg` | Beg for coins |
| `.work2` | Work a job for salary |

### 🎨 Canvas / Maker (6 plugins)
| Command | Description |
|---------|-------------|
| `.fakebankjago` | Generate fake Bank Jago screenshot |
| `.fakecall` | Generate fake incoming call screenshot |
| `.toblack` | Convert image to black & white |
| `.tochibi` | Chibi style transform (placeholder) |
| `.gura` | Apply Gura-style overlay |
| `.iqc2` | Generate IQ check card |

### 🎮 Games (3 plugins)
| Command | Description |
|---------|-------------|
| `.werewolf` | Play mini werewolf game |
| `.tictactoe2` | Play Tic-Tac-Toe vs bot |
| `.dicegame` | Roll dice and win coins |

### 🏪 Store System (3 plugins)
| Command | Description |
|---------|-------------|
| `.addlist` | Add product to store (owner only) |
| `.storelist` | Browse store products |
| `.buy` | Purchase a product |

### 📥 Additional Downloaders (3 plugins)
| Command | Description |
|---------|-------------|
| `.capcut` | Download CapCut video |
| `.fbdl` | Download Facebook video |
| `.githubdl` | Download GitHub repo as ZIP |

### 🔍 Search (2 plugins)
| Command | Description |
|---------|-------------|
| `.google2` | Google search |
| `.lyrics2` | Search song lyrics |

### 🛠️ Tools (4 plugins)
| Command | Description |
|---------|-------------|
| `.ocr2` | Extract text from image |
| `.tempmail` | Generate temporary email |
| `.ssweb2` | Website screenshot |
| `.qrcustom` | Generate custom QR code |

---

## 🏗️ Architecture

### Plugin System
- **Plugin Loader**: `src/lib/plugin-loader.js` — dynamically discovers and loads plugins from `src/plugins/`
- **Compatibility Layer**: `src/lib/yuzuki-compat.js` — wraps Yuzuki APIs into Yuzuki's `m`-style message API
- **Plugins**: 51 plugins across 10 categories in `src/plugins/`

### UI Trick Libraries (v2 — NEW)
| File | Purpose |
|---|---|
| `src/lib/yuzuki-builder.js` | NativeFlowCard, ButtonV2, ListMessage builders |
| `src/lib/msg-tricks.js` | forwardingScore, externalAdReply, newsletter context |
| `src/lib/carbon.js` | Carbon-style code screenshot generator |
| `src/lib/profile-picture.js` | Cached PP fetch, buffer retrieval, round avatar |
| `src/lib/level-card.js` | Canvas level-up card with EXP bar |
| `src/lib/jpm.js` | Mass broadcast to all users |
| `src/lib/otp-card.js` | OTP digit-box canvas card |
| `src/lib/sticker-trigger.js` | EXIF-based sticker command router |

### Integration Points (non-invasive)
1. `src/bot.js` — `loadPlugins()` on startup + sticker trigger hook
2. `src/commands.js` — plugin fallback + new `.jpm` / `.announce` / `.forward` / `.ppround` commands; `.broadcast` & `.pp` enhanced
3. `src/menu.js` — owner menu: jpm/announce/forward; canvas: carbon/otp/ppround; tools: carbon/stickerinfo/otp/ppround

---

## 📦 Assets
All Yuzuki visual assets in `src/assets/yuzuki/`:
- Images: menu backgrounds, level-up cards, game screens
- Audio: `yuzuki-mp3.mp3`
- Video: `yuzuki-mp4.mp4`
- Fonts: `yuzuki-font.ttf`, `Epep.ttf`, `Levelup.ttf`, `Zahraaa.ttf`, `arialnarrow.ttf`

---

## 🚀 Usage

```bash
npm install
npm start
```

### New commands (v2)
```
.carbon <code>     # Code → dark-themed screenshot
.otp [length]      # Generate OTP verification card
.ppround [@user]   # Circular avatar image
.stickerinfo       # Read sticker EXIF metadata
.jpm <message>     # Owner: broadcast to all users (interactive card)
.announce <text>   # Owner: announcement card with newsletter style
.forward <text>    # Owner: send as "forwarded many times"
.storelist         # Upgraded interactive store with dropdown/copy buttons
```

---

*Merged with care — all original Yuzuki features preserved.*
