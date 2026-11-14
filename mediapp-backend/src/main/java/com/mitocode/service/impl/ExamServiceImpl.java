package com.mitocode.service.impl;

import com.mitocode.model.Exam;
import com.mitocode.repo.IExamRepo;
import com.mitocode.repo.IGenericRepo;
import com.mitocode.service.IExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ExamServiceImpl extends CRUDImpl<Exam, Integer> implements IExamService {

    private final IExamRepo repo;

    @Override
    protected IGenericRepo<Exam, Integer> getRepo() {
        return repo;
    }




    /* ejercicio clase 2, refactor
    //@Autowired
    private final IExamRepo repo;

    @Override
    public Exam save(Exam exam) throws Exception {
        return repo.save(exam);
    }

    @Override
    public Exam update(Integer id, Exam exam) throws Exception {
        var _ = this.findById(id);

        exam.setIdExam(id);
        return repo.save(exam);
    }

    @Override
    public List<Exam> findAll() throws Exception {
        return repo.findAll();
    }

    @Override
    public Exam findById(Integer id) throws Exception {
        return repo.findById(id).orElseThrow(() -> new ModelNotFoundException("ID Not Found " + id));
    }

    @Override
    public void delete(Integer id) throws Exception {
        var _ = this.findById(id);
        repo.deleteById(id);
    }

    // ejercicio clase1
    private String txt;

    @Override
    public Exam validAndGetExam(Integer id) {
        //repo = new ExamRepo();
        if (id == null) {
            throw new RuntimeException("Id del examen es obligatorio");
        } else {
            return repo.findById(id);
        }
    }*/
}
