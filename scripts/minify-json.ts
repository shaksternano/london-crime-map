import * as fs from "fs";
import * as path from "path";
import viteConfig from "../vite.config";

const OUTPUT_DIRECTORY = path.join(viteConfig.root, viteConfig.build.outDir);

function minifyJsonFiles(directory: string) {
    fs.readdirSync(directory).forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            minifyJsonFiles(filePath);
        } else {
            const extension = path.extname(file);
            if (extension === ".json" || extension === ".geojson") {
                const content = fs.readFileSync(filePath, "utf8");
                const minifiedContent = minifyJson(content);
                const outputPath = path.join(OUTPUT_DIRECTORY, file);
                fs.writeFileSync(outputPath, minifiedContent + "\n");
                console.log(`Minified: ${filePath}`);
            }
        }
    });
}

function minifyJson(content: string): string {
    return JSON.stringify(JSON.parse(content));
}

minifyJsonFiles(viteConfig.root);
