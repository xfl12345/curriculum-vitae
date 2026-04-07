package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaStorage;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class QuarkusSaStorage implements SaStorage {
    private final Map<String, Object> map = new ConcurrentHashMap<>();

    @Override
    public Object getSource() {
        return this;
    }

    @Override
    public Object get(String key) {
        return map.get(key);
    }

    @Override
    public SaStorage set(String key, Object value) {
        map.put(key, value);
        return this;
    }

    @Override
    public SaStorage delete(String key) {
        map.remove(key);
        return this;
    }
}
