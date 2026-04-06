'use strict';

const { forbidden } = require('../utils/errors');

function requireRole(...allowedRoles) {
  return function (req, _res, next) {
    try {
      if (!req.account) {
        throw forbidden('Authenticated account required');
      }

      if (!allowedRoles.includes(req.account.role)) {
        throw forbidden('Insufficient permissions');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireRole,
};