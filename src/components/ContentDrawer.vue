<template>
  <el-drawer
    v-model="visible"
    :size="isFullscreen ? '100%' : '50%'"
    :destroy-on-close="false"
    direction="rtl"
    class="content-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <span class="drawer-title">我的内容</span>
        <el-button
          type="text"
          @click="toggleFullscreen"
          :icon="isFullscreen ? 'FullScreen' : 'FullScreen'"
          :title="isFullscreen ? '还原' : '最大化'"
        >
          <el-icon><component :is="isFullscreen ? 'Minus' : 'FullScreen'" /></el-icon>
        </el-button>
      </div>
    </template>
    <div class="content-drawer-container">
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
      
      <div class="content-editor">
        <div class="editor-container" v-if="currentContent">
          <div class="editor-toolbar">
            <div class="editor-toolbar-left">
              <h3 class="editor-title">{{ currentContent?.title || '选择内容' }}</h3>
            </div>
            <div class="editor-toolbar-right">
              <el-dropdown size="small" @command="handleToolbarAction" trigger="click">
                <el-button size="small" type="primary" plain>
                  <el-icon><More /></el-icon>
                  操作
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copyEdit">复制编辑内容</el-dropdown-item>
                    <el-dropdown-item command="copyRender">复制预览内容</el-dropdown-item>
                    <el-dropdown-item command="exportMd">导出 Markdown</el-dropdown-item>
                    <el-dropdown-item command="exportTxt">导出纯文本</el-dropdown-item>
                    <el-dropdown-item command="exportHtml">导出 HTML</el-dropdown-item>
                    <el-dropdown-item command="exportPdf">导出 PDF</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button type="primary" size="small" @click="saveContent">
                <el-icon><Check /></el-icon>
                保存修改
              </el-button>
              <el-button type="danger" size="small" plain @click="deleteContent">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
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
            class="md-editor"
          />
        </div>
        
        <div class="empty-state" v-else>
          <el-empty description="请选择内容或从聊天页面保存内容" />
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdEditor} from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { Document, Check, Delete, FullScreen, Minus, CopyDocument, Download, ArrowDown, More } from '@element-plus/icons-vue'
import { saveAs } from 'file-saver'
import { marked } from 'marked'
import { convertGraphToFlowchart } from '../utils/mermaidUtils'
import { exportToPdf } from '../utils/pdfExport'
import { processEchartsBlocks, renderEchartsInContainer } from '../utils/echartsUtils'

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

interface ContentItem {
  id: string
  title: string
  content: string
  createdAt: number
}

const props = defineProps<{
  contentDrawerVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:contentDrawerVisible', value: boolean): void
}>()

// 计算属性用于控制抽屉的显示/隐藏
const visible = ref(false)
const isFullscreen = ref(false)

// 切换全屏状态
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

watch(() => props.contentDrawerVisible, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 当抽屉打开时，加载内容列表
    loadContentList()
  }
})

watch(visible, (newVal) => {
  emit('update:contentDrawerVisible', newVal)
  // 当抽屉关闭时，重置全屏状态
  if (!newVal) {
    isFullscreen.value = false
  }
})

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

// 处理工具栏操作
const handleToolbarAction = (command: string) => {
  switch (command) {
    case 'copyEdit':
      copyEditingContent()
      break
    case 'copyRender':
      copyRenderedContent()
      break
    case 'exportMd':
      handleExportMarkdown('md')
      break
    case 'exportTxt':
      handleExportMarkdown('txt')
      break
    case 'exportHtml':
      handleExportRendered('html')
      break
    case 'exportPdf':
      handleExportRendered('pdf')
      break
  }
}

// 计算当前选中的内容
const currentContent = computed(() => {
  return contentList.value.find(item => item.id === currentContentId.value)
})

// 选择内容
const selectContent = (contentId: string) => {
  currentContentId.value = contentId
  if (currentContent.value) {
    editingContent.value = currentContent.value.content
  }
}

