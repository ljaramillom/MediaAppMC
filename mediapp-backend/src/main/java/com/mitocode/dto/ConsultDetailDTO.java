package com.mitocode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConsultDetailDTO {

    private Integer idDetail;

    // Sin referencia a la consulta: evita ciclos en el JSON y en ModelMapper

    @NotBlank
    @Size(max = 70)
    private String diagnosis;

    @NotBlank
    @Size(max = 150)
    private String treatment;
}
