# 🔮 Jarvis — Cinematic AI Assistant (Self-Hosted)

A futuristic personal AI assistant with a cinematic dark-mode liquid-glass interface, voice-reactive organic orb, dual chat/terminal modes, and direct AI integration.

> **100% Self-Hosted & Cloud-Independent**: All proprietary platform dependencies have been removed. Jarvis runs entirely on your own machine or server with a local SQLite database, direct AI API keys (Google Gemini, OpenAI, Ollama, Nvidia), and personal security PIN clearance.

---

## ✨ Features

- **🌐 Liquid Glass Interface**: Translucent glassmorphic surfaces, soft blur, adaptive highlights, and dark cinematic atmosphere inspired by Apple Liquid Glass.
- **✨ Animated Jarvis Presence Orb**: Transparent, light-refracting organic orb that dynamically reacts to assistant states (`idle`, `listening`, `thinking`, `speaking`, `offline`) with customizable themes (*Aurora*, *Plasma*, *Glacier*, *Ember*).
- **🎙️ Voice Interaction & TTS**: Speaks responses aloud with customizable synthetic voice tones and speeds (*Atlas*, *Nova*, *Orion*, *Lumen*), along with voice dictation input.
- **💬 Dual Interaction Modes**:
  - **Chat Interface**: Clean conversation cards for daily queries and multimodal tasks.
  - **Developer Terminal**: Monospaced code-first terminal mode with syntax highlighting, copy controls, and retry options.
- **📁 Multimodal Intelligence**: Upload images, documents, and code files for analysis directly with Gemini or OpenAI.
- **💾 Local SQLite Database**: Powered by Drizzle ORM and stored locally in `./data/jarvis.db` — zero external databases or Docker required.
- **🔒 Personal Single-User / PIN Mode**: Secure your assistant with a custom master PIN or leave it open for instant access.
- **🤖 Multi-Provider AI Support**:
  - **Google Gemini** (Recommended — free & fast multimodal inference)
  - **Ollama** (100% offline, private, and runs locally on your PC/GPU)
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`)
  - **NVIDIA NIM** (`Nemotron 3 Nano Omni 30B`)
  - **Custom OpenAI-compatible endpoints** (vLLM, LocalAI, OpenRouter, Groq)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/jarvis-ai.git
cd jarvis-ai
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your AI model key:

```env
# Get a free API key at https://aistudio.google.com/
GEMINI_API_KEY="your-gemini-api-key"

# Optional: Set a security PIN (leave blank for open access)
JARVIS_PIN=""

# Database location (auto-created on first run)
DATABASE_URL="file:./data/jarvis.db"
```

### 3. Run the Development Server

```bash
npm run dev
```

Visit [`http://localhost:3000`](http://localhost:3000) in your browser.

---

## 🛠️ Configuration & AI Providers

Jarvis supports multiple AI backends configurable via `.env`:

| Provider | Environment Variable | Recommended Models | Description |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `GEMINI_API_KEY` | `gemini-2.5-flash`, `gemini-1.5-pro` | Default recommended. Free tier, fast streaming, vision support. |
| **Ollama** | `OLLAMA_BASE_URL` | `llama3.2`, `mistral`, `deepseek-r1` | 100% local and offline. Runs directly on your machine. |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o`, `gpt-4o-mini` | Official OpenAI models. |
| **NVIDIA** | `NVIDIA_API_KEY` | `nvidia/nemotron-3-nano-omni-30b` | High-speed cloud reasoning models. |
| **Custom** | `AI_BASE_URL` | Any OpenAI-compatible model | Works with Groq, Together AI, OpenRouter, or vLLM. |

---

## 🗄️ Database & Data Storage

All data is stored locally in the `./data/` folder:
- **`./data/jarvis.db`**: Local SQLite database containing conversation history, tasks, and system events.
- **`./data/uploads/`**: Uploaded attachments and media files.

No external PostgreSQL, Supabase, or cloud database setup is required. The database tables are automatically initialized on first startup.

To inspect or migrate the database with Drizzle Kit:

```bash
npx drizzle-kit studio
```

---

## 🚢 Production Deployment

### Build

```bash
npm run build
npm run preview
```

### Deploy to Docker or VPS

You can deploy Jarvis to any Docker container or VPS (Ubuntu, Debian, etc.):

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## 📄 License

MIT License. Free to use, modify, and self-host.
