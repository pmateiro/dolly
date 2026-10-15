/** Bilingual (PT/EN) user-facing messages for actionable failures. */

export const msg = {
  noApiKey: () =>
    [
      "Erro: nenhuma chave de API encontrada.",
      "Error: no LLM API key found.",
      "",
      "Defina uma das variáveis de ambiente:",
      "Set one of these environment variables:",
      "  export ANTHROPIC_API_KEY=sk-ant-...",
      "  export OPENAI_API_KEY=sk-...",
      "",
      "Opcional: DOLLY_LLM_PROVIDER=anthropic|openai (auto-detecta se omitido).",
      "Optional: DOLLY_LLM_PROVIDER=anthropic|openai (auto-detects if omitted).",
    ].join("\n"),

  adbMissing: () =>
    [
      "Erro: `adb` não encontrado no PATH.",
      "Error: `adb` not found in PATH.",
      "",
      "Instale platform-tools e garanta que `adb` esteja disponível:",
      "Install Android platform-tools and ensure `adb` is on PATH:",
      "  https://developer.android.com/tools/releases/platform-tools",
      "  macOS: brew install android-platform-tools",
    ].join("\n"),

  noDevice: () =>
    [
      "Erro: nenhum dispositivo Android autorizado via USB.",
      "Error: no authorized Android device over USB.",
      "",
      "Verifique:",
      "Check:",
      "  1. Tablet ligado por USB",
      "  2. Depuração USB / USB debugging ativada",
      "  3. Aceite o prompt 'Permitir depuração USB' no tablet",
      "  4. Rode: adb devices  (deve mostrar 'device', não 'unauthorized')",
    ].join("\n"),

  ndkMissing: () =>
    [
      "Erro: Android NDK não encontrado.",
      "Error: Android NDK not found.",
      "",
      "Defina ANDROID_NDK_HOME ou instale o NDK em um caminho comum:",
      "Set ANDROID_NDK_HOME or install the NDK in a common path:",
      "  export ANDROID_NDK_HOME=/path/to/android-ndk-r27c",
      "  macOS: ~/Library/Android/sdk/ndk/<version>",
      "  Linux: ~/Android/Sdk/ndk/<version>",
    ].join("\n"),

  compileFailed: (detail: string) =>
    [
      "Erro ao compilar para aarch64-linux-android.",
      "Compile failed for aarch64-linux-android.",
      "",
      detail,
    ].join("\n"),

  pushFailed: (detail: string) =>
    [
      "Erro ao enviar binário via adb.",
      "Failed to push binary via adb.",
      "",
      detail,
    ].join("\n"),

  llmFailed: (detail: string) =>
    [
      "Erro na geração de código (LLM).",
      "LLM code generation failed.",
      "",
      detail,
    ].join("\n"),
} as const;
