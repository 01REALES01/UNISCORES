import sys

file_path = '/tmp/match_detail_ff0ffb2.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# The problematic area is around line 445-450
# We want to remove the redundant block

fixed_lines = []
skip_indices = {444, 445, 446} # 0-indexed: 445, 446, 447

for i, line in enumerate(lines):
    if i in skip_indices:
        continue
    fixed_lines.append(line)

fixed_content = "".join(fixed_lines)

# Also fix the PARTIDO_SELECT to be more robust
old_select = """            const PARTIDO_SELECT = [
                'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria',
                'fase, grupo, bracket_order, delegacion_a, delegacion_b',
                'delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
                'disciplinas:disciplina_id(name)',
                'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
                'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
                'atleta_a:profiles!athlete_a_id(full_name, avatar_url)',
                'atleta_b:profiles!athlete_b_id(full_name, avatar_url)',
            ].join(', ');"""

new_select = """            const PARTIDO_SELECT = [
                'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria, fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
                'disciplinas:disciplina_id(name)',
                'carrera_a:carreras!carrera_a_id(id, nombre, escudo_url)',
                'carrera_b:carreras!carrera_b_id(id, nombre, escudo_url)',
                'atleta_a:profiles!athlete_a_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
                'atleta_b:profiles!athlete_b_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
                'delegacion_a_info:delegaciones!delegacion_a_id(id, escudo_url)',
                'delegacion_b_info:delegaciones!delegacion_b_id(id, escudo_url)'
            ].join(', ');"""

# In the file it might be slightly different due to formatting
# Let's use a simpler search/replace for the joins part

with open('/tmp/fixed_detail.tsx', 'w') as f:
    f.write(fixed_content)
