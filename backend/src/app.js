'use strict';

// 1. Core & Third-Party Modules
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
const prisma = require('./db');
const { get_io } = require('./socket');
const cors = require('cors');

// 2. Middleware
const {
  requireJson,
  requireFields,
  allowOnlyFields,
  parseString,
  parseNumber,
  parseOptionalString,
} = require('./middleware/validate');
const { requireAuth } = require('./middleware/auth');
const { requireRole } = require('./middleware/roles');

// 3. Utilities
const {
  getEffectiveAvailability,
  hasApprovedQualification,
  isUserDiscoverableForJob, // Combined here
} = require('./utils/discoverability');

const {
  HttpError,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
} = require('./utils/errors');

const {
  isValidPassword,
  hashPassword,
  comparePassword,
} = require('./utils/passwords');

const { generateResetToken, generateJwt, verifyJwt } = require('./utils/tokens');

const {
  getJobStatus,
  assertValidSalaryRange,
  assertValidJobTimes,
  assertJobStartWithinWindow,
  assertJobHasEnoughNegotiationTime,
  attachDistanceAndEta,
} = require('./utils/jobs');

const { parseDateTime } = require('./utils/time');

const {
  isNegotiationActive,
  buildNegotiationExpiry,
  decisionsToApiShape,
  isMutualInterest,
  applyDecisionToNegotiation,
} = require('./utils/negotiations');

// 4. Multer Configuration
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

const IMAGE_MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const DOC_MIME_TO_EXT = {
  'application/pdf': 'pdf',
};

// 5. App Configuration & State
const RESET_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let JOB_START_WINDOW_HOURS = 24 * 7;
let NEGOTIATION_WINDOW_MINUTES = 15;
let RESET_COOLDOWN_SECONDS = 0;
let AVAILABILITY_TIMEOUT_MINUTES = 5;

const lastResetRequestByIp = new Map();




// Helper functions

function methodNotAllowed(_req, _res, next) {
  next(new HttpError(405, 'Method not allowed'));
}

function addMs(date, ms) {
  return new Date(date.getTime() + ms);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidBirthday(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function roleToApi(role) {
  if (role === 'REGULAR') return 'regular';
  if (role === 'BUSINESS') return 'business';
  if (role === 'ADMIN') return 'admin';
  return String(role || '').toLowerCase();
}

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw badRequest(`${fieldName} must be a positive integer`);
  }
  return num;
}

function parseOptionalQueryNumber(value, fieldName) {
  if (value === undefined) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw badRequest(`${fieldName} must be a number`);
  }
  return num;
}

function parseOptionalQueryDate(value, fieldName) {
  if (value === undefined) return undefined;
  return parseDateTime(String(value), fieldName);
}

function parseStatusArray(value, defaultStatuses) {
  if (value === undefined) {
    return defaultStatuses;
  }

  let arr;
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    arr = value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  } else {
    throw badRequest('status must be an array or comma-separated string');
  }

  const allowed = new Set(['open', 'expired', 'filled', 'canceled', 'completed']);
  for (const s of arr) {
    if (!allowed.has(String(s).toLowerCase())) {
      throw badRequest(`Invalid status: ${s}`);
    }
  }

  return arr.map((s) => String(s).toLowerCase());
}

function serializeRegularUser(account, effectiveAvailable = false) {
  const user = account.regularUser;
  return {
    id: account.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: account.email,
    activated: account.activated,
    suspended: user.suspended,
    available: effectiveAvailable,
    role: roleToApi(account.role),
    phone_number: user.phoneNumber,
    postal_address: user.postalAddress,
    birthday: user.birthday,
    createdAt: account.createdAt,
    avatar: user.avatar,
    resume: user.resume,
    biography: user.biography,
  };
}

function serializeBusiness(account) {
  const business = account.business;
  return {
    id: account.id,
    business_name: business.businessName,
    owner_name: business.ownerName,
    email: account.email,
    activated: account.activated,
    verified: business.verified,
    role: roleToApi(account.role),
    phone_number: business.phoneNumber,
    postal_address: business.postalAddress,
    location: {
      lon: business.lon,
      lat: business.lat,
    },
    avatar: business.avatar,
    biography: business.biography,
    createdAt: account.createdAt,
  };
}

function serializeQualificationBasic(qualification) {
  return {
    id: qualification.id,
    status: qualification.status.toLowerCase(),
    note: qualification.note,
    document: qualification.document,
    user: {
      id: qualification.user.id,
      first_name: qualification.user.firstName,
      last_name: qualification.user.lastName,
    },
    position_type: {
      id: qualification.positionType.id,
      name: qualification.positionType.name,
    },
    updatedAt: qualification.updatedAt,
  };
}

function serializeQualificationDetailForAdminOrOwner(qualification) {
  return {
    id: qualification.id,
    document: qualification.document,
    note: qualification.note,
    position_type: {
      id: qualification.positionType.id,
      name: qualification.positionType.name,
      description: qualification.positionType.description,
    },
    updatedAt: qualification.updatedAt,
    user: {
      id: qualification.user.id,
      first_name: qualification.user.firstName,
      last_name: qualification.user.lastName,
      role: 'regular',
      avatar: qualification.user.avatar,
      resume: qualification.user.resume,
      biography: qualification.user.biography,
      email: qualification.user.account.email,
      phone_number: qualification.user.phoneNumber,
      postal_address: qualification.user.postalAddress,
      birthday: qualification.user.birthday,
      activated: qualification.user.account.activated,
      suspended: qualification.user.suspended,
      createdAt: qualification.user.account.createdAt,
    },
    status: qualification.status.toLowerCase(),
  };
}

function serializeWorker(worker) {
  if (!worker) return null;
  return {
    id: worker.id,
    first_name: worker.firstName,
    last_name: worker.lastName,
  };
}

function serializeJobDetail(job, now, extra = {}) {
  const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  const result = {
    id: job.id,
    status,
    position_type: {
      id: job.positionType.id,
      name: job.positionType.name,
    },
    business: {
      id: job.business.id,
      business_name: job.business.businessName,
    },
    worker: serializeWorker(job.worker),
    note: job.note,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    start_time: job.startTime,
    end_time: job.endTime,
    updatedAt: job.updatedAt,
  };

  if (extra.distance !== undefined) {
    result.distance = extra.distance;
  }
  if (extra.eta !== undefined) {
    result.eta = extra.eta;
  }

  return result;
}

function serializeBusinessJobListItem(job, now) {
  const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  return {
    id: job.id,
    status,
    position_type: {
      id: job.positionType.id,
      name: job.positionType.name,
    },
    business_id: job.businessId,
    worker: serializeWorker(job.worker),
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    start_time: job.startTime,
    end_time: job.endTime,
    updatedAt: job.updatedAt,
  };
}

function serializeRegularJobListItem(job, now, extra = {}) {
  const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  const result = {
    id: job.id,
    status,
    position_type: {
      id: job.positionType.id,
      name: job.positionType.name,
    },
    business: {
      id: job.business.id,
      business_name: job.business.businessName,
    },
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    start_time: job.startTime,
    end_time: job.endTime,
    updatedAt: job.updatedAt,
  };

  if (extra.distance !== undefined) {
    result.distance = extra.distance;
  }
  if (extra.eta !== undefined) {
    result.eta = extra.eta;
  }

  return result;
}

async function createRegularUser(body) {
  allowOnlyFields(body, [
    'first_name',
    'last_name',
    'email',
    'password',
    'phone_number',
    'postal_address',
    'birthday',
  ]);
  requireFields(body, ['first_name', 'last_name', 'email', 'password']);

  const firstName = parseString(body.first_name, 'first_name').trim();
  const lastName = parseString(body.last_name, 'last_name').trim();
  const email = parseString(body.email, 'email').trim().toLowerCase();
  const password = parseString(body.password, 'password');

  const phoneNumber =
    body.phone_number === undefined ? '' : parseString(body.phone_number, 'phone_number');
  const postalAddress =
    body.postal_address === undefined ? '' : parseString(body.postal_address, 'postal_address');
  const birthday =
    body.birthday === undefined ? '1970-01-01' : parseString(body.birthday, 'birthday');

  if (!firstName) throw badRequest('first_name must not be empty');
  if (!lastName) throw badRequest('last_name must not be empty');
  if (!isValidEmail(email)) throw badRequest('Invalid email');
  if (!isValidPassword(password)) throw badRequest('Invalid password');
  if (!isValidBirthday(birthday)) throw badRequest('birthday must be YYYY-MM-DD');

  const existing = await prisma.account.findUnique({
    where: { email },
  });
  if (existing) {
    throw new HttpError(409, 'Email already exists');
  }

  const now = new Date();
  const resetToken = generateResetToken();
  const expiresAt = addMs(now, RESET_TOKEN_TTL_MS);
  const passwordHash = await hashPassword(password);

  const account = await prisma.$transaction(async (tx) => {
    const createdAccount = await tx.account.create({
      data: {
        email,
        passwordHash,
        role: 'REGULAR',
        activated: false,
        resetToken,
        resetTokenExpiresAt: expiresAt,
        resetTokenUsedAt: null,
      },
    });

    await tx.regularUser.create({
      data: {
        id: createdAccount.id,
        firstName,
        lastName,
        phoneNumber,
        postalAddress,
        birthday,
        suspended: false,
        available: false,
        biography: '',
      },
    });

    return tx.account.findUnique({
      where: { id: createdAccount.id },
      include: { regularUser: true },
    });
  });

  return {
    ...serializeRegularUser(account, false),
    resetToken,
    expiresAt,
  };
}

