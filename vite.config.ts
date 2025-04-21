import {defineConfig} from "vite";
import {createHtmlPlugin} from "vite-plugin-html";

// https://vitejs.dev/config
export default defineConfig({
    plugins: [
        createHtmlPlugin({
            minify: true,
        }),
    ],
    root: "./src",
    publicDir: "../public/",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
});
