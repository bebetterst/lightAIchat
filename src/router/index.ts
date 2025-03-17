import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/chat/index.vue'),
    meta: { title: 'AI对话' }
  },
  {
    path: '/content',
    name: 'Content',
    component: () => import('@/views/content/index.vue'),
    meta: { title: '我的内容' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/index.vue'),
    meta: { title: '模型设置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router