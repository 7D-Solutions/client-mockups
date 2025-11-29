/**
 * Utility for generating unique usernames
 */

const AdminRepository = require('../repositories/AdminRepository');

/**
 * Generate a safe username from email
 * Handles edge cases like missing @, plus signs, etc.
 */
function generateUsernameFromEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Handle edge cases
  if (!email.includes('@')) {
    return null; // Invalid email, let validation catch it
  }

  const emailPrefix = email.split('@')[0];
  
  if (!emailPrefix) {
    return null; // Empty prefix
  }

  // Clean the username: remove special chars that might cause issues
  // Keep letters, numbers, dots, underscores, hyphens
  const cleanUsername = emailPrefix
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase()
    .substring(0, 30); // Limit length

  return cleanUsername || null;
}

/**
 * Generate a unique username by checking database
 */
async function generateUniqueUsername(email, pool, excludeUserId = null) {
  const baseUsername = generateUsernameFromEmail(email);
  
  if (!baseUsername) {
    return null; // Let frontend/validation handle this
  }

  // Create repository instance
  const adminRepository = new AdminRepository();

  // Check if base username is available
  const existingUsers = await adminRepository.getUsers();
  const isBaseTaken = existingUsers.some(user => 
    user.username === baseUsername && (!excludeUserId || user.id !== excludeUserId)
  );

  if (!isBaseTaken) {
    return baseUsername; // Available!
  }

  // Generate alternatives with numbers
  for (let i = 2; i <= 999; i++) {
    const candidate = `${baseUsername}${i}`;
    const isCandidateTaken = existingUsers.some(user => 
      user.username === candidate && (!excludeUserId || user.id !== excludeUserId)
    );

    if (!isCandidateTaken) {
      return candidate;
    }
  }

  // If we can't find a unique username after 999 attempts, return null
  // This will cause validation to fail and require manual username entry
  return null;
}

module.exports = {
  generateUsernameFromEmail,
  generateUniqueUsername
};