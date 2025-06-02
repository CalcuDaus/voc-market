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
                    <a href="#"
                        class="sidebar-item active:shadow-none active:translate-0.5 bg-violet-500  shadow-[0_5px_0_var(--color-violet-700)] text-white items-center flex justify-center lg:px-5 lg:py-2 px-3 py-1 rounded-xl ">
                        <i class="fa-solid fa-house lg:me-2"></i> <span class="pt-1 lg:block hidden"> Beranda</span>
                    </a>
                    <button data-modal-target="default-modal" data-modal-toggle="default-modal"
                        class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl "
                        type="button">
                        <i class="fa-solid fa-search lg:me-2"></i> <span class="pt-1 lg:block hidden"> Cari</span>
                    </button>
                    <a href="#"
                        class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl ">
                        <i class="fa-solid fa-add lg:me-2"></i> <span class="pt-1 lg:block hidden"> Tambahkan</span>
                    </a>
                    <a href="#"
                        class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl ">
                        <i class="fa-solid fa-newspaper lg:me-2"></i> <span class="pt-1 lg:block hidden"> Artikel
                        </span>
                    </a>
                    <a href="#"
                        class="sidebar-item active:shadow-none active:translate-0.5 bg-green-500 shadow-[0_5px_0_var(--color-green-700)] text-white items-center flex justify-center   lg:px-5 lg:py-2 px-3 py-1 rounded-xl ">
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
            <section
                class="main-section lg:w-[65%] w-full lg:mt-0 mt-[90px] flex justify-center flex-col items-center gap-5">
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
                    <img src="https://loremflickr.com/400/300?random=1" alt="random"
                        class="w-full rounded-2xl px-2 py-1">
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
                    <img src="https://loremflickr.com/400/300?random=1" alt="random"
                        class="w-full rounded-2xl px-2 py-1">
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
                    <img src="https://loremflickr.com/400/300?random=1" alt="random"
                        class="w-full rounded-2xl px-2 py-1">
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
                <div class="lg:max-w-[350px] w-full flex flex-col">
                    <div
                        class="profile-info py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <div
                            class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <div
                            class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <div
                            class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <div
                            class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <div
                            class="profile-info mt-2 py-2 px-4 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                        <p><strong>{{ env('APP_NAME') }}</strong>, Oleh Mhd Firdaus - &copy; {{ date('Y') }} </p>
                    </div>
                </div>
            </section>
        </div>
    </div>


    <!-- Main modal -->
    <div id="default-modal" tabindex="-1" aria-hidden="true"
        class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
        <div class="relative p-4 w-full max-w-2xl max-h-full">
            <!-- Modal content -->
            <div
                class="relative bg-white rounded-lg dark:bg-gray-300 border-2! border-gray-300! shadow-[0_2px_0_var(--color-gray-300)]">
                <!-- Modal header -->
                <div
                    class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
                    <div class="w-[80%]">
                        <p>Cari kata kunci</p>
                        <i class="fa-solid fa-search translate-y-8 translate-x-2"></i>
                        <input type="text" id="search-input"
                            class="bg-gray-50 border-none focus:outline-none ps-8 border-gray-300 text-gray-900 text-sm rounded-lg  block w-full p-2.5 dark:bg-gray-200 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-900"
                            placeholder="Cari disini..">
                    </div>
                    <div class="w[20%]">
                        <button type="button"
                            class="text-gray-100 -translate-y-10 translate-x-2.5 bg-red-500 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                            data-modal-hide="default-modal">
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>
                </div>
                <!-- Modal body -->
                <div class="p-4 md:p-5 space-y-1">
                    <div
                        class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                    <div
                        class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
                    <div
                        class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl shadow-[0_2px_0_var(--color-gray-300)]">
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
            </div>
        </div>
    </div>

    <script src="{{ asset('voc-market/dist/font-awesome/js/all.min.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js"></script>

    <script>
        import {
            Modal
        } from "flowbite";

        // set the modal menu element
        const $targetEl = document.getElementById('modalEl');

        // options with default values
        const options = {
            placement: 'bottom-right',
            backdrop: 'dynamic',
            backdropClasses: 'bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40',
            closable: true,
            onHide: () => {
                console.log('modal is hidden');
            },
            onShow: () => {
                console.log('modal is shown');
            },
            onToggle: () => {
                console.log('modal has been toggled');
            },
        };

        // instance options object
        const instanceOptions = {
            id: 'modalEl',
            override: true
        };

        const modal = new Modal($targetEl, options, instanceOptions);
    </script>

    <script src="{{ asset('voc-market/dist/js/custom.js') }}"></script>
</body>

</html>
