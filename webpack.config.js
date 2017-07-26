module.exports = {
    entry: "./js/app",
    output: {
        filename: "build.js"
    },


  devServer: {
    host: 'localhost',
    port: 8080,
    inline: true
  }
};