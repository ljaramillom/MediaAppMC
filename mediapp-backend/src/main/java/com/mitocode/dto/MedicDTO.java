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
public class MedicDTO {

    private Integer idMedic;

    @NotNull
    private Integer idSpecialty;

    @NotNull
    @NotBlank
    @Size(max = 70)
    private String primaryName;

    @NotNull
    @NotBlank
    @Size(max = 70)
    private String surname;

    @NotNull
    @NotBlank
    @Size(max = 12)
    private String cmpMedic;

    @Size(max = 250)
    private String photo;
}
