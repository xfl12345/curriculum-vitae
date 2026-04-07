package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaResponse;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;

public class QuarkusSaResponse implements SaResponse {
    private final ContainerRequestContext ctx;

    public QuarkusSaResponse(ContainerRequestContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public Object getSource() {
        return ctx;
    }

    @Override
    public SaResponse setStatus(int sc) {
        return this;
    }

    @Override
    public SaResponse setHeader(String name, String value) {
        ctx.getHeaders().putSingle(name, value);
        return this;
    }

    @Override
    public SaResponse addHeader(String name, String value) {
        ctx.getHeaders().add(name, value);
        return this;
    }

    @Override
    public Object redirect(String url) {
        Response response = Response.status(Response.Status.FOUND)
                .header(HttpHeaders.LOCATION, url)
                .build();
        ctx.abortWith(response);
        return null;
    }
}
