import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { msg } from "./messages.js";
import { binaryPath } from "./paths.js";

const HOST_TAG_CANDIDATES = [
  "linux-x86_64",
  "darwin-x86_64",
  "darwin-arm64",
  "windows-x86_64",
] as const;

function listDirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(dir, d.name));
  } catch {
    return [];
  }
}

function ndkLooksValid(ndkRoot: string): boolean {
  return fs.existsSync(path.join(ndkRoot, "toolchains", "llvm", "prebuilt"));
}

/** Detect Android NDK from env and common install locations. */
export function findNdkHome(): string | null {
  const env =
    process.env.ANDROID_NDK_HOME ??
    process.env.NDK_HOME ??
    process.env.ANDROID_NDK_ROOT;
  if (env && ndkLooksValid(env)) return path.resolve(env);

  const home = os.homedir();
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(home, "Android", "Sdk"),
    path.join(home, "Library", "Android", "sdk"),
    path.join(home, "android-sdk"),
    "/usr/local/lib/android/sdk",
    "/opt/android-sdk",
  ].filter((p): p is string => Boolean(p));

  for (const sdk of sdkRoots) {
    const ndkBase = path.join(sdk, "ndk");
    const versions = listDirs(ndkBase).sort().reverse();
    for (const v of versions) {
      if (ndkLooksValid(v)) return v;
    }
    const sideBySide = path.join(sdk, "ndk-bundle");
    if (ndkLooksValid(sideBySide)) return sideBySide;
  }

  // Loose installs under home
  for (const candidate of listDirs(home)
    .filter((p) => /android-ndk/i.test(path.basename(p)))
    .sort()
    .reverse()) {
    if (ndkLooksValid(candidate)) return candidate;
  }

  return null;
}

function findClang(ndkHome: string): string | null {
  const prebuilt = path.join(ndkHome, "toolchains", "llvm", "prebuilt");
  for (const tag of HOST_TAG_CANDIDATES) {
    const clang = path.join(prebuilt, tag, "bin", "aarch64-linux-android21-clang");
    if (fs.existsSync(clang)) return clang;
  }
  // Fallback: any host tag with aarch64 clang
  for (const host of listDirs(prebuilt)) {
    const bin = path.join(host, "bin");
    try {
      const match = fs
        .readdirSync(bin)
        .find((f) => /^aarch64-linux-android\d+-clang$/.test(f));
      if (match) return path.join(bin, match);
    } catch {
      /* continue */
    }
  }
  return null;
}

export interface CompileResult {
  ndkHome: string;
  clang: string;
  output: string;
  stdout: string;
}

export function compileC(sourceFile: string, outputFile?: string): CompileResult {
  const ndkHome = findNdkHome();
  if (!ndkHome) {
    throw new Error(msg.ndkMissing());
  }
  const clang = findClang(ndkHome);
  if (!clang) {
    throw new Error(
      msg.ndkMissing() +
        `\n\nNDK em ${ndkHome} sem clang aarch64.\nNDK at ${ndkHome} missing aarch64 clang.`,
    );
  }
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source not found: ${sourceFile}`);
  }

  const out = outputFile ?? binaryPath();
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const args = [
    sourceFile,
    "-o",
    out,
    "-static",
    "-O2",
    "-Wall",
    "-Wextra",
  ];

  const result = spawnSync(clang, args, {
    encoding: "utf8",
    env: { ...process.env },
  });

  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  if (result.status !== 0) {
    throw new Error(
      msg.compileFailed(combined || `clang exited ${result.status}`),
    );
  }
  if (!fs.existsSync(out)) {
    throw new Error(msg.compileFailed("Compiler exited 0 but binary missing."));
  }

  return { ndkHome, clang, output: out, stdout: combined };
}

export function ndkStatus(): { found: boolean; path: string | null; clang: string | null } {
  const ndkHome = findNdkHome();
  if (!ndkHome) return { found: false, path: null, clang: null };
  return { found: true, path: ndkHome, clang: findClang(ndkHome) };
}
