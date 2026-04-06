'use strict';

const prisma = require('../db');
const { unauthorized } = require('../utils/errors');
const { verifyJwt } = require('../utils/tokens');

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
      throw unauthorized('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('Invalid Authorization header');
    }

    let payload;
    try {
      payload = verifyJwt(token);
    } catch (_err) {
      throw unauthorized('Invalid or expired token');
    }

    const account = await prisma.account.findUnique({
      where: { id: payload.id },
      include: {
        regularUser: true,
        business: true,
        admin: true,
      },
    });

    if (!account) {
      throw unauthorized('Account not found');
    }

    req.account = account;
    req.user = account.regularUser || null;
    req.business = account.business || null;
    req.admin = account.admin || null;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
};