async function createBusiness(body) {
  allowOnlyFields(body, [
    'business_name',
    'owner_name',
    'email',
    'password',
    'phone_number',
    'postal_address',
    'location',
  ]);
  requireFields(body, [
    'business_name',
    'owner_name',
    'email',
    'password',
    'phone_number',
    'postal_address',
    'location',
  ]);

  const businessName = parseString(body.business_name, 'business_name').trim();
  const ownerName = parseString(body.owner_name, 'owner_name').trim();
  const email = parseString(body.email, 'email').trim().toLowerCase();
  const password = parseString(body.password, 'password');
  const phoneNumber = parseString(body.phone_number, 'phone_number');
  const postalAddress = parseString(body.postal_address, 'postal_address');

  if (!businessName) throw badRequest('business_name must not be empty');
  if (!ownerName) throw badRequest('owner_name must not be empty');
  if (!isValidEmail(email)) throw badRequest('Invalid email');
  if (!isValidPassword(password)) throw badRequest('Invalid password');

  if (typeof body.location !== 'object' || body.location === null || Array.isArray(body.location)) {
    throw badRequest('location must be an object');
  }
  allowOnlyFields(body.location, ['lon', 'lat']);

  const lon = parseNumber(body.location.lon, 'location.lon');
  const lat = parseNumber(body.location.lat, 'location.lat');

  const existing = await prisma.account.findUnique({
    where: { email },
  });
  if (existing) {
    throw new HttpError(409, 'Email already exists');
  }

  const now = new Date();
  const resetToken = generateResetToken();
  const expiresAt = addMs(now, RESET_TOKEN_TTL_MS);
  const passwordHash = await hashPassword(password);

  const account = await prisma.$transaction(async (tx) => {
    const createdAccount = await tx.account.create({
      data: {
        email,
        passwordHash,
        role: 'BUSINESS',
        activated: false,
        resetToken,
        resetTokenExpiresAt: expiresAt,
        resetTokenUsedAt: null,
      },
    });

    await tx.business.create({
      data: {
        id: createdAccount.id,
        businessName,
        ownerName,
        phoneNumber,
        postalAddress,
        lon,
        lat,
        verified: false,
        biography: '',
      },
    });

    return tx.account.findUnique({
      where: { id: createdAccount.id },
      include: { business: true },
    });
  });

  return {
    ...serializeBusiness(account),
    resetToken,
    expiresAt,
  };
}

async function requestResetToken(req, body) {
  allowOnlyFields(body, ['email']);
  requireFields(body, ['email']);

  const email = parseString(body.email, 'email').trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw badRequest('Invalid email');
  }

  const now = new Date();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const last = lastResetRequestByIp.get(ip);

  if (
    RESET_COOLDOWN_SECONDS > 0 &&
    last &&
    now.getTime() - last.getTime() < RESET_COOLDOWN_SECONDS * 1000
  ) {
    throw new HttpError(429, 'Too many reset requests');
  }

  const account = await prisma.account.findUnique({
    where: { email },
  });

  if (!account) {
    throw notFound('Account not found');
  }

  const resetToken = generateResetToken();
  const expiresAt = addMs(now, RESET_TOKEN_TTL_MS);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      resetToken,
      resetTokenExpiresAt: expiresAt,
      resetTokenUsedAt: null,
    },
  });

  lastResetRequestByIp.set(ip, now);

  return {
    resetToken,
    expiresAt,
  };
}

async function useResetToken(resetToken, body) {
  allowOnlyFields(body, ['email', 'password']);
  requireFields(body, ['email']);

  const email = parseString(body.email, 'email').trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw badRequest('Invalid email');
  }

  const account = await prisma.account.findFirst({
    where: {
      resetToken,
      resetTokenUsedAt: null,
    },
  });

  if (!account) {
    throw notFound('Reset token not found');
  }

  if (account.email !== email) {
    throw unauthorized('Reset token does not belong to this email');
  }

  const now = new Date();

  if (
    !account.resetTokenExpiresAt ||
    now.getTime() > new Date(account.resetTokenExpiresAt).getTime()
  ) {
    throw new HttpError(410, 'Reset token expired');
  }

  const updateData = {
    activated: true,
    resetTokenUsedAt: now,
  };

  if (body.password !== undefined) {
    const password = parseString(body.password, 'password');
    if (!isValidPassword(password)) {
      throw badRequest('Invalid password');
    }
    updateData.passwordHash = await hashPassword(password);
  }

  await prisma.account.update({
    where: { id: account.id },
    data: updateData,
  });

  return {};
}

async function createJwtToken(body) {
  allowOnlyFields(body, ['email', 'password']);
  requireFields(body, ['email', 'password']);

  const email = parseString(body.email, 'email').trim().toLowerCase();
  const password = parseString(body.password, 'password');

  const account = await prisma.account.findUnique({
    where: { email },
  });

  if (!account) {
    throw unauthorized('Invalid email or password');
  }

  const ok = await comparePassword(password, account.passwordHash);
  if (!ok) {
    throw unauthorized('Invalid email or password');
  }

  if (!account.activated) {
    throw forbidden('Account is not activated');
  }

  const token = generateJwt(account);
  const expiresAt = addMs(new Date(), JWT_TTL_MS);

  return {
    token,
    expiresAt,
  };
}

async function getMyRegularUser(accountId) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      regularUser: true,
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const effectiveAvailable = getEffectiveAvailability(
    account.regularUser,
    new Date(),
    AVAILABILITY_TIMEOUT_MINUTES
  );

  return serializeRegularUser(account, effectiveAvailable);
}

async function patchMyRegularUser(accountId, body) {
  const allowedFields = [
    'first_name',
    'last_name',
    'phone_number',
    'postal_address',
    'birthday',
    'avatar',
    'biography',
  ];

  allowOnlyFields(body, allowedFields);

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw badRequest('No fields provided');
  }

  const updateData = {};
  const response = {};

  if ('first_name' in body) {
    const value = parseString(body.first_name, 'first_name').trim();
    if (!value) throw badRequest('first_name must not be empty');
    updateData.firstName = value;
    response.first_name = value;
  }

  if ('last_name' in body) {
    const value = parseString(body.last_name, 'last_name').trim();
    if (!value) throw badRequest('last_name must not be empty');
    updateData.lastName = value;
    response.last_name = value;
  }

  if ('phone_number' in body) {
    const value = parseString(body.phone_number, 'phone_number');
    updateData.phoneNumber = value;
    response.phone_number = value;
  }

  if ('postal_address' in body) {
    const value = parseString(body.postal_address, 'postal_address');
    updateData.postalAddress = value;
    response.postal_address = value;
  }

  if ('birthday' in body) {
    const value = parseString(body.birthday, 'birthday');
    if (!isValidBirthday(value)) {
      throw badRequest('birthday must be YYYY-MM-DD');
    }
    updateData.birthday = value;
    response.birthday = value;
  }

  if ('avatar' in body) {
    const value = parseOptionalString(body.avatar, 'avatar');
    updateData.avatar = value;
    response.avatar = value;
  }

  if ('biography' in body) {
    const value = parseString(body.biography, 'biography');
    updateData.biography = value;
    response.biography = value;
  }

  await prisma.regularUser.update({
    where: { id: accountId },
    data: updateData,
  });

  return response;
}

async function patchMyAvailability(accountId, body) {
  allowOnlyFields(body, ['available']);
  requireFields(body, ['available']);

  if (typeof body.available !== 'boolean') {
    throw badRequest('available must be a boolean');
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      regularUser: true,
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const desiredAvailability = body.available;

  if (desiredAvailability === true) {
    if (account.regularUser.suspended) {
      throw badRequest('Suspended users cannot set availability to true');
    }

    const approvedQualificationCount = await prisma.qualification.count({
      where: {
        userId: accountId,
        status: 'APPROVED',
      },
    });

    if (approvedQualificationCount === 0) {
      throw badRequest('User must have at least one approved qualification');
    }
  }

  const updateData = {
    available: desiredAvailability,
  };

  if (desiredAvailability === true) {
    updateData.lastActiveAt = new Date();
  }

  await prisma.regularUser.update({
    where: { id: accountId },
    data: updateData,
  });

  return {
    available: desiredAvailability,
  };
}

async function getMyBusiness(accountId) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      business: true,
    },
  });

  if (!account || !account.business) {
    throw notFound('Business not found');
  }

  return serializeBusiness(account);
}

