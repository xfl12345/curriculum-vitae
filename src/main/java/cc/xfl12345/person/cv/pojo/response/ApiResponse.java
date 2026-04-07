package cc.xfl12345.person.cv.pojo.response;

import cc.xfl12345.person.cv.appconst.JsonApiResult;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Data
@Jacksonized
@SuperBuilder
@NoArgsConstructor
public class ApiResponse<T> {
    @Builder.Default
    protected boolean success = false;
    protected String message;
    protected int code;
    protected T payload;

    public static <T> ApiResponse<T> of(JsonApiResult apiResult) {
        return new ApiResponse<T>().withApiResult(apiResult);
    }

    public static <T> ApiResponse<T> create() {
        return new ApiResponse<>();
    }

    public static <T> ApiResponse<T> cloneWithNoData(ApiResponse<?> source) {
        return new ApiResponse<T>().withSuccess(source.isSuccess())
                .withCode(source.getCode())
                .withMessage(source.getMessage());
    }

    public ApiResponse<T> withSuccess(boolean success) {
        this.success = success;
        return this;
    }

    public ApiResponse<T> withCode(int code) {
        this.code = code;
        return this;
    }

    public ApiResponse<T> withMessage(String message) {
        this.message = message;
        return this;
    }

    public ApiResponse<T> withPayload(T payload) {
        this.payload = payload;
        return this;
    }

    public ApiResponse<T> withApiResult(JsonApiResult apiResult) {
        return this.withSuccess(apiResult.equals(JsonApiResult.SUCCEED))
                .withCode(apiResult.getNum())
                .withMessage(apiResult.getName());
    }

    public void appendMessage(String msg) {
        if (getMessage() == null || getMessage().isEmpty()) {
            withMessage(msg);
        } else {
            withMessage(getMessage() + ";" + msg);
        }
    }
}
