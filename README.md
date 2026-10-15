# Dolly

Terminal CLI that turns a natural-language request into a small **C** program, **cross-compiles** it for Android `aarch64`, and **deploys it over USB** with `adb`.

Portuguese-friendly prompts are welcome in the REPL.

## Requirements

| Tool | Why |
|------|-----|
| **Node.js 20+** | Run the CLI |
| **Android NDK** | Cross-compile with `aarch64-linux-android*-clang` |
| **adb** (platform-tools) | USB deploy |
| **Anthropic or OpenAI API key** | Generate C (not needed for `deploy-sample`) |
| Android tablet/phone | USB debugging enabled |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/pmateiro/dolly.git
cd dolly
npm install
```

### 2. USB debugging on the tablet

1. Enable **Developer options** (tap Build number 7×).
2. Turn on **USB debugging**.
3. Plug in USB; accept **Allow USB debugging** on the device.
4. Verify:

```bash
adb devices
# expect: <serial>    device
```

If you see `unauthorized`, unlock the tablet and accept the prompt.

### 3. Install adb

- [Android platform-tools](https://developer.android.com/tools/releases/platform-tools)
- macOS: `brew install android-platform-tools`

### 4. Install Android NDK

Install via [Android Studio SDK Manager](https://developer.android.com/studio) or standalone NDK, then:

```bash
export ANDROID_NDK_HOME=/path/to/ndk/<version>
```

Dolly also searches common paths (`$ANDROID_HOME/ndk/*`, `~/Library/Android/sdk/ndk/*`, `~/Android/Sdk/ndk/*`).

### 5. API key (for generation)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...

# optional:
export DOLLY_LLM_PROVIDER=anthropic   # or openai
```

Without a key, Dolly prints a clear bilingual error. Use `deploy-sample` to test compile+adb without an LLM.

## Usage

```bash
# REPL (default)
npm run dolly
# or after npm link / npm run build:
npx tsx src/index.ts

# One-shot
npm run dolly -- ask "imprime os números de 1 a 10"

# Test NDK + adb without LLM
npm run dolly -- deploy-sample

# Push only (do not run on device)
npm run dolly -- deploy-sample --no-run

# Diagnostics
npm run dolly -- status
```

### First request (example)

With NDK, adb device, and an API key:

```bash
npm run dolly
dolly> escreve um programa que imprime Hello Dolly e a data se possível
```

Flow: generate `workspace/main.c` → compile `workspace/dolly_app` → `adb push` to `/data/local/tmp/dolly_app` → `chmod +x` → run and stream stdout.

### REPL commands

| Command | Action |
|---------|--------|
| `/help` | Help |
| `/quit` | Exit |
| `/run off` | Deploy only (no remote exec) |
| `/run on` | Deploy and run (default) |

## Project layout

```
src/
  index.ts      CLI entry
  repl.ts       Text REPL
  llm.ts        Anthropic / OpenAI
  compile.ts    NDK detect + aarch64 clang
  adb.ts        devices / push / run
  pipeline.ts   generate → compile → deploy
samples/
  hello.c       LLM-free smoke test
workspace/      Generated C + binary (gitignored)
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `DOLLY_LLM_PROVIDER` | `anthropic` or `openai` |
| `ANDROID_NDK_HOME` | NDK root |
| `ADB_PATH` | Optional full path to `adb` |
| `DOLLY_WORKSPACE` | Override work directory (default `./workspace`) |

## Limitations (v0)

- Local USB only — cloud agents cannot talk to your tablet.
- Plain C + static link; no JNI / Android UI.
- Real tablet deploy must be verified on your machine (`adb` + NDK + device).

## License

MIT
