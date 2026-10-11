import { z } from "zod";

const text = z.string().trim().min(1);
const instant = z.iso.datetime({ offset: true });

const engagementSchema = z.object({
  postId: text,
  type: z.enum(["reaction", "comment"]),
  personName: text,
  profileUrl: text,
  headline: z.string().nullish(),
  company: z.string().nullish(),
  at: instant,
  text: z.string().nullish(),
});

export const exportSchema = z.object({
  account: z.object({ name: text, profileUrl: text, company: text }),
  asOf: instant,
  targetRoles: z.array(text),
  knownContacts: z.array(text),
  posts: z.array(z.object({ id: text, publishedAt: instant, title: text })),
  engagements: z.array(engagementSchema),
});

export type ExportFile = z.infer<typeof exportSchema>;

export type ExportIssue = { path: string; message: string };

export type ParsedExport = { ok: true; data: ExportFile } | { ok: false; issues: ExportIssue[] };

const WHOLE_FILE = "file";

const pathSegment = (part: PropertyKey): string =>
  typeof part === "number" ? `[${part}]` : `.${String(part)}`;

const issuePath = (path: readonly PropertyKey[]): string =>
  path.map(pathSegment).join("").replace(/^\./, "") || WHOLE_FILE;

const toExportIssue = ({ path, message }: z.core.$ZodIssue): ExportIssue => ({
  path: issuePath(path),
  message,
});

export const parseExport = (raw: unknown): ParsedExport => {
  const result = exportSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, issues: result.error.issues.map(toExportIssue) };
};
