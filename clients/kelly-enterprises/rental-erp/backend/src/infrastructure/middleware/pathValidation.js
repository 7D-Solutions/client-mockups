/**
 * Path Validation Middleware
 * Prevents path traversal attacks by validating URL paths
 */

const pathValidationMiddleware = (req, res, next) => {
  const path = req.path;
  
  // Decode URL to catch encoded path traversal attempts
  const decodedPath = decodeURIComponent(path);
  
  // Check for path traversal patterns
  const pathTraversalPatterns = [
    /\.\./,           // Directory traversal
    /\.\.\//,         // Unix directory traversal
    /\.\.\\/,         // Windows directory traversal
    /%2e%2e/i,        // URL-encoded ..
    /%2f/i,           // URL-encoded /
    /%5c/i,           // URL-encoded \
    /\.\.%2f/i,       // Mixed encoding
    /\.\.%5c/i,       // Mixed encoding
  ];
  
  // Check if path contains traversal patterns
  const hasTraversal = pathTraversalPatterns.some(pattern => 
    pattern.test(path) || pattern.test(decodedPath)
  );
  
  if (hasTraversal) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  }
  
  next();
};

module.exports = { pathValidationMiddleware };