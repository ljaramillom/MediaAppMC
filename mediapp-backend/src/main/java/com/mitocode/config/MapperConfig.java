package com.mitocode.config;

import com.mitocode.dto.ConsultDTO;
import com.mitocode.dto.MedicDTO;
import com.mitocode.dto.SpecialtyDTO;
import com.mitocode.model.Consult;
import com.mitocode.model.Medic;
import com.mitocode.model.Specialty;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MapperConfig {

    @Bean
    public ModelMapper defaultMapper() {
        return new ModelMapper();
    }

    @Bean
    public ModelMapper medicMapper() {
        ModelMapper modelMapper = new ModelMapper();

        //ESCRITURA POST PUT
        modelMapper.createTypeMap(MedicDTO.class, Medic.class)
                .addMapping(MedicDTO::getPrimaryName, Medic::setFirstName)
                .addMapping(MedicDTO::getSurname, Medic::setLastName)
                .addMapping(MedicDTO::getCmpMedic, Medic::setCmp)
                .addMapping(MedicDTO::getPhoto, Medic::setPhotoUrl)
                // Mapeo profundo: el idSpecialty del DTO se asigna a medic.specialty.idSpecialty
                .addMappings(m -> m.<Integer>map(MedicDTO::getIdSpecialty, (dest, v) -> dest.getSpecialty().setIdSpecialty(v)));

        //LECTURA GET
        modelMapper.createTypeMap(Medic.class, MedicDTO.class)
                .addMapping(Medic::getFirstName, MedicDTO::setPrimaryName)
                .addMapping(Medic::getLastName, MedicDTO::setSurname)
                .addMapping(Medic::getCmp, MedicDTO::setCmpMedic)
                .addMapping(Medic::getPhotoUrl, MedicDTO::setPhoto)
                .addMapping(src -> src.getSpecialty().getIdSpecialty(), MedicDTO::setIdSpecialty);

        return modelMapper;
    }

    @Bean
    public ModelMapper specialtyMapper() {
        ModelMapper modelMapper = new ModelMapper();

        //ESCRITURA POST PUT
        modelMapper.createTypeMap(SpecialtyDTO.class, Specialty.class)
                .addMapping(SpecialtyDTO::getNameSpecialty, Specialty::setName)
                .addMapping(SpecialtyDTO::getDescriptionSpecialty, Specialty::setDescription);

        //LECTURA GET
        modelMapper.createTypeMap(Specialty.class, SpecialtyDTO.class)
                .addMapping(Specialty::getName, SpecialtyDTO::setNameSpecialty)
                .addMapping(Specialty::getDescription, SpecialtyDTO::setDescriptionSpecialty);

        return modelMapper;
    }

    @Bean
    public ModelMapper consultMapper() {
        ModelMapper modelMapper = new ModelMapper();
        // Solo coincidencias exactas de nombres: evita mapeos ambiguos en los objetos anidados
        modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);

        //ESCRITURA POST PUT
        modelMapper.createTypeMap(MedicDTO.class, Medic.class)
                .addMapping(MedicDTO::getPrimaryName, Medic::setFirstName)
                .addMapping(MedicDTO::getSurname, Medic::setLastName)
                .addMapping(MedicDTO::getCmpMedic, Medic::setCmp)
                .addMapping(MedicDTO::getPhoto, Medic::setPhotoUrl);

        //LECTURA GET
        modelMapper.createTypeMap(Medic.class, MedicDTO.class)
                .addMapping(Medic::getFirstName, MedicDTO::setPrimaryName)
                .addMapping(Medic::getLastName, MedicDTO::setSurname)
                .addMapping(Medic::getCmp, MedicDTO::setCmpMedic)
                .addMapping(Medic::getPhotoUrl, MedicDTO::setPhoto)
                .addMapping(src -> src.getSpecialty().getIdSpecialty(), MedicDTO::setIdSpecialty);

        // Con STRICT el idUser del DTO no coincide implicitamente con consult.user.idUser: se mapea explicito
        //ESCRITURA POST PUT
        modelMapper.createTypeMap(ConsultDTO.class, Consult.class)
                .addMappings(m -> m.<Integer>map(ConsultDTO::getIdUser, (dest, v) -> dest.getUser().setIdUser(v)));

        //LECTURA GET
        modelMapper.createTypeMap(Consult.class, ConsultDTO.class)
                .addMapping(src -> src.getUser().getIdUser(), ConsultDTO::setIdUser);

        return modelMapper;
    }
}
