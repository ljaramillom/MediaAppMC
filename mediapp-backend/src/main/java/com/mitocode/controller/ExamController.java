package com.mitocode.controller;

import com.mitocode.dto.ExamDTO;
import com.mitocode.model.Exam;
import com.mitocode.service.IExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.mvc.WebMvcLinkBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/v1/exams")
@RequiredArgsConstructor
//@CrossOrigin(origins = "http://localhost:4200")
public class ExamController {

    //@Autowired
    private final IExamService service;
    private final ModelMapper defaultMapper;

    @GetMapping
    public ResponseEntity<List<ExamDTO>> findAll() throws Exception {
        //ModelMapper mapper = new ModelMapper();
        //List<ExamDTO> list = service.findAll().stream().map(e -> mapper.map(e, ExamDTO.class)).toList();
        //List<ExamDTO> list = service.findAll().stream().map(e -> this.convertToDto(e)).toList();
        List<ExamDTO> list = service.findAll().stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamDTO> findById(@PathVariable Integer id) throws Exception {
        Exam exam = service.findById(id);
        ExamDTO examDTO = this.convertToDto(exam);

        return ResponseEntity.ok(examDTO);
    }

    @PostMapping
    public ResponseEntity<Void> save(@Valid @RequestBody ExamDTO dto) throws Exception {
        Exam exam = this.convertToEntity(dto);
        Exam obj = service.save(exam);

        //localhost:8080/v1/exams/4
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdExam()).toUri();

        return ResponseEntity.created(location).build();
        //return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExamDTO> update(@PathVariable Integer id, @Valid @RequestBody ExamDTO dto) throws Exception {
        Exam exam = this.convertToEntity(dto);
        //dto.setIdExam(id);
        Exam obj = service.update(id, exam);
        ExamDTO examDTO = this.convertToDto(obj);

        return ResponseEntity.ok(examDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) throws Exception {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hateoas/{id}")
    public EntityModel<ExamDTO> findByIdHateoas(@PathVariable Integer id) throws Exception {
        Exam obj = service.findById(id);
        ExamDTO dto = this.convertToDto(obj);

        EntityModel<ExamDTO> entityModel = EntityModel.of(dto);
        //localhost:8080/v1/exams/1
        WebMvcLinkBuilder link1 = linkTo(methodOn(ExamController.class).findById(id));
        WebMvcLinkBuilder link2 = linkTo(methodOn(ExamController.class).findAll());
        WebMvcLinkBuilder link3 = linkTo(methodOn(LanguageController.class).changeLanguage("ES"));

        entityModel.add(link1.withRel("exam-self-info"));
        entityModel.add(link2.withRel("all-exams"));
        entityModel.add(link3.withRel("change-language-ES"));

        return entityModel;
    }

    private Exam convertToEntity(ExamDTO dto) {
        return defaultMapper.map(dto, Exam.class);
    }

    private ExamDTO convertToDto(Exam exam) {
        return defaultMapper.map(exam, ExamDTO.class);
    }

    /*public ExamController(IExamService service) {
        this.service = service;
    }*/

    /*@GetMapping
    public Exam getExam(){
        //service = new ExamService();
        return service.validAndGetExam(1);
    }*/
}
