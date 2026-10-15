import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { msg } from "./messages.js";
import { DEVICE_BIN } from "./paths.js";

function whichAdb(): string | null {
  const result = spawnSync("which", ["adb"], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  // Windows / common SDK locations
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME
      ? `${process.env.ANDROID_HOME}/platform-tools/adb`
      : null,
    process.env.ANDROID_SDK_ROOT
      ? `${process.env.ANDROID_SDK_ROOT}/platform-tools/adb`
      : null,
  ].filter((p): p is string => Boolean(p));
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function requireAdb(): string {
  const adb = whichAdb();
  if (!adb) throw new Error(msg.adbMissing());
  return adb;
}

export interface DeviceInfo {
  serial: string;
  state: string;
}

/** List authorized devices (state === device). */
export function listDevices(): DeviceInfo[] {
  const adb = requireAdb();
  const result = spawnSync(adb, ["devices"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(msg.adbMissing() + `\n${result.stderr || result.stdout}`);
  }
  const lines = (result.stdout || "").split("\n").slice(1);
  const devices: DeviceInfo[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [serial, state] = trimmed.split(/\s+/);
    if (serial && state) devices.push({ serial, state });
  }
  return devices;
}

export function requireDevice(): DeviceInfo {
  const devices = listDevices();
  const ready = devices.filter((d) => d.state === "device");
  if (ready.length === 0) {
    const unauthorized = devices.filter((d) => d.state === "unauthorized");
    let extra = "";
    if (unauthorized.length) {
      extra =
        "\n\nDispositivo(s) 'unauthorized' — aceite a depuração USB no tablet.\n" +
        "Device(s) 'unauthorized' — accept the USB debugging prompt on the tablet.";
    }
    throw new Error(msg.noDevice() + extra);
  }
  return ready[0]!;
}

export interface DeployResult {
  serial: string;
  localPath: string;
  remotePath: string;
}

export function pushAndChmod(
  localBinary: string,
  remotePath: string = DEVICE_BIN,
): DeployResult {
  if (!fs.existsSync(localBinary)) {
    throw new Error(`Binary not found: ${localBinary}`);
  }
  const adb = requireAdb();
  const device = requireDevice();

  const push = spawnSync(
    adb,
    ["-s", device.serial, "push", localBinary, remotePath],
    { encoding: "utf8" },
  );
  if (push.status !== 0) {
    throw new Error(
      msg.pushFailed(push.stderr || push.stdout || `adb push exit ${push.status}`),
    );
  }

  const chmod = spawnSync(
    adb,
    ["-s", device.serial, "shell", "chmod", "+x", remotePath],
    { encoding: "utf8" },
  );
  if (chmod.status !== 0) {
    throw new Error(
      msg.pushFailed(
        chmod.stderr || chmod.stdout || `chmod failed: exit ${chmod.status}`,
      ),
    );
  }

  return { serial: device.serial, localPath: localBinary, remotePath };
}

/** Run remote binary and stream stdout/stderr to the local process. */
export function runOnDevice(
  remotePath: string = DEVICE_BIN,
  args: string[] = [],
): Promise<number> {
  const adb = requireAdb();
  const device = requireDevice();

  return new Promise((resolve, reject) => {
    const child = spawn(
      adb,
      ["-s", device.serial, "shell", remotePath, ...args],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function adbStatus(): {
  adb: string | null;
  devices: DeviceInfo[];
} {
  const adb = whichAdb();
  if (!adb) return { adb: null, devices: [] };
  try {
    return { adb, devices: listDevices() };
  } catch {
    return { adb, devices: [] };
  }
}
