package com.mitocode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// Cuerpo del POST transaccional: la consulta (con sus detalles) y la lista de examenes
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConsultListExamDTO {

    @NotNull
    @Valid
    private ConsultDTO consult;

    // @Valid explicito: la validacion no cascadea sola a los elementos de la lista.
    // Una lista vacia es valida (consulta sin examenes); null no lo es
    @NotNull
    @Valid
    private List<ExamDTO> lstExam;
}
