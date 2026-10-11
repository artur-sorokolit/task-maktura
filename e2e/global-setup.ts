import fs from "node:fs";
import { E2E_DATABASE } from "../playwright.config";

const SQLITE_FILE_SUFFIXES = ["", "-wal", "-shm"];

const removeDatabase = (): void =>
  SQLITE_FILE_SUFFIXES.forEach((suffix) => fs.rmSync(E2E_DATABASE + suffix, { force: true }));

export default removeDatabase;
