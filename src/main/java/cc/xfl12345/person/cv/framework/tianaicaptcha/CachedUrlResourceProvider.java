package cc.xfl12345.person.cv.framework.tianaicaptcha;

import cloud.tianai.captcha.resource.AbstractResourceProvider;
import cloud.tianai.captcha.resource.common.model.dto.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CachedUrlResourceProvider extends AbstractResourceProvider {
    public static final String NAME = "CachedURL";

    protected Map<String, URL> urlMap = new ConcurrentHashMap<>();

    public Map<String, URL> getUrlMap() {
        return Collections.unmodifiableMap(urlMap);
    }

    public URL putURL(String key, URL value) {
        return urlMap.put(key, value);
    }

    public void putAllURL(Map<? extends String, ? extends URL> m) {
        urlMap.putAll(m);
    }

    @Override
    public InputStream doGetResourceInputStream(Resource resource) {
        URL url = urlMap.get(resource.getData());
        if (url != null) {
            try {
                return url.openStream();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        return null;
    }

    @Override
    public boolean supported(Resource resource) {
        return NAME.equals(resource.getType());
    }

    @Override
    public String getName() {
        return NAME;
    }
}
