package com.sourcing.dto.response;

/** Public account fields; excludes the password hash. */
public record UserResponse(String id, String username, String company, String phone) { }