// 复制Markdown编辑区内容到剪贴板
const copyEditingContent = () => {
  if (!currentContent.value) return
  
  navigator.clipboard.writeText(editingContent.value)
    .then(() => {
      ElMessage.success('Markdown内容已复制到剪贴板')
    })
    .catch(err => {
      ElMessage.error('复制失败: ' + err)
    })
}

// 处理HTML实体
const decodeHtmlEntities = (text) => {
  return text.replace(/&[^;]+;/g, match => {
      if (match === '&lt;') return '<'
      if (match === '&gt;') return '>'
      if (match === '&amp;') return '&'
      if (match === '&quot;') return '"'
      if (match === '&apos;') return "'"
      if (match === '&nbsp;') return ' '
      return match
  })
}

// 复制渲染结果到剪贴板
const copyRenderedContent = () => {
  if (!currentContent.value) return
  
  // 先处理Mermaid图表格式
  const processedContent = convertGraphToFlowchart(editingContent.value)
  
  // 使用marked将Markdown转换为HTML
  const renderedHtml = marked(processedContent)
  
  // 创建一个临时元素来获取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = renderedHtml
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  // 复制到剪贴板
  navigator.clipboard.writeText(textContent)
    .then(() => {
      ElMessage.success('渲染内容已复制到剪贴板')
    })
    .catch(err => {
      ElMessage.error('复制失败: ' + err)
    })
}

// 处理Markdown导出
const handleExportMarkdown = (type: string) => {
  if (!currentContent.value) return
  
  const fileName = currentContent.value.title || '未命名文档'
  const content = editingContent.value
  
  // 创建Blob并下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${fileName}.${type}`)
  
  ElMessage.success(`已导出为${type === 'md' ? 'Markdown' : '纯文本'}文件`)
}

// 处理渲染内容导出
const handleExportRendered = (type: string) => {
  if (!currentContent.value) {
    ElMessage.warning('请先选择内容')
    return
  }
  
  try {
    console.log(`开始处理${type}导出...`)
    const fileName = currentContent.value.title || '未命名文档'
    // 先处理Mermaid图表格式
    let processedContent = convertGraphToFlowchart(editingContent.value)
    // 处理ECharts图表格式
    processedContent = processEchartsBlocks(processedContent)
    console.log('内容预处理完成，准备导出')
    
    switch (type) {
      case 'html':
        // 导出为HTML
        console.log('调用HTML导出函数')
        exportToHtml(fileName, processedContent)
        break
      case 'pdf':
        // 导出为PDF
        console.log('调用PDF导出函数')
        ElMessage.info('正在处理PDF导出，请稍候...')
        exportToPdf(fileName, processedContent)
          .then(() => {
            ElMessage.success('已导出为PDF文件')
          })
          .catch(error => {
            console.error('PDF导出错误:', error)
            ElMessage.error(`PDF导出失败: ${error.message || '未知错误'}`)
          })
        break
    }
  } catch (error) {
    console.error(`导出处理错误:`, error)
    ElMessage.error(`导出处理失败: ${error.message || '未知错误'}`)
  }
}

// 处理Mermaid图表渲染
const renderMermaid = (container: HTMLElement) => {
  return new Promise<void>((resolve) => {
    const mermaidDivs = container.querySelectorAll('.mermaid')
    if (mermaidDivs.length === 0) {
      resolve()
      return
    }
    
    // 确保mermaid已加载
    if (typeof window.mermaid === 'undefined') {
      // 动态加载Mermaid
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js'
      script.onload = () => {
        try {
          window.mermaid.initialize({ 
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'default'
          })
          window.mermaid.init(undefined, mermaidDivs)
          
          // 给足够时间渲染
          setTimeout(() => resolve(), 2000)
        } catch (e) {
          console.error('Mermaid渲染失败:', e)
          resolve()
        }
      }
      script.onerror = () => {
        console.error('加载Mermaid脚本失败')
        resolve()
      }
      document.head.appendChild(script)
    } else {
      // Mermaid已加载，直接渲染
      try {
        window.mermaid.initialize({ 
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'default'
        })
        window.mermaid.init(undefined, mermaidDivs)
        
        // 给足够时间渲染
        setTimeout(() => resolve(), 2000)
      } catch (e) {
        console.error('Mermaid渲染失败:', e)
        resolve()
      }
    }
  })
}

