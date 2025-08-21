import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useLocation, useRoute } from 'wouter';
import { ArrowLeft, Calendar, User, Eye, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Mock blog data - same as in HiveWorld
const mockBlogs = [
  {
    id: '1',
    title: 'The Future of Web3 Membership Systems',
    excerpt: 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
    content: `
      <h2>Introduction</h2>
      <p>Web3 technology is fundamentally changing how we think about membership, loyalty, and community engagement. In this comprehensive guide, we'll explore the revolutionary potential of blockchain-based membership systems and how they're reshaping entire industries.</p>
      
      <h2>The Traditional Membership Model</h2>
      <p>Traditional membership systems have served businesses well for decades, but they come with inherent limitations:</p>
      <ul>
        <li>Centralized control and data ownership</li>
        <li>Limited interoperability between platforms</li>
        <li>Lack of true ownership for members</li>
        <li>Potential for data breaches and privacy concerns</li>
      </ul>
      
      <h2>Enter Web3 Membership Systems</h2>
      <p>Web3 membership systems leverage blockchain technology to create truly decentralized, member-owned communities. Key advantages include:</p>
      <ul>
        <li><strong>True Ownership:</strong> Members own their membership credentials as NFTs</li>
        <li><strong>Interoperability:</strong> Memberships can work across multiple platforms</li>
        <li><strong>Transparency:</strong> All transactions and benefits are recorded on-chain</li>
        <li><strong>Community Governance:</strong> Members can participate in platform decisions</li>
      </ul>
      
      <h2>Real-World Applications</h2>
      <p>We're already seeing innovative implementations across various sectors:</p>
      
      <h3>Gaming Communities</h3>
      <p>Gaming platforms are using NFT memberships to provide exclusive access to game content, early releases, and special events.</p>
      
      <h3>Professional Networks</h3>
      <p>Professional organizations are leveraging blockchain credentials to create verifiable, portable professional memberships.</p>
      
      <h3>Fitness and Wellness</h3>
      <p>Gym chains and wellness platforms are experimenting with NFT memberships that provide access across multiple locations and partner services.</p>
      
      <h2>The Beehive Approach</h2>
      <p>At Beehive, we've built a comprehensive Web3 membership platform that demonstrates the full potential of this technology. Our system includes:</p>
      <ul>
        <li>19 distinct membership levels with unique benefits</li>
        <li>NFT-based access control</li>
        <li>Multi-chain payment support</li>
        <li>Referral reward mechanisms</li>
        <li>Community governance features</li>
      </ul>
      
      <h2>Looking Forward</h2>
      <p>The future of membership systems is decentralized, community-owned, and blockchain-powered. As we continue to innovate in this space, we're excited to see how these technologies will reshape the relationship between businesses and their communities.</p>
      
      <p>Join us on this journey as we build the future of Web3 membership systems together.</p>
    `,
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
    content: `
      <h2>The Evolution of Digital Access</h2>
      <p>NFT-based access control represents a paradigm shift in how we manage digital permissions and community membership. Unlike traditional username/password systems, NFTs provide a cryptographically secure, decentralized approach to access management.</p>
      
      <h2>How NFT Access Control Works</h2>
      <p>The mechanism is elegantly simple yet powerful:</p>
      <ol>
        <li>Users purchase or earn NFTs that represent specific access rights</li>
        <li>Smart contracts verify NFT ownership when access is requested</li>
        <li>Access is granted or denied based on the verification result</li>
        <li>All transactions are recorded on the blockchain for transparency</li>
      </ol>
      
      <h2>Benefits Over Traditional Systems</h2>
      <ul>
        <li><strong>Ownership:</strong> Users truly own their access credentials</li>
        <li><strong>Transferability:</strong> Access rights can be sold or transferred</li>
        <li><strong>Composability:</strong> NFTs can unlock access across multiple platforms</li>
        <li><strong>Transparency:</strong> All access rules are publicly verifiable</li>
      </ul>
      
      <h2>Implementation Considerations</h2>
      <p>When implementing NFT-based access control, consider these factors:</p>
      <ul>
        <li>Gas costs for frequent access checks</li>
        <li>User experience and wallet integration</li>
        <li>Backup access methods</li>
        <li>Smart contract security</li>
      </ul>
    `,
    author: 'Technical Team',
    imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
    publishedAt: '2024-12-18T14:30:00Z',
    tags: ['NFT', 'Access Control', 'Technology'],
    views: 892,
    language: 'en'
  },
  // Add more mock blogs as needed...
];

export default function BlogPost() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/hiveworld/:id');
  const { toast } = useToast();
  
  const blogId = params?.id;
  const blog = mockBlogs.find(b => b.id === blogId);
  
  if (!blog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-honey mb-4">Blog post not found</h1>
          <Button onClick={() => setLocation('/hiveworld')}>
            Back to HiveWorld
          </Button>
        </div>
      </div>
    );
  }
  
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
  
  const shareToTwitter = () => {
    const url = window.location.href;
    const text = `Check out this article: ${blog.title}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };
  
  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };
  
  const shareToLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Blog post link copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <Button
        variant="ghost"
        onClick={() => setLocation('/hiveworld')}
        className="mb-6 text-honey hover:text-honey/80"
        data-testid="button-back-to-hiveworld"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to HiveWorld
      </Button>
      
      {/* Hero Image */}
      <div className="aspect-video overflow-hidden rounded-lg mb-8">
        <img 
          src={blog.imageUrl} 
          alt={blog.title}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Article Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {blog.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-sm">
              {tag}
            </Badge>
          ))}
        </div>
        
        <h1 className="text-4xl font-bold text-honey mb-4">
          {blog.title}
        </h1>
        
        <p className="text-xl text-muted-foreground mb-6">
          {blog.excerpt}
        </p>
        
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{blog.author}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(blog.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{formatViews(blog.views)} views</span>
            </div>
          </div>
          
          {/* Share Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={shareToTwitter}
              data-testid="button-share-twitter"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareToFacebook}
              data-testid="button-share-facebook"
            >
              <Facebook className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareToLinkedIn}
              data-testid="button-share-linkedin"
            >
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              data-testid="button-copy-link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Article Content */}
      <Card className="bg-secondary border-border">
        <CardContent className="p-8">
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </CardContent>
      </Card>
      
      {/* Related Articles */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-honey mb-6">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockBlogs
            .filter(b => b.id !== blog.id)
            .slice(0, 2)
            .map(relatedBlog => (
              <Card 
                key={relatedBlog.id}
                className="bg-secondary border-border glow-hover card-hover cursor-pointer"
                onClick={() => setLocation(`/hiveworld/${relatedBlog.id}`)}
                data-testid={`card-related-${relatedBlog.id}`}
              >
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img 
                    src={relatedBlog.imageUrl} 
                    alt={relatedBlog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold text-honey mb-2">
                    {relatedBlog.title}
                  </h4>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {relatedBlog.excerpt}
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}