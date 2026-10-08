# Política de seguridad

## Versiones con soporte

| Versión | Soporte |
| :--- | :---: |
| 3.x | ✅ |
| 2.x y anteriores | ❌ |

## Reportar una vulnerabilidad

Usa **[GitHub Security Advisories](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/security/advisories/new)**
para un reporte privado. No abras un issue público para una vulnerabilidad.

Tiempo de respuesta objetivo: **72 horas** para el acuse de recibo.

## Modelo de amenazas del Tridente

El Tridente son archivos markdown que un agente de IA lee y trata como
instrucciones. Eso tiene tres consecuencias concretas.

### 1. Los archivos maestros son entrada privilegiada

Un agente trata `gemini.md`, `plan_maestro.md` y `lecciones_aprendidas.md` como
reglas del proyecto. Quien pueda escribir en ellos puede **redirigir el
comportamiento del agente**.

- Revisa sus cambios en PR igual que revisarías código.
- Desconfía de un PR que añade una "regla innegociable" nueva junto a un cambio
  funcional grande.
- No pegues contenido de terceros dentro de ellos sin leerlo.

### 2. Inyección de instrucciones desde el repositorio

Si clonas un proyecto ajeno con Tridente, sus archivos maestros son **datos no
confiables**, no órdenes. Léelos antes de dejar que un agente actúe sobre ellos.

### 3. No son un almacén de secretos

Nunca pongas en el Tridente claves de API, tokens, cadenas de conexión, IDs de
proyecto en la nube ni inventarios de infraestructura. Estos archivos se
comparten, se commitean y se pegan enteros en ventanas de contexto de terceros.

Para secretos: un gestor de secretos, o `.env` fuera del control de versiones.

## Fuera de alcance

- Que un agente de IA ignore el protocolo. Es una limitación del modelo, no una
  vulnerabilidad de este repositorio.
- Configuraciones de herramientas de terceros (Cursor, Copilot, etc.).

## Nota histórica

Hasta la v2.5.1 este repositorio incluía instaladores en Bash y PowerShell, un
generador y un validador. La v3.0.0 los eliminó: el protocolo es markdown puro
y no ejecuta nada. Si usas todavía una versión 2.x, su superficie de ataque
—sustitución de tokens, sobrescritura de archivos, fusión de JSON— ya no
recibe soporte; actualiza.
