package cc.xfl12345.person.cv.controller;

import cc.xfl12345.person.cv.appconst.AppConst;
import cc.xfl12345.person.cv.appconst.JsonApiResult;
import cc.xfl12345.person.cv.pojo.request.ApiRequest;
import cc.xfl12345.person.cv.pojo.request.payload.PhoneNumberDTO;
import cc.xfl12345.person.cv.pojo.response.ApiResponse;
import cc.xfl12345.person.cv.service.SMS;
import cloud.tianai.captcha.application.ImageCaptchaApplication;
import cloud.tianai.captcha.application.vo.ImageCaptchaVO;
import cloud.tianai.captcha.common.constant.CaptchaTypeConstant;
import cloud.tianai.captcha.validator.common.model.dto.ImageCaptchaTrack;
import cloud.tianai.captcha.validator.common.model.dto.MatchParam;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkiverse.bucket4j.runtime.RateLimited;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import lombok.Builder;
import org.apache.commons.lang3.StringUtils;

import java.io.Serializable;
import java.util.Optional;

@ApplicationScoped
@Path(AppConst.API_PATH_PREFIX + "/captcha")
@Produces(MediaType.APPLICATION_JSON)
public class CaptchaController {

    @Inject
    ImageCaptchaApplication imageCaptchaApplication;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    SMS sms;

    @GET
    @Path("/generate")
    @RateLimited(bucket = "captcha-generate")
    public ApiResponse<ImageCaptchaVO> genCaptcha(@QueryParam("type") String type) {
        if (StringUtils.isBlank(type)) {
            type = CaptchaTypeConstant.SLIDER;
        }

        cloud.tianai.captcha.common.response.ApiResponse<ImageCaptchaVO> vendorVO = imageCaptchaApplication.generateCaptcha(type);
        return ApiResponse.<ImageCaptchaVO>builder()
                .success(true)
                .code(JsonApiResult.SUCCEED.getNum())
                .message(vendorVO.getMsg())
                .payload(vendorVO.getData())
                .build();
    }

    @Builder
    public record CaptchaActionResult(
            boolean captchaPassed,
            Optional<Boolean> smsVerificationCodeSent
    ) implements Serializable {
    }

    @POST
    @Path("/check")
    @RateLimited(bucket = "captcha-check")
    public ApiResponse<CaptchaActionResult> checkCaptcha(
            @QueryParam("id") String id,
            ImageCaptchaTrack imageCaptchaTrack) {

        // 验证码校验
        var validResult = imageCaptchaApplication.matching(id, new MatchParam(imageCaptchaTrack));
        if (!validResult.isSuccess()) {
            return ApiResponse.<CaptchaActionResult>of(JsonApiResult.FAILED)
                    .withMessage(validResult.getMsg())
                    .withPayload(CaptchaActionResult.builder().captchaPassed(false).build());
        }

        final CaptchaActionResult ONLY_CAPTCHA_PASSED_RESULT = CaptchaActionResult.builder().captchaPassed(true).build();
        // 验证码校验成功，检查是否有额外数据需要处理
        if (imageCaptchaTrack.getData() == null) {
            return ApiResponse.<CaptchaActionResult>of(JsonApiResult.SUCCEED)
                    .withPayload(ONLY_CAPTCHA_PASSED_RESULT);
        }

        // 解析额外数据并执行对应操作
        ApiRequest<?> extraData;
        try {
            extraData = objectMapper.convertValue(imageCaptchaTrack.getData(), ApiRequest.class);
        } catch (IllegalArgumentException e) {
            return ApiResponse.<CaptchaActionResult>of(JsonApiResult.FAILED_REQUEST_FORMAT_ERROR)
                    .withPayload(ONLY_CAPTCHA_PASSED_RESULT);
        }

        if (extraData == null || extraData.operation == null) {
            return ApiResponse.<CaptchaActionResult>of(JsonApiResult.SUCCEED)
                    .withPayload(ONLY_CAPTCHA_PASSED_RESULT);
        }

        if ("pull-sms-verification-code".equals(extraData.operation)) {
            PhoneNumberDTO phoneNumberDTO = objectMapper.convertValue(extraData.payload, PhoneNumberDTO.class);
            var operationResult = sms.sendValidationCode(phoneNumberDTO);
            return ApiResponse.<CaptchaActionResult>cloneWithNoData(operationResult)
                    .withPayload(CaptchaActionResult.builder()
                            .captchaPassed(true)
                            .smsVerificationCodeSent(Optional.of(operationResult.isSuccess()))
                            .build()
                    );
        }

        return ApiResponse.of(JsonApiResult.FAILED_NOT_SUPPORT);
    }
}
