// 模型存储工具

export interface SavedModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  apiEndpoint: string;
  temperature: number;
  maxTokens: number;
  supportedFileTypes: string[];
  stream: boolean;
  createdAt: number;
}

// 获取所有保存的模型
export const getSavedModels = (): SavedModel[] => {
  const savedModelsStr = localStorage.getItem('savedModels');
  if (savedModelsStr) {
    try {
      return JSON.parse(savedModelsStr);
    } catch (error) {
      console.error('解析保存的模型失败:', error);
      return [];
    }
  }
  return [];
};

// 获取当前使用的模型
export const getCurrentModel = (): SavedModel | null => {
  const currentModelStr = localStorage.getItem('modelSettings');
  if (currentModelStr) {
    try {
      const parsedModel = JSON.parse(currentModelStr);
      return {
        id: parsedModel.id || 'current',
        name: parsedModel.modelName,
        provider: parsedModel.provider,
        apiKey: parsedModel.apiKey,
        apiEndpoint: parsedModel.apiEndpoint,
        temperature: parsedModel.temperature,
        maxTokens: parsedModel.maxTokens,
        supportedFileTypes: parsedModel.supportedFileTypes || [],
        stream: parsedModel.stream !== undefined ? parsedModel.stream : true,
        createdAt: parsedModel.createdAt || Date.now()
      };
    } catch (error) {
      console.error('解析当前模型设置失败:', error);
      return null;
    }
  }
  return null;
};

// 保存模型
export const saveModel = (model: SavedModel): void => {
  // 获取现有的模型列表
  const savedModels = getSavedModels();
  
  // 检查是否已存在相同ID的模型
  const existingIndex = savedModels.findIndex(m => m.id === model.id);
  
  if (existingIndex >= 0) {
    // 更新现有模型
    savedModels[existingIndex] = model;
  } else {
    // 检查是否存在相同供应商、相同API密钥、相同模型名称的模型
    const duplicateIndex = savedModels.findIndex(m => 
      m.provider === model.provider && 
      m.apiKey === model.apiKey && 
      m.name === model.name
    );
    
    if (duplicateIndex >= 0) {
      // 更新现有的相似模型，但保留原ID
      savedModels[duplicateIndex] = {
        ...model,
        id: savedModels[duplicateIndex].id,
        createdAt: savedModels[duplicateIndex].createdAt
      };
    } else {
      // 添加新模型
      savedModels.push(model);
    }
  }
  
  // 保存到localStorage
  localStorage.setItem('savedModels', JSON.stringify(savedModels));
};

// 删除模型
export const deleteModel = (modelId: string): void => {
  let savedModels = getSavedModels();
  savedModels = savedModels.filter(model => model.id !== modelId);
  localStorage.setItem('savedModels', JSON.stringify(savedModels));
};

// 设置当前使用的模型
export const setCurrentModel = (model: SavedModel): void => {
  // 转换为modelSettings格式
  const modelSettings = {
    id: model.id,
    provider: model.provider,
    apiKey: model.apiKey,
    apiEndpoint: model.apiEndpoint,
    modelName: model.name,
    temperature: model.temperature,
    maxTokens: model.maxTokens,
    supportedFileTypes: model.supportedFileTypes,
    stream: model.stream,
    createdAt: model.createdAt
  };
  
  // 保存到localStorage
  localStorage.setItem('modelSettings', JSON.stringify(modelSettings));
};