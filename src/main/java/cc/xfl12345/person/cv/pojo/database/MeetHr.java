package cc.xfl12345.person.cv.pojo.database;

import com.easy.query.core.annotation.Column;
import com.easy.query.core.annotation.EntityProxy;
import com.easy.query.core.annotation.Table;
import com.easy.query.core.proxy.ProxyEntityAvailable;
import cc.xfl12345.person.cv.pojo.database.proxy.MeetHrProxy;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.io.Serial;
import java.io.Serializable;
import java.time.ZonedDateTime;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EntityProxy
@Table("meet_hr")
public class MeetHr implements Cloneable, Serializable, ProxyEntityAvailable<MeetHr, MeetHrProxy> {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    @Column(primaryKey = true, generatedKey = true)
    @Schema(type = SchemaType.STRING, description = "主键 ID")
    private Long id;

    private ZonedDateTime createTime;

    private ZonedDateTime firstVisitTime;

    private ZonedDateTime lastVisitTime;

    private String hrName;

    private String hrPhoneNumber;

    private String hrJob;

    private String myJob;

    private String note;

    @Serial
    private static final long serialVersionUID = 1L;

    @Override
    public MeetHr clone() throws CloneNotSupportedException {
        return (MeetHr) super.clone();
    }
}
