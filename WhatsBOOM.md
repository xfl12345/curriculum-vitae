# 后端代码移植去向分析

> **本文档目的**：逐类记录旧项目每个类的移植去向或未移植原因。仅记录旧项目已有内容的迁移情况，不记录新项目的新增内容。
>
> 旧项目：`curriculum-vitae-stack/curriculum-vitae-web-server`（Spring Boot）
> 新项目：`curriculum-vitae`（Quarkus）

---

## 一、逐类移植去向

### 1. `cc.xfl12345.person.cv.Main`

- **`shutdown` 逻辑**（3 秒延迟后 `System.exit(0)`）→ `cc.xfl12345.person.cv.controller.ApplicationController.shutdown()`，`System.exit(0)` 换成 `Quarkus.asyncExit(0)`
- **`restart` 逻辑**（关闭 + 重新 `SpringApplication.run`）→ **未移植**。Quarkus 不支持 Spring ApplicationContext 热重启。
- **`@SpringBootApplication`、`@EnableCaching`、`@EnableConfigurationProperties`** → **未移植**。Quarkus 无对应注解，CDI 由 Quarkus ARC 自动启用；缓存由 `quarkus-cache`（Caffeine）扩展自动启用，验证码缓存通过 `@CacheName("sms-validation-code")` 注入。

---

### 2. `cc.xfl12345.person.cv.appconst.AppConst`

→ `cc.xfl12345.person.cv.appconst.AppConst`

| 旧字段 | 去向 |
|---|---|
| `MESSAGE_TEMPLATE_FIELD_CAN_NOT_BE_NULL` | 未移植，引用方 `FieldNotNullChecker` 也被移除 |
| `XFL_WEBUI_ADMIN_LOGIN_ID = "admin"` | 保留 |
| `XFL_SMS_WEB_SOCKET_SERIVE_LOGIN_ID = "sms-server-admin"` | 保留，拼写修正为 `XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID` |

---

### 3. `cc.xfl12345.person.cv.appconst.CommonConst`

→ **未移植**。唯一常量 `INFORMATION_SCHEMA_TABLE_NAME = "information_schema"` 是 MySQL 特有的，新项目改用 SQLite。

---

### 4. `cc.xfl12345.person.cv.appconst.ControllerConst`

→ **未移植**。唯一常量 `dependsOnBean = "sessionFactory"` 是 Bee ORM 的 Spring Bean 名，新项目改用 EasyQuery。

---

### 5. `cc.xfl12345.person.cv.appconst.DefaultSingleton`

→ **未移植**。仅持有 `FieldNotNullChecker` 的单例，而 `FieldNotNullChecker` 本身未移植。

---

### 6. `cc.xfl12345.person.cv.appconst.EnvConst`

→ **未移植**。全部是 Spring 特有的配置键名（`app.logging.console.level`、`spring.application.name`、`logging.file.name` 等），Quarkus 使用 MicroProfile Config，键名和默认值机制不同。

---

### 7. `cc.xfl12345.person.cv.appconst.JsonApiConst`

→ `cc.xfl12345.person.cv.appconst.JsonApiConst`（三个常量原封不动）

---

### 8. `cc.xfl12345.person.cv.appconst.JsonApiResult`

→ `cc.xfl12345.person.cv.appconst.JsonApiResult`（枚举值和 HTTP 状态码映射原封不动）

---

### 9. `cc.xfl12345.person.cv.conf.AppConfig`

三个 `@Bean` 方法的去向：

| 旧 `@Bean` 方法 | 去向 |
|---|---|
| `requestAnalyser()` → `new RequestAnalyser()` | **已删除**。`RequestAnalyser`、`IpAddressGetter`、`SimpleIpAddressGetter` 三个类的 IP 解析逻辑已内联到 `UserIdentityResolver.resolveIp()`，不再需要策略模式抽象 |
| `anyUserRequestRateLimitHelperFactory(CacheManager, RequestAnalyser)` | **已删除**。功能由 Quarkiverse Bucket4j 扩展的 `@RateLimited` 注解 + YAML 配置取代，不再需要手动创建限流器工厂 |
| `mySmsConfig()` → `new XflSmsConfig()` + `@ConfigurationProperties` | `cc.xfl12345.person.cv.config.props.XflSmsConfig`（MicroProfile `@ConfigMapping` 接口）+ `cc.xfl12345.person.cv.config.props.XflSmsConfigImpl`（record 实现） |

---

### 10. `cc.xfl12345.person.cv.conf.DataSourceConfig`

- **`dataSource()` 方法**（创建 HikariDataSource + 调用 `MyDatabaseInitializer.init()`）→ 拆为两部分：
  - HikariDataSource 创建 → **未移植**，被 Quarkus `quarkus-agroal` 数据源自动配置取代
  - 数据库初始化调用 → `cc.xfl12345.person.cv.config.DatabaseInitializer.onStart()`（通过 `@Observes StartupEvent` 触发，直接 `@Inject DataSource`）

---

### 11. `cc.xfl12345.person.cv.conf.MyTianaiCaptchaConfig`

→ 旧项目已更名为 `cc.xfl12345.person.cv.conf.AppTianaiCaptchaConfig`。三个 `@Bean` 方法的去向：

