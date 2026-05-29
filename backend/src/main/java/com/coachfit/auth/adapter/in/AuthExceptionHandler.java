package com.coachfit.auth.adapter.in;

import com.coachfit.auth.domain.exception.EmailAlreadyExistsException;
import com.coachfit.auth.domain.exception.InvalidCredentialsException;
import com.coachfit.auth.domain.exception.TokenExpiredException;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Auth-module-specific exception handler.
 *
 * <p>Composes with the shared {@code GlobalExceptionHandler} — Spring MVC applies
 * the most-specific advice first, so auth exceptions are handled here before the
 * catch-all 500 handler in the shared module.
 */
@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(EmailAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiErrorResponse handleEmailAlreadyExists(EmailAlreadyExistsException ex) {
        return new ApiErrorResponse(new ApiError("EMAIL_ALREADY_EXISTS", ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiErrorResponse handleInvalidCredentials(InvalidCredentialsException ex) {
        return new ApiErrorResponse(new ApiError("INVALID_CREDENTIALS", ex.getMessage()));
    }

    @ExceptionHandler(TokenExpiredException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiErrorResponse handleTokenExpired(TokenExpiredException ex) {
        return new ApiErrorResponse(new ApiError("TOKEN_EXPIRED", ex.getMessage()));
    }
}
