package com.sourcing.auth;

/** Replace this implementation with the purchased SMS provider's verification service. */
public interface SmsCodeVerifier {
    void verify(String phone, String purpose, String code);
    String send(String phone, String purpose);
    boolean fixedMode();
}
