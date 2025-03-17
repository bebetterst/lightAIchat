import axios from 'axios';
import { OpenAI } from 'openai';

interface ModelSettings {
  provider: string;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  supportedFileTypes: string[];
  stream?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  reasoningContent?: string;
}

// 获取模型设置
const getModelSettings = (): ModelSettings | null => {
  const savedSettings = localStorage.getItem('modelSettings');
  if (savedSettings) {
    return JSON.parse(savedSettings);
  }
  return null;
};

// 测试API连接
export const testAPIConnection = async (settings: ModelSettings): Promise<{success: boolean, message: string}> => {
  try {
    // 根据不同的提供商测试连接
    switch (settings.provider) {
      case 'openai':
        return await testOpenAIConnection(settings);
      case 'deepseek':
        return await testDeepSeekConnection(settings);
      case 'baidu':
        return await testBaiduConnection(settings);
      case 'xunfei':
        return await testXunfeiConnection(settings);
      case 'alibaba':
      case 'guiji':
      case 'volcano':
        return await testOpenAICompatibleConnection(settings);
      default:
        return { success: false, message: '不支持的API提供商' };
    }
  } catch (error: any) {
    console.error('API连接测试失败:', error);
    return { success: false, message: `连接失败: ${error.message || '未知错误'}` };
  }
};

// 测试OpenAI连接
async function testOpenAIConnection(settings: ModelSettings): Promise<{success: boolean, message: string}> {
  try {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.apiEndpoint || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true
    });
    
    // 发送一个简单的模型列表请求来测试连接
    await client.models.list();
    return { success: true, message: '连接成功' };
  } catch (error: any) {
    return { success: false, message: `OpenAI连接失败: ${error.message}` };
  }
}

// 测试DeepSeek连接
async function testDeepSeekConnection(settings: ModelSettings): Promise<{success: boolean, message: string}> {
  try {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.apiEndpoint || 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true,
      maxRetries: 2
    });
    
    // 发送一个简单的聊天请求来测试连接
    await client.chat.completions.create({
      model: settings.modelName || 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    return { success: true, message: '连接成功' };
  } catch (error: any) {
    console.error('DeepSeek连接测试失败:', error);
    return { success: false, message: `DeepSeek连接失败: ${error.message}` };
  }
}

// 测试百度文心连接
async function testBaiduConnection(settings: ModelSettings): Promise<{success: boolean, message: string}> {
  try {
    // 尝试获取access_token来测试连接
    await getBaiduAccessToken(settings.apiKey);
    return { success: true, message: '连接成功' };
  } catch (error: any) {
    return { success: false, message: `百度文心连接失败: ${error.message}` };
  }
}

// 测试讯飞星火连接
async function testXunfeiConnection(settings: ModelSettings): Promise<{success: boolean, message: string}> {
  // 由于讯飞API的特殊性，这里只做简单的API密钥格式检查
  if (!settings.apiKey || settings.apiKey.split('.').length !== 3) {
    return { success: false, message: '讯飞API密钥格式不正确，应为appid.apiKey.apiSecret格式' };
  }
  return { success: true, message: '密钥格式正确，请在实际对话中验证' };
}

// 测试OpenAI兼容接口连接
async function testOpenAICompatibleConnection(settings: ModelSettings): Promise<{success: boolean, message: string}> {
  try {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: getDefaultEndpoint(settings.provider, settings.apiEndpoint),
      dangerouslyAllowBrowser: true
    });
    
    // 发送一个简单的聊天请求来测试连接
    await client.chat.completions.create({
      model: getDefaultModel(settings.provider),
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    return { success: true, message: '连接成功' };
  } catch (error: any) {
    return { success: false, message: `${settings.provider}连接失败: ${error.message}` };
  }
}

// 获取默认API端点
function getDefaultEndpoint(provider: string, customEndpoint?: string): string {
  if (customEndpoint) return customEndpoint;
  
  const endpoints: {[key: string]: string} = {
    'volcano': 'https://ark.cn-beijing.volces.com/api/v3',
    'alibaba': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'guiji': 'https://api.siliconflow.cn/v1/chat/completions'
  };
  return endpoints[provider] || '';
}

// 获取默认模型
function getDefaultModel(provider: string): string {
  const models: {[key: string]: string} = {
    'volcano': 'doubao-1-5-pro-256k-250115',
    'alibaba': 'qwq-32b',
    'guiji': 'Qwen/QwQ-32B'
  };
  return models[provider] || '';
}

