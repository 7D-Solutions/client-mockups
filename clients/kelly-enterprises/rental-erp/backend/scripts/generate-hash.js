/**
 * Generate bcrypt hash for password
 */

const bcrypt = require('bcryptjs');

const password = '1157dD%#';
const rounds = 10;

bcrypt.hash(password, rounds, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    console.log('Password:', password);
    console.log('Bcrypt Hash:', hash);
    console.log('\nSQL Command:');
    console.log(`UPDATE users SET password_hash = '${hash}', failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE email = 'james@7dmanufacturing.com';`);
});
