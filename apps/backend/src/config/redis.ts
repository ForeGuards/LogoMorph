import { env } from './env';

export const redisConfig = {
  connection: {
    host: env.redisUrl.replace('redis://', '').split(':')[0],
    port: parseInt(env.redisUrl.split(':')[2] || '6379'),
  },
  // BullMQ job options
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};
