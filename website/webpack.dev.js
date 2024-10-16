/** @type {import('webpack').Configuration} */
const path = require('path');
const tailwindcss = require('tailwindcss');

module.exports = {
  mode: "development",
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
    filename: 'main.js'
  },
  devServer: {
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:11309'
      }
    ],
    port: 13405,
    static: path.join(__dirname, "static"),
    historyApiFallback: true
  },
  ignoreWarnings: [(warning) => true]
}