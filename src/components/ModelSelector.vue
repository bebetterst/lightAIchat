<template>
  <div class="model-selector">
    <div class="model-selector-header">
      <h4>可用模型</h4>
    </div>
    <div class="model-selector-list">
      <div 
        v-for="(model, index) in savedModels" 
        :key="index"
        class="model-item"
        :class="{ active: currentModelId === model.id }"
      >
        <div class="model-item-content" @click="selectModel(model)">
          <div class="model-item-number">{{ index + 1 }}</div>
          <div class="model-item-info">
            <div class="model-name">{{ model.name }}</div>
            <div class="model-provider">{{ getProviderName(model.provider) }}</div>
          </div>
        </div>
        <div class="model-item-actions">
          <el-button 
            type="primary" 
            size="small" 
            circle 
            icon="Edit" 
            @click.stop="editModelItem(model)"
            title="编辑模型"
            style="margin-right: 5px;"
          ></el-button>
          <el-button 
            type="danger" 
            size="small" 
            circle 
            icon="Delete" 
            @click.stop="deleteModelItem(model.id)"
            title="删除模型"
          ></el-button>
        </div>
      </div>
      <div v-if="savedModels.length === 0" class="no-models">
        <p>暂无保存的模型</p>
        <p>请先在设置中配置模型</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineEmits } from 'vue'
import { getSavedModels, getCurrentModel, setCurrentModel, deleteModel, SavedModel } from '@/utils/modelStorage'

interface ModelInfo {
  id: string
  name: string
  provider: string
  apiKey: string
  apiEndpoint: string
  temperature: number
  maxTokens: number
  supportedFileTypes: string[]
  stream: boolean
}

const emit = defineEmits<{
  (e: 'select-model', model: ModelInfo): void
  (e: 'edit-model', model: SavedModel): void
}>()

const savedModels = ref<ModelInfo[]>([])
const currentModelId = ref<string>('')

// 加载保存的模型
const loadSavedModels = () => {
  // 获取所有保存的模型
  const allModels = getSavedModels()
  
  // 获取当前使用的模型
  const currentModel = getCurrentModel()
  
  if (allModels.length > 0) {
    // 将所有保存的模型添加到列表中
    savedModels.value = allModels.map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      supportedFileTypes: model.supportedFileTypes,
      stream: model.stream
    }))
    
    // 如果当前没有保存的模型，但有当前使用的模型，则添加到列表中
  } else if (currentModel) {
    const model = {
      id: currentModel.id,
      name: currentModel.name,
      provider: currentModel.provider,
      apiKey: currentModel.apiKey,
      apiEndpoint: currentModel.apiEndpoint,
      temperature: currentModel.temperature,
      maxTokens: currentModel.maxTokens,
      supportedFileTypes: currentModel.supportedFileTypes,
      stream: currentModel.stream
    }
    savedModels.value = [model]
  }
  
  // 设置当前选中的模型ID
  if (currentModel) {
    currentModelId.value = currentModel.id
  } else if (savedModels.value.length > 0) {
    currentModelId.value = savedModels.value[0].id
  }
}

// 选择模型
const selectModel = (model: ModelInfo) => {
  currentModelId.value = model.id
  emit('select-model', model)
}

// 删除模型
const deleteModelItem = (modelId: string) => {
  // 确认是否删除
  if (confirm('确定要删除这个模型吗？')) {
    // 调用删除方法
    deleteModel(modelId)
    
    // 重新加载模型列表
    loadSavedModels()
    
    // 如果删除的是当前选中的模型，则选择列表中的第一个模型
    if (modelId === currentModelId.value && savedModels.value.length > 0) {
      selectModel(savedModels.value[0])
    }
  }
}

// 编辑模型
const editModelItem = (model: ModelInfo) => {
  // 将ModelInfo转换为SavedModel格式
  const savedModel: SavedModel = {
    id: model.id,
    name: model.name,
    provider: model.provider,
    apiKey: model.apiKey,
    apiEndpoint: model.apiEndpoint,
    temperature: model.temperature,
    maxTokens: model.maxTokens,
    supportedFileTypes: model.supportedFileTypes,
    stream: model.stream,
    createdAt: Date.now()
  }
  
  // 触发编辑事件
  emit('edit-model', savedModel)
}

// 获取提供商名称的显示文本
const getProviderName = (provider: string): string => {
  const providerMap: {[key: string]: string} = {
    'openai': 'OpenAI',
    'deepseek': 'DeepSeek',
    'baidu': '百度文心',
    'xunfei': '讯飞星火',
    'alibaba': '阿里百炼',
    'guiji': '硅基流动',
    'volcano': '火山方舟'
  }
  return providerMap[provider] || provider
}

// 初始化
onMounted(() => {
  loadSavedModels()
  
  // 监听localStorage变化，更新模型列表
  window.addEventListener('storage', (event) => {
    if (event.key === 'modelSettings') {
      loadSavedModels()
    }
  })
})

// 添加一个方法来刷新模型列表
const refreshModels = () => {
  loadSavedModels()
}

// 暴露方法给父组件
defineExpose({
  refreshModels
})
</script>

<style scoped>
.model-selector {
  position: fixed;
  right: 20px;
  top: 100px;
  width: 180px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.model-selector-header {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.model-selector-header h4 {
  margin: 0;
  font-size: 16px;
  color: #409EFF;
}

.model-selector-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 5px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 5px;
  transition: all 0.3s;
}

.model-item:hover {
  background-color: #f5f7fa;
}

.model-item.active {
  background-color: #ecf5ff;
  color: #409EFF;
}

.model-item-content {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: pointer;
}

.model-item-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-right: 10px;
}

.model-item.active .model-item-number {
  background-color: #409EFF;
}

.model-item-info {
  flex: 1;
}

.model-item-actions {
  margin-left: 8px;
}

.model-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.model-provider {
  font-size: 12px;
  color: #909399;
}

.no-models {
  padding: 15px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.no-models p {
  margin: 5px 0;
}
</style>