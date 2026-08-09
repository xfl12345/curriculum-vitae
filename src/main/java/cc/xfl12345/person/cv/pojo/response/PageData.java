package cc.xfl12345.person.cv.pojo.response;

import java.util.List;

import lombok.Builder;

/**
 * 分页数据载体。
 *
 * @param total 总记录数
 * @param data  当前页数据列表
 */
@Builder
public record PageData<T>(long total, List<T> data) {}
