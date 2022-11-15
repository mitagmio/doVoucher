import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Pay from '../views/Pay.vue'

const routes = [
  {
    path: '/:pathMatch(.*)*',
    name: 'Home',
    component: Home
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
