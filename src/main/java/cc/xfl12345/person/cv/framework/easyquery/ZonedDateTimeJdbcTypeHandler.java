package cc.xfl12345.person.cv.framework.easyquery;

import com.easy.query.core.basic.jdbc.executor.internal.props.JdbcProperty;
import com.easy.query.core.basic.jdbc.executor.internal.merge.result.StreamResultSet;
import com.easy.query.core.basic.jdbc.types.EasyParameter;
import com.easy.query.core.basic.jdbc.types.handler.JdbcTypeHandler;

import java.sql.SQLException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

public class ZonedDateTimeJdbcTypeHandler implements JdbcTypeHandler {

    @Override
    public Object getValue(JdbcProperty jdbcProperty, StreamResultSet streamResultSet) throws SQLException {
        String text = streamResultSet.getString(jdbcProperty.getJdbcIndex());
        if (Objects.isNull(text)) {
            return null;
        }

        return ZonedDateTime.parse(text, DateTimeFormatter.ISO_ZONED_DATE_TIME);
    }

    @Override
    public void setParameter(EasyParameter parameter) throws SQLException {
        ZonedDateTime value = (ZonedDateTime) parameter.getValue();
        if (Objects.isNull(value)) {
            parameter.getPs().setNull(parameter.getIndex(), parameter.getColumnMetadata().getJdbcType().getVendorTypeNumber());
        } else {
            parameter.getPs().setString(parameter.getIndex(), value.format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
        }
    }
}
