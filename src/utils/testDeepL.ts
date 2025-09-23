// DeepL API 测试工具
// 用于验证API密钥是否正确配置

export async function testDeepLAPI(apiKey: string) {
  try {
    console.log('🌐 测试DeepL API...');
    
    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: 'Hello, world!',
        target_lang: 'ZH',
        source_lang: 'EN'
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ DeepL API测试成功!', data);
    return data.translations[0].text;
  } catch (error) {
    console.error('❌ DeepL API测试失败:', error);
    throw error;
  }
}

// 获取DeepL使用情况
export async function getDeepLUsage(apiKey: string) {
  try {
    const response = await fetch('https://api.deepl.com/v2/usage', {
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
      }
    });

    if (!response.ok) {
      throw new Error(`使用情况查询失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 DeepL使用情况:', data);
    return data;
  } catch (error) {
    console.error('❌ 查询DeepL使用情况失败:', error);
    throw error;
  }
}

// 在浏览器控制台中使用
if (typeof window !== 'undefined') {
  (window as any).testDeepL = async () => {
    const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
    if (!apiKey) {
      console.error('❌ 未找到VITE_DEEPL_API_KEY环境变量');
      return;
    }
    
    try {
      const result = await testDeepLAPI(apiKey);
      console.log('🎉 翻译结果:', result);
      
      const usage = await getDeepLUsage(apiKey);
      console.log('📊 使用情况:', usage);
    } catch (error) {
      console.error('测试失败:', error);
    }
  };
  
  console.log('💡 在控制台中运行 testDeepL() 来测试DeepL API');
}