package cc.xfl12345.person.cv.framework.satoken;

import cn.dev33.satoken.context.model.SaResponse;
import io.vertx.core.http.HttpServerResponse;
import jakarta.ws.rs.core.HttpHeaders;

public class VertxSaResponse implements SaResponse {

    private final HttpServerResponse response;

    public VertxSaResponse(HttpServerResponse response) {
        this.response = response;
    }

    @Override
    public Object getSource() {
        return response;
    }

    @Override
    public SaResponse setStatus(int sc) {
        response.setStatusCode(sc);
        return this;
    }

    @Override
    public SaResponse setHeader(String name, String value) {
        response.headers().set(name, value);
        return this;
    }

    @Override
    public SaResponse addHeader(String name, String value) {
        response.headers().add(name, value);
        return this;
    }

    @Override
    public Object redirect(String url) {
        response.setStatusCode(302)
                .putHeader(HttpHeaders.LOCATION, url)
                .end();
        return null;
    }
}
