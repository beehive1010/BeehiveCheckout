import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "./contexts/Web3Context";
import { I18nProvider } from "./contexts/I18nContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { ThemeProvider } from "next-themes";
import { Toaster as HotToaster } from "react-hot-toast";

// Refactored pages with clean architecture
import LandingPage from "@/pages/LandingPage";
import DashboardPageV2Simple from "@/pages/DashboardPageV2Simple";
import EnhancedDashboard from "@/pages/EnhancedDashboard";
// Force cache refresh
import Education from "@/pages/Education";
import HiveWorld from "@/pages/HiveWorld";
import Me from "@/pages/Me";
import ProfileSettings from "@/pages/ProfileSettings";
import NFTCenter from "@/pages/NFTCenter";
import Referrals from "@/pages/Referrals";
import Discover from "@/pages/Discover";

// Additional pages  
import Registration from "@/pages/Registration";
import Welcome from "@/pages/Welcome";
import Tasks from "@/pages/Tasks";
import TokenPurchase from "@/pages/TokenPurchase";
import SupabaseAuth from "@/pages/SupabaseAuth";
import AuthCallback from "@/pages/AuthCallback";

// Import proper Header and Navigation components
import Header from "@/components/shared/Header";
import Navigation from "@/components/shared/Navigation";
import { useWallet } from "@/hooks/useWallet";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";

// Temporary components for features not yet refactored
const CourseDetails = () => <div>Course Details - Coming Soon</div>;
const BlogPost = () => <div>Blog Post - Coming Soon</div>;
const AdvertisementNFTs = () => <div>Advertisement NFTs - Coming Soon</div>;
const AdminNFTManager = () => <div>Admin NFT Manager - Coming Soon</div>;
const TokenPurchasePage = () => <div>Token Purchase - Coming Soon</div>;
const NotFound = () => <div className="text-center py-12"><h1 className="text-honey text-2xl">Page Not Found</h1></div>;

// Admin components
import AdminLogin from "@/pages/AdminLogin";
const AdminDashboard = () => <div>Admin Dashboard - Coming Soon</div>;
const AdminUsers = () => <div>Admin Users - Coming Soon</div>;
const AdminUserManagement = () => <div>Admin User Management - Coming Soon</div>;
const AdminReferrals = () => <div>Admin Referrals - Coming Soon</div>;
const AdminNFTs = () => <div>Admin NFTs - Coming Soon</div>;
const AdminContracts = () => <div>Admin Contracts - Coming Soon</div>;
const AdminContractDetail = () => <div>Admin Contract Detail - Coming Soon</div>;
const AdminContractDeploy = () => <div>Admin Contract Deploy - Coming Soon</div>;
const AdminCourses = () => <div>Admin Courses - Coming Soon</div>;
const AdminBlog = () => <div>Admin Blog - Coming Soon</div>;
const AdminSystem = () => <div>Admin System - Coming Soon</div>;
const AdminDiscover = () => <div>Admin Discover - Coming Soon</div>;
const Courses = () => <div>Courses - Coming Soon</div>;
const DiscoverPartners = () => <div>Discover Partners - Coming Soon</div>;
const AdminLayout = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Layout components (temporary)
// Navigation component imported from components/shared/Navigation
const Footer = () => <footer className="bg-secondary border-t border-border py-8"></footer>;
const RouteGuard = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Smart routing component that routes based on user status
function SmartHomePage() {
  const { 
    isConnected, 
    isCheckingRegistration,
    isNewUser, 
    needsNFTClaim, 
    isFullyActivated,
    userStatus,
    isUserLoading
  } = useWallet();

  // Debug logging
  console.log('SmartHomePage status:', {
    isConnected,
    isCheckingRegistration,
    isNewUser,
    needsNFTClaim,
    isFullyActivated,
    userFlow: userStatus?.userFlow,
    isRegistered: userStatus?.isRegistered,
    isUserLoading
  });

  // Show landing page while checking user status or if not connected
  if (!isConnected || isCheckingRegistration) {
    return <LandingPage />;
  }

  // Route based on enhanced user status
  if (isNewUser) {
    return <Registration />;
  }
  
  // Skip Welcome if user is already registered - go directly to dashboard
  if (isConnected && userStatus?.isRegistered) {
    return <EnhancedDashboard />;
  }
  
  if (needsNFTClaim) {
    return <Welcome />;
  }
  
  if (isFullyActivated) {
    return <EnhancedDashboard />;
  }

  // Fallback to landing page
  return <LandingPage />;
}