| 旧 `@Bean` 方法 | 去向 |
|---|---|
| `cachedUrlResourceProvider()` | `cc.xfl12345.person.cv.config.CaptchaConfig.cachedUrlResourceProvider()` |
| `resourceStore()` — 手动创建 `DefaultResourceStore` + 添加模板 + `ClassPathResourceUtils.getURL()` 扫描背景图 | `cc.xfl12345.person.cv.config.CaptchaConfig.loadBackgroundImages()` — 改用 tianai-captcha 新版 `TACBuilder` API + `PathMatchingResourcePatternResolver` 扫描 + **Apache Tika** 检测 MIME 过滤非图片 |
| `imageCaptchaResourceManager()` — 注册 `CachedUrlResourceProvider` | 合并进 `CaptchaConfig.imageCaptchaApplication()`，直接 `builder.build()` 后 `registerResourceProvider()`

---

### 12. `cc.xfl12345.person.cv.conf.TomcatConfig`

→ **未移植**。Quarkus 使用 Vert.x HTTP 服务器而非 Tomcat。
- `unloadDelay = 5000` → 对应配置迁移到 `application.yml` 的 `quarkus.http.shutdown-timeout`
- `connectionTimeout = 20000` → 对应配置迁移到 `application.yml` 的 `quarkus.http.io-timeout`

---

### 13. `cc.xfl12345.person.cv.conf.WebMvcInterceptorConfig`

这是旧项目路由鉴权体系的核心，拆分到多处：

| 旧代码组成部分 | 去向 |
|---|---|
| `addInterceptors()` 中公开路径注册（`/**`、`/captcha/**` 等） | `cc.xfl12345.person.cv.filter.AuthorizationFilter` 的 `PUBLIC_PATTERNS` 静态列表，全部加了 `API_PATH_PREFIX` 前缀 |
| `addInterceptors()` 中管理员路径注册（`/app/**`、`/db/**`、`/verification-code/**`、`/sms/ws-status`） | `AuthorizationFilter` 的 `ADMIN_PATTERNS` 静态列表（缩减为 `/app/**`、`/kickout`，其余路径移入公开路径） |
| `rateLimitInterceptor()` Bean 创建 | `LoginController` / `CaptchaController` 上的 `@RateLimited(bucket = "...")` — `identityResolver` 在 `application.yml` 中以全限定类名配置（`cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver`），注解上只指定 bucket 名 |
| `authInterceptor()` Bean 创建 → `AuthInterceptor.preHandle()` 的 `StpUtil.isLogin()` 校验 | `AuthorizationFilter.filter()` 中的 `StpUtil.checkLogin()` 调用 |
| `adminAuthInterceptor()` Bean 创建 → `AdminAuthInterceptor.preHandle()` 的 `loginId == "admin"` 校验 | `AuthorizationFilter.filter()` 中的管理员路径 `StpUtil.getLoginIdAsString()` 匹配 |
| `allRequestInterceptor()` Bean 创建 → `AllRequestInterceptor.preHandle()` 的访问时间更新 | `cc.xfl12345.person.cv.filter.AccessTimeFilter` — JAX-RS `ContainerRequestFilter`，每次已登录用户请求时更新 `last_visit_time` |
| `AuthInterceptor.onForbidden()` 的 403 JSON 响应写入 | `AuthorizationFilter.abortWithNoLogin()` |

---

### 14. `cc.xfl12345.person.cv.conf.WebResourceConfig`

→ **未移植**。整个类（`WebMvcConfigurer.addResourceHandlers()` + 根路径遍历映射逻辑）被 **Quarkus Quinoa 插件**取代。Quinoa 自动构建前端并挂载到 `/ui/**` 路径。

---

### 15. `cc.xfl12345.person.cv.conf.WebSocketConfig`

- **`registerWebSocketHandlers()`**（注册 SMS handler 到 `/sms/ws-connect` + 添加 `WebSocketInterceptor`）→ **未移植**为独立配置类。`cc.xfl12345.person.cv.service.SMS` 直接使用 `@ServerEndpoint("/sms/ws-connect")` 注解。
- **`WebSocketInterceptor` 的握手鉴权逻辑** → 合并进 `SMS.onOpen()`，改为从 URL query parameter 读取 token 并校验。

---

### 16. `cc.xfl12345.person.cv.initializer.EnvironmentOnCreatedInitializer`

→ **未移植**。这是 Spring `EnvironmentPostProcessor`，负责设置日志级别默认值、应用名、日志文件路径、字符集、Tomcat 容器检测。全部是 Spring Boot 特有的启动阶段钩子，Quarkus 有自己的配置机制。

---

### 17. `cc.xfl12345.person.cv.initializer.MyBeanFactoryPostProcessor`

→ **未移植**。这是 Spring `BeanFactoryPostProcessor`，仅做两件事：打印最终字符集配置、打印所有 Bean 定义名称。纯调试用途，Spring 特有。

---

### 18. `cc.xfl12345.person.cv.initializer.MyDatabaseInitializer`

| 旧方法 | 去向 |
|---|---|
| `init()` — 入口，判断是否 MySQL 后调用 `initMySQL()` | `cc.xfl12345.person.cv.config.DatabaseInitializer.onStart()`，`@Startup(Interceptor.Priority.APPLICATION)` 触发，直接读 SQL 文件执行，不再判断数据库类型 |
| `initMySQL()` — 临时连 `information_schema`，检查库是否存在，不存在则 `DROP DATABASE` + `CREATE DATABASE` + 建表 | **未移植**。SQLite 不需要"创建数据库"操作，`CREATE TABLE IF NOT EXISTS` 即可幂等建表 |
| `initDatabaseSchema()` — `DROP DATABASE` + `CREATE DATABASE` + `USE` + 执行建表 SQL | **未移植**，同上 |
| `tryExecuteResourceSqlFile()` — 按 URL 定位资源文件，委托 `executeSqlFile()` | `DatabaseInitializer.readResourceAsString()` — 改为 `PackageLandmark.class.getResourceAsStream()` 直接读 InputStream |
| `executeSqlFile()` — 用 **MyBatis ScriptRunner** 执行 SQL 脚本（含事务隔离 + 分隔符设置） | `DatabaseInitializer.onStart()` 中直接 `Statement.executeUpdate(sql)` |
| `getSql()` — 从 MySQL `ClientPreparedStatement` 提取可执行 SQL 字符串 | **未移植**，仅用于日志输出 |

