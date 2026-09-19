"""Hook PostToolUse: avisa cuando se toca el contrato con la API.

`types/api.ts` y los `features/*/api.ts` son un espejo de los serializers del
backend. Aqui nada los valida: TypeScript comprueba que el codigo propio es
coherente consigo mismo, no que el servidor devuelva eso. Un campo mal
declarado compila y revienta en produccion como `undefined`.
"""

import json
import sys
from pathlib import Path

BACKEND = Path('c:/laragon/www/pilotssh/pilot-ssh-api')

RECORDATORIOS = {
    'types/api.ts': [
        'Comprueba los campos contra el serializer del backend.',
        f'  {BACKEND}/apps/<app>/serializers.py',
        'Un campo que el backend no manda llega como undefined, no como error.',
    ],
    'api.ts': [
        'Comprueba la ruta contra las urls del backend, sin barra final.',
        f'  {BACKEND}/apps/<app>/urls.py',
        'Si has anadido o cambiado un endpoint, la coleccion Bruno va en el',
        '  mismo trabajo: c:/laragon/www/_api/pilot-ssh-api-collection',
    ],
}


def elegir_recordatorio(ruta: Path) -> list[str] | None:
    normalizada = ruta.as_posix()

    if normalizada.endswith('src/types/api.ts'):
        return RECORDATORIOS['types/api.ts']
    if normalizada.endswith('/api.ts') and '/features/' in normalizada:
        return RECORDATORIOS['api.ts']
    return None


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    archivo = (entrada.get('tool_input') or {}).get('file_path', '')
    if not isinstance(archivo, str) or not archivo:
        return 0

    lineas = elegir_recordatorio(Path(archivo))
    if not lineas:
        return 0

    print(f'Contrato con la API tocado en {Path(archivo).name}:', file=sys.stderr)
    for linea in lineas:
        print(f'  {linea}', file=sys.stderr)

    return 0


if __name__ == '__main__':
    sys.exit(main())
