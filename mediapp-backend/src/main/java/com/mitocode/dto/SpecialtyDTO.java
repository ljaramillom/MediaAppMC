package com.mitocode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SpecialtyDTO {

    private Integer idSpecialty;

    @NotNull
    @NotBlank
    @Size(max = 50)
    private String nameSpecialty;

    @NotNull
    @NotBlank
    @Size(max = 150)
    private String descriptionSpecialty;
}
