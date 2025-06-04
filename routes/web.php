<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('layout.index');
})->name('home');

Route::get('/login', function () {
    return view('login');
})->name('login');
Route::get('/register', function () {
    return view('register');
})->name('register');

Route::get('/smk-users-add', function () {
    return view('smk-users-add');
})->name('smk-users-add');
