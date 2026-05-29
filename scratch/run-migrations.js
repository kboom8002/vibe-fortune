const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const host = process.argv[2];
  const password = process.argv[3];

  if (!host || !password) {
    console.error("Usage: node run-migrations.js <host> <password>");
    process.exit(1);
  }

  console.log(`Connecting to database at ${host}...`);

  const client = new Client({
    host,
    port: 6543,
    user: 'postgres.ecsvwzhafxskjdtjkswm',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
    const migrationFiles = [
      '0001_initial_schema.sql',
      '0002_rls_policies.sql',
      '0003_indexes.sql'
    ];

    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL statements
      // We can execute the whole file at once
      await client.query(sql);
      console.log(`Migration ${file} applied successfully.`);
    }

    console.log("All migrations applied successfully!");
  } catch (err) {
    console.error("Error applying migrations:", err);
  } finally {
    await client.end();
  }
}

run();
