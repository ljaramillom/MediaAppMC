package com.mitocode.repo;

import com.mitocode.model.ConsultExam;
import com.mitocode.model.ConsultExamPK;
import com.mitocode.model.Exam;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IConsultExamRepo extends IGenericRepo<ConsultExam, ConsultExamPK> {

    // INSERT nativo: ConsultExam no es alcanzable desde Consult, se registra explicitamente
    @Modifying
    @Query(value = "INSERT INTO consult_exam(id_consult, id_exam) VALUES (:idConsult, :idExam)", nativeQuery = true)
    Integer saveExam(@Param("idConsult") Integer idConsult, @Param("idExam") Integer idExam);

    // Elimina los examenes de una consulta antes de eliminar la consulta (fk_consult_exam_consult)
    @Modifying
    @Query(value = "DELETE FROM consult_exam WHERE id_consult = :idConsult", nativeQuery = true)
    Integer deleteByConsult(@Param("idConsult") Integer idConsult);

    // Examenes de una consulta a traves de la entidad de union; id desconocido = lista vacia
    @Query("SELECT ce.exam FROM ConsultExam ce WHERE ce.consult.idConsult = :idConsult")
    List<Exam> getExamsByConsultId(@Param("idConsult") Integer idConsult);
}
