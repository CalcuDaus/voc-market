<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Login Page</title>
    @vite('resources/css/app.css')
</head>
<body class="bg-gray-800 w-dvw h-dvh font-[poppins] flex justify-center items-center p-5">

    {{-- Main Container --}}
    <div class="flex bg-[#EEEEEE] w-full h-full justify-center items-center rounded-lg shadow-lg">
        {{-- Login Form --}}
        <div class="w-[750px] h-[450px] flex justify-center items-center border-2 border-gray-300 shadow-[0_5px_0_var(--color-gray-300)] rounded-2xl">
            {{-- Left Side --}}
            <div class="w-[40%] h-full flex justify-center items-center border-r-2 border-gray-300">
               <img src="{{ asset('voc-market/dist/image/voc-market-logo-login.png') }}" alt="">
            </div>
            {{-- Right Side --}}
            <div class="w-[60%] h-full flex flex-col px-10 justify-center items-center">
                <h2><span class="text-[#01ff70]">Wel</span><span class="text-[#0074d9]">come</span>, <span class="text-[#ff7921]">Wari</span ><span class="text-[#ff4136]">orrs</span></h2>
                <form action="" class="flex flex-col gap-4 w-full" method="POST">
                        <div class="flex flex-col">
                            <label for="email" class="text-gray-700">Email</label>
                            <input type="email" id="email" name="email" autocomplete="off" class="p-2 border-2 focus:outline-none shadow-[0_3px_0_var(--color-gray-300)] border-gray-300  rounded-md" required>
                        </div>
                        <div class="flex flex-col">
                            <label for="password" class="text-gray-700">Password</label>
                            <input type="password" id="password" name="password" class="p-2 border-2 focus:outline-none border-gray-300 shadow-[0_3px_0_var(--color-gray-300)] rounded-md" required>
                        </div>
                        <button type="submit" class="bg-blue-500 shadow-[0_5px_0_var(--color-blue-700)] active:shadow-none active:translate-y-0.5 text-white p-2 rounded-md ">Masuk</button>
                        <p class="text-gray-500 text-sm">Belum punya akun? <a href="" class="text-blue-500">Daftar</a></p>
                </form>
            </div>
        </div>
    </div>


</body>
</html>
