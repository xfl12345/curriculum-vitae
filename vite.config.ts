import { resolve } from "node:path";

import type { UserConfig, UserConfigExport } from "vite";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import legacy from "@vitejs/plugin-legacy";
import vueJsx from "@vitejs/plugin-vue-jsx";
import eslintPlugin from "vite-plugin-eslint";
import mockDevServerPlugin from "vite-plugin-mock-dev-server";
import axios from "axios";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const corsHttpScheme = JSON.parse(env.VITE_CORS_ENABLE_HTTPS ?? "false") ? "https" : "http";
  const corsWebSocketScheme = JSON.parse(env.VITE_CORS_ENABLE_WSS ?? "false") ? "wss" : "ws";

  const corsHost = env.VITE_CORS_HOST ?? "127.0.0.1:8880";
  const corsRootURL = corsHttpScheme + "://" + corsHost;

  console.log("corsHost", corsHost);

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
            target: corsWebSocketScheme + "://" + corsHost,
            changeOrigin: true
          }
        }
      }
    } as UserConfig;

    // 验证在线 CORS 是否可用
    axios.get(corsRootURL + "/login/status").then(
      (response) => {
        console.log("CORS request succeed!");
        resolve2(defineConfig(myViteConfig as UserConfigExport));
      },
      (reason) => {
        console.log("CORS request failed! Use mock instead.");
        // 当连接不可用的时候，使用 mock
        myViteConfig.plugins.push(mockDevServerPlugin());
        resolve2(defineConfig(myViteConfig as UserConfigExport));
      }
    );
  });

  // // https://vitejs.dev/config/
  // return defineConfig({
  //   plugins: [
  //     vue(),
  //     vueJsx(),
  //     // babel(),
  //     eslintPlugin({
  //       cache: false
  //     }),
  //     legacy({
  //       targets: ["defaults", "not IE 11"]
  //     })
  //   ],
  //   assetsInclude: ["**/*.bmp"],
  //   resolve: {
  //     alias: {
  //       // "@": fileURLToPath(new URL("./src", import.meta.url)),
  //       "@": resolve(__dirname, "src"),
  //       "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js"
  //     }
  //   },
  //   build: {
  //     assetsDir: "static/",
  //     rollupOptions: {
  //       output: {
  //         entryFileNames: `assets/[name].js`,
  //         chunkFileNames: `assets/[name].js`,
  //         assetFileNames: `assets/[name].[ext]`
  //       }
  //     }
  //   },
  //   base: "./",
  //   server: {
  //     // hmr: {
  //     //   overlay: false
  //     // },
  //     // open: true, // 在服务器启动时自动在浏览器中打开应用程序
  //     // //host: 'localhost',  // 指定服务器主机名
  //     // // host: '0.0.0.0',
  //     // // host: '::',
  //     host: "::",
  //     proxy: {
  //       "/static/secret/": {
  //         target: corsRootURL,
  //         changeOrigin: true
  //         // rewrite: (path) => path.replace(/^\/backend/, "")
  //       },
  //       "/captcha": {
  //         target: corsRootURL,
  //         changeOrigin: true
  //       },
  //       "/login": {
  //         target: corsRootURL,
  //         changeOrigin: true
  //       },
  //       "/logout": {
  //         target: corsRootURL,
  //         changeOrigin: true
  //       },
  //       "/sms": {
  //         target: corsRootURL,
  //         changeOrigin: true
  //       },
  //       "/sms/ws-connect": {
  //         target: corsWebSocketScheme + "://" + corsHost,
  //         changeOrigin: true
  //       }
  //     }
  //   }
  // });
};
