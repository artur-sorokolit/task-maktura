export const PORT = Number(process.env.PORT ?? 3000);
export const DATABASE_PATH = process.env.DATABASE_PATH ?? "data/maktura.sqlite";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
