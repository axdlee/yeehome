<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑定时任务' : '创建定时任务'"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      status-icon
    >
      <!-- 基本信息 -->
      <el-divider content-position="left">基本信息</el-divider>

      <el-form-item label="任务名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入任务名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="任务描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="可选，请输入任务描述"
          :rows="2"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 触发条件 -->
      <el-divider content-position="left">触发条件</el-divider>

      <el-form-item label="触发类型" prop="trigger.type">
        <el-radio-group v-model="formData.trigger.type" @change="(val: string) => handleTypeChange(val as TimerTrigger['type'])">
          <el-radio-button label="once">一次性</el-radio-button>
          <el-radio-button label="recurring">重复</el-radio-button>
          <el-radio-button label="sunrise">日出</el-radio-button>
          <el-radio-button label="sunset">日落</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 一次性触发：选择日期和时间 -->
      <template v-if="formData.trigger.type === 'once'">
        <el-form-item label="触发日期" prop="trigger.date">
          <el-date-picker
            v-model="formData.trigger.date"
            type="date"
            placeholder="选择触发日期"
            :disabled-date="disabledDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="触发时间" prop="trigger.time">
          <el-time-picker
            v-model="formData.trigger.time"
            type="time"
            placeholder="选择触发时间"
            format="HH:mm"
            style="width: 100%"
          />
        </el-form-item>
      </template>

      <!-- 重复触发：选择时间和重复模式 -->
      <template v-if="formData.trigger.type === 'recurring'">
        <el-form-item label="触发时间" prop="trigger.time">
          <el-time-picker
            v-model="formData.trigger.time"
            type="time"
            placeholder="选择每天触发时间"
            format="HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="重复模式" prop="trigger.repeatPattern">
          <el-select v-model="formData.trigger.repeatPattern" style="width: 100%">
            <el-option label="每天" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
            <el-option label="工作日" value="workday" />
            <el-option label="周末" value="weekend" />
          </el-select>
        </el-form-item>

        <!-- 每周模式：选择星期 -->
        <el-form-item
          v-if="formData.trigger.repeatPattern === 'weekly'"
          label="选择星期"
          prop="trigger.weekdays"
        >
          <el-checkbox-group v-model="formData.trigger.weekdays">
            <el-checkbox :label="1">周一</el-checkbox>
            <el-checkbox :label="2">周二</el-checkbox>
            <el-checkbox :label="3">周三</el-checkbox>
            <el-checkbox :label="4">周四</el-checkbox>
            <el-checkbox :label="5">周五</el-checkbox>
            <el-checkbox :label="6">周六</el-checkbox>
            <el-checkbox :label="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </template>

      <!-- 日出/日落触发 -->
      <template v-if="formData.trigger.type === 'sunrise' || formData.trigger.type === 'sunset'">
        <el-form-item label="偏移时间">
          <div class="offset-input">
            <el-input-number
              v-model="formData.trigger.offsetMinutes"
              :min="-120"
              :max="120"
              :step="5"
            />
            <span class="offset-label">分钟（可正可负）</span>
          </div>
        </el-form-item>
        <el-form-item label="位置信息">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-input-number
                v-model="formData.trigger.latitude"
                :precision="6"
                :min="-90"
                :max="90"
                placeholder="纬度"
                style="width: 100%"
              />
            </el-col>
            <el-col :span="12">
              <el-input-number
                v-model="formData.trigger.longitude"
                :precision="6"
                :min="-180"
                :max="180"
                placeholder="经度"
                style="width: 100%"
              />
            </el-col>
          </el-row>
        </el-form-item>
        <div class="location-hint">
          <el-icon><InfoFilled /></el-icon>
          <span>如不填写位置，将使用默认位置（北京）计算日出日落时间</span>
        </div>
      </template>

      <!-- 执行动作 -->
      <el-divider content-position="left">执行动作</el-divider>

      <el-form-item label="操作类型" prop="action.type">
        <el-select v-model="formData.action.type" style="width: 100%">
          <el-option label="开启设备" value="on" />
          <el-option label="关闭设备" value="off" />
          <el-option label="切换状态" value="toggle" />
          <el-option label="调节亮度" value="brightness" />
          <el-option label="设置颜色" value="color" />
          <el-option label="调节色温" value="ct" />
          <el-option label="执行情景" value="scene" />
        </el-select>
      </el-form-item>

      <el-form-item label="目标设备" prop="action.targetId">
        <el-select
          v-model="formData.action.targetId"
          filterable
          placeholder="选择要控制的设备或组"
          style="width: 100%"
        >
          <el-option-group label="本地设备">
            <el-option
              v-for="device in localDevices"
              :key="device.id"
              :label="device.name"
              :value="`local:${device.id}`"
            >
              <span>{{ device.name }}</span>
              <el-tag size="small" type="info" style="margin-left: 8px">
                {{ device.model }}
              </el-tag>
            </el-option>
          </el-option-group>
          <el-option-group label="云端设备">
            <el-option
              v-for="device in cloudDevices"
              :key="device.id"
              :label="device.name"
              :value="`cloud:${device.id}`"
            >
              <span>{{ device.name }}</span>
              <el-tag size="small" type="success" style="margin-left: 8px">
                云端
              </el-tag>
            </el-option>
          </el-option-group>
        </el-select>
      </el-form-item>

      <!-- 亮度调节 -->
      <el-form-item
        v-if="formData.action.type === 'brightness'"
        label="亮度值"
        prop="action.params.brightness"
      >
        <el-slider
          v-model="formData.action.params.brightness"
          :min="1"
          :max="100"
          show-input
        />
      </el-form-item>

      <!-- 色温调节 -->
      <el-form-item
        v-if="formData.action.type === 'ct'"
        label="色温值"
        prop="action.params.colorTemp"
      >
        <el-slider
          v-model="formData.action.params.colorTemp"
          :min="1700"
          :max="6500"
          :step="100"
          show-input
        />
        <div class="ct-hint">
          <span>1700K（暖黄） - 6500K（冷白）</span>
        </div>
      </el-form-item>

      <!-- 颜色设置 -->
      <el-form-item
        v-if="formData.action.type === 'color'"
        label="颜色值"
        prop="action.params.rgb"
      >
        <el-color-picker
          v-model="formData.action.params.rgbColor"
          show-alpha
          @change="(val: string | null) => handleColorChange(val ?? '#409EFF')"
        />
        <span class="rgb-value">{{ rgbToHex(formData.action.params.rgbColor) }}</span>
      </el-form-item>

      <!-- 执行情景 -->
      <el-form-item
        v-if="formData.action.type === 'scene'"
        label="选择情景"
        prop="action.params.sceneId"
      >
        <el-select
          v-model="formData.action.params.sceneId"
          filterable
          placeholder="选择要执行的情景"
          style="width: 100%"
        >
          <el-option
            v-for="scene in scenes"
            :key="scene.id"
            :label="scene.name"
            :value="scene.id"
          />
        </el-select>
      </el-form-item>

      <!-- 渐变时间 -->
      <el-form-item label="渐变时间">
        <el-input-number
          v-model="formData.action.transitionMs"
          :min="0"
          :max="5000"
          :step="100"
        />
        <span class="transition-label">毫秒（可选）</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="isSubmitting"
        @click="handleSubmit"
      >
        {{ isEdit ? '保存修改' : '创建定时任务' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useTimerStore } from '@/renderer/stores/timer'
import { useDeviceStore } from '@/renderer/stores/device'
import { useSceneStore } from '@/renderer/stores/scene'
import type { Timer, TimerTrigger, TimerActionConfig, CreateTimerParams, UpdateTimerParams } from '@/renderer/types/timer'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  visible: boolean
  timer?: Timer | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  timer: null
})

