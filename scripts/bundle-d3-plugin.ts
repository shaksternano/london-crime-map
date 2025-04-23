import {Plugin} from "vite";

export function bundleD3Plugin(): Plugin {
    return {
        name: "bundle-d3-plugin",
        transform(code, id) {
            let transformedCode = code;
            if (id.endsWith(".js")) {
                transformedCode = code.replace(
                    /import\s+\*\s+as\s+d3\s+from\s+['"].+['"]/,
                    "import * as d3 from \"d3\"",
                );
            }
            return {
                code: transformedCode,
                map: null,
            };
        },
    };
}
