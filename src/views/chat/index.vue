<template>
  <div class="chat-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>AI对话助手</h2>
      </div>
      <div class="chat-list">
        <div class="chat-item new-chat" @click="createNewChat">
          <el-icon><Plus /></el-icon>
          <span>新建聊天</span>
        </div>
        <div 
          v-for="(chat, index) in chatList" 
          :key="index" 
          class="chat-item" 
          :class="{ active: currentChatId === chat.id }"
          @click="switchChat(chat.id)"
        >
          <el-icon><ChatDotRound /></el-icon>
          <span>{{ chat.title }}</span>
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="nav-item" @click="goToContent">
          <el-icon><Document /></el-icon>
          <span>我的内容</span>
        </div>
      </div>
    </div>
    
    <div class="main-content">
    <!-- 模型选择器 -->
    <ModelSelector ref="modelSelectorRef" @select-model="handleModelSelect" @edit-model="handleEditModel" />
      <div class="chat-header">
        <h3>{{ currentChat?.title || '新的聊天' }}</h3>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="saveToContent">
            <el-icon><Document /></el-icon>
            保存到我的内容
          </el-button>
          <el-button type="info" size="small" @click="goToSettings">
            <el-icon><Setting /></el-icon>
            模型设置
          </el-button>
        </div>
      </div>
      
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(message, index) in currentMessages" :key="index" class="message-item" :class="message.role">
          <div class="message-avatar">
            <el-avatar :icon="message.role === 'user' ? 'User' : 'ChatDotRound'" :size="40" />
          </div>
          <div class="message-content">
            <div v-if="message.role === 'assistant'">
              <div v-html="formatMessage(message.content)"></div>
              <div class="message-actions" v-if="message.content">
                <el-button size="small" type="text" @click="copyMessageContent(message.content)">
                  <el-icon><CopyDocument /></el-icon> 复制
                </el-button>
                <el-button size="small" type="text" @click="saveMessageToContent(message.content)">
                  <el-icon><Document /></el-icon> 保存到我的内容
                </el-button>
              </div>
            </div>
            <div v-else>{{ message.content }}</div>
          </div>
        </div>
      </div>
      
      <div class="chat-input">
        <div class="file-upload">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            multiple
          >
            <el-button type="primary" plain>
              <el-icon><Paperclip /></el-icon>
              附件上传
            </el-button>
          </el-upload>
        </div>
        
        <div class="selected-files" v-if="selectedFiles.length > 0">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
            <span>{{ file.name }}</span>
            <el-icon @click="removeFile(index)"><Close /></el-icon>
          </div>
        </div>
        
        <div class="input-area">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="3"
            placeholder="请输入您的问题..."
            @keydown.enter.meta="sendMessage"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="send-button">
            <el-button type="primary" @click="sendMessage" :disabled="isProcessing">
              <el-icon><Position /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 模型设置抽屉 -->
    <ModelDrawer v-model:modelDrawerVisible="modelDrawerVisible" @settings-saved="handleModelSelect" />
    
    <!-- 内容抽屉 -->
    <ContentDrawer v-model:contentDrawerVisible="contentDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import { ElMessage, ElMessageBox } from 'element-plus'
// 导入mermaid工具函数
import { convertGraphToFlowchart } from '@/utils/mermaidUtils'
import { useRouter } from 'vue-router'
import { Plus, ChatDotRound, Document, Paperclip, Close, Position, Setting, CopyDocument } from '@element-plus/icons-vue'
import ModelDrawer from '@/components/ModelDrawer.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import ContentDrawer from '@/components/ContentDrawer.vue'

// 获取路由实例
const router = useRouter()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

// 状态管理
const chatList = ref<Chat[]>([])
const currentChatId = ref<string>('')
const userInput = ref('')
const isProcessing = ref(false)
const selectedFiles = ref<File[]>([])
const messagesContainer = ref<HTMLElement | null>(null)
const selectedMessages = ref<boolean[]>([])
const modelDrawerVisible = ref(false)
const dialogTitle = ref('')


