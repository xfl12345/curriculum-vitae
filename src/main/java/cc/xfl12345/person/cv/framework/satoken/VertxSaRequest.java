package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaRequest;
import io.vertx.core.http.HttpServerRequest;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class VertxSaRequest implements SaRequest {

    protected final HttpServerRequest request;

    public VertxSaRequest(HttpServerRequest request) {
        this.request = request;
    }

    @Override
    public Object getSource() {
        return request;
    }

    @Override
    public String getParam(String name) {
        return queryParams().get(name);
    }

    @Override
    public String getHeader(String name) {
        return request.getHeader(name);
    }

    @Override
    public String getCookieValue(String name) {
        io.vertx.core.http.Cookie cookie = request.getCookie(name);
        return cookie != null ? cookie.getValue() : null;
    }

    @Override
    public String getRequestPath() {
        return request.path();
    }

    @Override
    public String getUrl() {
        String scheme = request.isSSL() ? "https" : "http";
        return scheme + "://" + request.authority() + request.uri();
    }

    @Override
    public String getMethod() {
        return request.method().name();
    }

    @Override
    public Object forward(String path) {
        return null;
    }

    @Override
    public Collection<String> getParamNames() {
        return queryParams().keySet();
    }

    @Override
    public Map<String, String> getParamMap() {
        return queryParams();
    }

    @Override
    public String getCookieFirstValue(String name) {
        String raw = getCookieValue(name);
        return raw != null ? raw.split(";")[0] : null;
    }

    @Override
    public String getCookieLastValue(String name) {
        String raw = getCookieValue(name);
        if (raw == null) return null;
        String[] p = raw.split(";");
        return p[p.length - 1];
    }

    @Override
    public String getHost() {
        return request.authority().host();
    }

    // ==================== 内部工具 ====================

    private volatile Map<String, String> cachedQueryParams;

    private Map<String, String> queryParams() {
        if (cachedQueryParams == null) {
            cachedQueryParams = parseQuery(request.query());
        }
        return cachedQueryParams;
    }

    private static Map<String, String> parseQuery(String query) {
        if (query == null || query.isEmpty()) return Map.of();
        Map<String, String> map = new LinkedHashMap<>();
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                map.put(
                    decode(pair.substring(0, eq)),
                    decode(pair.substring(eq + 1))
                );
            } else if (!pair.isEmpty()) {
                map.put(decode(pair), "");
            }
        }
        return map;
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }
}
