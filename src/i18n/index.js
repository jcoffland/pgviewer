import {ref} from 'vue'
import fi from './fi.js'
import it from './it.js'
import de from './de.js'


export const LANGUAGES = ['en', 'fi', 'it', 'de']

const TABLES = {fi, it, de}
const STORAGE_KEY = 'pgviewer.lang'


// Reactive current language. Components that read $t in templates pick up
// changes automatically because $t reads this ref.
export const currentLang = ref('en')


// Translate an English source string. Falls back to the source if no
// translation exists. The English string is the canonical key.
export const t = en => {
  const lang = currentLang.value
  if (lang == 'en') return en
  const table = TABLES[lang]
  if (!table) return en
  return table[en] || en
}


// Update active language, persist, and reflect in the URL.
export const setLang = code => {
  if (LANGUAGES.indexOf(code) < 0) code = 'en'
  currentLang.value = code
  try {localStorage.setItem(STORAGE_KEY, code)} catch (e) {}
  const u = new URL(location)
  if (code == 'en') u.searchParams.delete('lang')
  else              u.searchParams.set('lang', code)
  history.replaceState(null, '', u)
}


// Resolve initial language from URL > localStorage > 'en'.
const initLang = () => {
  const fromUrl = new URL(location).searchParams.get('lang')
  if (fromUrl && 0 <= LANGUAGES.indexOf(fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && 0 <= LANGUAGES.indexOf(saved)) return saved
  } catch (e) {}
  return 'en'
}


export const i18n = {
  install(app) {
    currentLang.value = initLang()
    app.config.globalProperties.$t = t
    app.config.globalProperties.$lang = currentLang
    app.config.globalProperties.$setLang = setLang
  },
}
