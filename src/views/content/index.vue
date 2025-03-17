<template>
  <div class="content-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>我的内容</h2>
      </div>
      <div class="content-list">
        <div 
          v-for="(item, index) in contentList" 
          :key="index" 
          class="content-item" 
          :class="{ active: currentContentId === item.id }"
          @click="selectContent(item.id)"
        >
          <el-icon><Document /></el-icon>
          <span>{{ item.title }}</span>
        </div>
        <div v-if="contentList.length === 0" class="empty-tip">
          暂无保存的内容
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="nav-item" @click="goToChat">
          <el-icon><ChatDotRound /></el-icon>
          <span>返回聊天</span>
        </div>
      </div>
    </div>
    
    <div class="main-content">
      <div class="content-header">
        <h3>{{ currentContent?.title || '选择内容' }}</h3>
        <div class="header-actions" v-if="currentContent">
          <el-button type="primary" size="small" @click="saveContent">
            <el-icon><Check /></el-icon>
            保存修改
          </el-button>
          <el-button type="danger" size="small" @click="deleteContent">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>
      
      <div class="editor-container" v-if="currentContent">
        <MdEditor
          v-model="editingContent"
          :theme="editorTheme"
          :toolbars="toolbars"
          @onSave="saveContent"
          previewTheme="github"
          codeTheme="atom"
          showCodeRowNumber
          :preview="preview"
          :tabWidth="2"
        />
      </div>
      
      <div class="empty-state" v-else>
        <el-empty description="请从左侧选择内容或从聊天页面保存内容" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdEditor} from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useRouter } from 'vue-router'
import { Document, Check, Delete, ChatDotRound } from '@element-plus/icons-vue'

// 获取路由实例
const router = useRouter()

interface ContentItem {
  id: string
  title: string
  content: string
  createdAt: number
}

// 状态管理
const contentList = ref<ContentItem[]>([])
const currentContentId = ref<string>('')
const editingContent = ref('')
const editorTheme = ref('light')
const preview = ref(true)

// 编辑器工具栏配置
const toolbars = [
  'bold', 'italic', 'strikethrough', 'heading', 'quote', 'code', 'link', 'image', 'table',
  'ordered-list', 'unordered-list', 'checked-list', 'line', 'save', 'preview', 'fullscreen',
  'mermaid', 'katex'
]

// 计算当前选中的内容
const currentContent = computed(() => {
  return contentList.value.find(item => item.id === currentContentId.value)
})

// 选择内容
const selectContent = (id: string) => {
  currentContentId.value = id
  if (currentContent.value) {
    editingContent.value = currentContent.value.content
  }
}

// 保存内容修改
const saveContent = () => {
  if (!currentContent.value) return
  
  // 更新内容
  const index = contentList.value.findIndex(item => item.id === currentContentId.value)
  if (index !== -1) {
    contentList.value[index].content = editingContent.value
    
    // 保存到localStorage
    localStorage.setItem('savedContents', JSON.stringify(contentList.value))
    ElMessage.success('保存成功')
  }
}

// 删除内容
const deleteContent = () => {
  if (!currentContent.value) return
  
  ElMessageBox.confirm(
    '确定要删除这个内容吗？此操作不可恢复。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // 删除内容
    contentList.value = contentList.value.filter(item => item.id !== currentContentId.value)
    
    // 保存到localStorage
    localStorage.setItem('savedContents', JSON.stringify(contentList.value))
    
    // 清除当前选中
    currentContentId.value = ''
    editingContent.value = ''
    
    ElMessage.success('删除成功')
  }).catch(() => {
    // 取消删除
  })
}

// 监听内容变化
watch(() => currentContentId.value, (newVal) => {
  if (newVal && currentContent.value) {
    editingContent.value = currentContent.value.content
  } else {
    editingContent.value = ''
  }
})

// 跳转到聊天页面
const goToChat = () => {
  router.push('/chat')
}

// 初始化
onMounted(() => {
  // 从localStorage加载保存的内容
  const savedContents = localStorage.getItem('savedContents')
  if (savedContents) {
    contentList.value = JSON.parse(savedContents)
    if (contentList.value.length > 0) {
      currentContentId.value = contentList.value[0].id
      editingContent.value = contentList.value[0].content
    }
  }
})
</script>

<style scoped>
.content-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: #f5f7fa;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e6e6e6;
}

.content-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.content-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 5px;
  cursor: pointer;
}

.content-item:hover {
  background-color: #e6f7ff;
}

.content-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
}

.content-item .el-icon {
  margin-right: 8px;
}

.sidebar-nav {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid #e6e6e6;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-item:hover {
  background-color: #f0f0f0;
}

.nav-item .el-icon {
  margin-right: 8px;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #999;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 16px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.editor-container :deep(.md-editor) {
  height: calc(100vh - 120px) !important;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.md-editor) {
  height: calc(100vh - 120px) !important;
}
</style>