import type { TestProject } from 'vitest/node';

/**
 * Integration tests need a MongoDB replica set (transactions). By default an
 * in-memory replica set is started via mongodb-memory-server, which downloads
 * a mongod binary on first run. Set MONGODB_URI_TEST to use an existing
 * replica set instead (e.g. a local `mongod --replSet rs0` or a CI service).
 */
export default async function setup(project: TestProject) {
  if (process.env.MONGODB_URI_TEST) {
    project.provide('mongoUri', process.env.MONGODB_URI_TEST);
    return;
  }
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  project.provide('mongoUri', replSet.getUri('vyro_test'));
  return async () => {
    await replSet.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
