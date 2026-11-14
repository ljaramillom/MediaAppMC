package com.mitocode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PatientDTO {

    private Integer idPatient;

    @NotBlank
    @Size(max = 70)
    private String firstName;

    @NotBlank
    @Size(max = 70)
    private String lastName;

    @NotBlank
    @Size(min = 8, max = 8)
    private String dni;

    @Size(max = 150)
    private String address;

    @NotBlank
    @Size(min = 9, max = 9)
    private String phone;

    @NotBlank
    @Email
    @Size(max = 55)
    private String email;
}
