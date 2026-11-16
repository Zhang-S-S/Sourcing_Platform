package com.sourcing.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
            @NotBlank(message="请输入用户名") @Size(max=64, message="用户名过长") String username,
            @Size(max=100, message="公司名称最多 100 字") String company,
            @NotBlank(message="请输入密码") @Size(max=72, message="密码过长") String password,
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请输入验证码") @Size(max=6, message="验证码为 6 位数字") String code) { }
