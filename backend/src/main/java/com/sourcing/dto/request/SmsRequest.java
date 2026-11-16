package com.sourcing.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SmsRequest(
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请选择验证码用途") @Pattern(regexp="register|login", message="验证码用途不正确") String purpose) { }
