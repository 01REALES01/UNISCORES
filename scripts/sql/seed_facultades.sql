-- Insertar facultades específicas para evitar agrupación incorrecta
INSERT INTO medallero (equipo_nombre, oro, plata, bronce, puntos) VALUES
('Ingeniería Civil', 0, 0, 0, 0),
('Ingeniería Mecánica', 0, 0, 0, 0),
('Ingeniería de Sistemas', 0, 0, 0, 0),
('Ingeniería Industrial', 0, 0, 0, 0),
('Medicina', 0, 0, 0, 0),
('Derecho', 0, 0, 0, 0),
('Psicología', 0, 0, 0, 0),
('Comunicación Social', 0, 0, 0, 0),
('Administración de Empresas', 0, 0, 0, 0),
('Arquitectura', 0, 0, 0, 0),
('Diseño', 0, 0, 0, 0),
('Odontología', 0, 0, 0, 0),
('Ciencias Políticas', 0, 0, 0, 0),
('Economía', 0, 0, 0, 0)
ON CONFLICT (equipo_nombre) DO NOTHING;

-- Opcional: Limpiar la entrada genérica 'Ingeniería' si existe y tiene 0 puntos para evitar confusión
DELETE FROM medallero WHERE equipo_nombre = 'Ingeniería' AND puntos = 0;
