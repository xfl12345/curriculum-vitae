import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // babel(),
    eslintPlugin({
      cache: false
    })
  ],
  assetsInclude: ["**/*.bmp"],
  resolve: {
    alias: {
      "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js"
    }
  },
  build: {
    assetsDir: "static/"
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
        target: "http://127.0.0.1:8880",
        changeOrigin: true
        // rewrite: (path) => path.replace(/^\/backend/, "")
      },
      "/captcha": {
        target: "http://127.0.0.1:8880",
        changeOrigin: true
        // rewrite: (path) => path.replace(/^\/backend/, "")
      },
    }
  }
});
