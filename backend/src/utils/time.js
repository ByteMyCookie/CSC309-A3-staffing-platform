'use strict';

const { badRequest } = require('./errors');

function getNow() {
  return new Date();
}

function parseDateTime(value, fieldName) {
  if (typeof value !== 'string') {
    throw badRequest(`Field "${fieldName}" must be a datetime string`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw badRequest(`Field "${fieldName}" must be a valid datetime`);
  }

  return date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isBefore(a, b) {
  return a.getTime() < b.getTime();
}

function isAfter(a, b) {
  return a.getTime() > b.getTime();
}

function isSameOrBefore(a, b) {
  return a.getTime() <= b.getTime();
}

function isSameOrAfter(a, b) {
  return a.getTime() >= b.getTime();
}

function overlaps(startA, endA, startB, endB) {
  return startA.getTime() < endB.getTime() &&
         startB.getTime() < endA.getTime();
}

function minutesBetween(a, b) {
  return (b.getTime() - a.getTime()) / (60 * 1000);
}

module.exports = {
  getNow,
  parseDateTime,
  addMinutes,
  addHours,
  isBefore,
  isAfter,
  isSameOrBefore,
  isSameOrAfter,
  overlaps,
  minutesBetween,
};