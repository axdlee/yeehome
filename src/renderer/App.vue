<template>
  <el-config-provider :locale="zhCn">
    <AppLayout>
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </AppLayout>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import AppLayout from './components/layout/AppLayout.vue'
</script>

<style>
/* 全局样式已通过 main.ts 引入 */
</style>
