<template>
  <div class="settings-container">
    <h2>模型设置</h2>
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
        <el-input v-model="modelSettings.modelName" placeholder="输入模型名称" />
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
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { testAPIConnection } from '@/api'

interface ModelSettings {
  provider: string
  apiKey: string
  apiEndpoint: string
  modelName: string
  temperature: number
  maxTokens: number
  supportedFileTypes: string[]
  stream: boolean
}

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

// 加载保存的设置
onMounted(() => {
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
})

// 保存设置
const saveSettings = () => {
  if (!modelSettings.value.apiKey) {
    ElMessage.warning('请输入API密钥')
    return
  }
  
  localStorage.setItem('modelSettings', JSON.stringify(modelSettings.value))
  ElMessage.success('设置已保存')
}

// 重置设置
const resetSettings = () => {
  modelSettings.value = { ...defaultSettings }
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
</script>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #409EFF;
}

.el-form-item {
  margin-bottom: 20px;
}
</style>