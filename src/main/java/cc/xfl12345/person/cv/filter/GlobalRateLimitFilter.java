package cc.xfl12345.person.cv.filter;

import cc.xfl12345.person.cv.appconst.AppConst;
import io.quarkiverse.bucket4j.runtime.RateLimited;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

/**
 * 全局限流过滤器，保护所有 API 端点免受刷流攻击。
 * <p>
 * 配置在 {@link io.quarkiverse.bucket4j.runtime.RateLimiterRuntimeConfig#buckets() quarkus.rate-limiter.buckets.global}，
 * 身份解析复用 {@link cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver}（已登录按 loginId，匿名按 IP）。
 */
@Provider
@ApplicationScoped
@Priority(Priorities.AUTHENTICATION - 50)
public class GlobalRateLimitFilter implements ContainerRequestFilter {
    @RateLimited(bucket = "global")
    protected void consumeBucket() {
        // handled by bucket4j AOP function
    }

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String path = requestContext.getUriInfo().getPath();
        if (!path.startsWith(AppConst.API_PATH_PREFIX)) {
            return;
        }

        consumeBucket();
    }
}
