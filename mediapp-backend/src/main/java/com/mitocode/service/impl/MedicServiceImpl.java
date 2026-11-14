package com.mitocode.service.impl;

import com.mitocode.exception.InvalidFileException;
import com.mitocode.model.Medic;
import com.mitocode.repo.IMedicRepo;
import com.mitocode.repo.IGenericRepo;
import com.mitocode.service.IMedicService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicServiceImpl extends CRUDImpl<Medic, Integer> implements IMedicService {

    private final IMedicRepo repo;

    // Cliente HTTP de Spring (spring-web), sin dependencias adicionales
    private final RestClient restClient = RestClient.create();

    // Configuracion de Supabase Storage (application.yaml / variables de entorno)
    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket}")
    private String bucket;

    @Value("${medic.photo.max-size:2MB}")
    private DataSize maxPhotoSize;

    @Override
    protected IGenericRepo<Medic, Integer> getRepo() {
        return repo;
    }

    @Override
    public Medic saveWithPhoto(Medic medic, MultipartFile file) throws Exception {
        if (hasFile(file)) {
            medic.setPhotoUrl(uploadPhoto(file));
        }
        return this.save(medic);
    }

    @Override
    public Medic updateWithPhoto(Integer id, Medic medic, MultipartFile file) throws Exception {
        // Se valida el id antes de subir, para no dejar archivos de un medico inexistente
        var _ = this.findById(id);

        if (hasFile(file)) {
            // La foto anterior se queda en el bucket (decision de la spec)
            medic.setPhotoUrl(uploadPhoto(file));
        }
        return this.update(id, medic);
    }

    private boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private void validatePhoto(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new InvalidFileException("INVALID FILE TYPE: " + contentType + ". ONLY IMAGES ARE ALLOWED");
        }
        if (file.getSize() > maxPhotoSize.toBytes()) {
            throw new InvalidFileException("FILE TOO LARGE: MAX SIZE IS " + maxPhotoSize.toMegabytes() + "MB");
        }
    }

    // Sube el archivo a Supabase Storage y devuelve su URL publica
    private String uploadPhoto(MultipartFile file) throws Exception {
        validatePhoto(file);

        if (!StringUtils.hasText(supabaseKey)) {
            throw new IllegalStateException("SUPABASE KEY NOT CONFIGURED (SUPABASE_SERVICE_ROLE_KEY)");
        }

        // medics/{uuid}.{ext}: no depende del idMedic, asi el registro es un solo insert
        String fileName = UUID.randomUUID() + "." + resolveExtension(file);
        String objectName = "medics/" + fileName;
        String baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;

        //POST {url}/storage/v1/object/{bucket}/medics/{fileName}
        //La carpeta va literal en la plantilla: una variable con "/" se codificaria como %2F
        restClient.post()
                .uri(baseUrl + "/storage/v1/object/{bucket}/medics/{fileName}", bucket, fileName)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("apikey", supabaseKey)
                .header("x-upsert", "false")
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .body(file.getBytes())
                .retrieve()
                .toBodilessEntity();

        //Bucket publico: {url}/storage/v1/object/public/{bucket}/{objectName}
        return baseUrl + "/storage/v1/object/public/" + bucket + "/" + objectName;
    }

    // Extension del nombre original; si no hay, se toma del content type (image/png -> png)
    private String resolveExtension(MultipartFile file) {
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (!StringUtils.hasText(ext)) {
            ext = file.getContentType().substring(file.getContentType().indexOf('/') + 1);
        }
        ext = ext.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return ext.isEmpty() ? "img" : ext;
    }

}
