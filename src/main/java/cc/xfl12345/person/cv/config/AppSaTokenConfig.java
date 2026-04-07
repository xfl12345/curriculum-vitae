package cc.xfl12345.person.cv.config;

import cc.xfl12345.person.cv.framework.satoken.QuarkusSaTokenConfig;
import cc.xfl12345.person.cv.framework.satoken.SaTokenConfigBridge;
import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.config.SaTokenConfig;
import cn.dev33.satoken.dao.SaTokenDao;
import cn.dev33.satoken.strategy.SaStrategy;
import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.springframework.util.AntPathMatcher;

/**
 * Sa-Token 配置类
 * <p>
 * 在 Quarkus 启动时完成 Sa-Token 核心组件的初始化，
 * 相当于 Spring Boot starter 中 {@code SaTokenContextRegister} 的职责。
 *
 * @see <a href="https://sa-token.cc/doc.html">Sa-Token 官方文档</a>
 */
@ApplicationScoped
public class AppSaTokenConfig {

    @Inject
    QuarkusSaTokenConfig quarkusSaTokenConfig;

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();


    public void onStart(@Observes StartupEvent ev) {
        Log.info("Initializing Sa-Token...");

        // 注册路由匹配策略（Spring Boot starter 在 SaTokenContextRegister 构造器中做的事）
        SaStrategy.instance.routeMatcher = PATH_MATCHER::match;
        Log.info("Sa-Token routeMatcher registered (Spring AntPathMatcher)");

        // 应用配置
        SaTokenConfig saTokenConfig = SaTokenConfigBridge.convert(quarkusSaTokenConfig);
        SaManager.setConfig(saTokenConfig);

        // 确保 SaTokenDao 被初始化（使用默认的内存实现）
        SaTokenDao saTokenDao = SaManager.getSaTokenDao();
        Log.infof("Sa-Token DAO initialized: %s", saTokenDao.getClass().getSimpleName());

        Log.info("Sa-Token initialized successfully.");
    }
}
