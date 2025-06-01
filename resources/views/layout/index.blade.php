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
        <div class="container-sidebar lg:w-[336px] justify-center flex lg:h-[95dvh] lg:fixed lg:flex fixed w-full lg:top-0 bottom-0 left-0 ">
            <div
                class="wrapper-sidebar lg:w-full lg:h-full flex justify-center lg:flex-col lg:justify-start p-3 rounded-xl lg:m-4 m-2 border-2 border-gray-300 bg-white shadow-[1px_5px_0_var(--color-gray-300)]">
                <div class="logo  lg:text-center lg:flex lg:justify-center lg:mt-2 lg:mb-[40px]">
                    <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" class="lg:block hidden" alt="logo">
                    {{-- <h1 class="lg:block hidden">Logo</h1> --}}
                </div>
                    <ul class="menu lg:flex lg:flex-col flex-row flex gap-3">
                        <a href="#"
                            class="sidebar-item active:shadow-none active:translate-0.5 bg-violet-500  shadow-[0_5px_0_var(--color-violet-700)] text-white items-center flex justify-center px-5 py-2 rounded-xl ">
                            <i class="fa-solid fa-house lg:me-2"></i> <span class="pt-1 lg:block hidden"> Beranda</span>
                        </a>
                        <a href="#"
                            class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   px-5 py-2 rounded-xl ">
                            <i class="fa-solid fa-search lg:me-2"></i> <span class="pt-1 lg:block hidden"> Cari</span>
                        </a>
                        <a href="#"
                            class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   px-5 py-2 rounded-xl ">
                            <i class="fa-solid fa-add lg:me-2"></i> <span class="pt-1 lg:block hidden"> Tambahkan</span>
                        </a>
                        <a href="#"
                            class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   px-5 py-2 rounded-xl ">
                            <i class="fa-solid fa-newspaper lg:me-2"></i> <span class="pt-1 lg:block hidden"> Artikel </span>
                        </a>
                        <a href="#"
                            class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   px-5 py-2 rounded-xl ">
                            <i class="fa-solid fa-user lg:me-2"></i> <span class="pt-1 lg:block hidden"> Profil Akun </span>
                        </a>
                    </ul>
            </div>
        </div>
        {{-- Main Content --}}
        <div class="container-main lg:mt-4 w-full flex lg:ml-[336px] m-0">
            <div class="header lg:hidden absolute border-b-2 border-gray-300 w-full pb-2 flex">
                    <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" class="lg:block w-[310px]" alt="logo">
            </div>
            <section class="main-section lg:w-[65%] w-full lg:mt-0 mt-[90px] flex justify-center flex-col items-center gap-5">
                {{-- Iteration Here.. --}}
                <div
                    class="post-card lg:w-[468px] w-full border-gray-300 border-2 rounded-xl h-auto shadow-[1px_3px_0_var(--color-gray-300)]">
                    <div class="post-head p-3">
                        <div class="post-profile flex gap-3 items-center mb-3">
                            <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                class="w-[38px] rounded-[100%]">
                            <p class="font-semibold">draz_me · <span class="text-gray-500 font-normal! text-xs">2
                                    minutes ago</span></p>
                        </div>
                        <h3>Title here.. </h3>
                    </div>
                    <img src="https://loremflickr.com/400/300?random=1" alt="random" class="w-full rounded-2xl px-2 py-1">
                    <div class="post-icon flex p-3 justify-end gap-4">
                        <a href=""><i class="fa-regular fa-heart fa-lg "></i></a>
                        <a href=""> <i class="fa-regular fa-share-from-square fa-lg "></i></a>
                    </div>
                    <div class="post-desc p-3">
                        <div class="max-w-md mx-auto">
                            <p class="text-[14px] line-clamp-2 post-card-desc overflow-hidden text-gray-700">
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Iure eveniet repudiandae,
                                voluptate illum alias accusamus tempora labore ipsum quia odit at? Porro distinctio nam
                                cupiditate inventore totam natus in quam.
                            </p>
                            <button
                                class="text-violet-500 mt-2 text-sm read-more-btn font-medium focus:outline-none">Read
                                more</button>
                        </div>
                    </div>
                </div>
                <div
                    class="post-card lg:w-[468px] w-full border-gray-300 border-2 rounded-xl h-auto shadow-[1px_5px_0_var(--color-gray-300)]">
                    <div class="post-head p-3">
                        <div class="post-profile flex gap-3 items-center mb-3">
                            <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                class="w-[38px] rounded-[100%]">
                            <p class="font-semibold">draz_me · <span class="text-gray-500 font-normal! text-xs">2
                                    minutes ago</span></p>
                        </div>
                        <h3>Title here.. </h3>
                    </div>
                    <img src="https://loremflickr.com/400/300?random=1" alt="random" class="w-full rounded-2xl px-2 py-1">
                    <div class="post-icon flex p-3 justify-end gap-4">
                        <a href=""><i class="fa-regular fa-heart fa-lg "></i></a>
                        <a href=""><i class="fa-regular fa-share-from-square fa-lg "></i></a>
                    </div>
                    <div class="post-desc flex flex-col px-3 pb-3">
                        <div class="price-desc flex gap-2 mb-2 items-center">
                            <p class="text-xs mb-[2px]">Rentang Harga</p>
                            <p
                                class="text-[10px] bg-violet-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-violet-700)]">
                                Rp.20,000</p>
                            <p
                                class="text-[10px] bg-violet-500 px-1 py-1 rounded text-white shadow-[0_3px_0_var(--color-violet-700)]">
                                -</p>
                            <p
                                class="text-[10px] bg-violet-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-violet-700)]">
                                Rp.70,000</p>
                            <a href="#"
                                class="text-[10px] bg-blue-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-blue-700)]">
                                Chat</a>
                        </div>
                        <div class="max-w-md mx-auto">
                            <p class="text-[14px] line-clamp-2 post-card-desc overflow-hidden text-gray-700">
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Iure eveniet repudiandae,
                                voluptate illum alias accusamus tempora labore ipsum quia odit at? Porro distinctio nam
                                cupiditate inventore totam natus in quam.
                            </p>
                            <button
                                class="text-violet-500 mt-2 text-sm read-more-btn font-medium focus:outline-none">Read
                                more</button>
                        </div>
                    </div>
                </div>
                <div
                    class="post-card lg:w-[468px] w-full border-gray-300 border-2 rounded-xl h-auto shadow-[1px_5px_0_var(--color-gray-300)]">
                    <div class="post-head p-3">
                        <div class="post-profile flex gap-3 items-center mb-3">
                            <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                class="w-[38px] rounded-[100%]">
                            <p class="font-semibold">draz_me · <span class="text-gray-500 font-normal! text-xs">2
                                    minutes ago</span></p>
                        </div>
                    </div>
                    <img src="https://loremflickr.com/400/300?random=1" alt="random" class="w-full rounded-2xl px-2 py-1">
                    <div class="post-icon flex p-3 justify-end gap-2">
                        <a href=""><i class="fa-regular fa-heart fa-lg "></i></a>
                        <a href=""><i class="fa-regular fa-share-from-square fa-lg "></i></a>
                        <a href=""><i class="fa-solid fa-link fa-lg "></i></a>
                    </div>
                    <div class="post-desc p-3">
                        <div class="price-desc flex gap-2 mb-2 items-center">
                            <p class="text-xs mb-[2px]">Harga</p>
                            <p
                                class="text-[10px] bg-violet-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-violet-700)]">
                                Rp.70,000</p>
                            <a href="#"
                                class="text-[10px] bg-blue-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-blue-700)]">
                                Chat</a>
                            <a href="#"
                                class="text-[10px] bg-orange-500 px-3 py-1 rounded text-white shadow-[0_3px_0_var(--color-orange-700)]">
                                Beli</a>
                        </div>
                        <div class="max-w-md mx-auto">
                            <p class="text-[14px] line-clamp-2 post-card-desc overflow-hidden text-gray-700">
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Iure eveniet repudiandae,
                                voluptate illum alias accusamus tempora labore ipsum quia odit at? Porro distinctio nam
                                cupiditate inventore totam natus in quam.
                            </p>
                            <button
                                class="text-violet-500 mt-2 text-sm read-more-btn font-medium focus:outline-none">Read
                                more</button>
                        </div>
                    </div>
                </div>
            </section>
            <section class="secondary-section lg:w-[35%] lg:px-4 hidden lg:flex">
              <div class="lg:max-w-[350px] w-full flex flex-col" >
                  <div class="profile-info py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                    <div class="post-profile flex gap-3 items-center justify-between">
                        <div class="profile-img flex">
                            <div class="profile-img-content">
                                <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                    class="w-[38px] rounded-[100%]">
                            </div>
                            <div class="profile-username ms-4">
                                <p class="font-bold">draz_me</p>
                                <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                            </div>
                        </div>
                        <a href="#"> <i class="fa-solid fa-gear fa-lg"></i></a>
                    </div>
                </div>
                <div class="suggest-friend-card mt-6 ">
                    <h2 class="mb-3">Lihat teman</h2>
                   {{-- Iteration Here.. --}}
                    <div class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                        <div class="post-profile flex gap-3 items-center justify-between">
                            <div class="profile-img flex">
                                <div class="profile-img-content">
                                    <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                        class="w-[38px] rounded-[100%]">
                                </div>
                                <div class="profile-username ms-4">
                                    <p class="font-bold">draz_me</p>
                                    <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                                </div>
                            </div>
                            <a href="#"> <i class="fa-solid fa-user-plus fa-lg"></i></a>
                        </div>
                    </div>
                    <div class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                        <div class="post-profile flex gap-3 items-center justify-between">
                            <div class="profile-img flex">
                                <div class="profile-img-content">
                                    <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                        class="w-[38px] rounded-[100%]">
                                </div>
                                <div class="profile-username ms-4">
                                    <p class="font-bold">draz_me</p>
                                    <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                                </div>
                            </div>
                            <a href="#"> <i class="fa-solid fa-user-plus fa-lg"></i></a>
                        </div>
                    </div>
                    <div class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                        <div class="post-profile flex gap-3 items-center justify-between">
                            <div class="profile-img flex">
                                <div class="profile-img-content">
                                    <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                        class="w-[38px] rounded-[100%]">
                                </div>
                                <div class="profile-username ms-4">
                                    <p class="font-bold">draz_me</p>
                                    <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                                </div>
                            </div>
                            <a href="#"> <i class="fa-solid fa-user-plus fa-lg"></i></a>
                        </div>
                    </div>
                    <div class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                        <div class="post-profile flex gap-3 items-center justify-between">
                            <div class="profile-img flex">
                                <div class="profile-img-content">
                                    <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                        class="w-[38px] rounded-[100%]">
                                </div>
                                <div class="profile-username ms-4">
                                    <p class="font-bold">draz_me</p>
                                    <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                                </div>
                            </div>
                            <a href="#"> <i class="fa-solid fa-user-plus fa-lg"></i></a>
                        </div>
                    </div>
                    <div class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
                        <div class="post-profile flex gap-3 items-center justify-between">
                            <div class="profile-img flex">
                                <div class="profile-img-content">
                                    <img src="https://loremflickr.com/200/200?random=1" alt="random"
                                        class="w-[38px] rounded-[100%]">
                                </div>
                                <div class="profile-username ms-4">
                                    <p class="font-bold">draz_me</p>
                                    <p class="text-xs -mt-[2px]">Andreaz Bro</p>
                                </div>
                            </div>
                            <a href="#"> <i class="fa-solid fa-user-plus fa-lg"></i></a>
                        </div>
                    </div>
                </div>
                <div class="footer mt-5 flex ">
                    <p><strong>{{ env('APP_NAME') }}</strong>, Oleh Mhd Firdaus  - &copy; {{date('Y')}} </p>
                </div>
              </div>
            </section>
        </div>
    </div>

    <script src="{{ asset('voc-market/dist/font-awesome/js/all.min.js') }}"></script>

    <script src="{{ asset('voc-market/dist/js/custom.js') }}"></script>
</body>

</html>
