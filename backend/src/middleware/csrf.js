import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fail } from '../utils/api-error.js';
export const newCsrf = () => randomBytes(32).toString('hex');
export function csrf(origin) {
  return (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const received = req.get('x-csrf-token') || '',
        expected = req.session?.csrf || '';
      fail(
        req.get('origin') === origin &&
          /^[a-f0-9]{64}$/.test(received) &&
          received.length === expected.length &&
          expected.length > 0 &&
          timingSafeEqual(Buffer.from(received), Buffer.from(expected)),
        403,
        'CSRF',
        'Permintaan tidak sah. Muat ulang lalu coba lagi.'
      );
    }
    next();
  };
}
