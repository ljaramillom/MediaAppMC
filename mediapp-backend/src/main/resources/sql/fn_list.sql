-- Funcion usada por IConsultRepo (callProcedureOrFunction*): cantidad de consultas por dia.
-- Ejecutar una sola vez en la BD (Supabase SQL Editor o psql). No se ejecuta al iniciar la app.
-- Tipos de retorno alineados con ConsultProcDTO: quantity -> Integer, consultdate -> String.
CREATE OR REPLACE FUNCTION fn_list()
RETURNS TABLE (quantity INTEGER, consultdate TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::INTEGER,
           TO_CHAR(c.consult_date, 'DD/MM/YYYY')
    FROM consult c
    GROUP BY TO_CHAR(c.consult_date, 'DD/MM/YYYY'), c.consult_date::DATE
    ORDER BY c.consult_date::DATE;
END;
$$;
