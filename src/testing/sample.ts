import fs from "node:fs";
import { exportSchema, type ExportFile } from "../domain/exportSchema";

type Engagement = ExportFile["engagements"][number];

export const sampleJson = (): unknown => JSON.parse(fs.readFileSync("engagements.json", "utf8"));

export const sample = (): ExportFile => exportSchema.parse(sampleJson());

export const withChangedEngagements = (
  file: ExportFile,
  changes: Record<number, object>,
): object => ({
  ...file,
  engagements: file.engagements.map((engagement, index) => ({ ...engagement, ...changes[index] })),
});

export const withExtraEngagement = (file: ExportFile, extra: Engagement): ExportFile => ({
  ...file,
  engagements: [...file.engagements, extra],
});
