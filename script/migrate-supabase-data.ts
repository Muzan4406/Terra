import pg from "pg";

const { Pool } = pg;

type TableNameRow = { table_name: string };
type ColumnRow = {
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
};
type ForeignKeyRow = { child_table: string; parent_table: string };
type SequenceRow = { sequencename: string };

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sortedTables(tableNames: string[], foreignKeys: ForeignKeyRow[]): string[] {
  const remaining = new Map(tableNames.map((tableName) => [tableName, new Set<string>()]));

  for (const { child_table: child, parent_table: parent } of foreignKeys) {
    if (child !== parent && remaining.has(child) && remaining.has(parent)) {
      remaining.get(child)!.add(parent);
    }
  }

  const ordered: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([tableName]) => tableName)
      .sort();

    if (ready.length === 0) {
      throw new Error("Foreign-key cycle found; refusing to copy data in an unsafe order.");
    }

    for (const tableName of ready) {
      ordered.push(tableName);
      remaining.delete(tableName);
    }
    for (const dependencies of remaining.values()) {
      for (const tableName of ready) dependencies.delete(tableName);
    }
  }

  return ordered;
}

function assertDifferentDatabases(sourceUrl: string, targetUrl: string): void {
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  if (source.host === target.host && source.pathname === target.pathname) {
    throw new Error("Source and destination appear to be the same database.");
  }
}

async function main(): Promise<void> {
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = process.env.SUPABASE_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    throw new Error("DATABASE_URL and SUPABASE_DATABASE_URL are both required.");
  }
  assertDifferentDatabases(sourceUrl, targetUrl);

  const source = new Pool({ connectionString: sourceUrl, max: 1, connectionTimeoutMillis: 10000 });
  const target = new Pool({ connectionString: targetUrl, max: 1, connectionTimeoutMillis: 10000 });

  let client: pg.PoolClient | undefined;
  let transactionStarted = false;

  try {
    await Promise.all([source.query("SELECT 1"), target.query("SELECT 1")]);

    const [sourceTableResult, targetTableResult] = await Promise.all([
      source.query<TableNameRow>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
      ),
      target.query<TableNameRow>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
      ),
    ]);
    const sourceTables = sourceTableResult.rows.map((row) => row.table_name);
    const targetTables = targetTableResult.rows.map((row) => row.table_name);
    const missing = sourceTables.filter((tableName) => !targetTables.includes(tableName));
    const extra = targetTables.filter((tableName) => !sourceTables.includes(tableName));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Source and Supabase table sets differ. Missing in Supabase: ${missing.join(", ") || "none"}; extra in Supabase: ${extra.join(", ") || "none"}.`,
      );
    }
    if (sourceTables.length === 0) {
      throw new Error("The source database has no public tables to migrate.");
    }

    const [sourceColumnsResult, targetColumnsResult] = await Promise.all([
      source.query<ColumnRow>(
        "SELECT table_name, column_name, ordinal_position, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
      ),
      target.query<ColumnRow>(
        "SELECT table_name, column_name, ordinal_position, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
      ),
    ]);
    const columnSignature = (columns: ColumnRow[]) =>
      columns.map((column) =>
        [
          column.table_name,
          column.column_name,
          column.ordinal_position,
          column.data_type,
          column.udt_name,
        ].join(":"),
      );
    const sourceSignature = columnSignature(sourceColumnsResult.rows);
    const targetSignature = columnSignature(targetColumnsResult.rows);
    if (JSON.stringify(sourceSignature) !== JSON.stringify(targetSignature)) {
      throw new Error("Source and Supabase columns differ; refusing to copy rows.");
    }

    const sourceCounts = new Map<string, number>();
    for (const tableName of sourceTables) {
      const quotedTable = quoteIdentifier(tableName);
      const [sourceCount, targetCount] = await Promise.all([
        source.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM public.${quotedTable}`),
        target.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM public.${quotedTable}`),
      ]);
      const count = Number(sourceCount.rows[0].count);
      if (!Number.isSafeInteger(count)) {
        throw new Error(`Unsafe row count for table ${tableName}.`);
      }
      if (Number(targetCount.rows[0].count) !== 0) {
        throw new Error(`Supabase table ${tableName} is not empty; no rows were copied.`);
      }
      sourceCounts.set(tableName, count);
    }

    const foreignKeys = await source.query<ForeignKeyRow>(
      "SELECT tc.table_name AS child_table, ccu.table_name AS parent_table FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_schema = 'public'",
    );
    const migrationOrder = sortedTables(sourceTables, foreignKeys.rows);
    const sequences = await source.query<SequenceRow>(
      "SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename",
    );

    client = await target.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    let migratedRows = 0;
    for (const tableName of migrationOrder) {
      const quotedTable = quoteIdentifier(tableName);
      const sourceRows = await source.query<Record<string, unknown>>(
        `SELECT * FROM public.${quotedTable}`,
      );
      const columnNames = sourceRows.fields.map((field) => field.name);
      if (columnNames.length === 0) {
        throw new Error(`Could not read the column list for ${tableName}.`);
      }

      const maxRowsPerInsert = Math.max(1, Math.floor(60000 / columnNames.length));
      for (let start = 0; start < sourceRows.rows.length; start += maxRowsPerInsert) {
        const batch = sourceRows.rows.slice(start, start + maxRowsPerInsert);
        const values: unknown[] = [];
        const tuples = batch.map((row) => {
          const placeholders = columnNames.map((columnName) => {
            values.push(row[columnName]);
            return `$${values.length}`;
          });
          return `(${placeholders.join(", ")})`;
        });
        const columnsSql = columnNames.map(quoteIdentifier).join(", ");
        await client.query(
          `INSERT INTO public.${quotedTable} (${columnsSql}) VALUES ${tuples.join(", ")}`,
          values,
        );
      }
      migratedRows += sourceRows.rowCount ?? 0;
    }

    for (const { sequencename } of sequences.rows) {
      const quotedSequence = quoteIdentifier(sequencename);
      const sequenceState = await source.query<{ last_value: string; is_called: boolean }>(
        `SELECT last_value::text, is_called FROM public.${quotedSequence}`,
      );
      const targetSequence = await client.query<{ sequence_name: string | null }>(
        "SELECT to_regclass($1) AS sequence_name",
        [`public.${sequencename}`],
      );
      if (!targetSequence.rows[0].sequence_name) {
        throw new Error(`Supabase is missing sequence ${sequencename}.`);
      }
      const state = sequenceState.rows[0];
      await client.query("SELECT setval($1::regclass, $2::bigint, $3)", [
        `public.${sequencename}`,
        state.last_value,
        state.is_called,
      ]);
    }

    for (const tableName of sourceTables) {
      const quotedTable = quoteIdentifier(tableName);
      const targetCount = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.${quotedTable}`,
      );
      if (Number(targetCount.rows[0].count) !== sourceCounts.get(tableName)) {
        throw new Error(`Row count verification failed for ${tableName}.`);
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;
    console.log(
      JSON.stringify({
        migratedTables: sourceTables.length,
        migratedRows,
        sourceAndTargetVerified: true,
      }),
    );
  } catch (error) {
    if (transactionStarted && client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "migration_error";
    console.error(
      `Supabase data migration failed (${code}). Connection strings and row values were not logged.`,
    );
    process.exitCode = 1;
  } finally {
    client?.release();
    await Promise.all([source.end(), target.end()]);
  }
}

void main();