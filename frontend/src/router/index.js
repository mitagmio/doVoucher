import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Pay from '../views/Pay.vue'
import Checknft from '../views/Checknft.vue'

const routes = [
  {
    path: '/:pathMatch(.*)*',
    name: 'Home',
    component: Home
  },
  {
    path: '/checknft',
    name: 'Checknft',
    component: Checknft
  },
  {
    path: '/pay',
    name: 'Pay',
    component: Pay
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
