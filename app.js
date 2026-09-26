import("./dist/index.cjs").catch((error) => {
  console.error(
    "Could not load the production server bundle. Ensure dist/index.cjs was built and deployed.",
  );
  console.error(error);
  process.exitCode = 1;
});