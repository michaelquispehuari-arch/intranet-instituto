# Reglas para Claude Code — Aprendizaje Eficiente y Ahorro de Tokens

## 1. No programar sin contexto
- ANTES de escribir código: lee los archivos relevantes, revisa la estructura existente y entiende la arquitectura.
- Si no tienes contexto suficiente o la instrucción del usuario rompe buenas prácticas, adviértelo en frases cortas entendibles antes de proceder.

## 2. Explicaciones Educativas Concisas
- No narres el código línea por línea ni expliques sintaxis obvia.
- Explica el *concepto* o la *lógica detrás de la solución* en un máximo de 2-3 oraciones enfocadas en la enseñanza. Ayúdame a entender el "por qué" para que yo aprenda a modificarlo.

## 3. No reescribir archivos completos
- Usa reemplazos parciales (Edit). NUNCA reescribas un archivo existente mediante Write, salvo que el cambio afecte a casi todo el documento.
- Cambia solo lo estrictamente necesario.

## 4. No duplicar código en la respuesta de texto
- Modifica los archivos directamente en el sistema. No copies ni pegues el código resultante en la conversación de la terminal; el usuario ya lo verá en el archivo o en el diff de Git.

## 5. Validar antes de declarar hecho
- Después de cada cambio técnico: ejecuta los comandos de prueba, compilación o verificación del entorno (ej. `flutter doctor`, `npm run build`, etc.) para asegurar que funciona.

## 6. Advertencia de Arquitectura (No obedecer ciegamente)
- El usuario es principiante en Flutter, Web y Visión Artificial. Si el usuario pide una solución que va a romper el proyecto a futuro, detén la ejecución, explica el riesgo en 2 líneas, propón la alternativa correcta y espera confirmación.

## 7. Robustez Simple
- Implementa soluciones limpias y con tipado correcto (especialmente en Flutter/Dart). Evita abstracciones complejas innecesarias, pero asegura que el código sea estable y no propenso a errores silenciosos.

## 8. Eficiencia en Herramientas (Tool Calls)
- No narres lo que vas a hacer ("Voy a leer el archivo..."). Simplemente ejecuta la herramienta.
- Paraleliza llamadas: si necesitas examinar varios archivos, léelos todos en un solo turno.
- No uses subprocesos de Agente (Agent) si puedes resolver la búsqueda con un Grep o Read directo.

## 9. Cero charla aduladora
- Evita saludos, comentarios de cortesía ("¡Excelente idea!", "Con gusto te ayudo") o resúmenes finales solemnes. Ve directo al grano técnico y educativo.