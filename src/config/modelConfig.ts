interface ModelConfig {
  name: string;
  provider: string;
  models: string[];
  defaultEndpoint: string;
  defaultModel: string;
}

export const modelConfigs: ModelConfig[] = [
  {
    name: 'DeepSeek',
    provider: 'deepseek',
    models: [
      'deepseek-chat',
      'deepseek-reasoner'
    ],
    defaultEndpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  },
  {
    name: '火山方舟',
    provider: 'volcano',
    models: [
      'doubao-1-5-vision-pro-32k-250115',
      'doubao-1-5-pro-256k-250115',
      'deepseek-r1-250120'
    ],
    defaultEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1-5-pro-256k-250115'
  },
  {
    name: '阿里千帆',
    provider: 'alibaba',
    models: [
      'qwq-32b',
      'deepseek-r1',
      'deepseek-v3'
    ],
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwq-32b'
  },
  {
    name: '硅基流动',
    provider: 'guiji',
    models: [
      'Qwen/QwQ-32B',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'internlm/internlm2_5-20b-chat'
    ],
    defaultEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    defaultModel: 'Qwen/QwQ-32B'
  }
];

export const getModelConfigByProvider = (provider: string): ModelConfig | undefined => {
  return modelConfigs.find(config => config.provider === provider);
};