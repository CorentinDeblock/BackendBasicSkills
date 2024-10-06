type LogLevel = "debug" | "info" | "warn" | "error" | "fatal" | "silent";

enum NodeEnv {
  Development = "development",
  Production = "production",
}

// Singleton class to manage application settings
class Settings {
  private static _instance: Settings;

  logLevel = (process.env["LOG_LEVEL"] as LogLevel) ?? "info";
  tz = process.env["TZ"] ?? "Africa/Abidjan";
  port = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000;
  nodeEnv = process.env["NODE_ENV"] as NodeEnv;
  jwtSecret = process.env["JWT_SECRET"] ?? "secret";
  jwtExpiresIn = process.env["JWT_EXPIRES_IN"] ?? "1h";
  hashSalt = process.env["HASH_SALT"] ? parseInt(process.env["HASH_SALT"]) : 10;
  sessionSecret = process.env["SESSION_SECRET"] ?? "secret";

  private constructor() {}

  public static getInstance(): Settings {
    if (!Settings._instance) {
      Settings._instance = new Settings();
    }

    return Settings._instance;
  }
}

export default Settings.getInstance();