async function patchMyBusiness(accountId, body) {
  const allowedFields = [
    'business_name',
    'owner_name',
    'phone_number',
    'postal_address',
    'location',
    'avatar',
    'biography',
  ];

  allowOnlyFields(body, allowedFields);

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw badRequest('No fields provided');
  }

  const updateData = {};
  const response = {};

  if ('business_name' in body) {
    const value = parseString(body.business_name, 'business_name').trim();
    if (!value) throw badRequest('business_name must not be empty');
    updateData.businessName = value;
    response.business_name = value;
  }

  if ('owner_name' in body) {
    const value = parseString(body.owner_name, 'owner_name').trim();
    if (!value) throw badRequest('owner_name must not be empty');
    updateData.ownerName = value;
    response.owner_name = value;
  }

  if ('phone_number' in body) {
    const value = parseString(body.phone_number, 'phone_number');
    updateData.phoneNumber = value;
    response.phone_number = value;
  }

  if ('postal_address' in body) {
    const value = parseString(body.postal_address, 'postal_address');
    updateData.postalAddress = value;
    response.postal_address = value;
  }

  if ('location' in body) {
    if (typeof body.location !== 'object' || body.location === null || Array.isArray(body.location)) {
      throw badRequest('location must be an object');
    }

    allowOnlyFields(body.location, ['lon', 'lat']);

    const lon = parseNumber(body.location.lon, 'location.lon');
    const lat = parseNumber(body.location.lat, 'location.lat');

    updateData.lon = lon;
    updateData.lat = lat;
    response.location = { lon, lat };
  }

  if ('avatar' in body) {
    const value = parseOptionalString(body.avatar, 'avatar');
    updateData.avatar = value;
    response.avatar = value;
  }

  if ('biography' in body) {
    const value = parseString(body.biography, 'biography');
    updateData.biography = value;
    response.biography = value;
  }

  await prisma.business.update({
    where: { id: accountId },
    data: updateData,
  });

  return response;
}

async function createPositionType(body) {
  allowOnlyFields(body, ['name', 'description', 'hidden']);
  requireFields(body, ['name', 'description']);

  const name = parseString(body.name, 'name').trim();
  const description = parseString(body.description, 'description').trim();
  const hidden = body.hidden === undefined ? true : body.hidden;

  if (!name) throw badRequest('name must not be empty');
  if (!description) throw badRequest('description must not be empty');
  if (typeof hidden !== 'boolean') throw badRequest('hidden must be a boolean');

  const created = await prisma.positionType.create({
    data: {
      name,
      description,
      hidden,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    hidden: created.hidden,
    num_qualified: 0,
  };
}

async function createQualification(accountId, body) {
  allowOnlyFields(body, ['position_type_id', 'note']);
  requireFields(body, ['position_type_id']);

  const positionTypeId = parsePositiveInt(body.position_type_id, 'position_type_id');
  const note = body.note === undefined ? '' : parseString(body.note, 'note');

  const positionType = await prisma.positionType.findUnique({
    where: { id: positionTypeId },
  });

  if (!positionType || positionType.hidden) {
    throw notFound('Position type not found');
  }

  const existing = await prisma.qualification.findFirst({
    where: {
      userId: accountId,
      positionTypeId,
    },
  });

  if (existing) {
    throw new HttpError(409, 'Qualification already exists for this position type');
  }

  const qualification = await prisma.qualification.create({
    data: {
      userId: accountId,
      positionTypeId,
      status: 'CREATED',
      note,
    },
    include: {
      user: true,
      positionType: true,
    },
  });

  return serializeQualificationBasic(qualification);
}

async function getQualificationById(accountId, role, qualificationId) {
  const id = parsePositiveInt(qualificationId, 'qualificationId');

  const qualification = await prisma.qualification.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          account: true,
        },
      },
      positionType: true,
    },
  });

  if (!qualification) {
    throw notFound('Qualification not found');
  }

  if (role === 'REGULAR' && qualification.userId !== accountId) {
    throw notFound('Qualification not found');
  }

  if (role !== 'REGULAR' && role !== 'ADMIN') {
    throw forbidden('Insufficient permissions');
  }

  return serializeQualificationDetailForAdminOrOwner(qualification);
}

async function patchQualification(accountId, role, qualificationId, body) {
  const id = parsePositiveInt(qualificationId, 'qualificationId');

  allowOnlyFields(body, ['status', 'note']);

  if (!('status' in body) && !('note' in body)) {
    throw badRequest('No fields provided');
  }

  const qualification = await prisma.qualification.findUnique({
    where: { id },
    include: {
      user: true,
      positionType: true,
    },
  });

  if (!qualification) {
    throw notFound('Qualification not found');
  }

  if (role === 'REGULAR' && qualification.userId !== accountId) {
    throw notFound('Qualification not found');
  }

  const updateData = {};

  if ('note' in body) {
    updateData.note = parseString(body.note, 'note');
  }

  if ('status' in body) {
    const nextStatus = parseString(body.status, 'status').trim().toUpperCase();
    const currentStatus = qualification.status;

    if (role === 'REGULAR') {
      const allowed =
        (currentStatus === 'CREATED' && nextStatus === 'SUBMITTED') ||
        ((currentStatus === 'APPROVED' || currentStatus === 'REJECTED') &&
          nextStatus === 'REVISED');

      if (!allowed) {
        throw forbidden('Status transition not allowed for regular user');
      }
    } else if (role === 'ADMIN') {
      const allowed =
        (currentStatus === 'SUBMITTED' || currentStatus === 'REVISED') &&
        (nextStatus === 'APPROVED' || nextStatus === 'REJECTED');

      if (!allowed) {
        throw forbidden('Status transition not allowed for admin');
      }
    } else {
      throw forbidden('Insufficient permissions');
    }

    updateData.status = nextStatus;
  }

  const updated = await prisma.qualification.update({
    where: { id },
    data: updateData,
    include: {
      user: true,
      positionType: true,
    },
  });

  return serializeQualificationBasic(updated);
}

