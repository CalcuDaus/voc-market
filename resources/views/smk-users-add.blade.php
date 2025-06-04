<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>VOC MARKET</title>
    @vite('resources/css/app.css')

    {{-- Font Awesome --}}
    <link rel="stylesheet" href="{{ asset('voc-market/dist/font-awesome/css/all.min.css') }}">

</head>

<body class="font-[poppins] text-gray-700 ">
    {{-- Main Container --}}
    <div class="flex relative">
        {{-- Sidebar --}}
        <div
            class="container-sidebar lg:w-[336px] justify-center flex lg:h-[95dvh]  lg:fixed lg:flex fixed w-full lg:top-0 bottom-0 left-0 ">
            <div
                class="wrapper-sidebar lg:w-full lg:h-full flex justify-center h-16 lg:flex-col lg:justify-start px-7 py-3.5 rounded-full lg:rounded-2xl lg:m-4 m-2 border-2 border-gray-300 bg-white shadow-[0px_2px_0_var(--color-gray-300)]">
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
                    <a href="#"
                        class="sidebar-item active:shadow-none active:translate-0.5 text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl {{ request()->is('smk-users-add') ? $activeClass : $inactiveClass }} ">
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
        {{-- Main Content --}}
        <div class="container-main lg:mt-4 w-full flex lg:ml-[336px] m-0">
            <div class="header lg:hidden absolute border-b-2 border-gray-300 w-full pb-2 flex">
                <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" class="lg:block w-[310px]"
                    alt="logo">
            </div>
            <div class="wrapper-main lg:w-full w-full lg:mx-4 mx-2 lg:mt-0 mt-22 lg:mb-4 mb-2">
                <div class="content items-center flex flex-col gap-4">
                    <h1 class="font-bold lg:text-5xl text-3xl text-center italic tracking-tight">Tunjukan
                        Bakatmu Pada Dunia!</h1>
                    <div class="flex justify-center items-center w-full gap-3 lg:gap-5 ">
                        <div
                            class="add-card border-2 gap-3 hover:bg-gray-100 active:shadow-none lg:mt-30 active:translate-y-[2px]  lg:text-2xl flex-col rounded-xl h-[150px] lg:h-[300px] flex justify-center items-center border-gray-300 bg-white shadow-[0px_2px_0_var(--color-gray-300)] w-[100px] lg:w-[20%]">
                            <h2>Produk</h2>
                            <i class="fa-solid lg:fa-2xl fa-plus"></i>
                        </div>
                        <div
                            class="add-card border-2 gap-3 hover:bg-gray-100 active:shadow-none lg:mt-30 active:translate-y-[2px] lg:text-2xl flex-col rounded-xl h-[150px] lg:h-[300px] flex justify-center items-center  border-gray-300 bg-white shadow-[0px_2px_0_var(--color-gray-300)] w-[100px] lg:w-[20%]">
                            <h2>Jasa</h2>
                            <i class="fa-solid lg:fa-2xl fa-plus"></i>
                        </div>
                        <div
                            class="add-card border-2 gap-3 hover:bg-gray-100 active:shadow-none lg:mt-30 active:translate-y-[2px] lg:text-2xl flex-col rounded-xl h-[150px] lg:h-[300px] flex justify-center items-center  border-gray-300 bg-white shadow-[0px_2px_0_var(--color-gray-300)] w-[100px] lg:w-[20%]">
                            <h2>Portfolio</h2>
                            <i class="fa-solid lg:fa-2xl fa-plus"></i>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>

    <script src="{{ asset('voc-market/dist/font-awesome/js/all.min.js') }}"></script>
    <script src="{{ asset('voc-market/dist/js/custom.js') }}"></script>
</body>

</html>
