import { promises as fs } from "node:fs";
import * as path from "node:path";

import { map as asyncMap } from "async-iterable-map";
import execa from "execa";
import glob from "glob-promise";
import JSON from "json5";

import * as config from "./_config";
import * as utils from "./_utils";

async function run() {
  const mods = await Promise.all(
    (
      await asyncMap(await fs.opendir(config.devModsDir), (dirend) =>
        dirend.isDirectory() ? dirend.name : null
      )
    )
      .filter(utils.isString)
      .map(loadModInfo)
  );

  const workshopMap: WorkshopMap = new Map(
    mods.map((mod) => [mod.simpleName, mod.workshopId] as const)
  );

  await Promise.all(
    mods.map(async (mod) => {
      console.log(`Building and preparing mod "${mod.simpleName}"`);
      await Promise.all([
        buildImages(mod),
        buildScripts(mod, workshopMap),
        prepareAnimations(mod),
      ]);
    })
  );

  await autocompile();
  await postCleanUp(mods);
}

type WorkshopMap = Map<ModInfo["simpleName"], ModInfo["workshopId"]>;

type ModInfo = Readonly<{
  workshopId: number | null;
  name: string;
  version: string;
  type: "client" | "server-client" | "server-only";
  description: Readonly<{
    features: ReadonlyArray<string>;
    antifeatures: ReadonlyArray<string>;
    notes: Readonly<{
      buildingBlock: boolean;
      other: ReadonlyArray<string>;
    }>;
  }>;
  tags: ReadonlyArray<string>;
  compatible: Readonly<{
    vanilla?: boolean;
    reignOfGiants?: boolean;
    shipwrecked?: boolean;
    together?: boolean;
  }>;
  priority: number;
  forumthread: string;
  dependencies: ReadonlyArray<string>;
  configurationOptions: ReadonlyArray<
    Readonly<{
      name: string;
      label: string;
      options: ReadonlyArray<
        Readonly<{
          data: number | string;
          description: string;
        }>
      >;
      default: number | string;
    }>
  >;
  simpleName: string;
  srcPath: string;
  distPath: string;
}>;

async function loadModInfo(simpleName: string): Promise<ModInfo> {
  const modPath = path.join(config.devModsDir, simpleName);

  const metaFilePath = path.join(modPath, "modinfo.json5");
  const metaFileContents = await fs.readFile(metaFilePath, {
    encoding: "utf-8",
  });
  const metaData: Omit<ModInfo, "path"> = JSON.parse(metaFileContents);

  const srcPath = path.join(modPath, config.srcDir);
  const distPath = path.join(modPath, config.distDir);

  return {
    ...metaData,
    simpleName,
    srcPath,
    distPath,
  };
}

async function buildImages(mod: ModInfo) {
  const imagesPathInBase = path.join(mod.srcPath, config.imagesDir);
  const imagePathOutBase = path.join(mod.distPath, config.imagesDir);

  // Make sure input base exists.
  if (!(await utils.doesDirExists(imagesPathInBase))) {
    return;
  }

  const imageDirs = (
    await asyncMap(await fs.opendir(imagesPathInBase), (dirend) =>
      dirend.isDirectory() ? dirend.name : null
    )
  ).filter((imageDir): imageDir is string => imageDir !== null);

  await Promise.all(
    imageDirs.map(async (imageDir) => {
      const imagesPathIn = path.join(imagesPathInBase, imageDir);

      // Make sure input exists.
      if (!(await utils.doesDirExists(imagesPathIn))) {
        return;
      }

      const imagePathOut =
        imageDir === "modicon" ? mod.distPath : imagePathOutBase;

      await execa(config.stexExecutable, [
        "pack",
        "-i",
        imagesPathIn,
        "-o",
        imagePathOut,
      ]);
    })
  );
}

async function prepareAnimations(mod: ModInfo) {
  const animPathInBase = path.join(mod.srcPath, config.animationDir);

  // Make sure input base exists.
  if (!(await utils.doesDirExists(animPathInBase))) {
    return;
  }

  const animDirs = (
    await asyncMap(await fs.opendir(animPathInBase), (dirend) =>
      dirend.isDirectory() ? dirend.name : null
    )
  ).filter((animDir): animDir is string => animDir !== null);

  await Promise.all(
    animDirs.map(async (animDir) => {
      const animPathIn = path.join(animPathInBase, animDir);
      const animPathOut = path.join(mod.distPath, "exported", animDir);
      await fs.cp(animPathIn, animPathOut, { recursive: true });
    })
  );
}

async function buildScripts(mod: ModInfo, workshopMap: WorkshopMap) {
  const scriptPaths = await glob(`${mod.srcPath}/**/*.lua`);

  await Promise.all(
    scriptPaths.map(async (scriptPath) => {
      const outPath = path.join(
        mod.distPath,
        scriptPath.slice(Math.max(0, mod.srcPath.length + 1))
      );

      const content = await fs.readFile(scriptPath, { encoding: "utf-8" });

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, content, { encoding: "utf-8" });
    })
  );

  await generateModInfoFile(mod, workshopMap);
}

