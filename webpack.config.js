const path = require('path');

module.exports = {
    entry: path.join(__dirname, '/src/app.ts'),
  output: {
      filename: "build.js",
      path: __dirname,
  },
  module: {
    rules: [
      {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
      },
    ]
  },
  resolve: {
      extensions: [".tsx", ".ts", ".js"]
  },

  devServer: {
    host: 'localhost',
    port: 8080,
    inline: true
  }
};