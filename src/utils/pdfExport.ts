import html2pdf from 'html2pdf.js'
import { marked } from 'marked'

// PDF导出配置选项
interface PdfExportOptions {
  margin?: number[]
  filename?: string
  image?: { type: string, quality: number }
  html2canvas?: { scale: number, useCORS: boolean }
  jsPDF?: { unit: string, format: string, orientation: string }
}

/**
 * 导出内容为PDF文件
 * @param fileName 文件名
 * @param content Markdown内容
 * @param customOptions 自定义PDF导出选项
 */
export const exportToPdf = async (fileName: string, content: string, customOptions?: Partial<PdfExportOptions>) => {
  // 创建一个临时的div元素来渲染Markdown内容
  const tempDiv = document.createElement('div')
  tempDiv.className = 'pdf-export-container'
  tempDiv.style.padding = '20px'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.position = 'fixed'
  tempDiv.style.top = '0'
  tempDiv.style.left = '0'
  tempDiv.style.width = '210mm' // A4宽度
  tempDiv.style.zIndex = '9999' // 确保元素在最上层
  tempDiv.style.opacity = '1'
  tempDiv.style.visibility = 'visible'
  tempDiv.style.overflow = 'visible'
  tempDiv.style.backgroundColor = 'white' // 确保背景色
  
  // 添加样式
  const styleElement = document.createElement('style')
  styleElement.textContent = `
    .pdf-export-container {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .pdf-export-container pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 15px 0;
    }
    .pdf-export-container code {
      font-family: monospace;
    }
    .pdf-export-container img {
      max-width: 100%;
    }
    .pdf-export-container table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    .pdf-export-container table, th, td {
      border: 1px solid #ddd;
    }
    .pdf-export-container th, td {
      padding: 8px;
      text-align: left;
    }
    .pdf-export-container .mermaid {
      background: white;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .pdf-export-container svg {
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
  
  try {
    // 处理KaTeX公式
    await processKatex(tempDiv)
    
    // 处理Mermaid图表
    await renderMermaid(tempDiv)
    
    // 优化SVG元素
    optimizeSvgElements(tempDiv)
    
    // 等待确保所有内容都已渲染
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 配置PDF导出选项
    const defaultOptions = {
      margin: [10, 10, 10, 10],
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    const options = { ...defaultOptions, ...customOptions }
    
    // 导出为PDF
    await html2pdf().set(options).from(tempDiv).save()
    
    return true
  } catch (error) {
    console.error('PDF导出错误:', error)
    throw error
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

/**
 * 处理Mermaid图表渲染
 */
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
          
          // 使用MutationObserver监听渲染完成
          const observer = new MutationObserver((mutations, obs) => {
            let allRendered = true
            for (const div of mermaidDivs) {
              if (!div.querySelector('svg')) {
                allRendered = false
                break
              }
            }
            
            if (allRendered) {
              obs.disconnect()
              setTimeout(() => resolve(), 1000) // 给足够时间渲染
            }
          })
          
          observer.observe(container, { childList: true, subtree: true })
          
          // 设置超时保障
          setTimeout(() => {
            observer.disconnect()
            resolve()
          }, 5000) // 5秒超时
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
        
        // 使用MutationObserver监听渲染完成
        const observer = new MutationObserver((mutations, obs) => {
          let allRendered = true
          for (const div of mermaidDivs) {
            if (!div.querySelector('svg')) {
              allRendered = false
              break
            }
          }
          
          if (allRendered) {
            obs.disconnect()
            setTimeout(() => resolve(), 1000) // 给足够时间渲染
          }
        })
        
        observer.observe(container, { childList: true, subtree: true })
        
        // 设置超时保障
        setTimeout(() => {
          observer.disconnect()
          resolve()
        }, 5000) // 5秒超时
      } catch (e) {
        console.error('Mermaid渲染失败:', e)
        resolve()
      }
    }
  })
}

/**
 * 处理KaTeX公式
 */
const processKatex = (container: HTMLElement) => {
  return new Promise<void>((resolve) => {
    const katexElements = container.querySelectorAll('.katex, .katex-display')
    if (katexElements.length === 0) {
      resolve()
      return
    }
    
    // 确保KaTeX样式已加载
    const katexStyleExists = document.querySelector('link[href*="katex"]')
    if (!katexStyleExists) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css'
      document.head.appendChild(link)
      
      // 等待样式加载
      link.onload = () => {
        processKatexElements(katexElements, resolve)
      }
      
      // 设置超时保障
      setTimeout(() => {
        processKatexElements(katexElements, resolve)
      }, 3000)
    } else {
      processKatexElements(katexElements, resolve)
    }
  })
}

/**
 * 处理KaTeX元素
 */
const processKatexElements = (elements: NodeListOf<Element>, callback: () => void) => {
  // 确保所有KaTeX元素可见
  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.display = 'block'
      el.style.visibility = 'visible'
      el.style.opacity = '1'
      
      // 处理内部元素
      const innerElements = el.querySelectorAll('*')
      innerElements.forEach(inner => {
        if (inner instanceof HTMLElement) {
          inner.style.visibility = 'visible'
          inner.style.opacity = '1'
        }
      })
    }
  })
  
  // 给足够时间渲染公式
  setTimeout(() => {
    callback()
  }, 2000)
}

/**
 * 优化SVG元素显示
 */
const optimizeSvgElements = (container: HTMLElement) => {
  const svgElements = container.querySelectorAll('svg')
  
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
    if (div instanceof HTMLElement) {
      div.style.overflow = 'visible'
      div.style.backgroundColor = 'white'
      div.style.padding = '10px'
      div.style.margin = '15px 0'
    }
  })
}

// 为Mermaid全局变量声明接口
declare global {
  interface Window {
    mermaid: {
      initialize: (config: any) => void;
      init: (config: any, elements: NodeListOf<Element>) => void;
    }
  }
}