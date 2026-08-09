package cc.xfl12345.person.cv.service;

import cc.xfl12345.person.cv.appconst.JsonApiConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.config.props.XflSmsConfig;
import cn.dev33.satoken.stp.StpUtil;
import cc.xfl12345.person.cv.pojo.*;
import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.pojo.request.ApiRequestBase;
import cc.xfl12345.person.cv.pojo.request.payload.PhoneNumberDTO;
import cc.xfl12345.person.cv.framework.bucket4j.UserIdentityResolver;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkiverse.bucket4j.runtime.RateLimitException;
import io.quarkiverse.bucket4j.runtime.RateLimiterRuntimeConfig;
import io.quarkus.cache.Cache;
import io.quarkiverse.bucket4j.runtime.RateLimited;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;

import io.quarkus.cache.CacheName;
import io.quarkus.cache.CaffeineCache;

import java.io.IOException;
import java.math.BigInteger;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 短信验证码服务，管理验证码生成、缓存、发送及 WebSocket 会话。
 * <p>
 * 验证码缓存使用 {@link CaffeineCache}（Quarkus Cache），
 * 配置在 {@code quarkus.cache.caffeine."sms-validation-code"}。
 * <p>
 * 限流配置在 {@link RateLimiterRuntimeConfig#buckets()
 * quarkus.rate-limiter.buckets.sms-validation-code}，
 * 身份解析复用 {@link UserIdentityResolver}。
 */
@ApplicationScoped
@ServerEndpoint("/sms/ws-connect")
public class SMS {

    @Inject
    ObjectMapper objectMapper;

    @Inject
    UserService userService;

    String namedSmsTemplate = "%s";

    int validationCodeLength = 6;

    /**
     * 由 bucket4j AOP 消费，限流超限时抛出 {@link RateLimitException}。
     */
    @RateLimited(bucket = "sms-validation-code")
    protected void consumeBucket() {
    }

    @Inject
    @CacheName("sms-validation-code")
    Cache smsValidationCodeCache;

    Map<String, Session> webSocketSessionMaps = new ConcurrentHashMap<>();

    @SuppressWarnings("LombokGetterMayBeUsed")
    public Map<String, Session> getWebSocketSessionMaps() {
        return webSocketSessionMaps;
    }

    public CaffeineCache getSmsValidationCodeCache() {
        return smsValidationCodeCache.as(CaffeineCache.class);
    }

    public String getValidationCode(String phoneNumber) {
        var future = getSmsValidationCodeCache().getIfPresent(phoneNumber);
        return Optional.ofNullable(future).map(f -> (String) f.join()).orElse(null);
    }

    private void putValidationCode(String phoneNumber, String code) {
        getSmsValidationCodeCache().put(phoneNumber, CompletableFuture.completedFuture(code));
    }

    @Inject
    public void applySmsConfig(XflSmsConfig xflSmsConfig) {
        validationCodeLength = xflSmsConfig.validationCodeLength();
        namedSmsTemplate = String.format("【%s】", xflSmsConfig.signName())
            + String.format(xflSmsConfig.template(), "%s", xflSmsConfig.validationCodeLength(), xflSmsConfig.expirationInMinute());
    }

    public String justGetValidationCodeAndPutIntoCache(String phoneNumber) {
        String code = generateValidationCode();
        putValidationCode(phoneNumber, code);
        return code;
    }

    public String generateValidationCode() {
        return generateValidationCode(validationCodeLength);
    }

    public String generateValidationCode(int codeLength) {
        StringBuilder verificationCodeBuffer = new StringBuilder(codeLength);
        Random random = new Random(System.currentTimeMillis());
        byte[] commonHash = BigInteger.valueOf(
            (long) ((short) random.hashCode())
                | (((long) ((short) verificationCodeBuffer.hashCode())) << 16)
                | (((long) ((short) (verificationCodeBuffer.hashCode() >> 16))) << 32)
                | (((long) ((short) (random.hashCode() >> 16))) << 48)
        ).toByteArray();
        long hash = 1315423911 + random.nextLong();
        byte takeNum;
        for (int i = 0, finishCodeCount = 0; finishCodeCount < codeLength; finishCodeCount++) {
            if (random.nextBoolean()) {
                hash ^= ((hash << 5) + commonHash[i] + (hash >> 2));
            } else {
                hash ^= ((hash << 4) + commonHash[i] + (hash >> 1));
            }
            takeNum = (byte) ((hash & 0xFF)
                - ((hash & 0xFF00) >> 8)
                + ((hash & 0xFF0000) >> 16)
                - ((hash & 0xFF000000L) >> 24));
            String str = String.valueOf(Math.abs(takeNum % 9));
            verificationCodeBuffer.append(str);
            if (i < commonHash.length - 1) i++;
            else i = 0;
        }
        return verificationCodeBuffer.toString();
    }

    public enum SendValidationCodeResult {
        SUCCESS, FAILED, NOT_AVAILABLE, ALL_ERROR
    }

