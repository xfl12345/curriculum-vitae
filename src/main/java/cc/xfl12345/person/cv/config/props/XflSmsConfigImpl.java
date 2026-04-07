package cc.xfl12345.person.cv.config.props;

import lombok.Builder;

@Builder
public record XflSmsConfigImpl (
    String accessKeySecret,
    String signName,
    int validationCodeLength,
    long expirationInMinute,
    String template
) implements XflSmsConfig {
}
