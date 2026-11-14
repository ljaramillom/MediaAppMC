package com.mitocode.service;

import com.mitocode.model.Medic;
import org.springframework.web.multipart.MultipartFile;

public interface IMedicService extends ICRUD<Medic, Integer> {

    // Registra el medico; si llega un archivo, primero lo sube a Supabase Storage y guarda su URL publica
    Medic saveWithPhoto(Medic medic, MultipartFile file) throws Exception;

    // Actualiza el medico; sin archivo se conserva el photoUrl que viaja en el DTO
    Medic updateWithPhoto(Integer id, Medic medic, MultipartFile file) throws Exception;
}
