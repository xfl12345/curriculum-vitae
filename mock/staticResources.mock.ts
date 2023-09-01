import { defineMock } from "vite-plugin-mock-dev-server";
import { createReadStream } from "node:fs";

export default [
  defineMock({
    url: "/static",
    status: 500
  }),
  defineMock({
    url: "/mock/assets/pic/vue.svg",
    type: "vue.svg",
    body: () => createReadStream("mock/assets/pic/vue.svg")
  }),
  defineMock({
    url: "/static/secret/json/xflsCurriculumVitaeData.json",
    type: "xflsCurriculumVitaeData.json",
    body: () => createReadStream("mock/assets/json/xflsCurriculumVitaeData.json")
  }),
  defineMock({
    url: "/static/font/FZKTK.TTF",
    type: "FZKTK.TTF",
    body: () => createReadStream("public/static/font/FZKTK.TTF")
  })
];