// 计算当前聊天和消息
const currentChat = computed(() => {
  return chatList.value.find(chat => chat.id === currentChatId.value)
})

const currentMessages = computed(() => {
  return currentChat.value?.messages || []
})

// 创建新聊天
const createNewChat = () => {
  const newChat: Chat = {
    id: Date.now().toString(),
    title: '新的聊天',
    messages: [],
    createdAt: Date.now()
  }
  chatList.value.unshift(newChat)
  currentChatId.value = newChat.id
}

// 切换聊天
const switchChat = (chatId: string) => {
  currentChatId.value = chatId
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() && selectedFiles.value.length === 0) return
  
  if (!currentChatId.value) {
    createNewChat()
  }
  
  // 添加用户消息
  const userMessage: ChatMessage = {
    role: 'user',
    content: userInput.value,
    timestamp: Date.now()
  }
  
  currentChat.value?.messages.push(userMessage)
  
  // 处理文件上传
  if (selectedFiles.value.length > 0) {
    // 这里应该添加文件处理逻辑，例如上传到服务器或处理文件内容
    // 为了演示，我们只是将文件名添加到消息中
    const fileNames = selectedFiles.value.map(file => file.name).join(', ')
    currentChat.value?.messages.push({
      role: 'user',
      content: `上传文件: ${fileNames}`,
      timestamp: Date.now()
    })
    selectedFiles.value = []
  }
  
  userInput.value = ''
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 调用AI API获取响应
  isProcessing.value = true
  try {
    // 导入API服务
    import('@/api').then(async ({ sendMessageToAI }) => {
      try {
        // 准备消息历史
        const messageHistory = currentChat.value?.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })) || [];
        
        // 创建AI响应消息占位符
        const aiResponse: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        };
        
        currentChat.value?.messages.push(aiResponse)
        
        // 如果是第一条消息，更新聊天标题
        if (currentChat.value?.messages.length === 2) {
          currentChat.value.title = userMessage.content.substring(0, 20) + (userMessage.content.length > 20 ? '...' : '')
        }
        
        // 使用流式响应
        const updateContent = (content: string) => {
          if (currentChat.value && currentChat.value.messages.length > 0) {
            const lastMessage = currentChat.value.messages[currentChat.value.messages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = content;
              // 滚动到底部
              nextTick(() => {
                scrollToBottom()
              })
            }
          }
        };
        
        // 调用API，使用流式响应
        const aiContent = await sendMessageToAI(messageHistory, updateContent);
        
        // 确保最终内容已更新
        if (currentChat.value && currentChat.value.messages.length > 0) {
          const lastMessage = currentChat.value.messages[currentChat.value.messages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = aiContent;
          }
        }
        
        isProcessing.value = false
        
        // 滚动到底部
        nextTick(() => {
          scrollToBottom()
        })
      } catch (error: any) {
        // 处理API错误
        ElMessage.error(`获取AI响应失败: ${error.message || '未知错误'}`);
        // 如果出错，移除最后一条AI消息
        if (currentChat.value && currentChat.value.messages.length > 0 && 
            currentChat.value.messages[currentChat.value.messages.length - 1].role === 'assistant') {
          currentChat.value.messages.pop();
        }
        isProcessing.value = false;
      }
    }).catch(error => {
      ElMessage.error(`加载API服务失败: ${error.message || '未知错误'}`);
      isProcessing.value = false;
    });
  } catch (error: any) {
    ElMessage.error(`发送消息失败: ${error.message || '未知错误'}`);
    isProcessing.value = false;
  }
}

// 为Mermaid和ECharts全局变量声明接口
declare global {
  interface Window {
    mermaid: {
      initialize: (config: any) => void;
      init: (config: any, elements: NodeListOf<Element>) => void;
    },
    echarts: any
  }
}

