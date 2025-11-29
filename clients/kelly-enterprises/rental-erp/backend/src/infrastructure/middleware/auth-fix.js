// Temporary fix to map database role names to middleware expectations

const originalRequireOperator = require('./auth').requireOperator;
const originalAuthenticateToken = require('./auth').authenticateToken;

// Override authenticateToken to map role names
const authenticateTokenFixed = (req, res, next) => {
  const originalNext = next;
  
  // Wrap next to fix role names after token is authenticated
  const wrappedNext = (err) => {
    if (!err && req.user && req.user.roles) {
      // Map database role names to middleware expected names
      req.user.roles = req.user.roles.map(role => {
        switch(role) {
          case 'gauge_user': return 'operator';
          case 'gauge_admin': return 'admin';
          case 'gauge_manager': return 'admin';
          case 'quality_inspector': return 'inspector';
          default: return role;
        }
      });
    }
    originalNext(err);
  };
  
  originalAuthenticateToken(req, res, wrappedNext);
};

module.exports = {
  authenticateTokenFixed
};