import { promises as fs } from "node:fs";
import * as path from "node:path";

import { map as asyncMap } from "async-iterable-map";
import execa from "execa";

import * as config from "./_config";
import * as utils from "./_utils";

async function run() {
  try {
    const modNames = (
      await asyncMap(await fs.opendir(config.devModsDir), (dirend) =>
        dirend.isDirectory() ? dirend.name : null
      )
    ).filter((modName): modName is string => modName !== null);

    await Promise.all(
      modNames.map(async (modName) => {
        const devMod = path.join(config.devModsDir, modName, config.distDir);
        const gameMod = path.join(config.gameModsPath, modName);

        console.log(`Linking mod "${modName}" to game.`);

        await utils.deleteFileIfExists(gameMod);

        await (utils.isWsl
          ? execa(config.mklinkScript, ["/D", gameMod, devMod])
          : fs.symlink(devMod, gameMod, "dir"));
      })
    );
  } catch (error) {
    if (!utils.instanceOfNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

// Run the script.
void run();
