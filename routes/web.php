<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('layout.index');
});

Route::get('/login', function () {
    return view('login');
});
