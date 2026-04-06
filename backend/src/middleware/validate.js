'use strict';

const { badRequest } = require('../utils/errors');

function requireJson(req, _res, next) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  if (req.is('multipart/form-data')) {
    return next();
  }

  const contentLength = req.get('Content-Length');
  const transferEncoding = req.get('Transfer-Encoding');

  const hasBody =
    (contentLength && contentLength !== '0') ||
    transferEncoding;

  if (!hasBody) {
    return next();
  }

  if (!req.is('application/json')) {
    return next(badRequest('Expected application/json'));
  }

  next();
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!(field in body)) {
      throw badRequest(`Missing field: ${field}`);
    }
  }
}

function allowOnlyFields(body, allowedFields) {
  const allowed = new Set(allowedFields);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw badRequest(`Unexpected field: ${key}`);
    }
  }
}

function requireExactFields(body, fields) {
  requireFields(body, fields);
  allowOnlyFields(body, fields);
}

function parseBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }
  throw badRequest(`Field "${fieldName}" must be a boolean`);
}

function parseNumber(value, fieldName) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw badRequest(`Field "${fieldName}" must be a number`);
}

function parseString(value, fieldName) {
  if (typeof value === 'string') {
    return value;
  }
  throw badRequest(`Field "${fieldName}" must be a string`);
}

function parseOptionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw badRequest(`Field "${fieldName}" must be a string`);
}

function parseArray(value, fieldName) {
  if (Array.isArray(value)) {
    return value;
  }
  throw badRequest(`Field "${fieldName}" must be an array`);
}

module.exports = {
  requireJson,
  requireFields,
  allowOnlyFields,
  requireExactFields,
  parseBoolean,
  parseNumber,
  parseString,
  parseOptionalString,
  parseArray,
};