async function createBusinessJob(accountId, body) {
  allowOnlyFields(body, [
    'position_type_id',
    'salary_min',
    'salary_max',
    'start_time',
    'end_time',
    'note',
  ]);
  requireFields(body, [
    'position_type_id',
    'salary_min',
    'salary_max',
    'start_time',
    'end_time',
  ]);

  const business = await prisma.business.findUnique({
    where: { id: accountId },
  });

  if (!business) {
    throw notFound('Business not found');
  }

  if (!business.verified) {
    throw forbidden('Business is not verified');
  }

  const positionTypeId = parsePositiveInt(body.position_type_id, 'position_type_id');
  const salaryMin = parseNumber(body.salary_min, 'salary_min');
  const salaryMax = parseNumber(body.salary_max, 'salary_max');
  const startTime = parseDateTime(body.start_time, 'start_time');
  const endTime = parseDateTime(body.end_time, 'end_time');
  const note = body.note === undefined ? '' : parseString(body.note, 'note');

  const positionType = await prisma.positionType.findUnique({
    where: { id: positionTypeId },
  });

  if (!positionType) {
    throw notFound('Position type not found');
  }

  const now = new Date();

  assertValidSalaryRange(salaryMin, salaryMax);
  assertValidJobTimes(startTime, endTime);

  if (startTime.getTime() < now.getTime() || endTime.getTime() < now.getTime()) {
    throw badRequest('start_time and end_time must not be in the past');
  }

  assertJobStartWithinWindow(startTime, now, JOB_START_WINDOW_HOURS);
  assertJobHasEnoughNegotiationTime(startTime, now, NEGOTIATION_WINDOW_MINUTES);

  const job = await prisma.job.create({
    data: {
      businessId: accountId,
      positionTypeId,
      note,
      salaryMin,
      salaryMax,
      startTime,
      endTime,
    },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  return serializeJobDetail(job, now);
}

async function listBusinessJobs(accountId, query) {
  const positionTypeId =
    query.position_type_id === undefined
      ? undefined
      : parsePositiveInt(query.position_type_id, 'position_type_id');
  const salaryMinFilter = parseOptionalQueryNumber(query.salary_min, 'salary_min');
  const salaryMaxFilter = parseOptionalQueryNumber(query.salary_max, 'salary_max');
  const startTimeFilter = parseOptionalQueryDate(query.start_time, 'start_time');
  const endTimeFilter = parseOptionalQueryDate(query.end_time, 'end_time');
  const statuses = parseStatusArray(query.status, ['open', 'filled']);
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');

  const now = new Date();

  const jobs = await prisma.job.findMany({
    where: {
      businessId: accountId,
    },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  let filtered = jobs.filter((job) => {
    const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

    if (!statuses.includes(status)) return false;
    if (positionTypeId !== undefined && job.positionTypeId !== positionTypeId) return false;
    if (salaryMinFilter !== undefined && job.salaryMax < salaryMinFilter) return false;
    if (salaryMaxFilter !== undefined && job.salaryMin > salaryMaxFilter) return false;
    if (startTimeFilter && new Date(job.startTime).getTime() < startTimeFilter.getTime()) return false;
    if (endTimeFilter && new Date(job.endTime).getTime() > endTimeFilter.getTime()) return false;

    return true;
  });

  filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const count = filtered.length;
  const start = (page - 1) * limit;
  const results = filtered
    .slice(start, start + limit)
    .map((job) => serializeBusinessJobListItem(job, now));

  return { count, results };
}

async function getOwnedBusinessJobOr404(accountId, jobId) {
  const id = parsePositiveInt(jobId, 'jobId');

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  if (!job || job.businessId !== accountId) {
    throw notFound('Job not found');
  }

  return job;
}

async function patchBusinessJob(accountId, jobId, body) {
  allowOnlyFields(body, ['salary_min', 'salary_max', 'start_time', 'end_time', 'note']);

  if (Object.keys(body).length === 0) {
    throw badRequest('No fields provided');
  }

  const now = new Date();
  const job = await getOwnedBusinessJobOr404(accountId, jobId);
  const currentStatus = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  if (currentStatus !== 'open') {
    throw new HttpError(409, 'Job is no longer open');
  }

  const nextSalaryMin =
    body.salary_min === undefined ? job.salaryMin : parseNumber(body.salary_min, 'salary_min');
  const nextSalaryMax =
    body.salary_max === undefined ? job.salaryMax : parseNumber(body.salary_max, 'salary_max');
  const nextStartTime =
    body.start_time === undefined ? new Date(job.startTime) : parseDateTime(body.start_time, 'start_time');
  const nextEndTime =
    body.end_time === undefined ? new Date(job.endTime) : parseDateTime(body.end_time, 'end_time');
  const nextNote = body.note === undefined ? job.note : parseString(body.note, 'note');

  assertValidSalaryRange(nextSalaryMin, nextSalaryMax);
  assertValidJobTimes(nextStartTime, nextEndTime);

  if (nextStartTime.getTime() < now.getTime() || nextEndTime.getTime() < now.getTime()) {
    throw badRequest('start_time and end_time must not be in the past');
  }

  assertJobStartWithinWindow(nextStartTime, now, JOB_START_WINDOW_HOURS);
  assertJobHasEnoughNegotiationTime(nextStartTime, now, NEGOTIATION_WINDOW_MINUTES);

  const updateData = {};
  const response = {};

  if (body.salary_min !== undefined) {
    updateData.salaryMin = nextSalaryMin;
    response.salary_min = nextSalaryMin;
  }
  if (body.salary_max !== undefined) {
    updateData.salaryMax = nextSalaryMax;
    response.salary_max = nextSalaryMax;
  }
  if (body.start_time !== undefined) {
    updateData.startTime = nextStartTime;
    response.start_time = nextStartTime;
  }
  if (body.end_time !== undefined) {
    updateData.endTime = nextEndTime;
    response.end_time = nextEndTime;
  }
  if (body.note !== undefined) {
    updateData.note = nextNote;
    response.note = nextNote;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedJob = await tx.job.update({
      where: { id: job.id },
      data: updateData,
    });

    await tx.negotiation.updateMany({
      where: {
        jobId: job.id,
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
      data: {
        candidateDecision: null,
        businessDecision: null,
      },
    });

    return updatedJob;
  });

  response.updatedAt = updated.updatedAt;
  return response;
}

async function deleteBusinessJob(accountId, jobId) {
  const now = new Date();
  const job = await getOwnedBusinessJobOr404(accountId, jobId);
  const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  if (status !== 'open' && status !== 'expired') {
    throw new HttpError(409, 'Only open or expired jobs can be deleted');
  }

  const activeNegotiationCount = await prisma.negotiation.count({
    where: {
      jobId: job.id,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
  });

  if (activeNegotiationCount > 0) {
    throw new HttpError(409, 'Cannot delete a job with an active negotiation');
  }

  await prisma.job.delete({
    where: { id: job.id },
  });
}

async function listOpenJobsForRegular(accountId, query) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
        },
      },
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const lat = parseOptionalQueryNumber(query.lat, 'lat');
  const lon = parseOptionalQueryNumber(query.lon, 'lon');
  if ((lat === undefined) !== (lon === undefined)) {
    throw badRequest('lat and lon must be specified together');
  }

  const positionTypeId =
    query.position_type_id === undefined
      ? undefined
      : parsePositiveInt(query.position_type_id, 'position_type_id');
  const businessId =
    query.business_id === undefined ? undefined : parsePositiveInt(query.business_id, 'business_id');

  const sort = query.sort === undefined ? 'start_time' : String(query.sort);
  const order = query.order === undefined ? 'asc' : String(query.order).toLowerCase();
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');

  const allowedSort = new Set(['updatedAt', 'start_time', 'salary_min', 'salary_max', 'distance', 'eta']);
  if (!allowedSort.has(sort)) {
    throw badRequest('Invalid sort');
  }
  if (order !== 'asc' && order !== 'desc') {
    throw badRequest('Invalid order');
  }
  if ((sort === 'distance' || sort === 'eta') && (lat === undefined || lon === undefined)) {
    throw badRequest('lat and lon are required when sorting by distance or eta');
  }

  const now = new Date();

  const jobs = await prisma.job.findMany({
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  const filtered = jobs.filter((job) => {
    const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);
    if (status !== 'open') return false;
    if (positionTypeId !== undefined && job.positionTypeId !== positionTypeId) return false;
    if (businessId !== undefined && job.businessId !== businessId) return false;

    return hasApprovedQualification(account.regularUser, job.positionTypeId);
  });

  const mapped = filtered.map((job) => {
    if (lat !== undefined && lon !== undefined) {
      const withDistance = attachDistanceAndEta(job, lat, lon);
      return serializeRegularJobListItem(job, now, {
        distance: withDistance.distance,
        eta: withDistance.eta,
      });
    }
    return serializeRegularJobListItem(job, now);
  });

  mapped.sort((a, b) => {
    let av;
    let bv;

    if (sort === 'start_time') {
      av = new Date(a.start_time).getTime();
      bv = new Date(b.start_time).getTime();
    } else if (sort === 'salary_min') {
      av = a.salary_min;
      bv = b.salary_min;
    } else if (sort === 'salary_max') {
      av = a.salary_max;
      bv = b.salary_max;
    } else if (sort === 'updatedAt') {
      av = new Date(a.updatedAt).getTime();
      bv = new Date(b.updatedAt).getTime();
    } else if (sort === 'distance') {
      av = a.distance;
      bv = b.distance;
    } else {
      av = a.eta;
      bv = b.eta;
    }

    return order === 'asc' ? av - bv : bv - av;
  });

  const count = mapped.length;
  const start = (page - 1) * limit;
  const results = mapped.slice(start, start + limit);

  return { count, results };
}

async function getJobDetailForViewer(accountId, role, jobId, query) {
  const id = parsePositiveInt(jobId, 'jobId');

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  if (!job) {
    throw notFound('Job not found');
  }

  const now = new Date();
  const status = getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES);

  if (role === 'BUSINESS') {
    if (query.lat !== undefined || query.lon !== undefined) {
      throw badRequest('Businesses cannot specify lat/lon');
    }
    if (job.businessId !== accountId) {
      throw notFound('Job not found');
    }
    return serializeJobDetail(job, now);
  }

  const lat = parseOptionalQueryNumber(query.lat, 'lat');
  const lon = parseOptionalQueryNumber(query.lon, 'lon');
  if ((lat === undefined) !== (lon === undefined)) {
    throw badRequest('lat and lon must be specified together');
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
        },
      },
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const qualified = hasApprovedQualification(account.regularUser, job.positionTypeId);

  const userOwnsFilledOutcome =
    job.workerId === accountId &&
    (status === 'filled' || status === 'canceled' || status === 'completed');

  if (status === 'open') {
    if (!qualified) {
      throw forbidden('Regular user does not qualify for this job');
    }

    if (lat !== undefined && lon !== undefined) {
      const withDistance = attachDistanceAndEta(job, lat, lon);
      return serializeJobDetail(job, now, {
        distance: withDistance.distance,
        eta: withDistance.eta,
      });
    }

    return serializeJobDetail(job, now);
  }

  if (!userOwnsFilledOutcome) {
    throw notFound('Job not found');
  }

  if (lat !== undefined || lon !== undefined) {
    const withDistance = attachDistanceAndEta(job, lat, lon);
    return serializeJobDetail(job, now, {
      distance: withDistance.distance,
      eta: withDistance.eta,
    });
  }

  return serializeJobDetail(job, now);
}

async function noShowBusinessJob(accountId, jobId) {
  const now = new Date();
  const job = await getOwnedBusinessJobOr404(accountId, jobId);

  if (!job.workerId) {
    throw new HttpError(409, 'Job is not filled');
  }

  const startTime = new Date(job.startTime);
  const endTime = new Date(job.endTime);

  if (now.getTime() < startTime.getTime()) {
    throw new HttpError(409, 'Job has not started yet');
  }

  if (now.getTime() >= endTime.getTime()) {
    throw new HttpError(409, 'Job is already over');
  }

  const updatedJob = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: job.id },
      data: {
        canceledAt: now,
      },
    });

    await tx.regularUser.update({
      where: { id: job.workerId },
      data: {
        suspended: true,
        available: false,
      },
    });

    return updated;
  });

  return {
    id: updatedJob.id,
    status: 'canceled',
    updatedAt: updatedJob.updatedAt,
  };
}

function parseOptionalQueryBoolean(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw badRequest(`${fieldName} must be true or false`);
}

function serializePositionType(positionType, numQualified = 0) {
  return {
    id: positionType.id,
    name: positionType.name,
    description: positionType.description,
    hidden: positionType.hidden,
    num_qualified: numQualified,
  };
}

async function listUsersAdmin(query) {
  const suspended = parseOptionalQueryBoolean(query.suspended, 'suspended');
  const activated = parseOptionalQueryBoolean(query.activated, 'activated');
  const email = query.email === undefined ? undefined : String(query.email).trim().toLowerCase();

  const accounts = await prisma.account.findMany({
    where: {
      role: 'REGULAR',
      ...(activated === undefined ? {} : { activated }),
      ...(email === undefined ? {} : { email: { contains: email } }),
    },
    include: {
      regularUser: true,
    },
    orderBy: { id: 'asc' },
  });

  const now = new Date();
  const filtered = accounts.filter((account) => {
    if (suspended !== undefined && account.regularUser.suspended !== suspended) {
      return false;
    }
    return true;
  });

  const results = filtered.map((account) =>
    serializeRegularUser(
      account,
      getEffectiveAvailability(account.regularUser, now, AVAILABILITY_TIMEOUT_MINUTES)
    )
  );

  return { count: results.length, results };
}

