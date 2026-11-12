<script lang="ts">
  import { Compass } from 'lucide-svelte';
  import { auth } from './lib/auth.svelte';
  import { navigate, router } from './lib/router.svelte';
  import Navbar from './lib/components/Navbar.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';
  import SessionWarningModal from './lib/components/SessionWarningModal.svelte';
  import { sessionManager } from './lib/session.svelte';

  // Tier 1 Pages
  import HomePage from './pages/HomePage.svelte';
  import LoginPage from './pages/LoginPage.svelte';
  import RegisterPage from './pages/RegisterPage.svelte';
  import PostDetailPage from './pages/PostDetailPage.svelte';
  import PostFormPage from './pages/PostFormPage.svelte';
  import OrderTrackPage from './pages/OrderTrackPage.svelte';
  import BuyerOrdersPage from './pages/BuyerOrdersPage.svelte';
  import SellerOrdersPage from './pages/SellerOrdersPage.svelte';
  import TeacherDashboardPage from './pages/TeacherDashboardPage.svelte';
  import ProfilePage from './pages/ProfilePage.svelte';
  import PassportPage from './pages/PassportPage.svelte';

  // Tier 2 Pages
  import RequestsBoardPage from './pages/RequestsBoardPage.svelte';
  import RequestFormPage from './pages/RequestFormPage.svelte';
  import RequestDetailPage from './pages/RequestDetailPage.svelte';
  import SchoolsDirectoryPage from './pages/SchoolsDirectoryPage.svelte';
  import SchoolShowPage from './pages/SchoolShowPage.svelte';
  import SchoolManagePage from './pages/SchoolManagePage.svelte';
  import OpenToWorkPage from './pages/OpenToWorkPage.svelte';
  import TalentSearchPage from './pages/TalentSearchPage.svelte';
  import InvitationsPage from './pages/InvitationsPage.svelte';
  import OpportunitiesHubPage from './pages/OpportunitiesHubPage.svelte';
  import ChallengesPage from './pages/ChallengesPage.svelte';
  import ChallengeDetailPage from './pages/ChallengeDetailPage.svelte';
  import CompanyChallengeForm from './pages/CompanyChallengeForm.svelte';
  import CertificatePage from './pages/CertificatePage.svelte';
  import NotificationsPage from './pages/NotificationsPage.svelte';
  import AdminPanelPage from './pages/AdminPanelPage.svelte';

  // Tier 3 Pages
  import SellerDashboardPage from './pages/SellerDashboardPage.svelte';
  import SellerReportPrintPage from './pages/SellerReportPrintPage.svelte';

  // Skill-Hub Showcase Pages
  import ShowcaseGalleryPage from './pages/ShowcaseGalleryPage.svelte';
  import ShowcaseDetailPage from './pages/ShowcaseDetailPage.svelte';

  $effect(() => {
    sessionManager.init();
    auth.refresh();
  });

  type MatchedRoute =
    | { name: 'home' }
    | { name: 'login' }
    | { name: 'register' }
    | { name: 'post-create' }
    | { name: 'post-edit'; id: number }
    | { name: 'post-detail'; id: number }
    | { name: 'order-track'; orderCode: string; token: string }
    | { name: 'buyer-orders' }
    | { name: 'seller-orders' }
    | { name: 'teacher-dashboard' }
    | { name: 'passport'; username: string }
    | { name: 'profile'; username: string }
    | { name: 'my-profile' }
    // Tier 2 Routes
    | { name: 'requests-board' }
    | { name: 'request-create' }
    | { name: 'request-detail'; code: string }
    | { name: 'schools-directory' }
    | { name: 'school-manage'; slug: string }
    | { name: 'school-show'; slug: string }
    | { name: 'open-to-work' }
    | { name: 'talent-search' }
    | { name: 'invitations' }
    | { name: 'opportunities' }
    | { name: 'challenges' }
    | { name: 'challenge-create' }
    | { name: 'challenge-edit'; slug: string }
    | { name: 'challenge-detail'; slug: string }
    | { name: 'certificate'; code: string }
    | { name: 'notifications' }
    | { name: 'admin-panel' }
    // Tier 3 Routes
    | { name: 'seller-dashboard' }
    | { name: 'seller-report-print' }
    // Skill-Hub Showcase Routes
    | { name: 'showcase-gallery' }
    | { name: 'showcase-detail'; id: number }
    | { name: 'not-found' };

  let currentRoute = $derived.by<MatchedRoute>(() => {
    const path = router.pathname.replace(/\/+$/, '') || '/';

    // Static Exact Routes
    if (path === '/') return { name: 'home' };
    if (path === '/masuk' || path === '/login') return { name: 'login' };
    if (path === '/daftar' || path === '/register') return { name: 'register' };
    if (path === '/jual') return { name: 'post-create' };
    if (path === '/riwayat-pesanan') return { name: 'buyer-orders' };
    if (path === '/pesanan-masuk') return { name: 'seller-orders' };
    if (path === '/dashboard/guru') return { name: 'teacher-dashboard' };
    if (path === '/profil' || path === '/profile') return { name: 'my-profile' };

    // Tier 2 Static Exact Routes
    if (path === '/peluang') return { name: 'opportunities' };
    if (path === '/notifikasi') return { name: 'notifications' };
    if (path === '/admin') return { name: 'admin-panel' };
    if (path === '/butuh-bantuan') return { name: 'requests-board' };
    if (path === '/butuh-bantuan/buat') return { name: 'request-create' };
    if (path === '/siap-kerja') return { name: 'open-to-work' };
    if (path === '/talenta') return { name: 'talent-search' };
    if (path === '/undangan') return { name: 'invitations' };
    if (path === '/sekolah') return { name: 'schools-directory' };
    if (path === '/tantangan') return { name: 'challenges' };
    if (path === '/tantangan/buat') return { name: 'challenge-create' };

    // Tier 3 Static Exact Routes
    if (path === '/dashboard-penjual/cetak') return { name: 'seller-report-print' };
    if (path === '/dashboard-penjual') return { name: 'seller-dashboard' };

    // Skill-Hub Showcase Static Routes
    if (path === '/pameran' || path === '/showcase' || path === '/skill-hub') {
      return { name: 'showcase-gallery' };
    }

    // Dynamic Parameterized Routes
    const showcaseDetailMatch = path.match(/^\/pameran\/(\d+)$/);
    if (showcaseDetailMatch) {
      return { name: 'showcase-detail', id: Number(showcaseDetailMatch[1]) };
    }
    const challengeEditMatch = path.match(/^\/tantangan\/([^/]+)\/edit$/);
    if (challengeEditMatch) {
      return { name: 'challenge-edit', slug: decodeURIComponent(challengeEditMatch[1]) };
    }

    const challengeMatch = path.match(/^\/tantangan\/([^/]+)$/);
    if (challengeMatch) {
      return { name: 'challenge-detail', slug: decodeURIComponent(challengeMatch[1]) };
    }

    const schoolManageMatch = path.match(/^\/sekolah\/([^/]+)\/kelola$/);
    if (schoolManageMatch) {
      return { name: 'school-manage', slug: decodeURIComponent(schoolManageMatch[1]) };
    }

    const schoolMatch = path.match(/^\/sekolah\/([^/]+)$/);
    if (schoolMatch) {
      return { name: 'school-show', slug: decodeURIComponent(schoolMatch[1]) };
    }

    const requestDetailMatch = path.match(/^\/butuh-bantuan\/([^/]+)$/);
    if (requestDetailMatch) {
      return { name: 'request-detail', code: decodeURIComponent(requestDetailMatch[1]) };
    }

    const certMatch = path.match(/^\/sertifikat\/([^/]+)$/);
    if (certMatch) {
      return { name: 'certificate', code: decodeURIComponent(certMatch[1]) };
    }

    const editMatch = path.match(/^\/karya\/(\d+)\/edit$/);
    if (editMatch) {
      return { name: 'post-edit', id: Number(editMatch[1]) };
    }

    const postMatch = path.match(/^\/karya\/(\d+)$/);
    if (postMatch) {
      return { name: 'post-detail', id: Number(postMatch[1]) };
    }

    const orderMatch = path.match(/^\/pesanan\/([^/]+)$/);
    if (orderMatch) {
      return {
        name: 'order-track',
        orderCode: decodeURIComponent(orderMatch[1]),
        token: router.query.get('token') || ''
      };
    }

    const passportMatch = path.match(/^\/paspor-kerja\/([^/]+)$/);
    if (passportMatch) {
      return {
        name: 'passport',
        username: decodeURIComponent(passportMatch[1])
      };
    }

    const profileMatch = path.match(/^\/(?:profil|profile)\/([^/]+)$/);
    if (profileMatch) {
      return {
        name: 'profile',
        username: decodeURIComponent(profileMatch[1])
      };
    }

    return { name: 'not-found' };
  });

  let isAuthPage = $derived(
    currentRoute.name === 'login' || currentRoute.name === 'register'
  );
