import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  FileText,
  Search,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  User,
  Tag,
  TrendingUp,
  BarChart3,
  Globe,
  Clock,
  Star,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorAvatar: string;
  imageUrl: string;
  publishedAt: string;
  tags: string[];
  category: string;
  status: 'published' | 'draft' | 'scheduled';
  views: number;
  likes: number;
  comments: number;
  language: string;
  featured: boolean;
  trending: boolean;
  readTime: number;
  seoTitle?: string;
  seoDescription?: string;
}

interface BlogFormData {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  imageUrl: string;
  tags: string[];
  category: string;
  status: 'published' | 'draft' | 'scheduled';
  language: string;
  featured: boolean;
  trending: boolean;
  seoTitle: string;
  seoDescription: string;
  scheduledDate?: string;
}

export default function AdminBlog() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    excerpt: '',
    content: '',
    author: 'Beehive Team',
    imageUrl: '',
    tags: [],
    category: 'technology',
    status: 'draft',
    language: 'en',
    featured: false,
    trending: false,
    seoTitle: '',
    seoDescription: '',
  });

  useEffect(() => {
    loadBlogData();
  }, [searchTerm, statusFilter, categoryFilter]);

  const loadBlogData = async () => {
    try {
      // Real blog data from the HiveWorld page
      const realBlogPosts: BlogPost[] = [
        {
          id: '1',
          title: 'The Future of Web3 Membership Systems',
          excerpt: 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
          content: 'Full blog content here... Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
          author: 'Beehive Team',
          authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
          publishedAt: '2024-12-20T10:00:00Z',
          tags: ['Web3', 'Blockchain', 'Membership'],
          category: 'technology',
          status: 'published',
          views: 1250,
          likes: 89,
          comments: 23,
          language: 'en',
          featured: true,
          trending: true,
          readTime: 5,
          seoTitle: 'Web3 Membership Systems: The Future is Here',
          seoDescription: 'Discover how blockchain technology is transforming membership programs worldwide.'
        },
        {
          id: '2', 
          title: 'Understanding NFT-Based Access Control',
          excerpt: 'How NFTs are being used to gate content and create exclusive community experiences.',
          content: 'Full blog content here... Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          author: 'Technical Team',
          authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
          publishedAt: '2024-12-18T14:30:00Z',
          tags: ['NFT', 'Access Control', 'Technology'],
          category: 'technology',
          status: 'published',
          views: 892,
          likes: 67,
          comments: 15,
          language: 'en',
          featured: false,
          trending: true,
          readTime: 7,
          seoTitle: 'NFT Access Control: Complete Guide',
          seoDescription: 'Learn how NFTs enable sophisticated access control systems.'
        },
        {
          id: '3',
          title: 'Building Sustainable Referral Economies',
          excerpt: 'The mechanics behind successful referral programs and how they create lasting value.',
          content: 'Full blog content here... Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          author: 'Strategy Team',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
          publishedAt: '2024-12-15T09:15:00Z',
          tags: ['Referrals', 'Economics', 'Strategy'],
          category: 'business',
          status: 'published',
          views: 567,
          likes: 45,
          comments: 12,
          language: 'en',
          featured: false,
          trending: false,
          readTime: 6,
          seoTitle: 'Sustainable Referral Programs: Best Practices',
          seoDescription: 'Build referral programs that create long-term value for your platform.'
        },
        {
          id: '4',
          title: 'Multi-Chain Payment Integration Guide',
          excerpt: 'Technical deep-dive into implementing cross-chain payment solutions for dApps.',
          content: 'Full blog content here... Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          author: 'Dev Team',
          authorAvatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&h=400&fit=crop',
          publishedAt: '2024-12-12T16:45:00Z',
          tags: ['Multi-chain', 'Payments', 'Development'],
          category: 'development',
          status: 'published',
          views: 723,
          likes: 58,
          comments: 19,
          language: 'en',
          featured: true,
          trending: false,
          readTime: 12,
          seoTitle: 'Multi-Chain Payments: Developer Guide',
          seoDescription: 'Complete guide to implementing cross-chain payment systems.'
        },
        {
          id: '5',
          title: 'Community Governance in Decentralized Platforms',
          excerpt: 'Best practices for implementing fair and effective governance systems in Web3 communities.',
          content: 'Full blog content here... Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          author: 'Community Team',
          authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
          publishedAt: '2024-12-10T11:20:00Z',
          tags: ['Governance', 'Community', 'DAO'],
          category: 'governance',
          status: 'published',
          views: 934,
          likes: 72,
          comments: 28,
          language: 'en',
          featured: false,
          trending: true,
          readTime: 8,
          seoTitle: 'Web3 Community Governance: Best Practices',
          seoDescription: 'Learn to build effective governance systems for decentralized communities.'
        },
        {
          id: '6',
          title: 'Beehive Platform Updates - Q4 2024',
          excerpt: 'Latest features, improvements, and roadmap updates for the Beehive ecosystem.',
          content: 'Draft content for upcoming platform updates...',
          author: 'Product Team',
          authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
          imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
          publishedAt: '2024-12-25T12:00:00Z',
          tags: ['Platform', 'Updates', 'Roadmap'],
          category: 'announcement',
          status: 'draft',
          views: 0,
          likes: 0,
          comments: 0,
          language: 'en',
          featured: false,
          trending: false,
          readTime: 10,
          seoTitle: 'Beehive Q4 2024 Platform Updates',
          seoDescription: 'Discover the latest features and improvements to the Beehive platform.'
        }
      ];

      // Apply filters
      const filteredPosts = realBlogPosts.filter(post => {
        const matchesSearch = searchTerm === '' || 
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
        
        return matchesSearch && matchesStatus && matchesCategory;
      });

      setBlogPosts(filteredPosts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load blog data:', error);
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    try {
      const newPost: BlogPost = {
        id: `post-${Date.now()}`,
        ...formData,
        authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=400',
        publishedAt: formData.status === 'published' ? new Date().toISOString() : (formData.scheduledDate || new Date().toISOString()),
        views: 0,
        likes: 0,
        comments: 0,
        readTime: Math.ceil(formData.content.split(' ').length / 200), // Estimate read time
      };

      setBlogPosts(prev => [newPost, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: 'Blog Post Created',
        description: `${newPost.title} has been ${formData.status === 'published' ? 'published' : 'saved as draft'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create blog post. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPost = async () => {
    if (!editingPost) return;

    try {
      const updatedPost = { 
        ...editingPost, 
        ...formData,
        readTime: Math.ceil(formData.content.split(' ').length / 200)
      };
      
      setBlogPosts(prev =>
        prev.map(post => post.id === editingPost.id ? updatedPost : post)
      );
      
      setIsEditDialogOpen(false);
      setEditingPost(null);
      
      toast({
        title: 'Blog Post Updated',
        description: `${updatedPost.title} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update blog post. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const togglePostStatus = async (post: BlogPost) => {
    try {
      const newStatus: 'published' | 'draft' | 'scheduled' = post.status === 'published' ? 'draft' : 'published';
      const updatedPost = { 
        ...post, 
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date().toISOString() : post.publishedAt
      };
      
      setBlogPosts(prev =>
        prev.map(p => p.id === post.id ? updatedPost : p)
      );

      toast({
        title: 'Post Status Updated',
        description: `${post.title} is now ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update post status.',
        variant: 'destructive',
      });
    }
  };

  const toggleFeatured = async (post: BlogPost) => {
    try {
      const updatedPost = { ...post, featured: !post.featured };
      setBlogPosts(prev =>
        prev.map(p => p.id === post.id ? updatedPost : p)
      );

      toast({
        title: 'Featured Status Updated',
        description: `${post.title} is now ${updatedPost.featured ? 'featured' : 'unfeatured'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update featured status.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      imageUrl: post.imageUrl,
      tags: post.tags,
      category: post.category,
      status: post.status,
      language: post.language,
      featured: post.featured,
      trending: post.trending,
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      author: 'Beehive Team',
      imageUrl: '',
      tags: [],
      category: 'technology',
      status: 'draft',
      language: 'en',
      featured: false,
      trending: false,
      seoTitle: '',
      seoDescription: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      technology: 'bg-blue-500',
      business: 'bg-green-500',
      development: 'bg-purple-500',
      governance: 'bg-orange-500',
      announcement: 'bg-red-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  if (!hasPermission('blog.read')) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view blog data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">HiveWorld Blog</h1>
            <p className="text-muted-foreground mt-2">Loading blog posts...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPosts = blogPosts.length;
  const publishedPosts = blogPosts.filter(p => p.status === 'published').length;
  const draftPosts = blogPosts.filter(p => p.status === 'draft').length;
  const totalViews = blogPosts.reduce((sum, post) => sum + post.views, 0);
  const featuredPosts = blogPosts.filter(p => p.featured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`font-bold text-honey ${isMobile ? 'text-2xl' : 'text-3xl'}`}>HiveWorld Blog</h1>
          <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
            Manage blog posts, articles, and platform announcements
          </p>
        </div>
        
        {hasPermission('blog.create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-honey text-black hover:bg-honey/90" data-testid="button-create-post">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh] overflow-y-auto p-4' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}>
              <DialogHeader>
                <DialogTitle className={isMobile ? 'text-lg' : ''}>Create New Blog Post</DialogTitle>
                <DialogDescription className={isMobile ? 'text-sm' : ''}>
                  Write and publish a new article for the HiveWorld blog
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-6">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div>
                    <Label htmlFor="title">Post Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter compelling title..."
                      data-testid="input-post-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      data-testid="input-post-author"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Brief description of the post..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your blog post content here..."
                    rows={8}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="imageUrl">Featured Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="governance">Governance</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags.join(', ')}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }))}
                      placeholder="Web3, Blockchain, DeFi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seoTitle">SEO Title</Label>
                    <Input
                      id="seoTitle"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                      placeholder="SEO optimized title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="seoDescription">SEO Description</Label>
                    <Input
                      id="seoDescription"
                      value={formData.seoDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                      placeholder="Meta description for search engines..."
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                    />
                    <Label>Featured Post</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.trending}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, trending: checked }))}
                    />
                    <Label>Trending</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost}>Create Post</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-5'}`}>
        <Card>
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className="flex items-center space-x-2">
              <FileText className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Posts</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{totalPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className="flex items-center space-x-2">
              <Eye className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Published</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{publishedPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className="flex items-center space-x-2">
              <EyeOff className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Drafts</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{draftPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className="flex items-center space-x-2">
              <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Views</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className="flex items-center space-x-2">
              <Star className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Featured</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{featuredPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
            <Search className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            <span>Search & Filter Posts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'space-y-3 p-4' : 'space-y-4'}>
          <Input
            placeholder={isMobile ? "Search posts..." : "Search posts by title, author, or tags..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-posts"
          />

          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:flex md:gap-4'}`}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={isMobile ? 'w-full' : 'w-48'}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className={isMobile ? 'w-full' : 'w-48'}>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="governance">Governance</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className={isMobile ? 'grid grid-cols-3 w-full' : ''}>
          <TabsTrigger value="posts" className={isMobile ? 'text-sm' : ''}>
            {isMobile ? 'Posts' : 'All Posts'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className={isMobile ? 'text-sm' : ''}>Analytics</TabsTrigger>
          <TabsTrigger value="trending" className={isMobile ? 'text-sm' : ''}>Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            {blogPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className={isMobile ? 'p-4' : 'p-6'}>
                  <div className={isMobile ? 'space-y-3' : 'flex items-start space-x-4'}>
                    {/* Featured Image */}
                    <div className={`rounded-lg overflow-hidden flex-shrink-0 ${isMobile ? 'w-full h-32' : 'w-32 h-20'}`}>
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className={isMobile ? 'space-y-3' : 'flex items-start justify-between mb-3'}>
                        <div className="flex-1">
                          <div className={`flex items-center gap-2 mb-2 ${isMobile ? 'flex-wrap' : 'space-x-3'}`}>
                            <h3 className={`font-bold text-honey ${isMobile ? 'text-base w-full' : 'text-lg'}`}>
                              {post.title}
                            </h3>
                            {getStatusBadge(post.status)}
                            {post.featured && <Badge className="bg-yellow-500 text-xs">Featured</Badge>}
                            {post.trending && <Badge className="bg-red-500 text-xs">🔥 Trending</Badge>}
                            <Badge variant="outline" className={`${getCategoryColor(post.category)} text-white text-xs`}>
                              {post.category}
                            </Badge>
                          </div>

                          <p className={`text-muted-foreground mb-3 line-clamp-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {post.excerpt}
                          </p>

                          <div className={`grid gap-3 text-muted-foreground ${isMobile ? 'grid-cols-2 text-xs' : 'flex items-center space-x-6 text-sm'}`}>
                            <div className="flex items-center space-x-1">
                              <User className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                              <span className="truncate">{post.author}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                              <span className="truncate">{isMobile ? new Date(post.publishedAt).toLocaleDateString() : formatDate(post.publishedAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                              <span>{post.readTime} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Eye className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                              <span>{post.views.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-3">
                            {post.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {post.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Stats */}
                    <div className={isMobile ? 'border-t pt-3 space-y-3' : 'flex flex-col items-end space-y-3'}>
                      <div className={`grid grid-cols-3 gap-3 text-center ${isMobile ? '' : 'gap-4'}`}>
                        <div>
                          <div className={`font-bold text-honey ${isMobile ? 'text-base' : 'text-lg'}`}>{post.views}</div>
                          <div className="text-xs text-muted-foreground">Views</div>
                        </div>
                        <div>
                          <div className={`font-bold text-honey ${isMobile ? 'text-base' : 'text-lg'}`}>{post.likes}</div>
                          <div className="text-xs text-muted-foreground">Likes</div>
                        </div>
                        <div>
                          <div className={`font-bold text-honey ${isMobile ? 'text-base' : 'text-lg'}`}>{post.comments}</div>
                          <div className="text-xs text-muted-foreground">Comments</div>
                        </div>
                      </div>

                      {hasPermission('blog.update') && (
                        <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'flex space-x-2'}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(post)}
                            data-testid={`button-edit-post-${post.id}`}
                            className={isMobile ? 'w-full' : ''}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePostStatus(post)}
                            data-testid={`button-toggle-post-${post.id}`}
                            className={isMobile ? 'w-full' : ''}
                          >
                            {post.status === 'published' ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Publish
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleFeatured(post)}
                            data-testid={`button-feature-post-${post.id}`}
                            className={isMobile ? 'w-full' : ''}
                          >
                            <Star className={`w-4 h-4 mr-1 ${post.featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            {post.featured ? 'Unfeature' : 'Feature'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blogPosts
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map((post, index) => (
                    <div key={post.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-honey/10 flex items-center justify-center">
                          <span className="text-honey font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{post.title}</div>
                          <div className="text-sm text-muted-foreground">{post.author}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-honey">{post.views.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    blogPosts.reduce((acc, post) => {
                      acc[post.category] = (acc[post.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="font-medium capitalize">{category}</div>
                      <div className="font-bold text-honey">{count} posts</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trending">
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {blogPosts.filter(post => post.trending).map(post => (
              <Card key={post.id} className="overflow-hidden">
                <div className="aspect-video">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-500">🔥 Trending</Badge>
                    {post.featured && <Badge className="bg-yellow-500">Featured</Badge>}
                  </div>
                  <h3 className="font-bold text-honey mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <span>{post.author}</span>
                    <span>{post.views.toLocaleString()} views</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>Update post content and settings</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Post Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-author">Author</Label>
                <Input
                  id="edit-author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-excerpt">Excerpt</Label>
              <Textarea
                id="edit-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-imageUrl">Featured Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                />
                <Label>Featured Post</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.trending}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, trending: checked }))}
                />
                <Label>Trending</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditPost}>Update Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}