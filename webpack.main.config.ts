import type { Configuration } from 'webpack'
import { rules } from './webpack.rules'
import path from 'path'

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: { rules },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@napi': path.join(__dirname, 'napi'),
      config: path.join(__dirname, `config.${process.argv.includes('--prod') ? 'prod' : 'dev'}.yml`),
    }
  }
}