// 处理LaTeX公式
const processKatex = (container: HTMLElement) => {
  return new Promise<void>((resolve) => {
    const katexElements = container.querySelectorAll('.katex, .katex-display')
    if (katexElements.length === 0) {
      console.log('未发现KaTeX公式，跳过处理')
      resolve()
      return
    }
    
    console.log(`发现${katexElements.length}个KaTeX公式，开始处理`)
    
    // 确保KaTeX样式已加载
    const katexStyleExists = document.querySelector('link[href*="katex"]')
    if (!katexStyleExists) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css'
      document.head.appendChild(link)
      console.log('已添加KaTeX样式')
      
      // 等待样式加载
      link.onload = () => {
        console.log('KaTeX样式加载完成')
        processKatexElements(katexElements, resolve)
      }
      
      // 设置超时保障
      setTimeout(() => {
        console.log('KaTeX样式加载超时，继续处理')
        processKatexElements(katexElements, resolve)
      }, 3000)
    } else {
      processKatexElements(katexElements, resolve)
    }
  })
}

// 处理KaTeX元素
const processKatexElements = (elements: NodeListOf<Element>, callback: () => void) => {
  // 确保所有KaTeX元素可见
  elements.forEach(el => {
    el.setAttribute('style', 'display: block; visibility: visible; opacity: 1;')
    
    // 处理内部元素
    const innerElements = el.querySelectorAll('*')
    innerElements.forEach(inner => {
      if (inner instanceof HTMLElement) {
        inner.style.visibility = 'visible'
        inner.style.opacity = '1'
      }
    })
  })
  
  // 给足够时间渲染公式
  setTimeout(() => {
    console.log('KaTeX公式处理完成')
    callback()
  }, 2000) // 增加等待时间到2秒
}

// 确保SVG正确显示
const optimizeSvgElements = (container: HTMLElement) => {
  const svgElements = container.querySelectorAll('svg')
  console.log(`发现${svgElements.length}个SVG元素，开始优化`)
  
  svgElements.forEach(svg => {
    // 确保SVG可见
    svg.style.display = 'block'
    svg.style.visibility = 'visible'
    svg.style.opacity = '1'
    
    // 设置尺寸
    svg.style.maxWidth = '100%'
    svg.style.height = 'auto'
    
    // 确保有宽度属性
    if (!svg.hasAttribute('width')) {
      svg.setAttribute('width', '100%')
    }
    
    // 确保有高度属性
    if (!svg.hasAttribute('height') && svg.hasAttribute('viewBox')) {
      // 从viewBox提取高度
      const viewBox = svg.getAttribute('viewBox')?.split(' ')
      if (viewBox && viewBox.length === 4) {
        const ratio = parseFloat(viewBox[3]) / parseFloat(viewBox[2])
        svg.style.height = `${ratio * 100}%`
      }
    }
    
    // 确保所有子元素可见
    const childElements = svg.querySelectorAll('*')
    childElements.forEach(el => {
      if (el instanceof SVGElement) {
        el.style.visibility = 'visible'
        el.style.opacity = '1'
      }
    })
    
    // 添加内联样式确保SVG正确显示
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    
    // 确保SVG有背景色
    if (!svg.style.backgroundColor) {
      svg.style.backgroundColor = 'white'
    }
  })
  
  // 处理可能嵌套在其他元素中的SVG
  const mermaidDivs = container.querySelectorAll('.mermaid')
  mermaidDivs.forEach(div => {
    div.style.overflow = 'visible'
    div.style.backgroundColor = 'white'
    div.style.padding = '10px'
    div.style.margin = '15px 0'
  })
  
  console.log('SVG元素优化完成')
}

