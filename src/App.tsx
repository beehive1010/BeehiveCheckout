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
import { setupGlobalChunkErrorHandler, preloadThirdwebModules } from "@/utils/moduleLoader";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ui/error-boundary";

// Refactored pages with clean architecture
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
// Force cache refresh
import  Education from "@/pages/Education";
import HiveWorld from "@/pages/HiveWorld";
import Me from "@/pages/Me";
import ProfileSettings from "@/pages/ProfileSettings";
import NFTCenter from "@/pages/NFTCenter";
import Referrals from "@/pages/Referrals";
import Rewards from "@/pages/Rewards";
import Discover from "@/pages/Discover";
import NotificationsPage from "@/pages/NotificationsPage";
import MatrixTestPage from "@/pages/MatrixTestPage";
import NFTTestPage from "@/components/nfts/NFTTestPage";

// Additional pages  
import Registration from "@/pages/Registration";
import MatrixExplanation from "@/pages/MatrixExplanation";
import Welcome from "@/pages/Welcome";
import NFTs from "@/pages/NFTs";
import Membership from "@/pages/Membership";
import TokenPurchase from "@/pages/TokenPurchase";
import SupabaseAuth from "@/pages/SupabaseAuth";
import AuthCallback from "@/pages/AuthCallback";
import AdminNFTsPage from "@/pages/AdminNFTs";
import TestUpgradeMembership from "@/pages/TestUpgradeMembership";
import MultiChainClaimDemo from "@/pages/MultiChainClaimDemo";
// import PhotoUploadDemo from "@/pages/PhotoUploadDemo";

// Import proper Header and Navigation components
import Header from "@/components/shared/Header";
import Navigation from "@/components/shared/Navigation";
import { useWallet } from "@/hooks/useWallet";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import MemberGuard from "@/components/guards/MemberGuard";
import { useI18n } from "@/contexts/I18nContext";

// Temporary components for features not yet refactored
const CourseDetails = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Course Details</div>;
};
const BlogPost = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Blog Post</div>;
};
const AdvertisementNFTs = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Advertisement NFTs</div>;
};
const AdminNFTManager = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin NFT Manager</div>;
};
const NotFound = () => {
  const { t } = useI18n();
  return <div className="text-center py-12"><h1 className="text-honey text-2xl">{t('common.pageNotFound')}</h1></div>;
};

// Admin components
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminHome from "@/pages/admin/AdminHome";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminWithdrawals from "@/pages/admin/AdminWithdrawals";
import AdminRewards from "@/pages/admin/AdminRewards";
const AdminUserManagement = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin User Management</div>;
};
const AdminReferrals = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Referrals</div>;
};
const AdminNFTsPlaceholder = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin NFTs</div>;
};
const AdminContracts = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Contracts</div>;
};
const AdminContractDetail = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Contract Detail</div>;
};
const AdminContractDeploy = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Contract Deploy</div>;
};
const AdminCourses = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Courses</div>;
};
const AdminBlog = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Blog</div>;
};
const AdminSystem = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin System</div>;
};
const AdminDiscover = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Discover</div>;
};
const Courses = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Courses</div>;
};
const DiscoverPartners = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Discover Partners</div>;
};
const AdminLayout = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Layout components (temporary)
// Navigation component imported from components/shared/Navigation
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
  
  if (needsNFTClaim) {
    return <Welcome />;
  }
  
  if (isFullyActivated) {
    return <Dashboard />;
  }

  // Fallback to landing page
  return <LandingPage />;
}

