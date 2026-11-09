<script setup>
import { ref, computed, watch } from 'vue'
import MexicoLeads from './MexicoLeads.vue'
import LegacyWorkspace from './LegacyWorkspace.vue'
import { currentPage, navigate } from './navigation.js'
defineProps({ user: { type: Object, required: true } })
const emit = defineEmits(['logout', 'session-expired'])
const collapsed = ref(true)
const legacyView = computed(() => ['favorites', 'compare'].includes(currentPage.value.route.screen)
  ? currentPage.value.route.screen : currentPage.value.route.screen === 'demo' ? currentPage.value.route.view : null)
watch(currentPage, page => {
  const titles = { discover: '供应商发现', detail: '贸易线索详情', favorites: '我的收藏', compare: '供应商对比', demo: '静态原型详情' }
  document.title = `${titles[page.route.screen] || '供应商发现'} · 供应商寻源平台`
}, { immediate: true })
</script>

<template>
  <template v-if="legacyView">
    <p class="legacy-notice">当前是静态原型演示，收藏、评价和对比尚未接入真实数据。返回“供应商发现”可浏览真实墨西哥贸易线索。</p>
    <LegacyWorkspace :key="currentPage.key" :user="user" :view="legacyView" @logout="emit('logout')" />
  </template>
  <div v-show="!legacyView" class="app" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">S</span><span class="brand-text">供应商寻源</span></div>
      <nav class="nav" aria-label="一级导航">
        <button type="button" class="navitem on" aria-label="供应商发现" title="供应商发现" @click="navigate({ screen: 'discover' })"><span class="navicon" aria-hidden="true">⌕</span><span class="navlabel">供应商发现</span></button>
        <button type="button" class="navitem" aria-label="我的收藏" title="我的收藏（静态原型）" @click="navigate({ screen: 'favorites' })"><span class="navicon" aria-hidden="true">♡</span><span class="navlabel">我的收藏</span></button>
        <button type="button" class="navitem" aria-label="供应商对比" title="供应商对比（静态原型）" @click="navigate({ screen: 'compare' })"><span class="navicon" aria-hidden="true">▥</span><span class="navlabel">供应商对比</span></button>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="collapse-button" :aria-label="collapsed ? '展开导航' : '收起导航'" @click="collapsed = !collapsed">{{ collapsed ? '☰' : '‹ 收起导航' }}</button>
        <button type="button" class="link" aria-label="退出登录" :title="`${user.username} · 退出登录`" @click="emit('logout')"><span class="avatar">{{ user.username.slice(0, 1) }}</span></button>
      </div>
    </aside>
    <main class="main mexico-main">
      <header class="header"><div><p class="breadcrumb">寻源平台</p><h1>供应商发现</h1></div><div class="row"><span class="tag blue">墨西哥</span><span class="small muted">{{ user.username }}</span></div></header>
      <MexicoLeads @session-expired="message => emit('session-expired', message)" />
      <footer class="footer">贸易记录中的企业信息为供方线索，不代表企业资质已核验。</footer>
    </main>
  </div>
</template>
