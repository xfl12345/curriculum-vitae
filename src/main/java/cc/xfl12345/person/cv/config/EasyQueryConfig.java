package cc.xfl12345.person.cv.config;

import cc.xfl12345.person.cv.framework.easyquery.ZonedDateTimeJdbcTypeHandler;
import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.pojo.database.proxy.MeetHrProxy;
import com.easy.query.api.proxy.client.DefaultEasyEntityQuery;
import com.easy.query.api.proxy.client.EasyEntityQuery;
import com.easy.query.core.api.client.DefaultEasyQueryClient;
import com.easy.query.core.api.client.EasyQueryClient;
import com.easy.query.core.basic.jdbc.types.JdbcTypeHandlerManager;
import com.easy.query.core.bootstrapper.EasyQueryBuilderConfiguration;
import com.easy.query.core.bootstrapper.EasyQueryBootstrapper;
import com.easy.query.core.common.bean.DefaultFastBean;
import com.easy.query.core.common.bean.ReflectBean;
import com.easy.query.core.configuration.EasyQueryOption;
import com.easy.query.core.configuration.nameconversion.NameConversion;
import com.easy.query.core.configuration.nameconversion.impl.UnderlinedNameConversion;
import com.easy.query.core.metadata.EntityMetadata;
import com.easy.query.core.util.EasyBeanUtil;
import com.easy.query.sqlite.config.SQLiteDatabaseConfiguration;
import io.quarkus.runtime.Startup;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import jakarta.interceptor.Interceptor;

import javax.sql.DataSource;
import java.time.ZonedDateTime;

@RegisterForReflection(targets = {
        // EasyQuery core
        EasyQueryBootstrapper.class,
        EasyQueryBuilderConfiguration.class,
        EasyQueryOption.class,
        UnderlinedNameConversion.class,
        DefaultFastBean.class,
        EntityMetadata.class,
        DefaultEasyQueryClient.class,
        DefaultEasyEntityQuery.class,
        SQLiteDatabaseConfiguration.class,

        // Project entities
        MeetHr.class,
        MeetHrProxy.class,
})
@ApplicationScoped
public class EasyQueryConfig {

    @Startup(Interceptor.Priority.PLATFORM_BEFORE)
    void onStart() {
        EasyBeanUtil.FAST_BEAN_FUNCTION = ReflectBean::new;
    }

    @Produces
    @Singleton
    public EasyQueryClient easyQueryClient(DataSource dataSource) {
        EasyQueryClient client = EasyQueryBootstrapper.defaultBuilderConfiguration()
                .setDefaultDataSource(dataSource)
                .useDatabaseConfigure(new SQLiteDatabaseConfiguration())
                .replaceService(NameConversion.class, UnderlinedNameConversion.class)
                .optionConfigure(op -> {
                    op.setDeleteThrowError(false);
                    op.setPrintSql(true);
                })
                .build();

        JdbcTypeHandlerManager typeHandlerManager = client.getRuntimeContext().getJdbcTypeHandlerManager();
        typeHandlerManager.appendHandler(ZonedDateTime.class, new ZonedDateTimeJdbcTypeHandler(), true);

        return client;
    }

    @Produces
    @Singleton
    public EasyEntityQuery easyEntityQuery(EasyQueryClient easyQueryClient) {
        return new DefaultEasyEntityQuery(easyQueryClient);
    }
}
