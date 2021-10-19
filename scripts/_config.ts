import * as fs from "node:fs";
import * as path from "node:path";

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

import * as utils from "./_utils";

// Sorted by precedence.
const dotenvFile = ".env";

// Load the .env file.
try {
  fs.accessSync(dotenvFile);

  dotenvExpand(
    dotenv.config({
      path: dotenvFile,
    })
  );
} catch {}

if (
  process.env.DST_PATH === undefined ||
  process.env.DS_MOD_TOOLS === undefined ||
  process.env.STEX === undefined ||
  process.env.MKLINK_SCRIPT === undefined
) {
  throw new Error("Invalid env settings.");
}

export const author = "BlueBeka";
export const gameModsPath = utils.normalizePathSync(
  path.join(process.env.DST_PATH, "mods")
);
export const dstModToolsPath = utils.normalizePathSync(
  process.env.DS_MOD_TOOLS
);
export const stexExecutable = utils.normalizePathSync(process.env.STEX);
export const mklinkScript = utils.normalizePathSync(process.env.MKLINK_SCRIPT);

export const autocompilerExecutable = `./autocompiler.exe`;

export const devModsDir = "packages";
export const srcDir = "src";
export const distDir = "dist";
export const imagesDir = "images";
export const animationDir = "anim";

export const iconAtlasFile = "modicon.xml";
export const iconFile = "modicon.tex";
