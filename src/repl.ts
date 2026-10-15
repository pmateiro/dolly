import readline from "node:readline";
import { generateCompileDeploy } from "./pipeline.js";

const HELP = `
Comandos / Commands:
  /help              esta ajuda / this help
  /quit  /exit       sair / leave REPL
  /run off|on        não executar (só push) / toggle remote run
  <texto>            gera C, compila, envia e (opcional) executa
                     generate C, compile, push, and optionally run

Dica: use \`dolly deploy-sample\` para testar NDK+adb sem LLM.
Tip: use \`dolly deploy-sample\` to test NDK+adb without an API key.
`.trim();

export async function startRepl(): Promise<void> {
  let runOnDevice = true;

  console.log("Dolly v0 — C → Android (adb USB)");
  console.log("Digite um pedido em português ou inglês. /help para comandos.");
  console.log("Type a request in Portuguese or English. /help for commands.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const ask = (): void => {
    rl.question("dolly> ", async (line) => {
      const input = line.trim();
      if (!input) {
        ask();
        return;
      }

      if (input === "/quit" || input === "/exit") {
        rl.close();
        return;
      }
      if (input === "/help" || input === "help") {
        console.log(HELP);
        ask();
        return;
      }
      if (input.startsWith("/run")) {
        const arg = input.slice(4).trim().toLowerCase();
        if (arg === "off" || arg === "0" || arg === "false") runOnDevice = false;
        else if (arg === "on" || arg === "1" || arg === "true") runOnDevice = true;
        else runOnDevice = !runOnDevice;
        console.log(`run on device: ${runOnDevice ? "on" : "off"}`);
        ask();
        return;
      }

      try {
        await generateCompileDeploy(input, { run: runOnDevice });
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        console.error("\n" + text + "\n");
      }
      ask();
    });
  };

  rl.on("close", () => {
    console.log("Até logo / Bye.");
    process.exit(0);
  });

  ask();
}
