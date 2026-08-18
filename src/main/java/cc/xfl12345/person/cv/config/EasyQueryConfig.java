package cc.xfl12345.person.cv.config;

import cc.xfl12345.person.cv.framework.easyquery.*;
import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.pojo.database.proxy.MeetHrProxy;
import com.easy.query.api.proxy.client.DefaultEasyEntityQuery;
import com.easy.query.api.proxy.client.EasyEntityQuery;
import com.easy.query.core.api.client.DefaultEasyQueryClient;
import com.easy.query.core.api.client.EasyQueryClient;
import com.easy.query.core.api.def.DefaultSQLClientApiFactory;
import com.easy.query.core.api.dynamic.executor.query.DefaultWhereConditionProvider;
import com.easy.query.core.api.dynamic.executor.query.DefaultWhereObjectQueryExecutor;
import com.easy.query.core.api.dynamic.executor.sort.DefaultObjectSortQueryExecutor;
import com.easy.query.core.basic.api.cte.DefaultCteTableNamedProvider;
import com.easy.query.core.basic.api.database.DefaultDatabaseCodeFirst;
import com.easy.query.core.basic.extension.conversion.DefaultValueAutoConverterProvider;
import com.easy.query.core.basic.extension.cte.DefaultCTERecursiveProvider;
import com.easy.query.core.basic.extension.formater.DefaultSQLParameterPrintFormat;
import com.easy.query.core.basic.extension.generated.UnSupportSaveEntitySetPrimaryKeyGenerator;
import com.easy.query.core.basic.extension.listener.EmptyJdbcExecutorListener;
import com.easy.query.core.basic.extension.print.DefaultJdbcSQLPrinter;
import com.easy.query.core.basic.extension.schema.DefaultRuntimeSchemaProvider;
import com.easy.query.core.basic.extension.track.DefaultTrackManager;
import com.easy.query.core.basic.entity.PropertyFirstEntityMappingRule;
import com.easy.query.core.basic.jdbc.conn.impl.DefaultConnectionManager;
import com.easy.query.core.basic.jdbc.conn.impl.DefaultEasyConnectionFactory;
import com.easy.query.core.basic.jdbc.conn.impl.DefaultEasyDataSourceConnectionFactory;
import com.easy.query.core.basic.jdbc.executor.DefaultEntityExpressionExecutor;
import com.easy.query.core.basic.jdbc.executor.DefaultEntityExpressionPrepareExecutor;
import com.easy.query.core.basic.jdbc.executor.ShardingEntityExpressionExecutor;
import com.easy.query.core.basic.jdbc.executor.internal.enumerable.DefaultStreamIterableFactory;
import com.easy.query.core.basic.jdbc.types.EasyJdbcTypeHandlerManager;
import com.easy.query.core.basic.jdbc.types.JdbcTypeHandlerManager;
import com.easy.query.core.basic.pagination.DefaultEasyPageResultProvider;
import com.easy.query.core.basic.thread.DefaultEasyShardingExecutorService;
import com.easy.query.core.common.DefaultMapColumnNameChecker;
import com.easy.query.core.bootstrapper.EasyQueryBootstrapper;
import com.easy.query.core.bootstrapper.EasyQueryBuilderConfiguration;
import com.easy.query.core.common.bean.DefaultFastBean;
import com.easy.query.core.common.bean.ReflectBean;
import com.easy.query.core.configuration.bean.entity.EntityPropertyDescriptorMatcher;
import com.easy.query.core.configuration.column2mapkey.DefaultColumn2MapKeyConversion;
import com.easy.query.core.configuration.DefaultEasyInitConfiguration;
import com.easy.query.core.configuration.EasyQueryOption;
import com.easy.query.core.configuration.QueryConfiguration;
import com.easy.query.core.configuration.dialect.DefaultSQLKeyword;
import com.easy.query.core.configuration.nameconversion.NameConversion;
import com.easy.query.core.configuration.nameconversion.impl.DefaultMapKeyNameConversion;
import com.easy.query.core.configuration.nameconversion.impl.UnderlinedNameConversion;
import com.easy.query.core.context.DefaultEasyQueryRuntimeContext;
import com.easy.query.core.datasource.DefaultDataSourceManager;
import com.easy.query.core.datasource.DefaultDataSourceUnitFactory;
import com.easy.query.core.datasource.replica.DefaultReplicaDataSourceManager;
import com.easy.query.core.enums.SQLExecuteStrategyEnum;
import com.easy.query.core.exception.DefaultAssertExceptionFactory;
import com.easy.query.core.expression.builder.core.AnyValueFilterFactory;
import com.easy.query.core.expression.executor.parser.DefaultEasyPrepareParser;
import com.easy.query.core.expression.executor.query.DefaultExecutionContextFactory;
import com.easy.query.core.expression.include.EasyIncludeProcessorFactory;
import com.easy.query.core.expression.many2group.DefaultSubQueryExtraPredicateProvider;
import com.easy.query.core.expression.parser.factory.DefaultSQLExpressionInvokeFactory;
import com.easy.query.core.expression.predicate.DefaultSmartPredicateAnonymousExpressionBuilderProvider;
import com.easy.query.core.expression.segment.factory.DefaultSQLSegmentFactory;
import com.easy.query.core.expression.sql.builder.factory.DefaultEasyExpressionBuilderFactory;
import com.easy.query.core.expression.sql.builder.internal.DefaultContextBehaviorFactory;
import com.easy.query.core.expression.sql.expression.factory.DefaultEasyExpressionFactory;
import com.easy.query.core.expression.sql.include.DefaultIncludeParserEngine;
import com.easy.query.core.expression.sql.include.DefaultIncludeProvider;
import com.easy.query.core.expression.sql.include.DefaultRelationNullValueValidator;
import com.easy.query.core.expression.sql.include.relation.DefaultRelationValueColumnMetadataFactory;
import com.easy.query.core.expression.sql.include.relation.DefaultRelationValueFactory;
import com.easy.query.core.extension.casewhen.DefaultSQLCaseWhenBuilderFactory;
import com.easy.query.core.logging.LogFactory;
import com.easy.query.core.func.SQLFuncImpl;
import com.easy.query.core.job.DefaultEasyTimeJobManager;
import com.easy.query.core.metadata.EntityMetadata;
import com.easy.query.core.metadata.DefaultEntityMetadataManager;
import com.easy.query.core.migration.DefaultDatabaseMigrationProvider;
import com.easy.query.core.migration.DefaultMigrationEntityParser;
import com.easy.query.core.migration.DefaultMigrationsSQLGenerator;
import com.easy.query.core.sharding.DefaultEasyQueryDataSource;
import com.easy.query.core.sharding.comparer.JavaLanguageShardingComparer;
import com.easy.query.core.sharding.manager.DefaultShardingQueryCountManager;
import com.easy.query.core.sharding.rewrite.DefaultRewriteContextFactory;
import com.easy.query.core.sharding.router.DefaultRouteContextFactory;
import com.easy.query.core.sharding.router.datasource.ShardingDataSourceRouter;
import com.easy.query.core.sharding.router.datasource.engine.DefaultDataSourceRouteEngine;
import com.easy.query.core.sharding.router.descriptor.DefaultRouteDescriptorFactor;
import com.easy.query.core.sharding.router.manager.impl.DefaultDataSourceRouteManager;
import com.easy.query.core.sharding.router.manager.impl.DefaultTableRouteManager;
import com.easy.query.core.sharding.router.table.ShardingTableRouter;
import com.easy.query.core.sharding.router.table.engine.DefaultTableRouteEngine;
import com.easy.query.core.sql.DefaultJdbcSQLExecutor;
import com.easy.query.core.trigger.DefaultEntityExpressionTrigger;
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
        // ── EasyQuery core（com.easy.query.core.* + .api.*）──
        AnyValueFilterFactory.class,
        DefaultAssertExceptionFactory.class,
        DefaultColumn2MapKeyConversion.class,
        DefaultConnectionManager.class,
        DefaultContextBehaviorFactory.class,
        DefaultCTERecursiveProvider.class,
        DefaultCteTableNamedProvider.class,
        DefaultDatabaseCodeFirst.class,
        DefaultDatabaseMigrationProvider.class,
        DefaultDataSourceManager.class,
        DefaultDataSourceRouteEngine.class,
        DefaultDataSourceRouteManager.class,
        DefaultDataSourceUnitFactory.class,
        DefaultEasyConnectionFactory.class,
        DefaultEasyDataSourceConnectionFactory.class,
        DefaultEasyEntityQuery.class,
        DefaultEasyExpressionBuilderFactory.class,
        DefaultEasyExpressionFactory.class,
        DefaultEasyInitConfiguration.class,
        DefaultEasyPageResultProvider.class,
        DefaultEasyPrepareParser.class,
        DefaultEasyQueryClient.class,
        DefaultEasyQueryDataSource.class,
        DefaultEasyQueryRuntimeContext.class,
        DefaultEasyShardingExecutorService.class,
        DefaultEasyTimeJobManager.class,
        DefaultEntityExpressionExecutor.class,
        DefaultEntityExpressionPrepareExecutor.class,
        DefaultEntityExpressionTrigger.class,
        DefaultEntityMetadataManager.class,
        DefaultExecutionContextFactory.class,
        DefaultFastBean.class,
        DefaultIncludeParserEngine.class,
        DefaultIncludeProvider.class,
        DefaultJdbcSQLExecutor.class,
        DefaultJdbcSQLPrinter.class,
        DefaultMapColumnNameChecker.class,
        DefaultMapKeyNameConversion.class,
        DefaultMigrationEntityParser.class,
        DefaultMigrationsSQLGenerator.class,
        DefaultObjectSortQueryExecutor.class,
        DefaultRelationNullValueValidator.class,
        DefaultRelationValueColumnMetadataFactory.class,
        DefaultRelationValueFactory.class,
        DefaultReplicaDataSourceManager.class,
        DefaultRewriteContextFactory.class,
        DefaultRouteContextFactory.class,
        DefaultRouteDescriptorFactor.class,
        DefaultRuntimeSchemaProvider.class,
        DefaultShardingQueryCountManager.class,
        DefaultSmartPredicateAnonymousExpressionBuilderProvider.class,
        DefaultSQLCaseWhenBuilderFactory.class,
        DefaultSQLClientApiFactory.class,
        DefaultSQLExpressionInvokeFactory.class,
        DefaultSQLKeyword.class,
        DefaultSQLParameterPrintFormat.class,
        DefaultSQLSegmentFactory.class,
        DefaultStreamIterableFactory.class,
        DefaultSubQueryExtraPredicateProvider.class,
        DefaultTableRouteEngine.class,
        DefaultTableRouteManager.class,
        DefaultTrackManager.class,
        DefaultValueAutoConverterProvider.class,
        DefaultWhereConditionProvider.class,
        DefaultWhereObjectQueryExecutor.class,
        EasyIncludeProcessorFactory.class,
        EasyJdbcTypeHandlerManager.class,
        EasyQueryBuilderConfiguration.class,
        EasyQueryBootstrapper.class,
        EasyQueryOption.class,
        EmptyJdbcExecutorListener.class,
        EntityMetadata.class,
        EntityPropertyDescriptorMatcher.class,
        JavaLanguageShardingComparer.class,
        PropertyFirstEntityMappingRule.class,
        ShardingDataSourceRouter.class,
        ShardingEntityExpressionExecutor.class,
        ShardingTableRouter.class,
        SQLFuncImpl.class,
        UnderlinedNameConversion.class,
        UnSupportSaveEntitySetPrimaryKeyGenerator.class,
        // ── sqlite 方言（com.easy.query.sqlite.*）──
        SQLiteDatabaseConfiguration.class,
        // 自定义 logger class
        EasyQuerySlf4jLog.class,
        // 所有 EasyQuery 实体（APT 生成的 Proxy 类在同包下，clean build 后自动出现）
        MeetHr.class,
        MeetHrProxy.class,
})
@ApplicationScoped
public class EasyQueryConfig {

    static {
        EasyBeanUtil.FAST_BEAN_FUNCTION = ReflectBean::new;
        LogFactory.useCustomLogging(EasyQuerySlf4jLog.class);
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
