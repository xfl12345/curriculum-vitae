package cc.xfl12345.person.cv.config.props;

import io.smallrye.config.ConfigMapping;

import java.io.Serializable;


@ConfigMapping(prefix = "app.sms.xfl12345")
public interface XflSmsConfig extends Serializable {
    String accessKeySecret();
    String signName();
    int validationCodeLength();
    long expirationInMinute();
    String template();
}
