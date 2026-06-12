package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaResponse;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * JAX-RS 适配 Sa-Token 的响应对象。
 * <p>
 * 关键设计：JAX-RS ContainerRequestFilter 无法直接写入响应头，
 * 所以先缓冲所有 header（含 Set-Cookie），在 response filter 阶段刷到
 * ContainerResponseContext。
 */
public class JakartaSaResponse implements SaResponse {

    private final ContainerRequestContext requestContext;
    private final LinkedHashMap<String, List<String>> bufferedHeaders = new LinkedHashMap<>();

    public JakartaSaResponse(ContainerRequestContext ctx) {
        this.requestContext = ctx;
    }

    @Override
    public Object getSource() {
        return null;
    }

    @Override
    public SaResponse setStatus(int sc) {
        return this;
    }

    @Override
    public SaResponse setHeader(String name, String value) {
        List<String> values = new ArrayList<>();
        values.add(value);
        bufferedHeaders.put(name, values);
        return this;
    }

    @Override
    public SaResponse addHeader(String name, String value) {
        bufferedHeaders.computeIfAbsent(name, k -> new ArrayList<>()).add(value);
        return this;
    }

    /**
     * 将缓冲的 header 刷到真正的 JAX-RS 响应。
     * 由 SaTokenContextFilter 在 response filter 阶段调用。
     */
    public void flushHeaders(ContainerResponseContext responseContext) {
        MultivaluedMap<String, Object> headers = responseContext.getHeaders();
        for (Map.Entry<String, List<String>> entry : bufferedHeaders.entrySet()) {
            for (String value : entry.getValue()) {
                headers.add(entry.getKey(), value);
            }
        }
        bufferedHeaders.clear();
    }

    @Override
    public Object redirect(String url) {
        Response.ResponseBuilder builder = Response.status(Response.Status.FOUND)
                .header(HttpHeaders.LOCATION, url);
        for (Map.Entry<String, List<String>> entry : bufferedHeaders.entrySet()) {
            for (String value : entry.getValue()) {
                builder.header(entry.getKey(), value);
            }
        }
        bufferedHeaders.clear();
        requestContext.abortWith(builder.build());
        return null;
    }
}
