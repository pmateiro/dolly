#!/usr/bin/env node
import { adbStatus } from "./adb.js";
import { ndkStatus } from "./compile.js";
import { deploySample, generateCompileDeploy } from "./pipeline.js";
import { startRepl } from "./repl.js";

function printUsage(): void {
  console.log(`Dolly v0 — gera C, compila para Android aarch64, envia via adb

Uso / Usage:
  dolly                 inicia o REPL de texto
  dolly chat            idem
  dolly ask "<pedido>"  um pedido e sai (gera → compila → push → run)
  dolly deploy-sample   hello-world sem LLM (testa NDK + adb)
  dolly status          mostra NDK / adb / dispositivos
  dolly help            esta ajuda

Variáveis / Env:
  ANTHROPIC_API_KEY ou OPENAI_API_KEY   chave LLM
  DOLLY_LLM_PROVIDER=anthropic|openai   força provedor
  ANDROID_NDK_HOME                      caminho do NDK
  DOLLY_WORKSPACE                       pasta de trabalho (default: ./workspace)
`);
}

function printStatus(): void {
  const ndk = ndkStatus();
  const adb = adbStatus();
  console.log("Dolly status");
  console.log("────────────");
  console.log(
    `NDK:  ${ndk.found ? ndk.path : "não encontrado / not found"}`,
  );
  if (ndk.clang) console.log(`Clang: ${ndk.clang}`);
  console.log(`adb:  ${adb.adb ?? "não encontrado / not found"}`);
  if (adb.devices.length === 0) {
    console.log("Devices: (nenhum / none)");
  } else {
    console.log("Devices:");
    for (const d of adb.devices) {
      console.log(`  ${d.serial}\t${d.state}`);
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "chat" || cmd === "repl") {
    await startRepl();
    return;
  }

  switch (cmd) {
    case "help":
    case "-h":
    case "--help":
      printUsage();
      return;

    case "status":
      printStatus();
      return;

    case "deploy-sample":
    case "sample": {
      const noRun = argv.includes("--no-run");
      await deploySample({ run: !noRun });
      return;
    }

    case "ask": {
      const prompt = argv.slice(1).join(" ").trim();
      if (!prompt) {
        console.error('Uso: dolly ask "seu pedido"');
        process.exit(2);
      }
      const noRun = argv.includes("--no-run");
      const clean = prompt.replace(/\s*--no-run\s*/g, " ").trim();
      await generateCompileDeploy(clean, { run: !noRun });
      return;
    }

    default:
      // Treat unknown first arg as a one-shot prompt if it looks like prose
      if (!cmd.startsWith("-")) {
        await generateCompileDeploy(argv.join(" "), { run: true });
        return;
      }
      printUsage();
      process.exit(2);
  }
}

main().catch((e) => {
  const text = e instanceof Error ? e.message : String(e);
  console.error(text);
  process.exit(1);
});
