'use strict';

const { Server } = require('socket.io');
const prisma = require('./db');
const { verifyJwt } = require('./utils/tokens');

let ioInstance = null;

async function findCurrentActiveNegotiationForSocket(accountId, role, now = new Date()) {
  const where =
    role === 'REGULAR'
      ? { userId: accountId, status: 'ACTIVE', expiresAt: { gt: now } }
      : { businessId: accountId, status: 'ACTIVE', expiresAt: { gt: now } };

  return prisma.negotiation.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

function attach_sockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Not authenticated'));
      }

      const payload = verifyJwt(token);

      const account = await prisma.account.findUnique({
        where: { id: payload.id },
      });

      if (!account) {
        return next(new Error('Not authenticated'));
      }

      socket.account = {
        id: account.id,
        role: account.role,
      };

      return next();
    } catch (_err) {
      return next(new Error('Not authenticated'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`account:${socket.account.id}`);
    try {
      const current = await findCurrentActiveNegotiationForSocket(
        socket.account.id,
        socket.account.role
      );

      if (current) {
        socket.join(`negotiation:${current.id}`);
      }
    } catch (_err) {
      // ignore reconnect room-join errors
    }

    socket.on('negotiation:message', async (payload = {}) => {
      try {
        if (!socket.account) {
          socket.emit('negotiation:error', {
            error: 'Not authenticated',
            message: 'Socket is not authenticated',
          });
          return;
        }

        const negotiationId = Number(payload.negotiation_id);
        const text = typeof payload.text === 'string' ? payload.text.trim() : '';

        if (!Number.isInteger(negotiationId) || !text) {
          socket.emit('negotiation:error', {
            error: 'Negotiation not found',
            message: 'Invalid negotiation payload',
          });
          return;
        }

        const requested = await prisma.negotiation.findUnique({
          where: { id: negotiationId },
        });

        const now = new Date();

        if (
          !requested ||
          requested.status !== 'ACTIVE' ||
          now.getTime() >= new Date(requested.expiresAt).getTime()
        ) {
          socket.emit('negotiation:error', {
            error: 'Negotiation not found',
            message: 'Negotiation not found or not active',
          });
          return;
        }

        const isParty =
          (socket.account.role === 'REGULAR' && requested.userId === socket.account.id) ||
          (socket.account.role === 'BUSINESS' && requested.businessId === socket.account.id);

        if (!isParty) {
          socket.emit('negotiation:error', {
            error: 'Not part of this negotiation',
            message: 'Authenticated user is not part of this negotiation',
          });
          return;
        }

        const current = await findCurrentActiveNegotiationForSocket(
          socket.account.id,
          socket.account.role,
          now
        );

        if (!current) {
          socket.emit('negotiation:error', {
            error: 'Negotiation not found',
            message: 'No current active negotiation',
          });
          return;
        }

        if (current.id !== requested.id) {
          socket.emit('negotiation:error', {
            error: 'Negotiation mismatch',
            message: 'Negotiation id does not match current active negotiation',
          });
          return;
        }

        const messagePayload = {
          negotiation_id: requested.id,
          sender: {
            role: socket.account.role === 'BUSINESS' ? 'business' : 'regular',
            id: socket.account.id,
          },
          text,
          createdAt: now.toISOString(),
        };

        io.to(`negotiation:${requested.id}`).emit('negotiation:message', messagePayload);
      } catch (_err) {
        socket.emit('negotiation:error', {
          error: 'Negotiation not found',
          message: 'Unable to process negotiation message',
        });
      }
    });
  });

  return io;
}

function get_io() {
  return ioInstance;
}

module.exports = { attach_sockets, get_io };