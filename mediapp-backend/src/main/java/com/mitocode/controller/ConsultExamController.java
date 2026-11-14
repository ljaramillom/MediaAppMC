package com.mitocode.controller;

import com.mitocode.dto.ExamDTO;
import com.mitocode.service.IConsultExamService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/consultexams")
@RequiredArgsConstructor
public class ConsultExamController {

    private final IConsultExamService service;
    // Exam y ExamDTO se mapean implicitamente (igual que en ExamController)
    private final ModelMapper defaultMapper;

    // Lista vacia (no 404) si la consulta no existe o no tiene examenes
    @GetMapping("/{idConsult}")
    public ResponseEntity<List<ExamDTO>> getExamsByConsultId(@PathVariable Integer idConsult) {
        List<ExamDTO> list = service.getExamsByConsultId(idConsult).stream().map(e -> defaultMapper.map(e, ExamDTO.class)).toList();

        return ResponseEntity.ok(list);
    }
}
