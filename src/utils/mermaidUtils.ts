/**
 * 工具函数，用于处理Mermaid图表格式
 * 特别是将DeepSeek生成的graph TD格式转换为flowchart TD格式
 */

/**
 * 检测并转换graph TD格式为flowchart TD格式
 * @param content Markdown内容
 * @returns 转换后的内容
 */
export function convertGraphToFlowchart(content: string): string {
  if (!content) return content;
  
  // 使用正则表达式匹配```graph TD 开头的代码块
  const graphTdRegex = /```graph TD\s*([\s\S]*?)```/g;
  
  // 替换为flowchart TD格式
  return content.replace(graphTdRegex, (match, graphContent) => {
    // 返回转换后的格式
    return '```flowchart TD\n' + graphContent + '```';
  });
}