// 发送消息到AI API
export const sendMessageToAI = async (messages: ChatMessage[], onProgress?: (content: string) => void): Promise<string> => {
  const settings = getModelSettings();
  
  if (!settings || !settings.apiKey) {
    throw new Error('请先在设置中配置API密钥');
  }

  try {
    // 根据不同的提供商构建不同的请求
    switch (settings.provider) {
      case 'openai':
        return await sendToOpenAI(messages, settings, onProgress);
      case 'deepseek':
        return await sendToDeepSeek(messages, settings, onProgress);
      case 'baidu':
        return await sendToBaidu(messages, settings);
      case 'xunfei':
        return await sendToXunfei(messages, settings);
      case 'alibaba':
      case 'guiji':
      case 'volcano':
        return await sendToOpenAICompatible(messages, settings, onProgress);
      default:
        throw new Error('不支持的API提供商');
    }
  } catch (error: any) {
    console.error('AI API请求失败:', error);
    throw new Error(`AI响应失败: ${error.message || '未知错误'}`);
  }
};

// OpenAI API
async function sendToOpenAI(messages: ChatMessage[], settings: ModelSettings, onProgress?: (content: string) => void): Promise<string> {
  // 使用流式响应
  if (settings.stream && onProgress) {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.apiEndpoint || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true
    });

    const response = await client.chat.completions.create({
      model: settings.modelName,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: true
    });

    let fullContent = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      onProgress(fullContent);
    }
    return fullContent;
  } else {
    // 非流式响应
    const apiUrl = settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    
    const response = await axios.post(
      apiUrl,
      {
        model: settings.modelName,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }
}

// DeepSeek API
async function sendToDeepSeek(messages: ChatMessage[], settings: ModelSettings, onProgress?: (content: string) => void): Promise<string> {
  // 默认使用流式响应，除非明确设置为false
  const useStream = settings.stream !== false && onProgress !== undefined;

// OpenAI兼容接口
async function sendToOpenAICompatible(messages: ChatMessage[], settings: ModelSettings, onProgress?: (content: string) => void): Promise<string> {
  const useStream = settings.stream !== false && onProgress !== undefined;
  const apiUrl = getDefaultEndpoint(settings.provider, settings.apiEndpoint);
  const modelName = settings.modelName || getDefaultModel(settings.provider);

  if (useStream) {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: apiUrl,
      dangerouslyAllowBrowser: true
    });

    const response = await client.chat.completions.create({
      model: modelName,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: true
    });

    let fullContent = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      onProgress(fullContent);
    }
    return fullContent;
  } else {
    const response = await axios.post(
      apiUrl,
      {
        model: modelName,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }
}
  
  // 预处理消息，确保用户和助手消息交替出现
  const processedMessages = preprocessMessages(messages);
  
  try {
    if (useStream) {
      const client = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.apiEndpoint || 'https://api.deepseek.com/v1',
        dangerouslyAllowBrowser: true,
        timeout: 60000, // 设置超时时间为60秒
        maxRetries: 3 // 设置最大重试次数
      });

      const response = await client.chat.completions.create({
        model: settings.modelName,
        messages: processedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: true
      });

      let fullContent = '';
      let reasoningContent = '';
      for await (const chunk of response) {
        // 分别处理思维链内容和正文内容
        if (chunk.choices[0]?.delta?.reasoning_content) {
          // 获取思维链内容
          const reasoning = chunk.choices[0].delta.reasoning_content || '';
          reasoningContent += reasoning;
        }
        
        if (chunk.choices[0]?.delta?.content) {
          // 获取正文内容
          const content = chunk.choices[0].delta.content || '';
          fullContent += content;
        }
        
        // 将思维链内容和正文内容一起传递，用特殊格式区分
        if (reasoningContent) {
          onProgress(`<div class="reasoning-content">${reasoningContent}</div>\n\n${fullContent}`);
        } else {
          onProgress(fullContent);
        }
      }
      // 返回完整内容，包括思维链和正文
      return reasoningContent ? `<div class="reasoning-content">${reasoningContent}</div>\n\n${fullContent}` : fullContent;
    } else {
      // 非流式响应
      const apiUrl = settings.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
    
      try {
        // 设置重试次数和间隔
        const maxRetries = 3;
        let retries = 0;
        let lastError;
        
        while (retries < maxRetries) {
          try {
            const response = await axios.post(
              apiUrl,
              {
                model: settings.modelName,
                messages: processedMessages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                temperature: settings.temperature,
                max_tokens: settings.maxTokens
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${settings.apiKey}`
                },
                timeout: 60000 // 设置超时时间为60秒
              }
            );

            // 检查是否有思维链内容
            const reasoningContent = response.data.choices[0].message.reasoning_content;
            const content = response.data.choices[0].message.content;
            
            // 如果有思维链内容，则与正文一起返回，用特殊格式区分
            if (reasoningContent) {
              return `<div class="reasoning-content">${reasoningContent}</div>\n\n${content}`;
            }
            
            return content;
          } catch (err: any) {
            lastError = err;
            retries++;
            
            // 记录详细错误信息
            console.error(`DeepSeek API请求失败(尝试 ${retries}/${maxRetries}):`, err);
            
            // 如果不是网络错误或已达到最大重试次数，则不再重试
            if (!['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ERR_NAME_NOT_RESOLVED'].includes(err.code) || retries >= maxRetries) {
              break;
            }
            
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
        
        // 所有重试都失败后抛出最后一个错误
        if (lastError) {
          if (lastError.code === 'ECONNABORTED') {
            throw new Error('请求超时，请稍后再试');
          } else if (lastError.code === 'ERR_NAME_NOT_RESOLVED') {
            throw new Error('无法解析API域名，请检查网络连接或API端点配置');
          } else if (lastError.response) {
            throw new Error(`服务器响应错误: ${lastError.response.status} ${lastError.response.statusText}`);
          }
          throw lastError;
        }
        
        throw new Error('未知错误');
      } catch (error: any) {
        console.error('DeepSeek API请求失败:', error);
        throw error;
      }
    }
  } catch (error: any) {
    console.error('DeepSeek API请求失败:', error);
    throw error;
  }
}

// 预处理消息，确保用户和助手消息交替出现
function preprocessMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 1) {
    return messages;
  }
  
  const result: ChatMessage[] = [];
  let lastRole: string | null = null;
  
  for (const message of messages) {
    // 如果当前消息与上一条消息角色相同，则合并内容
    if (lastRole === message.role) {
      const lastMessage = result[result.length - 1];
      lastMessage.content += '\n\n' + message.content;
    } else {
      // 角色不同，添加新消息
      result.push({
        role: message.role,
        content: message.content
      });
      lastRole = message.role;
    }
  }
  
  // 确保消息序列以用户消息开始
  if (result.length > 0 && result[0].role === 'assistant') {
    result.unshift({
      role: 'user',
      content: '请继续'
    });
  }
  
  return result;
}

// 百度文心 API
async function sendToBaidu(messages: ChatMessage[], settings: ModelSettings): Promise<string> {
  const apiUrl = settings.apiEndpoint || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
  
  // 百度API需要先获取access_token
  const accessToken = await getBaiduAccessToken(settings.apiKey);
  
  try {
    const response = await axios.post(
      `${apiUrl}?access_token=${accessToken}`,
      {
        model: settings.modelName,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 设置超时时间为60秒
      }
    );

    return response.data.result;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后再试');
    }
    throw error;
  }
}

// 获取百度API的access_token
async function getBaiduAccessToken(apiKey: string): Promise<string> {
  // 这里简化处理，实际上百度API需要API Key和Secret Key
  // 在实际应用中，应该将Secret Key安全存储
  const [clientId, clientSecret] = apiKey.split(':');
  
  if (!clientId || !clientSecret) {
    throw new Error('百度API密钥格式错误，请使用 API_KEY:SECRET_KEY 的格式');
  }
  
  try {
    const response = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
      {},
      { timeout: 30000 }
    );
    
    return response.data.access_token;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('获取百度访问令牌超时，请稍后再试');
    }
    throw error;
  }
}

// 讯飞星火 API
async function sendToXunfei(messages: ChatMessage[], settings: ModelSettings): Promise<string> {
  const apiUrl = settings.apiEndpoint || 'https://spark-api.xf-yun.com/v1.1/chat';
  
  // 讯飞API的实现可能需要特殊处理，这里简化处理
  try {
    const response = await axios.post(
      apiUrl,
      {
        header: {
          app_id: settings.apiKey.split(':')[0],
          uid: 'user'
        },
        parameter: {
          chat: {
            domain: settings.modelName,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens
          }
        },
        payload: {
          message: {
            text: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey.split(':')[1]}`
        },
        timeout: 60000 // 设置超时时间为60秒
      }
    );

    return response.data.payload.text.content;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后再试');
    }
    throw error;
  }
}