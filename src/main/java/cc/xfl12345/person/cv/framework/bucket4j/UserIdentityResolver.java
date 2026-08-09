package cc.xfl12345.person.cv.framework.bucket4j;

import cn.dev33.satoken.stp.StpUtil;
import io.quarkiverse.bucket4j.runtime.RateLimiterRuntimeConfig;
import io.quarkiverse.bucket4j.runtime.resolver.IdentityResolver;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;

/**
 * 用户身份解析器：已登录用户按 loginId 限流，匿名用户按 IP 限流。
 * <p>
 * 在 {@code application.yml} 的 {@code quarkus.rate-limiter.buckets.<name>.identity-resolver} 中以全限定类名配置。
 *
 * @see IdentityResolver
 * @see RateLimiterRuntimeConfig.Bucket#identityResolver()
 */
@RequestScoped
public class UserIdentityResolver implements IdentityResolver {

    @Inject
    RoutingContext routingContext;

    @Override
    public String getIdentityKey() {
        try {
            String loginId = StpUtil.getLoginIdAsString();
            if (loginId != null) {
                return "login:" + loginId;
            }
        } catch (Exception ignored) {
        }

        return "ip:" + resolveIp();
    }

    protected String resolveIp() {
        HttpServerRequest req = routingContext.request();

        // 依次检查常见代理/CDN头
        String ip = req.getHeader("cf-connecting-ip");
        if (isUsableIp(ip)) return ip;

        ip = req.getHeader("X-Forwarded-For");
        if (isUsableIp(ip)) {
            int idx = ip.indexOf(',');
            return idx >= 0 ? ip.substring(0, idx) : ip;
        }

        ip = req.getHeader("X-Real-IP");
        if (isUsableIp(ip)) return ip;

        ip = req.getHeader("REMOTE-HOST");
        if (isUsableIp(ip)) return ip;

        return req.remoteAddress().host();
    }

    protected static boolean isUsableIp(String ip) {
        return ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip);
    }
}
