import pino from 'pino';

export function createLogger(level: string, pretty = false) {
  return pino({
    level,
    base: { service: 'vyro-api' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.newPassword',
        '*.currentPassword',
        '*.refreshToken',
        '*.accessToken',
        '*.token',
        '*.idToken',
        '*.code',
      ],
      censor: '[redacted]',
    },
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  });
}
export type Logger = pino.Logger;
