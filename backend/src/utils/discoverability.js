'use strict';

const { overlaps } = require('./time');

function hasApprovedQualification(user, positionTypeId) {
  if (!user || !Array.isArray(user.qualifications)) {
    return false;
  }

  return user.qualifications.some(
    (q) =>
      q.positionTypeId === positionTypeId &&
      q.status === 'APPROVED'
  );
}

function isWithinAvailabilityWindow(user, now = new Date(), availabilityTimeoutMinutes = 30) {
  if (!user || !user.lastActiveAt) {
    return false;
  }

  const lastActiveAt = new Date(user.lastActiveAt);
  const diffMs = now.getTime() - lastActiveAt.getTime();
  return diffMs <= availabilityTimeoutMinutes * 60 * 1000;
}

function hasConflictingFilledJob(user, targetJob) {
  if (!user || !Array.isArray(user.filledJobs)) {
    return false;
  }

  const targetStart = new Date(targetJob.startTime);
  const targetEnd = new Date(targetJob.endTime);

  return user.filledJobs.some((job) => {
    if (job.canceledAt) {
      return false;
    }

    if (job.id === targetJob.id) {
      return false;
    }

    const jobStart = new Date(job.startTime);
    const jobEnd = new Date(job.endTime);

    return overlaps(jobStart, jobEnd, targetStart, targetEnd);
  });
}

function getEffectiveAvailability(user, now = new Date(), availabilityTimeoutMinutes = 30) {
  if (!user) {
    return false;
  }

  if (!user.available) {
    return false;
  }

  return isWithinAvailabilityWindow(user, now, availabilityTimeoutMinutes);
}

function isUserDiscoverableForJob(
  user,
  account,
  job,
  now = new Date(),
  availabilityTimeoutMinutes = 30
) {
  if (!user || !account || !job) {
    return false;
  }

  if (!account.activated) {
    return false;
  }

  if (user.suspended) {
    return false;
  }

  if (!getEffectiveAvailability(user, now, availabilityTimeoutMinutes)) {
    return false;
  }

  if (!hasApprovedQualification(user, job.positionTypeId)) {
    return false;
  }

  if (hasConflictingFilledJob(user, job)) {
    return false;
  }

  return true;
}

module.exports = {
  hasApprovedQualification,
  isWithinAvailabilityWindow,
  hasConflictingFilledJob,
  getEffectiveAvailability,
  isUserDiscoverableForJob,
};