// 创建导出用的临时容器
const createExportContainer = (className: string, content: string) => {
  // 创建一个临时的div元素来渲染Markdown内容
  const tempDiv = document.createElement('div')
  tempDiv.className = className
  tempDiv.style.padding = '20px'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.position = 'fixed' // 改为fixed定位，确保在视口内
  tempDiv.style.top = '0'
  tempDiv.style.left = '0'
  tempDiv.style.width = '210mm' // A4宽度
  tempDiv.style.zIndex = '9999' // 使用正zIndex确保可见
  tempDiv.style.opacity = '1'
  tempDiv.style.visibility = 'visible' // 确保可见
  tempDiv.style.overflow = 'visible' // 确保内容不被裁剪
  tempDiv.style.display = 'block' // 确保显示
  
  // 添加样式
  const styleElement = document.createElement('style')
  styleElement.textContent = `
    .${className} {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .${className} pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 15px 0;
    }
    .${className} code {
      font-family: monospace;
    }
    .${className} img {
      max-width: 100%;
    }
    .${className} table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    .${className} table, th, td {
      border: 1px solid #ddd;
    }
    .${className} th, td {
      padding: 8px;
      text-align: left;
    }
    .${className} .mermaid {
      background: white;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .${className} .echarts-container {
      background: white;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    }
    .${className} .echarts-control-panel {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .${className} .echarts-control-panel button {
      padding: 2px 8px;
      cursor: pointer;
      background-color: #f2f6fc;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
    .${className} .echarts-control-panel select {
      padding: 2px 5px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
    .${className} svg {
      max-width: 100%;
      display: block;
      margin: 0 auto;
      height: auto !important;
    }
  `
  document.head.appendChild(styleElement)
  
  // 渲染Markdown内容
  const renderedContent = marked(content)
  tempDiv.innerHTML = renderedContent
  document.body.appendChild(tempDiv)
  
  return { tempDiv, styleElement }
}



