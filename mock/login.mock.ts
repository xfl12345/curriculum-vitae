import { defineMock } from "vite-plugin-mock-dev-server";

export default [
  defineMock({
    url: "/login/status",
    headers: {
      "Content-Type": "application/json"
    },
    type: "json",
    status: 200,
    body: "true"
  })
];
