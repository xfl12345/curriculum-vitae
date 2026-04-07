package cc.xfl12345.person.cv.controller;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import cc.xfl12345.person.cv.service.UserService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@ApplicationScoped
@Path(AppConst.API_PATH_PREFIX + "/users")
@Produces(MediaType.APPLICATION_JSON)
public class UserController {

    @Inject
    UserService userService;

    @GET
    public ApiResponse<List<MeetHr>> getUsers(@QueryParam("phoneNumber") String phoneNumber) {
        if (phoneNumber != null) {
            return ApiResponse.<List<MeetHr>>of(JsonApiResult.SUCCEED)
                .withPayload(userService.getHrInfoByPhoneNumber(phoneNumber));
        }
        return ApiResponse.<List<MeetHr>>of(JsonApiResult.SUCCEED)
            .withPayload(userService.getAllHrInfo());
    }

    @GET
    @Path("/id")
    public ApiResponse<Long> getUserIdByPhoneNumber(@QueryParam("phoneNumber") String phoneNumber) {
        return ApiResponse.<Long>of(JsonApiResult.SUCCEED)
            .withPayload(userService.getHrIdByPhoneNumber(phoneNumber));
    }

    @GET
    @Path("/count")
    public ApiResponse<Long> getUserCount() {
        return ApiResponse.<Long>of(JsonApiResult.SUCCEED)
            .withPayload(userService.getHrInfoCount());
    }

    @GET
    @Path("/{id}")
    public ApiResponse<MeetHr> getUserById(@PathParam("id") Long id) {
        return ApiResponse.<MeetHr>of(JsonApiResult.SUCCEED)
            .withPayload(userService.getHrInfoById(id));
    }

    @DELETE
    @Path("/{id}")
    public ApiResponse<Boolean> deleteUserById(@PathParam("id") Long id) {
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED)
            .withPayload(userService.deleteHrInfoById(id));
    }

    @PUT
    @Path("/{id}")
    public ApiResponse<Boolean> updateUserById(@PathParam("id") Long id, MeetHr meetHr) {
        meetHr.setId(id);
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED)
            .withPayload(userService.updateHrInfoById(meetHr));
    }

    @POST
    public ApiResponse<Boolean> addUser(MeetHr meetHr) {
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED)
            .withPayload(userService.addHrInfo(meetHr));
    }
}
