  <!-- Main modal -->
  <div id="default-modal" tabindex="-1" aria-hidden="true"
      class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
      <div class="relative p-4 w-full max-w-2xl max-h-full">
          <!-- Modal content -->
          <div class="relative bg-white rounded-lg dark:bg-gray-300 border-2! border-gray-300! ">
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
                          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                              viewBox="0 0 14 14">
                              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                  stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                          </svg>
                          <span class="sr-only">Close modal</span>
                      </button>
                  </div>
              </div>
              <!-- Modal body -->
              <div class="p-4 md:p-5 space-y-1">
                  <div class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl ">
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
                  <div class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl ">
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
                  <div class="profile-info px-4 py-3 border-gray-300 border-2 rounded-xl ">
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
