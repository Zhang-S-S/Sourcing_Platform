package com.sourcing.auth;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException exception) {
        return ResponseEntity.status(exception.status()).body(Map.of("message", exception.getMessage()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage()).findFirst().orElse("请检查输入内容");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> unreadable() {
        return ResponseEntity.badRequest().body(Map.of("message", "请求格式不正确"));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<?> wrongParameterType() {
        return ResponseEntity.badRequest().body(Map.of("message", "请求参数格式不正确，请检查每页条数或返回第一页重试"));
    }
}
