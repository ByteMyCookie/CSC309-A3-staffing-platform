'use strict';

const { badRequest } = require('./errors');
const {
  addMinutes,
  isSameOrBefore,
} = require('./time');

function getJobStatus(job, now = new Date(), negotiationWindowMinutes = 15) {
  const startTime = new Date(job.startTime);
  const endTime = new Date(job.endTime);

  if (job.canceledAt) {
    return 'canceled';
  }

  if (job.workerId !== null && job.workerId !== undefined) {
    if (now.getTime() >= endTime.getTime()) {
      return 'completed';
    }
    return 'filled';
  }

  if (now.getTime() >= endTime.getTime()) {
    return 'expired';
  }

  if (isSameOrBefore(addMinutes(now, negotiationWindowMinutes), startTime)) {
    return 'open';
  }

  return 'expired';
}

function isJobAvailableForMatching(job, now = new Date(), negotiationWindowMinutes = 15) {
  return getJobStatus(job, now, negotiationWindowMinutes) === 'open';
}

function assertValidSalaryRange(salaryMin, salaryMax) {
  if (typeof salaryMin !== 'number' || !Number.isFinite(salaryMin) || salaryMin < 0) {
    throw badRequest('salary_min must be a number >= 0');
  }

  if (typeof salaryMax !== 'number' || !Number.isFinite(salaryMax) || salaryMax < salaryMin) {
    throw badRequest('salary_max must be a number >= salary_min');
  }
}

function assertValidJobTimes(startTime, endTime) {
  if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
    throw badRequest('start_time must be a valid datetime');
  }

  if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) {
    throw badRequest('end_time must be a valid datetime');
  }

  if (endTime.getTime() <= startTime.getTime()) {
    throw badRequest('end_time must be after start_time');
  }
}

function assertJobStartWithinWindow(startTime, now = new Date(), jobStartWindowHours = 24 * 7) {
  const latestAllowedStart = new Date(
    now.getTime() + jobStartWindowHours * 60 * 60 * 1000
  );

  if (startTime.getTime() > latestAllowedStart.getTime()) {
    throw badRequest('start_time is too far in the future');
  }
}

function assertJobHasEnoughNegotiationTime(
  startTime,
  now = new Date(),
  negotiationWindowMinutes = 15
) {
  const negotiationDeadline = addMinutes(now, negotiationWindowMinutes);

  if (negotiationDeadline.getTime() > startTime.getTime()) {
    throw badRequest('Job does not leave enough time for negotiation before start_time');
  }
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2];
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw badRequest('lat/lon must be valid numbers');
  }

  const R = 6371.2;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function etaMinutesFromDistance(distanceKm) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw badRequest('distance must be a non-negative number');
  }

  const speedKmPerHour = 30;
  return Math.round((distanceKm / speedKmPerHour) * 60);
}

function attachDistanceAndEta(job, lat, lon) {
  const distance = haversineDistanceKm(
    lat,
    lon,
    job.business.lat,
    job.business.lon
  );

  return {
    ...job,
    distance,
    eta: etaMinutesFromDistance(distance),
  };
}

module.exports = {
  getJobStatus,
  isJobAvailableForMatching,
  assertValidSalaryRange,
  assertValidJobTimes,
  assertJobStartWithinWindow,
  assertJobHasEnoughNegotiationTime,
  haversineDistanceKm,
  etaMinutesFromDistance,
  attachDistanceAndEta,
};