---

### 19. `cc.xfl12345.person.cv.interceptor.AdminAuthInterceptor`

- **`preHandle()`**：`StpUtil.isLogin() && loginId == "admin"` → `cc.xfl12345.person.cv.filter.AuthorizationFilter.filter()` 中管理员路径校验段落：
  ```java
  if (matchesAny(requestPath, ADMIN_PATTERNS)) {
      if (!AppConst.XFL_WEBUI_ADMIN_LOGIN_ID.equals(StpUtil.getLoginIdAsString())) {
          throw NotLoginException.newInstance(...);
      }
  }
  ```
- **继承自 `AuthInterceptor`**：`AuthInterceptor` 的鉴权逻辑也合并进 `AuthorizationFilter`。

---

### 20. `cc.xfl12345.person.cv.interceptor.AllRequestInterceptor`

→ `cc.xfl12345.person.cv.filter.AccessTimeFilter`。JAX-RS `ContainerRequestFilter`，`@Priority(Priorities.AUTHORIZATION + 200)`，在 `AuthorizationFilter`（AUTHORIZATION = 2000）之后执行。职责不变：每次请求更新已登录用户的最后访问时间。跳过 admin 和 SMS 服务账号，通过虚拟线程（`@VirtualThreads ExecutorService`）异步调用 `UserService.justUpdateVisitTimeById(Long, LocalDateTime)`，避免阻塞请求线程。

---

### 21. `cc.xfl12345.person.cv.interceptor.AuthInterceptor`

| 旧方法 | 去向 |
|---|---|
| `preHandle()` — `StpUtil.isLogin()` 校验 | `AuthorizationFilter.filter()` 中的 `StpUtil.checkLogin()`（对非公开路径执行） |
| `onForbidden()` — 构造 JSON 403 响应并写入 `HttpServletResponse` | `AuthorizationFilter.abortWithNoLogin()` — 改用 JAX-RS `requestContext.abortWith(Response)` |

---

### 22. `cc.xfl12345.person.cv.interceptor.RateLimitInterceptor`

→ 由 **Quarkiverse Bucket4j** 扩展 + 自定义 `UserIdentityResolver` + `GlobalRateLimitFilter` 全面取代：

| 旧逻辑 | 新方案 |
|---|---|
| `init()` — 创建 `AnyUserRequestRateLimitHelper`（CaptchaCheck 每分钟 20/5 分钟 30） | `CaptchaController` 上的 `@RateLimited(bucket = "captcha-generate")` 和 `@RateLimited(bucket = "captcha-check")`，限流参数在 `application.yml` 的 `quarkus.rate-limiter.buckets` 中配置 |
| `preHandle()` — 按 `/captcha/generate` 和 `/captcha/check` 路径匹配后调限流 | `LoginController.login()` / `smsServerWebSocketLogin()` 上的 `@RateLimited(bucket = "login")` |
| `checkBucket()` — 限流失败时构造 JSON 响应 | 由 `@RateLimited` 自动返回 HTTP 429 + `Retry-After` header；`SMS.sendValidationCode(PhoneNumberDTO)` 通过 catch `RateLimitException` 获取 `waitTimeInMilliSeconds` 并返回带 `coolDownRemainder` 的自定义 JSON |

**注解配置**：`@RateLimited` 注解上只指定 `bucket` 名，`identityResolver` 统一在 `application.yml` 中以全限定类名 `cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver` 配置（内置 resolver 如 `IpResolver` 可用简单类名，自定义 resolver 必须全限定名）。

**双维度策略**：`UserIdentityResolver` 实现 `io.quarkiverse.bucket4j.runtime.resolver.IdentityResolver`，`@RequestScoped` CDI bean。已登录用户返回 `"login:" + loginId` 作为 bucket key（按用户维度限流），匿名用户返回 `"ip:" + ipAddress`（按 IP 维度限流）。IP 解析支持 CDN/代理头（CF-Connecting-IP、X-Forwarded-For 等），原 `RequestAnalyser` + `IpAddressGetter` + `SimpleIpAddressGetter` 的策略模式已内联到 `resolveIp()` 方法中。

**JAX-RS Filter 执行顺序**：`SaTokenContextFilter`（AUTHENTICATION - 100 = 900，Sa-Token 上下文初始化）→ `GlobalRateLimitFilter`（AUTHENTICATION - 50 = 950）→ `@RateLimited` 拦截器（LIBRARY_BEFORE = 1500）→ `AuthorizationFilter`（AUTHORIZATION = 2000，路由鉴权）→ `AccessTimeFilter`（AUTHORIZATION + 200 = 2200）。

---

### 23. `cc.xfl12345.person.cv.interceptor.WebSocketInterceptor`

