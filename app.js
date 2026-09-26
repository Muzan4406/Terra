if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
  console.warn(
    "DATABASE_URL is unset; using SUPABASE_DATABASE_URL for the production server.",
  );
}

import("./dist/index.cjs").catch((error) => {
  console.error(
    "Could not load the production server bundle. Ensure dist/index.cjs was built and deployed.",
  );
  console.error(error);
  process.exitCode = 1;
});