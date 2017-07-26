module.exports = {
    entry: "./js/app",
    output: {
        path: "/app",
        filename: "build.js"
    },


  devServer: {
    host: 'localhost',
    port: 8080,
    inline: true
  }
};