- **`beforeHandshake()`**：检查 `StpUtil.isLogin()`，拒绝未登录握手 → 合并进 `cc.xfl12345.person.cv.service.SMS.onOpen()`：
  ```java
  String token = session.getRequestURI().getQuery();
  // ... parse token ...
  String loginId = (String) StpUtil.getLoginIdByToken(token);
  if (loginId == null) { session.close(...); return; }
  ```
  实现方式从检查 Sa-Token 上下文改为直接从 query parameter 取 token 手动校验。
- **`afterHandshake()`**（空方法）→ **未移植**。

---

### 24. `cc.xfl12345.person.cv.json.PackageLandmark`

→ **未移植**。旧项目 `json/` 资源目录下没有任何实际资源文件（空目录），该包标记类无引用方。新项目删除了 `json` 包及对应资源目录。

---

### 25. `cc.xfl12345.person.cv.listener.AllSpringEventListener`

→ **未移植**。Spring `ApplicationListener`，监听所有 Spring 事件并打印日志。Quarkus 使用 CDI 事件，机制完全不同。

---

### 26. `cc.xfl12345.person.cv.log.ConsoleLogFilter`

→ **未移植**。Logback 的 `Filter<ILoggingEvent>`，通过前缀匹配和完全限定名匹配抑制 Tomcat/HikariPool/Druid 等框架噪音日志。Quarkus 使用 JBoss LogManager，自带合理的默认日志级别，不需要自定义过滤器。

---

### 27. `cc.xfl12345.person.cv.pojo.FieldNotNullChecker`

→ **未移植**。一个简单的 `check(Object, String)` 方法，在 `@PostConstruct` 中校验依赖注入的字段是否为 null。旧项目的拦截器和配置类大量使用它做防御性编程，新项目中这些调用点全部随拦截器/配置类一起移除或重写。

---

### 28. `cc.xfl12345.person.cv.pojo.MysqlJdbcUrlBean`

→ **未移植**。MySQL JDBC URL 解析器（`ConnectionUrl` → 提取 authority/databaseName/connectionArguments → 重建 URL）。仅被 `MyDatabaseInitializer` 使用，而 `MyDatabaseInitializer` 的 MySQL 初始化逻辑已移除。

---

### 29. `cc.xfl12345.person.cv.pojo.XflSmsConfig`

五个字段 (`accessKeySecret`, `signName`, `validationCodeLength`, `expirationInMinute`, `template`) → `cc.xfl12345.person.cv.config.props.XflSmsConfig`。从 Lombok `@Data` POJO 变为 MicroProfile `@ConfigMapping(prefix = "app.sms.xfl12345")` 接口，getter 调用从 `getSignName()` 变为 `signName()`。

---

### 30. `cc.xfl12345.person.cv.pojo.WebResourceMapping`

→ `cc.xfl12345.person.cv.pojo.WebResourceMapping`（原封不动保留。虽静态资源映射机制被 Quinoa 取代，此类不再被主动使用。）

---

### 31. `cc.xfl12345.person.cv.pojo.request.SmsVerificationCodeRequestData`

→ **未移植**。只是 `ApiRequest<PhoneNumberDTO>` 的空子类，调用方（`CaptchaController.checkCaptcha`）已直接使用 `ApiRequest<?>` 做反序列化。

---

### 32. `cc.xfl12345.person.cv.pojo.response.JsonApiResponseData`

三个便捷构造函数（`JsonApiResponseData()`、`JsonApiResponseData(String)`、`JsonApiResponseData(JsonApiResult)`、`JsonApiResponseData(String, JsonApiResult)`）→ 全部合并进 `cc.xfl12345.person.cv.pojo.response.ApiResponse`。新项目的 `ApiResponse` 使用静态工厂方法 `of()` + 链式 `with*()` 方法，不再需要独立的子类和基类。

---

### 33. `cc.xfl12345.person.cv.pojo.RateLimitHelper`

→ **已删除**。整个自定义 bucket4j 框架由 Quarkiverse Bucket4j 扩展取代。限流现在全部通过 `@RateLimited` 注解实现。

---

### 34. `cc.xfl12345.person.cv.pojo.AnyUserRequestRateLimitHelper`

→ **已删除**。双维度限流（loginId / IP）现在由 `UserIdentityResolver` 在身份解析阶段统一处理，不再需要独立的 Helper 类。

---

### 35. `cc.xfl12345.person.cv.pojo.AnyUserRequestRateLimitHelperFactory`

→ **已删除**。整个自定义 bucket4j 框架（`RateLimitHelper`、`AnyUserRequestRateLimitHelper`、`AnyUserRequestRateLimitHelperFactory`、`RateLimitHelperRegistry`、`BucketConfigMapping`、`NamedBucketConfig`、`SimpleBucketConfig`、`SimpleBucketConfigImpl`、`SimpleBucketConfigUtils`）全部由 Quarkiverse Bucket4j 扩展 + `UserIdentityResolver` 取代。

- 登录/SMS WebSocket 登录：`@RateLimited(bucket = "login")`
- Captcha 生成/校验：`@RateLimited(bucket = "captcha-generate")` / `@RateLimited(bucket = "captcha-check")`
- SMS 验证码：`SMS.consumeBucket()` 上 `@RateLimited(bucket = "sms-validation-code")`，catch `RateLimitException` 保留 `coolDownRemainder` 自定义响应
- 全局 API 保护：`GlobalRateLimitFilter.consumeBucket()` 上 `@RateLimited(bucket = "global")`
- 所有 bucket 统一配置在 `quarkus.rate-limiter.buckets`，`identityResolver` 以全限定类名 `cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver` 配置在 YAML 中

---

