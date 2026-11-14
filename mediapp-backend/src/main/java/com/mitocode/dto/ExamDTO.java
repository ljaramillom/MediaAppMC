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
public class ExamDTO {

    private Integer idExam;

    @NotNull
    //@NotEmpty
    //@NotBlank
    @Size(min = 3, max = 50, message = "{name.size}")
    private String nameExam;

    @NotNull
    @Size(min = 15, max = 150, message = "{description.size}")
    private String descriptionExam;

    /*@Max(100)
    private int age;
    @Min(1)
    private int age2;
    @Past
    @Future
    @Positive
    @Negative
    @Email
    private String email;
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
    private String email2;*/
}