function getOptionalRoleFromRequest(req) {
  const authHeader = req.get('Authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Invalid Authorization header');
  }

  try {
    const payload = verifyJwt(token);
    return payload.role || null;
  } catch (_err) {
    throw unauthorized('Invalid or expired token');
  }
}

async function listBusinesses(query, isAdmin) {
  const keyword =
    query.keyword === undefined ? undefined : String(query.keyword).trim().toLowerCase();
  const activated = parseOptionalQueryBoolean(query.activated, 'activated');
  const verified = parseOptionalQueryBoolean(query.verified, 'verified');
  const sort = query.sort === undefined ? undefined : String(query.sort).trim();
  const order =
    query.order === undefined ? 'asc' : String(query.order).trim().toLowerCase();
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');

  if (!['asc', 'desc'].includes(order)) {
    throw badRequest('order must be asc or desc');
  }

  if (!isAdmin && (activated !== undefined || verified !== undefined)) {
    throw badRequest('activated and verified are admin-only');
  }

  if (sort !== undefined) {
    const allowedSorts = isAdmin
      ? ['business_name', 'email', 'owner_name']
      : ['business_name', 'email'];

    if (!allowedSorts.includes(sort)) {
      throw badRequest('Invalid sort');
    }
  }

  const accounts = await prisma.account.findMany({
    where: { role: 'BUSINESS' },
    include: { business: true },
    orderBy: { id: 'asc' },
  });

  let filtered = accounts.filter((account) => {
    if (!account.business) return false;

    if (!isAdmin) {
      if (!account.activated || !account.business.verified) {
        return false;
      }
    } else {
      if (activated !== undefined && account.activated !== activated) {
        return false;
      }
      if (verified !== undefined && account.business.verified !== verified) {
        return false;
      }
    }

    if (keyword) {
      const haystack = [
        account.business.businessName,
        account.email,
        account.business.postalAddress,
        account.business.phoneNumber,
        ...(isAdmin ? [account.business.ownerName] : []),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(keyword)) {
        return false;
      }
    }

    return true;
  });

  if (sort) {
    const getSortValue = (account) => {
      if (sort === 'business_name') return account.business.businessName.toLowerCase();
      if (sort === 'email') return account.email.toLowerCase();
      return account.business.ownerName.toLowerCase();
    };

    filtered.sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);

      if (av < bv) return order === 'asc' ? -1 : 1;
      if (av > bv) return order === 'asc' ? 1 : -1;
      return a.id - b.id;
    });
  }

  const results = filtered.map((account) => {
    const base = {
      id: account.id,
      business_name: account.business.businessName,
      email: account.email,
      role: roleToApi(account.role),
      phone_number: account.business.phoneNumber,
      postal_address: account.business.postalAddress,
    };

    if (isAdmin) {
      return {
        ...base,
        owner_name: account.business.ownerName,
        verified: account.business.verified,
        activated: account.activated,
      };
    }

    return base;
  });

  const start = (page - 1) * limit;
  return {
    count: results.length,
    results: results.slice(start, start + limit),
  };
}

async function patchUserSuspended(userId, body) {
  allowOnlyFields(body, ['suspended']);
  requireFields(body, ['suspended']);

  if (typeof body.suspended !== 'boolean') {
    throw badRequest('suspended must be a boolean');
  }

  const id = parsePositiveInt(userId, 'userId');

  const existing = await prisma.regularUser.findUnique({
    where: { id },
  });

  if (!existing) {
    throw notFound('User not found');
  }

  await prisma.regularUser.update({
    where: { id },
    data: {
      suspended: body.suspended,
      ...(body.suspended ? { available: false } : {}),
    },
  });

  return {
    suspended: body.suspended,
  };
}

async function patchBusinessVerified(businessId, body) {
  allowOnlyFields(body, ['verified']);
  requireFields(body, ['verified']);

  if (typeof body.verified !== 'boolean') {
    throw badRequest('verified must be a boolean');
  }

  const id = parsePositiveInt(businessId, 'businessId');

  const existing = await prisma.business.findUnique({
    where: { id },
  });

  if (!existing) {
    throw notFound('Business not found');
  }

  await prisma.business.update({
    where: { id },
    data: {
      verified: body.verified,
    },
  });

  return {
    verified: body.verified,
  };
}

async function listPositionTypes(role, query) {
  const hidden = parseOptionalQueryBoolean(query.hidden, 'hidden');

  const where = {};
  if (role !== 'ADMIN') {
    where.hidden = false;
    if (hidden === true) {
      throw forbidden('Only admin can view hidden position types');
    }
  } else if (hidden !== undefined) {
    where.hidden = hidden;
  }

  const positionTypes = await prisma.positionType.findMany({
    where,
    orderBy: { id: 'asc' },
  });

  const ids = positionTypes.map((p) => p.id);

  const counts =
    ids.length === 0
      ? []
      : await prisma.qualification.groupBy({
          by: ['positionTypeId'],
          where: {
            positionTypeId: { in: ids },
            status: 'APPROVED',
          },
          _count: {
            _all: true,
          },
        });

  const countMap = new Map(counts.map((c) => [c.positionTypeId, c._count._all]));

  const results = positionTypes.map((p) =>
    serializePositionType(p, countMap.get(p.id) || 0)
  );

  return { count: results.length, results };
}

async function patchPositionType(positionTypeId, body) {
  allowOnlyFields(body, ['name', 'description', 'hidden']);

  if (Object.keys(body).length === 0) {
    throw badRequest('No fields provided');
  }

  const id = parsePositiveInt(positionTypeId, 'positionTypeId');

  const existing = await prisma.positionType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw notFound('Position type not found');
  }

  const updateData = {};
  const response = {};

  if ('name' in body) {
    const value = parseString(body.name, 'name').trim();
    if (!value) throw badRequest('name must not be empty');
    updateData.name = value;
    response.name = value;
  }

  if ('description' in body) {
    const value = parseString(body.description, 'description').trim();
    if (!value) throw badRequest('description must not be empty');
    updateData.description = value;
    response.description = value;
  }

  if ('hidden' in body) {
    if (typeof body.hidden !== 'boolean') {
      throw badRequest('hidden must be a boolean');
    }
    updateData.hidden = body.hidden;
    response.hidden = body.hidden;
  }

  const updated = await prisma.positionType.update({
    where: { id },
    data: updateData,
  });

  const approvedCount = await prisma.qualification.count({
    where: {
      positionTypeId: id,
      status: 'APPROVED',
    },
  });

  return {
    id: updated.id,
    ...response,
    num_qualified: approvedCount,
  };
}

async function deletePositionType(positionTypeId) {
  const id = parsePositiveInt(positionTypeId, 'positionTypeId');

  const existing = await prisma.positionType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw notFound('Position type not found');
  }

  const qualificationCount = await prisma.qualification.count({
    where: { positionTypeId: id },
  });

  const jobCount = await prisma.job.count({
    where: { positionTypeId: id },
  });

  if (qualificationCount > 0 || jobCount > 0) {
    throw new HttpError(409, 'Cannot delete a position type that is already in use');
  }

  await prisma.positionType.delete({
    where: { id },
  });
}

async function listQualifications(accountId, role, query) {
  const userId =
    query.user_id === undefined ? undefined : parsePositiveInt(query.user_id, 'user_id');
  const positionTypeId =
    query.position_type_id === undefined
      ? undefined
      : parsePositiveInt(query.position_type_id, 'position_type_id');

  let statuses;
  if (query.status === undefined) {
    statuses = undefined;
  } else {
    const raw =
      Array.isArray(query.status) ? query.status : String(query.status).split(',');
    const allowed = new Set(['CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISED']);
    statuses = raw.map((s) => String(s).trim().toUpperCase()).filter(Boolean);

    for (const s of statuses) {
      if (!allowed.has(s)) {
        throw badRequest(`Invalid status: ${s}`);
      }
    }
  }

  const where = {};

  if (role === 'REGULAR') {
    where.userId = accountId;
  } else if (userId !== undefined) {
    where.userId = userId;
  }

  if (positionTypeId !== undefined) {
    where.positionTypeId = positionTypeId;
  }

  if (statuses !== undefined) {
    where.status = { in: statuses };
  }

  const qualifications = await prisma.qualification.findMany({
    where,
    include: {
      user: {
        include: {
          account: true,
        },
      },
      positionType: true,
    },
    orderBy: { id: 'asc' },
  });

  const results =
    role === 'ADMIN'
      ? qualifications.map((q) => serializeQualificationDetailForAdminOrOwner(q))
      : qualifications.map((q) => serializeQualificationBasic(q));

  return { count: results.length, results };
}

function paginate(items, page, limit) {
  const count = items.length;
  const start = (page - 1) * limit;
  return {
    count,
    results: items.slice(start, start + limit),
  };
}

function serializeInterest(interest) {
  return {
    id: interest.id,
    job_id: interest.jobId,
    candidate: {
      id: interest.userId,
      interested: interest.candidateInterested,
    },
    business: {
      id: interest.job.businessId,
      interested: interest.businessInterested,
    },
  };
}

