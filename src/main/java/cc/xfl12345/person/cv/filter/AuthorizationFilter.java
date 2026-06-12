package cc.xfl12345.person.cv.filter;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.stp.StpUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.springframework.util.AntPathMatcher;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Stream;

/**
 * Sa-Token 路由鉴权过滤器
 * <p>
 *
 * @see <a href="https://sa-token.cc/doc.html#/use/route-check">Sa-Token 路由拦截鉴权</a>
 */
@Provider
@ApplicationScoped
@Priority(Priorities.AUTHORIZATION)
public class AuthorizationFilter implements ContainerRequestFilter {

    @Inject
    ObjectMapper objectMapper;

    @Inject
    @ConfigProperty(name = "app.auth.skip", defaultValue = "false")
    boolean authSkip;

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    /**
     * 公开路径（无需登录），使用 Ant 风格 pattern
     */
    @SuppressWarnings("ConstantValue")
    private static final List<String> PUBLIC_PATTERNS = Stream.concat(
                    Stream.of(
                            "/", "/hello",
                            "/login", "/logout", "/login/status",
                            "/verification-code-limit-length",
                            "/verification-code/generate", "/verification-code",
                            "/captcha/generate", "/captcha/check",
                            "/sms/ws-status", "/sms/ws-login",
                            "/ui/**"
                    ).map(item -> AppConst.API_PATH_PREFIX + item),
                    "/".equals(AppConst.API_PATH_PREFIX) ? Stream.empty() : Stream.of("/")
            )
            .toList();

    /**
     * 管理员专属路径（需要 loginId == admin）
     */
    private static final List<String> ADMIN_PATTERNS = Stream.of(
            "/app/**", "/kickout"
    ).map(item -> AppConst.API_PATH_PREFIX + item).toList();

    @Override
    public void filter(ContainerRequestContext requestContext) {
        // 开发模式：跳过鉴权，自动以管理员身份登录
        if (authSkip) {
            if (StpUtil.isLogin()) {
                StpUtil.switchTo(AppConst.XFL_WEBUI_ADMIN_LOGIN_ID);
            } else {
                StpUtil.login(AppConst.XFL_WEBUI_ADMIN_LOGIN_ID);
            }
            return;
        }

        String requestPath = requestContext.getUriInfo().getPath();

        // 公开路径直接放行
        if (matchesAny(requestPath, PUBLIC_PATTERNS)) {
            return;
        }

        try {
            // 其余路径需要登录校验
            StpUtil.checkLogin();

            // 管理员专属路径
            if (matchesAny(requestPath, ADMIN_PATTERNS)) {
                if (!AppConst.XFL_WEBUI_ADMIN_LOGIN_ID.equals(StpUtil.getLoginIdAsString())) {
                    throw NotLoginException.newInstance(
                            StpUtil.stpLogic.getLoginType(),
                            NotLoginException.NOT_TOKEN,
                            NotLoginException.NOT_TOKEN_MESSAGE,
                            null
                    );
                }
            }

            // // 将 loginId / token 注入请求属性，供 Controller 使用
            // requestContext.setProperty("loginId", StpUtil.getLoginIdAsString());
            // requestContext.setProperty("token", StpUtil.getTokenValue());
        } catch (NotLoginException e) {
            Log.debugf("Auth rejected: %s", e.getMessage());
            abortWithNoLogin(requestContext);
        } catch (Exception e) {
            Log.error("Failed to check authorization", e);
            throw e;
        }
    }

    // ==================== 工具方法 ====================

    private static boolean matchesAny(String path, List<String> patterns) {
        for (String pattern : patterns) {
            if (PATH_MATCHER.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private void abortWithNoLogin(ContainerRequestContext requestContext) {
        try {
            ApiResponse<Object> responseData = ApiResponse.of(JsonApiResult.FAILED_NO_LOGIN);
            requestContext.abortWith(Response.status(Response.Status.FORBIDDEN)
                    .entity(objectMapper.writeValueAsString(responseData))
                    .type(MediaType.APPLICATION_JSON)
                    .encoding(StandardCharsets.UTF_8.name())
                    .build());
        } catch (Exception e) {
            Log.error("Failed to write auth error response", e);
            requestContext.abortWith(Response.status(Response.Status.FORBIDDEN).build());
        }
    }
}
