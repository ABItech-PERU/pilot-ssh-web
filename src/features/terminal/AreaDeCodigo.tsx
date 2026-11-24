import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  LanguageDescription,
  syntaxHighlighting,
} from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorSelection, EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { classHighlighter } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

interface Props {
  texto: string
  nombre: string
  soloLectura: boolean
  /** Llegó solo el final del archivo. Abre ahí, como `tail`, y sin números
   *  de línea, que no serían los del archivo. */
  soloElFinal: boolean
  onCambiar: (texto: string) => void
  onLenguaje: (lenguaje: string) => void
}

/** Archivos de servidor sin extensión que el catálogo no reconoce. */
const SIN_EXTENSION: [RegExp, string][] = [
  [/^\.env(\..+)?$/, 'Properties files'],
  [/^\.(bashrc|bash_profile|bash_aliases|profile|zshrc)$/, 'Shell'],
]

const NOMBRE_VISIBLE: Record<string, string> = { 'Properties files': 'INI' }

function buscarLenguaje(nombre: string): LanguageDescription | null {
  const conocido = SIN_EXTENSION.find(([patron]) => patron.test(nombre))
  if (conocido) return LanguageDescription.matchLanguageName(languages, conocido[1], false)
  return LanguageDescription.matchFilename(languages, nombre)
}

const FRASES: Record<string, string> = {
  Find: 'Buscar',
  Replace: 'Reemplazar',
  next: 'siguiente',
  previous: 'anterior',
  all: 'todas',
  'match case': 'mayúsculas',
  regexp: 'expresión regular',
  'by word': 'palabra entera',
  replace: 'reemplazar',
  'replace all': 'reemplazar todas',
  close: 'cerrar',
  'current match': 'coincidencia actual',
  'on line': 'en la línea',
  'replaced $ matches': '$ reemplazos',
  'replaced match on line $': 'reemplazo en la línea $',
  'Go to line': 'Ir a la línea',
  go: 'ir',
  'Folded lines': 'Líneas plegadas',
  'Unfolded lines': 'Líneas desplegadas',
  to: 'a',
  'folded code': 'código plegado',
  unfold: 'desplegar',
  'Control character': 'Carácter de control',
  'Selection deleted': 'Selección borrada',
}

/** La flecha de plegar, que se ve al pasar por el margen, como en VS Code. */
function crearMarcaDePliegue(abierto: boolean) {
  const marca = document.createElement('span')
  marca.className = abierto ? 'cm-pliegue' : 'cm-pliegue cm-pliegue-cerrado'
  marca.textContent = abierto ? '⌄' : '›'
  marca.title = abierto ? 'Plegar' : 'Desplegar'
  return marca
}

/** Sobre el fondo de la terminal, que es oscuro en los dos temas. */
const conTinte = (color: string, peso: number) =>
  `color-mix(in oklch, var(${color}) ${peso}%, transparent)`