// 格式化消息（将Markdown转换为HTML）
const formatMessage = (content: string) => {
  // 导入工具函数，将graph TD格式转换为flowchart TD格式
  import('@/utils/mermaidUtils').then(({ convertGraphToFlowchart }) => {
    // 转换完成后，更新DOM（这里不会影响返回值，只是为了后续渲染）
    nextTick(() => {
      const mermaidElements = document.querySelectorAll('.mermaid');
      if (mermaidElements.length > 0 && window.mermaid) {
        window.mermaid.init(undefined, mermaidElements);
      }
    });
  }).catch(error => {
    console.error('加载mermaidUtils失败:', error);
  });
  
  // 导入ECharts工具函数
  import('@/utils/echartsUtils').then(({ renderEchartsInContainer }) => {
    // 在DOM更新后渲染ECharts图表
    nextTick(() => {
      // 获取消息容器
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        renderEchartsInContainer(messagesContainer as HTMLElement);
      }
    });
  }).catch(error => {
    console.error('加载echartsUtils失败:', error);
  });
  
  // 先转换graph TD为flowchart TD，再使用marked渲染
  try {
    // 使用正则表达式匹配```graph TD 开头的代码块
    const graphTdRegex = /```graph TD\s*([\s\S]*?)```/g;
    
    // 替换为flowchart TD格式
    let convertedContent = content.replace(graphTdRegex, (match, graphContent) => {
      return '```flowchart TD\n' + graphContent + '```';
    });
    
    // 导入ECharts处理函数
    import('@/utils/echartsUtils').then(({ processEchartsBlocks }) => {
      // 处理ECharts代码块
      convertedContent = processEchartsBlocks(convertedContent);
    }).catch(() => {});
    
    return marked(convertedContent);
  } catch (error) {
    console.error('转换格式失败:', error);
    return marked(content);
  }
}

// 移除思维链内容，只保留最终回答
const removeReasoningContent = (content: string) => {
  // 如果内容包含思维链（以div class="reasoning-content"开头），则只保留最终回答部分
  if (content.includes('<div class="reasoning-content">')) {
    // 查找思维链后的内容（通常在</div>\n\n之后）
    const parts = content.split('</div>\n\n');
    if (parts.length > 1) {
      return parts[1]; // 返回思维链之后的内容（最终回答）
    }
  }
  return content; // 如果没有思维链，则返回原始内容
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 处理文件变化
const handleFileChange = (file: any) => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  if (!allowedTypes.includes(file.raw.type)) {
    ElMessage.error('不支持的文件类型，请上传图片、TXT、CSV或Excel文件')
    return
  }
  
  // 添加到选中文件列表
  selectedFiles.value.push(file.raw)
}

