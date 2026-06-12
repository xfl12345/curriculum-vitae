package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.SaManager;
import io.quarkus.logging.Log;
// import jakarta.annotation.Priority;
// import jakarta.enterprise.context.ApplicationScoped;
// import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
// import jakarta.ws.rs.ext.Provider;

/**
 * Sa-Token 上下文初始化
 *
 * @see <a href="https://sa-token.cc/doc.html#/fun/sa-token-context">Sa-Token 上下文适配</a>
 */
// @Provider
// @ApplicationScoped
// @Priority(Priorities.AUTHENTICATION - 100)
public class QuarkusSaTokenContextFilter implements ContainerRequestFilter, ContainerResponseFilter {

    // ==================== 请求阶段 ====================

    @Override
    public void filter(ContainerRequestContext requestContext) {

        // 初始化 Sa-Token 上下文
        SaManager.getSaTokenContext().setContext(
                new JakartaSaRequest(requestContext),
                new JakartaSaResponse(requestContext),
                new RamSaStorage()
        );
    }

    // ==================== 响应阶段 ====================

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        try {
            Object resp = SaManager.getSaTokenContext().getResponse();
            if (resp instanceof JakartaSaResponse quarkusResponse) {
                quarkusResponse.flushHeaders(responseContext);
            }
        } catch (Exception e) {
            Log.error("Failed to flush Sa-Token response headers", e);
        } finally {
            try {
                SaManager.getSaTokenContext().clearContext();
            } catch (Exception e) {
                Log.error("Failed to clear Sa-Token context", e);
            }
        }
    }

}
