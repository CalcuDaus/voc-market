<x-layouts.app>
    <div class="flex relative">
        <x-sidebar />
        <div class="container-main lg:mt-4 w-full flex lg:ml-[336px] m-0">
            <div class="header lg:hidden absolute border-b-2 border-gray-300 w-full pb-2 flex">
                <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" class="lg:block w-[310px]"
                    alt="logo">
            </div>
            @if (request()->is('/'))
                <x-homepage />
            @elseif (request()->is('smk-users-add'))
                <x-smk-users-add-page />
            @elseif (request()->is('add-product'))
                <x-add-product />
            @elseif (request()->is('add-service'))
                <x-add-service />
            @elseif (request()->is('add-portfolio'))
                <x-add-portfolio /> {{--
            @elseif (request()->is('profile'))
                <x-profile /> --}}
            @else
                <div class="w-full h-full flex items-center justify-center">
                    <div class="text-center">
                        <p class="text-gray-500">Halaman tidak ditemukan</p>
                    </div>
                </div>
            @endif
        </div>
    </div>

    <x-search-modal />

    <script src="{{ asset('voc-market/dist/font-awesome/js/all.min.js') }}"></script>
    <script src="{{ asset('voc-market/dist/js/custom.js') }}"></script>
</x-layouts.app>
