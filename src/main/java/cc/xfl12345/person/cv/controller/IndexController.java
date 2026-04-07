package cc.xfl12345.person.cv.controller;

import cc.xfl12345.person.cv.appconst.AppConst;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HEAD;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

@ApplicationScoped
@Path("/")
public class IndexController {
    String uiRootPath;

    @PostConstruct
    public void init() {
        Config config = ConfigProvider.getConfig();
        // 获取配置值，如果配置不存在，可以设置一个默认值
        String path = config.getOptionalValue("quarkus.quinoa.ui-root-path", String.class)
                .orElse("/");
        this.uiRootPath = path.startsWith("/") ? path : "/" + path;
    }

    @GET
    public Response indexPage() {
        return Response.status(Response.Status.FOUND)
                .header(HttpHeaders.LOCATION, uiRootPath + "/index.html")
                .build();
    }

    @HEAD
    public Response headIndexPage() {
        return indexPage();
    }

    @GET
    @Path(AppConst.API_PATH_PREFIX)
    public Response indexPage2() {
        return indexPage();
    }

    @HEAD
    @Path(AppConst.API_PATH_PREFIX)
    public Response headIndexPage2() {
        return indexPage();
    }
}