function Router() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  // Handle admin routes separately with AdminAuthProvider
  if (isAdminRoute) {
    return (
      <AdminAuthProvider>
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={() => (
          <AdminRouteGuard>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/users" component={() => (
          <AdminRouteGuard requiredPermission="users.read">
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/referrals" component={() => (
          <AdminRouteGuard requiredPermission="referrals.read">
            <AdminLayout>
              <AdminReferrals />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/nfts" component={() => (
          <AdminRouteGuard requiredPermission="nfts.read">
            <AdminLayout>
              <AdminNFTs />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/contracts" component={() => (
          <AdminRouteGuard requiredPermission="contracts.read">
            <AdminLayout>
              <AdminContracts />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/contracts/deploy" component={() => (
          <AdminRouteGuard requiredPermission="contracts.deploy">
            <AdminLayout>
              <AdminContractDeploy />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/contracts/:contractId" component={() => (
          <AdminRouteGuard requiredPermission="contracts.read">
            <AdminLayout>
              <AdminContractDetail />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/courses" component={() => (
          <AdminRouteGuard requiredPermission="courses.read">
            <AdminLayout>
              <AdminCourses />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/blog" component={() => (
          <AdminRouteGuard requiredPermission="blog.read">
            <AdminLayout>
              <AdminBlog />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/system" component={() => (
          <AdminRouteGuard requiredPermission="system.read">
            <AdminLayout>
              <AdminSystem />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/discover" component={() => (
          <AdminRouteGuard requiredPermission="discover.read">
            <AdminLayout>
              <AdminDiscover />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/admin-users" component={() => (
          <AdminRouteGuard requiredRoles={["super_admin"]}>
            <AdminLayout>
              <AdminUserManagement />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/unauthorized" component={() => (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-honey">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this area.
              </p>
            </div>
          </div>
        )} />
        <Route component={NotFound} />
      </Switch>
      </AdminAuthProvider>
    );
  }

  // Handle regular user routes with RouteGuard
  return (
    <RouteGuard>
      <Switch>
        {/* Smart home route - automatically routes based on user status */}
        <Route path="/" component={SmartHomePage} />
        <Route path="/register" component={Registration} />
        <Route path="/auth" component={SupabaseAuth} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/welcome" component={Welcome} />
        
        {/* Main app routes - Protected with wallet connection and Level 1 NFT requirement */}
        <Route path="/dashboard" component={() => <EnhancedDashboard />} />
        <Route path="/dashboard/simple" component={() => <DashboardPageV2Simple />} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/token-purchase" component={TokenPurchase} />
        <Route path="/education" component={Education} />
        <Route path="/education/:courseId" component={CourseDetails} />
        <Route path="/discover" component={Discover} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/me" component={Me} />
        <Route path="/me/profile-settings" component={ProfileSettings} />
        <Route path="/ads" component={AdvertisementNFTs} />
        <Route path="/nft-center" component={NFTCenter} />
        <Route path="/admin-nft-manager" component={AdminNFTManager} />
        
        {/* Public routes - No authentication required */}
        <Route path="/hiveworld" component={HiveWorld} />
        <Route path="/hiveworld/:id" component={BlogPost} />
        <Route path="/tokens" component={() => (
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-honey mb-2">Token Purchase</h1>
              <p className="text-muted-foreground">
                Buy BCC and CTH tokens across multiple chains at 1 token = 0.01 USDT
              </p>
            </div>
            <TokenPurchase />
          </div>
        )} />
        
        <Route component={NotFound} />
      </Switch>
    </RouteGuard>
  );
}

function App() {
  const [location] = useLocation();
  const isLandingPage = location === '/';
  const isAdminPage = location.startsWith('/admin/');

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Web3Provider>
          <I18nProvider>
              <TooltipProvider>
              <div className="min-h-screen bg-background text-foreground">
                {!isAdminPage && <Header />}
                {!isAdminPage && <Navigation />}
                <main className={isAdminPage ? "min-h-screen" : "min-h-[calc(100vh-theme(spacing.32))] pb-16 md:pb-0"}>
                  <Router />
                </main>
                {isLandingPage && <Footer />}
                <Toaster />
                <HotToaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    },
                  }}
                />
              </div>
            </TooltipProvider>
          </I18nProvider>
        </Web3Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
