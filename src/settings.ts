enum NodeEnv{
    Development = "development",
    Production = "production"
}

// Singleton class to manage application settings
class Settings {
    private static _instance: Settings;
    
    logData = process.env["LOG_DATA"] === "true" ? true : false;
    verbose = process.env["VERBOSE"] === "true" ? true : false;
    port = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000;
    nodeEnv = process.env["NODE_ENV"] as NodeEnv;
    jwtSecret = process.env["JWT_SECRET"];
    jwtExpiresIn = process.env["JWT_EXPIRES_IN"];

    private constructor() { }

    public static getInstance(): Settings {
        if (!Settings._instance) {
            Settings._instance = new Settings();
        }
        
        return Settings._instance;
    }
}

export default Settings.getInstance();