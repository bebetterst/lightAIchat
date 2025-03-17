<template>
  <el-drawer
    v-model="visible"
    title="模型设置"
    size="30%"
    :destroy-on-close="false"
    direction="rtl"
  >
    <el-form :model="modelSettings" label-width="120px">
      <el-form-item label="API提供商">
        <el-select v-model="modelSettings.provider" placeholder="选择API提供商">
          <el-option label="OpenAI" value="openai" />
          <el-option label="DeepSeek" value="deepseek" />
          <el-option label="百度文心" value="baidu" />
          <el-option label="讯飞星火" value="xunfei" />
          <el-option label="阿里百炼" value="alibaba" />
          <el-option label="硅基流动" value="guiji" />
          <el-option label="火山方舟" value="volcano" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="API密钥">
        <el-input v-model="modelSettings.apiKey" placeholder="输入API密钥" type="password" show-password />
      </el-form-item>
      
      <el-form-item label="API端点">
        <el-input v-model="modelSettings.apiEndpoint" placeholder="可选，自定义API端点" />
      </el-form-item>
      
      <el-form-item label="模型名称">
        <el-select v-model="modelSettings.modelName" placeholder="选择模型名称">
          <el-option
            v-for="model in availableModels"
            :key="model"
            :label="model"
            :value="model"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="温度">
        <el-slider v-model="modelSettings.temperature" :min="0" :max="2" :step="0.1" show-stops />
      </el-form-item>
      
      <el-form-item label="最大令牌数">
        <el-input-number v-model="modelSettings.maxTokens" :min="100" :max="8000" :step="100" />
      </el-form-item>
      
      <el-form-item label="流式响应">
        <el-switch v-model="modelSettings.stream" />
      </el-form-item>
      
      <el-form-item label="支持的文件类型">
        <el-select v-model="modelSettings.supportedFileTypes" multiple placeholder="选择支持的文件类型">
          <el-option label="文本文件 (.txt)" value=".txt" />
          <el-option label="Markdown文件 (.md)" value=".md" />
          <el-option label="PDF文件 (.pdf)" value=".pdf" />
          <el-option label="Word文档 (.docx)" value=".docx" />
          <el-option label="Excel表格 (.xlsx)" value=".xlsx" />
          <el-option label="图片文件 (.jpg, .png)" value="image" />
        </el-select>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="saveSettings">{{ isEditMode ? '更新设置' : '保存设置' }}</el-button>
        <el-button @click="resetSettings">重置</el-button>
        <el-button type="success" @click="testConnection" :loading="isTestingConnection">测试连接</el-button>
      </el-form-item>
      
      <el-form-item v-if="connectionTestResult">
        <el-alert
          :title="connectionTestResult.message"
          :type="connectionTestResult.success ? 'success' : 'error'"
          :closable="true"
          show-icon
        />
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { testAPIConnection } from '@/api'
import { getModelConfigByProvider } from '@/config/modelConfig'
import { saveModel, setCurrentModel, SavedModel } from '@/utils/modelStorage'

interface ModelSettings {
  id?: string
  provider: string
  apiKey: string
  apiEndpoint: string
  modelName: string
  temperature: number
  maxTokens: number
  supportedFileTypes: string[]
  stream: boolean
  createdAt?: number
}

const props = defineProps<{
  modelDrawerVisible: boolean
  editModel?: SavedModel | null
}>()

// 从localStorage获取编辑模型数据
const getEditModelFromStorage = () => {
  const editingModelStr = localStorage.getItem('editingModel')
  if (editingModelStr) {
    try {
      const model = JSON.parse(editingModelStr)
      // 清除localStorage中的数据
      localStorage.removeItem('editingModel')
      return model
    } catch (error) {
      console.error('解析编辑模型数据失败:', error)
      return null
    }
  }
  return null
}

const emit = defineEmits<{
  (e: 'update:modelDrawerVisible', value: boolean): void
  (e: 'settings-saved', value: ModelSettings): void
}>()

// 计算属性用于控制抽屉的显示/隐藏
const visible = ref(false)
const isEditMode = ref(false)

watch(() => props.modelDrawerVisible, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 尝试从localStorage获取编辑模型数据
    const editModelFromStorage = getEditModelFromStorage()
    
    if (editModelFromStorage) {
      // 如果从localStorage获取到了编辑模型数据，进入编辑模式
      isEditMode.value = true
      modelSettings.value = {
        id: editModelFromStorage.id,
        provider: editModelFromStorage.provider,
        apiKey: editModelFromStorage.apiKey,
        apiEndpoint: editModelFromStorage.apiEndpoint,
        modelName: editModelFromStorage.name,
        temperature: editModelFromStorage.temperature,
        maxTokens: editModelFromStorage.maxTokens,
        supportedFileTypes: editModelFromStorage.supportedFileTypes,
        stream: editModelFromStorage.stream,
        createdAt: editModelFromStorage.createdAt
      }
      // 更新可用模型列表
      const config = getModelConfigByProvider(editModelFromStorage.provider)
      if (config) {
        availableModels.value = config.models
      }
    } else if (props.editModel) {
      // 如果是编辑模式，加载要编辑的模型数据
      isEditMode.value = true
      modelSettings.value = {
        id: props.editModel.id,
        provider: props.editModel.provider,
        apiKey: props.editModel.apiKey,
        apiEndpoint: props.editModel.apiEndpoint,
        modelName: props.editModel.name,
        temperature: props.editModel.temperature,
        maxTokens: props.editModel.maxTokens,
        supportedFileTypes: props.editModel.supportedFileTypes,
        stream: props.editModel.stream,
        createdAt: props.editModel.createdAt
      }
      // 更新可用模型列表
      const config = getModelConfigByProvider(props.editModel.provider)
      if (config) {
        availableModels.value = config.models
      }
    } else {
      // 如果是新建模式，重置为默认设置
      isEditMode.value = false
      loadSettings()
    }
  }
})

