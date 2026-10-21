import { expect, it } from 'vitest';

import { LIST_ROUTES } from '../src/query';
import text from '../wrangler.jsonc?raw';

it('wrangler.jsonc runs code first for /api and each list route', () => {
    // Its comments are whole lines.
    const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
    expect(config.assets.run_worker_first).toEqual([
        '/api',
        '/api/',
        ...LIST_ROUTES.map((route) => `/api/${route}`),
    ]);
});
