'use strict';

const { addMinutes } = require('./time');

function isNegotiationExpired(negotiation, now = new Date()) {
  if (!negotiation || !negotiation.expiresAt) {
    return true;
  }

  return now.getTime() >= new Date(negotiation.expiresAt).getTime();
}

function isNegotiationActive(negotiation, now = new Date()) {
  if (!negotiation) {
    return false;
  }

  return negotiation.status === 'ACTIVE' && !isNegotiationExpired(negotiation, now);
}

function getNegotiationDecisionFieldForRole(role) {
  if (role === 'REGULAR') {
    return 'candidateDecision';
  }

  if (role === 'BUSINESS') {
    return 'businessDecision';
  }

  return null;
}

function getOtherNegotiationDecisionFieldForRole(role) {
  if (role === 'REGULAR') {
    return 'businessDecision';
  }

  if (role === 'BUSINESS') {
    return 'candidateDecision';
  }

  return null;
}

function buildNegotiationExpiry(now = new Date(), negotiationWindowMinutes = 15) {
  return addMinutes(now, negotiationWindowMinutes);
}

function decisionsToApiShape(negotiation) {
  return {
    candidate: negotiation.candidateDecision
      ? negotiation.candidateDecision.toLowerCase()
      : null,
    business: negotiation.businessDecision
      ? negotiation.businessDecision.toLowerCase()
      : null,
  };
}

function isMutualInterest(interest) {
  return (
    !!interest &&
    interest.candidateInterested === true &&
    interest.businessInterested === true
  );
}

function applyDecisionToNegotiation(negotiation, role, decision, now = new Date()) {
  const ownField = getNegotiationDecisionFieldForRole(role);
  const otherField = getOtherNegotiationDecisionFieldForRole(role);

  if (!ownField || !otherField) {
    throw new Error('Invalid role for negotiation decision');
  }

  const normalizedDecision = String(decision).toUpperCase();

  if (normalizedDecision !== 'ACCEPT' && normalizedDecision !== 'DECLINE') {
    throw new Error('Invalid negotiation decision');
  }

  const updated = {
    ...negotiation,
    [ownField]: normalizedDecision,
    updatedAt: now,
  };

  if (normalizedDecision === 'DECLINE') {
    updated.status = 'FAILED';
    return updated;
  }

  if (
    updated[ownField] === 'ACCEPT' &&
    updated[otherField] === 'ACCEPT'
  ) {
    updated.status = 'SUCCESS';
    return updated;
  }

  updated.status = 'ACTIVE';
  return updated;
}

function resetNegotiationDecisions(negotiation, now = new Date()) {
  return {
    ...negotiation,
    candidateDecision: null,
    businessDecision: null,
    updatedAt: now,
  };
}

function getActiveNegotiationForAccount(negotiations, accountId, role, now = new Date()) {
  if (!Array.isArray(negotiations)) {
    return null;
  }

  return (
    negotiations.find((negotiation) => {
      if (!isNegotiationActive(negotiation, now)) {
        return false;
      }

      if (role === 'REGULAR') {
        return negotiation.userId === accountId;
      }

      if (role === 'BUSINESS') {
        return negotiation.businessId === accountId;
      }

      return false;
    }) || null
  );
}

function negotiationBelongsToAccount(negotiation, accountId, role) {
  if (!negotiation) {
    return false;
  }

  if (role === 'REGULAR') {
    return negotiation.userId === accountId;
  }

  if (role === 'BUSINESS') {
    return negotiation.businessId === accountId;
  }

  return false;
}

module.exports = {
  isNegotiationExpired,
  isNegotiationActive,
  getNegotiationDecisionFieldForRole,
  getOtherNegotiationDecisionFieldForRole,
  buildNegotiationExpiry,
  decisionsToApiShape,
  isMutualInterest,
  applyDecisionToNegotiation,
  resetNegotiationDecisions,
  getActiveNegotiationForAccount,
  negotiationBelongsToAccount,
};