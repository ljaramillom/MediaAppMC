package com.mitocode.controller;

import com.mitocode.dto.ConsultDTO;
import com.mitocode.dto.ConsultListExamDTO;
import com.mitocode.dto.ConsultProcDTO;
import com.mitocode.dto.IConsultProcDTO;
import com.mitocode.model.Consult;
import com.mitocode.model.Exam;
import com.mitocode.service.IConsultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/consults")
@RequiredArgsConstructor
public class ConsultController {

    private final IConsultService service;
    // @Qualifier se copia al constructor de Lombok gracias a lombok.config (lombok.copyableAnnotations)
    @Qualifier("consultMapper")
    private final ModelMapper consultMapper;

    // Filtro de busqueda por datos del paciente; solo se usa en este endpoint, por eso no vive en dto
    public record FilterConsultDTO(String dni, String fullname) {}

    @GetMapping
    public ResponseEntity<List<ConsultDTO>> findAll() throws Exception {
        List<ConsultDTO> list = service.findAll().stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultDTO> findById(@PathVariable Integer id) throws Exception {
        Consult consult = service.findById(id);
        ConsultDTO consultDTO = this.convertToDto(consult);

        return ResponseEntity.ok(consultDTO);
    }

    // POST transaccional: consult + consult_detail + consult_exam en una sola unidad de trabajo
    @PostMapping
    public ResponseEntity<Void> save(@Valid @RequestBody ConsultListExamDTO dto) throws Exception {
        Consult consult = this.convertToEntity(dto.getConsult());
        List<Exam> exams = dto.getLstExam().stream().map(e -> consultMapper.map(e, Exam.class)).toList();
        Consult obj = service.saveTransactional(consult, exams);

        //localhost:8080/v1/consults/1
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdConsult()).toUri();

        return ResponseEntity.created(location).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConsultDTO> update(@PathVariable Integer id, @Valid @RequestBody ConsultDTO dto) throws Exception {
        Consult consult = this.convertToEntity(dto);
        Consult obj = service.update(id, consult);
        ConsultDTO consultDTO = this.convertToDto(obj);

        return ResponseEntity.ok(consultDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) throws Exception {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // POST con cuerpo: dni exacto O fullname parcial (el cliente lo envia en minusculas). Sin @Valid
    @PostMapping("/search/others")
    public ResponseEntity<List<ConsultDTO>> searchByOthers(@RequestBody FilterConsultDTO filterDTO) {
        List<ConsultDTO> list = service.search(filterDTO.dni(), filterDTO.fullname()).stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    // GET con query params en formato yyyy-MM-ddTHH:mm:ss; una fecha sin hora no se puede parsear
    @GetMapping("/search/dates")
    public ResponseEntity<List<ConsultDTO>> searchByDates(@RequestParam("date1") String date1, @RequestParam("date2") String date2) {
        List<ConsultDTO> list = service.searchByDates(LocalDateTime.parse(date1), LocalDateTime.parse(date2)).stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/callProcedureManual")
    public ResponseEntity<List<ConsultProcDTO>> callProcedureManual(){
        return ResponseEntity.ok(service.callProcedureOrFunctionManual());
    }

    @GetMapping("/callProcedureNative")
    public ResponseEntity<List<ConsultProcDTO>> callProcedureNative(){
        return ResponseEntity.ok(service.callProcedureOrFunctionNative());
    }

    @GetMapping("/callProcedureProjection")
    public ResponseEntity<List<IConsultProcDTO>> callProcedureProjection(){
        return ResponseEntity.ok(service.callProcedureOrFunctionProjection());
    }

    @GetMapping(value = "/generateReport", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE) //APPLICATION_PDF_VALUE
    public ResponseEntity<byte[]> generateReport() throws Exception {
        return ResponseEntity.ok(service.generateReport());
    }

    private Consult convertToEntity(ConsultDTO dto) {
        return consultMapper.map(dto, Consult.class);
    }

    private ConsultDTO convertToDto(Consult consult) {
        return consultMapper.map(consult, ConsultDTO.class);
    }
}