async function generateModInfoFile(mod: ModInfo, workshopMap: WorkshopMap) {
  const filePath = path.join(mod.distPath, "modinfo.lua");
  const data = generateModInfo(mod, workshopMap);
  return fs.writeFile(filePath, data, { encoding: "utf-8" });
}

function generateModInfo(mod: ModInfo, workshopMap: WorkshopMap) {
  const version = mod.version === "development" ? "0.0.0" : mod.version;

  const description = generateModDescription(mod);

  const tags = mod.tags.map((str) => `  "${str}"`).join(",\n");

  const modDependencies = mod.dependencies
    .map((modDep) =>
      modDep.startsWith("workshop-")
        ? `  { "workshop" = "${modDep}" }`
        : mod.version !== "development" && workshopMap.get(modDep) !== null
        ? `  { "workshop" = "workshop-${workshopMap.get(modDep)}" }`
        : `  { ["${modDep}"] = false }`
    )
    .join(",\n");

  const configurationOptions = mod.configurationOptions
    .map((configOption) =>
      [
        `name = "${configOption.name}"`,
        `label = "${configOption.label}"`,
        `options = {\n${configOption.options
          .map(
            (option) =>
              `{ ${[
                `data = ${
                  typeof option.data === "number"
                    ? option.data
                    : `"${option.data}"`
                }`,
                `description = "${option.description}"`,
              ].join(", ")} }`
          )
          .map((str) => `      ${str}`)
          .join(",\n")}\n    }`,
        `default = ${
          typeof configOption.default === "number"
            ? configOption.default
            : `"${configOption.default}"`
        }`,
      ]
        .map((str) => `    ${str}`)
        .join(",\n")
    )
    .map((configOption) => `  {\n${configOption}\n  }`)
    .join(",\n");

  return [
    `name = "${mod.name}"`,
    `description = [[${description}]]`,
    `author = "${config.author}"`,
    `version = "${version}"`,
    `api_version_dst = 10`,
    `priority = "${mod.priority}"`,
    `dont_starve_compatible = ${String(mod.compatible.vanilla)}`,
    `reign_of_giants_compatible = ${String(mod.compatible.reignOfGiants)}`,
    `shipwrecked_compatible = ${String(mod.compatible.shipwrecked)}`,
    `dst_compatible = ${String(mod.compatible.together)}`,
    `all_clients_require_mod = ${String(mod.type === "server-client")}`,
    `client_only_mod = ${String(mod.type === "client")}`,
    `icon_atlas = "${config.iconAtlasFile}"`,
    `icon = "${config.iconFile}"`,
    `server_filter_tags = {\n${tags}\n}`,
    `forumthread = "${mod.forumthread}"`,
    `mod_dependencies = {\n${modDependencies}\n}`,
    `configuration_options = {\n${configurationOptions}\n}`,
  ].join("\n");
}

function generateModDescription(mod: ModInfo) {
  const featruesList =
    mod.description.features.length > 0
      ? mod.description.features.map((feat) => `- ${feat}`).join("\n")
      : null;

  const featrues = featruesList === null ? null : `Features: \n${featruesList}`;

  const antiFeaturesList =
    mod.description.antifeatures.length > 0
      ? mod.description.antifeatures
          .map((antifeat) => `- ${antifeat}`)
          .join("\n")
      : null;

  const antiFeatures =
    antiFeaturesList === null
      ? null
      : `What this mod does not do: \n${antiFeaturesList}`;

  const notesListRaw = [
    ...(mod.description.notes.other.length > 0
      ? mod.description.notes.other
      : []),
    ...(mod.description.notes.buildingBlock
      ? ["This mod is designed as a building block for other mods to use."]
      : []),
  ];

  const notes =
    notesListRaw.length === 0
      ? null
      : notesListRaw.length === 1
      ? `Note: \n${notesListRaw[0]}`
      : `Notes: \n${notesListRaw
          // eslint-disable-next-line sonarjs/no-nested-template-literals
          .map((note) => `- ${note}`)
          .join("\n")}`;

  return [featrues, antiFeatures, notes].filter(utils.isString).join("\n\n");
}

async function autocompile() {
  console.log("Compiling");

  await execa(config.autocompilerExecutable, {
    cwd: config.dstModToolsPath,
  });
}

async function postCleanUp(mods: ReadonlyArray<ModInfo>) {
  console.log("Cleaning up");
  await Promise.all(
    mods.map(async (mod) => {
      const exportedPath = path.join(
        config.devModsDir,
        mod.distPath,
        "exported"
      );

      if (await utils.doesDirExists(exportedPath)) {
        await fs.rm(exportedPath, { recursive: true });
      }
    })
  );
}

// Run the script.
void run();
