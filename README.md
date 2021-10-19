# My DST Mods

Don't Starve Together Mods.

## About

TODO: Write about the mods.

## Developer Notes

### Building the mods

#### Dependencies

The following dependencies are needed to build the mods.

- [nodeJS](https://nodejs.org/)
- [yarn](https://yarnpkg.com/)
- [Don't Starve Mod Tools](https://steamdb.info/app/245850/)
- [Stexatlaser](https://forums.kleientertainment.com/files/file/2079-stexatlaser-simple-tex-atlas-packer/)
- [mklink script](https://gist.github.com/RebeccaStevens/adbd0daef12ad06d1782a7a5410b2730) - This is only needed when using WSL.

See [this video](https://www.youtube.com/watch?v=MAdGCCQp7Ss) for help.

##### Other tools of interest:

- [ktools](https://forums.kleientertainment.com/files/file/583-ktools-cross-platform-modding-tools-for-dont-starve/)
- [handsome matts tools](https://forums.kleientertainment.com/files/file/73-handsome-matts-tools/)

#### .env file

This file lets the scripts know where the all the relevant files are located.\
You'll need to create this file yourself at the project root.

Paths can use either "/"s or "\"s (remember to escape "\" if using them).\
On WSL, windows paths will automatically be converted to the right path.

Example:

```env
DST_PATH="C:/Program Files (x86)/Steam/steamapps/common/Don't Starve Together/"
DS_MOD_TOOLS="C:/Program Files (x86)/Steam/steamapps/common/Don't Starve Mod Tools/mod_tools/"
STEX="$HOME/dst/stex/stex"
MKLINK_SCRIPT="$HOME/bin/mklink.sh"
```

#### emmy.config.json file

This is another file you'll have to crate yourself at the project root.\
This file should link the to the DST scripts.

Example:

```json
{
  "source": [
    {
      "dir": "/mnt/c/Program Files (x86)/Steam/steamapps/common/Don't Starve Together/data/scripts/"
    }
  ]
}

```

#### The Build Script

This script will build the source files into compiled versions that can be used
in the game.

First install the node dependencies with:

```sh
yarn install
```

Then run the script like so:

```sh
yarn build
```
