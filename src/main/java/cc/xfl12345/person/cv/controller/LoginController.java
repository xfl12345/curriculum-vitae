package cc.xfl12345.person.cv.controller;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.appconst.JsonApiConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import cc.xfl12345.person.cv.service.SMS;
import cc.xfl12345.person.cv.service.UserService;
import cn.dev33.satoken.stp.StpUtil;
import io.quarkiverse.bucket4j.runtime.RateLimited;
import jakarta.annotation.Nullable;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import io.quarkus.logging.Log;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Random;

@ApplicationScoped
@Path(AppConst.API_PATH_PREFIX)
@Produces(MediaType.APPLICATION_JSON)
public class LoginController {

    @Inject UserService userService;
    @Inject SMS sms;

    @ConfigProperty(name = "app.webui.admin.phone-number")
    String adminPhoneNumber;
    @ConfigProperty(name = "app.webui.admin.password")
    String adminPassword;
    @ConfigProperty(name = "app.sms.xfl12345.access-key-secret")
    String smsWebSocketAccessKeySecret;

    protected int verificationCodeLimitLength = 6;

    @PostConstruct
    public void init() {
        Random random = new Random();
        verificationCodeLimitLength = (adminPassword.length() * (int) (Math.ceil(random.nextDouble(2, 5))));
    }

    public boolean checkPassword(String password, String inputText) {
        boolean correct = true;
        byte[] passwordInByte = password.getBytes(StandardCharsets.UTF_8);
        byte[] inputTextInByte = inputText.getBytes(StandardCharsets.UTF_8);
        if (passwordInByte.length > inputTextInByte.length) {
            byte[] tmp = new byte[passwordInByte.length];
            System.arraycopy(inputTextInByte, 0, tmp, 0, inputTextInByte.length);
            inputTextInByte = tmp;
        } else {
            byte[] tmp = new byte[inputTextInByte.length];
            System.arraycopy(passwordInByte, 0, tmp, 0, passwordInByte.length);
            passwordInByte = tmp;
        }
        for (int i = 0; i < inputTextInByte.length; i++) {
            // 为了抵御密码长度嗅探攻击，故不退出循环
            //noinspection IfStatementMissingBreakInLoop
            if ((inputTextInByte[i] ^ passwordInByte[i]) != 0) {
                correct = false;
            }
        }
        return correct;
    }

    @GET
    @Path("/verification-code-limit-length")
    public ApiResponse<Integer> getVerificationCodeLimitLength() {
        return ApiResponse.<Integer>of(JsonApiResult.SUCCEED).withPayload(verificationCodeLimitLength);
    }

    @POST
    @Path("/login")
    @RateLimited(bucket = "login")
    public ApiResponse<Object> login(
        @QueryParam("phoneNumber") String phoneNumber,
        @QueryParam("verificationCode") String verificationCode,
        @Nullable @QueryParam("rememberMe") Boolean rememberMe) {

        ZonedDateTime date = ZonedDateTime.now();
        String currentToken = StpUtil.getTokenValue();

        // 分支一：当前 token 已登录的情况
        String currentLoginId = (String) StpUtil.getLoginIdByToken(currentToken);
        if (currentLoginId != null) {
            // 已登录管理员，直接返回成功
            if (AppConst.XFL_WEBUI_ADMIN_LOGIN_ID.equals(currentLoginId)) {
                return ApiResponse.of(JsonApiResult.SUCCEED);
            }

            // 已登录 HR 账号，检查请求的账号是否与当前登录账号一致
            MeetHr meetHr = userService.getHrInfoAndUpdateVisitTime(phoneNumber, date);
            if (meetHr == null) {
                // HR 账号不存在或已失效，强制登出
                StpUtil.logout();
                return ApiResponse.of(JsonApiResult.FAILED_FORBIDDEN_ACCOUNT);
            }

            String targetLoginId = meetHr.getId().toString();
            if (targetLoginId.equals(currentLoginId)) {
                // 请求的账号就是当前登录的账号，返回成功
                return ApiResponse.of(JsonApiResult.SUCCEED);
            } else {
                // 请求的账号与当前登录账号不一致，提示需先登出
                return ApiResponse.of(JsonApiResult.FAILED_LOGOUT_IS_NEEDED_BEFORE_LOGIN);
            }
        }

        // 分支二：当前 token 未登录，执行登录流程
        Log.infof("phoneNumber:[%s], verificationCode:[%s]", phoneNumber, verificationCode);

        // 验证码校验
        String cachedCode = sms.getValidationCode(phoneNumber);

        // 判断是管理员登录还是 HR 登录
        if (phoneNumber.equals(adminPhoneNumber)) {
            // 管理员登录：支持 adminPassword 或短信验证码
            boolean passwordMatch = checkPassword(adminPassword, verificationCode);
            boolean smsCodeMatch = cachedCode != null && checkPassword(cachedCode, verificationCode);

            if (!passwordMatch && !smsCodeMatch) {
                return ApiResponse.of(JsonApiResult.FAILED);
            }

            // 管理员验证通过，执行登录
            StpUtil.login(AppConst.XFL_WEBUI_ADMIN_LOGIN_ID);
            return ApiResponse.of(JsonApiResult.SUCCEED)
                .withPayload(Map.of(JsonApiConst.LOGIN_TOKEN_FIELD, StpUtil.getTokenValue()));
        } else {
            // HR 登录：只支持短信验证码
            if (cachedCode == null || !checkPassword(cachedCode, verificationCode)) {
                return ApiResponse.of(JsonApiResult.FAILED);
            }

            // 获取 HR 信息并登录
            MeetHr meetHr = userService.getHrInfoAndUpdateVisitTime(phoneNumber, date);
            if (meetHr == null) {
                return ApiResponse.of(JsonApiResult.FAILED);
            }

            StpUtil.login(meetHr.getId().toString());
            return ApiResponse.of(JsonApiResult.SUCCEED)
                .withPayload(Map.of(JsonApiConst.LOGIN_TOKEN_FIELD, StpUtil.getTokenValue()));
        }
    }

