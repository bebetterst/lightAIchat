/**
 * 工具函数，用于处理HTML代码块格式和渲染
 * 支持包含ECharts的HTML代码块
 */

/**
 * 检测并提取HTML代码块
 * @param content Markdown内容
 * @returns 转换后的内容
 */
export function processHtmlBlocks(content: string): string {
  if (!content) return content;
  
  // 使用正则表达式匹配```html 开头的代码块
  const htmlRegex = /```html\s*([\s\S]*?)```/g;
  
  // 替换为可渲染的格式
  return content.replace(htmlRegex, (match, htmlContent) => {
    // 生成唯一ID
    const htmlId = `html-${Math.random().toString(36).substring(2, 10)}`;
    
    // 检查HTML内容是否包含ECharts相关代码或内容较长
    const hasECharts = htmlContent.includes('echarts') || htmlContent.includes('ECharts');
    const isLongContent = htmlContent.length > 1000; // 对超过1000字符的内容也使用Base64编码
    const shouldUseBase64 = hasECharts || isLongContent;
    
    // 对HTML内容进行编码，防止在保存时被截断或解析错误
    // 使用Base64编码处理长内容或包含ECharts的内容
    let encodedContent;
    try {
      if (shouldUseBase64) {
        // 对于长内容或包含ECharts的内容，使用Base64编码
        encodedContent = btoa(encodeURIComponent(htmlContent.trim()));
      } else {
        // 对于普通内容，使用URI编码
        encodedContent = encodeURIComponent(htmlContent.trim());
      }
    } catch (e) {
      console.error('编码HTML内容失败:', e);
      // 如果编码失败，尝试分段编码
      try {
        // 分段处理长内容
        const chunkSize = 500;
        let result = '';
        for (let i = 0; i < htmlContent.length; i += chunkSize) {
          const chunk = htmlContent.substring(i, i + chunkSize);
          result += encodeURIComponent(chunk);
        }
        encodedContent = btoa(result);
        shouldUseBase64 = true; // 强制使用Base64标记
      } catch (e2) {
        console.error('分段编码HTML内容失败:', e2);
        // 如果还是失败，使用简单编码并截断
        encodedContent = encodeURIComponent(htmlContent.substring(0, 1000) + '... (内容过长，已截断)');
        shouldUseBase64 = false;
      }
    }
    
    // 返回带有特殊标记的div，稍后会被渲染为HTML内容
    // 添加data-encoding-type属性标记编码方式
    return `<div class="html-container" data-html-id="${htmlId}" data-html-content="${encodedContent}" data-encoding-type="${shouldUseBase64 ? 'base64' : 'uri'}"></div>`;
  });
}

/**
 * 渲染页面中的HTML代码块
 * @param container 包含HTML代码块的容器元素
 */
export function renderHtmlInContainer(container: HTMLElement): void {
  const htmlContainers = container.querySelectorAll('.html-container');
  if (htmlContainers.length === 0) return;
  
  // 检查是否需要加载ECharts脚本
  const needsECharts = Array.from(htmlContainers).some(container => {
    const encodedContent = container.getAttribute('data-html-content');
    const encodingType = container.getAttribute('data-encoding-type') || 'uri';
    if (!encodedContent) return false;
    
    try {
      let htmlContent;
      if (encodingType === 'base64') {
        htmlContent = decodeURIComponent(atob(encodedContent));
      } else {
        htmlContent = decodeURIComponent(encodedContent);
      }
      return htmlContent.includes('echarts') || htmlContent.includes('ECharts');
    } catch (e) {
      return false;
    }
  });
  
  // 为ECharts全局变量声明接口
  declare global {
    interface Window {
      echarts: any;
      myChart: any; // 添加myChart变量声明，常见于ECharts示例代码中
      chart: any; // 添加chart变量声明，常见于ECharts示例代码中
    }
  }

  // 如果需要ECharts，确保已加载
  if (needsECharts && typeof window.echarts === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    document.head.appendChild(script);
  }
  
  htmlContainers.forEach(container => {
    try {
      const htmlId = container.getAttribute('data-html-id');
      const encodedContent = container.getAttribute('data-html-content');
      const encodingType = container.getAttribute('data-encoding-type') || 'uri';
      
      if (!htmlId || !encodedContent) return;
      
      // 根据编码类型解码HTML内容
      let htmlContent;
      try {
        if (encodingType === 'base64') {
          // 对于Base64编码的内容（通常是包含ECharts的长内容）
          htmlContent = decodeURIComponent(atob(encodedContent));
        } else {
          // 对于普通URI编码的内容
          htmlContent = decodeURIComponent(encodedContent);
        }
      } catch (e) {
        console.error('解码HTML内容失败:', e);
        // 尝试不同的解码方式
        try {
          if (encodingType === 'base64') {
            // 尝试直接解码Base64，不进行URI解码
            htmlContent = atob(encodedContent);
          } else {
            htmlContent = decodeURIComponent(encodedContent);
          }
        } catch (e2) {
          console.error('备用解码方式也失败:', e2);
          throw new Error(`HTML内容解码失败: ${e2.message}`);
        }
      }
      
      // 创建一个iframe来安全地渲染HTML内容
      const iframe = document.createElement('iframe');
      iframe.id = htmlId;
      iframe.style.width = '100%';
      iframe.style.height = '400px';
      iframe.style.border = '1px solid #ddd';
      iframe.style.borderRadius = '4px';
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals'; // 增加更多权限以确保ECharts能够正常渲染
      container.appendChild(iframe);
      
      // 设置iframe内容
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        
        // 检查是否包含ECharts
        const hasECharts = htmlContent.includes('echarts') || htmlContent.includes('ECharts');
        
        if (hasECharts) {
          // 为iframe加载完成后的ECharts初始化添加事件监听
          iframe.onload = () => {
            try {
              // 尝试访问iframe中的echarts对象
              const iframeWindow = iframe.contentWindow;
              if (iframeWindow && iframeWindow.document.readyState === 'complete') {
                // 确保iframe中的echarts已初始化
                setTimeout(() => {
                  try {
                    // 如果iframe中有myChart变量，尝试调用resize方法以确保图表正确渲染
                    if (iframeWindow.myChart) {
                      iframeWindow.myChart.resize();
                    }
                    // 如果有多个图表，可能存在命名为chart的变量
                    if (iframeWindow.chart) {
                      iframeWindow.chart.resize();
                    }
                  } catch (e) {
                    console.error('尝试调整ECharts大小失败:', e);
                  }
                }, 500); // 延迟500ms确保脚本执行完成
              }
            } catch (e) {
              console.error('访问iframe内容失败:', e);
            }
          };
        }
        
        // 添加调整按钮
        addAdjustButtons(container, iframe);
      }
    } catch (e) {
      console.error('渲染HTML代码块失败:', e);
      container.innerHTML = `<div class="html-error">HTML渲染错误: ${e instanceof Error ? e.message : String(e)}</div>`;
    }
  });
}

