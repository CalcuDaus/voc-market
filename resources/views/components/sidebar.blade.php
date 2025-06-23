<div
    class="container-sidebar lg:w-[336px] justify-center flex lg:h-[95dvh]  lg:fixed lg:flex fixed w-full lg:top-0 bottom-0 left-0 ">
    <div
        class="wrapper-sidebar lg:w-full lg:h-full flex justify-center h-16 lg:flex-col lg:justify-start px-7 py-3.5 rounded-full lg:rounded-2xl lg:m-4 m-2 border-2 border-gray-300 bg-white ">
        <div class="logo  lg:text-center lg:flex lg:justify-center lg:mt-2 lg:mb-[40px]">
            <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" class="lg:block hidden"
                alt="logo">
            {{-- <h1 class="lg:block hidden">Logo</h1> --}}
        </div>
        <ul class="menu lg:flex lg:flex-col flex-row flex gap-6">
            @php
                $activeClass = 'bg-violet-500 shadow-[0_5px_0_var(--color-violet-700)]';
                $inactiveClass = ' bg-green-500 shadow-[0_5px_0_var(--color-green-700)]';
            @endphp
            <a href="{{ route('home') }}"
                class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('/') ? $activeClass : $inactiveClass }}">
                <i class="fa-solid fa-house lg:me-2"></i> <span class="pt-1 lg:block hidden"> Beranda</span>
            </a>
            <button data-modal-target="default-modal" data-modal-toggle="default-modal"
                class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('search') ? $activeClass : $inactiveClass }} "
                type="button">
                <i class="fa-solid fa-search lg:me-2"></i> <span class="pt-1 lg:block hidden"> Cari</span>
            </button>
            <a href="{{ route('smk-users-add') }}"
                class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('smk-users-add') || request()->is('add-product') || request()->is('add-service') || request()->is('add-portfolio') ? $activeClass : $inactiveClass }} ">
                <i class="fa-solid fa-add lg:me-2"></i> <span class="pt-1 lg:block hidden"> Tambahkan</span>
            </a>
            <a href="#"
                class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('article') ? $activeClass : $inactiveClass }} ">
                <i class="fa-solid fa-newspaper lg:me-2"></i> <span class="pt-1 lg:block hidden"> Artikel
                </span>
            </a>
            <a href="#"
                class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('profile') ? $activeClass : $inactiveClass }} ">
                <i class="fa-solid fa-user lg:me-2"></i> <span class="pt-1 lg:block hidden"> Profil Akun </span>
            </a>
        </ul>
    </div>
</div>
