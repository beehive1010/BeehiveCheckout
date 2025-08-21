import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import HexagonIcon from '../components/UI/HexagonIcon';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { Search, Calendar, User, Eye, ArrowRight } from 'lucide-react';

// Mock blog data - in real implementation would come from API
const mockBlogs = [
  {
    id: '1',
    title: 'The Future of Web3 Membership Systems',
    excerpt: 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
    content: 'Full blog content here...',
    author: 'Beehive Team',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
    publishedAt: '2024-12-20T10:00:00Z',
    tags: ['Web3', 'Blockchain', 'Membership'],
    views: 1250,
    language: 'en'
  },
  {
    id: '2', 
    title: 'Understanding NFT-Based Access Control',
    excerpt: 'How NFTs are being used to gate content and create exclusive community experiences.',
    content: 'Full blog content here...',
    author: 'Technical Team',
    imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
    publishedAt: '2024-12-18T14:30:00Z',
    tags: ['NFT', 'Access Control', 'Technology'],
    views: 892,
    language: 'en'
  },
  {
    id: '3',
    title: 'Building Sustainable Referral Economies',
    excerpt: 'The mechanics behind successful referral programs and how they create lasting value.',
    content: 'Full blog content here...',
    author: 'Strategy Team',
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
    publishedAt: '2024-12-15T09:15:00Z',
    tags: ['Referrals', 'Economics', 'Strategy'],
    views: 567,
    language: 'en'
  },
  {
    id: '4',
    title: 'Multi-Chain Payment Integration Guide',
    excerpt: 'Technical deep-dive into implementing cross-chain payment solutions for dApps.',
    content: 'Full blog content here...',
    author: 'Dev Team',
    imageUrl: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&h=400&fit=crop',
    publishedAt: '2024-12-12T16:45:00Z',
    tags: ['Multi-chain', 'Payments', 'Development'],
    views: 723,
    language: 'en'
  },
  {
    id: '5',
    title: 'Community Governance in Decentralized Platforms',
    excerpt: 'Best practices for implementing fair and effective governance systems in Web3 communities.',
    content: 'Full blog content here...',
    author: 'Community Team',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
    publishedAt: '2024-12-10T11:20:00Z',
    tags: ['Governance', 'Community', 'DAO'],
    views: 934,
    language: 'en'
  }
];

export default function HiveWorld() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Get all unique tags
  const allTags = Array.from(new Set(mockBlogs.flatMap(blog => blog.tags)));
  
  // Filter blogs based on search and tag
  const filteredBlogs = mockBlogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || blog.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-honey mb-4">
          {t('hiveworld.blog.title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('hiveworld.blog.subtitle')}
        </p>
      </div>
      
      {/* Search and Filter Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('hiveworld.blog.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-blogs"
            />
          </div>
        </div>
        
        {/* Tag Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedTag ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTag(null)}
            className={!selectedTag ? "bg-honey text-black" : ""}
          >
            {t('hiveworld.blog.allTopics')}
          </Button>
          {allTags.map(tag => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={selectedTag === tag ? "bg-honey text-black" : ""}
              data-testid={`button-tag-${tag.toLowerCase()}`}
            >
              {t(`hiveworld.blog.tags.${tag}`) || tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBlogs.map((blog) => (
          <Card 
            key={blog.id} 
            className="bg-secondary border-border glow-hover card-hover cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => setLocation(`/hiveworld/${blog.id}`)}
            data-testid={`card-blog-${blog.id}`}
          >
            <div className="aspect-video overflow-hidden rounded-t-lg">
              <img 
                src={blog.imageUrl} 
                alt={blog.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {blog.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {t(`hiveworld.blog.tags.${tag}`) || tag}
                  </Badge>
                ))}
              </div>
              
              <h3 className="text-xl font-bold text-honey mb-3 line-clamp-2">
                {t(`hiveworld.blog.posts.${blog.id}.title`) || blog.title}
              </h3>
              
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                {t(`hiveworld.blog.posts.${blog.id}.excerpt`) || blog.excerpt}
              </p>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{t(`hiveworld.blog.posts.${blog.id}.author`) || blog.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{formatViews(blog.views)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(blog.publishedAt)}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-honey" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredBlogs.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            {t('hiveworld.blog.noArticles')}
          </h3>
          <p className="text-muted-foreground">
            {t('hiveworld.blog.noArticlesDesc')}
          </p>
        </div>
      )}
    </div>
  );
}