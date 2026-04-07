package cc.xfl12345.person.cv.appconst;

import jakarta.ws.rs.core.Response;

public enum JsonApiResult {
    SUCCEED("成功", Response.Status.OK.getStatusCode()),
    FAILED("失败", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_INVALID("参数无效", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_MISSING_PARAMS("缺少参数", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_TOO_MUCH_PARAMS("参数过多", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_FORBIDDEN("非法操作", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_NOT_SUPPORT("操作不支持", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_NOT_FOUND("请求资源不存在", Response.Status.NOT_FOUND.getStatusCode()),
    FAILED_FREQUENCY_MAX("操作过于频繁", Response.Status.TOO_MANY_REQUESTS.getStatusCode()),
    FAILED_NO_LOGIN("未登录", Response.Status.UNAUTHORIZED.getStatusCode()),
    FAILED_FORBIDDEN_ACCOUNT("账号已被停用", Response.Status.UNAUTHORIZED.getStatusCode()),
    FAILED_LOGOUT_IS_NEEDED_BEFORE_LOGIN("登录失败！您已登录，如需登录其它账号，请先注销当前账号！", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_ALREADY_LOGIN_BY_OTHER("登录失败！账号已被他人登录！", Response.Status.FORBIDDEN.getStatusCode()),
    FAILED_REQUEST_FORMAT_ERROR("请求数据格式错误", 422),
    OTHER_FAILED("发生未知错误！请联系站点管理员修复。", Response.Status.INTERNAL_SERVER_ERROR.getStatusCode());

    private final String name;
    private final int num;

    JsonApiResult(String str, int num) {
        this.name = str;
        this.num = num;
    }

    public String getName() {
        return name;
    }

    public int getNum() {
        return num;
    }
}