// 导出为HTML
const exportToHtml = (fileName: string, content: string) => {
  ElMessage.info('正在处理HTML导出，请稍候...')
  
  const { tempDiv, styleElement } = createExportContainer('html-export-container', content)
  
  // 执行导出流程
  const executeExport = async () => {
    try {
      // 先处理公式
      console.log('开始处理KaTeX公式')
      await processKatex(tempDiv)
      
      // 处理Mermaid图表
      const mermaidDivs = tempDiv.querySelectorAll('.mermaid')
      if (mermaidDivs.length > 0) {
        console.log('发现Mermaid图表，开始处理')
        // 确保mermaid已加载
        if (typeof window.mermaid === 'undefined') {
          // 动态加载Mermaid
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js'
            script.onload = () => {
              console.log('Mermaid脚本加载成功')
              resolve()
            }
            script.onerror = () => {
              console.error('加载Mermaid脚本失败')
              reject(new Error('加载Mermaid脚本失败'))
            }
            document.head.appendChild(script)
          })
          
          // 等待脚本初始化
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 初始化Mermaid
        window.mermaid.initialize({ 
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'default'
        })
        
        // 使用MutationObserver监听渲染完成
        await new Promise<void>((resolve) => {
          // 创建观察器监听渲染完成
          const observer = new MutationObserver((mutations, obs) => {
            let allRendered = true
            for (const div of mermaidDivs) {
              if (!div.querySelector('svg')) {
                allRendered = false
                break
              }
            }
            
            if (allRendered) {
              console.log('所有Mermaid图表已渲染完成')
              obs.disconnect()
              setTimeout(() => resolve(), 1000) // 增加等待时间
            }
          })
          
          observer.observe(tempDiv, { childList: true, subtree: true });
          
          try {
            console.log('开始渲染Mermaid图表')
            window.mermaid.init(undefined, mermaidDivs)
            
            // 设置超时保障，即使没有检测到SVG也会继续
            setTimeout(() => {
              observer.disconnect()
              console.log('Mermaid渲染超时，继续执行')
              resolve()
            }, 5000) // 增加超时时间
          } catch (e) {
            console.error('Mermaid渲染失败:', e)
            observer.disconnect()
            resolve()
          }
        })
      }
      
      // 处理ECharts图表
      const echartsContainers = tempDiv.querySelectorAll('.echarts-container')
      if (echartsContainers.length > 0) {
        console.log('发现ECharts图表，开始处理')
        // 确保echarts已加载
        if (typeof window.echarts === 'undefined') {
          // 动态加载ECharts
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
            script.onload = () => {
              console.log('ECharts脚本加载成功')
              resolve()
            }
            script.onerror = () => {
              console.error('加载ECharts脚本失败')
              reject(new Error('加载ECharts脚本失败'))
            }
            document.head.appendChild(script)
          })
          
          // 等待脚本初始化
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 渲染ECharts图表
        await renderEchartsInContainer(tempDiv)
      } else {
        console.log('未发现ECharts图表，跳过处理')
      }
      
      // 确保SVG正确显示
      optimizeSvgElements(tempDiv)
      console.log('SVG元素已优化')
      
      // 等待确保渲染完成
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 创建完整的HTML文档
      // 使用变量存储HTML标签，避免Vue编译器解析
      const headTag = 'head';
      const scriptTag = 'script';
      const htmlTag = 'html';
      const bodyTag = 'body';
      
      const htmlContent = [
        '<!DOCTYPE html>',
        `<${htmlTag}>`,
        `<${headTag}>`,
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        `  <title>${fileName}</title>`,
        '  <style>',
        '    body {',
        '      font-family: Arial, sans-serif;',
        '      line-height: 1.6;',
        '      color: #333;',
        '      max-width: 800px;',
        '      margin: 0 auto;',
        '      padding: 20px;',
        '    }',
        '    pre {',
        '      background-color: #f5f5f5;',
        '      padding: 10px;',
        '      border-radius: 5px;',
        '      overflow-x: auto;',
        '      margin: 15px 0;',
        '    }',
        '    code {',
        '      font-family: monospace;',
        '    }',
        '    img {',
        '      max-width: 100%;',
        '    }',
        '    table {',
        '      border-collapse: collapse;',
        '      width: 100%;',
        '      margin: 15px 0;',
        '    }',
        '    table, th, td {',
        '      border: 1px solid #ddd;',
        '    }',
        '    th, td {',
        '      padding: 8px;',
        '      text-align: left;',
        '    }',
        '    .mermaid {',
        '      background: white;',
        '      padding: 10px;',
        '      border-radius: 5px;',
        '      margin: 15px 0;',
        '    }',
        '    svg {',
        '      max-width: 100%;',
        '      height: auto !important;',
        '      display: block;',
        '    }',
        '  </style>',
        '  <!-- 添加KaTeX支持 -->',
        '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">',
        '  <!-- 添加Mermaid支持 -->',
        `  <${scriptTag} src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></${scriptTag}>`,
        '  <!-- 添加ECharts支持 -->',
        `  <${scriptTag} src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></${scriptTag}>`,
        `  <${scriptTag}>`,
        '    document.addEventListener("DOMContentLoaded", function() {',
        '      // 初始化Mermaid',
        '      mermaid.initialize({ startOnLoad: true, theme: "default" });',
        '      ',
        '      // 初始化ECharts',
        '      const echartsContainers = document.querySelectorAll(".echarts-container");',
        '      echartsContainers.forEach(function(container) {',
        '        try {',
        '          const chartId = container.getAttribute("data-echarts-id");',
        '          const configStr = container.getAttribute("data-echarts-config");',
        '          ',
        '          if (!chartId || !configStr) return;',
        '          ',
        '          // 解码配置',
        '          const configCode = decodeURIComponent(configStr);',
        '          ',
        '          // 创建图表容器',
        '          const chartContainer = document.createElement("div");',
        '          chartContainer.id = chartId;',
        '          chartContainer.style.width = "100%";',
        '          chartContainer.style.height = "400px";',
        '          container.appendChild(chartContainer);',
        '          ',
        '          // 执行配置代码获取选项',
        '          let chartOptions;',
        '          try {',
        '            chartOptions = new Function("return " + configCode)();',
        '          } catch (e) {',
        '            console.error("解析ECharts配置失败:", e);',
        '            container.innerHTML = "<div class=\"echarts-error\">ECharts配置解析错误: " + e.message + "</div>";',
        '            return;',
        '          }',
        '          ',
        '          // 初始化图表',
        '          const chart = echarts.init(chartContainer);',
        '          chart.setOption(chartOptions);',
        '          ',
        '          // 添加调整按钮',
        '          const controlPanel = document.createElement("div");',
        '          controlPanel.className = "echarts-control-panel";',
        '          ',
        '          // 添加高度调整',
        '          const heightControl = document.createElement("div");',
        '          heightControl.innerHTML = "',
        '            <label style=\"margin-right: 5px;\">高度:</label>',
        '            <select class=\"echarts-height-select\">',
        '              <option value=\"300\">300px</option>',
        '              <option value=\"400\" selected>400px</option>',
        '              <option value=\"500\">500px</option>',
        '              <option value=\"600\">600px</option>',
        '              <option value=\"800\">800px</option>',
        '            </select>',
        '          ";',
        '          controlPanel.appendChild(heightControl);',
        '          ',
        '          // 添加主题切换',
        '          const themeControl = document.createElement("div");',
        '          themeControl.innerHTML = "',
        '            <label style=\"margin-right: 5px;\">主题:</label>',
        '            <select class=\"echarts-theme-select\">',
        '              <option value=\"default\" selected>默认</option>',
        '              <option value=\"dark\">暗黑</option>',
        '            </select>',
        '          ";',
        '          controlPanel.appendChild(themeControl);',
        `</${headTag}>`,
        `<${bodyTag}>`,
        `  ${tempDiv.innerHTML}`,
        `</${bodyTag}>`,
        `</${htmlTag}>`,
      ].join('\n')
      
      // 创建Blob并下载
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      saveAs(blob, `${fileName}.html`)
      
      ElMessage.success('已导出为HTML文件')
    } catch (error) {
      console.error('HTML导出错误:', error)
      ElMessage.error(`HTML导出失败: ${error.message || '未知错误'}`)
    } finally {
      // 清理临时元素
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement)
      }
    }
  }
  
  // 开始导出流程
  executeExport()
}

