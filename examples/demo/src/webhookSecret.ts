// Demo webhook secret. In production set WAVEKIT_WEBHOOK_SECRET and never ship a default.
export const WEBHOOK_SECRET = process.env.WAVEKIT_WEBHOOK_SECRET ?? 'whsec_demo_secret';