### 36. `cc.xfl12345.person.cv.pojo.RequestAnalyser` + `IpAddressGetter` + `SimpleIpAddressGetter`

→ **已删除**。三个类（`RequestAnalyser`、`IpAddressGetter` 接口、`SimpleIpAddressGetter` 实现）的 IP 解析逻辑已内联到 `cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver.resolveIp()`。

原因：原来用策略模式（接口 + `LinkedHashMap` 组合多 getter）是因为多处复用（限流拦截器、SMS 等）。重构为 Quarkiverse Bucket4j 后，IP 解析只在 `UserIdentityResolver` 这一处使用，不需要额外的抽象层，直接内联即可。

| 旧类 | 职责 | 内联位置 |
|---|---|---|
| `IpAddressGetter`（接口） | IP 获取策略抽象 | 不再需要策略模式，直接方法内实现 |
| `SimpleIpAddressGetter` | 按 header 取 IP + `X-Forwarded-For` 取第一个 | `resolveIp()` 逐 header 检查 + 逗号分割取首个 |
| `RequestAnalyser` | 组合多个 `IpAddressGetter` 依次尝试 | `resolveIp()` 方法本身：`cf-connecting-ip` → `X-Forwarded-For` → `X-Real-IP` → `REMOTE-HOST` → `remoteAddress().host()` |

---

### 37. `cc.xfl12345.person.cv.pojo.database.MeetHr`

→ `cc.xfl12345.person.cv.pojo.database.MeetHr`，注解体系全面替换：

| 旧注解 | 新注解 | 原因 |
|---|---|---|
| `@javax.persistence.Entity` + `@javax.persistence.Table(name = "meet_hr")` | `@com.easy.query.core.annotation.Table("meet_hr")` | ORM 从 JPA 切换到 EasyQuery |
| `@javax.persistence.Id` + `@GeneratedValue(generator = "JDBC")` | `@com.easy.query.core.annotation.Column(primaryKey = true, generatedKey = true)` | 同上 |
| `@javax.persistence.Column(name = "...")` | `@com.easy.query.core.annotation.Column`（仅主键保留） | EasyQuery 自动驼峰→下划线映射，不需要逐字段标注 |
| `@io.swagger.annotations.ApiModel` + `@ApiModelProperty` | `@org.eclipse.microprofile.openapi.annotations.media.Schema` | Swagger 1.x → SmallRye OpenAPI (MicroProfile) |
| `@lombok.experimental.FieldNameConstants` | 移除 | Bee ORM 用 `MeetHr.Fields.xxx` 引用字段名，EasyQuery 用 Lambda 表达式不需要 |
| 无 | `@com.easy.query.core.annotation.EntityProxy` + `implements ProxyEntityAvailable<MeetHr, MeetHrProxy>` | EasyQuery 代理实体需要 |
| 无 | `@JsonFormat(shape = JsonFormat.Shape.STRING)` on `id` | 防 Long 精度丢失 |

---

### 38. `cc.xfl12345.person.cv.controller.ApplicationController`

| 旧方法 | 去向 |
|---|---|
| `shutdown()` — `System.exit(0)` | `cc.xfl12345.person.cv.controller.ApplicationController.shutdown()` — `Quarkus.asyncExit(0)` |
| `reboot()` — `Main.restart()` | **未移植**。Quarkus 不支持 Spring ApplicationContext 热重启 |
| `@DependsOn(ControllerConst.dependsOnBean)` | 移除，Bee ORM 已不存在 |

---

### 39. `cc.xfl12345.person.cv.controller.CaptchaController`

| 旧方法 | 去向 |
|---|---|
| `genCaptcha()` — 返回 `CaptchaResponse<ImageCaptchaVO>` | `cc.xfl12345.person.cv.controller.CaptchaController.genCaptcha()` — 包装为 `ApiResponse<ImageCaptchaVO>`；加 `@RateLimited` 注解 |
| `checkCaptcha()` — 验证码校验 + 附带操作 | 同名方法，返回类型从 `ApiResponse<Object>` 改为 `ApiResponse<CaptchaActionResult>`（新增 `CaptchaActionResult` record，含 `captchaPassed` 和 `smsVerificationCodeSent` 字段）；参数从 `HttpServletRequest` + `@RequestBody ImageCaptchaTrack` 改为 `@QueryParam("id")` + 直接 `ImageCaptchaTrack`；校验调用从 `imageCaptchaApplication.matching(id, track)` 改为 `imageCaptchaApplication.matching(id, new MatchParam(track))`（tianai-captcha 新 API）；加 `@RateLimited` 注解 |
| `check2Captcha()` — 二次验证 | **未移植** |

---

### 40. `cc.xfl12345.person.cv.controller.IndexController`

| 旧方法 | 去向 |
|---|---|
| `indexPage()` — `response.sendRedirect("./index.html")` | `cc.xfl12345.person.cv.controller.IndexController.indexPage()` — JAX-RS `Response.status(302).header(Location, uiRootPath + "/index.html").build()`；目标路径从硬编码改为读取 `quarkus.quinoa.ui-root-path` 配置 |

---

### 41. `cc.xfl12345.person.cv.controller.LoginController`

