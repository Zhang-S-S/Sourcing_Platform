package com.sourcing.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordRequest(
            @NotBlank(message="请输入用户名") @Size(max=64, message="用户名过长") String username,
            @NotBlank(message="请输入密码") @Size(max=72, message="密码过长") String password) { }
