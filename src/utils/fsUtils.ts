import fs from "fs";
import path from "path";

function getProjectRoot(): string {
    let currentDir = __dirname;
    while (!fs.existsSync(path.join(currentDir, "package.json"))) {
        currentDir = path.join(currentDir, "..");
    }
    return currentDir;
}

function deleteFile(path: string) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}

function getImagePath(sub: string, filename: string): string {
    return path.join(getProjectRoot(), "assets", "images", sub, filename);
}

export { deleteFile, getProjectRoot, getImagePath };
