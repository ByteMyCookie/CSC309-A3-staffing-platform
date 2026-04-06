'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateJwt(account) {
  return jwt.sign(
    {
      id: account.id,
      role: account.role,
      email: account.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateResetToken,
  generateJwt,
  verifyJwt,
};