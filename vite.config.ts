import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import eslintPlugin from "vite-plugin-eslint";
import legacy from "@vitejs/plugin-legacy";

const corsHost = "127.0.0.1:8880";
const corsRootURL = "http://" + corsHost;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // babel(),
    eslintPlugin({
      cache: false
    }),
    legacy({
      targets: ["defaults", "not IE 11"]
    })
  ],
  assetsInclude: ["**/*.bmp"],
  resolve: {
    alias: {
      // "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@": resolve(__dirname, "src"),
      "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js"
    }
  },
  build: {
    assetsDir: "static/",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  base: "./",
  server: {
    // hmr: {
    //   overlay: false
    // },
    // open: true, // 在服务器启动时自动在浏览器中打开应用程序
    // //host: 'localhost',  // 指定服务器主机名
    // // host: '0.0.0.0',
    // // host: '::',
    host: "::",
    proxy: {
      "/static/secret/": {
        target: corsRootURL,
        changeOrigin: true
        // rewrite: (path) => path.replace(/^\/backend/, "")
      },
      "/captcha": {
        target: corsRootURL,
        changeOrigin: true
      },
      "/login": {
        target: corsRootURL,
        changeOrigin: true
      },
      "/logout": {
        target: corsRootURL,
        changeOrigin: true
      },
      "/sms": {
        target: corsRootURL,
        changeOrigin: true
      },
      "/sms/ws-connect": {
        target: (corsRootURL.startsWith("https") ? "wss://" : "ws://") + corsHost,
        changeOrigin: true
      }
    }
  }
});