| 旧方法/逻辑 | 去向 |
|---|---|
| `init()` — 读 `springAppEnv.getProperty()` 获取管理员配置 + 清空 JCache + 创建 JCache 版 `loginRateLimitHelper` | `cc.xfl12345.person.cv.controller.LoginController.init()` — 改用 `@ConfigProperty` 注入；去掉 JCache 清空逻辑和手动限流器创建，限流由 `@RateLimited(bucket = "login")` + YAML 配置处理 |
| `checkPassword()` — 恒定时间比较 | 原封不动保留 |
| `login()` 内的 `login(loginId, rememberMe)` — `SaLoginModel` 带 `isWriteHeader/isLastingCookie/timeout` | `StpUtil.login(loginId)` — 简化，不再自定义登录模型 |
| `login()` — 返回 `JsonApiResponseData` | 同名方法，返回 `ApiResponse<Object>`；`setApiResult()` → `withApiResult()` |
| `login()` — `StpUtil.isLogin()` 判断已登录 | 改为 `StpUtil.getLoginIdByToken(currentToken) == null` |
| `logout()` — 返回 `boolean` | 返回 `ApiResponse<Boolean>` |
| `kickout()` | 保留，`StpUtil.getLoginId().toString()` → `StpUtil.getLoginIdAsString()` |
| `smsServerWebSocketLogin()` — `StpUtil.updateLastActiveToNow()` | 移除该调用 |

---

### 42. `cc.xfl12345.person.cv.controller.RequestRateLimitationController`

→ **未移植**。`clearAllCache()` 管理员调试接口，用于清空 JCache 中的限流缓存桶。新项目限流后端改为 Bucket4j（无 JCache），验证码缓存改为 Quarkus Cache（Caffeine），没有统一的 JCache 管理入口。

---

### 43. `cc.xfl12345.person.cv.controller.UserDataController`

→ `cc.xfl12345.person.cv.controller.UserController`。所有 CRUD 端点保留，路径从 `@RequestMapping("db/user")` → `@Path(API_PATH_PREFIX + "/users")`（RESTful 风格，去掉 `db` 前缀，复数集合名，路径参数替代 query param，POST 替代 PUT 新增），去掉 `@DependsOn(ControllerConst.dependsOnBean)`。

---

### 44. `cc.xfl12345.person.cv.service.SMS`

| 旧组成部分 | 去向 |
|---|---|
| `extends TextWebSocketHandler` | `@ServerEndpoint("/sms/ws-connect")` — 从 Spring WebSocket 切换到 Jakarta WebSocket |
| `@PostConstruct init()` — 创建 EHCache offheap 50MB 验证码缓存 + 初始化限流器 | Quarkus Cache（Caffeine）验证码缓存（`@CacheName("sms-validation-code")`，`expire-after-write: 15M`），限流器不再需要 `CacheManager`。不再 `@PostConstruct` 也不手动调用 `init()`，改为 `@Inject public void applySmsConfig(XflSmsConfig)` 方法注入，由 CDI 在 Bean 初始化时自动调用，将 `validationCodeLength` 和短信模板提取为实例字段 |
| `@PreDestroy destroy()` — 关闭所有 WebSocket 会话 | **未移植**，Jakarta WebSocket 生命周期自动管理 |
| `justAddValidationCode2Cache()` | **未移植**，未被调用 |
| `afterConnectionEstablished()` — 从 `session.getAttributes().get("loginId")` 取 loginId | `onOpen()` — 从 `session.getRequestURI().getQuery()` 取 token，再 `StpUtil.getLoginIdByToken(token)` 解析 loginId |
| `handlePongMessage()` — 检测 session 是否已从 map 中移除，是则关闭 | **未移植**。这是旧项目针对 Spring WebSocket 的 session 残留问题的 workaround，Jakarta WebSocket 无此问题 |
| `afterConnectionClosed()` — `session.getAttributes().get("loginId")` | `onClose()` — `session.getUserProperties().get("loginId")` |
| `sendValidationCode(HttpServletRequest, PhoneNumberDTO)` | `sendValidationCode(PhoneNumberDTO)` — 不再需要传入 IP/token，身份由 `UserIdentityResolver` 自动从请求上下文解析；限流改为 `@RateLimited(bucket = "sms-validation-code")` 注解的 `consumeBucket()` 方法，catch `RateLimitException` 获取冷却时间并返回带 `coolDownRemainder` 的自定义 JSON |
| `sendValidationCode(String)` WebSocket 推送逻辑 | 保留，`webSocketSession.sendMessage(new TextMessage(...))` → `wsSession.getAsyncRemote().sendText(...)` |

---

### 45. `cc.xfl12345.person.cv.service.UserService`

| 旧方法 | 去向 |
|---|---|
| `getHrIdByPhoneNumber()` — `BeeFactoryHelper.getSuidRich().selectFirst(builder, condition)` | `cc.xfl12345.person.cv.service.UserService` 同名方法 — `entityQuery.queryable(MeetHr.class).where(m -> m.hrPhoneNumber().eq(phoneNumber)).select(m -> m.FETCHER.id()).firstOrNull()` |
| `getHrInfoByPhoneNumber()` — Bee `suid.select(builder)` | `entityQuery.queryable(MeetHr.class).where(...).toList()` |
| `getAllHrInfo()` / `getHrInfoCount()` / `getHrInfoById()` / `deleteHrInfoById()` / `updateHrInfoById()` / `addHrInfo()` | 全部保留，实现从 Bee `SuidRich` 改为 EasyQuery `EasyEntityQuery` |
| `getHrInfoAndUpdateVisitTime()` — 手动 `SessionFactory.getTransaction().begin()` + `commit/rollback` | 保留，去掉显式事务管理，改为 `entityQuery.updatable(meetHr).executeRows()`（Quarkus/Agroal 自动处理事务） |
| `justUpdateVisitTimeByPhoneNumber()` | **未移植**。仅被 `AllRequestInterceptor` 调用，而该拦截器已移除 |
| `justUpdateVisitTimeById()` | 保留（方法体用 EasyQuery 重写），调用方为 `AccessTimeFilter` |
| `justUpdateVisitTimeByCondition()` | 保留，作为 `justUpdateVisitTimeById()` 的内部实现 |

