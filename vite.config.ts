import vinext from 'vinext';
import {defineConfig} from 'vite';
import {runtimeConfig} from './scripts/configuration.mjs';

export default defineConfig(async () => {
  const {cloudflare} = await import('@cloudflare/vite-plugin');
  const {configPath} = runtimeConfig(process.env.TAWAR_TARGET === 'production');
  return {
    server: {host: '127.0.0.1', strictPort: true},
    plugins: [
      vinext(),
      cloudflare({
        configPath,
        viteEnvironment: {name: 'rsc', childEnvironments: ['ssr']},
        inspectorPort: false,
        remoteBindings: false,
      }),
    ],
  };
});
