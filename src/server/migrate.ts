import { DATABASE_PATH } from "./config";
import { appliedMigrations, openDb } from "./db";

const db = openDb(DATABASE_PATH);
console.log(`${DATABASE_PATH} is up to date (${appliedMigrations(db).join(", ")})`);
db.close();
