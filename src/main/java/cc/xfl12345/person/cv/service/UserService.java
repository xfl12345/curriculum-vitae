package cc.xfl12345.person.cv.service;

import cc.xfl12345.person.cv.pojo.database.MeetHr;
import com.easy.query.api.proxy.client.EasyEntityQuery;
import com.easy.query.core.api.pagination.EasyPageResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@ApplicationScoped
public class UserService {

    @Inject
    EasyEntityQuery entityQuery;

    public Long getHrIdByPhoneNumber(String phoneNumber) {
        MeetHr meetHr = entityQuery.queryable(MeetHr.class)
            .where(m -> m.hrPhoneNumber().eq(phoneNumber))
            .select(m -> m.FETCHER.id())
            .firstOrNull();
        return Optional.ofNullable(meetHr).map(MeetHr::getId).orElse(null);
    }

    public List<MeetHr> getHrInfoByPhoneNumber(String phoneNumber) {
        return entityQuery.queryable(MeetHr.class)
            .where(m -> m.hrPhoneNumber().eq(phoneNumber))
            .toList();
    }

    public List<MeetHr> getAllHrInfo() {
        return entityQuery.queryable(MeetHr.class).toList();
    }

    public EasyPageResult<MeetHr> getHrInfoPage(long pageIndex, long pageSize) {
        return entityQuery.queryable(MeetHr.class)
            .orderBy(m -> m.createTime().desc())
            .toPageResult(pageIndex, pageSize);
    }

    public long getHrInfoCount() {
        return entityQuery.queryable(MeetHr.class).count();
    }

    public MeetHr getHrInfoById(Long id) {
        return entityQuery.queryable(MeetHr.class)
            .where(m -> m.id().eq(id))
            .firstOrNull();
    }

    public boolean deleteHrInfoById(Long id) {
        long rows = entityQuery.deletable(MeetHr.class)
            .where(m -> m.id().eq(id))
            .executeRows();
        return rows == 1;
    }

    public boolean updateHrInfoById(MeetHr meetHr) {
        long rows = entityQuery.updatable(meetHr).executeRows();
        return rows == 1;
    }

    public boolean addHrInfo(MeetHr meetHr) {
        long rows = entityQuery.insertable(meetHr).executeRows();
        return rows == 1;
    }

    public MeetHr getHrInfoAndUpdateVisitTime(String phoneNumber, ZonedDateTime visitTime) {
        MeetHr meetHr = entityQuery.queryable(MeetHr.class)
            .where(m -> m.hrPhoneNumber().eq(phoneNumber))
            .firstOrNull();
        if (Objects.nonNull(meetHr)) {
            if (Objects.isNull(meetHr.getFirstVisitTime())) {
                meetHr.setFirstVisitTime(visitTime);
            }
            meetHr.setLastVisitTime(visitTime);
            entityQuery.updatable(meetHr).executeRows();
        }
        return meetHr;
    }

    public boolean justUpdateVisitTimeById(Long id, ZonedDateTime visitTime) {
        MeetHr meetHr = entityQuery.queryable(MeetHr.class)
            .where(m -> m.id().eq(id))
            .firstOrNull();
        if (Objects.nonNull(meetHr)) {
            if (Objects.isNull(meetHr.getFirstVisitTime())) {
                meetHr.setFirstVisitTime(visitTime);
            }
            meetHr.setLastVisitTime(visitTime);
            entityQuery.updatable(meetHr).executeRows();
            return true;
        }
        return false;
    }
}
