import { promises as fs } from "node:fs";
import * as path from "node:path";

import execa from "execa";

export const isWsl = execa.sync("which", ["wsl.exe"]).exitCode === 0;

export function instanceOfNodeError(
  value: unknown
): value is Error & NodeJS.ErrnoException;
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: unknown,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException;
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: unknown,
  errorType?: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof (errorType ?? Error);
}

export async function doesDirExists(dir: string) {
  try {
    const inStats = await fs.stat(dir);
    return inStats.isDirectory();
  } catch (error) {
    if (!instanceOfNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
    return false;
  }
}

export async function deleteFileIfExists(gameMod: string) {
  try {
    await fs.unlink(gameMod);
  } catch (error) {
    if (!instanceOfNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

export function normalizePathSync(p: string): string {
  const normalPath = path.normalize(p);

  // If not using WSL or not a windows path.
  if (!isWsl || !/^[A-Za-z]:[/\\]/u.test(normalPath)) {
    return normalPath;
  }

  const wslpathResult = execa.sync(`wslpath`, ["-u", normalPath]);
  if (wslpathResult.exitCode === 0) {
    return wslpathResult.stdout;
  }
  throw new Error(wslpathResult.stderr);
}

export function isString(value: unknown): value is string {
  return value !== null && typeof value === "string";
}

export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}
