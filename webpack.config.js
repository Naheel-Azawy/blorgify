const path                 = require("path");
const fs                   = require("fs");
const webpack              = require("webpack");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function buildString() {
    let d = new Date();
    let ret = d.getFullYear() +
        d.getMonth().toString().padStart(2, '0') +
        d.getDate().toString().padStart(2, '0') +
        "-" +
        d.getHours().toString().padStart(2, '0') +
        d.getMinutes().toString().padStart(2, '0');
    return JSON.stringify(ret);
}

function file(path) {
    return JSON.stringify(fs.readFileSync(path).toString());
}

module.exports = env => {
    return {
        target:  "node",
        mode:    env.production ? "production" : "development",
        devtool: env.production ? undefined : "inline-source-map",

        entry: {blorgify: "./blorgify.js"},

        output: {
            path:     path.resolve(__dirname, "dist"),
            filename: "[name]",
            clean:    false
        },

        resolve: {
            extensions: [".js"],
        },

        plugins: [
            new webpack.DefinePlugin({
                GIT_REPO:   "'https://github.com/Naheel-Azawy/blorgify'",
                BUILD:      buildString(),
                TEMP_INDEX: file("./template-index.html"),
                TEMP_BLOG:  file("./template-blog.html")
            }),

            new webpack.BannerPlugin({
                banner:  fs.readFileSync("./launcher.sh").toString(),
                include: "blorgify",
                raw:     true
            }),

            //new BundleAnalyzerPlugin()
        ]
    };
};
