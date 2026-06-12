package cc.xfl12345.person.cv.pojo.response;

import java.util.List;

public record PageData<T>(long total, List<T> data) {}
