<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('components.main');
})->name('home');

Route::get('/login', function () {
    return view('login');
})->name('login');
Route::get('/register', function () {
    return view('register');
})->name('register');

Route::get('/smk-users-add', function () {
    return view('components.main');
})->name('smk-users-add');

Route::get('/add-product', function () {
    return view('components.main');
})->name('add-product');
Route::get('/add-service', function () {
    return view('components.main');
})->name('add-service');
Route::get('/add-portfolio', function () {
    return view('components.main');
})->name('add-portfolio');