// 保存内容修改
const saveContent = () => {
  if (!currentContent.value) return
  
  // 更新当前内容
  const index = contentList.value.findIndex(item => item.id === currentContentId.value)
  if (index !== -1) {
    contentList.value[index].content = editingContent.value
    
    // 保存到localStorage
    localStorage.setItem('savedContents', JSON.stringify(contentList.value))
    ElMessage.success('内容已保存')
  }
}

// 删除内容
const deleteContent = () => {
  if (!currentContent.value) return
  
  ElMessageBox.confirm(
    '确定要删除这个内容吗？',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 从列表中移除
    contentList.value = contentList.value.filter(item => item.id !== currentContentId.value)
    
    // 保存到localStorage
    localStorage.setItem('savedContents', JSON.stringify(contentList.value))
    
    // 重置当前选中
    if (contentList.value.length > 0) {
      currentContentId.value = contentList.value[0].id
      editingContent.value = contentList.value[0].content
    } else {
      currentContentId.value = ''
      editingContent.value = ''
    }
    
    ElMessage.success('内容已删除')
  }).catch(() => {
    // 取消删除
  })
}

// 加载内容列表
const loadContentList = () => {
  const savedContents = localStorage.getItem('savedContents')
  if (savedContents) {
    contentList.value = JSON.parse(savedContents)
    if (contentList.value.length > 0 && !currentContentId.value) {
      currentContentId.value = contentList.value[0].id
      editingContent.value = contentList.value[0].content
    }
  }
}

// 监听当前内容ID变化
watch(() => currentContentId.value, (newVal) => {
  if (newVal && currentContent.value) {
    editingContent.value = currentContent.value.content
  } else {
    editingContent.value = ''
  }
})

// 初始加载内容列表
loadContentList()
</script>

<style scoped>
.content-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
  min-height: unset;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
}

.content-drawer-container {
  height: calc(100vh - 48px);
  display: flex;
}

.content-list {
  width: 200px;
  border-right: 1px solid #dcdfe6;
  overflow-y: auto;
}

.content-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.md-editor {
  height: calc(100vh - 120px);
}

.editor-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
}

.editor-toolbar-left {
  display: flex;
  align-items: center;
}

.editor-toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.editor-title {
  margin: 0;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #909399;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>