// 移除文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 保存到我的内容
const saveToContent = () => {
  if (!currentChat.value || currentChat.value.messages.length === 0) {
    ElMessage.warning('当前聊天没有内容可保存')
    return
  }
  
  // 创建选择列表
  const messageOptions = currentChat.value.messages
    .filter(msg => msg.role === 'assistant')
    .map((msg, index) => {
      return {
        label: `回复 ${index + 1}: ${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}`,
        value: index,
        content: msg.content
      }
    })
  
  if (messageOptions.length === 0) {
    ElMessage.warning('没有AI回复可以保存')
    return
  }
  
  // 设置默认标题
  dialogTitle.value = currentChat.value.title || '新内容'
  
  // 初始化选中状态数组 - 默认全部选中
  selectedMessages.value = new Array(messageOptions.length).fill(true)
  
  // 创建HTML内容，使用原生HTML复选框
  const checkboxesHtml = messageOptions.map((opt, idx) => `
    <div style="margin-bottom: 15px;">
      <div style="display: flex; align-items: flex-start;">
        <label style="display: flex; align-items: flex-start; cursor: pointer; width: 100%;">
          <input type="checkbox" id="message-checkbox-${idx}" checked style="margin-right: 8px; margin-top: 3px;">
          <div style="flex: 1; word-break: break-all;">${opt.label}</div>
        </label>
      </div>
      <div class="message-preview" style="margin-top: 5px; padding: 5px; background-color: #f9f9f9; border-radius: 4px;">${opt.content.substring(0, 100)}${opt.content.length > 100 ? '...' : ''}</div>
    </div>
  `).join('')
  
  const h = `<div>
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">标题</label>
      <input type="text" id="dialog-title-input" class="el-input__inner" style="width: 100%; padding: 8px; border: 1px solid #DCDFE6; border-radius: 4px;" value="${dialogTitle.value}" placeholder="请输入内容标题">
    </div>
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <label style="display: block; font-weight: bold;">选择要保存的回复</label>
        <label style="cursor: pointer;">
          <input type="checkbox" id="select-all-checkbox" checked style="margin-right: 5px;"> 全选
        </label>
      </div>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #EBEEF5; border-radius: 4px; padding: 10px;">
        ${checkboxesHtml}
      </div>
    </div>
  </div>`;
  
  // 显示对话框
  ElMessageBox.alert(
    h,
    '保存到我的内容',
    {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true,
      customClass: 'message-select-dialog',
      beforeClose: (action, instance, done) => {
        if (action === 'confirm') {
          // 验证标题
          if (!dialogTitle.value || dialogTitle.value.trim() === '') {
            ElMessage.warning('标题不能为空')
            return
          }
          
          // 验证是否选择了消息
          if (!selectedMessages.value[0]) {
            ElMessage.warning('请选择要保存的内容')
            return
          }
        }
        done()
      }
    }
  ).then(() => {
    // 添加全选复选框的事件处理
    setTimeout(() => {
      const selectAllCheckbox = document.getElementById('select-all-checkbox')
      if (selectAllCheckbox) {
        // 为全选复选框添加事件监听
        selectAllCheckbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked
          // 更新所有消息复选框的状态
          for (let i = 0; i < messageOptions.length; i++) {
            const checkbox = document.getElementById(`message-checkbox-${i}`)
            if (checkbox) {
              checkbox.checked = isChecked
            }
          }
        })
        
        // 为每个消息复选框添加事件监听，以便在取消选中时更新全选复选框
        for (let i = 0; i < messageOptions.length; i++) {
          const checkbox = document.getElementById(`message-checkbox-${i}`)
          if (checkbox) {
            checkbox.addEventListener('change', () => {
              // 检查是否所有复选框都被选中
              let allChecked = true
              for (let j = 0; j < messageOptions.length; j++) {
                const cb = document.getElementById(`message-checkbox-${j}`)
                if (cb && !cb.checked) {
                  allChecked = false
                  break
                }
              }
              // 更新全选复选框状态
              if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked
              }
            })
          }
        }
      }
    }, 100) // 短暂延迟确保DOM已经渲染
    
    // 获取选中的消息
    const selectedContents = messageOptions
      .filter((_, idx) => selectedMessages.value[idx])
      .map(opt => {
        // 先移除思维链内容
        const content = removeReasoningContent(opt.content)
        // 再转换graph TD为flowchart TD格式
        return convertGraphToFlowchart(content)
      })
      .join('\n\n---\n\n')
    
    if (selectedContents) {
      // 保存到localStorage
      saveContentToStorage(selectedContents, dialogTitle.value)
      // 保存后直接打开内容抽屉
      contentDrawerVisible.value = true
    }
  }).catch(() => {
    // 取消保存
  })
}
// 保存所有AI回复
const saveAllMessages = () => {
  // 获取所有AI回复并合并，同时移除思维链内容
  const aiResponses = currentChat.value.messages
    .filter(msg => msg.role === 'assistant')
    .map(msg => {
      // 先移除思维链内容
      const content = removeReasoningContent(msg.content);
      // 再转换graph TD为flowchart TD格式
      return convertGraphToFlowchart(content);
    })
    .join('\n\n---\n\n')
  
  // 保存到localStorage
  saveContentToStorage(aiResponses)
}

