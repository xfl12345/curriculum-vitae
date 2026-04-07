/*
 * Copyright 2020-2099 sa-token.cc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package cc.xfl12345.person.cv.framework.satoken;


import cn.dev33.satoken.stp.parameter.enums.SaLogoutMode;
import cn.dev33.satoken.stp.parameter.enums.SaLogoutRange;
import cn.dev33.satoken.stp.parameter.enums.SaReplacedLoginExitMode;
import cn.dev33.satoken.stp.parameter.enums.SaReplacedRange;
import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

import java.io.Serializable;
import java.util.Map;
import java.util.Optional;

/**
 * Sa-Token 配置的 Quarkus ConfigMapping 接口。
 * <p>
 * 将 {@code sa-token.*} YAML 配置映射为类型安全的接口，
 * 替代 Spring Boot 风格的 {@code cn.dev33.satoken.config.SaTokenConfig} 直接注入。
 * <p>
 * 所有字段均为 {@link Optional}，未配置时由 {@link cn.dev33.satoken.config.SaTokenConfig} 的默认值兜底。
 *
 * @see cn.dev33.satoken.config.SaTokenConfig
 */
@ConfigMapping(prefix = "sa-token")
public interface QuarkusSaTokenConfig extends Serializable {

    // -------------------- 基本 --------------------

    /** token 名称（同时也是 cookie 名称、提交参数名、存储 key 前缀） */
    Optional<String> tokenName();

    /** token 有效期（秒），-1=永久 */
    Optional<Long> timeout();

    /** token 最低活跃频率（秒），-1=不限制 */
    Optional<Long> activeTimeout();

    /** 是否启用动态 activeTimeout */
    Optional<Boolean> dynamicActiveTimeout();

    // -------------------- 登录策略 --------------------

    /** 是否允许同一账号多地同时登录（true=一起登录，false=新登录挤掉旧登录） */
    Optional<Boolean> isConcurrent();

    /** 多人登录同一账号时，是否共用一个 token */
    Optional<Boolean> isShare();

    /** isConcurrent=false 时，新旧设备谁放弃会话 */
    Optional<SaReplacedLoginExitMode> replacedLoginExitMode();

    /** isConcurrent=false 时，顶人下线的范围 */
    Optional<SaReplacedRange> replacedRange();

    /** 同一账号最大登录数量，-1=不限 */
    Optional<Integer> maxLoginCount();

    /** 溢出 maxLoginCount 的注销方式 */
    Optional<SaLogoutMode> overflowLogoutMode();

    /** 创建 token 时的最高循环次数，-1=不循环 */
    Optional<Integer> maxTryTimes();

    // -------------------- Token 读取 --------------------

    /** 是否从请求体读取 token */
    Optional<Boolean> isReadBody();

    /** 是否从 header 读取 token */
    Optional<Boolean> isReadHeader();

    /** 是否从 cookie 读取 token */
    Optional<Boolean> isReadCookie();

    /** 是否为持久 Cookie */
    Optional<Boolean> isLastingCookie();

    /** 登录后是否将 token 写入响应头 */
    Optional<Boolean> isWriteHeader();

    // -------------------- 注销 --------------------

    /** 注销范围（TOKEN / ACCOUNT） */
    Optional<SaLogoutRange> logoutRange();

    /** 已冻结 token 是否保留注销操作权 */
    Optional<Boolean> isLogoutKeepFreezeOps();

    /** 注销 token 后是否保留 Token-Session */
    Optional<Boolean> isLogoutKeepTokenSession();

    /** 登录时是否立即创建 Token-Session */
    Optional<Boolean> rightNowCreateTokenSession();

    // -------------------- Token 风格 --------------------

    /** token 风格（uuid / simple-uuid / random-32 / random-64 / random-128 / tik） */
    Optional<String> tokenStyle();

    /** token 前缀（如 Bearer） */
    Optional<String> tokenPrefix();

    /** cookie 模式是否自动填充 token 前缀 */
    Optional<Boolean> cookieAutoFillPrefix();

    // -------------------- DAO / Session --------------------

    /** 清理过期数据间隔（秒），-1=不清理 */
    Optional<Integer> dataRefreshPeriod();

    /** getTokenSession 时是否校验登录 */
    Optional<Boolean> tokenSessionCheckLogin();

    /** 是否自动续签 activeTimeout */
    Optional<Boolean> autoRenew();

    // -------------------- 日志 --------------------

    /** 是否在控制台打印版本字符画 */
    Optional<Boolean> isPrint();

    /** 是否打印操作日志 */
    Optional<Boolean> isLog();

    /** 日志等级（trace / debug / info / warn / error / fatal） */
    Optional<String> logLevel();

    /** 是否打印彩色日志 */
    Optional<Boolean> isColorLog();

    // -------------------- 认证 --------------------

    /** JWT 秘钥（仅集成 jwt 模块时生效） */
    Optional<String> jwtSecretKey();

    /** HTTP Basic 认证账号:密码 */
    Optional<String> httpBasic();

    /** HTTP Digest 认证账号:密码 */
    Optional<String> httpDigest();

    /** 当前项目的网络访问地址 */
    Optional<String> currDomain();

    /** Same-Token 有效期（秒） */
    Optional<Long> sameTokenTimeout();

    /** 是否校验 Same-Token */
    Optional<Boolean> checkSameToken();

    // -------------------- Cookie --------------------

    /** Cookie 全局配置 */
    Optional<CookieConfig> cookie();

    /** Cookie 子配置 */
    interface CookieConfig {
        /** 作用域 */
        Optional<String> domain();

        /** 路径 */
        Optional<String> path();

        /** 是否只在 https 下有效 */
        Optional<Boolean> secure();

        /** 是否禁止 js 操作 */
        Optional<Boolean> httpOnly();

        /** 第三方限制级别（Strict / Lax / None） */
        Optional<String> sameSite();

        /**
         * 额外扩展属性
         * <p>
         * 注意，Smallrye Config 不允许 MAP 类型是可选的
         * </p>
         * */
        @WithDefault("{}")
        Map<String, String> extraAttrs();
    }
}
