/**
 * Remove unique constraint on is_current field in certificates table
 * This allows multiple certificates to be marked as current for a gauge
 */

const mysql = require('mysql2/promise');

async function removeConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'fai_db_sandbox'
  });

  try {
    console.log('🔍 Checking for idx_one_current_per_gauge constraint...');

    // Check if the constraint exists
    const [indexes] = await connection.query(`
      SHOW INDEXES FROM certificates WHERE Key_name = 'idx_one_current_per_gauge'
    `);

    if (indexes.length > 0) {
      console.log('✅ Found constraint idx_one_current_per_gauge');
      console.log('🗑️  Dropping constraint...');

      await connection.query(`
        ALTER TABLE certificates DROP INDEX idx_one_current_per_gauge
      `);

      console.log('✅ Constraint removed successfully!');
    } else {
      console.log('ℹ️  Constraint idx_one_current_per_gauge does not exist (already removed or never existed)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

removeConstraint()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