// 打开选择性保存对话框
const openSelectiveDialog = () => {
  // 创建选择列表
  const messageOptions = currentChat.value.messages
    .filter(msg => msg.role === 'assistant')
    .map((msg, index) => {
      return {
        label: `回复 ${index + 1}: ${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}`,
        value: index,
        content: msg.content
      }
    })
  
  if (messageOptions.length === 0) {
    ElMessage.warning('没有AI回复可以保存')
    return
  }
  
  // 初始化选中状态数组
  selectedMessages.value = new Array(messageOptions.length).fill(false)
  
  // 显示合并的对话框（标题输入和内容选择在同一个对话框中）
  ElMessageBox.alert(
    `<div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">标题</label>
        <el-input v-model="dialogTitle" placeholder="请输入内容标题"></el-input>
      </div>
      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">选择要保存的回复</label>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #EBEEF5; border-radius: 4px; padding: 10px;">
          ${messageOptions.map((opt, idx) => 
            `<div style="margin-bottom: 10px; display: flex; align-items: flex-start;">
              <el-checkbox v-model="selectedMessages[${idx}]" style="margin-right: 8px;"></el-checkbox>
              <div style="flex: 1; word-break: break-all;">${opt.label}</div>
            </div>`
          ).join('')}
        </div>
      </div>
    </div>`,
    '保存到我的内容',
    {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true,
      customClass: 'message-select-dialog',
      beforeClose: (action, instance, done) => {
        if (action === 'confirm') {
          // 验证标题
          if (!dialogTitle.value || dialogTitle.value.trim() === '') {
            ElMessage.warning('标题不能为空')
            return
          }
          
          // 验证是否选择了至少一条消息
          if (!selectedMessages.value.some(selected => selected)) {
            ElMessage.warning('请至少选择一条回复')
            return
          }
        }
        done()
      }
    }
  ).then(() => {
    // 添加全选复选框的事件处理
    setTimeout(() => {
      const selectAllCheckbox = document.getElementById('select-all-checkbox')
      if (selectAllCheckbox) {
        // 为全选复选框添加事件监听
        selectAllCheckbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked
          // 更新所有消息复选框的状态
          for (let i = 0; i < messageOptions.length; i++) {
            const checkbox = document.getElementById(`message-checkbox-${i}`)
            if (checkbox) {
              checkbox.checked = isChecked
            }
          }
        })
        
        // 为每个消息复选框添加事件监听，以便在取消选中时更新全选复选框
        for (let i = 0; i < messageOptions.length; i++) {
          const checkbox = document.getElementById(`message-checkbox-${i}`)
          if (checkbox) {
            checkbox.addEventListener('change', () => {
              // 检查是否所有复选框都被选中
              let allChecked = true
              for (let j = 0; j < messageOptions.length; j++) {
                const cb = document.getElementById(`message-checkbox-${j}`)
                if (cb && !cb.checked) {
                  allChecked = false
                  break
                }
              }
              // 更新全选复选框状态
              if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked
              }
            })
          }
        }
      }
    }, 100) // 短暂延迟确保DOM已经渲染
    
    // 获取选中的消息
    const selectedContents = messageOptions
      .filter((_, idx) => selectedMessages.value[idx])
      .map(opt => {
        // 先移除思维链内容
        const content = removeReasoningContent(opt.content)
        // 再转换graph TD为flowchart TD格式
        return convertGraphToFlowchart(content)
      })
      .join('\n\n---\n\n')
    
    if (selectedContents) {
      // 保存到localStorage
      saveContentToStorage(selectedContents, dialogTitle.value)
      // 保存后直接打开内容抽屉
      contentDrawerVisible.value = true
    }
  }).catch(() => {
    // 取消保存
  })
}

// 保存内容到localStorage
const saveContentToStorage = (content, customTitle = null) => {
  const savedContents = JSON.parse(localStorage.getItem('savedContents') || '[]')
  savedContents.push({
    id: Date.now().toString(),
    title: customTitle || currentChat.value.title,
    content: content,
    createdAt: Date.now()
  })
  localStorage.setItem('savedContents', JSON.stringify(savedContents))
  
  ElMessage.success('已保存到我的内容')
  // 保存后直接打开内容抽屉
  contentDrawerVisible.value = true
}

