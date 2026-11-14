package com.mitocode.exception;

import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ResponseExceptionHandler {//extends ResponseEntityExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CustomErrorTemplate> handleDefaultExceptions(Exception ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }


    @ExceptionHandler(ModelNotFoundException.class)
    public ResponseEntity<CustomErrorTemplate> handleModelNotFoundException(ModelNotFoundException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler({ArithmeticException.class, NumberFormatException.class})
    public ResponseEntity<CustomErrorTemplate> handleArithmeticException(ArithmeticException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<CustomErrorTemplate> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex, WebRequest request){
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));

        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), msg, request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // FK inexistente (ej. idExam desconocido) o PK duplicada (ej. mismo examen dos veces en consult_exam).
    // Es un error del cliente: 400 en lugar de 500. La transaccion ya fue revertida
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<CustomErrorTemplate> handleDataIntegrityViolationException(DataIntegrityViolationException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), "DATA INTEGRITY VIOLATION: " + ex.getMostSpecificCause().getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Archivo con tipo o tamano no permitido (validacion explicita en MedicServiceImpl)
    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<CustomErrorTemplate> handleInvalidFileException(InvalidFileException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Archivo por encima de spring.servlet.multipart.max-file-size (lo rechaza el parser multipart)
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<CustomErrorTemplate> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), "FILE TOO LARGE: " + ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Falta la parte "medic" del multipart
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<CustomErrorTemplate> handleMissingServletRequestPartException(MissingServletRequestPartException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Content type no soportado (ej. parte "medic" enviada como texto plano en lugar de application/json)
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<CustomErrorTemplate> handleHttpMediaTypeNotSupportedException(HttpMediaTypeNotSupportedException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(error);
    }

    // Fecha con formato invalido en /v1/consults/search/dates (ej. sin la parte de hora): error del cliente, 400 en lugar de 500
    @ExceptionHandler(DateTimeParseException.class)
    public ResponseEntity<CustomErrorTemplate> handleDateTimeParseException(DateTimeParseException ex, WebRequest request){
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    /*@Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        CustomErrorTemplate error = new CustomErrorTemplate(LocalDateTime.now(), ex.getMessage(), request.getDescription(false));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }*/
}
