# Comun a los scripts: se situa en la carpeta del proyecto y carga su .env.
# La IMAGE_TAG pedida al llamar gana a la del .env; vacia, la del ambiente

cd "$(dirname "$0")/../.."
pedida="${IMAGE_TAG:-}"

# Linea a linea, sin interpretar: los valores llevan espacios y signos
while IFS='=' read -r clave valor; do
  case "$clave" in '' | \#*) continue ;; esac
  export "$clave=$valor"
done < .env

export IMAGE_TAG="${pedida:-${IMAGE_TAG:-$APP_ENV}}"