// 复制消息内容到剪贴板
const copyMessageContent = (content: string) => {
  navigator.clipboard.writeText(content)
    .then(() => {
      ElMessage.success('已复制到剪贴板')
    })
    .catch(err => {
      ElMessage.error('复制失败: ' + err)
    })
}

// 保存单条消息到我的内容
const saveMessageToContent = (content: string) => {
  // 移除思维链内容，只保留最终回答
  const finalContent = removeReasoningContent(content);
  
  // 转换graph TD为flowchart TD格式
  const convertedContent = convertGraphToFlowchart(finalContent);
  
  // 设置默认标题
  dialogTitle.value = currentChat.value?.title || '新内容';
  
  // 创建单条消息的选项
  const messageOption = {
    label: `${finalContent.substring(0, 30)}${finalContent.length > 30 ? '...' : ''}`,
    content: convertedContent
  };
  
  // 初始化选中状态数组 - 单条消息默认选中
  selectedMessages.value = [true];
  
  // 创建HTML内容，使用原生HTML复选框
  const h = `<div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">标题</label>
        <input type="text" id="dialog-title-input" class="el-input__inner" style="width: 100%; padding: 8px; border: 1px solid #DCDFE6; border-radius: 4px;" value="${dialogTitle.value}" placeholder="请输入内容标题">
      </div>
      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">要保存的内容</label>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #EBEEF5; border-radius: 4px; padding: 10px;">
          <div style="margin-bottom: 15px;">
            <div style="display: flex; align-items: flex-start;">
              <label style="display: flex; align-items: flex-start; cursor: pointer;">
                <input type="checkbox" id="message-checkbox" checked style="margin-right: 8px; margin-top: 3px;">
                <div style="flex: 1; word-break: break-all;">${messageOption.label}</div>
              </label>
            </div>
            <div class="message-preview" style="margin-top: 5px; padding: 5px; background-color: #f9f9f9; border-radius: 4px;">${finalContent.substring(0, 200)}${finalContent.length > 200 ? '...' : ''}</div>
          </div>
        </div>
      </div>
    </div>`;
  
  // 显示对话框
  ElMessageBox.alert(
    h,
    '保存到我的内容',
    {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true,
      customClass: 'message-select-dialog',
      beforeClose: (action, instance, done) => {
        if (action === 'confirm') {
          // 验证标题
          if (!dialogTitle.value || dialogTitle.value.trim() === '') {
            ElMessage.warning('标题不能为空')
            return
          }
          
          // 验证是否选择了消息
          if (!selectedMessages.value[0]) {
            ElMessage.warning('请选择要保存的内容')
            return
          }
        }
        done()
      }
    }
  ).then(() => {
    // 获取复选框状态
    const checkbox = document.getElementById('message-checkbox')
    selectedMessages.value[0] = checkbox ? checkbox.checked : true
    
    if (selectedMessages.value[0]) {
      // 获取标题输入值
      const titleInput = document.getElementById('dialog-title-input')
      const title = titleInput ? titleInput.value.trim() : ''
      dialogTitle.value = title || currentChat.value?.title || '新内容'
      
      // 保存到localStorage
      saveContentToStorage(convertedContent, dialogTitle.value)
      // 保存后直接打开内容抽屉
      contentDrawerVisible.value = true
    }
  }).catch(() => {
    // 取消保存
  })
}

// 打开模型设置抽屉
const goToSettings = () => {
  modelDrawerVisible.value = true
}

// 内容抽屉可见性控制
const contentDrawerVisible = ref(false)

// 打开内容抽屉
const goToContent = () => {
  contentDrawerVisible.value = true
}

// 模型选择器引用
const modelSelectorRef = ref(null)

