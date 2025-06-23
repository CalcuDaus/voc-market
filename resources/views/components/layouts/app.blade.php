<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>{{ $title ?? 'Page Title' }}</title>

    @vite('resources/css/app.css')

    {{-- Font Awesome --}}
    <link rel="stylesheet" href="{{ asset('voc-market/dist/font-awesome/css/all.min.css') }}">
</head>

<body class="font-[poppins] text-gray-700 ">
    {{ $slot }}
</body>

</html>
