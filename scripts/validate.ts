/**
 * content:validate (ADR-002) — falla en CI ante: YAML mal formado, ordenes
 * con huecos o duplicados, ficheros referenciados que no existen, quiz sin
 * respuesta correcta valida, o ficheros .mdx huerfanos.
 *
 * No comprueba que los <Video id="..."/> referenciados existan en el
 * manifiesto de video_assets (vive en Supabase, no accesible desde el CI de
 * este repo) - esa comprobacion la hace el pipeline de publicacion en
 * docentia-plataforma al sincronizar el curso.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as parseYaml } from "js-yaml";
import { cursoYmlSchema, unidadYmlSchema, quizYmlSchema, actividadYmlSchema, checklistYmlSchema } from "./schema";

const CURSOS_DIR = "cursos";
const errors: string[] = [];

function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, "utf8"));
}

function checkOrdenSinHuecos(items: { orden: number }[], context: string) {
  const ordenes = items.map((i) => i.orden).sort((a, b) => a - b);
  const esperado = ordenes.map((_, i) => i + 1);
  if (JSON.stringify(ordenes) !== JSON.stringify(esperado)) {
    errors.push(`${context}: los valores de "orden" tienen huecos o duplicados: [${ordenes.join(", ")}]`);
  }
}

function validateCurso(slug: string) {
  const cursoDir = join(CURSOS_DIR, slug);
  const cursoPath = join(cursoDir, "curso.yml");
  const parsedCurso = cursoYmlSchema.safeParse(readYaml(cursoPath));

  if (!parsedCurso.success) {
    errors.push(`${cursoPath}: ${parsedCurso.error.message}`);
    return;
  }
  const curso = parsedCurso.data;

  if (curso.slug !== slug) {
    errors.push(`${cursoPath}: el campo slug ("${curso.slug}") no coincide con el nombre de carpeta ("${slug}")`);
  }

  const referencedFiles = new Set<string>();

  for (const unidadDir of curso.unidades) {
    const unidadPath = join(cursoDir, "unidades", unidadDir, "unidad.yml");
    if (!existsSync(unidadPath)) {
      errors.push(`${cursoPath}: unidad "${unidadDir}" listada pero no existe ${unidadPath}`);
      continue;
    }

    const parsedUnidad = unidadYmlSchema.safeParse(readYaml(unidadPath));
    if (!parsedUnidad.success) {
      errors.push(`${unidadPath}: ${parsedUnidad.error.message}`);
      continue;
    }
    const unidad = parsedUnidad.data;
    checkOrdenSinHuecos(unidad.secciones, `${unidadPath}: secciones`);

    for (const seccion of unidad.secciones) {
      const archivoPath = join(cursoDir, "unidades", unidadDir, seccion.archivo);
      referencedFiles.add(archivoPath);

      if (!existsSync(archivoPath)) {
        errors.push(`${unidadPath}: la seccion "${seccion.id}" referencia "${seccion.archivo}", que no existe`);
        continue;
      }

      if (seccion.tipo === "quiz") {
        const parsedQuiz = quizYmlSchema.safeParse(readYaml(archivoPath));
        if (!parsedQuiz.success) {
          errors.push(`${archivoPath}: ${parsedQuiz.error.message}`);
          continue;
        }
        for (const pregunta of parsedQuiz.data.preguntas) {
          const idsValidos = pregunta.opciones.map((o) => o.id);
          if (!idsValidos.includes(pregunta.respuestaCorrectaId)) {
            errors.push(
              `${archivoPath}: la pregunta "${pregunta.id}" tiene respuestaCorrectaId "${pregunta.respuestaCorrectaId}" que no coincide con ninguna opcion (${idsValidos.join(", ")})`
            );
          }
        }
      }

      if (seccion.tipo === "actividad") {
        const parsedActividad = actividadYmlSchema.safeParse(readYaml(archivoPath));
        if (!parsedActividad.success) {
          errors.push(`${archivoPath}: ${parsedActividad.error.message}`);
          continue;
        }
        const actividad = parsedActividad.data;

        if (actividad.tipo === "rellenar-huecos") {
          const idsEnTexto = [...actividad.texto.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
          const idsEnHuecos = actividad.huecos.map((h) => String(h.id));
          const faltanEnTexto = idsEnHuecos.filter((id) => !idsEnTexto.includes(id));
          const faltanEnHuecos = idsEnTexto.filter((id) => !idsEnHuecos.includes(id));
          if (faltanEnTexto.length > 0) {
            errors.push(`${archivoPath}: los huecos [${faltanEnTexto.join(", ")}] no aparecen como {{id}} en "texto"`);
          }
          if (faltanEnHuecos.length > 0) {
            errors.push(`${archivoPath}: "texto" referencia {{${faltanEnHuecos.join("}}, {{")}} sin un hueco declarado`);
          }
        }

        if (actividad.tipo === "emparejar") {
          const terminos = actividad.pares.map((p) => p.termino.trim().toLowerCase());
          const definiciones = actividad.pares.map((p) => p.definicion.trim().toLowerCase());
          const terminosDup = terminos.filter((t, i) => terminos.indexOf(t) !== i);
          const definicionesDup = definiciones.filter((d, i) => definiciones.indexOf(d) !== i);
          if (terminosDup.length > 0) {
            errors.push(`${archivoPath}: terminos duplicados: [${[...new Set(terminosDup)].join(", ")}]`);
          }
          if (definicionesDup.length > 0) {
            errors.push(`${archivoPath}: definiciones duplicadas: [${[...new Set(definicionesDup)].join(", ")}]`);
          }
        }

        if (actividad.tipo === "clasificar") {
          const idsCategorias = actividad.categorias.map((c) => c.id);
          for (const item of actividad.items) {
            if (!idsCategorias.includes(item.categoriaId)) {
              errors.push(
                `${archivoPath}: el item "${item.id}" referencia categoriaId "${item.categoriaId}", que no existe (${idsCategorias.join(", ")})`
              );
            }
          }
        }

        if (actividad.tipo === "ordenar") {
          const posiciones = actividad.eventos.map((e) => e.posicion);
          const dup = posiciones.filter((p, i) => posiciones.indexOf(p) !== i);
          if (dup.length > 0) {
            errors.push(`${archivoPath}: posiciones duplicadas: [${[...new Set(dup)].join(", ")}]`);
          }
        }

        if (actividad.tipo === "opcion-multiple") {
          for (const pregunta of actividad.preguntas) {
            const idsValidos = pregunta.opciones.map((o) => o.id);
            if (!idsValidos.includes(pregunta.respuestaCorrectaId)) {
              errors.push(
                `${archivoPath}: la pregunta "${pregunta.id}" tiene respuestaCorrectaId "${pregunta.respuestaCorrectaId}" que no coincide con ninguna opcion (${idsValidos.join(", ")})`
              );
            }
          }
        }

        if (actividad.tipo === "marcar-palabras") {
          for (const palabra of actividad.palabrasCorrectas) {
            if (!actividad.texto.includes(palabra)) {
              errors.push(`${archivoPath}: "${palabra}" no aparece como substring literal de "texto"`);
            }
          }
        }

        if (actividad.tipo === "revision-entre-pares") {
          const checklistPath = join(cursoDir, "unidades", unidadDir, actividad.checklist);
          if (!existsSync(checklistPath)) {
            errors.push(`${archivoPath}: referencia el checklist "${actividad.checklist}", que no existe`);
          } else {
            const parsedChecklist = checklistYmlSchema.safeParse(readYaml(checklistPath));
            if (!parsedChecklist.success) {
              errors.push(`${checklistPath}: ${parsedChecklist.error.message}`);
            }
          }
        }
      }
    }

    // Ficheros .mdx en la carpeta de la unidad que ningun unidad.yml referencia.
    const filesInDir = readdirSync(join(cursoDir, "unidades", unidadDir)).filter((f) => f.endsWith(".mdx"));
    for (const file of filesInDir) {
      const fullPath = join(cursoDir, "unidades", unidadDir, file);
      if (!referencedFiles.has(fullPath)) {
        errors.push(`${fullPath}: fichero .mdx huerfano, no referenciado desde ningun unidad.yml`);
      }
    }
  }
}

function main() {
  if (!existsSync(CURSOS_DIR)) {
    console.error(`No existe el directorio "${CURSOS_DIR}".`);
    process.exit(1);
  }

  const slugs = readdirSync(CURSOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const slug of slugs) {
    validateCurso(slug);
  }

  if (errors.length > 0) {
    console.error(`content:validate encontro ${errors.length} problema(s):\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`content:validate OK — ${slugs.length} curso(s) validados sin errores.`);
}

main();
