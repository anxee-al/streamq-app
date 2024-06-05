import type { ModuleOptions } from 'webpack'

export const rules: Required<ModuleOptions>['rules'] = [
  {
    test: /\.node?$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: { outputAssetBase: 'native_modules' }
    }
  },
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader'
  },
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: { outputAssetBase: 'native_modules' }
    }
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      // options: { transpileOnly: true }
    }
  },
  {
    test: /\.sass$/i,
    use: [
      'style-loader',
      { loader: 'css-loader', options: { modules: { localIdentName: '[local]_[hash:base64:5]' } } },
      'sass-loader'
    ]
  },
  {
    test: /\.(png|jpe?g|gif)$/i,
    use: [
      { loader: 'file-loader' }
    ]
  },
  { test: /\.ya?ml$/, use: 'yaml-loader' }
]