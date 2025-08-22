import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "./contexts/Web3Context";
import { I18nProvider } from "./contexts/I18nContext";
import { ThemeProvider } from "next-themes";
import { Toaster as HotToaster } from "react-hot-toast";

// Pages
import Landing from "@/pages/Landing";
import Registration from "@/pages/Registration";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Education from "@/pages/Education";
import CourseDetails from "@/pages/CourseDetails";
import Discover from "@/pages/Discover";
import HiveWorld from "@/pages/HiveWorld";
import BlogPost from "@/pages/BlogPost";
import Me from "@/pages/Me";
import AdvertisementNFTs from "@/pages/AdvertisementNFTs";
import NFTCenter from "@/pages/NFTCenter";
import TokenPurchase from "@/components/tokens/TokenPurchase";
import NotFound from "@/pages/not-found";

// Admin Panel
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminNFTs from "@/pages/admin/AdminNFTs";
import AdminContracts from "@/pages/admin/AdminContracts";
import AdminContractDetail from "@/pages/admin/AdminContractDetail";
import AdminContractDeploy from "@/pages/admin/AdminContractDeploy";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminSystem from "@/pages/admin/AdminSystem";
import AdminDiscover from "@/pages/admin/AdminDiscover";
import Courses from "@/pages/Courses";
import DiscoverPartners from "@/pages/DiscoverPartners";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

// Layout components
import Header from "@/components/Layout/Header";
import Navigation from "@/components/Layout/Navigation";
import Footer from "@/components/Layout/Footer";
import { RouteGuard } from "@/components/RouteGuard";

function Router() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  // Handle admin routes separately without RouteGuard
  if (isAdminRoute) {
    return (
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
          <AdminRouteGuard requiredRole="super_admin">
            <AdminLayout>
              <AdminUsers />
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
    );
  }

  // Handle regular user routes with RouteGuard
  return (
    <RouteGuard>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Landing} />
        <Route path="/register" component={Registration} />
        <Route path="/welcome" component={Welcome} />
        
        {/* Main app routes - Protected with wallet connection and Level 1 NFT requirement */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/education" component={Education} />
        <Route path="/education/:courseId" component={CourseDetails} />
        <Route path="/discover" component={Discover} />
        <Route path="/courses" component={Courses} />
        <Route path="/discover-partners" component={DiscoverPartners} />
        <Route path="/me" component={Me} />
        <Route path="/ads" component={AdvertisementNFTs} />
        <Route path="/nft-center" component={NFTCenter} />
        
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
