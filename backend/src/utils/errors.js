'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function badRequest(message = 'Bad request') {
  return new HttpError(400, message);
}

function unauthorized(message = 'Unauthorized') {
  return new HttpError(401, message);
}

function forbidden(message = 'Forbidden') {
  return new HttpError(403, message);
}

function notFound(message = 'Not found') {
  return new HttpError(404, message);
}

function methodNotAllowed(message = 'Method not allowed') {
  return new HttpError(405, message);
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
};