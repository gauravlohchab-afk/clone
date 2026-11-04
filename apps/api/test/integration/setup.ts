import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
