import { mergeConfig } from 'vitest/config';
import base from '../../vitest.config';
export default mergeConfig(base, { test: { setupFiles: ['./src/test/audit-no-network.ts'], maxWorkers: 1, fileParallelism: false } });
