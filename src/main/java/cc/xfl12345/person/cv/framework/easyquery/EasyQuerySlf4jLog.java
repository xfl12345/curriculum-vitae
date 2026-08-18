package cc.xfl12345.person.cv.framework.easyquery;

import com.easy.query.core.logging.Log;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * EasyQuery 日志门面 → slf4j 桥接（对齐官方 spring-boot starter 的
 * {@code com.easy.query.sql.starter.logging.Slf4jImpl} 做法，见官方文档
 * config-option.html 默认配置项的 logClass 条目）。
 *
 * <p>为什么必须有：EasyQuery 的 {@code LogFactory} 不像 MyBatis 那样自动探测
 * slf4j——非 spring-boot 环境（Quarkus 自建 client 就是）静态块默认
 * {@code useNoLogging()}，全部日志（含 {@code optionConfigure} 里
 * {@code setPrintSql(true)} 的 SQL 打印）被 {@code NoLoggingImpl} 静默吞掉。
 * printSql 只决定「要不要打」，真正输出走 Log 门面，门面没接日志照样看不到。
 *
 * <p>桥到 slf4j 后由 Quarkus 统一管控（slf4j → JBoss LogManager）：
 * SQL 打印以 INFO 级、类别 {@code com.easy.query.core.util.EasyJdbcExecutorUtil}
 * 输出；生产要关 SQL 日志不必改代码，配
 * {@code quarkus.log.category."com.easy-query".level=WARN} 即可。
 *
 * <p>构造器签名坑：{@code LogFactory.setImplementation} 用
 * {@code getConstructor(String.class)} 反射查找，参数必须是 String
 * （logger 名），写成 Class 会找不到构造器直接抛 EasyQueryException。
 * native 下该反射需要元数据，本类已列入 EasyQueryConfig 的
 * {@code @RegisterForReflection} 名单。
 */
public class EasyQuerySlf4jLog implements Log {

    protected Logger log;

    public EasyQuerySlf4jLog(String loggerClassName) {
        this.log = LoggerFactory.getLogger(loggerClassName);
    }

    @Override
    public boolean isDebugEnabled() {
        return log.isDebugEnabled();
    }

    @Override
    public boolean isTraceEnabled() {
        return log.isTraceEnabled();
    }

    @Override
    public boolean isInfoEnabled() {
        return log.isInfoEnabled();
    }

    @Override
    public void error(String s, Throwable e) {
        log.error(s, e);
    }

    @Override
    public void error(String s) {
        log.error(s);
    }

    @Override
    public void debug(String s) {
        log.debug(s);
    }

    @Override
    public void trace(String s) {
        log.trace(s);
    }

    @Override
    public void info(String s) {
        log.info(s);
    }

    @Override
    public void warn(String s) {
        log.warn(s);
    }
}
