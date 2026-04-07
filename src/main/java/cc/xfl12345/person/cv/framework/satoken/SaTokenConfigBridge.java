package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.config.SaCookieConfig;
import cn.dev33.satoken.config.SaTokenConfig;

/**
 * 将 {@link QuarkusSaTokenConfig} 转换为 {@link SaTokenConfig}。
 * <p>
 * 仅覆盖 YAML 中显式配置的字段，未配置的字段保留 {@link SaTokenConfig} 的默认值。
 */
public final class SaTokenConfigBridge {

    private SaTokenConfigBridge() {
    }

    public static SaTokenConfig convert(QuarkusSaTokenConfig c) {
        SaTokenConfig config = new SaTokenConfig();

        // 基本
        c.tokenName().ifPresent(config::setTokenName);
        c.timeout().ifPresent(config::setTimeout);
        c.activeTimeout().ifPresent(config::setActiveTimeout);
        c.dynamicActiveTimeout().ifPresent(config::setDynamicActiveTimeout);

        // 登录策略
        c.isConcurrent().ifPresent(config::setIsConcurrent);
        c.isShare().ifPresent(config::setIsShare);
        c.replacedLoginExitMode().ifPresent(config::setReplacedLoginExitMode);
        c.replacedRange().ifPresent(config::setReplacedRange);
        c.maxLoginCount().ifPresent(config::setMaxLoginCount);
        c.overflowLogoutMode().ifPresent(config::setOverflowLogoutMode);
        c.maxTryTimes().ifPresent(config::setMaxTryTimes);

        // Token 读取
        c.isReadBody().ifPresent(config::setIsReadBody);
        c.isReadHeader().ifPresent(config::setIsReadHeader);
        c.isReadCookie().ifPresent(config::setIsReadCookie);
        c.isLastingCookie().ifPresent(config::setIsLastingCookie);
        c.isWriteHeader().ifPresent(config::setIsWriteHeader);

        // 注销
        c.logoutRange().ifPresent(config::setLogoutRange);
        c.isLogoutKeepFreezeOps().ifPresent(config::setIsLogoutKeepFreezeOps);
        c.isLogoutKeepTokenSession().ifPresent(config::setIsLogoutKeepTokenSession);
        c.rightNowCreateTokenSession().ifPresent(config::setRightNowCreateTokenSession);

        // Token 风格
        c.tokenStyle().ifPresent(config::setTokenStyle);
        c.tokenPrefix().ifPresent(config::setTokenPrefix);
        c.cookieAutoFillPrefix().ifPresent(config::setCookieAutoFillPrefix);

        // DAO / Session
        c.dataRefreshPeriod().ifPresent(config::setDataRefreshPeriod);
        c.tokenSessionCheckLogin().ifPresent(config::setTokenSessionCheckLogin);
        c.autoRenew().ifPresent(config::setAutoRenew);

        // 日志
        c.isPrint().ifPresent(config::setIsPrint);
        c.isLog().ifPresent(config::setIsLog);
        c.logLevel().ifPresent(config::setLogLevel);
        c.isColorLog().ifPresent(config::setIsColorLog);

        // 认证
        c.jwtSecretKey().ifPresent(config::setJwtSecretKey);
        c.httpBasic().ifPresent(config::setHttpBasic);
        c.httpDigest().ifPresent(config::setHttpDigest);
        c.currDomain().ifPresent(config::setCurrDomain);
        c.sameTokenTimeout().ifPresent(config::setSameTokenTimeout);
        c.checkSameToken().ifPresent(config::setCheckSameToken);

        // Cookie
        c.cookie().ifPresent(cookie -> {
            SaCookieConfig cookieConfig = config.getCookie();
            cookie.domain().ifPresent(cookieConfig::setDomain);
            cookie.path().ifPresent(cookieConfig::setPath);
            cookie.secure().ifPresent(cookieConfig::setSecure);
            cookie.httpOnly().ifPresent(cookieConfig::setHttpOnly);
            cookie.sameSite().ifPresent(cookieConfig::setSameSite);
            if (!cookie.extraAttrs().isEmpty()) {
                cookieConfig.setExtraAttrs(cookie.extraAttrs());
            }
        });

        return config;
    }
}
