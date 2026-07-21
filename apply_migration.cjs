const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = path.join(__dirname, 'supabase', 'migrations', '20260123_create_worker_attendance.sql');

async function applyMigration() {
    console.log("Applying migration from:", MIGRATION_FILE);
    
    // Try default Supabase Local ports
    const ports = [54322, 5432];
    
    for (const port of ports) {
        console.log(`Attempting connection to localhost:${port}...`);
        const client = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: 'postgres',
            port: port,
        });

        try {
            await client.connect();
            console.log("Connected successfully!");
            
            const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
            await client.query(sql);
            console.log("Migration executed successfully.");
            
            await client.end();
            return; // Success
        } catch (err) {
            console.error(`Failed on port ${port}:`, err.message);
            await client.end().catch(() => {});
        }
    }
    
    console.error("Could not apply migration on any standard port.");
}

applyMigration();
