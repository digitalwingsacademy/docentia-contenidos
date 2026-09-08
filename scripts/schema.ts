import { z } from "zod";

// Copia deliberada de lib/content/schema.ts en docentia-plataforma (ADR-002:
// "se duplican deliberadamente con un test de contrato"). El test de
// contrato entre ambos repos queda pendiente como mejora — hoy la garantia
// es que cualquier cambio de forma se nota porque ambos validadores fallan
// a la vez con contenido real, no que haya un check automatico cruzado.

export const seccionTipoSchema = z.enum(["video", "texto", "quiz", "actividad"]);

export const unidadYmlSchema = z.object({
  titulo: z.string().min(1),
  orden: z.number().int().positive(),
  fase: z.string().optional(),
  secciones: z
    .array(
      z.object({
        id: z.string().min(1),
        archivo: z.string().min(1),
        tipo: seccionTipoSchema,
        titulo: z.string().min(1),
        duracionMinutos: z.number().int().positive(),
        orden: z.number().int().positive(),
        obligatoria: z.boolean().default(true),
      })
    )
    .min(1),
});
export type UnidadYml = z.infer<typeof unidadYmlSchema>;

export const quizPreguntaSchema = z.object({
  id: z.string().min(1),
  enunciado: z.string().min(1),
  opciones: z.array(z.object({ id: z.string().min(1), texto: z.string().min(1) })).min(2),
  respuestaCorrectaId: z.string().min(1),
  explicacion: z.string().optional(),
});

export const quizYmlSchema = z.object({
  passingScore: z.number().min(0).max(100),
  maxIntentos: z.number().int().positive().default(3),
  criterioAprobado: z.enum(["mejor_intento", "ultimo_intento"]).default("mejor_intento"),
  preguntas: z.array(quizPreguntaSchema).min(1),
});
export type QuizYml = z.infer<typeof quizYmlSchema>;

// Actividades interactivas (docs/formato-actividades.md en docentia-plataforma).
// Por ahora solo se implementa el subtipo rellenar-huecos.
export const huecoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  respuesta: z.string().min(1),
  acepta: z.array(z.string().min(1)).optional(),
  pista: z.string().optional(),
});

export const reintentosSchema = z.object({
  maximos: z.union([z.number().int().positive(), z.literal("ilimitado")]).default("ilimitado"),
  mostrarSolucionAl: z.enum(["siempre", "agotar_intentos", "nunca"]).default("siempre"),
});

export const rellenarHuecosYmlSchema = z.object({
  tipo: z.literal("rellenar-huecos"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  bancoPalabras: z.boolean(),
  texto: z.string().min(1),
  huecos: z.array(huecoSchema).min(1),
});
export type RellenarHuecosYml = z.infer<typeof rellenarHuecosYmlSchema>;

// Tipos de valoracion humana (docs/formato-actividades.md #3 en
// docentia-plataforma): ninguno usa modo ni reintentos.
export const grabacionAudioYmlSchema = z.object({
  tipo: z.literal("grabacion-audio"),
  instrucciones: z.string().min(1),
  duracionGrabacionSegundos: z.number().int().positive(),
  preparacionSegundos: z.number().int().min(0).default(0),
  rubricaId: z.string().nullable().default(null),
});
export type GrabacionAudioYml = z.infer<typeof grabacionAudioYmlSchema>;

export const foroYmlSchema = z.object({
  tipo: z.literal("foro"),
  instrucciones: z.string().min(1),
  palabrasMinimasPublicacion: z.number().int().positive(),
  requiereRespuesta: z.boolean().default(true),
});
export type ForoYml = z.infer<typeof foroYmlSchema>;

export const parSchema = z.object({
  id: z.union([z.string(), z.number()]),
  termino: z.string().min(1),
  definicion: z.string().min(1),
});
export const emparejarYmlSchema = z.object({
  tipo: z.literal("emparejar"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  pares: z.array(parSchema).min(2),
});
export type EmparejarYml = z.infer<typeof emparejarYmlSchema>;

export const categoriaSchema = z.object({
  id: z.string().min(1),
  etiqueta: z.string().min(1),
  ejemplo: z.string().min(1),
});
export const itemClasificarSchema = z.object({
  id: z.union([z.string(), z.number()]),
  texto: z.string().min(1),
  categoriaId: z.string().min(1),
});
export const clasificarYmlSchema = z.object({
  tipo: z.literal("clasificar"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  categorias: z.array(categoriaSchema).min(2),
  items: z.array(itemClasificarSchema).min(1),
});
export type ClasificarYml = z.infer<typeof clasificarYmlSchema>;

export const eventoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  texto: z.string().min(1),
  posicion: z.number().int().positive(),
});
export const ordenarYmlSchema = z.object({
  tipo: z.literal("ordenar"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  eventos: z.array(eventoSchema).min(2),
});
export type OrdenarYml = z.infer<typeof ordenarYmlSchema>;

// opcion-multiple reutiliza quizPreguntaSchema. Solo se implementa el
// estimulo `texto` por ahora - `audio` necesita el mismo pipeline de
// Storage que grabacion-audio.
export const estimuloTextoSchema = z.object({
  tipo: z.literal("texto"),
  contenido: z.string().min(1),
});
export const opcionMultipleYmlSchema = z.object({
  tipo: z.literal("opcion-multiple"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  estimulo: estimuloTextoSchema,
  preguntas: z.array(quizPreguntaSchema).min(1),
});
export type OpcionMultipleYml = z.infer<typeof opcionMultipleYmlSchema>;

export const marcarPalabrasYmlSchema = z.object({
  tipo: z.literal("marcar-palabras"),
  instrucciones: z.string().min(1),
  modo: z.enum(["practica", "evaluacion"]).default("practica"),
  reintentos: reintentosSchema.default({ maximos: "ilimitado", mostrarSolucionAl: "siempre" }),
  texto: z.string().min(1),
  palabrasCorrectas: z.array(z.string().min(1)).min(1),
});
export type MarcarPalabrasYml = z.infer<typeof marcarPalabrasYmlSchema>;

export const actividadYmlSchema = z.discriminatedUnion("tipo", [
  rellenarHuecosYmlSchema,
  grabacionAudioYmlSchema,
  foroYmlSchema,
  emparejarYmlSchema,
  clasificarYmlSchema,
  ordenarYmlSchema,
  opcionMultipleYmlSchema,
  marcarPalabrasYmlSchema,
]);
export type ActividadYml = z.infer<typeof actividadYmlSchema>;

export const cursoYmlSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "el slug solo admite minusculas, numeros y guiones"),
  version: z.number().int().positive(),
  titulo: z.string().min(1),
  resumen: z.string().min(1),
  horasEstimadas: z.number().positive(),
  unidades: z.array(z.string().min(1)).min(1),
});
export type CursoYml = z.infer<typeof cursoYmlSchema>;
