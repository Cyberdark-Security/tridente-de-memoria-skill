# Así se ve un proyecto con el Tridente

Un proyecto imaginario, **Buzón de Phishing**, con los tres archivos ya vividos:
con decisiones tomadas, bugs documentados y una mina activa. Para que veas el
resultado antes de instalar nada.

```
buzon-de-phishing/
├── AGENTS.md                  ← el protocolo (copiado tal cual, no se toca)
├── CLAUDE.md                  ← 6 líneas, sólo si usas Claude Code
├── gemini.md                  ← 🧬 el ADN
├── plan_maestro.md            ← 🗺️ la brújula
├── lecciones_aprendidas.md    ← 🛡️ el escudo
└── src/ …                     ← tu código
```

De esos cinco, **tú sólo escribes tres**. `AGENTS.md` se copia de este
repositorio y no se toca; `CLAUDE.md` son seis líneas que apuntan a él.

---

## Qué cambia en la práctica

Sin Tridente, cada sesión nueva empieza así:

> — Vamos a añadir el guardado de adjuntos.
> — Perfecto, te propongo usar SQLAlchemy como ORM…

Con Tridente, el agente lee primero:

> — Vamos a añadir el guardado de adjuntos.
> — Leído el Tridente. Sin ORM (regla 2) y sin abrir adjuntos (regla 3), así que
> calculo el hash en streaming. Aviso: `analisis/adjuntos.py` está marcado como
> mina 🟡 por el límite de 100 entradas en los zip, y el 2026-10-05 ya hubo un
> bug con nombres de archivo que venían del correo. Genero el nombre yo.

La diferencia no es la inteligencia del modelo. Es que el segundo tenía memoria.

---

## 🧬 `gemini.md` — el ADN

```markdown
# 🧬 El ADN: Buzón de Phishing

> Archivo maestro 1/3 del Tridente de Memoria.
> Ver también: `plan_maestro.md` (La Brújula) · `lecciones_aprendidas.md` (El Escudo)

## Identidad y Propósito

- **Misión:** que cualquier empleado reenvíe un correo sospechoso a una dirección
  y reciba en menos de un minuto un veredicto automático.
- **Usuarios objetivo:** los 80 empleados de la empresa (reenvían) y las 2
  personas de seguridad (revisan la cola).

## Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | Python 3.12 + FastAPI |
| **Base de datos** | SQLite (un solo archivo, copia de seguridad diaria) |
| **Ingesta de correo** | IMAP contra el buzón `phishing@empresa.com` |
| **Infraestructura** | Un contenedor Docker en el servidor de la oficina |

## Reglas Innegociables

1. **El contenido de los correos no sale de la red de la empresa.** Se consultan
   hashes y dominios contra servicios externos, nunca el cuerpo ni los adjuntos.
2. Nada de ORM. Las consultas son SQL escrito a mano y revisable.
3. Ningún adjunto se abre, se descomprime ni se ejecuta. Sólo se calcula su hash.
4. Seguir el protocolo del Tridente: leer los 3 archivos antes de escribir código.

## Arquitectura y Estándares

- **Patrón:** tres módulos sin dependencias cruzadas — `ingesta/` (IMAP),
  `analisis/` (reglas y veredicto), `api/` (FastAPI y la cola de revisión).
- **Tests:** todo módulo de `analisis/` necesita test; la ingesta se prueba con
  correos guardados en `tests/fixtures/`, nunca contra el buzón real.
```

---

## 🗺️ `plan_maestro.md` — la brújula

```markdown
# 🗺️ La Brújula: Buzón de Phishing

## Próximo Hito

- **Objetivo:** veredicto automático para los casos obvios.
- **Fecha estimada:** 2026-11-15
- **Criterio de éxito:** 7 de cada 10 correos se resuelven sin que una persona
  los mire, y ninguno marcado como "limpio" resulta ser phishing real.

## Sprint Activo

- [x] Leer el buzón por IMAP y guardar cada correo como caso
- [x] Extraer remitente, dominios y hashes de adjuntos
- [ ] **Reglas de veredicto:** SPF/DKIM, dominio parecido al nuestro, enlace
      acortado, adjunto ejecutable
- [ ] **Respuesta automática** al que reporta, con el veredicto en lenguaje claro

## Bitácora de Decisiones

### 2026-10-08 — SQLite en vez de PostgreSQL

- **Decisión:** la base de datos es un único archivo SQLite.
- **Razón:** son 200 casos al mes y dos personas consultando. PostgreSQL añade
  un servicio que mantener, respaldar y actualizar a cambio de nada.
- **Impacto:** `gemini.md` → Stack. La copia de seguridad es copiar un archivo.
- **Relacionado:** si algún día hay varias oficinas escribiendo a la vez, esta
  decisión se revisa; está anotada como mina 🟡 en `lecciones_aprendidas.md`.

### 2026-10-03 — No abrir adjuntos, sólo calcular su hash

- **Decisión:** el sistema nunca descomprime ni abre un adjunto.
- **Razón:** abrir un adjunto de un correo de phishing en nuestro propio
  servidor es exactamente el ataque que intentamos detectar.
- **Impacto:** regla innegociable 3 en `gemini.md`.
```

---

## 🛡️ `lecciones_aprendidas.md` — el escudo

```markdown
# 🛡️ El Escudo: Buzón de Phishing

## Minas Activas

| Componente | Descripción | Estado |
| :--- | :--- | :--- |
| `ingesta/imap.py` | Si el buzón tiene más de 500 correos sin leer, la conexión IMAP expira a mitad de descarga y se pierden los casos ya marcados como leídos. Lee en lotes de 50. | 🔴 Activa |
| `analisis/adjuntos.py` | Un `.zip` con 10.000 archivos dentro tumba el cálculo de hashes por memoria. Hay un límite de 100 entradas; no lo subas sin medir. | 🟡 Vigilar |
| SQLite | Un solo escritor. Si algún día hay dos procesos de ingesta, esto se rompe en silencio con `database is locked`. | 🟡 Vigilar |
| Zona horaria | Resuelta: todo se guarda en UTC y se muestra en hora local. | 🟢 Limpio |

## Conocimiento Adquirido

### 2026-10-05 — Un adjunto con nombre `../../etc/passwd`

- **Problema:** al guardar los adjuntos para calcular su hash, el nombre venía
  del correo tal cual. Un nombre con `../` escribía fuera de la carpeta temporal.
- **Solución:** el archivo se guarda con un nombre generado por nosotros; el
  nombre original sólo se almacena como texto en la base de datos.
- **Prevención:** nada que venga de un correo se usa jamás como ruta de archivo.
- **Impacto en reglas:** Sí — reforzada la regla 3 en `gemini.md`.

### 2026-09-30 — El agente proponía un ORM en cada sesión

- **Problema:** cada sesión de IA nueva empezaba sugiriendo SQLAlchemy, aunque
  se había descartado tres veces.
- **Solución:** se instala el Tridente de Memoria y la prohibición queda escrita
  como regla innegociable en `gemini.md`.
- **Prevención:** leer los 3 archivos antes de escribir código.
- **Impacto en reglas:** Sí — regla 2 en `gemini.md`.
```