</script>

<!-- Layered Canvas System: Outer bg-white with centered bg-[#EEEEEE] card canvas -->
<div class="min-h-screen bg-white text-gray-900 font-['Poppins',sans-serif]">
  <ToastContainer />
  <SessionWarningModal />

  {#if isAuthPage}
    <!-- Dedicated Fullscreen Canvas for Auth Pages (Section 4 & 5) -->
    {#if currentRoute.name === 'login'}
      <LoginPage />
    {:else}
      <RegisterPage />
    {/if}
  {:else}
    <!-- Outer White Canvas: Flanks left & right with pure white (Layer 0) -->
    <div class="min-h-screen bg-white flex justify-center px-0 sm:px-4 md:px-6 lg:px-8 print:p-0">
      <!-- Centered Layered Card Canvas: bg-[#EEEEEE] full-height (Layer 1) -->
      <div
        class="w-full max-w-[1440px] bg-[#EEEEEE] min-h-screen px-2 sm:px-4 lg:px-6 py-0 lg:py-5 flex justify-center gap-6 items-start shadow-sm border-x border-gray-300/60 print:bg-transparent print:border-0 print:shadow-none print:p-0"
      >
        <!-- Left Column: Desktop Left Sidebar Menu + Mobile Nav Provider -->
        <div class="w-0 lg:w-60 xl:w-64 shrink-0 lg:sticky lg:top-5 lg:self-start print:hidden">
          <Navbar />
        </div>

        <!-- Center / Main Area -->
        <main class="flex-1 min-w-0 max-w-full pt-15 lg:pt-0 pb-20 lg:pb-6 print:p-0">
          {#if currentRoute.name === 'home'}
            <HomePage />
          {:else if currentRoute.name === 'post-create'}
            <PostFormPage />
          {:else if currentRoute.name === 'post-edit'}
            <PostFormPage editPostId={currentRoute.id} />
          {:else if currentRoute.name === 'post-detail'}
            <PostDetailPage postId={currentRoute.id} />
          {:else if currentRoute.name === 'order-track'}
            <OrderTrackPage orderCode={currentRoute.orderCode} token={currentRoute.token} />
          {:else if currentRoute.name === 'buyer-orders'}
            <BuyerOrdersPage />
          {:else if currentRoute.name === 'seller-orders'}
            <SellerOrdersPage />
          {:else if currentRoute.name === 'teacher-dashboard'}
            <TeacherDashboardPage />
          {:else if currentRoute.name === 'passport'}
            <PassportPage username={currentRoute.username} />
          {:else if currentRoute.name === 'profile'}
            <ProfilePage username={currentRoute.username} />
          {:else if currentRoute.name === 'my-profile'}
            {#if auth.user}
              <ProfilePage username={auth.user.username} />
            {:else if auth.ready}
              <LoginPage />
            {/if}

          <!-- Tier 2 Route Components -->
          {:else if currentRoute.name === 'opportunities'}
            <OpportunitiesHubPage />
          {:else if currentRoute.name === 'requests-board'}
            <RequestsBoardPage />
          {:else if currentRoute.name === 'request-create'}
            <RequestFormPage />
          {:else if currentRoute.name === 'request-detail'}
            <RequestDetailPage code={currentRoute.code} />
          {:else if currentRoute.name === 'schools-directory'}
            <SchoolsDirectoryPage />
          {:else if currentRoute.name === 'school-show'}
            <SchoolShowPage slug={currentRoute.slug} />
          {:else if currentRoute.name === 'school-manage'}
            <SchoolManagePage slug={currentRoute.slug} />
          {:else if currentRoute.name === 'open-to-work'}
            <OpenToWorkPage />
          {:else if currentRoute.name === 'talent-search'}
            <TalentSearchPage />
          {:else if currentRoute.name === 'invitations'}
            <InvitationsPage />
          {:else if currentRoute.name === 'challenges'}
            <ChallengesPage />
          {:else if currentRoute.name === 'challenge-create'}
            <CompanyChallengeForm />
          {:else if currentRoute.name === 'challenge-edit'}
            <CompanyChallengeForm editSlug={currentRoute.slug} />
          {:else if currentRoute.name === 'challenge-detail'}
            <ChallengeDetailPage slug={currentRoute.slug} />
          {:else if currentRoute.name === 'certificate'}
            <CertificatePage certificateCode={currentRoute.code} />
          {:else if currentRoute.name === 'notifications'}
            <NotificationsPage />
          {:else if currentRoute.name === 'admin-panel'}
            <AdminPanelPage />

          <!-- Tier 3 Route Components -->
          {:else if currentRoute.name === 'seller-dashboard'}
            <SellerDashboardPage />
          {:else if currentRoute.name === 'seller-report-print'}
            <SellerReportPrintPage />

          <!-- Skill-Hub Showcase Components -->
          {:else if currentRoute.name === 'showcase-gallery'}
            <ShowcaseGalleryPage />
          {:else if currentRoute.name === 'showcase-detail'}
            <ShowcaseDetailPage postId={currentRoute.id} />

          {:else}
            <div class="max-w-lg mx-auto px-4 py-16 text-center">
              <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 shadow-[0_5px_0_#d1d5db]">
                <Compass class="w-12 h-12 text-[#4285F4] mx-auto mb-3" />
                <h1 class="text-2xl font-black text-gray-900">Halaman Tidak Ditemukan</h1>
                <p class="text-xs text-gray-500 mt-2">
                  Alamat halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
                </p>
                <button
                  type="button"
                  onclick={() => navigate('/')}
                  class="mt-6 h-11 px-6 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 text-white font-bold text-xs transition cursor-pointer"
                >
                  Kembali ke Beranda Katalog
                </button>
              </div>
            </div>
          {/if}
        </main>
      </div>
    </div>
  {/if}
</div>
