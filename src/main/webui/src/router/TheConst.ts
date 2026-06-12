import type { RouteNamedMap } from 'vue-router/auto-routes'

export const ROUTER_NAMES = {
  HOME: '/',
  CV_ROOT_PAGE: '/cv-root-page',
  FIRST_TIME_LOADING_PAGE: '/first-time-loading-page',
  HR_INFO_PAGE: '/hr-info-page',
  LOGIN_PAGE: '/login-page',
  NOT_FOUND_PAGE: '/not-found-page',
  ROUTES: '/routes',
  SETTING_PAGE: '/setting-page',
  STUDY_BLOB_URL: '/study-blob-url',
  TEST_CHATGPT_WORKS: '/test-chatgpt-works',
  TEST_COMMUNITY_BOX: '/test-community-box',
  TEST_FONT_SUPPORT: '/test-font-support',
  TEST_HR_INFO_PAGE: '/test-hr-info-page',
  TEST_PAGE: '/test-page',
  TEST_RESIZE_OBSERVER: '/test-resize-observer',
  TEST_TIANAI_CAPTCHA: '/test-tianai-captcha',
  TEST_VXE_TABLE_PAGED: '/test-vxe-table-paged',
} as const satisfies Record<string, keyof RouteNamedMap>
