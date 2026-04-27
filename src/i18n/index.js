import {ref} from 'vue'
import en from './en.js'
import fi from './fi.js'
import it from './it.js'
import de from './de.js'


export const LANGUAGES = ['en', 'fi', 'it', 'de']

const TABLES = {en, fi, it, de}
const STORAGE_KEY = 'pgviewer.lang'


// Reactive current language. Components that read $t in templates pick up
// changes automatically because $t reads this ref.
export const currentLang = ref('en')


// Translate a key. Looks up in the current language table; falls back
// to the key string itself when not present. Most short strings are
// keyed by their English text directly so the fallback renders sensibly
// in English. Long content (e.g. the About dialog) uses short keys and
// must appear in every language table including English.
export const t = key => {
  const table = TABLES[currentLang.value]
  if (table && table[key] != null) return table[key]
  return key
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