---

### 46. `cc.xfl12345.person.cv.utility.MyReflectUtils`

→ **未移植**。反射工具类（类型转换、字段名提取、包扫描），仅被测试类使用，生产代码无引用。

---

### 47. `cc.xfl12345.person.cv.pojo.CachedUrlResourceProvider`

→ `cc.xfl12345.person.cv.framework.tianaicaptcha.CachedUrlResourceProvider`。换包（`pojo` → `framework/tianaicaptcha`），实现不变。继承 tianai-captcha 的 `AbstractResourceProvider`，用 `ConcurrentHashMap` 缓存 URL → `InputStream` 映射。

---

### 48. `cc.xfl12345.person.cv.pojo.OpenCloneable`

→ `cc.xfl12345.person.cv.pojo.OpenCloneable`（原封不动保留）。将 `Object.clone()` 从 `protected` 提升为 `public` 的接口。

---

### 49. `cc.xfl12345.person.cv.pojo.SmsTask`

→ `cc.xfl12345.person.cv.pojo.SmsTask`（原封不动保留）。Lombok `@Data` POJO，四个字段：`createTime`、`phoneNumber`、`validationCode`、`smsContent`。

---

### 50. `cc.xfl12345.person.cv.pojo.WebSocketMessage`

→ `cc.xfl12345.person.cv.pojo.WebSocketMessage`（原封不动保留）。Lombok `@Data` POJO，两个字段：`messageType`（枚举 `Type`）和 `payload`（`Object`）。

---

### 51. `cc.xfl12345.person.cv.pojo.SimpleBucketConfig`

→ **已删除**。自定义 bucket4j 框架的令牌桶配置类（`refillToken`、`refillFrequency`、`bucketCapacity`），由 Quarkiverse Bucket4j 扩展的 YAML 配置（`quarkus.rate-limiter.buckets.<name>`）取代。

---

### 52. `cc.xfl12345.person.cv.pojo.SimpleBucketConfigUtils`

→ **已删除**。自定义 bucket4j 框架的工具类，用最大公约数算法将"每分钟 N 次"转换为等价的令牌桶参数。由 Quarkiverse Bucket4j 扩展取代。

---

### 53. `cc.xfl12345.person.cv.pojo.request.BaseRequestObject`

→ `cc.xfl12345.person.cv.pojo.request.ApiRequestBase`（重命名）。`GenericBaseRequestObject<Object>` → `ApiRequest<Object>`，语义不变。

---

### 54. `cc.xfl12345.person.cv.pojo.request.GenericBaseRequestObject`

→ `cc.xfl12345.person.cv.pojo.request.ApiRequest`（重命名）。泛型字段 `data` 改为 `payload`，字段 `operation` 保留。

---

### 55. `cc.xfl12345.person.cv.pojo.request.payload.PhoneNumberData`

→ `cc.xfl12345.person.cv.pojo.request.payload.PhoneNumberDTO`（重命名）。唯一字段 `phoneNumber` 不变。

---

### 56. `cc.xfl12345.person.cv.pojo.response.BaseResponseObject`

→ 合并进 `cc.xfl12345.person.cv.pojo.response.ApiResponse`。`success`/`message` 两个字段由 `ApiResponse` 的 `success`/`message` 取代；旧 `version` 字段已移除（`JsonApiConst.VERSION` 不再保留）。

---

### 57. `cc.xfl12345.person.cv.pojo.response.GenericJsonApiResponseData`

→ 合并进 `cc.xfl12345.person.cv.pojo.response.ApiResponse`。泛型 `data` 字段由 `ApiResponse` 的泛型 `payload` 取代；`setApiResult()` 由静态工厂方法 `of()` + 链式 `withApiResult()` 取代；`appendMessage()` 由 `withMessage()` 取代。

---

### 58. `cc.xfl12345.person.cv.sql.PackageLandmark`

→ `cc.xfl12345.person.cv.sql.PackageLandmark`（原封不动保留）。空类，仅用于定位 `cc/xfl12345/person/cv/sql/` 资源目录。

---

### 59. `cc.xfl12345.person.cv.utility.ClassPathResourceUtils`

→ `cc.xfl12345.person.cv.utility.ClassPathResourceUtils`（原封不动保留）。classpath 资源扫描工具类，支持 file/jar/nio FileSystem 三种协议，递归扫描并返回 `Map<path, URL>`。

---

### 60. `cc.xfl12345.person.cv.utility.MyStrIsOK`

→ `cc.xfl12345.person.cv.utility.MyStrIsOK`（原封不动保留）。字符串校验工具类，提供正则匹配、字符提取、文件名合法性检查等功能。

---

### 61. `cc.xfl12345.person.cv.utility.StringEscapeUtils`

→ `cc.xfl12345.person.cv.utility.StringEscapeUtils`（原封不动保留）。字符串转义工具类，提供 URL 括号转义和 SQL `LIKE` 通配符转义。

---

## 二、未移植内容汇总及原因

