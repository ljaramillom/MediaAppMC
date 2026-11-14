package com.mitocode.service.impl;

import com.mitocode.dto.ConsultProcDTO;
import com.mitocode.dto.IConsultProcDTO;
import com.mitocode.model.Consult;
import com.mitocode.model.Exam;
import com.mitocode.repo.IConsultExamRepo;
import com.mitocode.repo.IConsultRepo;
import com.mitocode.repo.IGenericRepo;
import com.mitocode.service.IConsultService;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConsultServiceImpl extends CRUDImpl<Consult, Integer> implements IConsultService {

    private final IConsultRepo consultRepo;
    private final IConsultExamRepo consultExamRepo;

    @Override
    protected IGenericRepo<Consult, Integer> getRepo() {
        return consultRepo;
    }

    // rollbackFor: por defecto Spring solo hace rollback con excepciones no verificadas (RuntimeException)
    @Transactional(rollbackFor = Exception.class)
    @Override
    public Consult saveTransactional(Consult consult, List<Exam> exams) throws Exception {
        // 1. Referencia inversa: sin esto id_consult de consult_detail quedaria en null
        consult.getDetails().forEach(d -> d.setConsult(consult));

        // 2. INSERT consult + consult_detail (cascada); con IDENTITY el id ya esta disponible
        consultRepo.save(consult);

        // 3. INSERT consult_exam por cada examen
        exams.forEach(ex -> consultExamRepo.saveExam(consult.getIdConsult(), ex.getIdExam()));

        // Cualquier falla en los pasos 2 o 3 revierte todo: no queda ninguna fila en las tres tablas
        return consult;
    }

    @Override
    public Consult update(Integer id, Consult consult) throws Exception {
        // Los examenes no se modifican; los detalles quitados de la lista no se eliminan (no hay orphanRemoval)
        consult.getDetails().forEach(d -> d.setConsult(consult));
        return super.update(id, consult);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(Integer id) throws Exception {
        // Primero consult_exam; si no, la restriccion fk_consult_exam_consult impide eliminar la consulta
        consultExamRepo.deleteByConsult(id);
        // Elimina la consulta y sus detalles en cascada
        super.delete(id);
    }

    // Consultas de busqueda: delegan directo al repositorio
    @Override
    public List<Consult> search(String dni, String fullname) {
        return consultRepo.search(dni, fullname);
    }

    @Override
    public List<Consult> searchByDates(LocalDateTime date1, LocalDateTime date2) {
        return consultRepo.searchByDates(date1, date2);
    }

    @Override
    public List<ConsultProcDTO> callProcedureOrFunctionManual() {
        List<ConsultProcDTO> list = new ArrayList<>();
        consultRepo.callProcedureOrFunctionManual().forEach(el -> {;
            ConsultProcDTO dto = new ConsultProcDTO();
            dto.setQuantity((Integer) el[0]);
            dto.setConsultdate(el[1].toString());
            list.add(dto);
        });
        return list;
    }

    @Override
    public List<ConsultProcDTO> callProcedureOrFunctionNative() {
        return consultRepo.callProcedureOrFunctionNative();
    }

    @Override
    public List<IConsultProcDTO> callProcedureOrFunctionProjection() {
        return consultRepo.callProcedureOrFunctionProjection();
    }

    @Override
    public byte[] generateReport() throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("txt_title", "Reporte de Consultas");

        File file = new ClassPathResource("/reports/consultas.jasper").getFile();
        JasperPrint print = JasperFillManager.fillReport(file.getPath(), params, new JRBeanCollectionDataSource(callProcedureOrFunctionNative()));
        return JasperExportManager.exportReportToPdf(print);
    }
}
