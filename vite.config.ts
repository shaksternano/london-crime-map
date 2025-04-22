import {defineConfig} from "vite";
import {createHtmlPlugin} from "vite-plugin-html";
import {bundleD3Plugin} from "./scripts/bundle-d3-plugin";

// https://vitejs.dev/config
export default defineConfig({
    plugins: [
        createHtmlPlugin({
            minify: true,
        }),
        bundleD3Plugin(),
    ],
    root: "./src",
    publicDir: "../public/",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
});