function serializeInvitationJob(job, now) {
  return {
    id: job.id,
    status: getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES),
    position_type: {
      id: job.positionType.id,
      name: job.positionType.name,
    },
    business: {
      id: job.business.id,
      business_name: job.business.businessName,
    },
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    start_time: job.startTime,
    end_time: job.endTime,
    updatedAt: job.updatedAt,
  };
}

function serializeUserInterestListItem(interest, now) {
  return {
    interest_id: interest.id,
    mutual: interest.candidateInterested === true && interest.businessInterested === true,
    job: {
      id: interest.job.id,
      status: getJobStatus(interest.job, now, NEGOTIATION_WINDOW_MINUTES),
      position_type: {
        id: interest.job.positionType.id,
        name: interest.job.positionType.name,
      },
      business: {
        id: interest.job.business.id,
        business_name: interest.job.business.businessName,
      },
      salary_min: interest.job.salaryMin,
      salary_max: interest.job.salaryMax,
      start_time: interest.job.startTime,
      end_time: interest.job.endTime,
      updatedAt: interest.job.updatedAt,
    },
  };
}

function serializeCandidateListItem(account, invited) {
  return {
    id: account.id,
    first_name: account.regularUser.firstName,
    last_name: account.regularUser.lastName,
    invited,
  };
}

function serializeJobSummaryForNegotiation(job, now) {
  return {
    id: job.id,
    status: getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES),
    position_type: {
      id: job.positionType.id,
      name: job.positionType.name,
    },
    business: {
      id: job.business.id,
      business_name: job.business.businessName,
    },
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    start_time: job.startTime,
    end_time: job.endTime,
    updatedAt: job.updatedAt,
  };
}

function serializeNegotiation(negotiation, now = new Date()) {
  return {
    id: negotiation.id,
    status: negotiation.status.toLowerCase(),
    createdAt: negotiation.createdAt,
    updatedAt: negotiation.updatedAt,
    expiresAt: negotiation.expiresAt,
    job: serializeJobSummaryForNegotiation(negotiation.job, now),
    user: {
      id: negotiation.user.id,
      first_name: negotiation.user.firstName,
      last_name: negotiation.user.lastName,
    },
    decisions: decisionsToApiShape(negotiation),
  };
}

async function findCurrentActiveNegotiationForAccount(accountId, role, now = new Date()) {
  const where =
    role === 'REGULAR'
      ? { userId: accountId, status: 'ACTIVE', expiresAt: { gt: now } }
      : { businessId: accountId, status: 'ACTIVE', expiresAt: { gt: now } };

  return prisma.negotiation.findFirst({
    where,
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
        },
      },
      user: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function patchJobInterested(accountId, jobId, body) {
  allowOnlyFields(body, ['interested']);
  requireFields(body, ['interested']);

  if (typeof body.interested !== 'boolean') {
    throw badRequest('interested must be a boolean');
  }

  const id = parsePositiveInt(jobId, 'jobId');
  const now = new Date();

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  if (!job) {
    throw notFound('Job not found');
  }

  if (getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES) !== 'open') {
    throw new HttpError(409, 'Job is no longer available');
  }

  if (!hasApprovedQualification(account.regularUser, job.positionTypeId)) {
    throw forbidden('Regular user does not qualify for this job');
  }

  const activeForThisJob = await prisma.negotiation.findFirst({
    where: {
      userId: accountId,
      jobId: id,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
  });

  if (activeForThisJob) {
    throw new HttpError(409, 'User is currently in a negotiation for this job');
  }

  const existing = await prisma.interest.findFirst({
    where: {
      jobId: id,
      userId: accountId,
    },
    include: {
      job: true,
    },
  });

  if (body.interested === false) {
    if (!existing || existing.candidateInterested !== true) {
      throw badRequest('No existing interest to withdraw');
    }

    const updated = await prisma.interest.update({
      where: { id: existing.id },
      data: {
        candidateInterested: false,
      },
      include: {
        job: true,
      },
    });

    return serializeInterest(updated);
  }

  const payload = existing
    ? await prisma.interest.update({
        where: { id: existing.id },
        data: {
          candidateInterested: true,
        },
        include: {
          job: true,
        },
      })
    : await prisma.interest.create({
        data: {
          jobId: id,
          userId: accountId,
          candidateInterested: true,
          businessInterested: null,
        },
        include: {
          job: true,
        },
      });

  await prisma.regularUser.update({
    where: { id: accountId },
    data: {
      lastActiveAt: now,
    },
  });

  return serializeInterest(payload);
}

async function listMyInvitations(accountId, query) {
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');
  const now = new Date();

  const interests = await prisma.interest.findMany({
    where: {
      userId: accountId,
      businessInterested: true,
      NOT: {
        candidateInterested: true,
      },
    },
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const jobs = interests
    .map((interest) => interest.job)
    .filter((job) => getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES) === 'open')
    .map((job) => serializeInvitationJob(job, now));

  return paginate(jobs, page, limit);
}

async function listMyInterests(accountId, query) {
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');
  const now = new Date();

  const interests = await prisma.interest.findMany({
    where: {
      userId: accountId,
      candidateInterested: true,
    },
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const results = interests
    .filter((interest) => getJobStatus(interest.job, now, NEGOTIATION_WINDOW_MINUTES) === 'open')
    .map((interest) => serializeUserInterestListItem(interest, now));

  return paginate(results, page, limit);
}

async function listJobCandidates(accountId, jobId, query) {
  const id = parsePositiveInt(jobId, 'jobId');
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');
  const now = new Date();

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      business: true,
      positionType: true,
      worker: true,
    },
  });

  if (!job || job.businessId !== accountId) {
    throw notFound('Job not found');
  }

  const accounts = await prisma.account.findMany({
    where: {
      role: 'REGULAR',
    },
    include: {
      regularUser: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  const interests = await prisma.interest.findMany({
    where: {
      jobId: id,
    },
  });

  const interestMap = new Map(interests.map((i) => [i.userId, i]));

  const results = accounts
    .filter((account) => {
      if (!account.regularUser) return false;
      return isUserDiscoverableForJob(
        account.regularUser,
        account,
        job,
        now,
        AVAILABILITY_TIMEOUT_MINUTES
      );
    })
    .map((account) => {
      const interest = interestMap.get(account.id);
      return serializeCandidateListItem(account, interest?.businessInterested === true);
    });

  return paginate(results, page, limit);
}

async function getJobCandidateDetail(accountId, jobId, userId) {
  const job = await getOwnedBusinessJobOr404(accountId, jobId);
  const targetUserId = parsePositiveInt(userId, 'userId');
  const now = new Date();

  const account = await prisma.account.findUnique({
    where: { id: targetUserId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const qualification = await prisma.qualification.findFirst({
    where: {
      userId: targetUserId,
      positionTypeId: job.positionTypeId,
      status: 'APPROVED',
    },
  });

  if (!qualification) {
    throw notFound('User not found');
  }

  const filledAndStillVisible =
    job.workerId === targetUserId &&
    now.getTime() < new Date(job.endTime).getTime();

  const discoverable = isUserDiscoverableForJob(
    account.regularUser,
    account,
    job,
    now,
    AVAILABILITY_TIMEOUT_MINUTES
  );

  if (!discoverable && !filledAndStillVisible) {
    throw forbidden('Regular user is no longer discoverable');
  }

  const userPayload = {
    id: account.id,
    first_name: account.regularUser.firstName,
    last_name: account.regularUser.lastName,
    avatar: account.regularUser.avatar,
    resume: account.regularUser.resume,
    biography: account.regularUser.biography,
    qualification: {
      id: qualification.id,
      position_type_id: qualification.positionTypeId,
      document: qualification.document,
      note: qualification.note,
      updatedAt: qualification.updatedAt,
    },
  };

  if (filledAndStillVisible) {
    userPayload.email = account.email;
    userPayload.phone_number = account.regularUser.phoneNumber;
  }

  return {
    user: userPayload,
    job: {
      id: job.id,
      status: getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES),
      position_type: {
        id: job.positionType.id,
        name: job.positionType.name,
        description: job.positionType.description,
      },
      start_time: job.startTime,
      end_time: job.endTime,
    },
  };
}

async function patchJobCandidateInterested(accountId, jobId, userId, body) {
  allowOnlyFields(body, ['interested']);
  requireFields(body, ['interested']);

  if (typeof body.interested !== 'boolean') {
    throw badRequest('interested must be a boolean');
  }

  const job = await getOwnedBusinessJobOr404(accountId, jobId);
  const now = new Date();

  if (getJobStatus(job, now, NEGOTIATION_WINDOW_MINUTES) !== 'open') {
    throw new HttpError(409, 'Job is not open');
  }

  const targetUserId = parsePositiveInt(userId, 'userId');

  const account = await prisma.account.findUnique({
    where: { id: targetUserId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
  });

  if (!account || !account.regularUser) {
    throw notFound('User not found');
  }

  const discoverable = isUserDiscoverableForJob(
    account.regularUser,
    account,
    job,
    now,
    AVAILABILITY_TIMEOUT_MINUTES
  );

  if (!discoverable) {
    throw forbidden('User is no longer discoverable');
  }

  const existing = await prisma.interest.findFirst({
    where: {
      jobId: job.id,
      userId: targetUserId,
    },
    include: {
      job: true,
    },
  });

  if (body.interested === false) {
    if (!existing || existing.businessInterested !== true) {
      throw badRequest('No existing invitation to withdraw');
    }

    const updated = await prisma.interest.update({
      where: { id: existing.id },
      data: {
        businessInterested: false,
      },
      include: {
        job: true,
      },
    });

    return serializeInterest(updated);
  }

  const payload = existing
    ? await prisma.interest.update({
        where: { id: existing.id },
        data: {
          businessInterested: true,
        },
        include: {
          job: true,
        },
      })
    : await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: targetUserId,
          candidateInterested: null,
          businessInterested: true,
        },
        include: {
          job: true,
        },
      });

  return serializeInterest(payload);
}

async function listJobInterests(accountId, jobId, query) {
  const job = await getOwnedBusinessJobOr404(accountId, jobId);
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page, 'page');
  const limit = query.limit === undefined ? 10 : parsePositiveInt(query.limit, 'limit');

  const interests = await prisma.interest.findMany({
    where: {
      jobId: job.id,
      candidateInterested: true,
    },
    include: {
      user: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const results = interests.map((interest) => ({
    interest_id: interest.id,
    mutual: interest.businessInterested === true,
    user: {
      id: interest.user.id,
      first_name: interest.user.firstName,
      last_name: interest.user.lastName,
    },
  }));

  return paginate(results, page, limit);
}

async function createNegotiation(accountId, role, body) {
  allowOnlyFields(body, ['interest_id']);
  requireFields(body, ['interest_id']);

  const interestId = parsePositiveInt(body.interest_id, 'interest_id');
  const now = new Date();

  const interest = await prisma.interest.findUnique({
    where: { id: interestId },
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
          worker: true,
        },
      },
      user: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
  });

  if (!interest) {
    throw notFound('Interest not found');
  }

  const isParty =
    (role === 'REGULAR' && interest.userId === accountId) ||
    (role === 'BUSINESS' && interest.job.businessId === accountId);

  if (!isParty) {
    throw notFound('Interest not found');
  }

  const activeSame = await prisma.negotiation.findFirst({
    where: {
      interestId,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
        },
      },
      user: true,
    },
  });

  if (activeSame) {
    return {
      statusCode: 200,
      payload: serializeNegotiation(activeSame, now),
    };
  }

  if (!isMutualInterest(interest)) {
    throw forbidden('Interest is not mutual');
  }

  const userAccount = await prisma.account.findUnique({
    where: { id: interest.userId },
    include: {
      regularUser: {
        include: {
          qualifications: true,
          filledJobs: true,
        },
      },
    },
  });

  if (
    !userAccount ||
    !userAccount.regularUser ||
    !isUserDiscoverableForJob(
      userAccount.regularUser,
      userAccount,
      interest.job,
      now,
      AVAILABILITY_TIMEOUT_MINUTES
    )
  ) {
    throw forbidden('Regular user is not currently discoverable for this job');
  }

  if (getJobStatus(interest.job, now, NEGOTIATION_WINDOW_MINUTES) !== 'open') {
    throw new HttpError(409, 'Job is not in a negotiable state');
  }

  const conflictCount = await prisma.negotiation.count({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: now },
      OR: [
        { userId: interest.userId },
        { businessId: interest.job.businessId },
        { jobId: interest.jobId },
      ],
    },
  });

  if (conflictCount > 0) {
    throw new HttpError(409, 'Active negotiation conflict');
  }

  const created = await prisma.negotiation.create({
    data: {
      interestId,
      jobId: interest.jobId,
      businessId: interest.job.businessId,
      userId: interest.userId,
      status: 'ACTIVE',
      candidateDecision: null,
      businessDecision: null,
      expiresAt: buildNegotiationExpiry(now, NEGOTIATION_WINDOW_MINUTES),
    },
    include: {
      job: {
        include: {
          business: true,
          positionType: true,
        },
      },
      user: true,
    },
  });

  const io = get_io();
  if (io) {
    io.in(`account:${created.businessId}`).socketsJoin(`negotiation:${created.id}`);
    io.in(`account:${created.userId}`).socketsJoin(`negotiation:${created.id}`);

    const payload = { negotiation_id: created.id };
    io.to(`account:${created.businessId}`).emit('negotiation:started', payload);
    io.to(`account:${created.userId}`).emit('negotiation:started', payload);
  }

  return {
    statusCode: 201,
    payload: serializeNegotiation(created, now),
  };
}