const emits = defineEmits<Emits>()

const timerStore = useTimerStore()
const deviceStore = useDeviceStore()
const sceneStore = useSceneStore()

const formRef = ref<FormInstance>()
const isSubmitting = ref(false)

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emits('update:visible', value)
})

const isEdit = computed(() => !!props.timer?.id)

// 过滤本地和云端设备
const localDevices = computed(() =>
  deviceStore.devices.filter(d => d.source === 'local')
)

const cloudDevices = computed(() =>
  deviceStore.devices.filter(d => d.source === 'cloud')
)

const scenes = computed(() => sceneStore.scenes)

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  trigger: {
    type: 'once' as TimerTrigger['type'],
    date: null as Date | null,
    time: null as Date | null,
    repeatPattern: 'daily' as TimerTrigger['repeatPattern'],
    weekdays: [] as number[],
    offsetMinutes: 0,
    latitude: 39.9042,
    longitude: 116.4074
  } as TimerTrigger,
  action: {
    type: 'on' as TimerActionConfig['type'],
    targetId: '',
    params: {
      brightness: 50,
      colorTemp: 4000,
      rgb: 0,
      rgbColor: '#409EFF',
      sceneId: ''
    },
    transitionMs: 0
  } as TimerActionConfig & { params: { rgbColor: string } }
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度在1-50个字符之间', trigger: 'blur' }
  ],
  'trigger.type': [
    { required: true, message: '请选择触发类型', trigger: 'change' }
  ],
  'trigger.date': [
    {
      required: true,
      message: '请选择触发日期',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (formData.trigger.type === 'once' && !value) {
          callback(new Error('请选择触发日期'))
        } else {
          callback()
        }
      }
    }
  ],
  'trigger.time': [
    {
      required: true,
      message: '请选择触发时间',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if ((formData.trigger.type === 'once' || formData.trigger.type === 'recurring') && !value) {
          callback(new Error('请选择触发时间'))
        } else {
          callback()
        }
      }
    }
  ],
  'trigger.repeatPattern': [
    {
      required: true,
      message: '请选择重复模式',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (formData.trigger.type === 'recurring' && !value) {
          callback(new Error('请选择重复模式'))
        } else {
          callback()
        }
      }
    }
  ],
  'action.type': [
    { required: true, message: '请选择操作类型', trigger: 'change' }
  ],
  'action.targetId': [
    { required: true, message: '请选择目标设备', trigger: 'change' }
  ]
}

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.timer) {
    // 编辑模式：填充表单数据
    formData.name = props.timer.name
    formData.description = props.timer.description || ''
    formData.trigger = { ...props.timer.trigger }
    formData.action = {
      type: props.timer.action.type,
      targetId: props.timer.action.targetId,
      transitionMs: props.timer.action.transitionMs,
      params: {
        brightness: props.timer.action.params?.brightness ?? 50,
        colorTemp: props.timer.action.params?.colorTemp ?? 4000,
        rgb: props.timer.action.params?.rgb ?? 0,
        rgbColor: rgbToHex(props.timer.action.params?.rgb ?? 0),
        sceneId: props.timer.action.params?.sceneId ?? ''
      }
    }
  } else if (!visible) {
    // 重置表单
    resetForm()
  }
})

