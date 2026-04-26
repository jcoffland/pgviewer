import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {viteStaticCopy} from 'vite-plugin-static-copy'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cesiumSrc = 'node_modules/cesium/Build/Cesium'

export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {src: cesiumSrc + '/Workers',    dest: 'cesium'},
        {src: cesiumSrc + '/Assets',     dest: 'cesium'},
        {src: cesiumSrc + '/Widgets',    dest: 'cesium'},
        {src: cesiumSrc + '/ThirdParty', dest: 'cesium'},
      ],
    }),
  ],
  define: {CESIUM_BASE_URL: JSON.stringify('/cesium')},
  resolve: {
    alias: {'@': resolve(here, 'src')},
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
