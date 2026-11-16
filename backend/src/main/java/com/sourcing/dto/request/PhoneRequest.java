package com.sourcing.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhoneRequest(
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请输入验证码") @Size(max=6, message="验证码为 6 位数字") String code) { }
