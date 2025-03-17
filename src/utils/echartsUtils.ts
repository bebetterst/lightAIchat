/**
 * 工具函数，用于处理ECharts图表格式和渲染
 */

/**
 * 检测并提取ECharts代码块
 * @param content Markdown内容
 * @returns 转换后的内容
 */
export function processEchartsBlocks(content: string): string {
  if (!content) return content;
  
  // 使用正则表达式匹配```echarts 开头的代码块
  const echartsRegex = /```echarts\s*([\s\S]*?)```/g;
  
  // 替换为可渲染的格式
  return content.replace(echartsRegex, (match, echartsContent) => {
    // 生成唯一ID
    const chartId = `echarts-${Math.random().toString(36).substring(2, 10)}`;
    
    // 返回带有特殊标记的div，稍后会被渲染为ECharts图表
    return `<div class="echarts-container" data-echarts-id="${chartId}" data-echarts-config="${encodeURIComponent(echartsContent.trim())}"></div>`;
  });
}

/**
 * 渲染页面中的ECharts图表
 * @param container 包含图表的容器元素
 */
export function renderEchartsInContainer(container: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const echartsContainers = container.querySelectorAll('.echarts-container');
    if (echartsContainers.length === 0) {
      resolve();
      return;
    }
    
    // 确保echarts已加载
    if (typeof window.echarts === 'undefined') {
      // 动态加载ECharts
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
      script.onload = () => {
        renderCharts(echartsContainers);
        resolve();
      };
      script.onerror = () => {
        console.error('加载ECharts脚本失败');
        resolve();
      };
      document.head.appendChild(script);
    } else {
      // ECharts已加载，直接渲染
      renderCharts(echartsContainers);
      resolve();
    }
  });
}

/**
 * 渲染ECharts图表
 * @param containers ECharts容器元素列表
 */
function renderCharts(containers: NodeListOf<Element>): void {
  containers.forEach(container => {
    try {
      const chartId = container.getAttribute('data-echarts-id');
      const configStr = container.getAttribute('data-echarts-config');
      
      if (!chartId || !configStr) return;
      
      // 解码配置
      const configCode = decodeURIComponent(configStr);
      
      // 创建图表容器
      const chartContainer = document.createElement('div');
      chartContainer.id = chartId;
      chartContainer.style.width = '100%';
      chartContainer.style.height = '400px';
      container.appendChild(chartContainer);
      
      // 执行配置代码获取选项
      let chartOptions;
      try {
        // 使用Function构造函数执行代码并返回配置对象
        chartOptions = new Function('return ' + configCode)();
      } catch (e) {
        console.error('解析ECharts配置失败:', e);
        container.innerHTML = `<div class="echarts-error">ECharts配置解析错误: ${e.message}</div>`;
        return;
      }
      
      // 初始化图表
      const chart = window.echarts.init(chartContainer);
      chart.setOption(chartOptions);
      
      // 添加调整按钮
      addAdjustButtons(container, chart, chartOptions);
      
      // 响应窗口大小变化
      window.addEventListener('resize', () => {
        chart.resize();
      });
    } catch (e) {
      console.error('渲染ECharts图表失败:', e);
      container.innerHTML = `<div class="echarts-error">ECharts渲染错误: ${e.message}</div>`;
    }
  });
}

/**
 * 添加调整按钮
 * @param container 图表容器
 * @param chart ECharts实例
 * @param options 图表配置
 */
function addAdjustButtons(container: Element, chart: any, options: any): void {
  // 创建控制面板
  const controlPanel = document.createElement('div');
  controlPanel.className = 'echarts-control-panel';
  controlPanel.style.marginTop = '10px';
  controlPanel.style.display = 'flex';
  controlPanel.style.flexWrap = 'wrap';
  controlPanel.style.gap = '8px';
  
  // 添加高度调整
  const heightControl = document.createElement('div');
  heightControl.innerHTML = `
    <label style="margin-right: 5px;">高度:</label>
    <select class="echarts-height-select">
      <option value="300">300px</option>
      <option value="400" selected>400px</option>
      <option value="500">500px</option>
      <option value="600">600px</option>
      <option value="800">800px</option>
    </select>
  `;
  controlPanel.appendChild(heightControl);
  
  // 添加主题切换
  const themeControl = document.createElement('div');
  themeControl.innerHTML = `
    <label style="margin-right: 5px;">主题:</label>
    <select class="echarts-theme-select">
      <option value="default" selected>默认</option>
      <option value="dark">暗色</option>
    </select>
  `;
  controlPanel.appendChild(themeControl);
  
  // 添加导出按钮
  const exportButton = document.createElement('button');
  exportButton.textContent = '导出图片';
  exportButton.style.padding = '2px 8px';
  exportButton.style.cursor = 'pointer';
  controlPanel.appendChild(exportButton);
  
  // 添加控制面板到容器
  container.appendChild(controlPanel);
  
  // 绑定高度调整事件
  const heightSelect = controlPanel.querySelector('.echarts-height-select') as HTMLSelectElement;
  if (heightSelect) {
    heightSelect.addEventListener('change', () => {
      const chartContainer = container.querySelector(`#${chart.id}`) as HTMLElement;
      if (chartContainer) {
        chartContainer.style.height = `${heightSelect.value}px`;
        chart.resize();
      }
    });
  }
  
  // 绑定主题切换事件
  const themeSelect = controlPanel.querySelector('.echarts-theme-select') as HTMLSelectElement;
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      // 获取当前容器和ID
      const chartContainer = container.querySelector(`#${chart.id}`) as HTMLElement;
      const chartId = chartContainer.id;
      
      // 销毁当前图表
      chart.dispose();
      
      // 使用新主题初始化图表
      const newChart = window.echarts.init(chartContainer, themeSelect.value);
      newChart.setOption(options);
      
      // 更新chart引用
      chart = newChart;
    });
  }
  
  // 绑定导出事件
  exportButton.addEventListener('click', () => {
    // 获取图表的数据URL
    const url = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = 'echarts-export.png';
    link.href = url;
    link.click();
  });
}

// 为ECharts全局变量声明接口
declare global {
  interface Window {
    echarts: any;
  }
}