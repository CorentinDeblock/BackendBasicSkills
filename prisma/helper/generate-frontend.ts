import { execSync } from "child_process";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

class GenerateFrontend {
    generate() {
        const frontendProject = process.env.FRONTEND_PROJECT;

        if(!frontendProject) {
            throw new Error("FRONTEND_PROJECT is not set in .env");
        }

        console.log("Generating all schemas");
    
        const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

        frontendProject.split(",").forEach((project) => {
            this.generateSchema(schema, project);
        });

        console.log("All schemas generated");
    }

    private generateSchema(schema: string, frontendProject: string) {        
        const newSchema = schema.split("\n").map((line) => {
            if(line.startsWith("generator client {")) {
                line += `\n  output = "${frontendProject}"`;
            }

            return line;
        }).join("\n");

        fs.writeFileSync("prisma/frontend.prisma", newSchema);
        execSync("npx prisma generate --schema=prisma/frontend.prisma");
        fs.rmSync("prisma/frontend.prisma");

        console.log("Schema generated for " + frontendProject);
    }
}

new GenerateFrontend().generate();