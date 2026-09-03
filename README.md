# docentia-contenidos

Cursos de Docentia en MDX + YAML. El código de la plataforma vive en
[docentia-plataforma](https://github.com/digitalwingsacademy/docentia-plataforma); el
razonamiento completo de este formato está en `docs/adr/ADR-002-formato-autoria.md` de ese repo.

## Estructura

```
cursos/
  <slug-del-curso>/
    curso.yml            # metadatos, version, orden de unidades
    unidades/
      01-nombre-unidad/
        unidad.yml
        01-leccion.mdx
        02-leccion.mdx
        quiz.yml          # solo si alguna seccion es de tipo "quiz"
    recursos/             # descargables e imagenes propias del curso
```

## Componentes MDX disponibles

Nada de HTML libre. El conjunto cerrado de componentes es: `<Video id="..." />`,
`<Presentacion src="..." />`, `<Aviso tipo="info|importante">`, `<Actividad>`, `<Descargable />`,
`<Comparativa>`. Si necesitas algo que no cubre esta lista, se añade como componente nuevo en la
plataforma — no se aprueba HTML crudo en un PR.

## Publicar un cambio

Mergear un PR en `main` publica el cambio en producción sin redesplegar la plataforma (ADR-001).
Antes de mergear:

1. Decide si el cambio es **estructural** (reordena/añade/quita secciones, cambia respuestas
   correctas de un quiz, cambia el `passingScore`) — si lo es, sube `version` en `curso.yml`
   (ver ADR-008). Un cambio no estructural (typo, texto, imagen) se publica en la misma versión.
2. Ejecuta `npm run content:validate` localmente.

## Validación

```
npm install
npm run content:validate
```

Se ejecuta también en CI en cada PR contra `main` (`.github/workflows/validate.yml`).
