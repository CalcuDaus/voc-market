<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Register Page</title>
    @vite('resources/css/app.css')
</head>


<body
    class="bg-gray-800 text-gray-700 w-full h-auto lg:w-dvw lg:h-dvh font-[poppins] flex justify-center items-center lg:p-5 p-2">
    {{-- Main Container --}}
    <div
        class="flex bg-[#EEEEEE] w-full h-full justify-center items-center rounded-lg px-2 py-5 shadow-lg overflow-y-auto">
        {{-- REgister Form --}}
        <form action="" method="POST" enctype="multipart/form-data"
            class="lg:w-[1000px] text-sm lg:h-[650px] h-auto  w-full flex lg:flex-row flex-col justify-center items-center border-2 border-gray-300 shadow-[0_5px_0_var(--color-gray-300)] rounded-2xl">
            {{-- Left Side --}}
            <div
                class="lg:w-1/2 w-[100%] h-full flex lg:border-r-2 border-b-2 border-gray-300 flex-col lg:px-10 px-5 py-8 justify-center items-center">
                <img src="{{ asset('voc-market/dist/image/voc-market-logo-mobile.png') }}" alt=""
                    class="w-[300px] mb-5 ">
                <div class="flex flex-col gap-4 w-full">
                    <div class="flex flex-col">
                        <label for="email" class="text-gray-700">Email <span class="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" autocomplete="off"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                    </div>

                    <div class="flex gap-1 items-center">
                        <div class="w-1/2">
                            <label for="first_name" class="text-gray-700 w-full">First Name <span
                                    class="text-red-500">*</span></label>
                            <input type="text" id="first_name" name="first_name" autocomplete="off"
                                class="p-2 border-2 focus:outline-none w-full shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                                required>
                        </div>
                        <div class="w-1/2">
                            <label for="last_name" class="text-gray-700 w-full">Last Name <span
                                    class="text-red-500">*</span></label>
                            <input type="text" id="last_name" name="last_name" autocomplete="off"
                                class="p-2 border-2 focus:outline-none w-full shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                                required>
                        </div>
                    </div>
                    <div class="flex gap-1 items-center">
                        <div class="w-1/2">
                            <label for="password" class="text-gray-700 w-full">Password <span
                                    class="text-red-500">*</span></label>
                            <input type="password" id="password" name="password" autocomplete="off"
                                class="p-2 border-2 focus:outline-none w-full shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                                required>
                        </div>
                        <div class="w-1/2">
                            <label for="confirm_password" class="text-gray-700 w-full">Konfirmasi Password <span
                                    class="text-red-500">*</span></label>
                            <input type="password" id="confirm_password" name="confirm_password" autocomplete="off"
                                class="p-2 border-2 focus:outline-none w-full shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                                required>
                        </div>
                    </div>
                    <div class="flex flex-col">
                        <label for="username" class="text-gray-700">Username <span class="text-red-500">*</span></label>
                        <input type="text" id="username" name="username" autocomplete="off"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                    </div>
                    <div class="flex flex-col">
                        <label for="foto_profil" class="text-gray-700">Foto Profil <span
                                class="text-red-500">*</span></label>
                        <input type="file" id="foto_profil" name="foto_profil"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                    </div>
                    <div class="flex flex-col">
                        <label for="phone_number" class="text-gray-700">Nomor HP<span
                                class="text-red-500">*</span></label>
                        <input type="text" id="phone_number" name="phone_number"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                    </div>
                </div>
            </div>
            {{-- Right Side --}}
            <div class="lg:w-1/2 w-[100%] h-full flex flex-col lg:px-10 px-5 py-5 justify-center items-center">
                <div class="flex flex-col gap-4 w-full">
                    <div class="flex flex-col">
                        <label for="user_type" class="text-gray-700">Tipe Pengguna <span
                                class="text-red-500">*</span></label>
                        <select name="user_type" id="user_type"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                            <option value="" disabled selected>-- Pilih Tipe Pengguna --</option>
                            <option value="smk">Anak SMK</option>
                            <option value="public">Publik</option>
                        </select>
                    </div>
                    <div class="flex-col smk-user hidden gap-2">
                        <label for="school_name" class="text-gray-700">Nama Sekolah <span
                                class="text-red-500">*</span></label>
                        <input type="text" id="school_name" name="school_name"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>

                        <label for="nisn" class="text-gray-700">NISN <span class="text-red-500">*</span></label>
                        <input type="number" id="nisn" name="nisn"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>

                        <label for="major" class="text-gray-700">Jurusan <span
                                class="text-red-500">*</span></label>
                        <input type="text" id="major" name="major"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                        <label for="user_type" class="text-gray-700">Skill yang dimiliki<span
                                class="text-red-500">*</span></label>
                        <select name="user_type" id="user_type"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                            <option value="" disabled selected>-- Pilih Skill --</option>
                            <option value="smk">Anak SMK</option>
                            <option value="public">Publik</option>
                        </select>

                    </div>
                    <div class="flex-col public-user hidden gap-2">
                        <label for="business_name" class="text-gray-700">Nama Bisnis <span class="text-gray-500">
                                (opsional)</span></label>
                        <input type="text" id="business_name" name="business_name"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>

                        <label for="business_type" class="text-gray-700">Tipe Bisnis<span class="text-gray-500">
                                (opsional)</span></label>
                        <select name="business_type" id="business_type"
                            class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md"
                            required>
                            <option value="" disabled selected>-- Pilih Tipe Bisnis --</option>
                            <option value="industri">Bisnis Industri</option>
                            <option value="agraris">Bisnis Agraris</option>
                            <option value="ekstraktif">Bisnis Ekstraktif</option>
                            <option value="perdagangan_retail">Bisnis Perdagangan (Retail)</option>
                            <option value="jasa">Bisnis Jasa</option>
                        </select>

                    </div>
                    <button type="submit"
                        class="bg-blue-500 shadow-[0_5px_0_var(--color-blue-700)] active:shadow-none active:translate-y-0.5 text-white p-2 rounded-md ">Daftar</button>
                    <p class="text-gray-500 text-sm">Sudah punya akun? <a href="{{ route('login') }}"
                            class="text-blue-500">Masuk</a>
                    </p>
                </div>
            </div>
        </form>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const userTypeSelect = document.getElementById('user_type');
            const smkUserFields = document.querySelector('.smk-user');
            const publicUserFields = document.querySelector('.public-user');

            userTypeSelect.addEventListener('change', function() {
                if (this.value === 'smk') {
                    smkUserFields.classList.remove('hidden');
                    smkUserFields.classList.add('flex');
                    publicUserFields.classList.add('hidden');
                } else if (this.value === 'public') {
                    publicUserFields.classList.remove('hidden');
                    publicUserFields.classList.add('flex');
                    smkUserFields.classList.add('hidden');
                } else {
                    smkUserFields.classList.add('hidden');
                    publicUserFields.classList.add('hidden');
                }
            });
        });
    </script>
</body>

</html>
