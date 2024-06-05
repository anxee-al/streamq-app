import { productName, version } from './package.json'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { WebpackPlugin } from '@electron-forge/plugin-webpack'
import fs from 'fs/promises'

import { mainConfig } from './webpack.main.config'
import { rendererConfig } from './webpack.renderer.config'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './build/icon.ico',
    // extraResource: 'modules'
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@felixrieseberg/electron-forge-maker-nsis",
      config: {
        updater: {
          provider: 'generic',
          url: process.argv.includes('--prod') ? 'https://updates.streamq.io/v1' : 'http://localhost:8090',
        }
      }
    },
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({})
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [{
          html: './src/app_bootstrap/index.html',
          js: './src/app_bootstrap/index.ts',
          name: 'main_window',
          preload: { js: './src/app_bootstrap/preload.ts' }
        }]
      },
      devServer: { client: { overlay: {
        runtimeErrors: error => {
          if (error.message.startsWith('ResizeObserver')) return false
          return true
        }
      } } }
    })
  ],
  hooks: {
    postPackage: async () => {
      await fs.writeFile(`./out/${productName}-win32-x64/resources/build_info.json`, JSON.stringify({ version }))
    }
  }
}

export default config