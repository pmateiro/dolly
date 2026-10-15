import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Package root (parent of src/ or dist/). */
export function packageRoot(): string {
  return path.resolve(__dirname, "..");
}

export function samplesDir(): string {
  return path.join(packageRoot(), "samples");
}

export function sampleHelloC(): string {
  return path.join(samplesDir(), "hello.c");
}

/** Working directory for generated C and binaries (cwd/workspace or DOLLY_WORKSPACE). */
export function workspaceDir(): string {
  const env = process.env.DOLLY_WORKSPACE;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "workspace");
}

export function ensureWorkspace(): string {
  const dir = workspaceDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function mainCPath(): string {
  return path.join(ensureWorkspace(), "main.c");
}

export function binaryPath(): string {
  return path.join(ensureWorkspace(), "dolly_app");
}

export const DEVICE_BIN = "/data/local/tmp/dolly_app";
