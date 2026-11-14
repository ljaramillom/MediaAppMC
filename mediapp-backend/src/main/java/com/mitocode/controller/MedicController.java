package com.mitocode.controller;

import com.mitocode.dto.MedicDTO;
import com.mitocode.model.Medic;
import com.mitocode.service.IMedicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.mvc.WebMvcLinkBuilder;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/v1/medics")
@RequiredArgsConstructor
public class MedicController {

    //@Autowired
    private final IMedicService service;
    private final ModelMapper medicMapper;

    @GetMapping
    public ResponseEntity<List<MedicDTO>> findAll() throws Exception {
        List<MedicDTO> list = service.findAll().stream().map(this::convertToDto).toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicDTO> findById(@PathVariable Integer id) throws Exception {
        Medic medic = service.findById(id);
        MedicDTO medicDTO = this.convertToDto(medic);

        return ResponseEntity.ok(medicDTO);
    }

    // multipart/form-data: parte "medic" (application/json) + parte opcional "file" (imagen)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> save(@Valid @RequestPart("medic") MedicDTO dto,
                                     @RequestPart(value = "file", required = false) MultipartFile file) throws Exception {
        Medic medic = this.convertToEntity(dto);
        Medic obj = service.saveWithPhoto(medic, file);

        //localhost:8080/v1/medics/4
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdMedic()).toUri();

        return ResponseEntity.created(location).build();
    }

    // Sin "file" se conserva la URL actual, que viaja en MedicDTO.photo
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MedicDTO> update(@PathVariable Integer id,
                                           @Valid @RequestPart("medic") MedicDTO dto,
                                           @RequestPart(value = "file", required = false) MultipartFile file) throws Exception {
        Medic medic = this.convertToEntity(dto);
        //dto.setIdMedic(id);
        Medic obj = service.updateWithPhoto(id, medic, file);
        MedicDTO medicDTO = this.convertToDto(obj);

        return ResponseEntity.ok(medicDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) throws Exception {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hateoas/{id}")
    public EntityModel<MedicDTO> findByIdHateoas(@PathVariable Integer id) throws Exception {
        Medic obj = service.findById(id);
        MedicDTO dto = this.convertToDto(obj);

        EntityModel<MedicDTO> entityModel = EntityModel.of(dto);
        //localhost:8080/v1/medics/1
        WebMvcLinkBuilder link1 = linkTo(methodOn(MedicController.class).findById(id));
        WebMvcLinkBuilder link2 = linkTo(methodOn(MedicController.class).findAll());
        WebMvcLinkBuilder link3 = linkTo(methodOn(LanguageController.class).changeLanguage("ES"));

        entityModel.add(link1.withRel("medic-self-info"));
        entityModel.add(link2.withRel("all-medics"));
        entityModel.add(link3.withRel("change-language-ES"));

        return entityModel;
    }

    private Medic convertToEntity(MedicDTO dto) {
        return medicMapper.map(dto, Medic.class);
    }

    private MedicDTO convertToDto(Medic medic) {
        return medicMapper.map(medic, MedicDTO.class);
    }

}
