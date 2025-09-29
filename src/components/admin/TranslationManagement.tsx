import React, {useCallback, useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Progress} from '@/components/ui/progress';
import {useToast} from '@/hooks/use-toast';
import {translationManagementService} from '@/lib/services/translationManagementService';
import {useIsMobile} from '@/hooks/use-mobile';
import {
    AlertCircle,
    BarChart3,
    Download,
    Edit3,
    FileText,
    Globe,
    Key,
    Languages,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    Zap
} from 'lucide-react';

interface Translation {
  id: string;
  translation_key: string;
  language_code: string;
  translated_text: string;
  category: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

interface TranslationStats {
  totalKeys: number;
  totalTranslations: number;
  languages: Array<{
    code: string;
    name: string;
    totalTranslations: number;
    completionRate: number;
    emptyTranslations: number;
  }>;
  categories: Array<{
    name: string;
    keyCount: number;
    completionRate: number;
  }>;
}

const TranslationManagement: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [languages, setLanguages] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [translationKeys, setTranslationKeys] = useState<Array<{ translation_key: string; category: string }>>([]);
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Dialog states
  const [showAddLanguageDialog, setShowAddLanguageDialog] = useState(false);
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false);
  const [showEditTranslationDialog, setShowEditTranslationDialog] = useState(false);
  const [showBulkTranslateDialog, setShowBulkTranslateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Form data
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [newTranslationKey, setNewTranslationKey] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newContext, setNewContext] = useState('');
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [editTranslatedText, setEditTranslatedText] = useState('');
  
  // Bulk operations
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkTargetLanguages, setBulkTargetLanguages] = useState<string[]>([]);
  const [bulkSourceLanguage, setBulkSourceLanguage] = useState('en');
  const [bulkProgress, setBulkProgress] = useState(0);
  
  // Import
  const [importData, setImportData] = useState('');
  const [importLanguage, setImportLanguage] = useState('');
  const [importCategory, setImportCategory] = useState('imported');

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [languagesData, translationsData, keysData, statsData] = await Promise.all([
        translationManagementService.getSupportedLanguages(),
        translationManagementService.getTranslations({
          language_code: selectedLanguage !== 'all' ? selectedLanguage : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        }),
        translationManagementService.getTranslationKeys(),
        translationManagementService.getTranslationStatistics()
      ]);

      setLanguages(languagesData);
      setTranslations(translationsData);
      setTranslationKeys(keysData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: 'Error loading data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage, selectedCategory, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter translations based on search term
  const filteredTranslations = translations.filter(t =>
    t.translation_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.translated_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique categories
  const categories = Array.from(new Set(translationKeys.map(k => k.category || 'general')));

  // Handle adding new language
  const handleAddLanguage = async () => {
    if (!newLanguageCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a language code',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await translationManagementService.addLanguage(newLanguageCode.trim());
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Language added successfully'
        });
        setNewLanguageCode('');
        setShowAddLanguageDialog(false);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add language',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add language',
        variant: 'destructive'
      });
    }
  };

  // Handle adding new translation key
  const handleAddTranslationKey = async () => {
    if (!newTranslationKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a translation key',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await translationManagementService.addTranslationKey(
        newTranslationKey.trim(),
        newCategory.trim() || 'general',
        newContext.trim() || undefined
      );
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Translation key added successfully'
        });
        setNewTranslationKey('');
        setNewCategory('');
        setNewContext('');
        setShowAddKeyDialog(false);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add translation key',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add translation key',
        variant: 'destructive'
      });
    }
  };

  // Handle updating translation
  const handleUpdateTranslation = async () => {
    if (!editingTranslation) return;

    try {
      const result = await translationManagementService.updateTranslation(
        editingTranslation.translation_key,
        editingTranslation.language_code,
        editTranslatedText,
        editingTranslation.category
      );
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Translation updated successfully'
        });
        setEditingTranslation(null);
        setEditTranslatedText('');
        setShowEditTranslationDialog(false);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update translation',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update translation',
        variant: 'destructive'
      });
    }
  };

  // Handle bulk translation
  const handleBulkTranslate = async () => {
    if (selectedKeys.size === 0 || bulkTargetLanguages.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select keys and target languages',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setBulkProgress(0);

    try {
      const result = await translationManagementService.bulkTranslate(
        Array.from(selectedKeys),
        bulkTargetLanguages,
        bulkSourceLanguage
      );
      
      toast({
        title: result.success ? 'Success' : 'Partial Success',
        description: result.summary || 'Bulk translation completed',
        variant: result.success ? 'default' : 'destructive'
      });

      if (result.errors && result.errors.length > 0) {
        console.error('Bulk translation errors:', result.errors);
      }

      setSelectedKeys(new Set());
      setBulkTargetLanguages([]);
      setShowBulkTranslateDialog(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform bulk translation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setBulkProgress(0);
    }
  };

  // Handle sync translations
  const handleSyncTranslations = async () => {
    setIsLoading(true);
    
    try {
      const result = await translationManagementService.syncTranslations();
      
      toast({
        title: 'Success',
        description: result.message || 'Translations synced successfully'
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync translations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const data = await translationManagementService.exportTranslations(
        selectedLanguage !== 'all' ? selectedLanguage : undefined,
        selectedCategory !== 'all' ? selectedCategory : undefined
      );

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations_${selectedLanguage}_${selectedCategory}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Translations exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export translations',
        variant: 'destructive'
      });
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importData.trim() || !importLanguage) {
      toast({
        title: 'Error',
        description: 'Please provide import data and select language',
        variant: 'destructive'
      });
      return;
    }

    try {
      const data = JSON.parse(importData);
      const result = await translationManagementService.importTranslations(
        data,
        importLanguage,
        importCategory || 'imported',
        true // overwrite existing
      );

      toast({
        title: 'Success',
        description: `Imported ${result.imported} translations, skipped ${result.skipped}`
      });

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      setImportData('');
      setImportLanguage('');
      setImportCategory('imported');
      setShowImportDialog(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import translations. Please check the JSON format.',
        variant: 'destructive'
      });
    }
  };

  // Render statistics overview
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalKeys || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Translations</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTranslations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{languages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Language Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Language Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.languages.map((lang) => (
              <div key={lang.code} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {lang.name} ({lang.code})
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={lang.completionRate > 80 ? 'default' : lang.completionRate > 50 ? 'secondary' : 'destructive'}>
                      {lang.completionRate}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {lang.totalTranslations} / {stats.totalKeys}
                    </span>
                  </div>
                </div>
                <Progress value={lang.completionRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Category Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.categories.map((category) => (
              <div key={category.name} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {category.keyCount} keys
                  </div>
                </div>
                <Badge variant={category.completionRate > 80 ? 'default' : category.completionRate > 50 ? 'secondary' : 'destructive'}>
                  {category.completionRate}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render translations table
  const renderTranslations = () => (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Translations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Translations ({filteredTranslations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <Checkbox
                      checked={selectedKeys.size === filteredTranslations.length && filteredTranslations.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedKeys(new Set(filteredTranslations.map(t => t.translation_key)));
                        } else {
                          setSelectedKeys(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Language</th>
                  <th className="text-left p-2">Translation</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTranslations.map((translation) => (
                  <tr key={`${translation.translation_key}-${translation.language_code}`} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedKeys.has(translation.translation_key)}
                        onCheckedChange={(checked) => {
                          const newSelectedKeys = new Set(selectedKeys);
                          if (checked) {
                            newSelectedKeys.add(translation.translation_key);
                          } else {
                            newSelectedKeys.delete(translation.translation_key);
                          }
                          setSelectedKeys(newSelectedKeys);
                        }}
                      />
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {translation.translation_key}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {translation.language_code.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-md">
                      <div className="truncate">
                        {translation.translated_text || (
                          <span className="text-muted-foreground italic">Empty</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="secondary">
                        {translation.category}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTranslation(translation);
                            setEditTranslatedText(translation.translated_text);
                            setShowEditTranslationDialog(true);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this translation?')) {
                              const result = await translationManagementService.deleteTranslation(
                                translation.translation_key,
                                translation.language_code
                              );
                              
                              if (result.success) {
                                toast({
                                  title: 'Success',
                                  description: 'Translation deleted successfully'
                                });
                                loadData();
                              } else {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to delete translation',
                                  variant: 'destructive'
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Translation Management</h1>
          <p className="text-muted-foreground">
            Manage translations, languages, and internationalization
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showAddLanguageDialog} onOpenChange={setShowAddLanguageDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Languages className="h-4 w-4 mr-1" />
                Add Language
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Language</DialogTitle>
                <DialogDescription>
                  Add support for a new language code (e.g., 'es', 'fr', 'de')
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Language Code</label>
                  <Input
                    placeholder="e.g., es, fr, de"
                    value={newLanguageCode}
                    onChange={(e) => setNewLanguageCode(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddLanguageDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLanguage}>
                  Add Language
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddKeyDialog} onOpenChange={setShowAddKeyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-1" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Translation Key</DialogTitle>
                <DialogDescription>
                  Add a new translation key that will be available for all languages
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Translation Key</label>
                  <Input
                    placeholder="e.g., nav.home, button.submit"
                    value={newTranslationKey}
                    onChange={(e) => setNewTranslationKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g., navigation, forms"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Context (Optional)</label>
                  <Textarea
                    placeholder="Provide context for translators..."
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddKeyDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTranslationKey}>
                  Add Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showBulkTranslateDialog} onOpenChange={setShowBulkTranslateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={selectedKeys.size === 0}>
                <Zap className="h-4 w-4 mr-1" />
                Bulk Translate ({selectedKeys.size})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Translation</DialogTitle>
                <DialogDescription>
                  Automatically translate selected keys to target languages using DeepL API
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Source Language</label>
                  <Select value={bulkSourceLanguage} onValueChange={setBulkSourceLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Languages</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {languages.filter(lang => lang !== bulkSourceLanguage).map((lang) => (
                      <div key={lang} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bulk-lang-${lang}`}
                          checked={bulkTargetLanguages.includes(lang)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBulkTargetLanguages([...bulkTargetLanguages, lang]);
                            } else {
                              setBulkTargetLanguages(bulkTargetLanguages.filter(l => l !== lang));
                            }
                          }}
                        />
                        <label htmlFor={`bulk-lang-${lang}`} className="text-sm">
                          {lang.toUpperCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {bulkProgress > 0 && (
                  <div>
                    <label className="text-sm font-medium">Progress</label>
                    <Progress value={bulkProgress} className="mt-2" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkTranslateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkTranslate} disabled={bulkTargetLanguages.length === 0 || isLoading}>
                  {isLoading ? 'Translating...' : 'Start Translation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="translations" className="space-y-4">
          {renderTranslations()}
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync Translations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ensure all translation keys exist for all languages. This will create empty entries for missing combinations.
                </p>
                <Button onClick={handleSyncTranslations} disabled={isLoading}>
                  {isLoading ? 'Syncing...' : 'Sync All Translations'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto-Translate Missing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Automatically translate empty translations using DeepL API.
                </p>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will use DeepL API and may take some time for large datasets.
                  </AlertDescription>
                </Alert>
                <Button variant="secondary" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Translations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export translations as JSON file for backup or sharing.
                </p>
                <Button onClick={handleExport}>
                  Export Current Filter
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Translations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Import JSON</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import Translations</DialogTitle>
                      <DialogDescription>
                        Import translations from a JSON file. Existing translations will be overwritten.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Language Code</label>
                        <Select value={importLanguage} onValueChange={setImportLanguage}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang} value={lang}>
                                {lang.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Input
                          placeholder="imported"
                          value={importCategory}
                          onChange={(e) => setImportCategory(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">JSON Data</label>
                        <Textarea
                          placeholder="Paste JSON data here..."
                          value={importData}
                          onChange={(e) => setImportData(e.target.value)}
                          rows={10}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleImport}>
                        Import
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Translation Dialog */}
      <Dialog open={showEditTranslationDialog} onOpenChange={setShowEditTranslationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Translation</DialogTitle>
            <DialogDescription>
              Update the translation for {editingTranslation?.translation_key} ({editingTranslation?.language_code})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Translation</label>
              <Textarea
                value={editTranslatedText}
                onChange={(e) => setEditTranslatedText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTranslationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTranslation}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranslationManagement;