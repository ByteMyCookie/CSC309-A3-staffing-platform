'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function daysFromNow(days, hour = 14, minute = 0) {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + days,
    hour,
    minute,
    0,
    0
  ));
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function clearDatabase() {
  await prisma.negotiation.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.job.deleteMany();
  await prisma.qualification.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.business.deleteMany();
  await prisma.regularUser.deleteMany();
  await prisma.account.deleteMany();
  await prisma.positionType.deleteMany();
}

async function createRegularUser(index, passwordHash, options = {}) {
  const account = await prisma.account.create({
    data: {
      email: `regular${index}@csc309.utoronto.ca`,
      passwordHash,
      role: 'REGULAR',
      activated: true,
      resetToken: null,
      resetTokenExpiresAt: null,
      resetTokenUsedAt: null,
    },
  });

  await prisma.regularUser.create({
    data: {
      id: account.id,
      firstName: `Regular${index}`,
      lastName: 'User',
      phoneNumber: `416-555-${String(index).padStart(4, '0')}`,
      postalAddress: `${index} King St W, Toronto, ON`,
      birthday: `2000-01-${String(((index - 1) % 28) + 1).padStart(2, '0')}`,
      suspended: options.suspended ?? false,
      available: options.available ?? false,
      lastActiveAt: options.available ? new Date() : null,
      biography: `Seeded regular user ${index}.`,
    },
  });

  return account.id;
}

async function createBusiness(index, passwordHash, verified) {
  const account = await prisma.account.create({
    data: {
      email: `business${index}@csc309.utoronto.ca`,
      passwordHash,
      role: 'BUSINESS',
      activated: true,
      resetToken: null,
      resetTokenExpiresAt: null,
      resetTokenUsedAt: null,
    },
  });

  await prisma.business.create({
    data: {
      id: account.id,
      businessName: `Business ${index}`,
      ownerName: `Owner ${index}`,
      phoneNumber: `647-555-${String(index).padStart(4, '0')}`,
      postalAddress: `${index} Bay St, Toronto, ON`,
      lon: -79.3832 + index * 0.001,
      lat: 43.6532 + index * 0.001,
      verified,
      biography: `Seeded business ${index}.`,
    },
  });

  return account.id;
}

async function createPositionTypes() {
  const defs = [
    ['Dental Assistant Level 1', 'Entry-level dental assistant.', false],
    ['Dental Assistant Level 2', 'Experienced dental assistant.', false],
    ['Receptionist', 'Front desk and scheduling support.', false],
    ['Sterilization Technician', 'Sterilization and equipment prep.', false],
    ['Office Administrator', 'Administrative support for the clinic.', false],
    ['Hygiene Assistant', 'Support for hygienists during shifts.', false],
    ['Treatment Coordinator', 'Patient treatment and billing coordination.', false],
    ['Float Assistant', 'Flexible support across multiple tasks.', false],
    ['Hidden Demo Position 1', 'Hidden demo position type.', true],
    ['Hidden Demo Position 2', 'Hidden demo position type.', true],
  ];

  const ids = [];
  for (const [name, description, hidden] of defs) {
    const pt = await prisma.positionType.create({
      data: { name, description, hidden },
    });
    ids.push(pt.id);
  }
  return ids;
}

async function createQualifications(regularIds, positionTypeIds) {
  const rows = [];

  for (let i = 0; i < 10; i += 1) {
    rows.push({
      userId: regularIds[i],
      positionTypeId: positionTypeIds[0],
      status: 'APPROVED',
      note: `Approved qualification for regular${i + 1}`,
    });
  }

  rows.push(
    { userId: regularIds[10], positionTypeId: positionTypeIds[1], status: 'SUBMITTED', note: 'Submitted qualification' },
    { userId: regularIds[11], positionTypeId: positionTypeIds[1], status: 'REJECTED', note: 'Rejected qualification' },
    { userId: regularIds[12], positionTypeId: positionTypeIds[1], status: 'REVISED', note: 'Revised qualification' },
    { userId: regularIds[13], positionTypeId: positionTypeIds[2], status: 'CREATED', note: 'Created qualification' },
    { userId: regularIds[14], positionTypeId: positionTypeIds[2], status: 'SUBMITTED', note: 'Submitted qualification' },
    { userId: regularIds[15], positionTypeId: positionTypeIds[1], status: 'APPROVED', note: 'Approved qualification' },
    { userId: regularIds[16], positionTypeId: positionTypeIds[2], status: 'APPROVED', note: 'Approved qualification' },
    { userId: regularIds[17], positionTypeId: positionTypeIds[3], status: 'REJECTED', note: 'Rejected qualification' },
    { userId: regularIds[18], positionTypeId: positionTypeIds[3], status: 'REVISED', note: 'Revised qualification' },
    { userId: regularIds[19], positionTypeId: positionTypeIds[4], status: 'CREATED', note: 'Created qualification' }
  );

  for (const row of rows) {
    await prisma.qualification.create({ data: row });
  }
}

async function createJob(data) {
  return prisma.job.create({ data });
}

async function createJobs(businessIds, positionTypeIds, regularIds) {
  const openJobs = [];

  for (let i = 0; i < 12; i += 1) {
    const start = daysFromNow((i % 6) + 1, 9 + (i % 4));
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);

    openJobs.push(
      await createJob({
        businessId: businessIds[0],
        positionTypeId: positionTypeIds[0],
        note: `Open job ${i + 1} for business1`,
        salaryMin: 25 + i,
        salaryMax: 45 + i,
        startTime: start,
        endTime: end,
      })
    );
  }

  const filledFutureJob = await createJob({
    businessId: businessIds[0],
    positionTypeId: positionTypeIds[0],
    workerId: regularIds[7],
    note: 'Filled future job',
    salaryMin: 35,
    salaryMax: 55,
    startTime: daysFromNow(2, 13),
    endTime: daysFromNow(2, 17),
  });

  const completedJob = await createJob({
    businessId: businessIds[0],
    positionTypeId: positionTypeIds[0],
    workerId: regularIds[8],
    note: 'Completed seeded job',
    salaryMin: 32,
    salaryMax: 52,
    startTime: daysFromNow(-3, 10),
    endTime: daysFromNow(-3, 14),
  });

  const expiredJob = await createJob({
    businessId: businessIds[0],
    positionTypeId: positionTypeIds[0],
    note: 'Expired seeded job',
    salaryMin: 30,
    salaryMax: 50,
    startTime: daysFromNow(-2, 10),
    endTime: daysFromNow(-2, 14),
  });

  const canceledJob = await createJob({
    businessId: businessIds[0],
    positionTypeId: positionTypeIds[0],
    note: 'Canceled seeded job',
    salaryMin: 30,
    salaryMax: 50,
    startTime: daysFromNow(3, 10),
    endTime: daysFromNow(3, 14),
    canceledAt: new Date(),
  });

  const extraJobs = [];
  for (let i = 0; i < 14; i += 1) {
    const businessId = businessIds[1 + (i % 5)];
    const positionTypeId = positionTypeIds[1 + (i % 3)];

    if (i < 8) {
      const start = daysFromNow((i % 5) + 1, 11);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      extraJobs.push(await createJob({
        businessId,
        positionTypeId,
        note: `Extra open job ${i + 1}`,
        salaryMin: 28 + i,
        salaryMax: 44 + i,
        startTime: start,
        endTime: end,
      }));
    } else if (i < 10) {
      extraJobs.push(await createJob({
        businessId,
        positionTypeId,
        note: `Extra expired job ${i + 1}`,
        salaryMin: 28 + i,
        salaryMax: 44 + i,
        startTime: daysFromNow(-2, 9),
        endTime: daysFromNow(-2, 12),
      }));
    } else if (i < 12) {
      extraJobs.push(await createJob({
        businessId,
        positionTypeId,
        workerId: regularIds[10 + (i - 10)],
        note: `Extra completed job ${i + 1}`,
        salaryMin: 28 + i,
        salaryMax: 44 + i,
        startTime: daysFromNow(-1, 9),
        endTime: daysFromNow(-1, 12),
      }));
    } else {
      extraJobs.push(await createJob({
        businessId,
        positionTypeId,
        workerId: regularIds[12 + (i - 12)],
        note: `Extra filled job ${i + 1}`,
        salaryMin: 28 + i,
        salaryMax: 44 + i,
        startTime: daysFromNow(2, 9),
        endTime: daysFromNow(2, 12),
      }));
    }
  }

  return {
    openJobs,
    filledFutureJob,
    completedJob,
    expiredJob,
    canceledJob,
    allJobs: [...openJobs, filledFutureJob, completedJob, expiredJob, canceledJob, ...extraJobs],
  };
}

async function createInterest(jobId, userId, candidateInterested, businessInterested) {
  return prisma.interest.create({
    data: {
      jobId,
      userId,
      candidateInterested,
      businessInterested,
    },
  });
}

async function createInterests(openJobs, regularIds, filledFutureJob) {
  const invitationJobs = openJobs.slice(0, 6);
  const myInterestJobs = openJobs.slice(6, 12);

  for (const job of invitationJobs) {
    await createInterest(job.id, regularIds[0], null, true);
  }

  for (let i = 0; i < myInterestJobs.length; i += 1) {
    await createInterest(
      myInterestJobs[i].id,
      regularIds[0],
      true,
      i >= 3 ? true : false
    );
  }

  for (let i = 1; i <= 5; i += 1) {
    await createInterest(
      openJobs[11].id,
      regularIds[i],
      true,
      i <= 3
    );
  }

  const activeInterest = await createInterest(openJobs[9].id, regularIds[1], true, true);
  const successInterest = await createInterest(filledFutureJob.id, regularIds[7], true, true);
  const failedInterest = await createInterest(openJobs[8].id, regularIds[9], true, true);

  return { activeInterest, successInterest, failedInterest };
}

async function createNegotiations(openJobs, filledFutureJob, businessIds, regularIds, interests) {
  await prisma.negotiation.create({
    data: {
      interestId: interests.activeInterest.id,
      jobId: openJobs[9].id,
      businessId: businessIds[0],
      userId: regularIds[1],
      status: 'ACTIVE',
      candidateDecision: null,
      businessDecision: null,
      expiresAt: hoursFromNow(1),
    },
  });

  await prisma.negotiation.create({
    data: {
      interestId: interests.successInterest.id,
      jobId: filledFutureJob.id,
      businessId: businessIds[0],
      userId: regularIds[7],
      status: 'SUCCESS',
      candidateDecision: 'ACCEPT',
      businessDecision: 'ACCEPT',
      expiresAt: hoursFromNow(1),
    },
  });

  await prisma.negotiation.create({
    data: {
      interestId: interests.failedInterest.id,
      jobId: openJobs[8].id,
      businessId: businessIds[0],
      userId: regularIds[9],
      status: 'FAILED',
      candidateDecision: 'DECLINE',
      businessDecision: 'ACCEPT',
      expiresAt: hoursFromNow(1),
    },
  });
}

async function main() {
  await clearDatabase();

  const passwordHash = await bcrypt.hash('123123', 10);

  const adminAccount = await prisma.account.create({
    data: {
      email: 'admin1@csc309.utoronto.ca',
      passwordHash,
      role: 'ADMIN',
      activated: true,
      resetToken: null,
      resetTokenExpiresAt: null,
      resetTokenUsedAt: null,
    },
  });

  await prisma.admin.create({
    data: {
      id: adminAccount.id,
      utorid: 'admin1',
    },
  });

  const regularIds = [];
  for (let i = 1; i <= 20; i += 1) {
    regularIds.push(
      await createRegularUser(i, passwordHash, {
        available: i <= 10,
        suspended: i >= 19,
      })
    );
  }

  const businessIds = [];
  for (let i = 1; i <= 10; i += 1) {
    businessIds.push(await createBusiness(i, passwordHash, i <= 7));
  }

  const positionTypeIds = await createPositionTypes();
  await createQualifications(regularIds, positionTypeIds);

  const jobs = await createJobs(businessIds, positionTypeIds, regularIds);
  const interests = await createInterests(jobs.openJobs, regularIds, jobs.filledFutureJob);
  await createNegotiations(jobs.openJobs, jobs.filledFutureJob, businessIds, regularIds, interests);

  const [regularCount, businessCount, adminCount, ptCount, jobCount, qualCount, interestCount, negotiationCount] =
    await Promise.all([
      prisma.account.count({ where: { role: 'REGULAR' } }),
      prisma.account.count({ where: { role: 'BUSINESS' } }),
      prisma.account.count({ where: { role: 'ADMIN' } }),
      prisma.positionType.count(),
      prisma.job.count(),
      prisma.qualification.count(),
      prisma.interest.count(),
      prisma.negotiation.count(),
    ]);

  console.log(
    `Seed complete: ${regularCount} regular, ${businessCount} business, ${adminCount} admin, ` +
    `${ptCount} position types, ${jobCount} jobs, ${qualCount} qualifications, ` +
    `${interestCount} interests, ${negotiationCount} negotiations`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });