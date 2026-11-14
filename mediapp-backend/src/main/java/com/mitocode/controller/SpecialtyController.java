package com.mitocode.controller;

import com.mitocode.dto.SpecialtyDTO;
import com.mitocode.model.Specialty;
import com.mitocode.service.ISpecialtyService;
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
@RequestMapping("/v1/specialties")
@RequiredArgsConstructor
public class SpecialtyController {

    //@Autowired
    private final ISpecialtyService service;
    private final ModelMapper specialtyMapper;

    @GetMapping
    public ResponseEntity<List<SpecialtyDTO>> findAll() throws Exception {
        //ModelMapper mapper = new ModelMapper();
        //List<SpecialtyDTO> list = service.findAll().stream().map(e -> mapper.map(e, SpecialtyDTO.class)).toList();
        //List<SpecialtyDTO> list = service.findAll().stream().map(e -> this.convertToDto(e)).toList();
        List<SpecialtyDTO> list = service.findAll().stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpecialtyDTO> findById(@PathVariable Integer id) throws Exception {
        Specialty specialty = service.findById(id);
        SpecialtyDTO specialtyDTO = this.convertToDto(specialty);

        return ResponseEntity.ok(specialtyDTO);
    }

    @PostMapping
    public ResponseEntity<Void> save(@Valid @RequestBody SpecialtyDTO dto) throws Exception {
        Specialty specialty = this.convertToEntity(dto);
        Specialty obj = service.save(specialty);

        //localhost:8080/v1/specialties/4
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdSpecialty()).toUri();

        return ResponseEntity.created(location).build();
        //return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<SpecialtyDTO> update(@PathVariable Integer id, @Valid @RequestBody SpecialtyDTO dto) throws Exception {
        Specialty specialty = this.convertToEntity(dto);
        //dto.setIdSpecialty(id);
        Specialty obj = service.update(id, specialty);
        SpecialtyDTO specialtyDTO = this.convertToDto(obj);

        return ResponseEntity.ok(specialtyDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) throws Exception {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hateoas/{id}")
    public EntityModel<SpecialtyDTO> findByIdHateoas(@PathVariable Integer id) throws Exception {
        Specialty obj = service.findById(id);
        SpecialtyDTO dto = this.convertToDto(obj);

        EntityModel<SpecialtyDTO> entityModel = EntityModel.of(dto);
        //localhost:8080/v1/specialties/1
        WebMvcLinkBuilder link1 = linkTo(methodOn(SpecialtyController.class).findById(id));
        WebMvcLinkBuilder link2 = linkTo(methodOn(SpecialtyController.class).findAll());
        WebMvcLinkBuilder link3 = linkTo(methodOn(LanguageController.class).changeLanguage("ES"));

        entityModel.add(link1.withRel("specialty-self-info"));
        entityModel.add(link2.withRel("all-specialties"));
        entityModel.add(link3.withRel("change-language-ES"));

        return entityModel;
    }

    private Specialty convertToEntity(SpecialtyDTO dto) {
        return specialtyMapper.map(dto, Specialty.class);
    }

    private SpecialtyDTO convertToDto(Specialty specialty) {
        return specialtyMapper.map(specialty, SpecialtyDTO.class);
    }


}
