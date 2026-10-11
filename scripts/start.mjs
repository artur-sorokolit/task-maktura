import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const INSTALL = existsSync("node_modules") ? [] : ["npm ci"];
const STEPS = [...INSTALL, "npm run build", "npm run serve"];

const succeeds = (command) => spawnSync(command, { stdio: "inherit", shell: true }).status === 0;

process.exit(STEPS.every(succeeds) ? 0 : 1);
