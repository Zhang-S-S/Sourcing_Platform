package com.sourcing.entity;

/** Account stored in the local MySQL database. Never returned directly to the browser. */
public record User(String id, String username, String company, String passwordHash, String phone, boolean enabled) { }
