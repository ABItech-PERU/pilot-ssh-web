"""Rechaza un `git commit` cuyo mensaje incumpla 03-git-commits.md.

Corre antes de ejecutar el comando, asi que un mensaje mal formado nunca llega
al historial: reescribirlo despues obliga a un rebase.
"""

import json
import re
import shlex
import sys

MAX_ASUNTO = 50
MAX_CUERPO = 72

TIPOS = [
    'feat', 'fix', 'docs', 'style', 'refactor',
    'perf', 'test', 'chore', 'ci', 'revert',
]

# Terminaciones que delatan pasado o gerundio en el verbo inicial
NO_IMPERATIVO = ('ado', 'ido', 'ando', 'endo')

PATRON_COMMIT = re.compile(r'(^|[;&|]\s*)git\s+(-\S+\s+)*commit\b')
PATRON_ASUNTO = re.compile(r'^(?P<tipo>[a-z]+)(\((?P<ambito>[a-z0-9\-/]+)\))?: (?P<desc>.+)$')


def es_commit(comando: str) -> bool:
    if not PATRON_COMMIT.search(comando):
        return False
    # --no-edit reutiliza el mensaje anterior: nada nuevo que revisar
    return not re.search(r'\s--no-edit\b', comando)


def extraer_mensaje(comando: str) -> str | None:
    """El mensaje tal y como viaja en el comando, o None si lo abre un editor."""
    try:
        partes = shlex.split(comando)
    except ValueError:
        return None

    for indice, parte in enumerate(partes):
        if parte in ('-m', '--message') and indice + 1 < len(partes):
            return partes[indice + 1]
        if parte.startswith('--message='):
            return parte.split('=', 1)[1]
        if parte.startswith('-m') and len(parte) > 2:
            return parte[2:]

    return None


def revisar(mensaje: str) -> list[str]:
    fallos: list[str] = []
    lineas = mensaje.split('\n')
    asunto = lineas[0].strip()

    if not asunto:
        return ['el asunto esta vacio']

    encaje = PATRON_ASUNTO.match(asunto)
    if not encaje:
        fallos.append('no sigue <tipo>(<ambito>): <descripcion>')
        return fallos

    tipo = encaje.group('tipo')
    descripcion = encaje.group('desc')

    if tipo not in TIPOS:
        fallos.append(f'tipo "{tipo}" no permitido: {", ".join(TIPOS)}')

    if len(asunto) > MAX_ASUNTO:
        fallos.append(f'el asunto mide {len(asunto)}, maximo {MAX_ASUNTO}')

    if asunto.endswith('.'):
        fallos.append('el asunto no termina en punto')

    primera = descripcion.split(' ', 1)[0]

    # Las siglas van en mayuscula: JWT, SSH, API no son un fallo de estilo
    if primera[:1].isupper() and not primera.isupper():
        fallos.append('la descripcion va en minusculas')

    verbo = primera.lower()
    if verbo.endswith(NO_IMPERATIVO):
        fallos.append(f'"{verbo}" no es imperativo: usa agregar, corregir, actualizar')

    if len(lineas) > 1 and lineas[1].strip():
        fallos.append('falta la linea en blanco entre asunto y cuerpo')

    for numero, linea in enumerate(lineas[2:], start=3):
        if len(linea) > MAX_CUERPO:
            fallos.append(f'linea {numero} del cuerpo mide {len(linea)}, maximo {MAX_CUERPO}')
            break

    if 'Co-Authored-By' in mensaje or 'Generated with' in mensaje:
        fallos.append('prohibido el trailer de coautoria de IA')

    return fallos


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    comando = (entrada.get('tool_input') or {}).get('command', '')

    if not isinstance(comando, str) or not es_commit(comando):
        return 0

    mensaje = extraer_mensaje(comando)

    # Sin mensaje inline lo escribe una persona en el editor: nada que revisar
    if mensaje is None:
        return 0

    fallos = revisar(mensaje)
    if not fallos:
        return 0

    print('El mensaje incumple 03-git-commits.md:', file=sys.stderr)
    for fallo in fallos:
        print(f'  - {fallo}', file=sys.stderr)
    print('Formato: <tipo>(<ambito>): <descripcion> - en minusculas,', file=sys.stderr)
    print(f'maximo {MAX_ASUNTO} caracteres, verbo imperativo y sin punto final.', file=sys.stderr)

    return 2


if __name__ == '__main__':
    sys.exit(main())