watch(visible, (newVal) => {
  emit('update:modelDrawerVisible', newVal)
})

// 默认设置
const defaultSettings: ModelSettings = {
  provider: 'openai',
  apiKey: '',
  apiEndpoint: '',
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  supportedFileTypes: ['.txt', '.md'],
  stream: true
}

const modelSettings = ref<ModelSettings>({ ...defaultSettings })
const isTestingConnection = ref(false)
const connectionTestResult = ref<{success: boolean, message: string} | null>(null)
const availableModels = ref<string[]>([])

// 加载保存的设置
const loadSettings = () => {
  const savedSettings = localStorage.getItem('modelSettings')
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings)
      // 确保stream属性存在，如果不存在则设置默认值
      if (parsedSettings.stream === undefined) {
        parsedSettings.stream = true
      }
      modelSettings.value = { ...defaultSettings, ...parsedSettings }
    } catch (error) {
      ElMessage.error('加载设置失败，使用默认设置')
      modelSettings.value = { ...defaultSettings }
    }
  }
}

// 保存设置
const saveSettings = () => {
  if (!modelSettings.value.apiKey) {
    ElMessage.warning('请输入API密钥')
    return
  }
  
  // 创建一个模型配置
  const newModel: SavedModel = {
    id: isEditMode.value && modelSettings.value.id ? modelSettings.value.id : `model_${Date.now()}`,
    name: modelSettings.value.modelName,
    provider: modelSettings.value.provider,
    apiKey: modelSettings.value.apiKey,
    apiEndpoint: modelSettings.value.apiEndpoint,
    temperature: modelSettings.value.temperature,
    maxTokens: modelSettings.value.maxTokens,
    supportedFileTypes: modelSettings.value.supportedFileTypes,
    stream: modelSettings.value.stream,
    createdAt: modelSettings.value.createdAt || Date.now()
  }
  
  // 保存模型到列表
  saveModel(newModel)
  
  // 设置为当前使用的模型
  setCurrentModel(newModel)
  
  ElMessage.success(isEditMode.value ? '模型已更新' : '模型已保存并设置为当前使用的模型')
  emit('settings-saved', newModel)
  visible.value = false
}

// 重置设置
const resetSettings = () => {
  if (isEditMode.value && props.editModel) {
    // 如果是编辑模式，重置为原始编辑的模型数据
    modelSettings.value = {
      id: props.editModel.id,
      provider: props.editModel.provider,
      apiKey: props.editModel.apiKey,
      apiEndpoint: props.editModel.apiEndpoint,
      modelName: props.editModel.name,
      temperature: props.editModel.temperature,
      maxTokens: props.editModel.maxTokens,
      supportedFileTypes: props.editModel.supportedFileTypes,
      stream: props.editModel.stream,
      createdAt: props.editModel.createdAt
    }
  } else {
    // 如果是新建模式，重置为默认设置
    modelSettings.value = { ...defaultSettings }
  }
  ElMessage.info('设置已重置')
}

// 测试API连接
const testConnection = async () => {
  if (!modelSettings.value.apiKey) {
    ElMessage.warning('请先输入API密钥')
    return
  }
  
  isTestingConnection.value = true
  connectionTestResult.value = null
  
  try {
    connectionTestResult.value = await testAPIConnection(modelSettings.value)
  } catch (error: any) {
    connectionTestResult.value = {
      success: false,
      message: `测试连接失败: ${error.message || '未知错误'}`
    }
  } finally {
    isTestingConnection.value = false
  }
}

// 监听供应商变化
watch(() => modelSettings.value.provider, (newProvider) => {
  const config = getModelConfigByProvider(newProvider)
  if (config) {
    modelSettings.value.apiEndpoint = config.defaultEndpoint
    availableModels.value = config.models
    modelSettings.value.modelName = config.defaultModel
  } else {
    modelSettings.value.apiEndpoint = ''
    availableModels.value = []
  }
})

// 初始化时加载设置
if (!props.editModel) {
  loadSettings()
}

// 初始化可用模型列表
const config = getModelConfigByProvider(modelSettings.value.provider)
if (config) {
  availableModels.value = config.models
}
</script>

<style scoped>
.el-form-item {
  margin-bottom: 20px;
}
</style>