async function getMyNegotiation(accountId, role) {
  const negotiation = await findCurrentActiveNegotiationForAccount(accountId, role, new Date());

  if (!negotiation) {
    throw notFound('No active negotiation');
  }

  return serializeNegotiation(negotiation, new Date());
}

async function patchMyNegotiationDecision(accountId, role, body) {
  allowOnlyFields(body, ['decision', 'negotiation_id']);
  requireFields(body, ['decision', 'negotiation_id']);

  const negotiationId = parsePositiveInt(body.negotiation_id, 'negotiation_id');
  const decision = parseString(body.decision, 'decision').trim().toLowerCase();

  if (decision !== 'accept' && decision !== 'decline') {
    throw badRequest('decision must be "accept" or "decline"');
  }

  const now = new Date();
  const negotiation = await findCurrentActiveNegotiationForAccount(accountId, role, now);

  if (!negotiation) {
    throw notFound('No active negotiation');
  }

  if (negotiation.id !== negotiationId) {
    throw new HttpError(409, 'Negotiation mismatch');
  }

  if (!isNegotiationActive(negotiation, now)) {
    throw new HttpError(409, 'Negotiation is not active');
  }

  const nextState = applyDecisionToNegotiation(
    negotiation,
    role,
    decision.toUpperCase(),
    now
  );

  const updated = await prisma.$transaction(async (tx) => {
    const updatedNegotiation = await tx.negotiation.update({
      where: { id: negotiation.id },
      data: {
        candidateDecision: nextState.candidateDecision,
        businessDecision: nextState.businessDecision,
        status: nextState.status,
      },
      include: {
        job: {
          include: {
            business: true,
            positionType: true,
          },
        },
        user: true,
      },
    });

    if (nextState.status === 'SUCCESS') {
      await tx.job.update({
        where: { id: negotiation.jobId },
        data: {
          workerId: negotiation.userId,
        },
      });

      await tx.regularUser.update({
        where: { id: negotiation.userId },
        data: {
          available: false,
          lastActiveAt: now,
        },
      });
    } else if (nextState.status === 'FAILED') {
      await tx.interest.update({
        where: { id: negotiation.interestId },
        data: {
          candidateInterested: null,
          businessInterested: null,
        },
      });

      await tx.regularUser.update({
        where: { id: negotiation.userId },
        data: {
          available: true,
          lastActiveAt: now,
        },
      });
    }

    return updatedNegotiation;
  });

  return serializeNegotiation(updated, now);
}

async function patchSystemResetCooldown(body) {
  allowOnlyFields(body, ['reset_cooldown']);
  requireFields(body, ['reset_cooldown']);

  const value = Number(body.reset_cooldown);
  if (!Number.isFinite(value) || value < 0) {
    throw badRequest('reset_cooldown must be a number >= 0');
  }

  RESET_COOLDOWN_SECONDS = value;
  return { reset_cooldown: RESET_COOLDOWN_SECONDS };
}

async function patchSystemNegotiationWindow(body) {
  allowOnlyFields(body, ['negotiation_window']);
  requireFields(body, ['negotiation_window']);

  const value = Number(body.negotiation_window);
  if (!Number.isFinite(value) || value <= 0) {
    throw badRequest('negotiation_window must be a number > 0');
  }

  NEGOTIATION_WINDOW_MINUTES = value / 60;
  return { negotiation_window: value };
}

async function patchSystemJobStartWindow(body) {
  allowOnlyFields(body, ['job_start_window']);
  requireFields(body, ['job_start_window']);

  const value = Number(body.job_start_window);
  if (!Number.isFinite(value) || value <= 0) {
    throw badRequest('job_start_window must be a number > 0');
  }

  JOB_START_WINDOW_HOURS = value;
  return { job_start_window: value };
}

async function patchSystemAvailabilityTimeout(body) {
  allowOnlyFields(body, ['availability_timeout']);
  requireFields(body, ['availability_timeout']);

  const value = Number(body.availability_timeout);
  if (!Number.isFinite(value) || value <= 0) {
    throw badRequest('availability_timeout must be a number > 0');
  }

  AVAILABILITY_TIMEOUT_MINUTES = value / 60;
  return { availability_timeout: value };
}

function getImageExtensionOrThrow(file) {
  if (!file) {
    throw badRequest('Missing file');
  }

  const ext = IMAGE_MIME_TO_EXT[file.mimetype];
  if (!ext) {
    throw badRequest('Invalid file type');
  }

  return ext;
}

function getPdfExtensionOrThrow(file) {
  if (!file) {
    throw badRequest('Missing file');
  }

  const ext = DOC_MIME_TO_EXT[file.mimetype];
  if (!ext) {
    throw badRequest('Invalid file type');
  }

  return ext;
}

