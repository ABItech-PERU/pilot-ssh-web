"""Hook PostToolUse: revisa comentarios nuevos contra 02-comment-standards.md.

Solo lo decidible por maquina; la redundancia del 02.2 y el estilo telegrafico
del 02.3 siguen siendo criterio humano. Y solo mira las lineas anadidas: el
archivo entero sacaria deuda vieja en cada edicion.

Los componentes de `components/ui/` los genera shadcn y quedan fuera: no son
codigo propio y reescribirlos rompe el siguiente `shadcn add`.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

MAX_LARGO = 80
MAX_LINEAS_SEGUIDAS = 2

EXTENSIONES = {'.ts', '.tsx', '.css'}
DIRECTORIOS_IGNORADOS = {'node_modules', 'dist', 'build', '.vite'}
RUTA_GENERADA = ('components', 'ui')

MULETILLAS = [
    'exitosamente', 'correctamente', 'simplemente', 'basicamente', 'básicamente',
    'obviamente', 'evidentemente', 'en resumen', 'cabe destacar', 'cabe mencionar',
    'es importante', 'hay que notar', 'notese que', 'nótese que', 'por supuesto',
]

NARRACION = [
    'ya ocurrio', 'ya ocurrió', 'ya paso', 'ya pasó', 'solia', 'solía',
    'antes hacia', 'antes hacía', 'antes era', 'antes se', 'lo arregle',
    'lo arreglé', 'quedo corregido', 'quedó corregido', 'era un bug',
    'se me paso', 'se me pasó', 'y con razon', 'y con razón',
]

REDUNDANCIA = [
    'importar ', 'importamos', 'devuelve el resultado', 'retorna el valor',
    'inicializa el estado', 'recorre el arreglo', 'recorre la lista',
    'define el componente', 'renderiza el componente', 'maneja el evento',
    'hook de react', 'estado local',
]

REGLA_REPETIDA = [
    'segun el rule', 'según el rule', 'como manda el rule', 'ver claude.md',
    'vive en features', 'va en features', 'el backend valida',
]


def es_revisable(ruta: str) -> bool:
    path = Path(ruta)
    if path.suffix not in EXTENSIONES:
        return False
    partes = path.parts
    if set(partes) & DIRECTORIOS_IGNORADOS:
        return False
    return not any(
        partes[indice:indice + 2] == RUTA_GENERADA for indice in range(len(partes) - 1)
    )


def lineas_anadidas(archivo: str, total: int) -> set[int]:
    """Numeros de linea nuevos segun git. Sin git, se revisa todo."""
    try:
        salida = subprocess.run(
            ['git', 'diff', '--unified=0', '--', archivo],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return set(range(1, total + 1))

    if salida.returncode != 0 or not salida.stdout.strip():
        return set(range(1, total + 1))

    nuevas: set[int] = set()
    for cabecera in re.finditer(
        r'^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@', salida.stdout, re.M
    ):
        inicio = int(cabecera.group(1))
        cuenta = int(cabecera.group(2) or 1)
        nuevas.update(range(inicio, inicio + cuenta))
    return nuevas


def extraer_comentario(linea: str) -> str | None:
    """Texto del comentario, o None si la linea no lo es.

    Una URL dentro de una cadena lleva `//` y no es un comentario: por eso
    solo cuenta cuando abre la linea.
    """
    limpia = linea.strip()

    if limpia.startswith('//'):
        return limpia.lstrip('/').strip()
    if limpia.startswith(('/*', '*/', '*')):
        return limpia.lstrip('/*').rstrip('*/').strip()
    return None


def revisar(lineas: list[str], nuevas: set[int]) -> list[str]:
    avisos: list[str] = []
    seguidas = 0

    for indice, linea in enumerate(lineas, start=1):
        comentario = extraer_comentario(linea)

        if comentario is None:
            seguidas = 0
            continue

        seguidas += 1

        if indice not in nuevas:
            continue

        if len(linea.rstrip()) > MAX_LARGO:
            avisos.append(f'L{indice}: supera {MAX_LARGO} caracteres (02.4)')

        if seguidas > MAX_LINEAS_SEGUIDAS:
            avisos.append(
                f'L{indice}: bloque de mas de {MAX_LINEAS_SEGUIDAS} lineas seguidas (02.4)'
            )

        bajo = comentario.lower()

        for frase in MULETILLAS:
            if frase in bajo:
                avisos.append(f'L{indice}: muletilla "{frase}" (02.2)')
                break

        for frase in NARRACION:
            if frase in bajo:
                avisos.append(
                    f'L{indice}: narra el incidente en vez de enunciar la regla (02.1)'
                )
                break

        for frase in REDUNDANCIA:
            if frase in bajo:
                avisos.append(f'L{indice}: repite lo que dice la sintaxis (02.2)')
                break

        for frase in REGLA_REPETIDA:
            if frase in bajo:
                avisos.append(f'L{indice}: repite una regla del proyecto (02.2)')
                break

    return avisos


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    archivo = (entrada.get('tool_input') or {}).get('file_path', '')

    if not isinstance(archivo, str) or not archivo or not es_revisable(archivo):
        return 0

    path = Path(archivo)
    if not path.is_file():
        return 0

    try:
        lineas = path.read_text(encoding='utf-8').splitlines()
    except (OSError, UnicodeDecodeError):
        return 0

    nuevas = lineas_anadidas(archivo, len(lineas))
    if not nuevas:
        return 0

    avisos = revisar(lineas, nuevas)
    if not avisos:
        return 0

    print(
        f'Comentarios a revisar en {path.name} (02-comment-standards.md):',
        file=sys.stderr,
    )
    for aviso in avisos[:12]:
        print(f'  - {aviso}', file=sys.stderr)

    return 0


if __name__ == '__main__':
    sys.exit(main())
