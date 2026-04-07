package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaRequest;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Cookie;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class QuarkusSaRequest implements SaRequest {
    protected final ContainerRequestContext ctx;

    public QuarkusSaRequest(ContainerRequestContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public Object getSource() {
        return ctx;
    }

    @Override
    public String getParam(String name) {
        List<String> values = ctx.getUriInfo().getQueryParameters().get(name);
        return (values != null && !values.isEmpty()) ? values.getFirst() : null;
    }

    @Override
    public String getHeader(String name) {
        return ctx.getHeaderString(name);
    }

    @Override
    public String getCookieValue(String name) {
        Cookie c = ctx.getCookies().get(name);
        return c != null ? c.getValue() : null;
    }

    @Override
    public String getRequestPath() {
        return ctx.getUriInfo().getPath();
    }

    @Override
    public String getUrl() {
        return ctx.getUriInfo().getRequestUri().toString();
    }

    @Override
    public String getMethod() {
        return ctx.getMethod();
    }

    @Override
    public Object forward(String path) {
        return null;
    }

    @Override
    public Collection<String> getParamNames() {
        return ctx.getUriInfo().getQueryParameters().keySet();
    }

    @Override
    public Map<String, String> getParamMap() {
        Map<String, String> map = new HashMap<>();
        ctx.getUriInfo().getQueryParameters().forEach((k, v) -> {
            if (v != null && !v.isEmpty()) map.put(k, v.getFirst());
        });
        return map;
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
        return ctx.getUriInfo().getBaseUri().getHost();
    }
}
