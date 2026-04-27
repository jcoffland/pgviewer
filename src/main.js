import {createApp} from 'vue'
import * as Cesium from 'cesium'
import App from './App.vue'
import {i18n} from './i18n/index.js'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/global.styl'

window.CESIUM_BASE_URL = CESIUM_BASE_URL
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || ''

createApp(App).use(i18n).mount('#app')
