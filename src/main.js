import {createApp} from 'vue'
import App from './App.vue'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/global.styl'

// vite-define replaces this; declared globally so Cesium picks it up
window.CESIUM_BASE_URL = CESIUM_BASE_URL

createApp(App).mount('#app')
