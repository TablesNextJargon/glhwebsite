import { bindings, defineConfig, defineWorker } from 'cf/config';

export const contactWorker = defineWorker({
  name: 'george-hadow-contact',
  compatibilityDate: '2026-11-26',
  entrypoint: './src/index.ts',
  workersDev: false,
  previewUrls: false,
  observability: { enabled: true, traces: { enabled: true } },
  env: {
    EMAIL: bindings.sendEmail(),
    TURNSTILE_SECRET: bindings.secret(),
    CONTACT_TO: bindings.secret(),
    CONTACT_FROM: bindings.secret(),
    TURNSTILE_HOSTNAMES: bindings.text('www.georgehadow.com,georgehadow.com'),
  },
});

export default defineConfig({ worker: contactWorker });