    public SendValidationCodeResult sendValidationCode(String phoneNumber) {
        Iterator<Session> iterator = webSocketSessionMaps.values().iterator();
        if (iterator.hasNext()) {
            String code = generateValidationCode();
            SmsTask smsTask = new SmsTask();
            smsTask.setCreateTime(ZonedDateTime.now(TimeZone.getDefault().toZoneId()).format(DateTimeFormatter.ISO_INSTANT));
            smsTask.setPhoneNumber(phoneNumber);
            smsTask.setValidationCode(code);
            smsTask.setSmsContent(String.format(namedSmsTemplate, code));

            ApiRequestBase requestObject = new ApiRequestBase();
            requestObject.operation = "sendSms";
            requestObject.payload = smsTask;

            WebSocketMessage message = new WebSocketMessage();
            message.setMessageType(WebSocketMessage.Type.request);
            message.setPayload(requestObject);

            while (iterator.hasNext()) {
                Session wsSession = iterator.next();
                try {
                    wsSession.getAsyncRemote().sendText(objectMapper.writeValueAsString(message));
                    putValidationCode(phoneNumber, code);
                    return SendValidationCodeResult.SUCCESS;
                } catch (Exception e) {
                    Log.error("Sending validation code to SMS server failed", e);
                }
            }
            return SendValidationCodeResult.ALL_ERROR;
        }
        return SendValidationCodeResult.NOT_AVAILABLE;
    }

    public ApiResponse<Object> sendValidationCode(PhoneNumberDTO phoneNumberDTO) {
        ApiResponse<Object> failedResult = ApiResponse.of(JsonApiResult.FAILED_NOT_SUPPORT);

        // 第一关：检查请求格式是否正确
        if (Objects.isNull(phoneNumberDTO.phoneNumber)) {
            return failedResult.withApiResult(JsonApiResult.FAILED_REQUEST_FORMAT_ERROR);
        }

        String phoneNumber = phoneNumberDTO.phoneNumber;

        // 第二关：检查用户权限（是否为受邀面试官）
        MeetHr meetHr = userService.getHrInfoAndUpdateVisitTime(phoneNumber, ZonedDateTime.now());
        if (Objects.isNull(meetHr)) {
            return failedResult.withApiResult(JsonApiResult.FAILED_FORBIDDEN)
                .withMessage("您好，您的权限不足，可联系站长成为受邀面试官。");
        }

        // 第三关：频率限制检查
        long waitMs = 0;
        try {
            consumeBucket();
        } catch (RateLimitException rateLimitException) {
            waitMs = rateLimitException.getWaitTimeInMilliSeconds();
        }
        if (waitMs > 0) {
            return failedResult.withApiResult(JsonApiResult.FAILED_FREQUENCY_MAX)
                .withPayload(Map.of(JsonApiConst.COOL_DOWN_REMAINDER_FIELD, waitMs));
        }

        // 第四关：发送短信验证码
        SendValidationCodeResult sendResult = sendValidationCode(phoneNumber);

        // 处理发送结果
        if (sendResult == SendValidationCodeResult.SUCCESS) {
            return ApiResponse.of(JsonApiResult.SUCCEED);
        } else {
            JsonApiResult errorCode = (sendResult == SendValidationCodeResult.ALL_ERROR)
                ? JsonApiResult.OTHER_FAILED
                : JsonApiResult.FAILED;
            return failedResult.withApiResult(errorCode)
                .withMessage("后台短信服务不可用，请联系站长修复。");
        }
    }

    public boolean closeSessionByLoginId(String loginId) {
        Session session = webSocketSessionMaps.get(loginId);
        if (Objects.nonNull(session)) {
            try {
                session.close();
            } catch (IOException e) {
                StpUtil.logout(loginId);
            }
            return true;
        }
        return false;
    }

    @OnOpen
    public void onOpen(Session session) {
        // TODO 修正参数获取方式
        String token = session.getRequestURI().getQuery();
        if (Objects.nonNull(token) && token.startsWith("token=")) {
            token = token.substring(6);
        }
        String loginId = (String) StpUtil.getLoginIdByToken(token);
        if (Objects.isNull(loginId)) {
            try { session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Not authenticated")); } catch (IOException e) { /* ignore */ }
            return;
        }

        Session oldSession = webSocketSessionMaps.put(loginId, session);
        if (Objects.nonNull(oldSession)) {
            try { oldSession.close(); } catch (Exception e) { /* ignore */ }
        }
        session.getUserProperties().put("loginId", loginId);
        Log.debugf("WebSocket connected, sid=%s, loginId=%s", session.getId(), loginId);
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        String loginId = (String) session.getUserProperties().get("loginId");
        if (Objects.nonNull(loginId)) {
            webSocketSessionMaps.remove(loginId);
            if (closeReason.getCloseCode() == CloseReason.CloseCodes.NORMAL_CLOSURE
                || closeReason.getCloseCode() == CloseReason.CloseCodes.GOING_AWAY) {
                StpUtil.logout(loginId);
            }
        }
        Log.debugf("WebSocket closed, sid=%s, loginId=%s, code=%s", session.getId(), loginId, closeReason);
    }

    @OnMessage
    public void onMessage(Session session, String message) {
        Log.debugf("WebSocket message from sid=%s: %s", session.getId(), message);
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        Log.error("WebSocket error", throwable);
    }
}
