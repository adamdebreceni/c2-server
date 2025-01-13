/** @type {import('webpack').Configuration} */
const path = require('path');
const tailwindcss = require('tailwindcss');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: "production",
  entry: path.join(__dirname, "src/index.tsx"),
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(j|t)s(x?)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(scss|css)/,
        use: ['style-loader', 'css-loader', {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                'postcss-preset-env',
                tailwindcss
              ]
            }
          }
        },'sass-loader']
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"]
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'main.js'
  },
  ignoreWarnings: [(warning) => true],
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'static') }
      ]
    })
  ]
}