| 未移植的类/代码 | 未移植原因 |
|---|---|
| `Main.restart()` | Quarkus 不支持 Spring ApplicationContext 热重启，无等价机制 |
| `Main` 的 `@SpringBootApplication` 等注解 | Quarkus 有自己的启动入口，不需要手动 `main()` |
| `CommonConst` | 常量 `information_schema` 是 MySQL 特有概念 |
| `ControllerConst` | 常量 `sessionFactory` 是 Bee ORM 的 Spring Bean 名 |
| `DefaultSingleton` | 持有的 `FieldNotNullChecker` 也未移植 |
| `EnvConst` | 全部是 Spring Boot 配置键名，Quarkus 使用 MicroProfile Config |
| `DataSourceConfig` 的 HikariCP 手动创建 | 被 Quarkus `quarkus-agroal` 数据源自动配置取代 |
| `MyDatabaseInitializer.initMySQL()` 的建库逻辑 | SQLite 是文件级数据库，不需要 `CREATE DATABASE` |
| `MyDatabaseInitializer.executeSqlFile()` 的 MyBatis ScriptRunner | 改为原生 JDBC `Statement.executeUpdate()` |
| `MyDatabaseInitializer.getSql()` 的 MySQL PreparedStatement 解析 | SQLite 不需要 |
| `TomcatConfig` | Quarkus 用 Vert.x，不用 Tomcat。超时配置迁移到 `application.yml` |
| `WebResourceConfig` | 被 **Quarkus Quinoa 插件**取代，自动构建和挂载前端 |
| `WebResourceMapping` | 原封不动保留，虽不再被主动使用 |
| `WebSocketConfig` | `@ServerEndpoint` 注解驱动，不需要独立配置类 |
| `WebSocketInterceptor` 握手鉴权 | 合并进 `SMS.onOpen()`，从 query param 取 token |
| `EnvironmentOnCreatedInitializer` | Spring `EnvironmentPostProcessor` 特有机制 |
| `MyBeanFactoryPostProcessor` | Spring `BeanFactoryPostProcessor` 特有机制 |
| `AllRequestInterceptor`（每次请求更新访问时间） | `cc.xfl12345.person.cv.filter.AccessTimeFilter`，JAX-RS `ContainerRequestFilter`，`@Priority(Priorities.AUTHORIZATION + 200)`，使用虚拟线程异步更新 |
| `RateLimitInterceptor` | Captcha 端点用 `@RateLimited` 注解；login/sms-ws-login 用 `@RateLimited(bucket = "login")`；全局保护用 `GlobalRateLimitFilter`（`@RateLimited(bucket = "global")`）；SMS 限流用 `@RateLimited(bucket = "sms-validation-code")`；所有 `identityResolver` 在 YAML 配置 |
| `RequestRateLimitationController`（管理员清缓存） | JCache 已移除，验证码缓存改为 Quarkus Cache（Caffeine） |
| `AllSpringEventListener` | Spring 事件监听器，Quarkus 用 CDI 事件 |
| `ConsoleLogFilter` | Logback 过滤器，Quarkus 用 JBoss LogManager，自带合理默认值 |
| `FieldNotNullChecker` | 防御性编程工具，引用方随拦截器/配置类一起移除 |
| `MysqlJdbcUrlBean` | MySQL JDBC URL 解析器，数据库已切换为 SQLite |
| `SmsVerificationCodeRequestData` | 空子类，调用方直接使用父类 |
| `JsonApiResponseData` | 合并进 `ApiResponse` |
| `check2Captcha()` | 二次验证端点，新项目未使用 |
| `CaptchaController.checkCaptcha()` 的 `check2Captcha()` | 同上 |
| `ApplicationController.reboot()` | Quarkus 不支持运行时上下文重启 |
| `SMS.justAddValidationCode2Cache()` | 未被调用 |
| `SMS.@PreDestroy destroy()` | Jakarta WebSocket 生命周期自动管理 |
| `SMS.handlePongMessage()` | Spring WebSocket session 残留问题的 workaround，Jakarta 无此问题 |
| `UserService.justUpdateVisitTimeByPhoneNumber()` | 仅被已移除的 `AllRequestInterceptor` 调用，现由 `AccessTimeFilter` 调用 `justUpdateVisitTimeById(Long, LocalDateTime)` 替代 |
| `MyReflectUtils` | 仅被测试类使用 |
| `RequestAnalyser` + `IpAddressGetter` + `SimpleIpAddressGetter` | IP 解析逻辑内联到 `UserIdentityResolver.resolveIp()`，不再需要策略模式抽象 |
| `CachedUrlResourceProvider` | 换包到 `framework/tianaicaptcha`，实现不变 |
| `OpenCloneable` | 原封不动保留 |
| `SmsTask` | 原封不动保留 |
| `WebSocketMessage` | 原封不动保留 |
| `SimpleBucketConfig` | 已删除，自定义 bucket4j 配置类，由 YAML 配置取代 |
| `SimpleBucketConfigUtils` | 已删除，自定义 bucket4j 工具类，由 Quarkiverse Bucket4j 取代 |
| `BaseRequestObject` | 重命名为 `ApiRequestBase` |
| `GenericBaseRequestObject` | 重命名为 `ApiRequest`，字段 `data` → `payload` |
| `PhoneNumberData` | 重命名为 `PhoneNumberDTO` |
| `BaseResponseObject` | 合并进 `ApiResponse` |
| `GenericJsonApiResponseData` | 合并进 `ApiResponse` |
| `sql/PackageLandmark` | 原封不动保留 |
| `ClassPathResourceUtils` | 原封不动保留 |
| `MyStrIsOK` | 原封不动保留 |
| `StringEscapeUtils` | 原封不动保留 |
