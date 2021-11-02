const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    main: './src/index.tsx'
  },
  mode: 'development',
  output: {
    filename: `js/app.js`,
    path: path.resolve(__dirname, 'dist/web/')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: { loader: 'ts-loader' },
        resolve: {
          fullySpecified: false
        }
      },
      { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
      {
        test: /\.sass$/i,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { modules: { localIdentName: '[local]_[hash:base64:5]' } } },
          'sass-loader'
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
    modules: [ path.resolve(__dirname, 'src'), "node_modules"]
  },
  plugins: [
    new HtmlWebpackPlugin({ inject: 'body', scriptLoading: 'blocking', meta: { charset: 'UTF-8' } })
  ],
  target: 'electron-renderer'
}