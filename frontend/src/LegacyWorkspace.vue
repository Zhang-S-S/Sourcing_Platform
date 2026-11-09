<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { mountWorkspace } from './prototype/workspace.js'
import { currentPage, navigate, savePage, pageState, registerPageState } from './navigation.js'
const props = defineProps({ user: { type: Object, required: true }, view: { type: String, required: true } })
const emit = defineEmits(['logout'])
const root = ref(null)
let cleanup, unregister
onMounted(() => {
  cleanup = mountWorkspace(root.value, props.user, () => emit('logout'), {
    initialView: props.view, initialCompany: currentPage.value.route.company,
    snapshot: pageState('legacy'), beforeNavigate: savePage,
    onDiscover: () => navigate({ screen: 'discover' }, { saved: true }),
    onNavigate: (view, snapshot) => navigate(['favorites', 'compare'].includes(view)
      ? { screen: view } : { screen: 'demo', view, company: snapshot.state.company || 'c1' },
      { saved: true, state: { legacy: snapshot } }),
  })
  unregister = registerPageState('legacy', () => cleanup.snapshot())
})
onBeforeUnmount(() => { unregister?.(); cleanup?.() })
</script>
<template><div id="workspace-app" ref="root" class="app collapsed"></div></template>