/**
 * 添加调整按钮
 * @param container HTML容器
 * @param iframe iframe元素
 */
function addAdjustButtons(container: Element, iframe: HTMLIFrameElement): void {
  // 创建控制面板
  const controlPanel = document.createElement('div');
  controlPanel.className = 'html-control-panel';
  controlPanel.style.marginTop = '10px';
  controlPanel.style.display = 'flex';
  controlPanel.style.flexWrap = 'wrap';
  controlPanel.style.gap = '8px';
  
  // 添加高度调整
  const heightControl = document.createElement('div');
  heightControl.innerHTML = `
    <label style="margin-right: 5px;">高度:</label>
    <select class="html-height-select">
      <option value="300">300px</option>
      <option value="400" selected>400px</option>
      <option value="500">500px</option>
      <option value="600">600px</option>
      <option value="800">800px</option>
    </select>
  `;
  controlPanel.appendChild(heightControl);
  
  // 添加查看源码按钮
  const viewSourceButton = document.createElement('button');
  viewSourceButton.textContent = '查看源码';
  viewSourceButton.style.padding = '2px 8px';
  viewSourceButton.style.cursor = 'pointer';
  controlPanel.appendChild(viewSourceButton);
  
  // 添加控制面板到容器
  container.appendChild(controlPanel);
  
  // 绑定高度调整事件
  const heightSelect = controlPanel.querySelector('.html-height-select') as HTMLSelectElement;
  if (heightSelect) {
    heightSelect.addEventListener('change', () => {
      iframe.style.height = `${heightSelect.value}px`;
    });
  }
  
  // 绑定查看源码事件
  viewSourceButton.addEventListener('click', () => {
    const encodedContent = container.getAttribute('data-html-content');
    const encodingType = container.getAttribute('data-encoding-type') || 'uri';
    
    if (encodedContent) {
      // 根据编码类型解码HTML内容
      let htmlContent;
      try {
        if (encodingType === 'base64') {
          // 对于Base64编码的内容（通常是包含ECharts的长内容）
          htmlContent = decodeURIComponent(atob(encodedContent));
        } else {
          // 对于普通URI编码的内容
          htmlContent = decodeURIComponent(encodedContent);
        }
      } catch (e) {
        console.error('解码HTML内容失败:', e);
        // 尝试不同的解码方式
        try {
          if (encodingType === 'base64') {
            // 尝试直接解码Base64，不进行URI解码
            htmlContent = atob(encodedContent);
          } else {
            htmlContent = decodeURIComponent(encodedContent);
          }
        } catch (e2) {
          console.error('备用解码方式也失败:', e2);
          throw new Error(`HTML内容解码失败: ${e2.message}`);
        }
      }
      
      const sourceWindow = window.open('', '_blank');
      if (sourceWindow) {
        sourceWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>HTML源码</title>
            <style>
              body {
                font-family: monospace;
                padding: 20px;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            ${htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </body>
          </html>
        `);
        sourceWindow.document.close();
      }
    }
  });
}