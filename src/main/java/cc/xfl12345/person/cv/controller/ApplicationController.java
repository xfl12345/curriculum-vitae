package cc.xfl12345.person.cv.controller;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import io.quarkus.runtime.Quarkus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@ApplicationScoped
@Path(AppConst.API_PATH_PREFIX + "/app")
@Produces(MediaType.APPLICATION_JSON)
public class ApplicationController {

    @GET
    @Path("/shutdown")
    public ApiResponse<Boolean> shutdown(@QueryParam("confirm") boolean confirm) {
        var result = ApiResponse.<Boolean>of(JsonApiResult.FAILED).withPayload(false);
        if (confirm) {
            Thread thread = new Thread(() -> {
                try { Thread.sleep(3000); } catch (InterruptedException e) { /* ignore */ }
                Quarkus.asyncExit(0);
            });
            thread.setName("web-api-app-shutdown");
            thread.setDaemon(false);
            thread.start();
            result.withApiResult(JsonApiResult.SUCCEED).withPayload(true);
        }
        return result;
    }
}
