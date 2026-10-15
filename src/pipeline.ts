import fs from "node:fs";
import path from "node:path";
import { pushAndChmod, runOnDevice } from "./adb.js";
import { compileC } from "./compile.js";
import { generateC } from "./llm.js";
import {
  binaryPath,
  ensureWorkspace,
  mainCPath,
  sampleHelloC,
} from "./paths.js";

export interface PipelineOptions {
  /** Run on device after push (default true for chat, false optional). */
  run?: boolean;
  /** Skip LLM; use existing main.c or sample. */
  sourceFile?: string;
}

export async function generateCompileDeploy(
  prompt: string,
  options: PipelineOptions = {},
): Promise<void> {
  ensureWorkspace();
  const cPath = mainCPath();

  console.log("→ Gerando C / Generating C…");
  const { provider, source } = await generateC(prompt);
  fs.writeFileSync(cPath, source, "utf8");
  console.log(`  LLM: ${provider}`);
  console.log(`  Wrote ${cPath}`);

  await compileDeployRun(cPath, options);
}

export async function compileDeployRun(
  sourceFile: string,
  options: PipelineOptions = {},
): Promise<void> {
  const shouldRun = options.run !== false;
  const out = binaryPath();

  console.log("→ Compilando aarch64 / Compiling…");
  const compiled = compileC(sourceFile, out);
  console.log(`  NDK: ${compiled.ndkHome}`);
  console.log(`  Binary: ${compiled.output}`);

  console.log("→ Enviando via adb / Pushing…");
  const deploy = pushAndChmod(compiled.output);
  console.log(`  Device: ${deploy.serial}`);
  console.log(`  Remote: ${deploy.remotePath}`);

  if (shouldRun) {
    console.log("→ Executando / Running…\n");
    const code = await runOnDevice(deploy.remotePath);
    console.log(`\n← exit ${code}`);
  } else {
    console.log("✓ Deploy OK (sem executar / not run).");
  }
}

/** Compile + push sample hello.c without LLM. */
export async function deploySample(options: PipelineOptions = {}): Promise<void> {
  ensureWorkspace();
  const dest = mainCPath();
  const sample = sampleHelloC();
  fs.copyFileSync(sample, dest);
  console.log(`→ Sample: ${path.basename(sample)} → ${dest}`);
  await compileDeployRun(dest, options);
}
