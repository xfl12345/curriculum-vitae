package cc.xfl12345.person.cv.filter;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.service.UserService;
import cn.dev33.satoken.stp.StpUtil;
import io.quarkus.logging.Log;
import io.quarkus.virtual.threads.VirtualThreads;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

import java.time.ZonedDateTime;
import java.util.concurrent.ExecutorService;

/**
 * 访问时间更新过滤器 —— 迁移自旧项目 AllRequestInterceptor。
 * <p>
 * 每次请求更新已登录用户的最后访问时间。
 * 跳过 admin 和 SMS 服务账号。
 */
@Provider
@ApplicationScoped
@Priority(Priorities.AUTHORIZATION + 200)
public class AccessTimeFilter implements ContainerRequestFilter {

    @Inject
    UserService userService;

    @Inject
    @VirtualThreads
    ExecutorService vThreads;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        var nowZonedDateTime = ZonedDateTime.now();
        if (StpUtil.isLogin()) {
            String loginId = StpUtil.getLoginIdAsString();
            // 只记录 HR 的访问时刻
            if (AppConst.XFL_WEBUI_ADMIN_LOGIN_ID.equals(loginId)
                    || AppConst.XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID.equals(loginId)) {
                return;
            }

            vThreads.submit(() -> {
                var now = nowZonedDateTime.toOffsetDateTime();
                try {
                    if(userService.justUpdateVisitTimeById(Long.parseLong(loginId), nowZonedDateTime)) {
                        Log.infof("Succeed to update access time for loginId[%s] at time[%s]", loginId, now);
                    } else {
                        Log.warnf("Failed to update access time for loginId[%s] at time[%s]", loginId, now);
                    }
                } catch (NumberFormatException e) {
                    Log.errorf("Skipping access time update for non-numeric loginId[%s] at time[%s]", loginId, now);
                }
            });
        }
    }
}