const TEMA = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      color: 'var(--term-text)',
      backgroundColor: 'var(--term-bg)',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.25rem' },
    '.cm-content': { caretColor: 'var(--term-cmd)', paddingBlock: '8px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--term-cmd)' },
    '.cm-gutters': {
      color: 'var(--term-dim)',
      backgroundColor: 'var(--term-bg)',
      borderRight: '1px solid var(--term-border)',
    },
    '.cm-lineNumbers .cm-gutterElement': { paddingInline: '12px 8px' },
    '.cm-activeLine': { backgroundColor: 'oklch(1 0 0 / 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--term-text)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: conTinte('--term-cmd', 28) },
    '.cm-selectionMatch': { backgroundColor: conTinte('--term-cmd', 14) },
    '.cm-searchMatch': {
      backgroundColor: conTinte('--term-arg', 22),
      outline: `1px solid ${conTinte('--term-arg', 60)}`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: conTinte('--term-arg', 45) },
    '&.cm-focused .cm-matchingBracket': {
      backgroundColor: conTinte('--term-cmd', 20),
      outline: `1px solid ${conTinte('--term-cmd', 50)}`,
    },
    '.cm-pliegue': { opacity: '0', transition: 'opacity 150ms', cursor: 'pointer' },
    '.cm-gutters:hover .cm-pliegue, .cm-pliegue-cerrado': { opacity: '1' },
    '@media (pointer: coarse)': { '.cm-pliegue': { opacity: '1' } },
    '.cm-foldPlaceholder': {
      color: 'var(--term-dim)',
      backgroundColor: 'transparent',
      border: '1px solid var(--term-border)',
    },
    '.cm-panels': {
      color: 'var(--term-text)',
      backgroundColor: 'var(--term-bg)',
    },
    '.cm-panels-top': { borderBottom: '1px solid var(--term-border)' },
    '.cm-panel.cm-search': { padding: '6px 36px 6px 8px', fontSize: '13px' },
    '.cm-panel.cm-search input, .cm-panel.cm-search button': { fontSize: '13px' },
    '.cm-panel.cm-search label': { fontSize: '12px', color: 'var(--term-dim)' },
    '.cm-panel.cm-search [name=close]': { color: 'var(--term-dim)', fontSize: '18px', top: '6px', right: '10px' },
    '.cm-textfield': {
      color: 'inherit',
      backgroundColor: 'oklch(1 0 0 / 0.05)',
      border: '1px solid var(--term-border)',
      borderRadius: '4px',
      padding: '3px 6px',
    },
    '.cm-textfield:focus': { outline: '1px solid var(--term-cmd)', borderColor: 'transparent' },
    '.cm-button': {
      color: 'inherit',
      backgroundImage: 'none',
      backgroundColor: 'transparent',
      border: '1px solid var(--term-border)',
      borderRadius: '4px',
      padding: '3px 8px',
    },
    '.cm-button:hover': { backgroundColor: 'oklch(1 0 0 / 0.06)' },
    '.tok-keyword, .tok-operatorKeyword, .tok-modifier': { color: 'var(--term-host)' },
    '.tok-string': { color: 'var(--term-ok)' },
    '.tok-string2': { color: 'var(--term-user)' },
    '.tok-number, .tok-bool, .tok-atom, .tok-literal': { color: 'var(--term-arg)' },
    '.tok-propertyName, .tok-attributeName, .tok-heading': { color: 'var(--term-cmd)' },
    '.tok-typeName, .tok-className, .tok-namespace, .tok-macroName, .tok-labelName': {
      color: 'var(--term-arg)',
    },
    '.tok-comment, .tok-meta': { color: 'var(--term-dim)', fontStyle: 'italic' },
    '.tok-inserted': { color: 'var(--term-ok)' },
    '.tok-deleted, .tok-invalid': { color: 'var(--term-root)' },
    '.tok-heading, .tok-strong': { fontWeight: '600' },
    '.tok-emphasis': { fontStyle: 'italic' },
    '.tok-link, .tok-url': { color: 'var(--term-host)', textDecoration: 'underline' },
  },
  { dark: true },
)

/** El texto de un archivo con números de línea, colores según su lenguaje y
 *  el buscador de Ctrl+F. Va aparte para cargar CodeMirror solo al abrir. */
export default function AreaDeCodigo({
  texto,
  nombre,
  soloLectura,
  soloElFinal,
  onCambiar,
  onLenguaje,
}: Props) {
  const contenedor = useRef<HTMLDivElement | null>(null)
  const avisos = useRef({ onCambiar, onLenguaje })
  avisos.current = { onCambiar, onLenguaje }

  // El texto inicial se toma una vez; recargar el archivo monta otro editor
  useEffect(() => {
    if (!contenedor.current) return
    const lenguaje = new Compartment()
    const fin = texto.length
    const vista = new EditorView({
      parent: contenedor.current,
      state: EditorState.create({
        doc: texto,
        selection: soloElFinal ? EditorSelection.cursor(fin) : undefined,
        extensions: [
          soloElFinal ? [] : lineNumbers(),
          foldGutter({ markerDOM: crearMarcaDePliegue }),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          syntaxHighlighting(classHighlighter),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
          lenguaje.of([]),
          EditorState.readOnly.of(soloLectura),
          EditorState.phrases.of(FRASES),
          EditorView.contentAttributes.of({ 'aria-label': `Contenido de ${nombre}` }),
          EditorView.updateListener.of((cambio) => {
            if (cambio.docChanged) avisos.current.onCambiar(cambio.state.doc.toString())
          }),
          TEMA,
        ],
      }),
    })
    if (soloElFinal) vista.dispatch({ effects: EditorView.scrollIntoView(fin, { y: 'end' }) })
    vista.focus()

    let vigente = true
    const descripcion = buscarLenguaje(nombre)
    if (descripcion) {
      avisos.current.onLenguaje(NOMBRE_VISIBLE[descripcion.name] ?? descripcion.name)
      void descripcion.load().then((soporte) => {
        if (vigente) vista.dispatch({ effects: lenguaje.reconfigure(soporte) })
      })
    }
    return () => {
      vigente = false
      vista.destroy()
    }
  }, [])

  return (
    <div
      ref={contenedor}
      className="font-machine [&_.cm-panels]:font-sans border-term-border focus-within:ring-ring h-full overflow-hidden rounded-md border focus-within:ring-2"
    />
  )
}
