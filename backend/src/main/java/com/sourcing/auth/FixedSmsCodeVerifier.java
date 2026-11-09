package com.sourcing.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Local development only: no external SMS request is made. */
@Component
@Profile("local")
public class FixedSmsCodeVerifier implements SmsCodeVerifier {
    @Override public void verify(String phone, String purpose, String code) {
        if (!"123456".equals(code)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "验证码错误，请输入本地测试验证码 123456");
        }
    }
    @Override public String send(String phone, String purpose) {
        return "当前为本地测试模式，验证码固定为 123456，不发送真实短信。";
    }
    @Override public boolean fixedMode() { return true; }
}