function Router() {
  const [location] = useLocation();
  const { t } = useI18n();
  const isAdminRoute = location.startsWith('/admin');

  // Handle admin routes separately with AdminAuthProvider
  if (isAdminRoute) {
    return (
      <AdminAuthProvider>
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={() => (
          <AdminRouteGuard>
            <AdminLayout>
              <AdminHome />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
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
              <AdminNFTsPlaceholder />
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
        <Route path="/admin/withdrawals" component={() => (
          <AdminRouteGuard requiredPermission="withdrawals.read">
            <AdminLayout>
              <AdminWithdrawals />
            </AdminLayout>
          </AdminRouteGuard>
        )} />
        <Route path="/admin/rewards" component={() => (
          <AdminRouteGuard requiredPermission="rewards.read">
            <AdminLayout>
              <AdminRewards />
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
              <h1 className="text-3xl font-bold text-honey">{t('common.accessDenied')}</h1>
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
        <Route path="/dashboard" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Dashboard />
          </MemberGuard>
        )} />
        <Route path="/tasks" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <NFTs />
          </MemberGuard>
        )} />
        <Route path="/nfts" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <NFTs />
          </MemberGuard>
        )} />
        <Route path="/membership" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Membership />
          </MemberGuard>
        )} />
        <Route path="/token-purchase" component={TokenPurchase} />
        <Route path="/education" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Education />
          </MemberGuard>
        )} />
        <Route path="/education/:courseId" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <CourseDetails />
          </MemberGuard>
        )} />
        <Route path="/discover" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Discover />
          </MemberGuard>
        )} />
        <Route path="/referrals" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Referrals />
          </MemberGuard>
        )} />
        <Route path="/rewards" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Rewards />
          </MemberGuard>
        )} />
        <Route path="/notifications" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <NotificationsPage />
          </MemberGuard>
        )} />
        <Route path="/me" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <Me />
          </MemberGuard>
        )} />
        <Route path="/me/profile-settings" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <ProfileSettings />
          </MemberGuard>
        )} />
        <Route path="/ads" component={AdvertisementNFTs} />
        <Route path="/nft-center" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <NFTCenter />
          </MemberGuard>
        )} />
        <Route path="/member-matrix-test" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <MatrixTestPage />
          </MemberGuard>
        )} />
        <Route path="/member-nft-test" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <div className="min-h-screen bg-background p-4">
              <NFTTestPage />
            </div>
          </MemberGuard>
        )} />
        <Route path="/admin-nft-manager" component={AdminNFTManager} />
        <Route path="/admin" component={AdminNFTsPage} />
        
        {/* Public routes - No authentication required */}
        <Route path="/matrix-explanation" component={MatrixExplanation} />
        <Route path="/matrix-test" component={MatrixTestPage} />
        <Route path="/multi-chain-claim-demo" component={MultiChainClaimDemo} />

        {/* Test routes */}
        <Route path="/testUpgradeMembership" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <TestUpgradeMembership />
          </MemberGuard>
        )} />

        {/* Photo Upload Demo - Temporarily disabled */}
        {/* <Route path="/photo-upload-demo" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <PhotoUploadDemo />
          </MemberGuard>
        )} /> */}

        <Route path="/hiveworld" component={() => (
          <MemberGuard requireActivation={true} redirectTo="/welcome">
            <HiveWorld />
          </MemberGuard>
        )} />
        <Route path="/hiveworld/:id" component={BlogPost} />
        <Route path="/tokens" component={() => (
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-honey mb-2">{t('common.tokenPurchase')}</h1>
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
  const isMatrixPage = location === '/matrix-explanation';

  // Initialize global error handling and module preloading
  useEffect(() => {
    console.log('🔧 Setting up global chunk error handler...');
    setupGlobalChunkErrorHandler();
    
    // Preload thirdweb modules to prevent loading issues
    console.log('🚀 Starting thirdweb module preloading...');
    preloadThirdwebModules().catch(error => {
      console.warn('⚠️ Thirdweb preloading failed (non-critical):', error);
    });
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🔴 App Error Boundary caught error:', error, errorInfo);
        // Send to error tracking service in production
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('🔴 Web3Provider Error:', error, errorInfo);
            }}
          >
            <Web3Provider>
              <I18nProvider>
                <TooltipProvider>
                  <div className="min-h-screen bg-background text-foreground">
                    {!isAdminPage && !isMatrixPage && <Header />}
                    {!isAdminPage && !isMatrixPage && <Navigation />}
                    <main className={isAdminPage || isMatrixPage ? "min-h-screen" : "min-h-[calc(100vh-theme(spacing.32))] pb-16 md:pb-0"}>
                      <ErrorBoundary
                        onError={(error, errorInfo) => {
                          console.error('🔴 Router Error:', error, errorInfo);
                        }}
                      >
                        <Router />
                      </ErrorBoundary>
                    </main>
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
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
