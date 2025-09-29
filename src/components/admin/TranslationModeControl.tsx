import React from 'react';
import {useI18n} from '../../contexts/I18nContext';
import {hybridI18nService} from '../../lib/services/hybridI18nService';

const TranslationModeControl: React.FC = () => {
  const { useLocalOnly, setLocalOnlyMode, refreshTranslations, language } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [cacheInfo, setCacheInfo] = React.useState<any>(null);

  React.useEffect(() => {
    updateCacheInfo();
  }, [useLocalOnly]);

  const updateCacheInfo = () => {
    const info = hybridI18nService.getCacheInfo();
    setCacheInfo(info);
  };

  const handleModeToggle = async (localOnly: boolean) => {
    setIsLoading(true);
    try {
      // Save preference to localStorage
      localStorage.setItem('beehive-translation-mode', localOnly ? 'local-only' : 'hybrid');
      
      setLocalOnlyMode(localOnly);
      
      if (!localOnly) {
        // Load hybrid translations when switching to hybrid mode
        await refreshTranslations();
      }
      
      updateCacheInfo();
    } catch (error) {
      console.error('Error switching translation mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCache = async () => {
    setIsLoading(true);
    try {
      await hybridI18nService.refreshTranslations();
      await refreshTranslations();
      updateCacheInfo();
    } catch (error) {
      console.error('Error refreshing translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    hybridI18nService.cleanup();
    updateCacheInfo();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        翻译模式控制
      </h3>
      
      {/* Translation Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          翻译加载模式
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="translation-mode"
              checked={useLocalOnly}
              onChange={() => handleModeToggle(true)}
              disabled={isLoading}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              本地翻译模式 (仅使用本地翻译文件，不访问数据库)
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="translation-mode"
              checked={!useLocalOnly}
              onChange={() => handleModeToggle(false)}
              disabled={isLoading}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              混合模式 (本地翻译 + 数据库更新)
            </span>
          </label>
        </div>
      </div>

      {/* Current Mode Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              当前模式:
            </span>
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              useLocalOnly 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            }`}>
              {useLocalOnly ? '本地模式' : '混合模式'}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            当前语言: {language}
          </div>
        </div>
      </div>

      {/* Cache Information */}
      {cacheInfo && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            缓存信息
          </h4>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              已缓存语言: {cacheInfo.cachedLanguages.join(', ')} ({cacheInfo.cachedLanguages.length}个)
            </div>
            
            {Object.entries(cacheInfo.cacheStatus).map(([lang, status]: [string, any]) => (
              <div key={lang} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{lang}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {status.translationCount} 个翻译
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    status.source === 'hybrid' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                      : status.source === 'local'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {status.source}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    status.isValid ? 'bg-green-500' : 'bg-red-500'
                  }`} title={status.isValid ? '缓存有效' : '缓存过期'}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Management Actions */}
      <div className="flex space-x-3">
        <button
          onClick={handleRefreshCache}
          disabled={isLoading || useLocalOnly}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? '刷新中...' : '刷新缓存'}
        </button>
        <button
          onClick={handleClearCache}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          清空缓存
        </button>
      </div>

      {/* Configuration Info */}
      {cacheInfo?.config && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            配置信息
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>缓存过期时间: {Math.round(cacheInfo.config.cacheExpiration / (1000 * 60))} 分钟</div>
            <div>更新检查间隔: {Math.round(cacheInfo.config.updateCheckInterval / (1000 * 60))} 分钟</div>
            <div>自动更新: {cacheInfo.config.enableAutoUpdate ? '已启用' : '已禁用'}</div>
            <div>网络超时: {cacheInfo.config.networkTimeout / 1000} 秒</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationModeControl;