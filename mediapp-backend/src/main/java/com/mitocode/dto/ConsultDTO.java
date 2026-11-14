package com.mitocode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConsultDTO {

    private Integer idConsult;

    // patient y medic son referencias: sin @Valid para no exigir todos sus campos
    @NotNull
    private PatientDTO patient;

    @NotNull
    private MedicDTO medic;

    // Solo el id del usuario; consultMapper lo traslada a consult.user.idUser (y viceversa)
    @NotNull
    private Integer idUser;

    @NotBlank
    @Size(max = 3)
    private String numConsult;

    @NotNull
    private LocalDateTime consultDate;

    @NotNull
    @NotEmpty
    @Valid
    private List<ConsultDetailDTO> details;
}