// 重置表单
function resetForm() {
  formData.name = ''
  formData.description = ''
  formData.trigger = {
    type: 'once',
    date: null,
    time: null,
    repeatPattern: 'daily',
    weekdays: [],
    offsetMinutes: 0,
    latitude: 39.9042,
    longitude: 116.4074
  }
  formData.action = {
    type: 'on',
    targetId: '',
    params: {
      brightness: 50,
      colorTemp: 4000,
      rgb: 0,
      rgbColor: '#409EFF',
      sceneId: ''
    },
    transitionMs: 0
  }
  formRef.value?.clearValidate()
}

// 禁用过去的日期
function disabledDate(date: Date) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return date.getTime() < now.getTime()
}

// 触发类型变化时重置相关字段
function handleTypeChange(type: TimerTrigger['type']) {
  if (type === 'recurring') {
    formData.trigger.weekdays = [1, 2, 3, 4, 5] // 默认工作日
  }
}

// 颜色变化处理
function handleColorChange(color: string) {
  formData.action.params.rgb = hexToRgb(color)
}

// RGB转Hex
function rgbToHex(rgb: number | string): string {
  if (typeof rgb === 'string') return rgb
  const r = (rgb >> 16) & 255
  const g = (rgb >> 8) & 255
  const b = rgb & 255
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

// Hex转RGB
function hexToRgb(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 0
  return parseInt(`${parseInt(result[1], 16) << 16}${parseInt(result[2], 16) << 8}${parseInt(result[3], 16)}`, 10)
}

// 构建触发条件对象
function buildTrigger(): TimerTrigger {
  const trigger: TimerTrigger = {
    type: formData.trigger.type
  }

  if (formData.trigger.type === 'once') {
    if (formData.trigger.date) {
      const date = formData.trigger.date as Date
      trigger.date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    if (formData.trigger.time) {
      const time = formData.trigger.time as Date
      trigger.time = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    }
  }

  if (formData.trigger.type === 'recurring') {
    const timeValue = formData.trigger.time
    trigger.time = timeValue
      ? `${String((timeValue as Date).getHours()).padStart(2, '0')}:${String((timeValue as Date).getMinutes()).padStart(2, '0')}`
      : '08:00'
    trigger.repeatPattern = formData.trigger.repeatPattern
    if (formData.trigger.repeatPattern === 'weekly') {
      trigger.weekdays = formData.trigger.weekdays
    }
  }

  if (formData.trigger.type === 'sunrise' || formData.trigger.type === 'sunset') {
    trigger.offsetMinutes = formData.trigger.offsetMinutes
    if (formData.trigger.latitude) trigger.latitude = formData.trigger.latitude
    if (formData.trigger.longitude) trigger.longitude = formData.trigger.longitude
  }

  return trigger
}

// 构建动作对象
function buildAction(): TimerActionConfig {
  const action: TimerActionConfig = {
    type: formData.action.type,
    targetId: formData.action.targetId,
    transitionMs: formData.action.transitionMs || undefined
  }

  const params: TimerActionConfig['params'] = {}

  if (formData.action.type === 'brightness') {
    params.brightness = formData.action.params.brightness
  }

  if (formData.action.type === 'ct') {
    params.colorTemp = formData.action.params.colorTemp
  }

  if (formData.action.type === 'color') {
    params.rgb = formData.action.params.rgb
  }

  if (formData.action.type === 'scene') {
    params.sceneId = formData.action.params.sceneId
  }

  if (Object.keys(params).length > 0) {
    action.params = params
  }

  return action
}

// 提交表单
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  isSubmitting.value = true

  try {
    const trigger = buildTrigger()
    const action = buildAction()

    if (isEdit.value && props.timer) {
      // 更新
      const updates: UpdateTimerParams = {
        name: formData.name,
        description: formData.description,
        trigger,
        action
      }
      await timerStore.updateTimer(props.timer.id, updates)
      ElMessage.success('定时任务已更新')
    } else {
      // 创建
      const params: CreateTimerParams = {
        name: formData.name,
        description: formData.description,
        trigger,
        action
      }
      await timerStore.createTimer(params)
      ElMessage.success('定时任务已创建')
    }

    emits('success')
    handleClose()
  } catch (error) {
    console.error('保存定时任务失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 关闭弹窗
function handleClose() {
  dialogVisible.value = false
  emits('close')
}
</script>

<style scoped lang="scss">
.offset-input {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.offset-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.location-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-light);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);

  .el-icon {
    color: var(--color-primary);
  }
}

.ct-hint {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.rgb-value {
  margin-left: var(--spacing-md);
  font-family: monospace;
  color: var(--color-text-secondary);
}

.transition-label {
  margin-left: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