    @POST
    @Path("/logout")
    public ApiResponse<Boolean> logout() {
        var result = ApiResponse.<Boolean>of(JsonApiResult.SUCCEED).withPayload(true);
        if (StpUtil.isLogin()) {
            StpUtil.logout();
        }
        return result;
    }

    @Path("/kickout")
    @POST
    public ApiResponse<Boolean> kickout(@QueryParam("loginId") String loginId) {
        String currentLoginId = StpUtil.getLoginIdAsString();
        ApiResponse<Boolean> failedResult = ApiResponse.<Boolean>of(JsonApiResult.FAILED).withPayload(false);
        // 第一关，不是超管的直接回绝
        if (!AppConst.XFL_WEBUI_ADMIN_LOGIN_ID.equals(currentLoginId)) {
            return failedResult;
        }

        // 确认是超管，常规判空
        String targetToken = StpUtil.getTokenValueByLoginId(loginId);
        if (targetToken == null) {
            return failedResult;
        }

        // 如果目标是 WebSocket 会话，需要先断开连接
        if (AppConst.XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID.equals(loginId)) {
            sms.closeSessionByLoginId(loginId);
        }

        // 注销登录状态
        StpUtil.logout(loginId);
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED).withPayload(true);
    }

    @GET
    @Path("/login/status")
    public ApiResponse<Boolean> status() {
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED).withPayload(StpUtil.isLogin());
    }

    @GET
    @Path("/sms/ws-status")
    public ApiResponse<Boolean> smsWebSocketStatus() {
        return ApiResponse.<Boolean>of(JsonApiResult.SUCCEED).withPayload(!sms.getWebSocketSessionMaps().isEmpty());
    }

    @POST
    @Path("/sms/ws-login")
    @RateLimited(bucket = "login")
    public ApiResponse<Object> smsServerWebSocketLogin(
        @QueryParam("accessKeySecret") String accessKeySecret) {

        String currentToken = StpUtil.getTokenValue();

        // 第一关：验证访问密钥是否正确
        if (!checkPassword(smsWebSocketAccessKeySecret, accessKeySecret)) {
            return ApiResponse.of(JsonApiResult.FAILED);
        }

        // 第二关：检查当前 token 是否已登录
        String currentLoginId = (String) StpUtil.getLoginIdByToken(currentToken);
        if (currentLoginId != null) {
            // 已登录：检查是否是 SMS WebSocket 服务账号
            if (AppConst.XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID.equals(currentLoginId)) {
                // 就是本服务账号，直接返回成功
                return ApiResponse.of(JsonApiResult.SUCCEED)
                    .withPayload(Map.of(JsonApiConst.LOGIN_TOKEN_FIELD, currentToken));
            } else {
                // 已登录其他账号，需要先登出
                return ApiResponse.of(JsonApiResult.FAILED_LOGOUT_IS_NEEDED_BEFORE_LOGIN)
                    .withPayload(Map.of(JsonApiConst.LOGIN_TOKEN_FIELD, currentToken));
            }
        }

        // 第三关：检查该服务账号是否已被其他会话登录
        String historyToken = StpUtil.getTokenValueByLoginId(AppConst.XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID);
        if (historyToken != null) {
            // 账号已被其他地方登录
            return ApiResponse.of(JsonApiResult.FAILED_ALREADY_LOGIN_BY_OTHER);
        }

        // 验证通过，执行登录并返回新 token
        StpUtil.login(AppConst.XFL_SMS_WEB_SOCKET_SERVICE_LOGIN_ID);
        return ApiResponse.of(JsonApiResult.SUCCEED)
            .withPayload(Map.of(JsonApiConst.LOGIN_TOKEN_FIELD, StpUtil.getTokenValue()));
    }

    @GET
    @Path("/verification-code/generate")
    public ApiResponse<String> generateVerificationCode(@QueryParam("phoneNumber") String phoneNumber) {
        return ApiResponse.<String>of(JsonApiResult.SUCCEED)
            .withPayload(sms.justGetValidationCodeAndPutIntoCache(phoneNumber));
    }

    @GET
    @Path("/verification-code")
    public ApiResponse<String> getVerificationCode(@QueryParam("phoneNumber") String phoneNumber) {
        return ApiResponse.<String>of(JsonApiResult.SUCCEED)
            .withPayload(sms.getValidationCode(phoneNumber));
    }
}
