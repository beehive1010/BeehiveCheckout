// 快速测试工具
export const quickTests = {
  // 测试DeepL API
  async testDeepL() {
    try {
      const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
      if (!apiKey) {
        console.log('❌ DeepL API密钥未配置');
        return false;
      }

      console.log('🌐 测试DeepL API...');
      
      const response = await fetch('https://api.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: 'Hello! Welcome to our NFT platform.',
          target_lang: 'ZH',
          source_lang: 'EN'
        })
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translations[0].text;
      
      console.log('✅ DeepL测试成功!');
      console.log('原文: Hello! Welcome to our NFT platform.');
      console.log('译文:', translatedText);
      
      return true;
    } catch (error) {
      console.error('❌ DeepL测试失败:', error);
      return false;
    }
  },

  // 测试翻译服务状态
  async testTranslationService() {
    try {
      const { translationService } = await import('../lib/services/translationService');
      const providers = translationService.getAvailableProviders();
      
      console.log('📊 可用翻译服务:', providers);
      console.log('🚀 DeepL状态:', providers.includes('DeepL') ? '✅ 已启用' : '❌ 未启用');
      
      return providers.length > 0;
    } catch (error) {
      console.error('❌ 翻译服务测试失败:', error);
      return false;
    }
  },

  // 运行所有测试
  async runAll() {
    console.log('🧪 开始运行快速测试...\n');
    
    const results = {
      translationService: await this.testTranslationService(),
      deepL: await this.testDeepL()
    };
    
    console.log('\n📋 测试结果汇总:');
    console.log('翻译服务:', results.translationService ? '✅' : '❌');
    console.log('DeepL API:', results.deepL ? '✅' : '❌');
    
    const allPassed = Object.values(results).every(Boolean);
    console.log('\n🎯 总体状态:', allPassed ? '✅ 全部通过' : '⚠️ 存在问题');
    
    return results;
  }
};

// 在控制台中可用
if (typeof window !== 'undefined') {
  (window as any).quickTests = quickTests;
  console.log('💡 在控制台中运行 quickTests.runAll() 来测试所有功能');
}