async function saveUploadedFile(relativePath, buffer) {
  const absolutePath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

async function putMyUserAvatar(accountId, file) {
  const ext = getImageExtensionOrThrow(file);
  const relativePath = `/uploads/users/${accountId}/avatar.${ext}`;

  await saveUploadedFile(relativePath, file.buffer);

  await prisma.regularUser.update({
    where: { id: accountId },
    data: {
      avatar: relativePath,
    },
  });

  return {
    avatar: relativePath,
  };
}

async function putMyBusinessAvatar(accountId, file) {
  const ext = getImageExtensionOrThrow(file);
  const relativePath = `/uploads/businesses/${accountId}/avatar.${ext}`;

  await saveUploadedFile(relativePath, file.buffer);

  await prisma.business.update({
    where: { id: accountId },
    data: {
      avatar: relativePath,
    },
  });

  return {
    avatar: relativePath,
  };
}

async function putMyUserResume(accountId, file) {
  getPdfExtensionOrThrow(file);
  const relativePath = `/uploads/users/${accountId}/resume.pdf`;

  await saveUploadedFile(relativePath, file.buffer);

  await prisma.regularUser.update({
    where: { id: accountId },
    data: {
      resume: relativePath,
    },
  });

  return {
    resume: relativePath,
  };
}

async function putQualificationDocument(accountId, qualificationId, file) {
  getPdfExtensionOrThrow(file);

  const id = parsePositiveInt(qualificationId, 'qualificationId');

  const qualification = await prisma.qualification.findUnique({
    where: { id },
  });

  if (!qualification || qualification.userId !== accountId) {
    throw notFound('Qualification not found');
  }

  const relativePath = `/uploads/users/${accountId}/position_type/${qualification.positionTypeId}/document.pdf`;

  await saveUploadedFile(relativePath, file.buffer);

  await prisma.qualification.update({
    where: { id },
    data: {
      document: relativePath,
    },
  });

  return {
    document: relativePath,
  };
}



// =================================
// Express app and routes
// ===============================
function create_app() {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));


  app.use(express.json());
  app.use('/uploads', express.static(UPLOAD_ROOT));
  app.use(requireJson);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.route('/users')
    .get(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await listUsersAdmin(req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .post(async (req, res, next) => {
      try {
        const result = await createRegularUser(req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses')
    .get(async (req, res, next) => {
      try {
        const role = getOptionalRoleFromRequest(req);
        const result = await listBusinesses(req.query, role === 'ADMIN');
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .post(async (req, res, next) => {
      try {
        const result = await createBusiness(req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/auth/resets')
    .post(async (req, res, next) => {
      try {
        const result = await requestResetToken(req, req.body);
        res.status(202).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/auth/resets/:resetToken')
    .post(async (req, res, next) => {
      try {
        const result = await useResetToken(req.params.resetToken, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/auth/tokens')
    .post(async (req, res, next) => {
      try {
        const result = await createJwtToken(req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/users/me')
    .get(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await getMyRegularUser(req.account.id);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .patch(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await patchMyRegularUser(req.account.id, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/users/me/available')
    .patch(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await patchMyAvailability(req.account.id, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses/me')
    .get(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await getMyBusiness(req.account.id);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .patch(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await patchMyBusiness(req.account.id, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses/:businessId')
    .get(async (req, res, next) => {
      try {
        const role = getOptionalRoleFromRequest(req);
        const businessId = parsePositiveInt(req.params.businessId, 'businessId');

        const account = await prisma.account.findUnique({
          where: { id: businessId },
          include: { business: true },
        });

        if (!account || account.role !== 'BUSINESS' || !account.business) {
          throw notFound('Business not found');
        }

        if (role !== 'ADMIN' && (!account.activated || !account.business.verified)) {
          throw notFound('Business not found');
        }

        const result = {
          id: account.id,
          business_name: account.business.businessName,
          email: account.email,
          role: roleToApi(account.role),
          phone_number: account.business.phoneNumber,
          postal_address: account.business.postalAddress,
          biography: account.business.biography,
        };

        if (role === 'ADMIN') {
          result.owner_name = account.business.ownerName;
          result.verified = account.business.verified;
          result.activated = account.activated;
        }

        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);


  app.route('/position-types')
    .get(requireAuth, requireRole('REGULAR', 'BUSINESS', 'ADMIN'), async (req, res, next) => {
      try {
        const result = await listPositionTypes(req.account.role, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .post(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await createPositionType(req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/qualifications')
    .get(requireAuth, requireRole('REGULAR', 'ADMIN'), async (req, res, next) => {
      try {
        const result = await listQualifications(req.account.id, req.account.role, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .post(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await createQualification(req.account.id, req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/qualifications/:qualificationId')
    .get(requireAuth, requireRole('REGULAR', 'ADMIN'), async (req, res, next) => {
      try {
        const result = await getQualificationById(
          req.account.id,
          req.account.role,
          req.params.qualificationId
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .patch(requireAuth, requireRole('REGULAR', 'ADMIN'), async (req, res, next) => {
      try {
        const result = await patchQualification(
          req.account.id,
          req.account.role,
          req.params.qualificationId,
          req.body
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses/me/jobs')
    .post(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await createBusinessJob(req.account.id, req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    })
    .get(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await listBusinessJobs(req.account.id, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses/me/jobs/:jobId')
    .patch(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await patchBusinessJob(req.account.id, req.params.jobId, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .delete(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        await deleteBusinessJob(req.account.id, req.params.jobId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs')
    .get(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await listOpenJobsForRegular(req.account.id, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId')
    .get(requireAuth, requireRole('REGULAR', 'BUSINESS'), async (req, res, next) => {
      try {
        const result = await getJobDetailForViewer(
          req.account.id,
          req.account.role,
          req.params.jobId,
          req.query
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/no-show')
    .patch(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await noShowBusinessJob(req.account.id, req.params.jobId);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/users/:userId/suspended')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchUserSuspended(req.params.userId, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/businesses/:businessId/verified')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchBusinessVerified(req.params.businessId, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/position-types/:positionTypeId')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchPositionType(req.params.positionTypeId, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .delete(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        await deletePositionType(req.params.positionTypeId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/interested')
    .patch(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await patchJobInterested(req.account.id, req.params.jobId, req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/users/me/invitations')
    .get(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await listMyInvitations(req.account.id, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/users/me/interests')
    .get(requireAuth, requireRole('REGULAR'), async (req, res, next) => {
      try {
        const result = await listMyInterests(req.account.id, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/candidates')
    .get(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await listJobCandidates(req.account.id, req.params.jobId, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/candidates/:userId')
    .get(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await getJobCandidateDetail(
          req.account.id,
          req.params.jobId,
          req.params.userId
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/candidates/:userId/interested')
    .patch(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await patchJobCandidateInterested(
          req.account.id,
          req.params.jobId,
          req.params.userId,
          req.body
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/jobs/:jobId/interests')
    .get(requireAuth, requireRole('BUSINESS'), async (req, res, next) => {
      try {
        const result = await listJobInterests(req.account.id, req.params.jobId, req.query);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/negotiations')
    .post(requireAuth, requireRole('REGULAR', 'BUSINESS'), async (req, res, next) => {
      try {
        const result = await createNegotiation(req.account.id, req.account.role, req.body);
        res.status(result.statusCode).json(result.payload);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/negotiations/me')
    .get(requireAuth, requireRole('REGULAR', 'BUSINESS'), async (req, res, next) => {
      try {
        const result = await getMyNegotiation(req.account.id, req.account.role);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/negotiations/me/decision')
    .patch(requireAuth, requireRole('REGULAR', 'BUSINESS'), async (req, res, next) => {
      try {
        const result = await patchMyNegotiationDecision(
          req.account.id,
          req.account.role,
          req.body
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/system/reset-cooldown')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchSystemResetCooldown(req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/system/negotiation-window')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchSystemNegotiationWindow(req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/system/job-start-window')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchSystemJobStartWindow(req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

  app.route('/system/availability-timeout')
    .patch(requireAuth, requireRole('ADMIN'), async (req, res, next) => {
      try {
        const result = await patchSystemAvailabilityTimeout(req.body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    })
    .all(methodNotAllowed);

    app.route('/users/me/avatar')
    .put(
      requireAuth,
      requireRole('REGULAR'),
      upload.single('file'),
      async (req, res, next) => {
        try {
          const result = await putMyUserAvatar(req.account.id, req.file);
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      }
    )
    .all(methodNotAllowed);

  app.route('/businesses/me/avatar')
    .put(
      requireAuth,
      requireRole('BUSINESS'),
      upload.single('file'),
      async (req, res, next) => {
        try {
          const result = await putMyBusinessAvatar(req.account.id, req.file);
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      }
    )
    .all(methodNotAllowed);

  app.route('/users/me/resume')
    .put(
      requireAuth,
      requireRole('REGULAR'),
      upload.single('file'),
      async (req, res, next) => {
        try {
          const result = await putMyUserResume(req.account.id, req.file);
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      }
    )
    .all(methodNotAllowed);

  app.route('/qualifications/:qualificationId/document')
    .put(
      requireAuth,
      requireRole('REGULAR'),
      upload.single('file'),
      async (req, res, next) => {
        try {
          const result = await putQualificationDocument(
            req.account.id,
            req.params.qualificationId,
            req.file
          );
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      }
    )
    .all(methodNotAllowed);

  app.use((_req, _res, next) => {
    next(notFound('Not found'));
  });

  app.use((err, _req, res, _next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ error: message });
  });

  return app;
}

module.exports = { create_app };