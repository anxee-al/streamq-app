import { app } from 'electron'
import path from 'path'
import packageJson from '../../package.json'
import isDev from 'electron-is-dev'

export const APP_NAME = packageJson.name
export const VERSION = packageJson.version
export const MODULES_DIR = path.join(isDev ? app.getAppPath() : process.resourcesPath, 'modules')