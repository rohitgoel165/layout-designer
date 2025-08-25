const jwt = require('jsonwebtoken');

module.exports = function orgContext(req, _res, next) {
  let orgId = req.header('x-org-id'); // simple passthrough option

  if (!orgId) {
    const auth = req.header('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (token) {
      try {
        // Prefer verify when you have a secret/public key. Otherwise decode.
        let payload;
        if (process.env.JWT_PUBLIC_KEY) {
          payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
        } else if (process.env.JWT_SECRET) {
          payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } else {
          payload = jwt.decode(token) || {};
        }

        orgId = payload.orgId || payload.tenantId || payload.organizationId || orgId;
      } catch (e) {
        // Do not block; allow public routes if you have any
      }
    }
  }

  req.orgId = orgId || null; // keep nullable if you support public/global records
  next();
};
