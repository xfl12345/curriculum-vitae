import { resolve } from "node:path";

import type { ServerOptions, UserConfig, UserConfigExport } from "vite";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import legacy from "@vitejs/plugin-legacy";
import vueJsx from "@vitejs/plugin-vue-jsx";
import eslintPlugin from "vite-plugin-eslint";
import mockDevServerPlugin from "vite-plugin-mock-dev-server";
import axios from "axios";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return new Promise<UserConfigExport>((resolve2, reject) => {
    // https://vitejs.dev/config/
    const myViteConfig = {
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
      base: "./"
    } as UserConfig;

    // 先判断一下是否处于开发模式，再决定是否启用 server
    if (mode === "development") {
      const remoteServerHttpScheme = JSON.parse(env.VITE_REMOTE_SERVER_ENABLE_HTTPS ?? "false")
        ? "https"
        : "http";
      const remoteServerWebSocketScheme = JSON.parse(env.VITE_REMOTE_SERVER_ENABLE_WSS ?? "false")
        ? "wss"
        : "ws";

      const remoteServerHost = env.VITE_SERVER_REMOTE_HOST ?? "127.0.0.1:8880";
      const remoteServerRootURL = remoteServerHttpScheme + "://" + remoteServerHost;

      console.log("remoteServerRootURL", remoteServerRootURL);
      myViteConfig.server = {
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
            target: remoteServerRootURL,
            changeOrigin: true
            // rewrite: (path) => path.replace(/^\/backend/, "")
          },
          "/captcha": {
            target: remoteServerRootURL,
            changeOrigin: true
          },
          "/login": {
            target: remoteServerRootURL,
            changeOrigin: true
          },
          "/logout": {
            target: remoteServerRootURL,
            changeOrigin: true
          },
          "/sms": {
            target: remoteServerRootURL,
            changeOrigin: true
          },
          "/sms/ws-connect": {
            target: remoteServerWebSocketScheme + "://" + remoteServerHost,
            changeOrigin: true
          }
        }
      } as Partial<ServerOptions>;

      // 验证 远程API 是否可用
      axios.get(remoteServerRootURL + "/login/status").then(
        (response) => {
          console.log("Remote server API request succeed!");
          resolve2(defineConfig(myViteConfig as UserConfigExport));
        },
        (reason) => {
          console.log("Remote server API request failed! Use mock instead.");
          // 当 远程API 不可用的时候，使用 mock
          myViteConfig.plugins.push(mockDevServerPlugin());
          resolve2(defineConfig(myViteConfig as UserConfigExport));
        }
      );
    } else {
      resolve2(myViteConfig);
    }
  });
};
