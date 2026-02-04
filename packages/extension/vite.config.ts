import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: () => ({
        manifest_version: 3,
        name: 'Anti-Work Tracker',
        version: '1.0.0',
        description: '工作轨迹记录',
        permissions: ['tabs', 'storage', 'activeTab'],
        host_permissions: ['<all_urls>'],
        background: {
          service_worker: 'src/background.ts',
          type: 'module',
        },
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['src/content.ts'],
          },
        ],
        action: {
          default_popup: 'src/popup/index.html',
          default_title: 'Anti-Work',
        },
      }),
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
