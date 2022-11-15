import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import Notifications from '@kyvg/vue3-notification'
import VueQrcode from '@chenfengyuan/vue-qrcode';

import './assets/styles/index.scss'

const pinia = createPinia()

createApp(App)
    .use(router)
    .use(pinia)
    .use(Notifications)
    .component(VueQrcode.name, VueQrcode)
    .mount('#app')
