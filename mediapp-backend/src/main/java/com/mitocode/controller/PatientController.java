package com.mitocode.controller;

import com.mitocode.dto.PatientDTO;
import com.mitocode.model.Patient;
import com.mitocode.service.IPatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
@RequestMapping("/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    //@Autowired
    private final IPatientService service;
    private final ModelMapper defaultMapper;

    @GetMapping
    public ResponseEntity<List<PatientDTO>> findAll() throws Exception {
        //ModelMapper mapper = new ModelMapper();
        //List<PatientDTO> list = service.findAll().stream().map(e -> mapper.map(e, PatientDTO.class)).toList();
        //List<PatientDTO> list = service.findAll().stream().map(e -> this.convertToDto(e)).toList();
        List<PatientDTO> list = service.findAll().stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientDTO> findById(@PathVariable Integer id) throws Exception {
        Patient patient = service.findById(id);
        PatientDTO patientDTO = this.convertToDto(patient);

        return ResponseEntity.ok(patientDTO);
    }

    @PostMapping
    public ResponseEntity<Void> save(@Valid @RequestBody PatientDTO dto) throws Exception {
        Patient patient = this.convertToEntity(dto);
        Patient obj = service.save(patient);

        //localhost:8080/v1/patients/4
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdPatient()).toUri();

        return ResponseEntity.created(location).build();
        //return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientDTO> update(@PathVariable Integer id, @Valid @RequestBody PatientDTO dto) throws Exception {
        Patient patient = this.convertToEntity(dto);
        //dto.setIdPatient(id);
        Patient obj = service.update(id, patient);
        PatientDTO patientDTO = this.convertToDto(obj);

        return ResponseEntity.ok(patientDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) throws Exception {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hateoas/{id}")
    public EntityModel<PatientDTO> findByIdHateoas(@PathVariable Integer id) throws Exception {
        Patient obj = service.findById(id);
        PatientDTO dto = this.convertToDto(obj);

        EntityModel<PatientDTO> entityModel = EntityModel.of(dto);
        //localhost:8080/v1/patients/1
        WebMvcLinkBuilder link1 = linkTo(methodOn(PatientController.class).findById(id));
        WebMvcLinkBuilder link2 = linkTo(methodOn(PatientController.class).findAll());
        WebMvcLinkBuilder link3 = linkTo(methodOn(LanguageController.class).changeLanguage("ES"));

        entityModel.add(link1.withRel("patient-self-info"));
        entityModel.add(link2.withRel("all-patients"));
        entityModel.add(link3.withRel("change-language-ES"));

        return entityModel;
    }

    @GetMapping("/pageable")
    public ResponseEntity<Page<PatientDTO>> listPageable(Pageable pageable) throws Exception {
        Page<PatientDTO> page = service.listPage(pageable).map(this::convertToDto);
        return ResponseEntity.ok(page);
    }

    private Patient convertToEntity(PatientDTO dto) {
        return defaultMapper.map(dto, Patient.class);
    }

    private PatientDTO convertToDto(Patient patient) {
        return defaultMapper.map(patient, PatientDTO.class);
    }

    /*public PatientController(IPatientService service) {
        this.service = service;
    }*/

    /*@GetMapping
    public Patient getExam(){
        //service = new ExamService();
        return service.validAndGetExam(1);
    }*/
}