// 处理模型选择
const handleModelSelect = (model: any) => {
  if (!model) return;
  
  // 导入modelStorage工具
  import('@/utils/modelStorage').then(({ setCurrentModel }) => {
    // 将选中的模型设置为当前模型
    const selectedModel = {
      id: model.id,
      name: model.name,
      provider: model.provider,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      supportedFileTypes: model.supportedFileTypes,
      stream: model.stream,
      createdAt: model.createdAt || Date.now()
    };
    
    // 设置为当前使用的模型
    setCurrentModel(selectedModel);
    
    ElMessage.success(`已切换到模型: ${model.name || '未命名模型'}`);
    
    // 刷新ModelSelector组件中的模型列表
    if (modelSelectorRef.value && typeof modelSelectorRef.value.refreshModels === 'function') {
      modelSelectorRef.value.refreshModels();
    }
  }).catch(error => {
    console.error('加载modelStorage工具失败:', error);
    ElMessage.error('切换模型失败');
  });
}

// 处理模型编辑
const handleEditModel = (model: any) => {
  // 打开模型设置抽屉并传递编辑模型数据
  modelDrawerVisible.value = true;
  
  // 由于ModelDrawer组件使用的是v-model:modelDrawerVisible，
  // 我们需要在下一个tick中设置editModel属性
  nextTick(() => {
  // 这里假设ModelDrawer组件有一个editModel属性
  // 但实际上我们需要通过其他方式传递编辑模型数据
  // 这里我们可以通过localStorage临时存储编辑模型数据
  localStorage.setItem('editingModel', JSON.stringify(model));
  });
  }
  
  // 初始化
  onMounted(() => {
  // 从localStorage加载聊天记录
  const savedChats = localStorage.getItem('chatList')
  if (savedChats) {
    chatList.value = JSON.parse(savedChats)
    if (chatList.value.length > 0) {
      currentChatId.value = chatList.value[0].id
    }
  } else {
    // 创建一个默认聊天
    createNewChat()
  }
})
</script>

<style scoped>
.chat-container {
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

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 5px;
  cursor: pointer;
}

.chat-item:hover {
  background-color: #e6f7ff;
}

.chat-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
}

.chat-item.new-chat {
  background-color: #f0f0f0;
}

.chat-item .el-icon {
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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
}

.message-avatar {
  margin-right: 12px;
}

.message-content {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
}

.message-item.user .message-content {
  background-color: #e6f7ff;
}

.message-item.assistant .message-content {
  background-color: #f5f5f5;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e6e6e6;
}

.input-area {
  display: flex;
  margin-top: 10px;
}

.input-area .el-input {
  flex: 1;
}

.send-button {
  margin-left: 10px;
  display: flex;
  align-items: flex-end;
}

.file-upload {
  margin-bottom: 10px;
}

.selected-files {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.file-item .el-icon {
  margin-left: 6px;
  cursor: pointer;
}

/* 支持Markdown渲染的样式 */
.message-content :deep(pre) {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.message-content :deep(code) {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 4px;
}

.message-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 10px;
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.message-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 10px;
  color: #666;
  margin: 10px 0;
}

/* 支持LaTeX公式、Mermaid图表和ECharts图表 */
.message-content :deep(.katex) {
  font-size: 1.1em;
}

.message-content :deep(.mermaid) {
  margin: 10px 0;
  text-align: center;
}

.message-content :deep(.echarts-container) {
  background: white;
  padding: 10px;
  border-radius: 5px;
  margin: 15px 0;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.message-content :deep(.echarts-control-panel) {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.message-content :deep(.echarts-control-panel button) {
  padding: 2px 8px;
  cursor: pointer;
  background-color: #f2f6fc;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.message-content :deep(.echarts-control-panel select) {
  padding: 2px 5px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

/* 思维链内容样式 */
.message-content :deep(.reasoning-content) {
  background-color: #f8f9fa;
  border-left: 3px solid #6c757d;
  padding: 10px 15px;
  margin-bottom: 15px;
  font-size: 0.85em;
  color: #495057;
  border-radius: 4px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  line-height: 1;
}
</style>

<style>
/* 自定义对话框样式 */
.message-select-dialog .el-message-box__content {
  max-height: 400px;
  overflow-y: auto;
}

.message-select-dialog .el-checkbox {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}

.message-select-dialog .el-checkbox__label {
  white-space: normal;
  word-break: break-all;
}
</style>